const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { ensureEnrollmentNumber } = require('../lib/docNumbers');
const { getSetting } = require('../lib/settings');
const {
  companyName,
  companyAddress,
  cinLabel,
  directorName,
  footText,
  drawStamp,
  drawDisclaimer,
} = require('../lib/documentBrand');
const { getReportContent } = require('../data/reportContent');
const { streamReport } = require('../lib/reportPdf');
const { streamForm, ALLOWED_TYPES: FORM_TYPES } = require('./forms');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const hasPaidAccess = async (enrollmentId, userId) => !!await db.get("SELECT 1 FROM payments WHERE enrollmentId = ? AND userId = ? AND status = 'completed' LIMIT 1", enrollmentId, userId);

// Unlocked only after the exam is passed (mirrors the client-side isPassed):
// paid + exam completed (or the enrollment already marked completed).
const hasPassedAccess = async (enrollmentId, userId) => {
  if (!(await hasPaidAccess(enrollmentId, userId))) return false;
  const exam = await db.get("SELECT status FROM exams WHERE enrollmentId = ? ORDER BY id DESC LIMIT 1", enrollmentId);
  if (exam && exam.status === 'completed') return true;
  const enrollment = await db.get("SELECT status FROM enrollments WHERE id = ? AND userId = ? LIMIT 1", enrollmentId, userId);
  return !!enrollment && enrollment.status === 'completed';
};

// Shared loader for the exam-gated documents below.
const loadEnrollment = (enrollmentId, userId) => db.get(`
  SELECT e.*, u.firstName, u.lastName, u.email, u.phone, u.college, u.course, u.year,
         u.rollNo, u.regNo, u.university,
         i.title as internshipTitle, i.duration, i.modules, i.category
  FROM enrollments e
  JOIN users u ON e.userId = u.id
  JOIN internships i ON e.internshipId = i.id
  WHERE e.id = ? AND e.userId = ?
`, enrollmentId, userId);

// ===================== BRANDING =====================
const LOGO_FILE = path.join(__dirname, '..', 'client', 'public', 'logo', 'logo-full.png');
// Scanned signature (supervisor / signatory) from client/src/assets/Legeal.
const SIGN_FILE = path.join(__dirname, '..', 'client', 'src', 'assets', 'Legeal', 'sign.png');

let LOGO_SIZE = { width: 2274, height: 1856 };
try {
  const buf = fs.readFileSync(LOGO_FILE);
  if (buf.length > 24 && buf.slice(1, 4).toString('ascii') === 'PNG') {
    LOGO_SIZE = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
} catch (e) {
  // logo file missing - drawBrand falls back to a text mark
}

let SIGN_SIZE = { width: 1728, height: 863 };
try {
  const buf = fs.readFileSync(SIGN_FILE);
  if (buf.length > 24 && buf.slice(1, 4).toString('ascii') === 'PNG') {
    SIGN_SIZE = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
} catch (e) {
  // sign image missing - drawSignature draws nothing
}

// Draws the signature image so its bottom edge sits at `bottom`, left edge at
// `x`, scaled to `width` pt. Returns the drawn width, or null if unavailable.
function drawSignature(doc, x, bottom, width = 80) {
  try {
    const h = width * (SIGN_SIZE.height / SIGN_SIZE.width);
    doc.image(SIGN_FILE, x, bottom - h, { width });
    return width;
  } catch (e) {
    return null;
  }
}

// Draws the website logo at (x, y) with the given height.
// Returns the drawn width, or null if the logo could not be drawn.
function drawLogo(doc, x, y, height) {
  try {
    doc.image(LOGO_FILE, x, y, { height });
    return height * (LOGO_SIZE.width / LOGO_SIZE.height);
  } catch (e) {
    return null;
  }
}

// ===================== DESIGN SYSTEM =====================
// Palette extracted from "White Green Abstract Geometric" template
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

// Document branding comes from admin settings, with fallback defaults.
// companyName / companyAddress / footText live in lib/documentBrand so the
// report renderer uses the exact same strings (name | address | CIN).

// ===================== QR VERIFICATION =====================
const VERIFY_BASE = (process.env.SITE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

// Builds the QR pointing at the public verification page for a document reference
async function makeQr(ref) {
  try {
    const base = ((await getSetting(db, 'siteUrl')) || VERIFY_BASE).replace(/\/+$/, '');
    return await QRCode.toBuffer(`${base}/certification?id=${encodeURIComponent(ref)}`, {
      margin: 1, width: 280, color: { dark: '#1C6954', light: '#FFFFFF' },
    });
  } catch (e) {
    console.error('QR generation failed:', e.message);
    return null;
  }
}

// Draws the white QR badge with caption at (x, y); box is the badge size in pt
function drawQrBadge(doc, qrBuffer, x, y, box = 70) {
  if (!qrBuffer) return;
  doc.roundedRect(x, y, box, box, 8).fill('#ffffff').stroke(GREEN.stroke);
  doc.image(qrBuffer, x + 6, y + 6, { width: box - 12 });
  doc.font('Helvetica').fontSize(6.5).fillColor(GREEN.gray)
    .text('Scan to verify', x - 10, y + box + 5, { width: box + 20, align: 'center' });
}

function drawWatermark(doc, text) {
  const w = doc.page.width;
  const h = doc.page.height;
  const fs = Math.round(Math.min(w, h) * 0.14);
  doc.save();
  doc.font('Helvetica-Bold').fontSize(fs);
  doc.fillColor(GREEN.dark).fillOpacity(0.035);
  doc.rotate(-30, { origin: [w / 2, h / 2] });
  doc.text(text, 0, h / 2 - fs * 0.36, { width: w, align: 'center' });
  doc.restore();
}

function drawCornerCurve(doc) {
  const w = doc.page.width;
  // Large pale mint sweep from top-right corner
  doc.save();
  doc.fillColor(GREEN.mint).fillOpacity(0.5);
  doc.moveTo(w - 230, 0)
    .bezierCurveTo(w - 90, 50, w - 40, 130, w, 280)
    .lineTo(w, 0).closePath().fill();
  doc.restore();
  // Smaller deeper layer
  doc.save();
  doc.fillColor(GREEN.wave).fillOpacity(0.4);
  doc.moveTo(w - 150, 0)
    .bezierCurveTo(w - 55, 45, w - 25, 110, w, 210)
    .lineTo(w, 0).closePath().fill();
  doc.restore();
}

function drawGeoAccents(doc) {
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.lineWidth(1.2).strokeColor(GREEN.light).strokeOpacity(0.35);
  doc.circle(w - 84, 90, 14).stroke();
  doc.circle(w - 116, 62, 6).stroke();
  doc.circle(24, 300, 16).stroke();
  doc.circle(26, 470, 8).stroke();
  doc.circle(w - 25, 330, 10).stroke();
  doc.circle(w - 25, 500, 6).stroke();
  doc.restore();
}

function drawBottomWaves(doc) {
  const w = doc.page.width;
  const h = doc.page.height;

  // Back wave (pale mint)
  doc.save();
  doc.fillOpacity(0.55);
  const gBack = doc.linearGradient(0, 0, w, 0);
  gBack.stop(0, '#BFE9DC').stop(1, '#8FD9C3');
  doc.moveTo(0, h - 92)
    .bezierCurveTo(w * 0.35, h - 122, w * 0.7, h - 78, w, h - 104)
    .lineTo(w, h).lineTo(0, h).closePath().fill(gBack);
  doc.restore();

  // Front wave (solid green gradient)
  const gFront = doc.linearGradient(0, 0, w, 0);
  gFront.stop(0, GREEN.dark).stop(0.55, '#2E8B76').stop(1, '#4FB99E');
  doc.moveTo(0, h - 52)
    .bezierCurveTo(w * 0.3, h - 74, w * 0.65, h - 38, w, h - 62)
    .lineTo(w, h).lineTo(0, h).closePath().fill(gFront);

  // Thin white highlight line between waves
  doc.save();
  doc.lineWidth(1.5).strokeColor('#ffffff').strokeOpacity(0.65);
  doc.moveTo(0, h - 60)
    .bezierCurveTo(w * 0.3, h - 82, w * 0.65, h - 46, w, h - 70)
    .stroke();
  doc.restore();
}

function drawPageBackground(doc, watermark = 'IQINTERN') {
  drawWatermark(doc, watermark);
  drawCornerCurve(doc);
  drawGeoAccents(doc);
  drawBottomWaves(doc);
}

function startPdf(res, filename, opts = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, ...opts });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);
  drawPageBackground(doc, opts.watermark || 'IQINTERN');
  return doc;
}

function drawDiamond(doc, x, y, size, fill) {
  doc.polygon([x, y - size], [x + size, y], [x, y + size], [x - size, y]).fill(fill);
}

function drawCertificateFrame(doc) {
  const w = doc.page.width;
  const h = doc.page.height;
  // Double frame
  doc.save();
  doc.lineWidth(2.5).strokeColor(GREEN.dark);
  doc.roundedRect(20, 20, w - 40, h - 40, 14).stroke();
  doc.lineWidth(0.9).strokeColor(GREEN.light).strokeOpacity(0.9);
  doc.roundedRect(28, 28, w - 56, h - 56, 9).stroke();
  doc.restore();
  // Ornamental diamonds on the frame edges
  [[w / 2, 20], [w / 2, h - 20], [20, h / 2], [w - 20, h / 2]].forEach(([x, y]) => {
    drawDiamond(doc, x, y, 7, GREEN.dark);
    drawDiamond(doc, x, y, 3, GREEN.pale);
  });
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

function sectionBar(doc, label, y) {
  const w = doc.page.width;
  const g = doc.linearGradient(50, 0, w - 50, 0);
  g.stop(0, GREEN.dark).stop(1, GREEN.light);
  doc.roundedRect(50, y, w - 100, 22, 5).fill(g);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#fff').text(label, 62, y + 5.5, { width: w - 130 });
  return y + 30;
}

function infoRow(doc, label, value, y) {
  const w = doc.page.width;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text(label, 62, y, { width: 110 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body).text(String(value ?? 'N/A'), 175, y, { width: w - 235, height: 13, ellipsis: true });
  return y + 16;
}

// ===================== PAYMENT RECEIPT =====================
router.get('/download/receipt/:paymentId', authenticateToken, async (req, res) => {
  const payment = await db.get(`
    SELECT p.*, u.firstName, u.lastName, u.email, u.phone, u.college, u.course, i.title as internshipTitle, i.duration
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN enrollments e ON p.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE p.id = ? AND p.userId = ?
  `, req.params.paymentId, req.user.id);

  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'completed') return res.status(403).json({ error: 'Payment not completed yet — receipts are issued after a successful payment.' });

  const qrBuffer = await makeQr(payment.receiptNumber);
  const doc = startPdf(res, `receipt-${payment.receiptNumber}.pdf`, { watermark: 'RECEIPT' });
  const w = doc.page.width;

  drawBrand(doc, 50, 42);
  drawTitle(doc, 'PAYMENT RECEIPT', 92, { size: 24 });

  doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
    .text(`Date: ${new Date(payment.paidAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, w - 220, 46, { width: 170, align: 'right' });
  doc.roundedRect(w - 125, 72, 75, 24, 12).fill(GREEN.dark);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('PAID', w - 125, 77, { width: 75, align: 'center' });

  // Receipt number strip
  let y = 152;
  doc.roundedRect(50, y, w - 100, 28, 6).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.rect(50, y + 4, 5, 20).fill(GREEN.mid);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark).text('RECEIPT NO.', 66, y + 7, { width: 90 });
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.body).text(payment.receiptNumber, 156, y + 7, { width: w - 220 });

  y = sectionBar(doc, 'STUDENT DETAILS', 198);
  y = infoRow(doc, 'Name', `${payment.firstName} ${payment.lastName}`, y);
  y = infoRow(doc, 'Email', payment.email, y);
  y = infoRow(doc, 'Phone', payment.phone, y);
  y = infoRow(doc, 'College', payment.college || 'N/A', y);

  y = sectionBar(doc, 'PAYMENT DETAILS', y + 14);
  y = infoRow(doc, 'Program', payment.internshipTitle, y);
  y = infoRow(doc, 'Amount', `\u20B9${Number(payment.amount).toLocaleString('en-IN')}`, y);
  y = infoRow(doc, 'Method', payment.method === 'razorpay' ? 'Razorpay (Online)' : 'Wallet', y);
  y = infoRow(doc, 'Transaction ID', payment.transactionId, y);
  y = infoRow(doc, 'Status', 'COMPLETED', y);

  // Amount box + PAID stamp row
  y += 18;
  const boxG = doc.linearGradient(50, 0, 260, 0);
  boxG.stop(0, GREEN.dark).stop(1, GREEN.mid);
  doc.roundedRect(50, y, 220, 56, 8).fill(boxG);
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.mint).text('TOTAL PAID', 50, y + 10, { width: 220, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#fff').text(`\u20B9${Number(payment.amount).toLocaleString('en-IN')}`, 50, y + 26, { width: 220, align: 'center' });

  const stampX = 330, stampY = y + 2;
  doc.save();
  doc.rotate(-9, { origin: [stampX + 65, stampY + 26] });
  doc.lineWidth(3).strokeColor('#16a34a').roundedRect(stampX, stampY, 130, 52, 8).stroke();
  doc.lineWidth(1).strokeColor('#16a34a').roundedRect(stampX + 6, stampY + 6, 118, 40, 6).stroke();
  doc.fillColor('#16a34a').fillOpacity(0.85).font('Helvetica-Bold').fontSize(24)
    .text('PAID', stampX, stampY + 15, { width: 130, align: 'center' });
  doc.restore();

  // QR verification badge beside the PAID stamp
  drawQrBadge(doc, qrBuffer, 470, stampY - 4, 70);

  // Company stamp above the authorised signatory caption
  drawStamp(doc, 143, 558, 72);
  doc.font('Helvetica').fontSize(7.5).fillColor(GREEN.gray)
    .text('Authorised Signatory', 69, 636, { width: 220, align: 'center' });

  drawFooter(doc);
  doc.end();
});

// ===================== OFFER LETTER =====================
router.get('/download/offer-letter/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.*, u.firstName, u.lastName, u.email, u.phone, u.college, u.course, i.title as internshipTitle, i.duration
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPaidAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Complete payment to download the offer letter.' });
  }

  const offerNo = await ensureEnrollmentNumber(db, enrollment, 'offerNo');
  const qrBuffer = await makeQr(offerNo);
  const doc = startPdf(res, `offer-letter-${enrollment.id}.pdf`, { watermark: 'OFFER LETTER' });
  const w = doc.page.width;
  const duration = enrollment.duration || 30;
  const enrolled = new Date(enrollment.enrolledAt);

  drawBrand(doc, 50, 42);
  drawTitle(doc, 'INTERNSHIP OFFER LETTER', 92, { size: 24 });
  drawQrBadge(doc, qrBuffer, 470, 40, 70);

  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.gray)
    .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 140, { width: 220 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.gray)
    .text(`Ref: ${offerNo}`, w - 270, 140, { width: 220, align: 'right' });

  // Recipient box
  let y = 168;
  doc.roundedRect(50, y, w - 100, 70, 6).fill('#ffffff').stroke(GREEN.stroke);
  doc.rect(50, y + 6, 5, 58).fill(GREEN.mid);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text('TO', 66, y + 10, { width: 60 });
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.ink).text(`${enrollment.firstName} ${enrollment.lastName}`, 66, y + 25, { width: w - 132 });
  doc.fontSize(9.5).fillColor(GREEN.body).text(`${enrollment.college || 'N/A'} | ${String(enrollment.course || 'N/A').toUpperCase()}`, 66, y + 40, { width: w - 132 });
  doc.text(`${enrollment.email} | ${enrollment.phone || 'N/A'}`, 66, y + 54, { width: w - 132 });

  // Body
  y = 256;
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.ink);
  doc.text(`Dear ${enrollment.firstName} ${enrollment.lastName},`, 60, y, { width: w - 120 });
  y = doc.y + 12;
  doc.text('We are pleased to inform you that you have been selected for the internship program in', 60, y, { width: w - 120 });
  y = doc.y + 8;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN.dark).text(`"${enrollment.internshipTitle}"`, 60, y, { width: w - 120, align: 'center' });
  y = doc.y + 8;
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.ink);
  doc.text(`at ${companyName()}, effective from ${enrolled.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.`, 60, y, { width: w - 120 });

  // Details box
  y = doc.y + 16;
  doc.roundedRect(60, y, w - 120, 62, 6).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.rect(60, y + 6, 5, 50).fill(GREEN.mid);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark);
  doc.text(`Duration:   ${duration} Days`, 78, y + 10, { width: 240 });
  doc.text(`Start Date:   ${enrolled.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 78, y + 26, { width: 300 });
  doc.text(`Mode:   Remote / Online`, 78, y + 42, { width: 240 });

  y = doc.y + 16;
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.ink);
  doc.text('During this internship, you will gain hands-on experience through a structured curriculum, practical projects, and timed assessments designed to validate your skills.', 60, y, { width: w - 120 });
  y = doc.y + 10;
  doc.text(`Upon successful completion of the program and passing the final evaluation, you will receive a verified certificate from ${companyName()}.`, 60, y, { width: w - 120 });
  y = doc.y + 10;
  doc.text('We wish you all the best for your internship journey!', 60, y, { width: w - 120 });

  // Signature
  const sigY = doc.y + 26;
  doc.fillColor(GREEN.body).text('Warm Regards,', 60, sigY);
  y = doc.y + 18;
  doc.font('Times-Bold').fontSize(14).fillColor(GREEN.dark).text(`Team ${companyName()}`, 60, y);
  y = doc.y + 6;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text(`${directorName()}, Director`, 60, y);
  y = doc.y + 5;
  doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray).text(`${companyName()} - ${companyAddress()}`, 60, y);

  // Company stamp (right of the sign-off block)
  drawStamp(doc, 448, sigY + 16, 78);

  drawFooter(doc);
  doc.end();
});

// ===================== CERTIFICATE =====================
router.get('/download/certificate/:certId', authenticateToken, async (req, res) => {
  const cert = await db.get(`
    SELECT c.*, u.firstName, u.lastName, u.email, u.college, u.course, u.rollNo, u.regNo, u.university, u.year,
           i.title as internshipTitle, i.duration, i.modules, i.description, e.enrolledAt
    FROM certificates c
    JOIN users u ON c.userId = u.id
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE c.certificateId = ? AND c.userId = ?
  `, req.params.certId, req.user.id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (!(await hasPaidAccess(cert.enrollmentId, req.user.id))) {
    return res.status(403).json({ error: 'Complete payment to download the certificate.' });
  }

  const qrBuffer = await makeQr(cert.certificateId);
  const doc = startPdf(res, `certificate-${cert.certificateId}.pdf`, { watermark: 'CERTIFIED' });
  const w = doc.page.width;
  const h = doc.page.height;
  const duration = cert.duration || 30;
  const score = cert.score != null ? cert.score : 0;
  const grade = cert.grade || 'N/A';

  // Decorative double frame with edge ornaments
  drawCertificateFrame(doc);

  // Gradient letterhead band behind logo + company details
  const bandG = doc.linearGradient(44, 0, w - 44, 0);
  bandG.stop(0, GREEN.pale).stop(1, '#ffffff');
  doc.roundedRect(44, 30, w - 88, 110, 14).fill(bandG).stroke(GREEN.stroke);

  // Centered letterhead: website logo, company name and address
  const certLogoH = 80;
  const certLogoW = certLogoH * (LOGO_SIZE.width / LOGO_SIZE.height);
  drawLogo(doc, (w - certLogoW) / 2, 38, certLogoH);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN.mid)
    .text(footText(), 0, 122, { width: w, align: 'center' });

  // QR verification badge (top-right of the letterhead band)
  drawQrBadge(doc, qrBuffer, 470, 40, 70);

  doc.font('Helvetica-Bold').fontSize(28).fillColor(GREEN.dark)
    .text('CERTIFICATE OF COMPLETION', 0, 152, { width: w, align: 'center' });
  const ruleW = 250;
  const rg = doc.linearGradient((w - ruleW) / 2, 0, (w + ruleW) / 2, 0);
  rg.stop(0, GREEN.dark).stop(1, GREEN.wave);
  doc.rect((w - ruleW) / 2, 192, ruleW, 3).fill(rg);
  // Ornamental divider: center diamond + end dots
  drawDiamond(doc, w / 2, 193.5, 7, GREEN.dark);
  drawDiamond(doc, w / 2, 193.5, 3.2, GREEN.pale);
  doc.circle((w - ruleW) / 2, 193.5, 3.5).fill(GREEN.dark);
  doc.circle((w + ruleW) / 2, 193.5, 3.5).fill(GREEN.dark);

  // Sunburst gold seal with ribbons
  const cx = w / 2, cy = 246;
  doc.save();
  doc.fillColor('#F59E0B').fillOpacity(0.3);
  for (let i = 0; i < 16; i++) {
    doc.save();
    doc.rotate(i * 22.5, { origin: [cx, cy] });
    doc.polygon([cx, cy], [cx - 5, cy - 40], [cx + 5, cy - 40]).fill();
    doc.restore();
  }
  doc.restore();
  doc.save();
  doc.fillColor(GREEN.dark);
  doc.polygon([cx - 18, cy + 6], [cx - 6, cy + 6], [cx - 6, cy + 48], [cx - 12, cy + 38], [cx - 18, cy + 48]).fill();
  doc.polygon([cx + 6, cy + 6], [cx + 18, cy + 6], [cx + 18, cy + 48], [cx + 12, cy + 38], [cx + 6, cy + 48]).fill();
  doc.restore();
  doc.circle(cx, cy, 24).fill('#FBBF24');
  doc.circle(cx, cy, 24).lineWidth(2).strokeColor('#B45309').stroke();
  doc.circle(cx, cy, 18).lineWidth(1.2).strokeColor('#FFF7E6').stroke();
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#92400E').text('\u2605', cx - 8, cy - 9);

  // Body
  doc.font('Helvetica-Oblique').fontSize(11).fillColor(GREEN.gray).text('This is to certify that', 0, 308, { width: w, align: 'center' });
  // Flanking flourishes beside the intro line
  const fy = 314.5;
  doc.save();
  doc.lineWidth(1).strokeColor(GREEN.light).strokeOpacity(0.85);
  doc.moveTo(150, fy).lineTo(214, fy).stroke();
  doc.moveTo(w - 214, fy).lineTo(w - 150, fy).stroke();
  doc.restore();
  drawDiamond(doc, 222, fy, 4, GREEN.light);
  drawDiamond(doc, w - 222, fy, 4, GREEN.light);

  const nameStr = `${cert.firstName} ${cert.lastName}`;
  doc.font('Helvetica-Bold').fontSize(30).fillColor(GREEN.dark).text(nameStr, 0, 328, { width: w, align: 'center' });
  const nameW = doc.widthOfString(nameStr, { font: 'Helvetica-Bold', size: 30 });
  const nameX = (w - nameW) / 2;
  const nameBottom = 328 + 30 * 1.15;
  doc.rect(nameX, nameBottom + 4, nameW, 2).fill(GREEN.mid);
  doc.polygon([nameX - 14, nameBottom + 5], [nameX - 5, nameBottom], [nameX + 4, nameBottom + 5], [nameX - 5, nameBottom + 10]).fill('#D4AF37');
  doc.polygon([nameX + nameW + 14, nameBottom + 5], [nameX + nameW + 5, nameBottom], [nameX + nameW - 4, nameBottom + 5], [nameX + nameW + 5, nameBottom + 10]).fill('#D4AF37');

  doc.font('Helvetica').fontSize(11).fillColor(GREEN.ink).text('has successfully completed the internship program', 0, nameBottom + 24, { width: w, align: 'center' });

  // Program title in a highlight pill
  const progText = `"${cert.internshipTitle}"`;
  doc.font('Helvetica-Bold').fontSize(17);
  const progW = doc.widthOfString(progText);
  const progY = nameBottom + 50;
  if (progW + 48 <= w - 120) {
    doc.roundedRect((w - progW) / 2 - 24, progY - 7, progW + 48, 34, 17).fill(GREEN.pale).stroke(GREEN.stroke);
  }
  doc.fillColor(GREEN.mid).text(progText, 0, progY, { width: w, align: 'center' });

  // Details row
  const detailY = nameBottom + 84;
  const colW = (w - 180) / 3;
  const labels = ['DURATION', 'GRADE', 'SCORE'];
  const values = [`${duration} Days`, grade, `${score}%`];
  [70, 70 + colW + 25, 70 + (colW + 25) * 2].forEach((x, i) => {
    doc.roundedRect(x, detailY, colW, 38, 6).fill('#ffffff').stroke(GREEN.stroke);
    doc.rect(x, detailY + 5, 4, 28).fill(GREEN.mid);
    doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray).text(labels[i], x, detailY + 8, { width: colW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN.dark).text(values[i], x, detailY + 21, { width: colW, align: 'center' });
  });

  // College + student + certificate ID strip
  doc.roundedRect(60, detailY + 46, w - 120, 44, 8).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.rect(60, detailY + 52, 5, 32).fill(GREEN.mid);
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.body).text(`College: ${cert.college || 'N/A'}  ·  Course: ${String(cert.course || 'N/A').toUpperCase()}`, 0, detailY + 56, { width: w, align: 'center' });
  doc.fontSize(8.5).fillColor(GREEN.gray)
    .text(`Email: ${cert.email || 'N/A'}  ·  Certificate ID: ${cert.certificateId}  ·  Issued: ${cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}`, 0, detailY + 72, { width: w, align: 'center' });

  // Internship & student details card
  const insY = detailY + 100;
  doc.roundedRect(60, insY, w - 120, 80, 8).fill('#ffffff').stroke(GREEN.stroke);
  const insG = doc.linearGradient(60, 0, w - 60, 0);
  insG.stop(0, GREEN.dark).stop(1, GREEN.light);
  doc.roundedRect(60, insY, w - 120, 18, 8).fill(insG);
  doc.rect(60, insY + 9, w - 120, 9).fill(insG);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff').text('INTERNSHIP & STUDENT DETAILS', 74, insY + 4.5);
  const enrolledOn = cert.enrolledAt
    ? `  ·  Enrolled: ${new Date(cert.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '';
  const studentLine = `Course: ${String(cert.course || 'N/A').toUpperCase()}  ·  Roll No: ${cert.rollNo || 'N/A'}  ·  Session: ${cert.year || 'N/A'}${cert.regNo ? `  ·  Reg No: ${cert.regNo}` : ''}`;
  const insRows = [
    ['Program', String(cert.internshipTitle || 'N/A')],
    ['Duration', `${duration} Days  ·  Modules: ${cert.modules ?? 'N/A'}${enrolledOn}`],
    ['Student', studentLine],
    ['University', String(cert.university || cert.college || 'N/A')],
  ];
  insRows.forEach(([label, value], i) => {
    const ry = insY + 24 + i * 13;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN.dark).text(label, 74, ry, { width: 90 });
    doc.font('Helvetica').fontSize(9).fillColor(GREEN.body).text(value, 168, ry, { width: w - 240, height: 11, ellipsis: true });
  });

  // Signatory block (anchored above the footer): company stamp on the left,
  // director name above the CEO designation on the right
  const sigY = h - 180;
  doc.lineWidth(1).strokeColor(GREEN.light);
  doc.moveTo(w - 240, sigY).lineTo(w - 80, sigY).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(GREEN.dark);
  doc.text(directorName(), w - 240, sigY + 6, { width: 160, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray);
  doc.text(`CEO, ${companyName()}`, w - 240, sigY + 20, { width: 160, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor(GREEN.mid);
  doc.text(companyAddress(), w - 240, sigY + 32, { width: 160, align: 'center' });

  // Company stamp (left signature zone)
  drawStamp(doc, 133, sigY - 30, 54);

  drawFooter(doc);
  doc.end();
});

// ===================== PROJECT REPORT (multi-page, per-track) ==============
router.get('/download/project-report/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.*, u.firstName, u.lastName, u.email, u.phone, u.college, u.course, u.year,
           u.rollNo, u.regNo, u.university,
           i.title as internshipTitle, i.topics, i.duration, i.modules, i.category, i.description
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPaidAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Complete payment to download the internship report.' });
  }

  const cert = await db.get('SELECT * FROM certificates WHERE enrollmentId = ?', enrollment.id);
  const exam = await db.get('SELECT * FROM exams WHERE enrollmentId = ? ORDER BY id DESC', enrollment.id);
  const avgRow = await db.get('SELECT AVG(score) as avgScore FROM exams WHERE internshipId = ? AND status = ?', enrollment.internshipId, 'completed');

  let completedIdx = [];
  try { completedIdx = JSON.parse(enrollment.completedModules || '[]'); } catch (e) { completedIdx = []; }
  const moduleRows = await db.all('SELECT title, durationMinutes, moduleOrder FROM learning_modules WHERE internshipId = ? ORDER BY moduleOrder', enrollment.internshipId);
  const modules = moduleRows.map((m, i) => ({
    title: m.title,
    duration: m.durationMinutes ? `${Math.round(m.durationMinutes / 60 * 10) / 10} hrs` : '—',
    done: completedIdx.includes(m.moduleOrder != null ? m.moduleOrder : i) || completedIdx.includes(i),
  }));

  const internship = await db.get('SELECT * FROM internships WHERE id = ?', enrollment.internshipId);
  const content = getReportContent(internship.category, internship);

  const reportNo = await ensureEnrollmentNumber(db, enrollment, 'reportNo');
  const qrBuffer = await makeQr(reportNo);
  const duration = enrollment.duration || 30;
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';

  const meta = {
    trackLabel: content.trackLabel || enrollment.internshipTitle,
    programTitle: enrollment.internshipTitle,
    companyName: companyName(),
    companyAddress: companyAddress(),
    siteLabel: (await getSetting(db, 'siteUrl')) || VERIFY_BASE,
    dateLabel: `Issued: ${fmt(new Date())}`,
    reportNo,
    studentName: `${enrollment.firstName} ${enrollment.lastName}`,
    duration,
    modulesLabel: modules.length ? `${modules.length} modules` : `${enrollment.modules || 'multiple'} modules`,
    institution: enrollment.college || 'N/A',
    grade: cert ? `${cert.grade} (${cert.score}%)` : (exam && exam.score != null ? `${exam.score}%` : 'In progress'),
    enrolledLabel: fmt(enrollment.enrolledAt),
    qrBuffer,
  };

  await streamReport(res, {
    filename: `internship-report-${reportNo}.pdf`,
    reportNo,
    qrBuffer,
    enrollment,
    cert,
    exam,
    content,
    modules,
    meta,
    avgScore: avgRow && avgRow.avgScore != null ? avgRow.avgScore : null,
  });
});

// ===================== ATTENDANCE SHEET =====================
router.get('/download/attendance/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.*, u.firstName, u.lastName, u.college, i.title as internshipTitle, i.duration
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPaidAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Complete payment to download the attendance sheet.' });
  }

  const attendanceNo = await ensureEnrollmentNumber(db, enrollment, 'attendanceNo');
  const qrBuffer = await makeQr(attendanceNo);
  const doc = startPdf(res, `attendance-${enrollment.id}.pdf`, { watermark: 'ATTENDANCE' });
  const w = doc.page.width;
  const duration = enrollment.duration || 30;
  const progress = enrollment.progress || 100;

  drawBrand(doc, 50, 42);
  drawTitle(doc, 'ATTENDANCE SHEET', 92, { size: 24 });
  drawQrBadge(doc, qrBuffer, 470, 40, 70);
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
    .text(`Ref: ${attendanceNo}`, w - 270, 128, { width: 220, align: 'right' });

  // Date range: forward = from registration onwards; backward = ends on the
  // download date and starts `duration` days earlier
  const dateMode = (await getSetting(db, 'attendanceDateMode')) === 'backward' ? 'backward' : 'forward';
  const rowCount = Math.min(duration, 31);
  const today = new Date();
  const dateFor = (i) => {
    const d = new Date(enrollment.enrolledAt);
    if (dateMode === 'backward') {
      d.setTime(today.getTime());
      d.setDate(d.getDate() - (rowCount - i));
    } else {
      d.setDate(d.getDate() + i - 1);
    }
    return d;
  };
  const fmtDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const periodText = `${fmtDate(dateFor(1))} – ${fmtDate(dateFor(rowCount))}`;

  // Student info
  let y = 140;
  doc.roundedRect(50, y, w - 100, 62, 6).fill('#ffffff').stroke(GREEN.stroke);
  doc.rect(50, y + 5, 5, 52).fill(GREEN.mid);
  doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body);
  doc.text(`Student: ${enrollment.firstName} ${enrollment.lastName}`, 66, y + 7, { width: w - 132 });
  doc.text(`College: ${enrollment.college || 'N/A'} | Program: ${enrollment.internshipTitle}`, 66, y + 21, { width: w - 132, height: 12, ellipsis: true });
  doc.text(`Duration: ${duration} Days | Enrolled: ${new Date(enrollment.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 66, y + 35, { width: w - 132 });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark)
    .text(`Period: ${periodText}`, 66, y + 49, { width: w - 132 });
  y += 72;

  y = sectionBar(doc, 'ATTENDANCE RECORD', y);

  // Table header
  const tableX = 50;
  const colWidths = [40, 80, 60, 60];
  const headers = ['#', 'DATE', 'STATUS', 'HOURS'];
  doc.roundedRect(tableX, y, w - 100, 16, 3).fill(GREEN.pale);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark);
  let xPos = tableX + 8;
  headers.forEach((hd, i) => {
    doc.text(hd, xPos, y + 3.5, { width: colWidths[i] });
    xPos += colWidths[i] + 10;
  });
  y += 20;

  // Table rows (13px each to keep single page)
  // Hours per day scales with program length so a full-duration sheet always
  // sums to 126 total hours (28d → 4.5, 30d → 4.2, 35d → 3.6, 42d → 3).
  const hoursPerDay = Math.round((126 / duration) * 10) / 10;
  const daysPresent = Math.floor(duration * progress / 100);
  doc.font('Helvetica').fontSize(8.5);
  for (let i = 1; i <= rowCount; i++) {
    const date = dateFor(i);
    const isPresent = i <= daysPresent;
    const status = isPresent ? 'Present' : 'Absent';
    const bgColor = isPresent ? '#ECFDF5' : '#FEF2F2';
    const statusColor = isPresent ? '#166534' : '#991B1B';

    if (i % 2 === 0) {
      doc.fillColor('#FAFAFA').rect(tableX, y, w - 100, 13).fill();
    }
    xPos = tableX + 8;
    doc.fillColor(GREEN.body).text(String(i), xPos, y + 2.5, { width: colWidths[0] });
    xPos += colWidths[0] + 10;
    doc.text(date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), xPos, y + 2.5, { width: colWidths[1] });
    xPos += colWidths[1] + 10;
    doc.fillColor(bgColor).rect(xPos - 3, y + 1.5, 58, 10.5).fill();
    doc.fillColor(statusColor).text(status, xPos, y + 2.5, { width: colWidths[2] });
    xPos += colWidths[2] + 10;
    doc.fillColor(GREEN.body).text(isPresent ? `${hoursPerDay} hrs` : '-', xPos, y + 2.5, { width: colWidths[3] });
    y += 13;
  }

  // Summary box
  y += 8;
  const totalHours = Math.round(daysPresent * hoursPerDay * 10) / 10;
  const totalHoursLabel = Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1);
  doc.roundedRect(50, y, w - 100, 36, 6).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.rect(50, y + 5, 5, 26).fill(GREEN.mid);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark)
    .text(`Total Hours: ${totalHoursLabel} hrs  |  Total Attendance: ${progress}%  |  Status: ${enrollment.status.toUpperCase()}`, 66, y + 7, { width: w - 130 });
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.body)
    .text(`Days Present: ${daysPresent} / ${duration} days  |  Hours per Day: ${hoursPerDay} hrs`, 66, y + 21, { width: w - 130 });

  drawFooter(doc);
  doc.end();
});

// ===================== DAILY LOG BOOK (multi-page) =====================
// Day-wise activity register: one writable row per internship day, spilling to
// as many pages as the duration needs (28 days -> 2 pages, 42 days -> 3).
const LOG_COLS = [
  { label: '#', w: 26 },
  { label: 'DATE', w: 86 },
  { label: 'DAY', w: 58 },
  { label: 'TASKS / ACTIVITIES PERFORMED', w: 175 },
  { label: 'HOURS', w: 44 },
  { label: "SUPERVISOR'S SIGN.", w: 106 },
];
const LOG_ROW_H = 26;

function logColX(i) {
  let x = 50;
  for (let c = 0; c < i; c++) x += LOG_COLS[c].w;
  return x;
}

function logGridRow(doc, y, cells, opts = {}) {
  const bottom = y + (opts.h || LOG_ROW_H);
  if (opts.fill) { doc.fillColor(opts.fill).rect(50, y, 495, opts.h || LOG_ROW_H).fill(); }
  if (opts.head) { doc.fillColor(GREEN.pale).rect(50, y, 495, opts.h || LOG_ROW_H).fill(); }
  doc.lineWidth(0.6).strokeColor(GREEN.stroke);
  for (let c = 0; c <= LOG_COLS.length; c++) {
    const x = logColX(c);
    doc.moveTo(x, y).lineTo(x, bottom).stroke();
  }
  doc.moveTo(50, y).lineTo(545, y).stroke();
  doc.moveTo(50, bottom).lineTo(545, bottom).stroke();
  cells.forEach((text, i) => {
    const x = logColX(i);
    doc.font(opts.head ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts.head ? 8 : 8.5)
      .fillColor(opts.head ? GREEN.dark : (opts.color || GREEN.body))
      .text(String(text ?? ''), x + 5, y + (opts.head ? 4.5 : 6), {
        width: LOG_COLS[i].w - 10, height: opts.h || LOG_ROW_H - 6, ellipsis: true, align: opts.align || 'left',
      });
  });
}

function drawLogFooter(doc, pageNo, total) {
  const w = doc.page.width;
  const h = doc.page.height;
  const g = doc.linearGradient(50, 0, w - 50, 0);
  g.stop(0, GREEN.mint).stop(1, GREEN.wave);
  doc.rect(50, h - 132, w - 100, 1.2).fill(g);
  doc.font('Helvetica').fontSize(7).fillColor(GREEN.gray)
    .text(footText(), 50, h - 126, { width: w - 190, height: 10, ellipsis: true, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN.mid)
    .text(`Page ${pageNo} of ${total}`, w - 130, h - 126, { width: 80, align: 'right' });
  drawDisclaimer(doc, h - 117, { size: 6.5 });
}

function buildLogBook(doc, d) {
  const w = doc.page.width;
  const LIMIT = doc.page.height - 140;

  const header = (first) => {
    drawBrand(doc, 50, 42);
    drawTitle(doc, 'DAILY LOG BOOK', 92, { size: 24 });
    drawQrBadge(doc, d.qr, 470, 40, 70);
    doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
      .text(`Ref: ${d.ref}`, w - 270, 128, { width: 220, align: 'right' });
    let y = 146;
    if (first) {
      doc.roundedRect(50, y, w - 100, 70, 6).fill('#ffffff').stroke(GREEN.stroke);
      doc.rect(50, y + 6, 5, 58).fill(GREEN.mid);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body);
      doc.text(`Student: ${d.studentName}`, 66, y + 7, { width: w - 132 });
      doc.text(`College: ${d.college || 'N/A'}  |  Program: ${d.program}`, 66, y + 22, { width: w - 132, height: 13, ellipsis: true });
      doc.text(`Duration: ${d.duration} Days  |  Enrolled: ${d.enrolledLabel}`, 66, y + 37, { width: w - 132, height: 13, ellipsis: true });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark)
        .text(`Log Period: ${d.periodText}`, 66, y + 52, { width: w - 132 });
      y += 82;
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(GREEN.body)
        .text(`Student: ${d.studentName}  |  Program: ${d.program}  |  Continued`, 50, y, { width: w - 100, height: 13, ellipsis: true });
      y += 18;
    }
    y = sectionBar(doc, 'DAILY ACTIVITY RECORD', y);
    logGridRow(doc, y, LOG_COLS.map((c) => c.label), { head: true, h: 18 });
    return y + 18;
  };

  const fmtDate = (x) => x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const start = new Date(d.enrolledAt);

  let y = header(true);
  for (let i = 1; i <= d.duration; i++) {
    if (y + LOG_ROW_H > LIMIT) {
      doc.addPage();
      drawPageBackground(doc);
      y = header(false);
    }
    const date = new Date(start.getTime() + (i - 1) * 86400000);
    logGridRow(doc, y, [
      i,
      fmtDate(date),
      date.toLocaleDateString('en-IN', { weekday: 'long' }),
      '',
      `${d.hoursPerDay} hrs`,
      '',
    ], { fill: i % 2 === 0 ? '#FAFAFA' : undefined });
    y += LOG_ROW_H;
  }

  // Closing signature strip (own page when the table runs to the footer)
  if (y + 74 > LIMIT) {
    doc.addPage();
    drawPageBackground(doc);
    y = header(false);
  }
  y += 16;
  const sigY = y + 26;
  [
    { label: 'SIGNATURE OF STUDENT', x: 50, w: 210 },
    { label: 'SIGNATURE OF PROGRAM GUIDE / SUPERVISOR', x: 300, w: 245 },
  ].forEach((c) => {
    doc.lineWidth(0.8).strokeColor('#9CA3AF').moveTo(c.x, sigY).lineTo(c.x + c.w, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.dark).text(c.label, c.x, sigY + 5, { width: c.w });
  });
  // Supervisor's signature sits on the line (image from assets/Legeal)
  drawSignature(doc, 422.5 - 35, sigY - 4, 70);

  // Footers with page numbers on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    drawLogFooter(doc, i - range.start + 1, range.count);
  }
  return { pages: range.count, y: sigY + 14 };
}

// Wraps the builder so the layout can be exercised without a database row.
// Returns { pages, y } where y is the bottom of the last drawn element.
function streamLogBook(res, d) {
  const doc = startPdf(res, d.filename, { watermark: 'LOG BOOK', bufferPages: true });
  const result = buildLogBook(doc, d);
  doc.end();
  return result;
}

router.get('/download/log-book/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await loadEnrollment(req.params.enrollmentId, req.user.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPassedAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Pass the exam to download the daily log book.' });
  }

  const attendanceNo = await ensureEnrollmentNumber(db, enrollment, 'attendanceNo');
  const qrBuffer = await makeQr(attendanceNo);
  const duration = enrollment.duration || 30;
  const fmt = (x) => x.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const enrolled = new Date(enrollment.enrolledAt);
  const dateMode = (await getSetting(db, 'attendanceDateMode')) === 'backward' ? 'backward' : 'forward';
  const start = dateMode === 'backward' ? new Date(Date.now() - (duration - 1) * 86400000) : enrolled;

  streamLogBook(res, {
    filename: `daily-log-book-${attendanceNo}.pdf`,
    ref: attendanceNo,
    qr: qrBuffer,
    studentName: `${enrollment.firstName} ${enrollment.lastName}`,
    college: enrollment.college,
    program: enrollment.internshipTitle,
    duration,
    enrolledAt: start,
    enrolledLabel: fmt(enrolled),
    periodText: `${fmt(start)} – ${fmt(new Date(start.getTime() + (duration - 1) * 86400000))}`,
    hoursPerDay: Math.round((126 / duration) * 10) / 10,
  });
});

// ===================== INTERNSHIP MARKSHEET (single page) =====================
function markRow(doc, label, value, y, opts = {}) {
  const w = doc.page.width;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text(label, 62, y, { width: 150 });
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 10 : 9.5)
    .fillColor(opts.color || GREEN.body)
    .text(String(value ?? 'N/A'), 216, y, { width: w - 276, height: 13, ellipsis: true });
  return y + 16;
}

function buildMarksheet(doc, d) {
  const w = doc.page.width;

  drawBrand(doc, 50, 42);
  drawTitle(doc, 'INTERNSHIP MARKSHEET', 92, { size: 24 });
  drawQrBadge(doc, d.qr, 470, 40, 70);
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
    .text(`Ref: ${d.ref}`, w - 270, 128, { width: 220, align: 'right' });

  let y = sectionBar(doc, 'STUDENT DETAILS', 148);
  y = markRow(doc, 'Name', d.studentName, y);
  y = markRow(doc, 'College', d.college, y);
  y = markRow(doc, 'Course', d.course, y);
  y = markRow(doc, 'Roll No. / Reg. No.', d.rollNo, y);

  y = sectionBar(doc, 'PROGRAM DETAILS', y + 12);
  y = markRow(doc, 'Program', d.program, y);
  y = markRow(doc, 'Duration', `${d.duration} Days  ·  Enrolled: ${d.enrolledLabel}`, y);
  y = markRow(doc, 'Modules', `${d.modulesDone} of ${d.modulesTotal} completed`, y);
  y = markRow(doc, 'Result Declared', d.completedLabel, y);

  // Marks table
  y = sectionBar(doc, 'MARKS & GRADE', y + 12);
  const cols = [26, 210, 70, 70, 119]; // #, component, max, secured, remarks
  const cx = [50];
  cols.forEach((c) => cx.push(cx[cx.length - 1] + c));
  const headH = 18;
  const rowH = 20;
  doc.fillColor(GREEN.pale).rect(50, y, 495, headH).fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark);
  ['#', 'COMPONENT', 'MAXIMUM', 'SECURED', 'REMARKS'].forEach((h, i) => {
    doc.text(h, cx[i] + 6, y + 4.5, { width: cols[i] - 12, align: i >= 2 && i <= 3 ? 'center' : 'left' });
  });
  y += headH;
  d.marks.forEach((m, i) => {
    if (i % 2 === 1) doc.fillColor('#FAFAFA').rect(50, y, 495, rowH).fill();
    doc.font('Helvetica').fontSize(9).fillColor(GREEN.body);
    doc.text(String(i + 1), cx[0] + 6, y + 5.5, { width: cols[0] - 12 });
    doc.text(m.label, cx[1] + 6, y + 5.5, { width: cols[1] - 12, height: 12, ellipsis: true });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN.dark);
    doc.text(String(m.max), cx[2] + 6, y + 5.5, { width: cols[2] - 12, align: 'center' });
    doc.text(String(m.secured), cx[3] + 6, y + 5.5, { width: cols[3] - 12, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(GREEN.gray);
    doc.text(m.remark, cx[4] + 6, y + 6, { width: cols[4] - 12, height: 11, ellipsis: true });
    y += rowH;
    doc.lineWidth(0.5).strokeColor(GREEN.stroke).moveTo(50, y).lineTo(545, y).stroke();
  });
  doc.lineWidth(0.6).strokeColor(GREEN.stroke);
  cx.forEach((x) => doc.moveTo(x, y - rowH * d.marks.length - headH).lineTo(x, y).stroke());
  doc.rect(50, y - rowH * d.marks.length - headH, 495, rowH * d.marks.length + headH).stroke();

  // Result strip
  y += 14;
  const boxW = (495 - 32) / 3;
  [['GRADE', d.grade, GREEN.dark], ['SCORE', `${d.score}%`, GREEN.dark], ['RESULT', d.result, d.result === 'PASS' ? '#166534' : '#991B1B']]
    .forEach(([label, value, color], i) => {
      const x = 50 + i * (boxW + 16);
      doc.roundedRect(x, y, boxW, 46, 6).fill('#ffffff').stroke(GREEN.stroke);
      doc.rect(x, y + 5, 4, 36).fill(GREEN.mid);
      doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray).text(label, x, y + 8, { width: boxW, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(17).fillColor(color).text(String(value), x, y + 21, { width: boxW, align: 'center' });
    });
  y += 60;

  // Signatory: stamp left, controller of examinations right
  drawStamp(doc, 62, y, 70);
  doc.font('Helvetica').fontSize(7.5).fillColor(GREEN.gray)
    .text('Official Seal', 42, y + 74, { width: 110, align: 'center' });
  const sigLine = doc.page.height - 190;
  // Signature image on the line, above the signatory's name
  drawSignature(doc, w - 165 - 45, sigLine - 4, 90);
  doc.lineWidth(1).strokeColor(GREEN.light)
    .moveTo(w - 250, sigLine).lineTo(w - 80, sigLine).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(GREEN.dark)
    .text(d.signatory, w - 250, sigLine + 6, { width: 170, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(GREEN.gray)
    .text(`Controller of Examinations, ${companyName()}`, w - 250, sigLine + 20, { width: 170, align: 'center' });

  drawFooter(doc);
  return Math.max(y + 84, sigLine + 34);
}

// Wraps the builder so the layout can be exercised without a database row.
// The marksheet is always a single page; returns { pages, y }.
function streamMarksheet(res, d) {
  const doc = startPdf(res, d.filename, { watermark: 'MARKSHEET' });
  const y = buildMarksheet(doc, d);
  doc.end();
  return { pages: 1, y };
}

router.get('/download/marksheet/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await loadEnrollment(req.params.enrollmentId, req.user.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPassedAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Pass the exam to download the marksheet.' });
  }

  const cert = await db.get('SELECT * FROM certificates WHERE enrollmentId = ?', enrollment.id);
  const exam = await db.get('SELECT * FROM exams WHERE enrollmentId = ? ORDER BY id DESC LIMIT 1', enrollment.id);
  const ref = cert ? cert.certificateId : await ensureEnrollmentNumber(db, enrollment, 'reportNo');
  const qrBuffer = await makeQr(ref);

  const duration = enrollment.duration || 30;
  const progress = enrollment.progress || 100;
  let completedIdx = [];
  try { completedIdx = JSON.parse(enrollment.completedModules || '[]'); } catch (e) { completedIdx = []; }
  const modulesTotal = Number(enrollment.modules) || completedIdx.length || 1;
  const modulesDone = Math.min(modulesTotal, completedIdx.length || Math.round((progress / 100) * modulesTotal));
  const modulesPct = Math.min(100, Math.round((modulesDone / modulesTotal) * 100));
  const score = exam && exam.score != null ? exam.score : (cert ? cert.score : 0);
  const passing = (exam && exam.passingMarks) || 40;
  const grade = cert && cert.grade
    ? cert.grade
    : (score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D');
  const result = exam && exam.status === 'completed' ? 'PASS' : 'FAIL';
  const aggregate = Math.round((score + modulesPct + progress) / 3);
  const enrolled = new Date(enrollment.enrolledAt);

  streamMarksheet(res, {
    filename: `internship-marksheet-${ref}.pdf`,
    ref,
    qr: qrBuffer,
    studentName: `${enrollment.firstName} ${enrollment.lastName}`,
    college: enrollment.college || 'N/A',
    course: [enrollment.course ? String(enrollment.course).toUpperCase() : '', enrollment.year].filter(Boolean).join(' - ') || 'N/A',
    rollNo: [enrollment.rollNo ? `Roll No: ${enrollment.rollNo}` : '', enrollment.regNo ? `Reg No: ${enrollment.regNo}` : ''].filter(Boolean).join('  ·  ') || 'N/A',
    program: enrollment.internshipTitle,
    duration,
    enrolledLabel: enrolled.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    modulesDone,
    modulesTotal,
    completedLabel: exam && exam.completedAt
      ? new Date(exam.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A',
    marks: [
      { label: 'Final Examination', max: 100, secured: score, remark: `Passing: ${passing}` },
      { label: 'Learning Modules Completion', max: 100, secured: modulesPct, remark: `${modulesDone}/${modulesTotal} modules` },
      { label: 'Attendance', max: 100, secured: progress, remark: `${Math.floor((duration * progress) / 100)}/${duration} days` },
      { label: 'Overall Aggregate', max: 100, secured: aggregate, remark: `Grade ${grade}` },
    ],
    grade,
    score,
    result,
    signatory: directorName(),
  });
});

// ===================== EXAM-GATED FORMS (consent / feedback / undertaking) ===
router.get('/download/form/:type/:enrollmentId', authenticateToken, async (req, res) => {
  const key = String(req.params.type || '').toLowerCase();
  if (!FORM_TYPES.includes(key)) return res.status(404).json({ error: 'Unknown form type' });

  const enrollment = await loadEnrollment(req.params.enrollmentId, req.user.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasPassedAccess(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: 'Pass the exam to download this form.' });
  }

  try {
    const cert = await db.get('SELECT certificateId FROM certificates WHERE enrollmentId = ?', enrollment.id);
    const ref = cert ? cert.certificateId : await ensureEnrollmentNumber(db, enrollment, 'reportNo');
    const qrBuffer = await makeQr(ref);
    await streamForm(res, key, {
      student: enrollment,
      title: enrollment.internshipTitle,
      duration: enrollment.duration,
      qr: qrBuffer,
    });
  } catch (err) {
    console.error(`Form generation failed (${key}):`, err.message);
    if (res.headersSent) res.end();
    else res.status(500).json({ error: 'Could not generate the form' });
  }
});

module.exports = router;
// Exported for layout tests / scripts that render the PDFs without a DB row.
module.exports.renderers = { streamLogBook, streamMarksheet };
