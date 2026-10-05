// Downloadable form PDFs (consent letter, feedback form, undertaking).
// Two entry points share the same renderers:
//   - GET /api/forms/:type            public blank templates (no auth)
//   - GET /api/student/download/form/ authenticated copies unlocked after the
//     student passes the exam (routes/documents.js passes a `student` context
//     so fields such as name, roll no. and college are pre-filled).
// Branding (company name, address, CIN, stamp, disclaimer) comes from
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
    const base = ((await getSetting(db, 'siteUrl')) || VERIFY_BASE).replace(/\/+$/, '');
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

// Label + optional pre-filled value + writing line. Returns the y for the
// next row. Blank forms leave the space above the line empty to write on.
function field(doc, label, x, y, w, value) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN.dark).text(label.toUpperCase(), x, y, { width: w });
  if (value) {
    doc.font('Helvetica').fontSize(10).fillColor(GREEN.ink)
      .text(String(value), x, y + 9.5, { width: w, height: 13, ellipsis: true });
  }
  doc.lineWidth(0.8).strokeColor('#9CA3AF');
  doc.moveTo(x, y + 24).lineTo(x + w, y + 24).stroke();
  return y + 34;
}

// Two-column grid of fields: rows = [[label, label], ...]; a cell may also be
// [label, label, valueA, valueB] to pre-fill both columns.
function fieldGrid(doc, rows, y) {
  const cw = COL_W();
  for (const row of rows) {
    const [a, b, va, vb] = row;
    field(doc, a, L, y, cw, va);
    if (b) field(doc, b, L + cw + 24, y, cw, vb);
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
// Default letterhead: website brand top-left, verification QR top-right,
// title + subtitle. Returns the y where the form body should start.
function defaultHeader(doc, form, qr) {
  drawBrand(doc, 50, 42);
  drawQrBadge(doc, qr, 474, 46, 58);
  drawTitle(doc, form.title, 92, { size: 24 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.gray)
    .text(form.subtitle, 50, 140, { width: INNER_W() });
  return 165;
}

const FORMS = {
  // College-headed permission letter: the institution permits a student to
  // complete the internship (28 days / 120 hrs at the standard duration).
  // Letter number, date and every signature stay blank so the college can
  // print, sign and stamp it.
  consent: {
    filename: 'IQI-College-Consent-Letter.pdf',
    header(doc, ctx) {
      const w = doc.page.width;
      const college = (ctx.student && ctx.student.college) || 'COLLEGE / INSTITUTION NAME';
      let size = 24;
      while (size > 12 && doc.widthOfString(college, { font: 'Helvetica-Bold', size }) > w - 100) size -= 1;
      doc.font('Helvetica-Bold').fontSize(size).fillColor(GREEN.dark)
        .text(college, 50, 56, { width: w - 100, align: 'center' });
      const nameW = Math.min(doc.widthOfString(college, { font: 'Helvetica-Bold', size }) + 40, w - 100);
      const rx = (w - nameW) / 2;
      const g = doc.linearGradient(rx, 0, rx + nameW, 0);
      g.stop(0, GREEN.dark).stop(1, GREEN.wave);
      doc.rect(rx, 56 + size * 1.3 + 6, nameW, 3).fill(g);

      // Blank letter number + date for the college to fill in
      const ry = 56 + size * 1.3 + 26;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text('Ref. No.:', 50, ry, { width: 62 });
      doc.lineWidth(0.8).strokeColor('#9CA3AF').moveTo(118, ry + 12).lineTo(300, ry + 12).stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text('Date:', 330, ry, { width: 46 });
      doc.lineWidth(0.8).strokeColor('#9CA3AF').moveTo(382, ry + 12).lineTo(w - 50, ry + 12).stroke();
      return ry + 30;
    },
    render(doc, ctx, y) {
      const w = doc.page.width;
      const s = ctx.student || {};
      const days = Number(ctx.duration || s.duration || 28);
      const hours = Math.round((days * 120) / 28);
      const name = s.firstName ? `${s.firstName} ${s.lastName}` : 'the student';
      const enrolled = s.enrolledAt ? new Date(s.enrolledAt) : null;
      const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const period = enrolled
        ? `${fmt(enrolled)} – ${fmt(new Date(enrolled.getTime() + (days - 1) * 86400000))}`
        : '';

      // Recipient
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text('To,', 50, y, { width: w - 100 });
      doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.ink);
      doc.text('The Internship In-Charge,', 50, doc.y + 3, { width: w - 100 });
      doc.text(companyName(), 50, doc.y + 2, { width: w - 100 });
      doc.text(companyAddress(), 50, doc.y + 2, { width: w - 100 });
      y = doc.y + 12;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark)
        .text('Subject: Grant of permission to undergo internship training.', 50, y, { width: w - 100 });
      y = doc.y + 10;
      doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body).text('Dear Sir / Madam,', 50, y);
      y = doc.y + 8;

      doc.text(`This is to certify that ${name}, a bonafide student of our institution, has been permitted to undergo the internship program "${ctx.title || 'the internship program'}" offered by ${companyName()} for a continuous period of ${days} days (${hours} working hours) as a part of the academic curriculum / training requirement of the course.`, 50, y, { width: w - 100, lineGap: 2 });
      y = doc.y + 8;
      doc.text(`The student fulfils all the eligibility criteria prescribed by our institution and there is no objection from our side to his / her participation in the said program, which will be completed in online / remote mode${period ? ` during the period ${period}` : ''}. The student shall abide by the rules and regulations of the program throughout the training period.`, 50, y, { width: w - 100, lineGap: 2 });
      y = doc.y + 8;

      y = sectionBar(doc, 'STUDENT DETAILS', y);
      y = fieldGrid(doc, [
        ['Student Name', 'Roll No. / Reg. No.', name === 'the student' ? '' : name, s.rollNo || s.regNo || ''],
        ['Course / Year', 'Program / Track', [s.course ? String(s.course).toUpperCase() : '', s.year].filter(Boolean).join(' - '), ctx.title || ''],
        ['Internship Duration', 'Internship Period', `${days} Days / ${hours} Hours`, period],
      ], y);

      y = sectionBar(doc, 'CONCLUSION', y + 6);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body)
        .text(`In view of the above, you are requested to allow the student to complete the internship program as scheduled. Any communication in this regard may be addressed to the undersigned.`, 50, y, { width: w - 100, lineGap: 2 });
      y = doc.y + 6;
      doc.text('Thanking you,', 50, y, { width: w - 100 });

      // Authorisation: college stamp + verification QR + one signature line
      // (HOD or Principal or Internship Nodal Officer — any one of them signs)
      y = sectionBar(doc, 'AUTHORISATION BY THE INSTITUTION', doc.y + 8);
      const bw = INNER_W();
      const bh = 116;
      doc.lineWidth(1).strokeColor(GREEN.stroke).roundedRect(L, y, bw, bh, 6).stroke();

      const sx = L + 14, sy = y + 12, ss = 74;
      doc.save();
      doc.lineWidth(0.9).strokeColor('#9CA3AF').dash(4, { space: 3 });
      doc.roundedRect(sx, sy, ss, ss, 4).stroke();
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(7).fillColor(GREEN.gray)
        .text('COLLEGE STAMP / SEAL', sx - 8, sy + ss + 5, { width: ss + 16, align: 'center' });

      const qr = ctx.qr;
      const qx = sx + ss + 14, qy = sy + 4;
      if (qr) {
        doc.roundedRect(qx, qy, 54, 54, 6).fill('#ffffff').stroke(GREEN.stroke);
        doc.image(qr, qx + 5, qy + 5, { width: 44 });
        doc.font('Helvetica').fontSize(6.5).fillColor(GREEN.gray)
          .text('Scan to verify', qx - 6, qy + 58, { width: 66, align: 'center' });
      }

      const lx = sx + ss + 84;
      const lw = L + bw - 14 - lx;
      const ly = y + 42;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN.dark)
        .text('SIGNATURE OF HOD / PRINCIPAL / INTERNSHIP NODAL OFFICER', lx, ly, { width: lw });
      doc.lineWidth(0.8).strokeColor('#9CA3AF').moveTo(lx, ly + 22).lineTo(lx + lw, ly + 22).stroke();
      return y + bh + 6;
    },
  },

  feedback: {
    filename: 'IQI-Feedback-Form.pdf',
    title: 'FEEDBACK FORM',
    subtitle: 'Help us improve — share your honest experience of the internship program',
    render(doc, ctx, y) {
      y = sectionBar(doc, 'INTERNSHIP DETAILS', y);
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
    render(doc, ctx, y) {
      y = sectionBar(doc, 'DECLARATION', y);
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

// ===================== RENDER ENTRY POINT =====================
// Streams a form PDF to `res`. `ctx` may carry { student, title, duration, qr }
// to pre-fill the letter — pass {} for a blank public template.
// Returns { y } (bottom of the last drawn element) or false for an unknown key.
async function streamForm(res, key, ctx = {}) {
  const k = String(key || '').toLowerCase();
  const form = FORMS[ALIASES[k] || k];
  if (!form) return false;

  const qr = 'qr' in ctx ? ctx.qr : await makeVerifyQr();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${form.filename}`);
  doc.pipe(res);
  drawWatermark(doc, 'IQINTERN');
  const body = { ...ctx, qr };
  const y = form.header ? form.header(doc, body) : defaultHeader(doc, form, qr);
  const finalY = form.render(doc, body, y);
  drawFooter(doc);
  doc.end();
  return { y: finalY };
}

// ===================== PUBLIC ROUTE =====================
router.get('/:type', async (req, res) => {
  const key = String(req.params.type || '').toLowerCase();
  try {
    const out = await streamForm(res, key, {});
    if (out === false) return res.status(404).json({ error: 'Unknown form type' });
  } catch (err) {
    console.error(`Form generation failed (${key}):`, err.message);
    if (res.headersSent) res.end();
    else res.status(500).json({ error: 'Could not generate the form' });
  }
});

module.exports = router;
module.exports.FORMS = FORMS;
module.exports.streamForm = streamForm;
module.exports.ALLOWED_TYPES = Object.keys(FORMS).concat(Object.keys(ALIASES));
