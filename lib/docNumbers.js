// Unique, non-sequential document numbers in the format IQI-<TYPE>-<YYYY>-<6 random digits>
// e.g. IQI-OL-2026-483920, IQI-REC-2026-739164 — random serials with a
// uniqueness check so numbers never run in a continuous sequence.

const DOC_COLUMNS = { offerNo: 'OL', reportNo: 'PR', attendanceNo: 'ATT' };

const randomSerial = () => String(Math.floor(100000 + Math.random() * 900000));

function makeNumber(db, prefix, column, table) {
  const year = new Date().getFullYear();
  let no;
  do {
    no = `IQI-${prefix}-${year}-${randomSerial()}`;
  } while (db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(no));
  return no;
}

// Returns the stored number for an enrollment document column, generating and
// persisting one on first use (column names come from the DOC_COLUMNS whitelist).
function ensureEnrollmentNumber(db, enrollment, column) {
  const prefix = DOC_COLUMNS[column];
  if (!prefix) throw new Error(`Unknown document column: ${column}`);
  if (enrollment[column]) return enrollment[column];
  const no = makeNumber(db, prefix, column, 'enrollments');
  db.prepare(`UPDATE enrollments SET ${column} = ? WHERE id = ?`).run(no, enrollment.id);
  enrollment[column] = no;
  return no;
}

function newReceiptNumber(db) {
  return makeNumber(db, 'REC', 'receiptNumber', 'payments');
}

module.exports = { DOC_COLUMNS, makeNumber, ensureEnrollmentNumber, newReceiptNumber };
