// Shared legal/branding elements used by every generated document:
// company CIN line, the computer-generated disclaimer and the company
// stamp image from client/src/assets/Legeal.
//
// Branding strings are cached in memory so the PDF builders stay fully
// synchronous. refreshBrand() is awaited once at server startup (after the
// database is ready) and again whenever an admin updates the settings.

const path = require('path');
const db = require('../db');
const { getSetting } = require('./settings');

const STAMP_FILE = path.join(__dirname, '..', 'client', 'src', 'assets', 'Legeal', 'staml.png');

const DISCLAIMER_LINES = [
  'This document is computer generated. It does not need any physical verification.',
  'If you want to verify, scan the QR code of this document.',
];

let brand = { companyName: '', companyAddress: '', companyCin: '', directorName: '' };

async function refreshBrand() {
  brand = {
    companyName: await getSetting(db, 'companyName'),
    companyAddress: await getSetting(db, 'companyAddress'),
    companyCin: await getSetting(db, 'companyCin'),
    directorName: await getSetting(db, 'directorName'),
  };
  return brand;
}

const companyName = () => brand.companyName;
const companyAddress = () => brand.companyAddress;
const companyCin = () => brand.companyCin;
const directorName = () => brand.directorName;

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
  cinLabel,
  footText,
  drawStamp,
  drawDisclaimer,
  refreshBrand,
};
