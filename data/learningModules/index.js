// Learning-module catalogs for tracks that ship outside db.js.
//
// Each entry pairs the internships.title (db.js looks internships up by title,
// never by id, so ids stay free to differ between environments) with the module
// array authored for that track. Modules carry no internshipId — db.js injects
// it at seed time.
//
// Seeding is per-track and idempotent: a track is only filled in when it has
// zero rows in learning_modules, so re-running the server never duplicates
// modules and adding a track here later safely backfills an existing database.
module.exports = [
  { internshipTitle: 'Skill Development Program', modules: require('./skill') },
  { internshipTitle: 'Teacher Training & Pedagogy', modules: require('./teaching') },
  { internshipTitle: 'Human Resource Management', modules: require('./hr') },
  { internshipTitle: 'Entrepreneurship & Startup Growth', modules: require('./entrepreneurship') },
  { internshipTitle: 'Tourism & Hospitality Management', modules: require('./tourism') },
];
