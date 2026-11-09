// Multi-page (~20 page) internship report renderer.
// Streams an A4 PDF built from the per-track content registry
// (data/reportContent) plus the vector chart primitives in lib/pdfCharts,
// personalised with the student's enrollment, exam and module progress.

// pdfkit is required inside the render entry point: this module is pulled in
// at boot through routes/documents.js, and pdfkit's parse+init is a large
// slice of cold-start time that should only be paid when a report renders.
const charts = require('./pdfCharts');
const { companyName } = require('./documentBrand');
const db = require('../db');
const fs = require('fs');
const path = require('path');

// Plain monochrome palette: white pages, black text/lines. The key names are
// kept so every renderer call site stays unchanged.
const GREEN = {
  dark: '#000000',
  mid: '#000000',
  light: '#000000',
  mint: '#FFFFFF',
  wave: '#000000',
  pale: '#FFFFFF',
  stroke: '#000000',
  ink: '#000000',
  body: '#000000',
  gray: '#000000',
};

const MARGIN = 50;
const CONTENT_TOP = 56;
const FOOT_TOP = 776;

// ---------------------------------------------------------------------------
// Decorative primitives (watermark / corner curve / waves) removed for the
// plain white-page, black-text report style.
// ---------------------------------------------------------------------------

// Vector "code window" illustration — plain white box, black border and
// monochrome line-art placeholders (no dark terminal styling).
function drawCodeWindow(doc, x, y, w, h) {
  const doc2 = doc;
  doc2.save();
  // title bar
  doc2.font('Helvetica-Bold').fontSize(8).fillColor('#000000')
    .text('internship_report.py', x + 14, y + 8, { width: 200 });
  doc2.lineWidth(0.8).strokeColor('#000000')
    .moveTo(x, y + 26).lineTo(x + w, y + 26).stroke();
  // pseudo code lines
  const rows = [
    [[0, 58], [8, 34], [8, 92]],
    [[0, 44], [6, 120]],
    [[0, 30], [6, 74], [6, 48]],
    [[0, 66]],
    [[0, 24], [6, 96], [6, 60]],
    [[0, 40], [6, 40]],
    [[0, 84]],
    [[0, 52], [6, 110], [6, 36]],
    [[0, 36], [6, 66]],
    [[0, 74]],
  ];
  let ly = y + 42;
  const lineH = Math.min(14, (h - 56) / rows.length);
  rows.forEach((segs, i) => {
    doc2.font('Helvetica').fontSize(6.5).fillColor('#000000')
      .text(String(i + 1).padStart(2, '0'), x + 14, ly + 1, { width: 18 });
    let sx = x + 40;
    segs.forEach(([ind, sw]) => {
      sx += ind * 4;
      doc2.roundedRect(sx, ly, sw, 6.5, 3).fill('#000000');
      sx += sw + 6;
    });
    ly += lineH;
  });
  doc2.restore();
  doc2.roundedRect(x, y, w, h, 10).lineWidth(1.2).strokeColor('#000000').stroke();
}

// ---------------------------------------------------------------------------
// Report — pagination engine
// ---------------------------------------------------------------------------

class Report {
  constructor(doc, meta) {
    this.doc = doc;
    this.meta = meta;
    this.y = CONTENT_TOP;
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
    this.y = CONTENT_TOP;
  }

  ensure(h) {
    if (this.y + h > this.bottom) this.addPage();
  }

  pageChrome() {
    // Plain white pages: no letterhead, logo or company details in the header.
    // The body carries only black text on a white background; the running
    // footer is a plain page number (drawn in the final pass).
  }

  // ---- headings -----------------------------------------------------------

  section(title, level = 0, keepFor = 150) {
    const label = level === 0 ? `${++this.sectionNo}. ${title}` : title;
    // Render first: the keep-with-next check may push the heading to the next
    // page, and the TOC must record the page the heading actually lands on.
    if (level === 0) this.sectionHeading(this.sectionNo, title, keepFor);
    else this.chapterHeading(title, keepFor);
    this.toc.push({ label, level, page: this.pageNo() });
    return label;
  }

  sectionHeading(no, title, keepFor = 150) {
    const doc = this.doc;
    // keep-with-next: heading + at least `keepFor` pt of body content on one page
    this.ensure(84 + keepFor);
    const x = MARGIN;
    const y = this.y;
    doc.roundedRect(x, y, 40, 40, 9).lineWidth(1.4).fillAndStroke('#ffffff', GREEN.dark);
    doc.font('Helvetica-Bold').fontSize(19).fillColor(GREEN.dark)
      .text(String(no), x, y + 10, { width: 40, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(GREEN.dark)
      .text(title, x + 52, y + 7, { width: this.cw - 52, height: 26, ellipsis: true });
    const tw = Math.min(doc.widthOfString(title), this.cw - 52);
    doc.rect(x + 52, y + 36, tw, 2.5).fill(GREEN.dark);
    this.y = y + 58;
  }

  chapterHeading(rawTitle, keepFor = 150) {
    const doc = this.doc;
    // keep-with-next: heading + at least `keepFor` pt of body content on one page
    this.ensure(90 + keepFor);
    const x = MARGIN;
    const y = this.y;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.light)
      .text('DETAILED CHAPTER', x, y, { characterSpacing: 1.4 });
    doc.font('Helvetica-Bold').fontSize(22).fillColor(GREEN.dark)
      .text(rawTitle, x, y + 16, { width: this.cw, height: 58 });
    const tw = Math.min(doc.widthOfString(rawTitle), this.cw);
    doc.rect(x, y + 16 + Math.min(doc.heightOfString(rawTitle, { width: this.cw }), 58) + 7, tw, 2.5).fill(GREEN.dark);
    this.y = y + 16 + Math.min(doc.heightOfString(rawTitle, { width: this.cw }), 58) + 23;
  }

  // Unnumbered heading for front-matter pages (Abstract, Acknowledgement)
  // that sit above the table of contents — same visual language as
  // sectionHeading without the number badge or section counter.
  frontHeading(title, keepFor = 150) {
    const doc = this.doc;
    this.ensure(84 + keepFor);
    const x = MARGIN;
    const y = this.y;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(GREEN.dark)
      .text(title, x, y, { width: this.cw, height: 26, ellipsis: true });
    const tw = Math.min(doc.widthOfString(title), this.cw);
    doc.rect(x, y + 36, tw, 2.5).fill(GREEN.dark);
    this.y = y + 58;
  }

  caption(text) {
    const doc = this.doc;
    doc.font('Helvetica-Bold').fontSize(9.5);
    const th = doc.heightOfString(text, { width: this.cw });
    // keep-with-next: caption must not be stranded at the page bottom
    this.ensure(th + 8 + 76);
    doc.fillColor(GREEN.mid).text(text, MARGIN, this.y, { width: this.cw });
    this.y = doc.y + 7;
  }

  // ---- body ---------------------------------------------------------------

  para(text, opts = {}) {
    const doc = this.doc;
    const size = opts.size || 11.5;
    const gap = opts.gap == null ? 11 : opts.gap;
    doc.font(opts.font || 'Helvetica').fontSize(size).fillColor(opts.color || GREEN.body);
    const th = doc.heightOfString(text, { width: this.cw, lineGap: 4, align: opts.align || 'justify' });
    this.ensure(th + gap);
    doc.text(text, MARGIN, this.y, { width: this.cw, lineGap: 4, align: opts.align || 'justify' });
    this.y = doc.y + gap;
  }

  bulletList(items, opts = {}) {
    const doc = this.doc;
    const size = opts.size || 11.5;
    const numbered = opts.numbered !== false;
    let n = 0;
    items.forEach((item) => {
      n += 1;
      const badge = numbered ? String(n) : '•';
      doc.font('Helvetica-Bold').fontSize(9.5);
      const th = doc.heightOfString(item, { width: this.cw - 38, lineGap: 3 });
      const rowH = Math.max(th + 10, 27);
      this.ensure(rowH + 4);
      const y = this.y;
      if (numbered) {
        doc.circle(MARGIN + 11, y + 11, 11).lineWidth(1.1).fillAndStroke(GREEN.pale, GREEN.mid);
        doc.fillColor(GREEN.dark).fontSize(9.5).text(badge, MARGIN, y + 6, { width: 22, align: 'center' });
      } else {
        doc.circle(MARGIN + 11, y + 11, 4).fill(GREEN.mid);
      }
      doc.font('Helvetica').fontSize(size).fillColor(GREEN.body)
        .text(item, MARGIN + 38, y + 1, { width: this.cw - 38, lineGap: 3, align: 'justify' });
      this.y = y + rowH + 4;
    });
    this.y += 4;
  }

  codeBox(box) {
    if (!box || !box.lines || !box.lines.length) return;
    const doc = this.doc;
    const lineH = 14.4;
    const capH = 23;
    let lines = box.lines.slice();
    let part = 1;
    let drawn = 0;
    while (lines.length) {
      const avail = this.bottom - this.y - 16;
      let n = Math.floor((avail - capH - 16) / lineH);
      if (n < 4) { this.addPage(); continue; }
      n = Math.min(n, lines.length);
      const chunk = lines.slice(0, n);
      lines = lines.slice(n);
      const boxH = capH + chunk.length * lineH + 14;
      const y = this.y;
      doc.save();
      doc.roundedRect(MARGIN, y, this.cw, boxH, 8).fill('#ffffff');
      const cap = box.caption + (part > 1 ? '  (cont.)' : '');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark)
        .text(cap, MARGIN + 12, y + 7, { width: this.cw - 24 });
      doc.lineWidth(0.8).strokeColor(GREEN.dark)
        .moveTo(MARGIN, y + capH).lineTo(MARGIN + this.cw, y + capH).stroke();
      let ly = y + capH + 7;
      chunk.forEach((line, i) => {
        const t = String(line);
        doc.font('Courier').fontSize(8.8).fillColor(GREEN.gray)
          .text(String(drawn + i + 1), MARGIN + 10, ly, { width: 18, align: 'right' });
        let size = 8.8;
        const availW = this.cw - 60;
        while (size > 6.8 && doc.widthOfString(t, { font: 'Courier', size }) > availW) size -= 0.4;
        doc.font('Courier').fontSize(size).fillColor(GREEN.dark)
          .text(t, MARGIN + 38, ly, { width: availW + 6, height: lineH, ellipsis: true });
        ly += lineH;
      });
      doc.restore();
      doc.roundedRect(MARGIN, y, this.cw, boxH, 8).lineWidth(1).strokeColor(GREEN.dark).stroke();
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
    const rowH = 19;
    const h = 18 + rows.length * rowH + 10;
    this.ensure(h);
    const y = this.y;
    doc.roundedRect(MARGIN, y, this.cw, h, 7).fillAndStroke('#ffffff', GREEN.stroke);
    doc.rect(MARGIN, y + 6, 5, h - 12).fill(GREEN.mid);
    let ry = y + 13;
    rows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(GREEN.dark).text(label, MARGIN + 18, ry, { width: 140 });
      doc.font('Helvetica').fontSize(10.5).fillColor(GREEN.body)
        .text(String(value == null || value === '' ? 'N/A' : value), MARGIN + 170, ry, { width: this.cw - 190, height: 15, ellipsis: true });
      ry += rowH;
    });
    this.y = y + h + 16;
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
    const periodW = 84;
    const textW = this.cw - periodW - 26;
    const headerH = 24;
    // header
    this.ensure(headerH + 34);
    let y = this.y;
    doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark).text('PERIOD', MARGIN + 8, y + 7, { width: periodW });
    doc.text('ACTIVITIES & LEARNING OUTCOMES', MARGIN + periodW + 18, y + 7, { width: textW });
    doc.lineWidth(0.8).strokeColor(GREEN.dark)
      .moveTo(MARGIN, y + headerH).lineTo(MARGIN + this.cw, y + headerH).stroke();
    y += headerH + 4;
    entries.forEach((entry, i) => {
      const period = typeof entry === 'string' ? (entry.split(':')[0] || `Part ${i + 1}`) : (entry.period || `Part ${i + 1}`);
      const text = typeof entry === 'string' ? entry : (entry.text || '');
      doc.font('Helvetica').fontSize(10.5);
      const th = doc.heightOfString(text, { width: textW, lineGap: 3 });
      const rowH = Math.max(th + 14, 34);
      if (y + rowH > this.bottom) {
        this.addPage();
        y = this.y;
        doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark).text('PERIOD', MARGIN + 8, y + 7, { width: periodW });
        doc.text('ACTIVITIES & LEARNING OUTCOMES', MARGIN + periodW + 18, y + 7, { width: textW });
        doc.lineWidth(0.8).strokeColor(GREEN.dark)
          .moveTo(MARGIN, y + headerH).lineTo(MARGIN + this.cw, y + headerH).stroke();
        y += headerH + 4;
      }
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GREEN.dark)
        .text(period, MARGIN + 8, y + 8, { width: periodW, height: rowH - 12 });
      doc.font('Helvetica').fontSize(10.5).fillColor(GREEN.body)
        .text(text, MARGIN + periodW + 18, y + 8, { width: textW, lineGap: 3, align: 'justify' });
      doc.lineWidth(0.5).strokeColor(GREEN.stroke)
        .moveTo(MARGIN, y + rowH).lineTo(MARGIN + this.cw, y + rowH).stroke();
      y += rowH;
    });
    this.y = y + 16;
  }

  modulesTable(rows) {
    const doc = this.doc;
    const headerH = 24;
    this.ensure(headerH + 40);
    let y = this.y;
    const c1 = 40, c3 = 80, c4 = 104;
    const c2 = this.cw - c1 - c3 - c4;
    doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark);
    doc.text('#', MARGIN + 8, y + 7, { width: c1 });
    doc.text('MODULE', MARGIN + c1 + 8, y + 7, { width: c2 });
    doc.text('DURATION', MARGIN + c1 + c2 + 8, y + 7, { width: c3 });
    doc.text('STATUS', MARGIN + c1 + c2 + c3 + 8, y + 7, { width: c4 });
    doc.lineWidth(0.8).strokeColor(GREEN.dark)
      .moveTo(MARGIN, y + headerH).lineTo(MARGIN + this.cw, y + headerH).stroke();
    y += headerH + 4;
    rows.forEach((row, i) => {
      doc.font('Helvetica').fontSize(10.5);
      const th = doc.heightOfString(row.title, { width: c2 - 12 });
      const rowH = Math.max(th + 12, 28);
      if (y + rowH > this.bottom) {
        this.addPage();
        y = this.y;
        // redraw the column header so rows don't continue headless
        doc.roundedRect(MARGIN, y, this.cw, headerH, 4).fill(GREEN.pale);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark);
        doc.text('#', MARGIN + 8, y + 7, { width: c1 });
        doc.text('MODULE', MARGIN + c1 + 8, y + 7, { width: c2 });
        doc.text('DURATION', MARGIN + c1 + c2 + 8, y + 7, { width: c3 });
        doc.text('STATUS', MARGIN + c1 + c2 + c3 + 8, y + 7, { width: c4 });
        doc.lineWidth(0.8).strokeColor(GREEN.dark)
          .moveTo(MARGIN, y + headerH).lineTo(MARGIN + this.cw, y + headerH).stroke();
        y += headerH + 4;
        doc.font('Helvetica').fontSize(10.5);
      }
      doc.fillColor(GREEN.mid).text(String(i + 1), MARGIN + 8, y + 7, { width: c1 });
      doc.fillColor(GREEN.body).text(row.title, MARGIN + c1 + 8, y + 7, { width: c2 - 12, height: rowH - 10 });
      doc.fillColor(GREEN.body).text(row.duration || '—', MARGIN + c1 + c2 + 8, y + 7, { width: c3 });
      const done = row.done;
      doc.roundedRect(MARGIN + c1 + c2 + c3 + 6, y + 6, 86, 16, 8).lineWidth(0.7).fillAndStroke('#ffffff', GREEN.dark);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN.dark)
        .text(done ? 'COMPLETED' : 'PENDING', MARGIN + c1 + c2 + c3 + 6, y + 9.5, { width: 86, align: 'center' });
      doc.font('Helvetica');
      doc.lineWidth(0.5).strokeColor(GREEN.stroke)
        .moveTo(MARGIN, y + rowH).lineTo(MARGIN + this.cw, y + rowH).stroke();
      y += rowH;
    });
    this.y = y + 16;
  }

  numberedCards(items) {
    const doc = this.doc;
    items.forEach((text, i) => {
      doc.font('Helvetica').fontSize(11.3);
      const th = doc.heightOfString(text, { width: this.cw - 60, lineGap: 3, align: 'justify' });
      const cardH = th + 30;
      this.ensure(cardH + 8);
      const y = this.y;
      doc.roundedRect(MARGIN, y, this.cw, cardH, 7).fillAndStroke('#ffffff', GREEN.stroke);
      doc.circle(MARGIN + 24, y + 22, 13).lineWidth(1.2).fillAndStroke('#ffffff', GREEN.dark);
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(GREEN.dark)
        .text(String(i + 1), MARGIN + 11, y + 16.5, { width: 26, align: 'center' });
      doc.font('Helvetica').fontSize(11.3).fillColor(GREEN.body)
        .text(text, MARGIN + 50, y + 14, { width: this.cw - 66, lineGap: 3, align: 'justify' });
      this.y = y + cardH + 8;
    });
    this.y += 6;
  }

  twoColList(items) {
    const doc = this.doc;
    const colW = (this.cw - 20) / 2;
    const rows = Math.ceil(items.length / 2);
    doc.font('Helvetica').fontSize(11);
    const heights = items.map((t) => doc.heightOfString(t, { width: colW - 30, lineGap: 3 }) + 10);
    let y = this.y;
    let placed = 0;
    for (let r = 0; r < rows; r++) {
      const left = items[r];
      const right = items[r + rows];
      const h = Math.max(left ? heights[r] : 0, right ? heights[r + rows] : 0, 24);
      if (y + h > this.bottom) { this.addPage(); y = this.y; }
      [left ? [MARGIN, left, r] : null, right ? [MARGIN + colW + 20, right, r + rows] : null]
        .filter(Boolean)
        .forEach(([x, text, idx]) => {
          doc.circle(x + 8, y + 10, 8).lineWidth(0.9).fillAndStroke('#ffffff', GREEN.dark);
          // Vector check mark — WinAnsi (Helvetica) has no ✓ glyph, so a
          // text ✓ would render as garbage in every viewer.
          doc.lineWidth(1.5).lineCap('round').strokeColor(GREEN.mid)
            .moveTo(x + 4.5, y + 10).lineTo(x + 7.5, y + 13).lineTo(x + 12, y + 7.5).stroke();
          doc.font('Helvetica').fontSize(11).fillColor(GREEN.body)
            .text(text, x + 26, y + 2, { width: colW - 30, lineGap: 3 });
          placed += 1;
        });
      y += h + 6;
    }
    this.y = y + 6;
  }

  signatureBlock() {
    const doc = this.doc;
    const h = 108;
    this.ensure(h + 10);
    const y = this.y;
    const half = this.cw / 2;
    doc.lineWidth(0.8).strokeColor(GREEN.dark);
    doc.moveTo(MARGIN + 30, y + 56).lineTo(MARGIN + half - 30, y + 56).stroke();
    doc.moveTo(MARGIN + half + 30, y + 56).lineTo(MARGIN + this.cw - 30, y + 56).stroke();
    doc.font('Helvetica').fontSize(10).fillColor(GREEN.gray);
    doc.text('Student Signature', MARGIN + 30, y + 62, { width: half - 60, align: 'center' });
    doc.text('Program Director', MARGIN + half + 30, y + 62, { width: half - 60, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN.dark);
    doc.text(`${this.meta.studentName}`, MARGIN + 30, y + 78, { width: half - 60, align: 'center' });
    doc.font('Helvetica').fontSize(9.5).fillColor(GREEN.gray)
      .text(`Place & Date: ______________________`, MARGIN + 30, y + 94, { width: half - 60, align: 'center' });
    // No company name or company stamp here — plain signature lines only.
    this.y = y + h;
  }
}

// ---------------------------------------------------------------------------
// Cover page — academic submission format. Follows the university template
// exactly: logo circle, orange rule, university + report title, submission
// blocks, and the signature / IPO-stamp footer. No company letterhead, logo,
// QR or disclaimer on the cover.
// ---------------------------------------------------------------------------

const COVER_ORANGE = '#E09B2E';
const COVER_NAVY = '#1F3A5F';
const COVER_GRAY = '#CCCCCC';

// Registration course value -> degree label ("ba" -> "B.A"), matching the
// options on the registration form.
const DEGREE_LABELS = {
  ba: 'B.A', bsc: 'B.Sc', bcom: 'B.Com', btech: 'B.Tech', be: 'B.E.',
  bca: 'BCA', mca: 'MCA', mtech: 'M.Tech', mba: 'MBA', ma: 'M.A',
  msc: 'M.Sc', mcom: 'M.Com',
};

// Initials for the logo circle: "Patna University" -> "PU".
function universityInitials(name) {
  const letters = String(name || '').trim().split(/[\s-]+/)
    .filter(Boolean).map((word) => word[0]).join('').toUpperCase().replace(/[^A-Z]/g, '');
  return letters.slice(0, 3) || 'UNIV';
}

// Cover assets: the student's university logo ({{UNIVERSITY_LOGO}} of the
// reference template, one file per university) and the company stamp that
// fills the {{IPO_STAMP}} box. Read lazily and cached per render process.
const LOGO_DIR = path.join(__dirname, '..', 'server', 'assets', 'universities');
const STAMP_FILE = path.join(__dirname, '..', 'server', 'assets', 'stamp.png');
const coverAssetCache = new Map();

function pngSize(buf) {
  // PNG IHDR: bytes 12..15 hold the chunk type, 16..24 the width/height.
  if (buf.length > 24 && buf.readUInt32BE(12) === 0x49484452) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  return null;
}

function coverUniversityLogo(name) {
  const slug = String(name || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug || slug === 'other') return null;
  const key = 'logo:' + slug;
  if (coverAssetCache.has(key)) return coverAssetCache.get(key);
  let out = null;
  for (const ext of ['png', 'jpg', 'jpeg']) {
    try {
      const buf = fs.readFileSync(path.join(LOGO_DIR, `${slug}.${ext}`));
      const sz = pngSize(buf);
      if (sz) { out = { buf, w: sz.w, h: sz.h }; break; }
    } catch (e) { /* no file for this university */ }
  }
  coverAssetCache.set(key, out);
  return out;
}

function coverStamp() {
  if (coverAssetCache.has('stamp')) return coverAssetCache.get('stamp');
  let out = null;
  try {
    const buf = fs.readFileSync(STAMP_FILE);
    const sz = pngSize(buf);
    if (sz) out = { buf, w: sz.w, h: sz.h };
  } catch (e) { /* no stamp asset */ }
  coverAssetCache.set('stamp', out);
  return out;
}

// Draw an image contained inside a box (aspect preserved, centred).
function drawContained(doc, img, x, y, boxW, boxH) {
  const scale = Math.min(boxW / img.w, boxH / img.h);
  const dw = img.w * scale;
  const dh = img.h * scale;
  try {
    doc.image(img.buf, x + (boxW - dw) / 2, y + (boxH - dh) / 2, { width: dw, height: dh });
  } catch (e) { /* unreadable asset — leave the box empty */ }
}

function drawCover(doc, meta) {
  const w = doc.page.width;
  const h = doc.page.height;
  const left = 55;
  const cw = w - left * 2;

  // Double page frame from the reference template: thick black outer border
  // plus a thin grey inner frame.
  doc.rect(3, 3, w - 6, h - 6).lineWidth(5).strokeColor('#000000').stroke();
  doc.rect(23, 30, w - 46, h - 60).lineWidth(0.8).strokeColor('#9A9A9A').stroke();

  // University name — "other" is a free-form registration value, so it falls
  // back to the college name for the visible line.
  const rawUni = String(meta.university || '').trim();
  const uniValid = !!rawUni && rawUni.toLowerCase() !== 'other';
  const university = uniValid ? rawUni : (meta.institution || 'University Name');

  // University logo ({{UNIVERSITY_LOGO}}): no ring around it, larger on the
  // page; falls back to the university initials when no logo file exists.
  const logoSize = 84;
  const logoTop = 44;
  const cx = w / 2;
  const cy = logoTop + logoSize / 2;
  const logo = coverUniversityLogo(uniValid ? rawUni : '');
  if (logo) {
    drawContained(doc, logo, cx - logoSize / 2, logoTop, logoSize, logoSize);
  } else {
    doc.font('Times-Bold').fontSize(18).fillColor(COVER_ORANGE)
      .text(universityInitials(uniValid ? rawUni : meta.institution), left, cy - 11, { width: cw, align: 'center' });
  }

  // Orange rule under the logo — the template uses a centred 353pt column
  // (not full width).
  const colW = 353;
  const colX = (w - colW) / 2;
  let y = logoTop + logoSize + 24;
  doc.rect(colX, y, colW, 2.5).fill(COVER_ORANGE);

  // University name + report title (centred)
  y += 14;
  doc.font('Times-Bold').fontSize(24).fillColor('#000000')
    .text(university, left, y, { width: cw, align: 'center' });
  y = doc.y + 14;

  const title = meta.programTitle || 'Internship Report';
  doc.font('Times-Bold').fontSize(21).fillColor(COVER_NAVY)
    .text(title, left, y, { width: cw, align: 'center' });
  y = doc.y + 20;

  // Fulfillment lines
  doc.font('Times-Roman').fontSize(11).fillColor('#000000');
  doc.text('Submitted in Partial Fulfillment of the Requirements', left, y, { width: cw, align: 'center' });
  y = doc.y + 5;
  doc.text('for the Award of', left, y, { width: cw, align: 'center' });
  y = doc.y + 8;

  // Degree with the major subject right after the course name
  const degree = DEGREE_LABELS[String(meta.course || '').toLowerCase()] ||
    (meta.course ? String(meta.course).toUpperCase() : '');
  const degreeLine = [degree, meta.major ? `with ${meta.major} as Major` : ''].filter(Boolean).join(' ');
  if (degreeLine) {
    doc.font('Times-Bold').fontSize(14).fillColor('#000000')
      .text(degreeLine, left, y, { width: cw, align: 'center' });
    y = doc.y + 8;
  }
  doc.font('Times-Roman').fontSize(11).fillColor('#000000')
    .text('under', left, y, { width: cw, align: 'center' });
  y = doc.y + 20;

  // Separator rule (same 353pt column as the orange rule)
  doc.lineWidth(1).strokeColor(COVER_GRAY)
    .moveTo(colX, y).lineTo(colX + colW, y).stroke();
  y += 24;

  // Submission blocks — centred so registration / roll numbers print in full
  const gold = (text) => {
    doc.font('Times-Bold').fontSize(12).fillColor(COVER_ORANGE)
      .text(text, left, y, { width: cw, align: 'center', characterSpacing: 1 });
    y = doc.y + 7;
  };
  const bodyLine = (text, opts = {}) => {
    doc.font(opts.bold ? 'Times-Bold' : 'Times-Roman').fontSize(opts.size || 11).fillColor('#000000')
      .text(text, left, y, { width: cw, align: 'center' });
    y = doc.y + (opts.gap == null ? 5 : opts.gap);
  };

  gold('SUBMITTED TO');
  if (meta.major) bodyLine(`The Department of ${meta.major}`);
  bodyLine(meta.institution || 'College Name', { gap: 44 });

  gold('SUBMITTED BY');
  bodyLine(meta.studentName, { bold: true, size: 14, gap: 7 });
  bodyLine(`Semester: 5 | Programme: ${meta.programTitle || '—'}`);
  bodyLine(`University Registration No.: ${meta.regNo || '—'}`);
  bodyLine(`University Roll No.: ${meta.rollNo || '—'}`);
  bodyLine(`Academic Session: ${meta.session || '—'}`);

  // Signature footer (reference layout): two short signature rules at the
  // bottom with labels above them; the company stamp ({{IPO_STAMP}}) sits
  // larger and unboxed above the right label.
  const lineY = 766;
  const lineW = 112;
  const leftAxis = w / 2 - 150;
  const rightAxis = w / 2 + 150;
  doc.lineWidth(0.9).strokeColor('#000000');
  doc.moveTo(leftAxis - lineW / 2, lineY).lineTo(leftAxis + lineW / 2, lineY).stroke();
  doc.moveTo(rightAxis - lineW / 2, lineY).lineTo(rightAxis + lineW / 2, lineY).stroke();

  doc.font('Times-Roman').fontSize(10.5).fillColor('#000000');
  doc.text('Signature of Student', leftAxis - 65, 748, { width: 130, align: 'center' });
  doc.text('Seal & Signature of IPO', rightAxis - 65, 748, { width: 130, align: 'center' });

  // {{IPO_STAMP}} — company stamp, larger, no box around it
  const stampSize = 76;
  const stamp = coverStamp();
  if (stamp) drawContained(doc, stamp, rightAxis - stampSize / 2, 664, stampSize, stampSize);
}

// ---------------------------------------------------------------------------
// Table of contents (drawn on the reserved page after cover + front matter,
// once the body content has been rendered)
// ---------------------------------------------------------------------------

function drawToc(doc, toc) {
  const w = doc.page.width;
  doc.font('Helvetica-Bold').fontSize(26).fillColor(GREEN.dark)
    .text('TABLE OF CONTENTS', MARGIN, 58, { width: w - MARGIN * 2 });
  const tw = doc.widthOfString('TABLE OF CONTENTS');
  doc.rect(MARGIN, doc.y + 8, tw, 3).fill(GREEN.dark);

  let y = doc.y + 38;
  toc.forEach((entry) => {
    const indent = entry.level * 28;
    const size = entry.level ? 11 : 13;
    const font = entry.level ? 'Helvetica' : 'Helvetica-Bold';
    if (y > doc.page.height - 80) return;
    doc.font(font).fontSize(size).fillColor(entry.level ? GREEN.body : GREEN.dark)
      .text(entry.label, MARGIN + indent, y, { width: 355 - indent, height: 17, ellipsis: true });
    const labelW = doc.widthOfString(entry.label);
    const pageStr = String(entry.page);
    doc.font('Helvetica-Bold').fontSize(size);
    const pageW = doc.widthOfString(pageStr);
    const dotsX = MARGIN + indent + Math.min(labelW + 8, 345 - indent);
    const pageX = w - MARGIN - pageW;
    if (pageX > dotsX + 6) {
      doc.save().dash(1.5, { space: 3 }).lineWidth(0.8).strokeColor(GREEN.stroke)
        .moveTo(dotsX, y + size * 0.55).lineTo(pageX - 6, y + size * 0.55).stroke().undash();
      doc.restore();
    }
    doc.fillColor(GREEN.mid)
      .text(pageStr, w - MARGIN - 44, y, { width: 44, align: 'right' });
    y += entry.level ? 22 : 28;
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
  // keepFor 215: the info card below the heading is ~200pt tall
  r.section('Student Performance Summary', 0, 215);
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
    { label: 'Passing Mark', value: 80, color: '#999999' },
  ];
  if (avgScore != null) bars.push({ label: 'Program Average', value: Math.round(avgScore), color: '#666666' });

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
      r.para(`Key topics covered: ${topics.join(', ')}.`, { size: 11, color: GREEN.mid, align: 'left', gap: 9 });
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
    // keepFor 210: first block is a chart of ~200pt (40 + n*26)
    r.section('Skill Development & Milestones', 0, 210);
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
  r.para(`Project Title: ${content.project.title}`, { font: 'Helvetica-Bold', size: 12.5, color: GREEN.dark, align: 'left' });
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
  r.para('Declaration: The work recorded in this report was carried out during the internship period stated above. The details, charts and observations presented are a true record of the activities completed under the supervision of the program mentors.', { size: 11, color: GREEN.gray, gap: 8 });
  r.signatureBlock();
}

function renderReferences(r, content) {
  if (!content.references || !content.references.length) return;
  r.section('References');
  r.bulletList(content.references);
}

// ---------------------------------------------------------------------------
// Front matter — Abstract & Acknowledgement pages rendered ABOVE the table of
// contents (report order: cover → abstract → acknowledgement → TOC → body).
// Text supplied verbatim by the institute; static across reports.
// ---------------------------------------------------------------------------

const FRONT_MATTER = [
  {
    title: 'Abstract',
    paragraphs: [
      'This internship report presents the knowledge, practical learning, and skills acquired during the 120-hour Healthcare Internship completed through IQIntern (iqintern.in). The main objective of this internship was to develop an understanding of the healthcare sector, healthcare practices, patient care, health management, and professional responsibilities.',
      'During the internship, various aspects of healthcare were studied, including healthcare systems, healthcare management, patient care practices, health awareness, medical ethics, communication skills, and the importance of preventive healthcare. Through training sessions, practical activities, case studies, and learning exercises, I gained valuable insights into the functioning of the healthcare sector and the role of healthcare professionals.',
      'This report includes the organization profile, internship objectives, literature review, methodology, data analysis and findings, challenges and solutions, impact and contribution, conclusion, and recommendations based on the learning experience gained during the internship.',
      'The internship helped improve my understanding of healthcare operations, patient-centered care, teamwork, communication, problem-solving ability, and professional ethics. It also enhanced my awareness of the importance of healthcare services in improving the quality of life and promoting community well-being.',
      'Overall, the Healthcare Internship was a valuable learning experience that provided both theoretical knowledge and practical understanding of the healthcare field. The skills and knowledge gained during this internship will support my future academic studies and professional growth in the healthcare sector.',
    ],
  },
  {
    title: 'Acknowledgement',
    paragraphs: [
      'I would like to express my sincere gratitude to IQIntern (iqintern.in) for providing me with the opportunity to complete a 120-hour Healthcare Internship. This internship has been an enriching learning experience that helped me gain valuable knowledge about the healthcare sector, professional practices, patient care concepts, and healthcare management.',
      'I am deeply thankful to the mentors and trainers of IQIntern for their continuous guidance, support, and encouragement throughout the internship. Their valuable insights helped me understand various aspects of healthcare, including healthcare systems, medical practices, health awareness, patient management, communication skills, and professional ethics.',
      'I would also like to extend my sincere appreciation to my teachers and institution for their motivation, academic support, and encouragement, which helped me successfully complete this internship and prepare this report.',
      'I am grateful to my parents, family members, and friends for their constant support, encouragement, and motivation throughout this learning journey.',
      'Finally, I would like to thank everyone who contributed directly or indirectly to the successful completion of my Healthcare Internship and this internship report. The knowledge, experience, and skills gained during this internship will be highly beneficial for my future academic growth, professional development, and career in the healthcare field.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function streamReportInline(res, payload) {
  const { content, enrollment, reportNo, filename } = payload;
  const PDFDocument = require('pdfkit');
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
  // Private browser-cache window (see startPdf in routes/documents.js).
  res.setHeader('Cache-Control', 'private, max-age=120');
  doc.pipe(res);

  try {
    const r = new Report(doc, payload.meta);
    drawCover(doc, payload.meta);

    // Front matter above the table of contents: Abstract, then Acknowledgement.
    // Rendered through the Report engine so each page gets the standard page
    // chrome, footer, and an unnumbered TOC entry pointing at its page.
    FRONT_MATTER.forEach((fm) => {
      r.addPage();
      r.frontHeading(fm.title);
      r.toc.push({ label: fm.title, level: 0, page: r.pageNo() });
      fm.paragraphs.forEach((p) => r.para(p));
    });

    // Next page is reserved for the table of contents (filled at the end).
    // Capture its index now — later page breaks can never shift it.
    doc.addPage();
    const tocPageIndex = doc.bufferedPageRange().count - 1;
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
    if (tocPageIndex < range.start + total) {
      doc.switchToPage(tocPageIndex);
      drawToc(doc, r.toc);
    }
    for (let i = range.start; i < range.start + total; i++) {
      doc.switchToPage(i);
      if (i === range.start) continue; // cover has no footer
      const w = doc.page.width;
      const h = doc.page.height;
      // Plain page number only — no company footer text or disclaimer.
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
        .text(`Page ${i - range.start + 1} of ${total}`, 0, h - 40, { width: w, align: 'center' });
    }
  } catch (err) {
    console.error('Report generation failed:', err);
  }

  doc.end();
}

// Static reference so serverless bundlers (which trace require() calls, not
// path computations inside new Worker) always ship the worker file.
require('./reportWorker.js');

// Renders the report on a worker thread so the synchronous pdfkit work (a
// 20-40 page document is hundreds of ms of CPU) can't stall the main event
// loop — while a report renders, every other request used to queue behind it.
// Falls back to inline rendering if the worker is unavailable or dies before
// any bytes were produced (PDF_WORKER=off disables the offload entirely).
async function streamReport(res, payload) {
  // The only async DB access in the render path — fetched on the main thread
  // so the worker stays pure-CPU.
  if (!payload.dbModules) {
    payload.dbModules = await db.all(
      'SELECT * FROM learning_modules WHERE internshipId = ? ORDER BY moduleOrder',
      payload.enrollment.internshipId
    );
  }

  if (process.env.PDF_WORKER === 'off') {
    return streamReportInline(res, payload);
  }

  const state = { started: false };
  try {
    await streamReportInWorker(res, payload, state);
  } catch (err) {
    if (state.started) {
      // Headers + partial bytes already went out — cannot retry inline.
      console.error('Report worker failed mid-stream:', err.message);
      try { res.end(); } catch (_) { /* already closed */ }
      return;
    }
    console.error('Report worker unavailable, rendering inline:', err.message);
    return streamReportInline(res, payload);
  }
}

function streamReportInWorker(res, payload, state) {
  const { Worker } = require('worker_threads');
  const { getBrandState } = require('./documentBrand');
  const path = require('path');
  const workerPath = path.join(__dirname, 'reportWorker.js');

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };
    const fail = (err) => {
      worker.terminate().catch(() => {});
      finish(reject, err);
    };

    let worker;
    try {
      worker = new Worker(workerPath, { workerData: { payload, brand: getBrandState() } });
    } catch (err) {
      return reject(err);
    }

    worker.on('message', (msg) => {
      if (msg.type === 'chunk') {
        state.started = true;
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=${payload.filename}`);
          // Private browser-cache window (see startPdf in routes/documents.js).
          res.setHeader('Cache-Control', 'private, max-age=120');
        }
        res.write(Buffer.from(msg.data));
      } else if (msg.type === 'done') {
        res.end();
        worker.terminate().catch(() => {});
        finish(resolve);
      } else if (msg.type === 'error') {
        fail(new Error(msg.message || 'report worker error'));
      }
    });
    worker.on('error', fail);
    worker.on('exit', (code) => {
      if (!settled) fail(new Error(`report worker exited unexpectedly (code ${code})`));
    });
  });
}

module.exports = { streamReport, streamReportInline };
