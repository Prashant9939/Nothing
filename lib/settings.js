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

// Bulk read: one round trip for any number of keys (refreshBrand and similar
// hot paths used to issue one SELECT per key).
async function getSettings(db, keys) {
  const out = {};
  if (!keys.length) return out;
  const placeholders = keys.map(() => '?').join(', ');
  const rows = await db.all(`SELECT key, value FROM settings WHERE key IN (${placeholders})`, ...keys);
  const found = new Map(rows.map((r) => [r.key, r.value]));
  for (const key of keys) {
    out[key] = found.has(key)
      ? found.get(key)
      : Object.prototype.hasOwnProperty.call(DEFAULTS, key) ? DEFAULTS[key] : '';
  }
  return out;
}

async function getAllSettings(db) {
  const out = { ...DEFAULTS };
  for (const { key, value } of await db.all('SELECT key, value FROM settings')) {
    out[key] = value;
  }
  return out;
}

// Multi-row upsert: a single statement instead of one round trip per key
// (saving ~6 RTTs per admin settings save against a remote pooler).
async function setSettings(db, updates) {
  const entries = Object.entries(updates);
  if (!entries.length) return;
  const tuples = entries.map(() => '(?, ?)').join(', ');
  const stmt = `INSERT INTO settings (key, value) VALUES ${tuples} ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
  await db.run(stmt, ...entries.flat());
}

module.exports = { DEFAULTS, getSetting, getSettings, getAllSettings, setSettings };
