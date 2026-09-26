// Supabase registry write-through (Path C).
// SQLite stays the source of truth; this module mirrors users / enrollments /
// payments into Supabase so centralized validation can read a real database.
//
//   • No-op when SUPABASE_SYNC=false or SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//     are missing — the app runs exactly as before.
//   • Every call funnels through one serialized FIFO queue: FK order is
//     guaranteed (student -> enrollment -> payment) and a failed sync is
//     logged, never thrown into the HTTP request path.
//   • Tasks re-read current SQLite state, so they are idempotent and
//     self-healing: a payment sync upserts its student and enrollment first.
//   • password and completedModules are never mirrored.
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SYNC_ENABLED = !/^(false|0|no|off)$/i.test(String(process.env.SUPABASE_SYNC ?? 'true').trim());

let client = null;
if (!SYNC_ENABLED) {
  console.log('[registry] Supabase sync disabled via SUPABASE_SYNC');
} else if (SUPABASE_URL && SERVICE_ROLE_KEY) {
  try {
    // Every registry HTTP call is bounded to 15s so one slow request can
    // never stall the sync queue indefinitely.
    const fetchWithTimeout = (input, init = {}) =>
      fetch(input, init.signal ? init : { ...init, signal: AbortSignal.timeout(15000) });
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    });
    console.log('[registry] Supabase sync enabled');
  } catch (err) {
    console.error('[registry] Supabase client init failed — sync off:', err.message);
  }
} else {
  console.log('[registry] Supabase sync not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
}

// ---- one serialized FIFO queue (FK-safe, failure-proof) --------------------
let queue = Promise.resolve();

// Transient network blips are retried inside the queue (tasks re-read SQLite
// state, so retrying is always safe); after 3 attempts the failure is logged
// and the queue continues with the next task.
async function runWithRetry(task) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await task();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 1000 : 3000));
    }
  }
  throw lastErr;
}

function enqueue(label, task) {
  if (!client) return;
  queue = queue.then(async () => {
    try {
      await runWithRetry(task);
    } catch (err) {
      console.error(`[registry] sync failed (${label}):`, err.message || err);
    }
  });
}

// SQLite CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS', UTC) or ISO strings
// normalized to timestamptz-safe ISO; invalid / empty -> null.
function toIso(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---- SQLite readers (password / completedModules never leave) --------------
function readStudent(localUserId) {
  const u = db.prepare(`
    SELECT id, firstName, lastName, email, phone, university, college, course, year,
           gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
           role, createdAt, createdByAdmin
    FROM users WHERE id = ?
  `).get(localUserId);
  if (!u || u.role !== 'student') return null;

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

function readAdmin(localUserId) {
  const u = db.prepare('SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id = ?').get(localUserId);
  if (!u || u.role !== 'admin') return null;

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

function readEnrollment(localEnrollmentId) {
  return db.prepare(`
    SELECT id, userId, internshipId, status, progress, enrolledAt, expiresAt,
           offerNo, reportNo, attendanceNo
    FROM enrollments WHERE id = ?
  `).get(localEnrollmentId) || null;
}

function readPayment(localPaymentId) {
  return db.prepare(`
    SELECT id, userId, enrollmentId, amount, method, status, receiptNumber,
           transactionId, razorpayOrderId, razorpayPaymentId, paidAt, createdAt
    FROM payments WHERE id = ?
  `).get(localPaymentId) || null;
}

// ---- tasks (run inside the queue; each may throw — queue logs it) ----------
async function ensureStudentId(localUserId) {
  const row = readStudent(localUserId);
  if (!row) return null;
  const { data, error } = await client
    .from('students')
    .upsert(row, { onConflict: 'local_user_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertAdmin(localUserId, markLogin) {
  const row = readAdmin(localUserId);
  if (!row) return;
  // Partial payload: when not a login, last_login_at is untouched by the
  // conflict update, so an earlier login time is never erased.
  if (markLogin) row.last_login_at = new Date().toISOString();
  const { error } = await client.from('admins').upsert(row, { onConflict: 'local_user_id' });
  if (error) throw error;
}

async function ensureEnrollmentId(localEnrollmentId, studentId) {
  const e = readEnrollment(localEnrollmentId);
  if (!e) return null;
  const sid = studentId ?? (await ensureStudentId(e.userId));
  if (!sid) {
    console.log(`[registry] skip enrollment #${localEnrollmentId} — user #${e.userId} has no syncable student row`);
    return null;
  }

  const internship = db.prepare('SELECT title FROM internships WHERE id = ?').get(e.internshipId);
  const row = {
    student_id: sid,
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
  // Omitted when the program no longer exists → last known title is kept.
  if (internship) row.internship_title = internship.title;

  const { data, error } = await client
    .from('enrollments')
    .upsert(row, { onConflict: 'local_enrollment_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertPaymentRow(localPaymentId) {
  const p = readPayment(localPaymentId);
  if (!p) return;

  const sid = await ensureStudentId(p.userId);
  if (!sid) {
    console.log(`[registry] skip payment #${localPaymentId} — user #${p.userId} has no syncable student row`);
    return;
  }
  const eid = p.enrollmentId ? await ensureEnrollmentId(p.enrollmentId, sid) : null;

  const row = {
    student_id: sid,
    enrollment_id: eid,
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

  const { error } = await client.from('payments').upsert(row, { onConflict: 'local_payment_id' });
  if (error) throw error;
}

async function removeStudentTask(localUserId) {
  const first = await client.from('students').delete().eq('local_user_id', localUserId);
  if (first.error) throw first.error;
  const second = await client.from('admins').delete().eq('local_user_id', localUserId);
  if (second.error) throw second.error;
}

async function removeEnrollmentsTask(localEnrollmentIds) {
  if (!localEnrollmentIds.length) return;
  // Registry payments cascade from enrollments (FK ON DELETE CASCADE).
  const { error } = await client
    .from('enrollments')
    .delete()
    .in('local_enrollment_id', localEnrollmentIds);
  if (error) throw error;
}

async function roleChangeTask(localUserId, newRole) {
  if (newRole === 'admin') {
    // SQLite keeps the user row and their enrollments — only the registry
    // admin mirror is (re)written; the students row stays for its children.
    await upsertAdmin(localUserId, false);
    return;
  }
  await ensureStudentId(localUserId);
  const { error } = await client.from('admins').delete().eq('local_user_id', localUserId);
  if (error) throw error;
}

module.exports = {
  enqueueStudent: (localUserId) =>
    enqueue(`student#${localUserId}`, () => ensureStudentId(localUserId)),
  enqueueAdminLogin: (localUserId) =>
    enqueue(`admin-login#${localUserId}`, () => upsertAdmin(localUserId, true)),
  enqueueRoleChange: (localUserId, role) =>
    enqueue(`role#${localUserId}`, () => roleChangeTask(localUserId, role)),
  enqueueEnrollment: (localEnrollmentId) =>
    enqueue(`enrollment#${localEnrollmentId}`, () => ensureEnrollmentId(localEnrollmentId)),
  enqueuePayment: (localPaymentId) =>
    enqueue(`payment#${localPaymentId}`, () => upsertPaymentRow(localPaymentId)),
  enqueueRemoveStudent: (localUserId) =>
    enqueue(`remove-student#${localUserId}`, () => removeStudentTask(localUserId)),
  enqueueRemoveEnrollments: (ids) => {
    const list = (Array.isArray(ids) ? ids : [ids]).filter((n) => Number.isFinite(Number(n))).map(Number);
    const shown = list.slice(0, 5).join(',') + (list.length > 5 ? ',…' : '');
    enqueue(`remove-enrollments[${shown}]`, () => removeEnrollmentsTask(list));
  },
};
