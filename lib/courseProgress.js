const db = require('../db');

// Admin-approved marks finish the course for the student: every learning
// module is checked off and progress goes to 100%. progress is what the
// attendance sheet, daily log, report and dashboard all read, so 100% is
// also what makes attendance "all days present".
//
// completedModules holds 0-based module positions (see validateModuleIndex
// in routes/student.js), matching COUNT(*) of the track's learning_modules.
async function markCourseComplete(enrollmentId) {
  const enrollment = await db.get('SELECT internshipId FROM enrollments WHERE id = ?', enrollmentId);
  if (!enrollment) return;
  const row = await db.get('SELECT COUNT(*) AS count FROM learning_modules WHERE internshipId = ?', enrollment.internshipId);
  const total = Number(row?.count || 0);
  const completed = Array.from({ length: total }, (_, i) => i);
  await db.run('UPDATE enrollments SET completedModules = ?, progress = 100 WHERE id = ?', JSON.stringify(completed), enrollmentId);
}

module.exports = { markCourseComplete };
