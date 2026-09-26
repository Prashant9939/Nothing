#!/usr/bin/env node
// One-time (and re-runnable) migration: SQLite database.sqlite -> Supabase
// registry. Idempotent — rows are upserted and matched on local_* ids, so a
// second run only refreshes what already exists.
//
//   node scripts/supabase-migrate.js
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
// Optional SUPABASE_DB_URL: applies scripts/supabase-schema.sql automatically.
// Without it, paste that file into the Supabase SQL Editor once first.
//
// After migrating, keep the server running as usual — live writes are
// mirrored continuously by lib/supabaseRegistry.js.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(__dirname, 'supabase-schema.sql');
const CHUNK = 300;
const LIST_LIMIT = 100000;

// SQLite CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS', UTC) or ISO -> ISO, else null
function toIso(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function studentPayload(u) {
  const row = {
    local_user_id: u.id,
    first_name: u.firstName || '',
    last_name: u.lastName || '',
    email: u.email,
    phone: u.phone || '',
    university: u.university || '',
    college: u.college || '',
    course: u.course || '',
    year: u.year || '',
    gender: u.gender || '',
    dob: u.dob || '',
    roll_no: u.rollNo || '',
    reg_no: u.regNo || '',
    guardian_name: u.guardianName || '',
    guardian_phone: u.guardianPhone || '',
    guardian_relation: u.guardianRelation || '',
    created_by_admin: !!u.createdByAdmin,
    updated_at: new Date().toISOString(),
  };
  const createdAt = toIso(u.createdAt);
  if (createdAt) row.created_at = createdAt;
  return row;
}

function adminPayload(u) {
  const row = {
    local_user_id: u.id,
    first_name: u.firstName || '',
    last_name: u.lastName || '',
    email: u.email,
    updated_at: new Date().toISOString(),
  };
  const createdAt = toIso(u.createdAt);
  if (createdAt) row.created_at = createdAt;
  return row;
}

function enrollmentPayload(e, studentId, internshipTitle) {
  const row = {
    student_id: studentId,
    local_enrollment_id: e.id,
    local_user_id: e.userId,
    internship_id: e.internshipId,
    status: e.status,
    progress: e.progress ?? 0,
    enrolled_at: toIso(e.enrolledAt),
    expires_at: toIso(e.expiresAt),
    offer_no: e.offerNo || null,
    report_no: e.reportNo || null,
    attendance_no: e.attendanceNo || null,
    updated_at: new Date().toISOString(),
  };
  if (internshipTitle) row.internship_title = internshipTitle;
  return row;
}

function paymentPayload(p, studentId, enrollmentId) {
  const row = {
    student_id: studentId,
    enrollment_id: enrollmentId,
    local_payment_id: p.id,
    local_enrollment_id: p.enrollmentId,
    receipt_number: p.receiptNumber || null,
    amount: p.amount,
    method: p.method || 'razorpay',
    status: p.status,
    transaction_id: p.transactionId || null,
    razorpay_order_id: p.razorpayOrderId || null,
    razorpay_payment_id: p.razorpayPaymentId || null,
    paid_at: toIso(p.paidAt),
    updated_at: new Date().toISOString(),
  };
  const createdAt = toIso(p.createdAt);
  if (createdAt) row.created_at = createdAt;
  return row;
}

async function main() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const dbUrl = (process.env.SUPABASE_DB_URL || '').trim();
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env — nothing to migrate to.');
    process.exitCode = 1;
    return;
  }

  const dbPath = (() => {
    const p = process.env.DB_PATH || './database.sqlite';
    return path.isAbsolute(p) ? p : path.join(ROOT, p);
  })();
  if (!fs.existsSync(dbPath)) {
    console.error(`SQLite database not found: ${dbPath}`);
    process.exitCode = 1;
    return;
  }

  // ---- 1. read SQLite (read-only) ------------------------------------------
  const sqlite = new Database(dbPath, { readonly: true });
  const students = sqlite.prepare(`
    SELECT id, firstName, lastName, email, phone, university, college, course, year,
           gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
           createdAt, createdByAdmin
    FROM users WHERE role = 'student' ORDER BY id
  `).all();
  const admins = sqlite.prepare(`
    SELECT id, firstName, lastName, email, createdAt FROM users WHERE role = 'admin' ORDER BY id
  `).all();
  const enrollments = sqlite.prepare(`
    SELECT id, userId, internshipId, status, progress, enrolledAt, expiresAt,
           offerNo, reportNo, attendanceNo
    FROM enrollments ORDER BY id
  `).all();
  const payments = sqlite.prepare(`
    SELECT id, userId, enrollmentId, amount, method, status, receiptNumber,
           transactionId, razorpayOrderId, razorpayPaymentId, paidAt, createdAt
    FROM payments ORDER BY id
  `).all();
  const internshipTitles = new Map(
    sqlite.prepare('SELECT id, title FROM internships').all().map((r) => [r.id, r.title])
  );
  sqlite.close();

  console.log('SQLite rows found:');
  console.log(`  students=${students.length}  admins=${admins.length}  enrollments=${enrollments.length}  payments=${payments.length}`);
  console.log(`  database: ${dbPath}`);

  // ---- 2. schema (optional, via connection string) -------------------------
  if (dbUrl) {
    console.log('\nApplying scripts/supabase-schema.sql via SUPABASE_DB_URL ...');
    const { Client } = require('pg');
    const cfg = { connectionString: dbUrl };
    if (!/sslmode=/.test(dbUrl)) cfg.ssl = { rejectUnauthorized: false };
    const pg = new Client(cfg);
    await pg.connect();
    await pg.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    await pg.end();
    console.log('  schema applied');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, init.signal ? init : { ...init, signal: AbortSignal.timeout(30000) }),
    },
  });

  // ---- 3. make sure the registry tables exist ------------------------------
  const probe = await supabase.from('students').select('id').limit(1);
  if (probe.error) {
    const missingTable = probe.error.code === '42P01' || probe.error.code === 'PGRST205'
      || /does not exist|could not find/i.test(probe.error.message || '');
    if (missingTable) {
      console.error('\nRegistry tables are missing. Either:');
      console.error('  • set SUPABASE_DB_URL in .env and re-run, or');
      console.error('  • paste scripts/supabase-schema.sql into the Supabase SQL Editor, run it, then re-run this script.');
      process.exitCode = 1;
      return;
    }
    throw new Error(`Supabase probe failed: ${probe.error.message}`);
  }

  // ---- 4. import (FK order: students -> admins -> enrollments -> payments) --
  async function upsert(table, rows, onConflict) {
    if (!rows.length) {
      console.log(`  ${table}: nothing to import`);
      return;
    }
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict });
      if (error) throw new Error(`${table} rows ${i + 1}-${i + chunk.length}: ${error.message}`);
      console.log(`  ${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
    }
  }

  async function fetchIdMap(table, localCol) {
    const { data, error } = await supabase.from(table).select(`id, ${localCol}`).limit(LIST_LIMIT);
    if (error) throw new Error(`${table}: ${error.message}`);
    return new Map(data.map((r) => [r[localCol], r.id]));
  }

  console.log('\nImporting students...');
  await upsert('students', students.map(studentPayload), 'local_user_id');
  const studentIds = await fetchIdMap('students', 'local_user_id');

  console.log('Importing admins...');
  await upsert('admins', admins.map(adminPayload), 'local_user_id');

  console.log('Importing enrollments...');
  await upsert('enrollments', enrollments.map((e) => {
    const sid = studentIds.get(e.userId);
    if (!sid) throw new Error(`enrollment #${e.id}: no students row for user #${e.userId}`);
    return enrollmentPayload(e, sid, internshipTitles.get(e.internshipId));
  }), 'local_enrollment_id');
  const enrollmentIds = await fetchIdMap('enrollments', 'local_enrollment_id');

  console.log('Importing payments...');
  await upsert('payments', payments.map((p) => {
    const sid = studentIds.get(p.userId);
    if (!sid) throw new Error(`payment #${p.id}: no students row for user #${p.userId}`);
    return paymentPayload(p, sid, enrollmentIds.get(p.enrollmentId) ?? null);
  }), 'local_payment_id');

  // ---- 5. verify: every SQLite row must exist in the registry --------------
  async function remoteIdSet(table, localCol) {
    const { data, error } = await supabase.from(table).select(localCol).limit(LIST_LIMIT);
    if (error) throw new Error(`${table}: ${error.message}`);
    return new Set(data.map((r) => r[localCol]));
  }

  const checks = [
    ['students', 'local_user_id', students.map((r) => r.id)],
    ['admins', 'local_user_id', admins.map((r) => r.id)],
    ['enrollments', 'local_enrollment_id', enrollments.map((r) => r.id)],
    ['payments', 'local_payment_id', payments.map((r) => r.id)],
  ];

  console.log('\nVerification (SQLite vs Supabase registry):');
  let allOk = true;
  for (const [table, localCol, ids] of checks) {
    const remote = await remoteIdSet(table, localCol);
    const sqliteSet = new Set(ids);
    const missing = ids.filter((id) => !remote.has(id));
    const extras = [...remote].filter((id) => !sqliteSet.has(id));
    if (missing.length) allOk = false;
    console.log(`  ${table.padEnd(12)} sqlite=${String(ids.length).padStart(5)}  registry=${String(remote.size).padStart(5)}  ${missing.length ? 'MISSING' : 'OK'}`);
    if (missing.length) console.log(`    missing local ids: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`);
    if (extras.length) console.log(`    registry rows not in SQLite (old test data?): ${extras.slice(0, 10).join(', ')}${extras.length > 10 ? ' …' : ''}`);
  }

  console.log(allOk
    ? '\nMigration complete — every SQLite row exists in the registry.'
    : '\nMigration INCOMPLETE — see missing rows above.');
  process.exitCode = allOk ? 0 : 1;
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message || err);
  process.exitCode = 1;
});
