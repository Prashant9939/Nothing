// Admin-configurable settings stored in the `settings` key-value table.
// getSetting falls back to these defaults when a key has never been saved.

const DEFAULTS = {
  attendanceDateMode: 'forward',
  companyName: 'Zenethix Private Limited',
  companyAddress: 'Sector 154, Noida, Uttar Pradesh 201310',
  companyCin: 'U85500BR2025PTC076013',
  directorName: 'Prashant Kumar',
  siteUrl: '',
};

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row) return row.value;
  return Object.prototype.hasOwnProperty.call(DEFAULTS, key) ? DEFAULTS[key] : '';
}

function getAllSettings(db) {
  const out = { ...DEFAULTS };
  db.prepare('SELECT key, value FROM settings').all().forEach(({ key, value }) => {
    out[key] = value;
  });
  return out;
}

function setSettings(db, updates) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  Object.entries(updates).forEach(([key, value]) => stmt.run(key, value));
}

module.exports = { DEFAULTS, getSetting, getAllSettings, setSettings };
