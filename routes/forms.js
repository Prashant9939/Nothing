// Public, downloadable form PDFs shown on the certificate-verification page.
// No authentication — these are blank templates anyone can download, print and
// sign. Branding (company name, address, CIN, stamp, disclaimer) comes from
// lib/documentBrand so the forms match every other generated document.
const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../db');
const { getSetting } = require('../lib/settings');
const { companyName, companyAddress, cinLabel, footText, drawStamp, drawDisclaimer } = require('../lib/documentBrand');

const router = express.Router();

// ===================== DESIGN SYSTEM (mirrors routes/documents.js) =====================
const GREEN = {
  dark: '#1C6954',
  mid: '#20886C',
  light: '#3A967B',
  mint: '#A7E8D8',
  wave: '#7ED0BB',
  pale: '#F0F9F5',
  stroke: '#CDEBE0',
  ink: '#1F2937',
  body: '#374151',
  gray: '#6B7280',
};

const LOGO_FILE = path.join(__dirname, '..', 'client', 'public', 'logo', 'logo-full.png');

let LOGO_SIZE = { width: 2274, height: 1856 };
try {
  const buf = fs.readFileSync(LOGO_FILE);
  if (buf.length > 24 && buf.slice(1, 4).toString('ascii') === 'PNG') {
    LOGO_SIZE = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
} catch (e) {
  // logo file missing - drawBrand falls back to a text mark
}

function drawLogo(doc, x, y, height) {
  try {
    doc.image(LOGO_FILE, x, y, { height });
    return height * (LOGO_SIZE.width / LOGO_SIZE.height);
  } catch (e) {
    return null;
  }
}

function drawWatermark(doc, text) {
  const w = doc.page.width;
  const h = doc.page.height;
  const fs2 = Math.round(Math.min(w, h) * 0.14);
  doc.save();
  doc.font('Helvetica-Bold').fontSize(fs2);
  doc.fillColor(GREEN.dark).fillOpacity(0.035);
  doc.rotate(-30, { origin: [w / 2, h / 2] });
  doc.text(text, 0, h / 2 - fs2 * 0.36, { width: w, align: 'center' });
  doc.restore();
}

function drawBrand(doc, x, y) {
  const logoH = 80;
  const logoY = y - 36;
  const logoW = drawLogo(doc, x, logoY, logoH);
  if (logoW === null) {
    doc.roundedRect(x, logoY, 56, 56, 11).fill(GREEN.dark);
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#fff').text('Z', x, logoY + 14, { width: 56, align: 'center' });
  }
  const tx = x + (logoW || 64) + (logoW ? 12 : 8);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN.dark).text(companyName(), tx, logoY + 24);
  doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray).text(companyAddress(), tx, logoY + 46);
  const cin = cinLabel();
  if (cin) doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN.mid).text(cin, tx, logoY + 58);
}

function drawTitle(doc, title, y, opts = {}) {
  const w = doc.page.width;
  const size = opts.size || 24;
  const align = opts.align || 'left';
  doc.font('Helvetica-Bold').fontSize(size).fillColor(GREEN.dark)
    .text(title, 50, y, { width: w - 100, align });
  const tw = opts.ruleW || Math.min(doc.widthOfString(title, { font: 'Helvetica-Bold', size }), w - 100);
  const rx = align === 'center' ? (w - tw) / 2 : 50;
  const g = doc.linearGradient(rx, 0, rx + tw, 0);
  g.stop(0, GREEN.dark).stop(1, GREEN.wave);
  doc.rect(rx, y + size + 10, tw, 3).fill(g);
}

function drawFooter(doc) {
  const w = doc.page.width;
  const h = doc.page.height;
  const g = doc.linearGradient(50, 0, w - 50, 0);
  g.stop(0, GREEN.mint).stop(1, GREEN.wave);
  doc.rect(50, h - 132, w - 100, 1.2).fill(g);
  doc.font('Helvetica').fontSize(7).fillColor(GREEN.gray)
    .text(footText(), 50, h - 126, { width: w - 100, align: 'center' });
  drawDisclaimer(doc, h - 117, { size: 6.5 });
}

// QR pointing at the public verification page — keeps the shared disclaimer
// ("scan the QR code of this document") accurate on forms too.
const VERIFY_BASE = (process.env.SITE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

async function makeVerifyQr() {
  try {
    const base = (getSetting(db, 'siteUrl') || VERIFY_BASE).replace(/\/+$/, '');
    return await QRCode.toBuffer(`${base}/certification`, {
      margin: 1, width: 240, color: { dark: '#1C6954', light: '#FFFFFF' },
    });
  } catch (e) {
    console.error('QR generation failed:', e.message);
    return null;
  }
}

function drawQrBadge(doc, qrBuffer, x, y, box = 58) {
  if (!qrBuffer) return;
  doc.roundedRect(x, y, box, box, 8).fill('#ffffff').stroke(GREEN.stroke);
  doc.image(qrBuffer, x + 6, y + 6, { width: box - 12 });
  doc.font('Helvetica').fontSize(6.5).fillColor(GREEN.gray)
    .text('Scan to verify', x - 12, y + box + 4, { width: box + 24, align: 'center' });
}

function sectionBar(doc, label, y) {
  const w = doc.page.width;
  const g = doc.linearGradient(50, 0, w - 50, 0);
  g.stop(0, GREEN.dark).stop(1, GREEN.light);
  doc.roundedRect(50, y, w - 100, 22, 5).fill(g);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#fff').text(label, 62, y + 5.5, { width: w - 130 });
  return y + 30;
}

// ===================== FORM FIELD PRIMITIVES =====================
const L = 50;
const RIGHT = () => L + (595.28 - 100); // A4 width 595.28, symmetric margins
const INNER_W = () => RIGHT() - L;
const COL_W = () => (INNER_W() - 24) / 2;

// Label + writing line. Returns the y for the next row.
function field(doc, label, x, y, w) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.dark).text(label.toUpperCase(), x, y, { width: w });
  doc.lineWidth(0.8).strokeColor('#9CA3AF');
  doc.moveTo(x, y + 20).lineTo(x + w, y + 20).stroke();
  return y + 34;
}

// Two-column grid of fields: rows = [[label, label], ...]
function fieldGrid(doc, rows, y) {
  const cw = COL_W();
  for (const [a, b] of rows) {
    field(doc, a, L, y, cw);
    if (b) field(doc, b, L + cw + 24, y, cw);
    y += 34;
  }
  return y;
}

// Checkbox + wrapped statement. Returns the y below the item.
function checkItem(doc, text, x, y, w) {
  doc.lineWidth(1).strokeColor(GREEN.mid);
  doc.roundedRect(x, y + 1, 11, 11, 2).stroke();
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body);
  doc.text(text, x + 20, y, { width: w - 20, lineGap: 2 });
  return doc.y + 9;
}

// Numbered declaration paragraph. Returns the y below it.
function para(doc, num, text, y) {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text(`${num}.`, L, y, { width: 16 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body)
    .text(text, L + 18, y, { width: INNER_W() - 18, lineGap: 2 });
  return doc.y + 9;
}

// Bordered comment box with ruled writing lines. Returns the y below it.
function ruledBox(doc, y, h) {
  const w = INNER_W();
  doc.lineWidth(0.9).strokeColor('#9CA3AF');
  doc.roundedRect(L, y, w, h, 6).stroke();
  doc.lineWidth(0.5).strokeColor('#E5E7EB');
  for (let ly = y + 22; ly < y + h - 6; ly += 22) {
    doc.moveTo(L + 12, ly).lineTo(L + w - 12, ly).stroke();
  }
  return y + h + 12;
}

// Rating table: header "1..5" + one empty checkbox per row per column.
function ratingTable(doc, labels, y) {
  const w = INNER_W();
  const col = 40;
  const labelW = w - col * 5;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.gray).text('(1 = Poor  ·  5 = Excellent)', L, y, { width: labelW });
  y += 16;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark);
  for (let i = 0; i < 5; i++) {
    doc.text(String(i + 1), L + labelW + i * col, y, { width: col, align: 'center' });
  }
  y += 16;
  doc.lineWidth(0.6).strokeColor(GREEN.stroke);
  doc.moveTo(L, y).lineTo(L + w, y).stroke();
  const rowH = 24;
  for (const label of labels) {
    doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body)
      .text(label, L + 4, y + 7, { width: labelW - 8, height: 12, ellipsis: true });
    for (let i = 0; i < 5; i++) {
      doc.lineWidth(0.9).strokeColor('#9CA3AF');
      doc.roundedRect(L + labelW + i * col + (col - 14) / 2, y + 5, 14, 14, 2).stroke();
    }
    y += rowH;
    doc.lineWidth(0.5).strokeColor('#E5E7EB');
    doc.moveTo(L, y).lineTo(L + w, y).stroke();
  }
  return y + 10;
}

// Signature lines (applicant / date / place) + company stamp on the right.
// Pass the y returned by sectionBar('SIGNATURE', …); the stamp sits below the
// bar and everything finishes well above the footer (h - 132).
function signatureBlock(doc, y) {
  const lineY = y + 14;
  const cols = [
    { label: 'Signature of Applicant', x: L, w: 200 },
    { label: 'Date', x: 275, w: 95 },
    { label: 'Place', x: 385, w: 70 },
  ];
  for (const c of cols) {
    doc.lineWidth(0.8).strokeColor('#9CA3AF');
    doc.moveTo(c.x, lineY).lineTo(c.x + c.w, lineY).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.dark).text(c.label.toUpperCase(), c.x, lineY + 4, { width: c.w });
  }
  drawStamp(doc, 478, y + 4, 54);
  doc.font('Helvetica').fontSize(7).fillColor(GREEN.gray)
    .text('Authorised Signatory', 460, y + 60, { width: 96, align: 'center' });
  return Math.max(lineY + 16, y + 70);
}

// ===================== FORM DEFINITIONS =====================
function startForm(res, filename, title, subtitle, qr) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);
  drawWatermark(doc, 'IQINTERN');
  drawBrand(doc, 50, 42);
  drawQrBadge(doc, qr, 474, 46, 58);
  drawTitle(doc, title, 92, { size: 24 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.gray)
    .text(subtitle, 50, 140, { width: INNER_W() });
  return doc;
}

const FORMS = {
  consent: {
    filename: 'IQI-Consent-Form.pdf',
    title: 'CONSENT FORM',
    subtitle: 'Internship Program — Personal Data & Verification Consent',
    render(doc) {
      let y = sectionBar(doc, 'CONSENT DECLARATIONS', 165);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body)
        .text('Please read each statement carefully and tick the box to indicate your consent. This form must be signed and dated to be valid.', L, y, { width: INNER_W(), lineGap: 2 });
      y = doc.y + 10;
      const items = [
        `I consent to the collection, storage and processing of my personal, academic and program-related information by ${companyName()} for the administration of the internship program.`,
        'I consent to the online verification of my credentials, attendance and results by employers, educational institutions and other authorised parties through the official verification portal.',
        'I consent to receive program-related communications, including schedules, updates and results, via email, SMS and phone.',
        'I understand that this consent may be withdrawn at any time in writing by contacting the program office.',
      ];
      for (const t of items) y = checkItem(doc, t, L, y, INNER_W());

      y = sectionBar(doc, 'APPLICANT DETAILS', y + 14);
      y = fieldGrid(doc, [
        ['Full Name', 'Program / Track'],
        ['Reference / Certificate ID', 'Institution / College'],
        ['Email', 'Phone'],
      ], y);

      y = sectionBar(doc, 'SIGNATURE', y + 16);
      y = signatureBlock(doc, y);
      return y;
    },
  },

  feedback: {
    filename: 'IQI-Feedback-Form.pdf',
    title: 'FEEDBACK FORM',
    subtitle: 'Help us improve — share your honest experience of the internship program',
    render(doc) {
      let y = sectionBar(doc, 'INTERNSHIP DETAILS', 165);
      y = fieldGrid(doc, [
        ['Full Name (optional)', 'Program / Track'],
        ['Reference / Certificate ID', 'Duration (Days)'],
      ], y);

      y = sectionBar(doc, 'RATE YOUR EXPERIENCE', y + 14);
      y = ratingTable(doc, [
        'Course content & learning material',
        'Mentorship & support',
        'Online platform & tools',
        'Assessment & examination process',
        'Overall internship experience',
      ], y);

      y = sectionBar(doc, 'COMMENTS & SUGGESTIONS', y + 8);
      doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
        .text('What did you like the most? What can we improve?', L, y, { width: INNER_W() });
      y = doc.y + 8;
      y = ruledBox(doc, y, 48);

      y = sectionBar(doc, 'SIGNATURE', y + 8);
      y = signatureBlock(doc, y);
      return y;
    },
  },

  undertaking: {
    filename: 'IQI-Internship-Undertaking.pdf',
    title: 'INTERNSHIP UNDERTAKING',
    subtitle: 'Self-declaration & Code of Conduct',
    render(doc) {
      let y = sectionBar(doc, 'DECLARATION', 165);
      const paras = [
        'I hereby declare that all information furnished by me in connection with the internship program — including my educational qualifications, contact details and institutional records — is true, complete and correct to the best of my knowledge.',
        'I undertake to complete all learning modules, quizzes, assessments and the final examination of the program honestly, without any form of malpractice, impersonation or unfair means.',
        `I agree to abide by the code of conduct, copyright, confidentiality and acceptable-use policies of ${companyName()} throughout the duration of the program.`,
        'I understand that any misrepresentation or breach of conduct may result in cancellation of my internship and immediate revocation of any documents or certificates issued to me.',
        'I further agree that my enrollment, attendance and results may be verified online through the official verification portal using the reference numbers issued to me.',
      ];
      paras.forEach((t, i) => { y = para(doc, i + 1, t, y); });

      y = sectionBar(doc, 'APPLICANT DETAILS', y + 8);
      y = fieldGrid(doc, [
        ['Full Name', 'Program / Track'],
        ['Reference / Certificate ID', 'Institution / College'],
      ], y);

      y = checkItem(doc, 'I have read and understood the above undertaking and accept it unconditionally.', L, y + 4, INNER_W());

      y = sectionBar(doc, 'SIGNATURE', y + 12);
      y = signatureBlock(doc, y);
      return y;
    },
  },
};

// Accept a couple of friendly aliases for the documented form names
const ALIASES = { declaration: 'undertaking', feedbackform: 'feedback', consentform: 'consent' };

// ===================== PUBLIC ROUTE =====================
router.get('/:type', async (req, res) => {
  const key = String(req.params.type || '').toLowerCase();
  const form = FORMS[ALIASES[key] || key];
  if (!form) return res.status(404).json({ error: 'Unknown form type' });

  try {
    const qr = await makeVerifyQr();
    const doc = startForm(res, form.filename, form.title, form.subtitle, qr);
    form.render(doc);
    drawFooter(doc);
    doc.end();
  } catch (err) {
    console.error(`Form generation failed (${key}):`, err.message);
    if (res.headersSent) res.end();
    else res.status(500).json({ error: 'Could not generate the form' });
  }
});

module.exports = router;
module.exports.FORMS = FORMS;
