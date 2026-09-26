// One-time (and re-runnable) migration:
//   local database.sqlite  ->  Supabase Postgres (DATABASE_URL)
//
// Copies every row with ids preserved, then realigns the identity sequences
// so new rows never collide with migrated ids. Requires DATABASE_URL in the
// environment (.env) and a reachable local database.sqlite.
//
//   node scripts/migrate-sqlite-to-pg.js
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const db = require('../db');

// Insert parents before children so no FK order problems occur.
const ORDER = [
  'users',
  'sessions',
  'internships',
  'universities',
  'colleges',
  'enrollments',
  'payments',
  'exams',
  'certificates',
  'analytics_events',
  'announcements',
  'announcement_reads',
  'questions',
  'learning_modules',
  'settings',
  'contact_messages',
];

const q = (ident) => `"${ident}"`;

async function targetColumns(client, name) {
  const r = await client.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    ['public', name]
  );
  return new Set(r.rows.map((x) => x.column_name));
}

async function copyTable(client, name, rows, skipCols) {
  if (!rows.length) return 0;
  const cols = Object.keys(rows[0]).filter((c) => !skipCols.has(c));
  if (!cols.length) return 0;
  const colList = cols.map(q).join(', ');
  const BATCH = 400;
  let copied = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = batch.map((row) => {
      const ph = cols.map((c) => {
        params.push(row[c] === undefined ? null : row[c]);
        return `$${params.length}`;
      });
      return `(${ph.join(', ')})`;
    });
    await client.query(`INSERT INTO ${q(name)} (${colList}) VALUES ${tuples.join(', ')}`, params);
    copied += batch.length;
  }
  return copied;
}

async function syncSequence(client, name) {
  try {
    const seq = await client.query(
      "SELECT pg_get_serial_sequence($1, 'id') AS seq",
      [name]
    );
    const seqName = seq.rows[0] && seq.rows[0].seq;
    if (!seqName) return false;
    await client.query(
      `SELECT setval($1, GREATEST(COALESCE((SELECT MAX(id) FROM ${q(name)}), 0), 1))`,
      [seqName]
    );
    return true;
  } catch (_) {
    return false;
  }
}

async function main() {
  const sqlitePath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
  console.log(`Source : ${sqlitePath}`);
  console.log(`Target : ${(process.env.DATABASE_URL || '').replace(/:[^:@/]*@/, ':***@')}`);

  await db.ready; // ensures schema exists (idempotent)

  const sqlite = new Database(sqlitePath, { readonly: true });
  const found = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name);

  const unknown = found.filter((t) => !ORDER.includes(t));
  if (unknown.length) {
    console.warn(`WARNING: tables not in ORDER list (skipped): ${unknown.join(', ')}`);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE ${ORDER.map(q).join(', ')} RESTART IDENTITY CASCADE`);

    let total = 0;
    for (const name of ORDER) {
      if (!found.includes(name)) continue;
      const rows = sqlite.prepare(`SELECT * FROM ${q(name)}`).all();
      const target = await targetColumns(client, name);
      const srcCols = rows.length ? Object.keys(rows[0]) : [];
      const skipped = srcCols.filter((c) => !target.has(c));
      if (skipped.length) console.log(`  ${name.padEnd(20)} skipping unknown columns: ${skipped.join(', ')}`);
      const n = await copyTable(client, name, rows, new Set(skipped));
      total += n;
      console.log(`  ${name.padEnd(20)} ${n} rows`);
    }

    for (const name of ORDER) {
      if (!found.includes(name)) continue;
      await syncSequence(client, name);
    }

    await client.query('COMMIT');
    console.log(`Migration complete: ${total} rows copied.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration FAILED — rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    sqlite.close();
    await db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
