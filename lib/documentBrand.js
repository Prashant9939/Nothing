// Shared legal/branding elements used by every generated document:
// company CIN line, the computer-generated disclaimer and the company
// stamp image from client/src/assets/Legeal.
//
// Branding strings are cached in memory so the PDF builders stay fully
// synchronous. refreshBrand() is awaited once at server startup (after the
// database is ready) and again whenever an admin updates the settings.

const path = require('path');
const db = require('../db');
const { getSettings } = require('./settings');
const STAMP_FILE = path.join(__dirname, '..', 'client', 'src', 'assets', 'Legeal', 'staml.png');

const DISCLAIMER_LINES = [
  'This document is computer generated. It does not need any physical verification.',
  'If you want to verify, scan the QR code of this document.',
];

let brand = { companyName: '', companyAddress: '', companyCin: '', directorName: '', siteUrl: '', attendanceDateMode: '' };

async function refreshBrand() {
  // Single bulk read — this runs on every boot (cold-start gate) and on every
  // settings save; four sequential SELECTs cost 4 round trips to the pooler.
  // siteUrl and attendanceDateMode are cached here too: every generated
  // document used to re-read them from the DB per request (makeQr, attendance
  // date mode), and they are only ever changed through the settings PUT, which
  // already calls refreshBrand().
  const s = await getSettings(db, [
    'companyName', 'companyAddress', 'companyCin', 'directorName',
    'siteUrl', 'attendanceDateMode',
  ]);
  brand = {
    companyName: s.companyName,
    companyAddress: s.companyAddress,
    companyCin: s.companyCin,
    directorName: s.directorName,
    siteUrl: s.siteUrl,
    attendanceDateMode: s.attendanceDateMode,
  };
  return brand;
}

const companyName = () => brand.companyName;
const companyAddress = () => brand.companyAddress;
const companyCin = () => brand.companyCin;
const directorName = () => brand.directorName;
const siteUrl = () => brand.siteUrl;
const attendanceDateMode = () => (brand.attendanceDateMode === 'backward' ? 'backward' : 'forward');

// Worker-thread support: the PDF render worker hydrates its own copy of the
// brand cache from these (structured-cloneable plain object).
const getBrandState = () => ({ ...brand });
const hydrateBrand = (values) => { if (values && typeof values === 'object') brand = { ...brand, ...values }; };

// "CIN - U85500BR2025PTC076013", or '' when no CIN is configured
const cinLabel = () => {
  const cin = companyCin();
  return cin ? `CIN - ${cin}` : '';
};

const footText = () =>
  [companyName(), companyAddress(), cinLabel()].filter(Boolean).join('  |  ');

// Draws the round company stamp at (x, y) sized `size` x `size` pt.
function drawStamp(doc, x, y, size = 72) {
  try {
    doc.image(STAMP_FILE, x, y, { width: size, height: size, opacity: 0.92 });
    return true;
  } catch (e) {
    return false;
  }
}

// Draws the two-line computer-generated / QR-verification disclaimer.
// Returns the y position just below the last line.
function drawDisclaimer(doc, y, opts = {}) {
  const size = opts.size || 6.5;
  const x = opts.x != null ? opts.x : 50;
  const width = opts.width != null ? opts.width : doc.page.width - 100;
  const align = opts.align || 'center';
  const color = opts.color || '#6B7280';
  const lineH = size + 2.5;
  doc.font('Helvetica').fontSize(size).fillColor(color);
  DISCLAIMER_LINES.forEach((line, i) => {
    doc.text(line, x, y + i * lineH, { width, align });
  });
  return y + DISCLAIMER_LINES.length * lineH;
}

module.exports = {
  companyName,
  companyAddress,
  companyCin,
  directorName,
  siteUrl,
  attendanceDateMode,
  cinLabel,
  footText,
  drawStamp,
  drawDisclaimer,
  refreshBrand,
  getBrandState,
  hydrateBrand,
};
