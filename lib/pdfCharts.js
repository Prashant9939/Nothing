// Pure-pdfkit chart & diagram primitives for the internship report.
// No external deps — all vector drawing in a plain black/white palette.

const PALETTE = ['#000000', '#333333', '#555555', '#777777', '#999999', '#BBBBBB', '#444444', '#666666'];
const AXIS = '#999999';
const LABEL = '#000000';
const INK = '#000000';

// Vertical bar chart. data: [{ label, value }]. Returns bottom y.
function drawBarChart(doc, x, y, w, h, data, opts = {}) {
  if (!data || !data.length) return y;
  const padL = 34;
  const padB = opts.labelHeight || 34;
  const padT = 18;
  const plotX = x + padL;
  const plotW = w - padL - 6;
  const plotH = h - padB - padT;
  const max = opts.max || Math.max(...data.map(d => d.value)) * 1.15 || 1;

  doc.save();
  // gridlines + y labels
  doc.font('Helvetica').fontSize(7).fillColor(LABEL);
  for (let i = 0; i <= 4; i++) {
    const gy = y + padT + plotH - (plotH * i) / 4;
    doc.lineWidth(0.5).strokeColor(AXIS).moveTo(plotX, gy).lineTo(x + w, gy).stroke();
    doc.text(String(Math.round((max * i) / 4)), x, gy - 4.5, { width: padL - 6, align: 'right' });
  }
  const slot = plotW / data.length;
  const barW = Math.min(opts.barWidth || 46, slot * 0.6);
  data.forEach((d, i) => {
    const bh = max > 0 ? (d.value / max) * plotH : 0;
    const bx = plotX + slot * i + (slot - barW) / 2;
    const by = y + padT + plotH - bh;
    const color = d.color || PALETTE[i % PALETTE.length];
    if (bh > 0.5) {
      doc.roundedRect(bx, by, barW, Math.max(bh, 2), 3).fill(color);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK)
        .text(String(d.value), bx - 6, by - 11, { width: barW + 12, align: 'center' });
    }
    doc.font('Helvetica').fontSize(7).fillColor(LABEL)
      .text(d.label, bx - 8, y + padT + plotH + 6, { width: barW + 16, align: 'center', height: padB - 8 });
  });
  // axis
  doc.lineWidth(1).strokeColor(AXIS)
    .moveTo(plotX, y + padT).lineTo(plotX, y + padT + plotH).lineTo(x + w, y + padT + plotH).stroke();
  doc.restore();
  return y + h;
}

// Pie chart with legend. data: [{ label, value }]. Center at (cx, cy).
// Returns bottom y of the whole block (chart + legend).
function drawPieChart(doc, cx, cy, r, data, opts = {}) {
  const items = (data || []).filter(d => d.value > 0);
  if (!items.length) return cy + r;
  const total = items.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;
  doc.save();
  items.forEach((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const color = d.color || PALETTE[i % PALETTE.length];
    doc.moveTo(cx, cy);
    const steps = Math.max(8, Math.ceil((sweep / (Math.PI * 2)) * 90));
    for (let s = 0; s <= steps; s++) {
      const a = angle + (sweep * s) / steps;
      doc.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    doc.closePath().lineWidth(1.5).fillAndStroke(color, '#ffffff');
    angle += sweep;
  });
  // donut hole for a modern look
  if (opts.donut !== false) {
    doc.circle(cx, cy, r * 0.52).fill('#ffffff');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000')
      .text(opts.centerLabel || '', cx - r * 0.5, cy - 6, { width: r, align: 'center' });
  }
  doc.restore();

  // legend on the right
  const lx = cx + r + 18;
  let ly = cy - (items.length * 15) / 2;
  doc.font('Helvetica').fontSize(8);
  items.forEach((d, i) => {
    const color = d.color || PALETTE[i % PALETTE.length];
    doc.roundedRect(lx, ly + 1, 9, 9, 2).fill(color);
    const pct = total ? Math.round((d.value / total) * 100) : 0;
    doc.fillColor(INK).text(`${d.label} — ${pct}%`, lx + 14, ly, { width: 160 });
    ly += 15;
  });
  return Math.max(cy + r, ly + 4);
}

// Line chart with area fill. labels: string[], values: number[]. Returns bottom y.
function drawLineChart(doc, x, y, w, h, labels, values, opts = {}) {
  if (!values || values.length < 2) return y;
  const padL = 34;
  const padB = 26;
  const padT = 14;
  const plotX = x + padL;
  const plotW = w - padL - 8;
  const plotH = h - padB - padT;
  const max = opts.max || Math.max(...values) * 1.1 || 1;
  const min = opts.min || 0;

  doc.save();
  doc.font('Helvetica').fontSize(7).fillColor(LABEL);
  for (let i = 0; i <= 4; i++) {
    const gy = y + padT + plotH - (plotH * i) / 4;
    doc.lineWidth(0.5).strokeColor(AXIS).moveTo(plotX, gy).lineTo(x + w, gy).stroke();
    doc.text(String(Math.round(min + ((max - min) * i) / 4)), x, gy - 4.5, { width: padL - 6, align: 'right' });
  }
  const px = (i) => plotX + (plotW * i) / (values.length - 1);
  const py = (v) => y + padT + plotH - ((v - min) / (max - min || 1)) * plotH;

  // area under the line
  doc.save().fillColor(opts.areaColor || '#DDDDDD').fillOpacity(0.35);
  doc.moveTo(px(0), y + padT + plotH);
  values.forEach((v, i) => doc.lineTo(px(i), py(v)));
  doc.lineTo(px(values.length - 1), y + padT + plotH).closePath().fill();
  doc.restore();

  // line
  doc.lineWidth(2).strokeColor(opts.lineColor || '#000000');
  doc.moveTo(px(0), py(values[0]));
  values.forEach((v, i) => { if (i) doc.lineTo(px(i), py(v)); });
  doc.stroke();

  // dots + x labels
  values.forEach((v, i) => {
    doc.circle(px(i), py(v), 3).lineWidth(1.2).fillAndStroke('#000000', '#ffffff');
    if (labels && labels[i]) {
      doc.font('Helvetica').fontSize(6.5).fillColor(LABEL)
        .text(labels[i], px(i) - 22, y + padT + plotH + 6, { width: 44, align: 'center' });
    }
  });
  doc.lineWidth(1).strokeColor(AXIS)
    .moveTo(plotX, y + padT).lineTo(plotX, y + padT + plotH).lineTo(x + w, y + padT + plotH).stroke();
  doc.restore();
  return y + h;
}

// Horizontal skill/progress bars. data: [{ label, value(0-100) }]. Returns bottom y.
function drawSkillBars(doc, x, y, w, data, opts = {}) {
  const rowH = opts.rowH || 24;
  doc.save();
  (data || []).forEach((d, i) => {
    const ry = y + i * rowH;
    const barX = x + (opts.labelW || 150);
    const barW = w - (opts.labelW || 150) - 44;
    doc.font('Helvetica').fontSize(8.5).fillColor('#000000')
      .text(d.label, x, ry + 1, { width: (opts.labelW || 150) - 8 });
    doc.roundedRect(barX, ry + 2, barW, 11, 5.5).fill('#EEEEEE');
    const fw = barW * Math.min(Math.max(d.value, 0), 100) / 100;
    if (fw > 1) {
      const color = d.color || PALETTE[i % PALETTE.length];
      doc.roundedRect(barX, ry + 2, Math.max(fw, 11), 11, 5.5).fill(color);
    }
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000')
      .text(`${d.value}%`, barX + barW + 6, ry + 2, { width: 40 });
  });
  doc.restore();
  return y + (data || []).length * rowH;
}

// Vertical flow diagram (boxes + arrows). steps: string[] (option {sub} objects).
// Returns bottom y.
function drawFlowDiagram(doc, x, y, w, steps, opts = {}) {
  const boxH = opts.boxH || 34;
  const gap = opts.gap || 16;
  let cy = y;
  doc.save();
  steps.forEach((step, i) => {
    const title = typeof step === 'string' ? step : step.title;
    const sub = typeof step === 'string' ? '' : step.sub || '';
    const color = (opts.colors && opts.colors[i % opts.colors.length]) || PALETTE[i % 4];
    doc.roundedRect(x, cy, w, boxH, 7).lineWidth(1.1).fillAndStroke('#ffffff', color);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
      .text(title, x + 10, cy + (sub ? 7 : boxH / 2 - 5), { width: w - 20, align: 'center' });
    if (sub) {
      doc.font('Helvetica').fontSize(7).fillColor('#000000')
        .text(sub, x + 10, cy + 19, { width: w - 20, align: 'center' });
    }
    if (i < steps.length - 1) {
      const ax = x + w / 2;
      const ay = cy + boxH;
      doc.lineWidth(1.6).strokeColor(color).moveTo(ax, ay + 2).lineTo(ax, ay + gap - 6).stroke();
      doc.polygon([ax - 4.5, ay + gap - 6], [ax + 4.5, ay + gap - 6], [ax, ay + gap - 1]).fill(color);
    }
    cy += boxH + gap;
  });
  doc.restore();
  return cy - gap;
}

// Horizontal funnel: decreasing centered bars. stages: [{ label, value }]. Returns bottom y.
function drawFunnel(doc, x, y, w, stages, opts = {}) {
  const rowH = opts.rowH || 30;
  const gap = 6;
  let cy = y;
  const maxV = Math.max(...(stages || []).map(s => s.value), 1);
  doc.save();
  (stages || []).forEach((s, i) => {
    const bw = Math.max((s.value / maxV) * w, 90);
    const bx = x + (w - bw) / 2;
    const color = PALETTE[i % PALETTE.length];
    doc.roundedRect(bx, cy, bw, rowH, 6).lineWidth(1.1).fillAndStroke('#ffffff', color);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000')
      .text(`${s.label}  ·  ${s.value}`, bx + 8, cy + rowH / 2 - 5, { width: bw - 16, align: 'center' });
    cy += rowH + gap;
  });
  doc.restore();
  return cy - gap;
}

// Lighten/darken a hex color by factor (-1..1).
function shade(hex, factor) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (factor > 0 ? (255 - c) * factor : c * factor))));
  const r = adj((n >> 16) & 255);
  const g = adj((n >> 8) & 255);
  const b = adj(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

module.exports = {
  PALETTE,
  drawBarChart,
  drawPieChart,
  drawLineChart,
  drawSkillBars,
  drawFlowDiagram,
  drawFunnel,
  shade,
};
