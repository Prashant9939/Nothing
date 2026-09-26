// Multi-page (~20 page) internship report renderer.
// Streams an A4 PDF built from the per-track content registry
// (data/reportContent) plus the vector chart primitives in lib/pdfCharts,
// personalised with the student's enrollment, exam and module progress.

const PDFDocument = require('pdfkit');
const charts = require('./pdfCharts');
const { getSetting } = require('./settings');
const { companyName, footText, cinLabel, drawStamp, drawDisclaimer } = require('./documentBrand');
const db = require('../db');

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
const LOGO_FILE = require('path').join(__dirname, '..', 'client', 'public', 'logo', 'logo-full.png');
const fs = require('fs');

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

// footText comes from lib/documentBrand so every document prints the same
// "company name | address | CIN" footer string.

// ---------------------------------------------------------------------------
// Decorative primitives
// ---------------------------------------------------------------------------

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
  doc.save();
  doc.fillColor(GREEN.wave).fillOpacity(0.35);
  doc.moveTo(w - 130, 0)
    .bezierCurveTo(w - 48, 40, w - 22, 100, w, 185)
    .lineTo(w, 0).closePath().fill();
  doc.restore();
}

function drawBottomWaves(doc) {
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.fillOpacity(0.55);
  const gBack = doc.linearGradient(0, 0, w, 0);
  gBack.stop(0, '#BFE9DC').stop(1, '#8FD9C3');
  doc.moveTo(0, h - 88)
    .bezierCurveTo(w * 0.35, h - 116, w * 0.7, h - 74, w, h - 100)
    .lineTo(w, h).lineTo(0, h).closePath().fill(gBack);
  doc.restore();
  const gFront = doc.linearGradient(0, 0, w, 0);
  gFront.stop(0, GREEN.dark).stop(0.55, '#2E8B76').stop(1, '#4FB99E');
  doc.moveTo(0, h - 50)
    .bezierCurveTo(w * 0.3, h - 70, w * 0.65, h - 36, w, h - 60)
    .lineTo(w, h).lineTo(0, h).closePath().fill(gFront);
}

// Vector "code window" illustration used as report artwork.
function drawCodeWindow(doc, x, y, w, h) {
  const doc2 = doc;
  doc2.save();
  doc2.roundedRect(x, y, w, h, 10).fill('#0E1B16');
  doc2.clip();
  // title bar
  doc2.rect(x, y, w, 26).fill('#173027');
  ['#F87171', '#FBBF24', '#34D399'].forEach((c, i) => {
    doc2.circle(x + 16 + i * 15, y + 13, 4.5).fill(c);
  });
  doc2.font('Helvetica').fontSize(8).fillColor('#6EE7B7')
    .text('internship_report.py', x + 70, y + 8, { width: 200 });
  // pseudo code lines
  const rows = [
    [[0, 58, '#A7E8D8'], [8, 34, '#7ED0BB'], [8, 92, '#4FB99E']],
    [[0, 44, '#A7E8D8'], [6, 120, '#D7F3EA']],
    [[0, 30, '#7ED0BB'], [6, 74, '#A7E8D8'], [6, 48, '#D7F3EA']],
    [[0, 66, '#D7F3EA']],
    [[0, 24, '#FBBF24'], [6, 96, '#A7E8D8'], [6, 60, '#7ED0BB']],
    [[0, 40, '#D7F3EA'], [6, 40, '#4FB99E']],
    [[0, 84, '#D7F3EA']],
    [[0, 52, '#A7E8D8'], [6, 110, '#D7F3EA'], [6, 36, '#7ED0BB']],
    [[0, 36, '#D7F3EA'], [6, 66, '#FBBF24']],
    [[0, 74, '#D7F3EA']],
  ];
  let ly = y + 42;
  const lineH = Math.min(14, (h - 56) / rows.length);
  rows.forEach((segs, i) => {
    doc2.font('Helvetica').fontSize(6.5).fillColor('#3E5C50')
      .text(String(i + 1).padStart(2, '0'), x + 14, ly + 1, { width: 18 });
    let sx = x + 40;
    segs.forEach(([ind, sw, col]) => {
      sx += ind * 4;
      doc2.roundedRect(sx, ly, sw, 6.5, 3).fill(col).fillOpacity(0.85);
      sx += sw + 6;
    });
    ly += lineH;
  });
  // cursor
  doc2.rect(x + 40 + 74 + 6, ly - lineH + 1, 7, 8).fill('#34D399');
  doc2.restore();
  doc2.roundedRect(x, y, w, h, 10).lineWidth(1.2).strokeColor('#1E3A32').stroke();
}

// ---------------------------------------------------------------------------
// Report — pagination engine
// ---------------------------------------------------------------------------

class Report {
  constructor(doc, meta) {
    this.doc = doc;
    this.meta = meta;
    this.y = HEAD_BOTTOM + 18;
    this.toc = [];
    this.sectionNo = 0;
    this.figNo = 0;
    this.chartNo = 0;
  }

  get cw() { return this.doc.page.width - MARGIN * 2; }
  get bottom() { return FOOT_TOP - 8; }

  pageNo() {
    const r = this.doc.bufferedPageRange();
    return r.start + r.count;
  }

  addPage() {
    this.doc.addPage();
    this.pageChrome();
    this.y = HEAD_BOTTOM + 18;
  }

  ensure(h) {
    if (this.y + h > this.bottom) this.addPage();
  }

  pageChrome() {
    const doc = this.doc;
    const w = doc.page.width;
    drawWatermark(doc, 'INTERNSHIP REPORT');
    drawCornerCurve(doc);
    const logoH = 30;
    const lw = drawLogo(doc, MARGIN, 20, logoH);
    const tx = MARGIN + (lw || 44) + (lw ? 10 : 6);
    if (!lw) {
      doc.roundedRect(MARGIN, 20, 44, 30, 8).fill(GREEN.dark);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff').text('IQ', MARGIN, 27, { width: 44, align: 'center' });
    }
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark)
      .text(this.meta.trackLabel, tx, 22, { width: 300, height: 13, ellipsis: true });
    doc.font('Helvetica').fontSize(7.5).fillColor(GREEN.gray)
      .text('Internship Report', tx, 37, { width: 300 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.mid)
      .text(this.meta.reportNo || '', w - MARGIN - 160, 24, { width: 160, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor(GREEN.gray)
      .text(this.meta.dateLabel, w - MARGIN - 160, 38, { width: 160, align: 'right' });
    const g = doc.linearGradient(MARGIN, 0, w - MARGIN, 0);
    g.stop(0, GREEN.dark).stop(1, GREEN.wave);
    doc.rect(MARGIN, 54, w - MARGIN * 2, 1.6).fill(g);
  }

  // ---- headings -----------------------------------------------------------

  section(title, level = 0) {
    const label = level === 0 ? `${++this.sectionNo}. ${title}` : title;
    this.toc.push({ label, level, page: this.pageNo() });
    if (level === 0) this.sectionHeading(this.sectionNo, title);
    else this.chapterHeading(title);
    return label;
  }

  sectionHeading(no, title) {
    const doc = this.doc;
    this.ensure(74);
    const x = MARGIN;
    const y = this.y;
    doc.roundedRect(x, y, 34, 34, 8).fill(GREEN.dark);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff')
      .text(String(no), x, y + 8, { width: 34, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(GREEN.dark)
      .text(title, x + 46, y + 5, { width: this.cw - 46, height: 24, ellipsis: true });
    const tw = Math.min(doc.widthOfString(title, { font: 'Helvetica-Bold', size: 17 }), this.cw - 46);
    const g = doc.linearGradient(x + 46, 0, x + 46 + tw, 0);
    g.stop(0, GREEN.dark).stop(1, GREEN.wave);
    doc.rect(x + 46, y + 30, tw, 2.5).fill(g);
    this.y = y + 50;
  }

  chapterHeading(rawTitle) {
    const doc = this.doc;
    this.ensure(84);
    const x = MARGIN;
    const y = this.y;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.light)
      .text('DETAILED CHAPTER', x, y, { characterSpacing: 1.4 });
    doc.font('Helvetica-Bold').fontSize(19).fillColor(GREEN.dark)
      .text(rawTitle, x, y + 14, { width: this.cw, height: 52 });
    const tw = Math.min(doc.widthOfString(rawTitle, { font: 'Helvetica-Bold', size: 19 }), this.cw);
    const g = doc.linearGradient(x, 0, x + tw, 0);
    g.stop(0, GREEN.dark).stop(1, GREEN.wave);
    doc.rect(x, y + 14 + Math.min(doc.heightOfString(rawTitle, { font: 'Helvetica-Bold', size: 19, width: this.cw }), 52) + 6, tw, 2.5).fill(g);
    this.y = y + 14 + Math.min(doc.heightOfString(rawTitle, { font: 'Helvetica-Bold', size: 19, width: this.cw }), 52) + 20;
  }

  caption(text) {
    const doc = this.doc;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.mid).text(text, MARGIN, this.y, { width: this.cw });
    this.y = doc.y + 6;
  }

  // ---- body ---------------------------------------------------------------

  para(text, opts = {}) {
    const doc = this.doc;
    const size = opts.size || 9.5;
    const gap = opts.gap == null ? 9 : opts.gap;
    doc.font(opts.font || 'Helvetica').fontSize(size).fillColor(opts.color || GREEN.body);
    const th = doc.heightOfString(text, { width: this.cw, lineGap: 3, align: opts.align || 'justify' });
    this.ensure(th + gap);
    doc.text(text, MARGIN, this.y, { width: this.cw, lineGap: 3, align: opts.align || 'justify' });
    this.y = doc.y + gap;
  }

  bulletList(items, opts = {}) {
    const doc = this.doc;
    const size = opts.size || 9.5;
    const numbered = opts.numbered !== false;
    let n = 0;
    items.forEach((item) => {
      n += 1;
      const badge = numbered ? String(n) : '•';
      doc.font('Helvetica-Bold').fontSize(8.5);
      const th = doc.heightOfString(item, { width: this.cw - 34, lineGap: 2.5 });
      const rowH = Math.max(th + 8, 24);
      this.ensure(rowH + 4);
      const y = this.y;
      if (numbered) {
        doc.circle(MARGIN + 10, y + 10, 10).fill(GREEN.pale);
        doc.lineWidth(1).stroke(GREEN.mid);
        doc.fillColor(GREEN.dark).fontSize(8.5).text(badge, MARGIN, y + 5.5, { width: 20, align: 'center' });
      } else {
        doc.circle(MARGIN + 10, y + 10, 3.5).fill(GREEN.mid);
      }
      doc.font('Helvetica').fontSize(size).fillColor(GREEN.body)
        .text(item, MARGIN + 34, y, { width: this.cw - 34, lineGap: 2.5, align: 'justify' });
      this.y = y + rowH + 4;
    });
    this.y += 4;
  }

  codeBox(box) {
    if (!box || !box.lines || !box.lines.length) return;
    const doc = this.doc;
    const lineH = 12.6;
    const capH = 20;
    let lines = box.lines.slice();
    let part = 1;
    let drawn = 0;
    while (lines.length) {
      const avail = this.bottom - this.y - 16;
      let n = Math.floor((avail - capH - 14) / lineH);
      if (n < 4) { this.addPage(); continue; }
      n = Math.min(n, lines.length);
      const chunk = lines.slice(0, n);
      lines = lines.slice(n);
      const boxH = capH + chunk.length * lineH + 12;
      const y = this.y;
      doc.save();
      doc.roundedRect(MARGIN, y, this.cw, boxH, 8).fill('#10231C');
      doc.roundedRect(MARGIN, y, this.cw, capH, 8).fill('#183529');
      doc.rect(MARGIN, y + capH - 6, this.cw, 6).fill('#183529');
      const cap = box.caption + (part > 1 ? '  (cont.)' : '');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6EE7B7')
        .text(cap, MARGIN + 12, y + 6.5, { width: this.cw - 24 });
      let ly = y + capH + 6;
      chunk.forEach((line, i) => {
        const t = String(line);
        const trimmed = t.trim();
        let color = '#CFEDE3';
        if (trimmed.startsWith('#')) color = '#7ED0BB';
        else if (trimmed.startsWith('$')) color = '#A7E8D8';
        else if (trimmed.startsWith('def ') || trimmed.startsWith('class ') || trimmed.startsWith('import ') || trimmed.startsWith('from ')) color = '#6EE7B7';
        doc.font('Courier').fontSize(7.6).fillColor('#3E5C50')
          .text(String(drawn + i + 1), MARGIN + 10, ly, { width: 16, align: 'right' });
        let size = 7.6;
        const availW = this.cw - 56;
        while (size > 5.6 && doc.widthOfString(t, { font: 'Courier', size }) > availW) size -= 0.4;
        doc.font('Courier').fontSize(size).fillColor(color)
          .text(t, MARGIN + 34, ly, { width: availW + 6, height: lineH, ellipsis: true });
        ly += lineH;
      });
      doc.restore();
      drawn += chunk.length;
      this.y = y + boxH + 14;
      part += 1;
    }
  }

  diagram(d) {
    if (!d || d.type !== 'flow' || !Array.isArray(d.steps) || !d.steps.length) return;
    const doc = this.doc;
    this.figNo += 1;
    const boxH = 36;
    const gap = 18;
    const h = 22 + d.steps.length * (boxH + gap) - gap + 10;
    this.ensure(h);
    this.caption(`Figure ${this.figNo} — ${d.title}`);
    const fw = Math.min(340, this.cw - 60);
    const fx = MARGIN + (this.cw - fw) / 2;
    const bottom = charts.drawFlowDiagram(doc, fx, this.y, fw, d.steps, { boxH, gap });
    this.y = bottom + 14;
  }

  // ---- data blocks --------------------------------------------------------

  infoCard(rows) {
    const doc = this.doc;
    const rowH = 16;
    const h = 16 + rows.length * rowH + 8;
    this.ensure(h);
    const y = this.y;
    doc.roundedRect(MARGIN, y, this.cw, h, 7).fill('#ffffff').stroke(GREEN.stroke);
    doc.rect(MARGIN, y + 6, 5, h - 12).fill(GREEN.mid);
    let ry = y + 12;
    rows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN.dark).text(label, MARGIN + 18, ry, { width: 130 });
      doc.font('Helvetica').fontSize(9).fillColor(GREEN.body)
        .text(String(value == null || value === '' ? 'N/A' : value), MARGIN + 156, ry, { width: this.cw - 176, height: 13, ellipsis: true });
      ry += rowH;
    });
    this.y = y + h + 14;
  }

  chartBlock(title, fn) {
    const doc = this.doc;
    this.chartNo += 1;
    const h = fn.measure();
    this.ensure(h + 34);
    this.caption(`Chart ${this.chartNo} — ${title}`);
    fn.draw(doc, MARGIN, this.y);
    this.y += h + 20;
  }

  weeklyTable(entries) {
    const doc = this.doc;
    const periodW = 78;
    const textW = this.cw - periodW - 24;
    const headerH = 20;
    // header
    this.ensure(headerH + 30);
    let y = this.y;
    doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark).text('PERIOD', MARGIN + 8, y + 6, { width: periodW });
    doc.text('ACTIVITIES & LEARNING OUTCOMES', MARGIN + periodW + 16, y + 6, { width: textW });
    y += headerH + 4;
    entries.forEach((entry, i) => {
      const period = typeof entry === 'string' ? (entry.split(':')[0] || `Part ${i + 1}`) : (entry.period || `Part ${i + 1}`);
      const text = typeof entry === 'string' ? entry : (entry.text || '');
      doc.font('Helvetica').fontSize(8.5);
      const th = doc.heightOfString(text, { width: textW, lineGap: 2 });
      const rowH = Math.max(th + 12, 30);
      if (y + rowH > this.bottom) {
        this.addPage();
        y = this.y;
        doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark).text('PERIOD', MARGIN + 8, y + 6, { width: periodW });
        doc.text('ACTIVITIES & LEARNING OUTCOMES', MARGIN + periodW + 16, y + 6, { width: textW });
        y += headerH + 4;
      }
      if (i % 2 === 1) doc.fillColor('#FAFAFA').rect(MARGIN, y, this.cw, rowH).fill();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.dark)
        .text(period, MARGIN + 8, y + 7, { width: periodW, height: rowH - 10 });
      doc.font('Helvetica').fontSize(8.5).fillColor(GREEN.body)
        .text(text, MARGIN + periodW + 16, y + 7, { width: textW, lineGap: 2, align: 'justify' });
      doc.lineWidth(0.4).strokeColor(GREEN.stroke)
        .moveTo(MARGIN, y + rowH).lineTo(MARGIN + this.cw, y + rowH).stroke();
      y += rowH;
    });
    this.y = y + 14;
  }

  modulesTable(rows) {
    const doc = this.doc;
    const headerH = 20;
    this.ensure(headerH + 34);
    let y = this.y;
    const c1 = 36, c3 = 74, c4 = 96;
    const c2 = this.cw - c1 - c3 - c4;
    doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark);
    doc.text('#', MARGIN + 8, y + 6, { width: c1 });
    doc.text('MODULE', MARGIN + c1 + 8, y + 6, { width: c2 });
    doc.text('DURATION', MARGIN + c1 + c2 + 8, y + 6, { width: c3 });
    doc.text('STATUS', MARGIN + c1 + c2 + c3 + 8, y + 6, { width: c4 });
    y += headerH + 4;
    rows.forEach((row, i) => {
      doc.font('Helvetica').fontSize(8.5);
      const th = doc.heightOfString(row.title, { width: c2 - 12 });
      const rowH = Math.max(th + 10, 24);
      if (y + rowH > this.bottom) { this.addPage(); y = this.y; }
      if (i % 2 === 1) doc.fillColor('#FAFAFA').rect(MARGIN, y, this.cw, rowH).fill();
      doc.fillColor(GREEN.mid).text(String(i + 1), MARGIN + 8, y + 6, { width: c1 });
      doc.fillColor(GREEN.body).text(row.title, MARGIN + c1 + 8, y + 6, { width: c2 - 12, height: rowH - 8 });
      doc.fillColor(GREEN.body).text(row.duration || '—', MARGIN + c1 + c2 + 8, y + 6, { width: c3 });
      const done = row.done;
      doc.roundedRect(MARGIN + c1 + c2 + c3 + 6, y + 5, 74, 14, 7).fill(done ? '#D1FAE5' : '#F3F4F6');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(done ? '#166534' : GREEN.gray)
        .text(done ? '✓ COMPLETED' : '○ PENDING', MARGIN + c1 + c2 + c3 + 6, y + 8.5, { width: 74, align: 'center' });
      doc.font('Helvetica');
      y += rowH;
    });
    this.y = y + 14;
  }

  numberedCards(items, accent = GREEN.mid) {
    const doc = this.doc;
    items.forEach((text, i) => {
      doc.font('Helvetica').fontSize(9.3);
      const th = doc.heightOfString(text, { width: this.cw - 52, lineGap: 2.5, align: 'justify' });
      const cardH = th + 26;
      this.ensure(cardH + 8);
      const y = this.y;
      doc.roundedRect(MARGIN, y, this.cw, cardH, 7).fill(i % 2 ? GREEN.pale : '#ffffff').stroke(GREEN.stroke);
      doc.circle(MARGIN + 22, y + 20, 12).fill(accent);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff')
        .text(String(i + 1), MARGIN + 10, y + 14.5, { width: 24, align: 'center' });
      doc.font('Helvetica').fontSize(9.3).fillColor(GREEN.body)
        .text(text, MARGIN + 44, y + 12, { width: this.cw - 60, lineGap: 2.5, align: 'justify' });
      this.y = y + cardH + 8;
    });
    this.y += 6;
  }

  twoColList(items) {
    const doc = this.doc;
    const colW = (this.cw - 20) / 2;
    const rows = Math.ceil(items.length / 2);
    doc.font('Helvetica').fontSize(9);
    const heights = items.map((t) => doc.heightOfString(t, { width: colW - 26, lineGap: 2 }) + 8);
    let y = this.y;
    let placed = 0;
    for (let r = 0; r < rows; r++) {
      const left = items[r];
      const right = items[r + rows];
      const h = Math.max(left ? heights[r] : 0, right ? heights[r + rows] : 0, 20);
      if (y + h > this.bottom) { this.addPage(); y = this.y; }
      [left ? [MARGIN, left, r] : null, right ? [MARGIN + colW + 20, right, r + rows] : null]
        .filter(Boolean)
        .forEach(([x, text, idx]) => {
          doc.circle(x + 7, y + 9, 7).fill(GREEN.pale);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.mid).text('✓', x + 1, y + 4.5, { width: 12, align: 'center' });
          doc.font('Helvetica').fontSize(9).fillColor(GREEN.body)
            .text(text, x + 22, y + 1, { width: colW - 26, lineGap: 2 });
          placed += 1;
        });
      y += h + 6;
    }
    this.y = y + 6;
  }

  signatureBlock() {
    const doc = this.doc;
    const h = 96;
    this.ensure(h + 10);
    const y = this.y;
    const half = this.cw / 2;
    doc.lineWidth(0.8).strokeColor(GREEN.light);
    doc.moveTo(MARGIN + 30, y + 52).lineTo(MARGIN + half - 30, y + 52).stroke();
    doc.moveTo(MARGIN + half + 30, y + 52).lineTo(MARGIN + this.cw - 30, y + 52).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(GREEN.gray);
    doc.text('Student Signature', MARGIN + 30, y + 58, { width: half - 60, align: 'center' });
    doc.text('Program Director', MARGIN + half + 30, y + 58, { width: half - 60, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark);
    doc.text(`${this.meta.studentName}`, MARGIN + 30, y + 72, { width: half - 60, align: 'center' });
    doc.text(companyName(), MARGIN + half + 30, y + 72, { width: half - 60, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray)
      .text(`Place & Date: ______________________`, MARGIN + 30, y + 86, { width: half - 60, align: 'center' });
    // Company stamp over the Program Director line
    drawStamp(doc, 397, y + 6, 48);
    this.y = y + h;
  }
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function drawCover(doc, meta) {
  const w = doc.page.width;
  const h = doc.page.height;
  drawCornerCurve(doc);
  drawBottomWaves(doc);
  doc.save();
  doc.fillColor(GREEN.mint).fillOpacity(0.5);
  doc.circle(60, 640, 46).fill();
  doc.fillColor(GREEN.wave).fillOpacity(0.4);
  doc.circle(110, 700, 26).fill();
  doc.restore();

  // letterhead
  const logoH = 54;
  const lw = drawLogo(doc, MARGIN, 40, logoH);
  const tx = MARGIN + (lw || 56) + (lw ? 14 : 8);
  if (!lw) {
    doc.roundedRect(MARGIN, 40, 56, 56, 12).fill(GREEN.dark);
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#fff').text('IQ', MARGIN, 55, { width: 56, align: 'center' });
  }
  doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN.dark).text(meta.companyName, tx, 52);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREEN.gray).text(meta.companyAddress, tx, 74, { width: 300 });
  const cin = cinLabel();
  if (cin) doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN.mid).text(cin, tx, 87);
  doc.font('Helvetica').fontSize(8).fillColor(GREEN.mid)
    .text(meta.siteLabel, w - MARGIN - 180, 56, { width: 180, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor(GREEN.gray)
    .text(meta.dateLabel, w - MARGIN - 180, 72, { width: 180, align: 'right' });

  // title block
  let y = 150;
  const pillW = 250;
  doc.roundedRect((w - pillW) / 2, y, pillW, 22, 11).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN.mid)
    .text(meta.trackLabel.toUpperCase(), (w - pillW) / 2, y + 6, { width: pillW, align: 'center', characterSpacing: 1 });

  y += 42;
  doc.font('Helvetica-Bold').fontSize(42).fillColor(GREEN.dark)
    .text('INTERNSHIP REPORT', 0, y, { width: w, align: 'center' });
  y += 52;
  const ruleW = 300;
  const g = doc.linearGradient((w - ruleW) / 2, 0, (w + ruleW) / 2, 0);
  g.stop(0, GREEN.dark).stop(1, GREEN.wave);
  doc.rect((w - ruleW) / 2, y, ruleW, 3).fill(g);
  doc.polygon([(w) / 2, y + 1.5], [(w) / 2 + 7, y - 4], [(w) / 2 + 7, y + 7]).fill(GREEN.dark);

  y += 26;
  doc.font('Helvetica-Bold').fontSize(17).fillColor(GREEN.ink)
    .text(meta.programTitle, 70, y, { width: w - 140, align: 'center' });
  y += doc.heightOfString(meta.programTitle, { font: 'Helvetica-Bold', size: 17, width: w - 140 }) + 14;
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.gray)
    .text(`${meta.duration} Days  ·  ${meta.modulesLabel}  ·  Prepared by ${meta.studentName}`, 70, y, { width: w - 140, align: 'center' });

  // artwork
  y += 34;
  const artW = 360;
  const artH = 158;
  drawCodeWindow(doc, (w - artW) / 2, y, artW, artH);
  y += artH + 26;

  // student card
  const cardH = 108;
  doc.roundedRect(MARGIN, y, w - MARGIN * 2, cardH, 9).fill('#ffffff').stroke(GREEN.stroke);
  const bandG = doc.linearGradient(MARGIN, 0, w - MARGIN, 0);
  bandG.stop(0, GREEN.dark).stop(1, GREEN.light);
  doc.roundedRect(MARGIN, y, w - MARGIN * 2, 22, 9).fill(bandG);
  doc.rect(MARGIN, y + 12, w - MARGIN * 2, 10).fill(bandG);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff').text('STUDENT & ENROLLMENT DETAILS', MARGIN + 14, y + 6.5);
  const rows = [
    ['Name', meta.studentName, 'Institution', meta.institution],
    ['Program', meta.programTitle, 'Duration', `${meta.duration} Days`],
    ['Report No.', meta.reportNo, 'Grade', meta.grade],
  ];
  let ry = y + 32;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark).text(l1, MARGIN + 14, ry, { width: 74 });
    doc.font('Helvetica').fontSize(8.8).fillColor(GREEN.body).text(String(v1 || 'N/A'), MARGIN + 92, ry, { width: 190, height: 12, ellipsis: true });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark).text(l2, MARGIN + 300, ry, { width: 84 });
    doc.font('Helvetica').fontSize(8.8).fillColor(GREEN.body).text(String(v2 || 'N/A'), MARGIN + 388, ry, { width: w - MARGIN * 2 - 402, height: 12, ellipsis: true });
    ry += 16;
  });
  y += cardH + 18;

  // ref strip + QR
  if (meta.qrBuffer) {
    const box = 74;
    doc.roundedRect(w - MARGIN - box, y, box, box, 8).fill('#ffffff').stroke(GREEN.stroke);
    doc.image(meta.qrBuffer, w - MARGIN - box + 7, y + 7, { width: box - 14 });
    doc.font('Helvetica').fontSize(6.5).fillColor(GREEN.gray)
      .text('Scan to verify', w - MARGIN - box - 12, y + box + 5, { width: box + 24, align: 'center' });
  }
  doc.roundedRect(MARGIN, y, w - MARGIN * 2 - 110, 30, 6).fill(GREEN.pale).stroke(GREEN.stroke);
  doc.rect(MARGIN, y + 5, 5, 20).fill(GREEN.mid);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark).text('REPORT REFERENCE', MARGIN + 16, y + 8, { width: 130 });
  doc.font('Helvetica').fontSize(10).fillColor(GREEN.body).text(meta.reportNo, MARGIN + 152, y + 8, { width: 200 });

  // Computer-generated / QR-verification disclaimer
  drawDisclaimer(doc, y + 44, { x: 0, width: w });
}

// ---------------------------------------------------------------------------
// Table of contents (drawn on the reserved page 2 after content is rendered)
// ---------------------------------------------------------------------------

function drawToc(doc, toc) {
  const w = doc.page.width;
  drawWatermark(doc, 'CONTENTS');
  drawCornerCurve(doc);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(GREEN.dark)
    .text('TABLE OF CONTENTS', MARGIN, 84, { width: w - MARGIN * 2 });
  const tw = doc.widthOfString('TABLE OF CONTENTS', { font: 'Helvetica-Bold', size: 24 });
  const g = doc.linearGradient(MARGIN, 0, MARGIN + tw, 0);
  g.stop(0, GREEN.dark).stop(1, GREEN.wave);
  doc.rect(MARGIN, 120, tw, 3).fill(g);

  let y = 150;
  toc.forEach((entry) => {
    const indent = entry.level * 26;
    const size = entry.level ? 9.5 : 10.5;
    const font = entry.level ? 'Helvetica' : 'Helvetica-Bold';
    if (y > doc.page.height - 90) return;
    doc.font(font).fontSize(size).fillColor(entry.level ? GREEN.body : GREEN.dark)
      .text(entry.label, MARGIN + indent, y, { width: 350 - indent, height: 15, ellipsis: true });
    const labelW = doc.widthOfString(entry.label, { font, size });
    const pageStr = String(entry.page);
    const pageW = doc.widthOfString(pageStr, { font: 'Helvetica-Bold', size });
    const dotsX = MARGIN + indent + Math.min(labelW + 8, 330 - indent);
    const pageX = w - MARGIN - pageW;
    if (pageX > dotsX + 6) {
      doc.save().dash(1.5, { space: 3 }).lineWidth(0.8).strokeColor(GREEN.stroke)
        .moveTo(dotsX, y + size * 0.55).lineTo(pageX - 6, y + size * 0.55).stroke().undash();
      doc.restore();
    }
    doc.font('Helvetica-Bold').fontSize(size).fillColor(GREEN.mid)
      .text(pageStr, w - MARGIN - 40, y, { width: 40, align: 'right' });
    y += entry.level ? 19 : 24;
  });
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderOverview(r, content, meta) {
  r.section('Program Overview');
  const paras = Array.isArray(content.overview) ? content.overview : [content.overview];
  paras.filter(Boolean).forEach((p) => r.para(p));
  drawCodeWindowIllustration(r);
  if (content.objectives && content.objectives.length) {
    r.section('Learning Objectives');
    r.para('On completion of the internship the student was expected to demonstrate the following measurable outcomes, each verified through graded lab work, the capstone project and the final evaluation:');
    r.bulletList(content.objectives);
  }
}

function drawCodeWindowIllustration(r) {
  const doc = r.doc;
  const h = 132;
  r.ensure(h + 40);
  r.caption('Figure — Program workbench: lab exercises, notes and project code');
  const w = Math.min(360, r.cw);
  drawCodeWindow(doc, MARGIN + (r.cw - w) / 2, r.y, w, h);
  r.y += h + 16;
}

function renderSummary(r, payload) {
  const { enrollment, cert, exam, content, modules, meta, avgScore } = payload;
  r.section('Student Performance Summary');
  const progress = enrollment.progress || 0;
  const completedCount = modules.filter((m) => m.done).length;
  r.infoCard([
    ['Student', meta.studentName],
    ['Institution', meta.institution],
    ['Program', enrollment.internshipTitle],
    ['Enrolled On', meta.enrolledLabel],
    ['Duration', `${enrollment.duration || 30} Days`],
    ['Course Progress', `${progress}%  (${completedCount}/${modules.length} modules completed)`],
    ['Exam Score', exam && exam.score != null ? `${exam.score}%  (Status: ${exam.status})` : 'Not attempted'],
    ['Result', cert ? `Grade ${cert.grade} · Certificate ${cert.certificateId}` : (enrollment.status === 'completed' ? 'Completed' : 'In progress')],
    ['Attendance', `${Math.floor((enrollment.duration || 30) * progress / 100)} / ${enrollment.duration || 30} days`],
  ]);

  const bars = [
    { label: 'Course Progress', value: progress },
    { label: 'Exam Score', value: exam && exam.score != null ? exam.score : 0 },
    { label: 'Passing Mark', value: 80, color: '#9CA3AF' },
  ];
  if (avgScore != null) bars.push({ label: 'Program Average', value: Math.round(avgScore), color: '#7ED0BB' });

  r.chartBlock('Overall performance indicators (0–100)', {
    measure: () => 160,
    draw: (doc, x, y) => charts.drawBarChart(doc, x, y, r.cw, 160, bars, { max: 100, barWidth: 64 }),
  });
}

function renderModules(r, modules) {
  if (!modules.length) return;
  r.section('Modules Covered');
  r.para(`The curriculum of this program is delivered through ${modules.length} structured learning modules. The table below lists every module covered during the internship along with its completion status as recorded in the learning portal.`);
  r.modulesTable(modules);
}

function renderChapters(r, content) {
  (content.chapters || []).forEach((ch, i) => {
    r.section(`Chapter ${i + 1}: ${ch.title}`, 1);
    const paras = Array.isArray(ch.paragraphs) ? ch.paragraphs : [ch.paragraphs];
    paras.filter(Boolean).forEach((p) => r.para(p));
    if (ch.codeBox) r.codeBox(ch.codeBox);
    if (ch.diagram) r.diagram(ch.diagram);
  });
}

// Parses a TEXT column that may hold JSON, or the value itself if already parsed.
function parseJsonCol(text, fallback) {
  if (text == null || text === '') return fallback;
  if (typeof text === 'object') return text;
  try {
    const v = JSON.parse(text);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

// Module-wise detailed notes built from the learning_modules table — every
// report grows with the actual curriculum content of its track, regardless of
// which content file backs it.
function renderModuleNotes(r, dbModules) {
  if (!dbModules || !dbModules.length) return;
  r.section('Module-wise Detailed Notes');
  r.para(`The curriculum of this track is delivered through ${dbModules.length} structured learning modules. This section expands each module into its full narrative: the concepts taught, the learning objectives verified, the detailed notes prepared by the mentors, and the worked code examples that accompanied every session. Reading this section end-to-end is equivalent to reviewing the complete course material of the program.`);
  dbModules.forEach((m, idx) => {
    r.section(`Module ${idx + 1}: ${m.title}`, 1);
    if (m.description) r.para(m.description);

    const topics = String(m.topics || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (topics.length) {
      r.para(`Key topics covered: ${topics.join(', ')}.`, { size: 9.2, color: GREEN.mid, align: 'left', gap: 7 });
    }

    const objectives = parseJsonCol(m.learningObjectives, []);
    if (objectives.length) {
      r.caption('LEARNING OBJECTIVES VERIFIED FOR THIS MODULE');
      r.bulletList(objectives.map(String));
    }

    const sections = parseJsonCol(m.contentSections, []);
    sections.forEach((sec) => {
      if (!sec || !sec.content) return;
      if (sec.title) r.caption(String(sec.title).toUpperCase());
      String(sec.content).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
        .forEach((p) => r.para(p, { gap: 7 }));
      const code = sec.codeExample || (sec.type === 'code' && /^\s*(\$|>>>|def |class |import |from |#|[a-z_]+\s*=)/.test(sec.content) ? sec.content : null);
      if (code) r.codeBox({ caption: `${sec.title || m.title} — worked example`, lines: String(code).split('\n') });
    });

    if (Array.isArray(m.resources) && m.resources.length) {
      r.caption('FURTHER READING FOR THIS MODULE');
      r.bulletList(m.resources.map((res) => (typeof res === 'string' ? res : (res.title || JSON.stringify(res)))));
    }
  });
}

function renderWeeklyLog(r, content) {
  const entries = content.weeklyLog || [];
  if (!entries.length) return;
  r.section('Weekly Work Log');
  r.para('A consolidated week-by-week record of the activities, exercises, labs and deliverables completed during the internship period:');
  r.weeklyTable(entries);
}

function renderAnalytics(r, content) {
  const c = content.charts || {};
  if (c.timeAllocation && c.timeAllocation.length) {
    r.section('Performance Analytics');
    r.para('The charts below summarise how programme time was distributed across activity types and how the student engaged with each component of the curriculum over the duration of the internship.');
    r.chartBlock('Time allocation across program activities', {
      measure: () => 170,
      draw: (doc, x, y) => {
        const cx = x + 96;
        const cy = y + 82;
        charts.drawPieChart(doc, cx, cy, 66, c.timeAllocation, { centerLabel: 'TIME' });
      },
    });
    if (c.engagement && c.engagement.length) {
      r.chartBlock('Engagement by activity type (share of total effort)', {
        measure: () => 40 + c.engagement.length * 26,
        draw: (doc, x, y) => charts.drawSkillBars(doc, x, y + 6, r.cw, c.engagement, { rowH: 26 }),
      });
    }
  }
  if (c.skills && c.skills.length) {
    r.section('Skill Development & Milestones');
    r.chartBlock('Skill proficiency achieved by the end of the program', {
      measure: () => 40 + c.skills.length * 26,
      draw: (doc, x, y) => charts.drawSkillBars(doc, x, y + 6, r.cw, c.skills, { rowH: 26 }),
    });
    if (c.milestones && (c.milestones.values || []).length > 1) {
      r.chartBlock('Cumulative progress across milestones', {
        measure: () => 176,
        draw: (doc, x, y) => charts.drawLineChart(doc, x, y, r.cw, 176, c.milestones.labels, c.milestones.values, { max: 100 }),
      });
    }
  }
}

function renderProject(r, content) {
  if (!content.project) return;
  r.section('Capstone Project');
  r.para(`Project Title: ${content.project.title}`, { font: 'Helvetica-Bold', size: 10.5, color: GREEN.dark, align: 'left' });
  r.para(content.project.description);
  if (Array.isArray(content.project.flow) && content.project.flow.length) {
    r.diagram({ type: 'flow', title: `${content.project.title} — Implementation Workflow`, steps: content.project.flow });
  }
}

function renderTools(r, content) {
  if (!content.tools || !content.tools.length) return;
  r.section('Tools & Technologies');
  r.para('The following tools, frameworks and environments were used routinely across labs, assignments and the capstone project:');
  r.twoColList(content.tools);
}

function renderChallenges(r, content) {
  if (!content.challenges || !content.challenges.length) return;
  r.section('Challenges & Learnings');
  r.para('Key difficulties encountered during the internship and how they were resolved:');
  r.numberedCards(content.challenges);
}

function renderConclusion(r, content) {
  r.section('Conclusion');
  (Array.isArray(content.conclusion) ? content.conclusion : [content.conclusion]).forEach((p) => p && r.para(p));
  r.ensure(70);
  r.para('Declaration: The work recorded in this report was carried out during the internship period stated above. The details, charts and observations presented are a true record of the activities completed under the supervision of the program mentors.', { size: 9, color: GREEN.gray, gap: 6 });
  r.signatureBlock();
}

function renderReferences(r, content) {
  if (!content.references || !content.references.length) return;
  r.section('References');
  r.bulletList(content.references);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function streamReport(res, payload) {
  const { content, enrollment, reportNo, qrBuffer, filename } = payload;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: `Internship Report - ${enrollment.internshipTitle}`,
      Author: companyName(),
      Subject: `Internship report for ${payload.meta.studentName}`,
      Keywords: `internship report, ${enrollment.internshipTitle}`,
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  try {
    const r = new Report(doc, payload.meta);
    drawCover(doc, payload.meta);

    // page 2 reserved for the table of contents (filled at the end)
    doc.addPage();
    r.pageChrome();
    r.addPage();

    renderOverview(r, content, payload.meta);
    renderSummary(r, payload);
    renderModules(r, payload.modules);
    renderChapters(r, content);
    // Module-by-module notes straight from the learning_modules table so the
    // report always reflects the real curriculum of the selected track.
    const dbModules = payload.dbModules || await db.all('SELECT * FROM learning_modules WHERE internshipId = ? ORDER BY moduleOrder', enrollment.internshipId);
    renderModuleNotes(r, dbModules);
    renderWeeklyLog(r, content);
    renderAnalytics(r, content);
    renderProject(r, content);
    renderTools(r, content);
    renderChallenges(r, content);
    renderConclusion(r, content);
    renderReferences(r, content);

    // final pass: table of contents + page numbers on every page
    const range = doc.bufferedPageRange();
    const total = range.count;
    const tocPage = range.start + 1;
    if (tocPage < range.start + total) {
      doc.switchToPage(tocPage);
      drawToc(doc, r.toc);
    }
    for (let i = range.start; i < range.start + total; i++) {
      doc.switchToPage(i);
      if (i === range.start) continue; // cover has no footer
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
  } catch (err) {
    console.error('Report generation failed:', err);
  }

  doc.end();
}

module.exports = { streamReport };
