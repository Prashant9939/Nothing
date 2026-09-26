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

async function getSetting(db, key) {
  const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
  if (row) return row.value;
  return Object.prototype.hasOwnProperty.call(DEFAULTS, key) ? DEFAULTS[key] : '';
}

async function getAllSettings(db) {
  const out = { ...DEFAULTS };
  for (const { key, value } of await db.all('SELECT key, value FROM settings')) {
    out[key] = value;
  }
  return out;
}

async function setSettings(db, updates) {
  const stmt = ('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const [key, value] of Object.entries(updates)) await db.run(stmt, key, value);
}

module.exports = { DEFAULTS, getSetting, getAllSettings, setSettings };
