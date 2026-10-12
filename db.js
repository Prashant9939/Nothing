// PostgreSQL (Supabase) adapter — exposes a SQLite-like surface:
//   await db.get(sql, ...params)   -> row | null
//   await db.all(sql, ...params)   -> rows[]
//   await db.run(sql, ...params)   -> { changes, lastInsertRowid }
//   await db.exec(sql)             -> runs raw SQL (multi-statement OK)
//   db.transaction(fn)             -> async fn running inside BEGIN/COMMIT
// The toPg() shim converts `?` placeholders to $1..$n and quotes camelCase
// identifiers (Postgres folds unquoted names to lowercase; our schema keeps
// SQLite's camelCase columns). String literals are left untouched.
const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { BCRYPT_COST } = require('./lib/passwordPolicy');
const { DEFAULTS: SETTINGS_DEFAULTS } = require('./lib/settings');

// COUNT/SUM come back as int8/numeric strings by default — keep them numbers
// so API responses and === 0 / comparisons behave exactly like SQLite did.
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));

const rawConnectionString = (process.env.DATABASE_URL || '').trim();
if (!rawConnectionString) {
  console.error('FATAL: DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

// pg parses `connectionString` AFTER the explicit config and lets its
// ?sslmode= value override the `ssl` option below (in pg 8+, sslmode=require
// behaves as verify-full) — that fails against Supabase's CA chain. Capture
// the SSL intent first, strip the param, and negotiate TLS ourselves so the
// app works with any URI pasted from the Supabase dashboard or Render.
function normalizeDbUrl(uri) {
  let wantsSsl = /sslmode=(require|verify-ca|verify-full)/.test(uri) || /supabase|amazonaws|pooler/i.test(uri);
  try {
    const u = new URL(uri);
    const mode = u.searchParams.get('sslmode');
    if (mode !== null) wantsSsl = mode !== 'disable';
    u.searchParams.delete('sslmode');
    return { uri: u.toString(), wantsSsl };
  } catch {
    return { uri: uri.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, ''), wantsSsl };
  }
}

const { uri: connectionString, wantsSsl } = normalizeDbUrl(rawConnectionString);

const pool = new Pool({
  connectionString,
  ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  // Supabase's session-mode pooler hard-caps TOTAL connections at pool_size 15,
  // shared across EVERY warm serverless instance. A per-instance max above 15
  // (was 20) guaranteed EMAXCONNSESSION — "(EMAXCONNSESSION) max clients reached
  // in session mode" → 500 on /api/student/dashboard under concurrent traffic.
  // Keep each instance small (4): pg-pool queues extra borrowers locally
  // instead of opening more server connections. Override with PG_POOL_MAX.
  max: Number(process.env.PG_POOL_MAX) > 0 ? Number(process.env.PG_POOL_MAX) : 4,
  // Keep idle backends for 30s so request bursts spaced under 30s reuse the
  // existing TLS session — every fresh connect to the Singapore pooler costs a
  // full TLS handshake (~1-2s of added latency per burst). allowExitOnIdle lets
  // the process exit (and release its slots) even while connections idle, so a
  // quiet instance never wedges the shared 15-connection budget on shutdown.
  // Trade-off: MANY warm serverless instances each holding idle slots can
  // approach the session-pooler cap — if EMAXCONNSESSION shows up in logs,
  // lower this (PG_IDLE_TIMEOUT_MS=5000 reverts to the old behaviour).
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) >= 0 ? Number(process.env.PG_IDLE_TIMEOUT_MS) : 30000,
  allowExitOnIdle: true,
  // Fail fast on a dropped/hung TLS handshake instead of waiting out the
  // serverless timeout — but leave enough room for a slow handshake to the
  // Singapore pooler (idle connections are dropped after 5s, so bursts of
  // fresh connects happen constantly; a Wi-Fi blip or a busy shared pool can
  // push one past 5s). 7s + the single connect retry + backoff = 14.3s worst
  // case, still inside the client's 15s axios timeout.
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) > 0 ? Number(process.env.PG_CONNECT_TIMEOUT_MS) : 7000,
  // TCP keepalive: pg leaves it OFF by default, so a connection silently cut
  // by the pooler/NAT (no RST) never errors and its slot leaks — every query
  // queued behind it then hangs forever (downloads stuck on a spinner with no
  // response). Probes surface the dead socket as ECONNRESET within ~30s so the
  // request fails visibly and the pool recovers.
  keepAlive: true,
  keepAliveInitialDelayMillis: 30000,
  // Kill runaway statements instead of letting them pin a pooled connection (a
  // slow seq scan would otherwise queue every other query behind it). A startup
  // `options: '-c ...'` parameter is ignored by Supabase's pooler, so the
  // timeout is SET once per freshly opened backend — pg-pool's `verify` runs
  // before the connection is handed to its first borrower.
  verify: (client, done) => {
    // 15s (overridable): a runaway statement must not pin a pooled connection
    // for a minute while dashboards queue behind it.
    const ms = Number(process.env.PG_STATEMENT_TIMEOUT_MS) > 0
      ? Number(process.env.PG_STATEMENT_TIMEOUT_MS)
      : 15000;
    client.query(`SET statement_timeout = ${ms}`, (err) => done(err));
  },
});
pool.on('error', (err) => console.error('Postgres pool error:', err.message));

const als = new AsyncLocalStorage();
const executor = () => als.getStore() || pool;

// Hot SQL text is re-converted on every call — memoize so a steady-state app
// does zero regex work per query. Bounded so a pathological flood of distinct
// texts (e.g. interpolated literals) cannot grow the map forever.
const toPgCache = new Map();
const TO_PG_CACHE_MAX = 500;
function toPg(sql) {
  const key = String(sql);
  const cached = toPgCache.get(key);
  if (cached !== undefined) return cached;
  const parts = key.split(/('(?:[^']|'')*')/);
  let n = 0;
  const out = parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // string literal — never touch
      return seg
        .replace(/\?/g, () => `$${++n}`)
        .replace(/\b([a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+)\b/g, '"$&"');
    })
    .join('');
  if (toPgCache.size < TO_PG_CACHE_MAX) toPgCache.set(key, out);
  return out;
}

// Supabase's session-mode pooler rejects new connections once its shared
// pool_size (15 across all warm serverless instances) is exhausted
// (EMAXCONNSESSION), and handshakes can time out when it is saturated.
// All of these fire BEFORE any statement runs, so one delayed retry is safe
// for reads and writes alike — this turns the intermittent 500 on
// /api/student/dashboard ("Couldn't load your documents") into a success.
const TRANSIENT_CONNECT_RE = /EMAXCONNSESSION|timeout exceeded when trying to connect|Connection terminated due to connection timeout/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withConnectRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!err || !TRANSIENT_CONNECT_RE.test(err.message || '')) throw err;
    await sleep(300);
    return fn();
  }
}

async function get(sql, ...params) {
  const r = await withConnectRetry(() => executor().query(toPg(sql), params.length ? params : undefined));
  return r.rows[0] ?? null;
}

async function all(sql, ...params) {
  const r = await withConnectRetry(() => executor().query(toPg(sql), params.length ? params : undefined));
  return r.rows;
}

// Which id-less INSERT texts have an `id` column is a property of the schema,
// not of the run — remember the probe result per statement so tables without
// an id (settings, announcement_reads) don't burn an extra failing round trip
// on EVERY insert. `false` = probe once, skip `RETURNING id` forever after.
const insertHasId = new Map();
const INSERT_HAS_ID_MAX = 100;
async function run(sql, ...params) {
  const base = String(sql).trim().replace(/;\s*$/, '');
  if (/^insert\b/i.test(base) && !/\breturning\b/i.test(base) && insertHasId.get(base) !== false) {
    try {
      const r = await withConnectRetry(() => executor().query(toPg(`${base} RETURNING id`), params));
      if (insertHasId.size < INSERT_HAS_ID_MAX) insertHasId.set(base, true);
      return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id };
    } catch (err) {
      // 42703 = column "id" does not exist (e.g. announcement_reads has no id)
      if (err.code !== '42703') throw err;
      if (insertHasId.size < INSERT_HAS_ID_MAX) insertHasId.set(base, false);
    }
  }
  const r = await withConnectRetry(() => executor().query(toPg(base), params));
  return { changes: r.rowCount, lastInsertRowid: undefined };
}

async function exec(sql) {
  return withConnectRetry(() => executor().query(toPg(sql)));
}

async function tx(fn) {
  const client = await withConnectRetry(() => pool.connect());
  try {
    await client.query('BEGIN');
    const out = await als.run(client, () => fn(client));
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* already closed */ }
    throw err;
  } finally {
    client.release();
  }
}

const db = { pool, get, all, run, exec, tx, toPg, ready: null };
db.transaction = (fn) => (...args) => tx(() => fn(...args));
module.exports = db;

// Everything below (schema, seeds, migrations) runs before the server serves
// requests — see server.js (ensureReady()). `db.init()` is lazy and retriable:
// it runs once per process, and a failed attempt clears the cached promise so
// the next call re-runs the (idempotent) init instead of rejecting forever.
const runInitBody = async () => {
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL,
    course TEXT NOT NULL,
    year TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    updatedAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 28,
    price DOUBLE PRECISION NOT NULL,
    originalPrice DOUBLE PRECISION,
    modules INTEGER NOT NULL DEFAULT 10,
    topics TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    examDate TEXT,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    updatedAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    userId INTEGER NOT NULL,
    internshipId INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'expired')),
    enrolledAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    expiresAt TEXT,
    progress INTEGER DEFAULT 0,
    completedModules TEXT DEFAULT '[]',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE,
    UNIQUE(userId, internshipId)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    userId INTEGER NOT NULL,
    enrollmentId INTEGER,
    amount DOUBLE PRECISION NOT NULL,
    method TEXT DEFAULT 'razorpay',
    transactionId TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    receiptNumber TEXT UNIQUE,
    paidAt TEXT,
    expiresAt TEXT,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE
  );

  -- Partner commission payout requests: a partner asks for a payout of their
  -- earned commission; the admin triages it from the Issues panel with a
  -- priority tag and approve/reject actions.
  CREATE TABLE IF NOT EXISTS payout_requests (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    partnerId INTEGER NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    upiId TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    priority TEXT DEFAULT 'high' CHECK(priority IN ('high', 'normal', 'low')),
    note TEXT DEFAULT '',
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    updatedAt TEXT,
    FOREIGN KEY (partnerId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    userId INTEGER NOT NULL,
    internshipId INTEGER NOT NULL,
    enrollmentId INTEGER NOT NULL,
    totalQuestions INTEGER DEFAULT 50,
    passingMarks INTEGER DEFAULT 40,
    duration INTEGER DEFAULT 60,
    scheduledAt TEXT,
    startedAt TEXT,
    completedAt TEXT,
    score INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'failed')),
    answers TEXT,
    servedQuestionIds TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    userId INTEGER NOT NULL,
    enrollmentId INTEGER NOT NULL,
    examId INTEGER,
    certificateId TEXT UNIQUE NOT NULL,
    grade TEXT,
    score INTEGER,
    issuedAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    userId INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    track TEXT NOT NULL,
    question TEXT NOT NULL,
    optionA TEXT NOT NULL,
    optionB TEXT NOT NULL,
    optionC TEXT NOT NULL,
    optionD TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK(correct IN (0, 1, 2, 3)),
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS learning_modules (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    internshipId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    moduleOrder INTEGER NOT NULL,
    durationMinutes INTEGER DEFAULT 30,
    difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    topics TEXT NOT NULL,
    learningObjectives TEXT NOT NULL,
    contentSections TEXT NOT NULL,
    quizQuestions TEXT NOT NULL,
    resources TEXT NOT NULL,
    videoUrl TEXT,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS universities (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    shortName TEXT DEFAULT '',
    location TEXT DEFAULT '',
    type TEXT DEFAULT 'state' CHECK(type IN ('central', 'state', 'private', 'deemed')),
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    universityId INTEGER NOT NULL,
    name TEXT NOT NULL,
    district TEXT DEFAULT '',
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (universityId) REFERENCES universities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    visitorId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('visit', 'pageview', 'click')),
    path TEXT,
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS announcement_reads (
    announcementId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    readAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    PRIMARY KEY (announcementId, userId),
    FOREIGN KEY (announcementId) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read')),
    createdAt TEXT DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_internships_category ON internships(category);
  CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(userId);
  CREATE INDEX IF NOT EXISTS idx_enrollments_internship ON enrollments(internshipId);
  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId);
  CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollmentId);
  CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(userId);
  CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(userId);
  CREATE INDEX IF NOT EXISTS idx_certificates_id ON certificates(certificateId);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_questions_track ON questions(track);
  CREATE INDEX IF NOT EXISTS idx_learning_modules_internship ON learning_modules(internshipId);
  CREATE INDEX IF NOT EXISTS idx_colleges_university ON colleges(universityId);
  CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(userId);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(createdAt);
  CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitorId);
  CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

  -- Settings for attendance dating, document branding, verification link etc.
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  -- Serves the expired-session DELETE below (was a seq scan on every boot).
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt);

  -- Analytics events older than 90 days are dropped on startup (table stays small)
  DELETE FROM analytics_events WHERE createdAt < to_char(now() - interval '90 days', 'YYYY-MM-DD HH24:MI:SS');

  -- Same for expired JWT session rows: rows die with the token exp claim,
  -- so the table never grows past active sessions.
  DELETE FROM sessions WHERE expiresAt < to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS');

  -- Settings defaults folded into this batch (one round trip per boot instead
  -- of a separate INSERT; ON CONFLICT DO NOTHING keeps it idempotent).
  ${(() => {
    const entries = Object.entries(SETTINGS_DEFAULTS);
    if (!entries.length) return '';
    const q = (v) => `'${String(v == null ? '' : v).replace(/'/g, "''")}'`;
    return `INSERT INTO settings (key, value) VALUES ${entries.map(([k, v]) => `(${q(k)}, ${q(v)})`).join(', ')} ON CONFLICT DO NOTHING;`;
  })()}
`);

// Everything below is gated behind a schema signature (see SCHEMA_VERSION):
// each statement above and the block below used to run on EVERY boot, costing
// one remote round trip each — with a ~330ms RTT to the pooler that was a
// 40s+ cold start. The signature hashes the migration/index/backfill SQL, so
// editing any of it automatically re-runs the whole block once.

// Migration: add columns if missing. IF NOT EXISTS makes each statement a
// no-op when current, so the whole batch runs as ONE round trip (it used to
// be one round trip per statement — 20 RTTs to the remote pooler).
const migrations = [
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS university TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS dob TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS rollNo TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS regNo TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS guardianName TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS guardianPhone TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS guardianRelation TEXT DEFAULT \'\'',
  'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS offerNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS reportNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS attendanceNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS attendanceDateMode TEXT DEFAULT \'forward\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS createdByAdmin INTEGER DEFAULT 0',
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpayOrderId TEXT',
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpayPaymentId TEXT',
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS internshipId INTEGER',
  // Payment time limit: pending invoices expire and become 'failed'.
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS expiresAt TEXT',
  // Invoice-before-enrollment flow: payments start with no enrollmentId
  // (SQLite always allowed NULL here; PG was created NOT NULL by mistake).
  'ALTER TABLE payments ALTER COLUMN enrollmentId DROP NOT NULL',
  // Exam attempts record the exact questions served so grading uses the
  // served set as denominator, not every active question in the track.
  'ALTER TABLE exams ADD COLUMN IF NOT EXISTS servedQuestionIds TEXT',
  // Partner program: partner org display name, per-partner suspension flag
  // (named accountStatus — users has no status column and a bare `status`
  // in joins must stay unambiguous), and the referral attribution column.
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS partnerName TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS accountStatus TEXT DEFAULT 'active'",
  'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS partnerId INTEGER',
  // Account-level referral: partner-registered students keep their attribution
  // even before they enroll (enrollments.partnerId is stamped from this at
  // payment provisioning in lib/payments.js).
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS partnerId INTEGER',
  // Partner commission rate: admin-set percentage of every completed payment
  // from a partner-attributed student that is paid out to the partner
  // (e.g. 5 → 5% of ₹199 = ₹9.95 payout). 0 = no commission configured.
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS commissionPercent DOUBLE PRECISION DEFAULT 0',
  // Payout requests collect the partner's UPI ID for the actual transfer.
  "ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS upiId TEXT DEFAULT ''",
];
// Admin refund marks the enrollment 'refunded' (revoked) — the original CHECK
// only allowed pending/active/completed/expired. Kept OUT of the batch:
// ADD CONSTRAINT validates data, and a legacy row violating it must not roll
// back the column adds above. Second statement widens the users role CHECK so
// the partner role can exist (existing rows are only student/admin, so it
// always validates).
const CONSTRAINT_SQL = `ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check,
   ADD CONSTRAINT enrollments_status_check CHECK (status IN ('pending', 'active', 'completed', 'expired', 'refunded'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check,
   ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'admin', 'partner'))`;

// Perf indexes — placed after the migrations because several reference columns
// those migrations add (regNo, offerNo, ...). Covers columns that are filtered
// or sorted on every request but used to seq-scan:
const PERF_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_exams_enrollment ON exams(enrollmentId);
  CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
  CREATE INDEX IF NOT EXISTS idx_certificates_enrollment ON certificates(enrollmentId);
  CREATE INDEX IF NOT EXISTS idx_payments_status_paid ON payments(status, paidAt);
  CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
  CREATE INDEX IF NOT EXISTS idx_enrollments_offer_no ON enrollments(offerNo);
  CREATE INDEX IF NOT EXISTS idx_enrollments_report_no ON enrollments(reportNo);
  CREATE INDEX IF NOT EXISTS idx_enrollments_attendance_no ON enrollments(attendanceNo);
  CREATE INDEX IF NOT EXISTS idx_users_created ON users(createdAt);
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  -- Partner attribution: every partner report filters/sorts enrollments by partnerId.
  CREATE INDEX IF NOT EXISTS idx_enrollments_partner ON enrollments(partnerId);
  CREATE INDEX IF NOT EXISTS idx_users_partner ON users(partnerId);
  -- Payout requests: the admin Issues panel lists all requests, partners list their own.
  CREATE INDEX IF NOT EXISTS idx_payout_requests_partner ON payout_requests(partnerId);
  CREATE INDEX IF NOT EXISTS idx_internships_active ON internships(isActive);
  -- Functional indexes: the login/verify lookups wrap columns in lower()/trim()/
  -- UPPER()/replace(), which defeats any plain index on the same column.
  CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users(lower(email));
  CREATE INDEX IF NOT EXISTS idx_users_lower_trim_email ON users(lower(trim(email)));
  CREATE INDEX IF NOT EXISTS idx_users_lower_reg_no ON users(lower(trim(regNo)));
  CREATE INDEX IF NOT EXISTS idx_users_lower_roll_no ON users(lower(trim(rollNo)));
  CREATE INDEX IF NOT EXISTS idx_users_phone_compact ON users(replace(replace(phone, ' ', ''), '-', ''));
  CREATE INDEX IF NOT EXISTS idx_certificates_cert_upper ON certificates(UPPER(certificateId));
  CREATE INDEX IF NOT EXISTS idx_payments_receipt_upper ON payments(UPPER(receiptNumber));
  -- Admin list sort keys (all these endpoints ORDER BY ... DESC with no LIMIT
  -- cover index for the sort → per-row sort cost grew with table size).
  CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(createdAt);
  CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled ON enrollments(enrolledAt);
  CREATE INDEX IF NOT EXISTS idx_certificates_issued ON certificates(issuedAt);
  CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(createdAt, id);
  -- Report averages per internship + analytics top-pages grouping.
  CREATE INDEX IF NOT EXISTS idx_exams_internship ON exams(internshipId);
  CREATE INDEX IF NOT EXISTS idx_analytics_created_path ON analytics_events(createdAt, path);
  -- Razorpay webhook / order-verification looks a payment up by order id on
  -- every callback — used to be a seq scan that grew with payment history.
  CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpayOrderId);
  -- Per-user session scans: partner dashboard KPIs (GROUP BY userId), logout-all,
  -- password-change revocation — all used to seq-scan sessions.
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
  -- Partner detail: WHERE partnerId = ? ORDER BY enrolledAt DESC LIMIT n —
  -- plain partnerId index forced an index-then-sort per request.
  CREATE INDEX IF NOT EXISTS idx_enrollments_partner_enrolled ON enrollments(partnerId, enrolledAt);
  -- Public list sorts (internships + announcements) with no ORDER BY cover.
  CREATE INDEX IF NOT EXISTS idx_internships_created ON internships(createdAt);
  CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(createdAt, id);
`;

// Legacy-data healing statements kept as consts: SCHEMA_VERSION below hashes
// their exact text, so editing any of them re-runs the gated block once.
const BACKFILL_SQL = {
  expiryFromCreatedAt: `
    UPDATE payments
    SET expiresAt = to_char(createdAt::timestamp + (? || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS')
    WHERE status = 'pending' AND expiresAt IS NULL AND createdAt ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} '
  `,
  expiryFromNow: `
    UPDATE payments
    SET expiresAt = to_char(now() at time zone 'UTC' + (? || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS')
    WHERE status = 'pending' AND expiresAt IS NULL
  `,
  expireSweep: `
    UPDATE payments
    SET status = 'failed'
    WHERE status = 'pending' AND expiresAt <= to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  `,
  failDuplicatePending: `
    UPDATE payments
    SET status = 'failed'
    WHERE status = 'pending'
      AND id NOT IN (
        SELECT MAX(id) FROM payments WHERE status = 'pending' GROUP BY userId, internshipId
      )
  `,
  uniquePendingIndex: `
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_pending_user_track
    ON payments (userId, internshipId) WHERE status = 'pending'
  `,
  legacyReceipts: "SELECT id FROM payments WHERE receiptNumber IS NULL OR receiptNumber NOT LIKE 'IQI-REC-____-______'",
};
const { DOC_COLUMNS, makeNumber, newReceiptNumber } = require('./lib/docNumbers');

// Signature over every schema/healing statement above — change any of them
// (or DOC_COLUMNS) and the whole gated block re-runs exactly once; otherwise
// steady-state boots skip it. Seeds are NOT hashed: they are self-gating
// (count/marker checks) and always run below.
const SCHEMA_VERSION = crypto.createHash('sha256')
  .update(JSON.stringify({ migrations, CONSTRAINT_SQL, PERF_INDEXES_SQL, BACKFILL_SQL, DOC_COLUMNS }))
  .digest('hex')
  .slice(0, 20);
let appliedVersion = null;
try {
  appliedVersion = (await db.get("SELECT value FROM settings WHERE key = 'initVersion'"))?.value;
} catch (_) { /* settings table missing — treated as not yet initialized */ }

// Settings defaults are inserted inside the main DDL batch above (same round
// trip), so nothing to do here — a row deleted by hand is re-added on the
// next boot by that batch.

if (appliedVersion !== SCHEMA_VERSION) {
  // ——— schema & legacy-data block: runs once per schema version ———
  try {
    await db.exec(migrations.join(';\n'));
  } catch (err) {
    console.error('Migration batch failed:', err.message);
  }
  try {
    await db.exec(CONSTRAINT_SQL);
  } catch (_) { /* legacy rows may violate the new CHECK — keep the old one */ }
  await db.exec(PERF_INDEXES_SQL);

  // Payment time limit: give legacy pending invoices a deadline (createdAt +
  // PAYMENT_TIME_LIMIT_MINUTES), then fail everything already past it. Rows
  // whose createdAt can't be parsed get a fresh window from now so no pending
  // payment can live forever.
  const PAYMENT_TIME_LIMIT_MINUTES = (() => {
    const n = Number(process.env.PAYMENT_TIME_LIMIT_MINUTES);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
  })();
  try {
    await db.run(BACKFILL_SQL.expiryFromCreatedAt, String(PAYMENT_TIME_LIMIT_MINUTES));
  } catch (err) {
    // Unparseable legacy createdAt — the statement below gives them a fresh window instead.
    console.error('Payment expiry backfill (createdAt) failed:', err.message);
  }
  try {
    await db.run(BACKFILL_SQL.expiryFromNow, String(PAYMENT_TIME_LIMIT_MINUTES));
    await db.run(BACKFILL_SQL.expireSweep);
  } catch (err) {
    console.error('Payment expiry backfill failed:', err.message);
  }

  // One open invoice per (user, track). The enroll route already reuses pending
  // invoices, but concurrent requests could still stack duplicates — and paying
  // a duplicate later fails provisioning with a UNIQUE violation, stranding the
  // captured charge. Fail older duplicates first, then enforce it in the DB.
  try {
    await db.run(BACKFILL_SQL.failDuplicatePending);
    await db.exec(BACKFILL_SQL.uniquePendingIndex);
  } catch (err) {
    console.error('Pending-invoice unique index failed:', err.message);
  }

  // Assign unique, non-sequential document numbers to existing records
  for (const [column, prefix] of Object.entries(DOC_COLUMNS)) {
    const missing = await db.all(`SELECT id FROM enrollments WHERE ${column} IS NULL OR ${column} = ''`);
    for (const { id } of missing) {
      const no = await makeNumber(db, prefix, column, 'enrollments');
      await db.run(`UPDATE enrollments SET ${column} = ? WHERE id = ?`, no, id);
    }
  }
  // Normalize legacy receipt numbers (timestamp-based) to the standard format
  const legacyReceipts = await db.all(BACKFILL_SQL.legacyReceipts);
  for (const { id } of legacyReceipts) {
    await db.run('UPDATE payments SET receiptNumber = ? WHERE id = ?', await newReceiptNumber(db), id);
  }

  // One-time normalization: the old checkout created enrollments at 100%
  // progress for tracks that had no published learning modules (rendered as
  // completed tracks with an unlocked exam). Reset those to 0% — progress is
  // derived from completed modules only. Runs with the gated block instead of
  // on every boot (it used to be an extra round trip + seq scan per boot).
  await db.run(`
    UPDATE enrollments SET progress = 0
    WHERE progress = 100
      AND internshipId NOT IN (SELECT DISTINCT internshipId FROM learning_modules)
  `);

  // Record the version only after the whole block succeeded — a failure leaves
  // the old marker in place, so the next boot retries it in full.
  await db.run(
    `INSERT INTO settings (key, value) VALUES ('initVersion', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    SCHEMA_VERSION,
  );
}
// ——— end schema & legacy-data block ———

// Seed admin user if not exists
const adminEmail = process.env.ADMIN_EMAIL || 'admin@iqintern.in';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD is not set — the seeded admin account uses an insecure default. Set ADMIN_PASSWORD in .env and change the password after first login.');
}

// Demo partner account for the Partners dashboard (see seed block below).
const partnerEmail = 'partner.demo@iqintern.in';
const partnerPassword = process.env.PARTNER_PASSWORD || 'Partner@123';

// Everything the seed pass below needs in ONE round trip: table counts, the
// admin existence check, existing titles (extra-internship dedupe) and the
// learning-module coverage count. These used to be 4 separate SELECTs.
const seedCounts = await db.get(`
  SELECT
    (SELECT COUNT(*) FROM internships) AS internships,
    (SELECT COUNT(*) FROM universities) AS universities,
    (SELECT COUNT(*) FROM internships WHERE id NOT IN (SELECT DISTINCT internshipId FROM learning_modules)) AS tracksMissing,
    (SELECT json_agg(title) FROM internships) AS titles,
    EXISTS(SELECT 1 FROM users WHERE email = ?) AS adminExists,
    EXISTS(SELECT 1 FROM users WHERE email = ?) AS partnerExists
`, adminEmail, partnerEmail);

if (!seedCounts.adminExists) {
  const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_COST);
  await db.run(`
    INSERT INTO users (firstName, lastName, email, phone, college, course, year, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, 'Admin', 'IQIntern', adminEmail, '9999999999', 'IQIntern', 'admin', 'admin', hashedPassword, 'admin');
  console.log(`Admin user created: ${adminEmail}`);
}

// Demo partner account so the admin Partners section has a credential to
// check up on. Seeded once (self-gating); it also claims a handful of paid
// enrollments at creation time so the partner view has real activity.
if (process.env.NODE_ENV !== 'production' && !seedCounts.partnerExists) {
  try {
    const hashedPassword = await bcrypt.hash(partnerPassword, BCRYPT_COST);
    const result = await db.run(`
      INSERT INTO users (firstName, lastName, email, phone, college, course, year, password, role, partnerName, accountStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'partner', ?, 'active')
    `, 'Demo', 'Partner', partnerEmail, '9876543210', 'Demo Partner Academy', 'partner', 'partner', hashedPassword, 'Demo Partner Academy');
    await db.run(`
      UPDATE enrollments SET partnerId = ?
      WHERE partnerId IS NULL AND id IN (
        SELECT e.id FROM enrollments e
        WHERE EXISTS (SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed')
        ORDER BY e.id LIMIT 8
      )
    `, result.lastInsertRowid);
    console.log(`Demo partner user created: ${partnerEmail} (password ${partnerPassword})`);
  } catch (err) {
    console.error('Demo partner seed failed:', err.message);
  }
}

if (seedCounts.internships === 0) {
  const internships = [
    { title: 'Web Development Pathway', description: 'Master HTML, CSS, JavaScript, React, Node.js, and build full-stack applications with database integration.', category: 'web', duration: 28, price: 2999, originalPrice: 5999, modules: 10, topics: 'HTML5,CSS3,JavaScript,React,Node.js,MongoDB' },
    { title: 'Python Software Engineering', description: 'Learn Python programming, OOP, data structures, file handling, and build backend APIs with Flask/Django.', category: 'python', duration: 28, price: 2999, originalPrice: 5999, modules: 8, topics: 'Python Basics,OOP,Data Structures,Flask,Django,APIs' },
    { title: 'Data Science & Analytics', description: 'Master data analysis, visualization, statistics, SQL, Python for data, and build predictive models.', category: 'data', duration: 35, price: 3499, originalPrice: 6999, modules: 12, topics: 'Python,Pandas,NumPy,SQL,Tableau,Statistics' },
    { title: 'AI & Machine Learning', description: 'Dive into machine learning algorithms, neural networks, NLP, computer vision, and deploy AI models.', category: 'ai', duration: 42, price: 4999, originalPrice: 9999, modules: 14, topics: 'ML Algorithms,Deep Learning,TensorFlow,NLP,Computer Vision,PyTorch' },
    { title: 'Cybersecurity Fundamentals', description: 'Learn network security, ethical hacking, penetration testing, cryptography, and security auditing.', category: 'cyber', duration: 30, price: 3999, originalPrice: 7999, modules: 11, topics: 'Network Security,Ethical Hacking,Cryptography,Pen Testing,Linux,Wireshark' },
    { title: 'Mobile App Development', description: 'Build cross-platform mobile apps using React Native, Flutter, and deploy to App Store & Play Store.', category: 'web', duration: 28, price: 3499, originalPrice: 6999, modules: 9, topics: 'React Native,Flutter,Dart,Firebase,UI/UX,App Store' },
  ];

  const insert = ('INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const i of internships) {
    await db.run(insert, i.title, i.description, i.category, i.duration, i.price, i.originalPrice, i.modules, i.topics);
  }
  console.log('Seed internships created');
}

// Additional internships — inserted if missing (existing databases keep their data)
const extraInternships = [
  { title: 'Skill Development Program', description: 'Build communication, teamwork, time management, problem solving and leadership skills that every employer expects.', category: 'skill', duration: 28, price: 2499, originalPrice: 4999, modules: 8, topics: 'Communication,Time Management,Teamwork,Problem Solving,Leadership,Career Readiness' },
  { title: 'Teacher Training & Pedagogy', description: 'Learn lesson planning, classroom management, assessment design, educational psychology and modern instructional methods.', category: 'teaching', duration: 35, price: 3499, originalPrice: 6999, modules: 10, topics: 'Lesson Planning,Pedagogy,Classroom Management,Assessment,Educational Technology,Child Psychology' },
  { title: 'Human Resource Management', description: 'Master recruitment, onboarding, payroll basics, performance management, labor laws and employee engagement practices.', category: 'hr', duration: 30, price: 3499, originalPrice: 6999, modules: 9, topics: 'Recruitment,Onboarding,Payroll,Performance Management,Labor Laws,Employee Engagement' },
  { title: 'Entrepreneurship & Startup Growth', description: 'Validate ideas, build business plans, explore funding options, understand legal structures and scale a venture.', category: 'entrepreneurship', duration: 35, price: 3999, originalPrice: 7999, modules: 9, topics: 'Business Plan,Market Research,Funding,Legal Structures,Branding,Scaling' },
  { title: 'Tourism & Hospitality Management', description: 'Explore travel planning, hotel operations, front office and housekeeping, tourism marketing and customer service excellence.', category: 'tourism', duration: 28, price: 2999, originalPrice: 5999, modules: 8, topics: 'Travel Planning,Hospitality Operations,Tourism Marketing,Customer Service,Cultural Heritage,Hotel Management' },
];
const insertExtraInternship = ('INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
// Titles already fetched in the merged seedCounts query above (no extra RTT)
const knownTitles = new Set(seedCounts.titles || []);
let insertedExtra = 0;
for (const i of extraInternships) {
  if (!knownTitles.has(i.title)) {
    await db.run(insertExtraInternship, i.title, i.description, i.category, i.duration, i.price, i.originalPrice, i.modules, i.topics);
    insertedExtra++;
    console.log(`Seeded internship: ${i.title}`);
  }
}

// Seed universities & colleges if empty
const universityCount = seedCounts.universities;
if (universityCount === 0) {
  const institutions = require('./data/institutions');
  const insertUniversity = ('INSERT INTO universities (name, shortName, location, type) VALUES (?, ?, ?, ?)');
  const insertCollege = ('INSERT INTO colleges (universityId, name, district) VALUES (?, ?, ?)');

  const seedInstitutions = db.transaction(async () => {
    for (const u of institutions) {
      const existing = await db.get('SELECT id FROM universities WHERE LOWER(name) = LOWER(?)', u.name);
      const universityId = existing
        ? existing.id
        : (await db.run(insertUniversity, u.name, u.shortName || '', u.location || '', u.type || 'state')).lastInsertRowid;

      for (const c of u.colleges || []) {
        const dup = await db.get('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?)', universityId, c.name);
        if (!dup) await db.run(insertCollege, universityId, c.name, c.district || '');
      }
    }
  });
  await seedInstitutions();

  const seeded = (await db.get('SELECT COUNT(*) as count FROM universities')).count;
  const seededColleges = (await db.get('SELECT COUNT(*) as count FROM colleges')).count;
  console.log(`Seed institutions created: ${seeded} universities, ${seededColleges} colleges`);
}

// Seed questions
const { seedQuestions } = require('./data/seedQuestions');
await seedQuestions(db);

// Seed learning modules. Per-track and idempotent: the block runs whenever
// ANY track still has no modules (count prefetched in seedCounts), and the
// insert below only inserts tracks that currently have zero rows. Adding
// content for a new track therefore backfills an existing database without
// ever duplicating tracks seeded before.
if (seedCounts.internships === 0 || seedCounts.tracksMissing > 0 || insertedExtra > 0) {
  // Six core tracks resolved in ONE round trip (was 6 sequential SELECTs).
  // The curriculum itself lives in data/learningModules/coreTracks.js - it
  // used to be inlined here (~185KB), which every cold start had to parse.
  const coreTitles = [
    'Web Development Pathway', 'Python Software Engineering', 'Data Science & Analytics',
    'AI & Machine Learning', 'Cybersecurity Fundamentals', 'Mobile App Development',
  ];
  const coreRows = await db.all('SELECT id, title FROM internships WHERE title = ANY(?)', coreTitles);
  const coreIdByTitle = new Map(coreRows.map((r) => [r.title, r.id]));
  const learningModules = require('./data/learningModules/coreTracks')({
    webDev: coreIdByTitle.get('Web Development Pathway'),
    python: coreIdByTitle.get('Python Software Engineering'),
    dataSci: coreIdByTitle.get('Data Science & Analytics'),
    aiMl: coreIdByTitle.get('AI & Machine Learning'),
    cyber: coreIdByTitle.get('Cybersecurity Fundamentals'),
    mobile: coreIdByTitle.get('Mobile App Development'),
  });

  // Tracks whose curriculum ships in data/learningModules/index.js instead of
  // coreTracks.js. Resolved by internships.title, never by id, so the ids stay
  // free to differ between environments.
  for (const track of require('./data/learningModules')) {
    const internship = await db.get('SELECT id FROM internships WHERE title = ?', track.internshipTitle);
    if (!internship) {
      console.log(`Seed learning modules: skipped "${track.internshipTitle}" — internship not found`);
      continue;
    }
    for (const mod of track.modules) learningModules.push({ ...mod, internshipId: internship.id });
  }

  // Insert only tracks that currently have zero modules — a track already
  // (even partially) seeded is left untouched rather than risked against
  // duplicate moduleOrder rows.
  const seededTracks = new Set(
    (await db.all('SELECT DISTINCT internshipId FROM learning_modules')).map((row) => row.internshipId)
  );
  const pendingModules = learningModules.filter((mod) => !seededTracks.has(mod.internshipId));

  if (pendingModules.length > 0) {
    const insertModule = (`INSERT INTO learning_modules (internshipId, title, description, moduleOrder, durationMinutes, difficulty, topics, learningObjectives, contentSections, quizQuestions, resources, videoUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const mod of pendingModules) {
      await db.run(insertModule, mod.internshipId, mod.title, mod.description, mod.moduleOrder, mod.durationMinutes,
        mod.difficulty, mod.topics, mod.learningObjectives, mod.contentSections,
        mod.quizQuestions, mod.resources, mod.videoUrl);
    }
    console.log(`Seed learning modules created: ${pendingModules.length} modules`);
  }
}

console.log('Database initialized successfully');
};

// Init runs on EVERY cold start, and on serverless several instances can cold
// start at once. Without a lock they race through CREATE TABLE/INDEX IF NOT
// EXISTS (Postgres has a known duplicate-key race there) and the document-
// number backfills (no UNIQUE on enrollments.offerNo/reportNo/attendanceNo),
// producing duplicate IQI- offer/report/attendance numbers. A session-pinned
// advisory lock serializes init across instances; the wait is bounded by
// statement_timeout so a stuck holder surfaces as a retriable error instead of
// hanging every request behind ensureReady(). (Supabase session-mode pooler
// pins each client to one backend, so the lock survives between statements.)
const INIT_LOCK_KEY = 74001;
const runInit = async () => {
  const lockClient = await withConnectRetry(() => pool.connect());
  let lockHeld = false;
  try {
    // Bound the lock WAIT only: after acquisition this client issues nothing
    // but the unlock, so the timeout never touches the init statements
    // (which run on other pool connections with their own 15s budget).
    await lockClient.query('SET statement_timeout = 45000');
    await lockClient.query('SELECT pg_advisory_lock($1)', [INIT_LOCK_KEY]);
    lockHeld = true;
    await runInitBody();
  } finally {
    if (lockHeld) {
      // If this fails the lock is released anyway when the connection closes.
      try { await lockClient.query('SELECT pg_advisory_unlock($1)', [INIT_LOCK_KEY]); } catch (_) { /* pool is going down */ }
    }
    lockClient.release();
  }
};

db.init = () => {
  if (!db.ready) {
    db.ready = runInit().catch((err) => {
      db.ready = null;
      throw err;
    });
  }
  return db.ready;
};

module.exports = db;
