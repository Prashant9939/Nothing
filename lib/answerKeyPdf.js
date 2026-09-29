// Exam answer-key renderer for the admin panel.
// Streams an A4 PDF listing every active question of an internship's track
// with its correct option highlighted, using the shared IQIntern brand.

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { companyName, footText, cinLabel, drawDisclaimer } = require('./documentBrand');

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

const MARGIN = 50;
const HEAD_BOTTOM = 62;
const FOOT_TOP = 776;

const LOGO_FILE = path.join(__dirname, '..', 'client', 'public', 'logo', 'logo-full.png');
let LOGO_SIZE = { width: 2274, height: 1856 };
try {
  const buf = fs.readFileSync(LOGO_FILE);
  if (buf.length > 24 && buf.slice(1, 4).toString('ascii') === 'PNG') {
    LOGO_SIZE = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
} catch (e) { /* logo missing — text mark fallback */ }

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
  const fs2 = Math.round(Math.min(w, h) * 0.13);
  doc.save();
  doc.font('Helvetica-Bold').fontSize(fs2);
  doc.fillColor(GREEN.dark).fillOpacity(0.035);
  doc.rotate(-30, { origin: [w / 2, h / 2] });
  doc.text(text, 0, h / 2 - fs2 * 0.36, { width: w, align: 'center' });
  doc.restore();
}

function drawCornerCurve(doc) {
  const w = doc.page.width;
  doc.save();
  doc.fillColor(GREEN.mint).fillOpacity(0.45);
  doc.moveTo(w - 200, 0)
    .bezierCurveTo(w - 80, 45, w - 36, 120, w, 250)
    .lineTo(w, 0).closePath().fill();
  doc.restore();
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'exam';

class AnswerKey {
  constructor(doc, meta) {
    this.doc = doc;
    this.meta = meta;
    this.y = HEAD_BOTTOM + 18;
  }

  get cw() { return this.doc.page.width - MARGIN * 2; }
  get bottom() { return FOOT_TOP - 8; }

  addPage() {
    this.doc.addPage();
    this.chrome();
    this.y = HEAD_BOTTOM + 18;
  }

  ensure(h) {
    if (this.y + h > this.bottom) this.addPage();
  }

  chrome() {
    const doc = this.doc;
    const w = doc.page.width;
    drawWatermark(doc, 'ANSWER KEY');
    drawCornerCurve(doc);
    const lw = drawLogo(doc, MARGIN, 20, 30);
    const tx = MARGIN + (lw || 44) + (lw ? 10 : 6);
    if (!lw) {
      doc.roundedRect(MARGIN, 20, 44, 30, 8).fill(GREEN.dark);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff').text('IQ', MARGIN, 27, { width: 44, align: 'center' });
    }
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark)
      .text(this.meta.internshipTitle, tx, 22, { width: 340, height: 13, ellipsis: true });
    doc.font('Helvetica').fontSize(7.5).fillColor(GREEN.gray)
      .text('Exam Answer Key', tx, 37, { width: 300 });
    doc.font('Helvetica').fontSize(7.5).fillColor(GREEN.gray)
      .text(this.meta.dateLabel, w - MARGIN - 160, 38, { width: 160, align: 'right' });
    const g = doc.linearGradient(MARGIN, 0, w - MARGIN, 0);
    g.stop(0, GREEN.dark).stop(1, GREEN.wave);
    doc.rect(MARGIN, 54, w - MARGIN * 2, 1.6).fill(g);
  }

  titleBlock() {
    const doc = this.doc;
    this.ensure(96);
    const pillW = 150;
    doc.roundedRect(MARGIN, this.y, pillW, 20, 10).fill(GREEN.pale).stroke(GREEN.stroke);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.mid)
      .text('CORRECT ANSWER KEY', MARGIN, this.y + 5.5, { width: pillW, align: 'center', characterSpacing: 0.8 });
    this.y += 30;
    doc.font('Helvetica-Bold').fontSize(21).fillColor(GREEN.dark)
      .text(this.meta.internshipTitle, MARGIN, this.y, { width: this.cw, lineGap: 2 });
    this.y = doc.y + 8;
    doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.body)
      .text(this.meta.metaLine, MARGIN, this.y, { width: this.cw });
    this.y = doc.y + 14;
  }

  questionCard(q, idx) {
    const doc = this.doc;
    const letters = ['A', 'B', 'C', 'D'];
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((o) => String(o ?? ''));
    const textW = this.cw - 60;
    const optW = this.cw - 160;

    doc.font('Helvetica-Bold').fontSize(10);
    const qH = doc.heightOfString(q.question, { width: textW, lineGap: 2 });
    doc.font('Helvetica').fontSize(9.5);
    const oh = opts.map((o) => Math.max(doc.heightOfString(o, { width: optW, lineGap: 2 }), 13));
    const optBlockH = oh.reduce((a, b) => a + b + 8, 0);
    const cardH = 14 + Math.max(qH, 16) + 10 + optBlockH + 10;

    this.ensure(cardH + 10);
    const x = MARGIN;
    const y = this.y;

    doc.roundedRect(x, y, this.cw, cardH, 8).fill('#ffffff').stroke(GREEN.stroke);
    doc.circle(x + 24, y + 26, 12).fill(GREEN.dark);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff')
      .text(String(idx + 1), x + 12, y + 20.5, { width: 24, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.ink)
      .text(q.question, x + 44, y + 15, { width: textW, lineGap: 2 });

    let oy = y + 15 + Math.max(qH, 16) + 10;
    opts.forEach((o, i) => {
      const correct = i === q.correct;
      const h = oh[i];
      if (correct) {
        doc.roundedRect(x + 44, oy - 4, this.cw - 58, h + 8, 5).fill(GREEN.pale).stroke(GREEN.stroke);
      }
      doc.font(correct ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
        .fillColor(correct ? GREEN.dark : GREEN.body)
        .text(`${letters[i]}. ${o}`, x + 52, oy - 1, { width: optW, lineGap: 2 });
      if (correct) {
        doc.roundedRect(x + this.cw - 86, oy - 2, 68, 15, 7.5).fill(GREEN.mid);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff')
          .text('✓ ANSWER', x + this.cw - 86, oy + 2.5, { width: 68, align: 'center' });
      }
      oy += h + 8;
    });

    this.y = y + cardH + 10;
  }
}

function streamAnswerKey(res, { internship, questions, generatedBy, trackLabel }) {
  const meta = {
    internshipTitle: String(internship.title || 'Internship Program'),
    dateLabel: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    metaLine: '',
  };
  meta.metaLine = [
    `Track: ${trackLabel || internship.category}`,
    `${questions.length} questions`,
    `Generated on ${meta.dateLabel}`,
    generatedBy ? `by ${generatedBy}` : null,
  ].filter(Boolean).join('  ·  ');

  const filename = `answer-key-${slug(internship.title || internship.category)}.pdf`;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: `Answer Key - ${meta.internshipTitle}`,
      Author: companyName(),
      Subject: `Exam answer key (${questions.length} questions)`,
      Keywords: `answer key, exam, ${internship.category}`,
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  try {
    const k = new AnswerKey(doc, meta);
    k.chrome();
    k.titleBlock();
    questions.forEach((q, i) => k.questionCard(q, i));

    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = range.start; i < range.start + total; i++) {
      doc.switchToPage(i);
      const w = doc.page.width;
      const h = doc.page.height;
      const g = doc.linearGradient(MARGIN, 0, w - MARGIN, 0);
      g.stop(0, GREEN.mint).stop(1, GREEN.wave);
      doc.rect(MARGIN, h - 58, w - MARGIN * 2, 1.1).fill(g);
      doc.font('Helvetica').fontSize(7).fillColor(GREEN.gray)
        .text(footText(), MARGIN, h - 48, { width: w - MARGIN * 2 - 90, height: 10, ellipsis: true });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN.mid)
        .text(`Page ${i - range.start + 1} of ${total}`, w - MARGIN - 90, h - 48, { width: 90, align: 'right' });
      drawDisclaimer(doc, h - 38, { x: MARGIN, width: w - MARGIN * 2 });
    }
    const cin = cinLabel();
    if (cin) {
      doc.switchToPage(range.start);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(GREEN.mid)
        .text(cin, MARGIN, 40, { width: doc.page.width - MARGIN * 2, align: 'right' });
    }
  } catch (err) {
    console.error('Answer key generation failed:', err);
  }

  doc.end();
}

module.exports = { streamAnswerKey };
