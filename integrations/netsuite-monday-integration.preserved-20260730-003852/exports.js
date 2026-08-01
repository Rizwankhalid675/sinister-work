// PDF + XLSX export of the "Open Outside Processing POs" data.
// Reuses the same de-duped rows the board sync produces (via
// flows/openProcessingPOsToMonday.fetchDesired) — no second NetSuite query.
require('./env');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const REPORT_TITLE = 'Open Outside Processing POs';
const OUT_DIR = path.join(__dirname, 'reports');

// Column order: Item Name far-left (per Mark), then the rest of the report cols.
const COLUMNS = [
  { header: 'Item Name',    get: (d) => d.fields.itemName },
  { header: 'PO #',         get: (d) => d.fields.po },
  { header: 'Display Name', get: (d) => d.displayName },
  { header: 'Date Created', get: (d) => d.fields.dateCreated || '' },
  { header: 'Qty Open',     get: (d) => d.fields.qtyOpen },
  { header: 'Vendor',       get: (d) => d.fields.vendor },
];

const COLORS = { ink: '#1c1f26', muted: '#6b6459', rule: '#ddd8cd', head: '#3d6b52' };

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Sort like the report: by PO #, then item name.
function sortRows(desired) {
  return [...desired].sort(
    (a, b) =>
      String(a.fields.po).localeCompare(String(b.fields.po), undefined, { numeric: true }) ||
      String(a.fields.itemName).localeCompare(String(b.fields.itemName))
  );
}

function writeXlsx(desired, stamp) {
  const rows = sortRows(desired);
  const aoa = [COLUMNS.map((c) => c.header)];
  for (const d of rows) aoa.push(COLUMNS.map((c) => c.get(d)));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Widths in COLUMNS order: Item Name, PO #, Display Name, Date, Qty, Vendor.
  ws['!cols'] = [
    { wch: 28 }, { wch: 10 }, { wch: 46 }, { wch: 13 }, { wch: 10 }, { wch: 38 },
  ];
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: COLUMNS.length - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Open OP POs');

  const file = path.join(OUT_DIR, `open-outside-processing-pos_${stamp}.xlsx`);
  XLSX.writeFile(wb, file);
  return file;
}

function writePdf(desired, stamp) {
  const rows = sortRows(desired);
  const file = path.join(OUT_DIR, `open-outside-processing-pos_${stamp}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const stream = fs.createWriteStream(file);
    doc.pipe(stream);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const totalQty = rows.reduce((s, d) => s + (Number(d.fields.qtyOpen) || 0), 0);

    // Header
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.ink).text(REPORT_TITLE, left, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
      .text(`Generated ${new Date().toLocaleString()}  ·  ${rows.length} open PO lines  ·  ${totalQty} units open`, left, doc.y);
    doc.moveDown(0.6);
    doc.strokeColor(COLORS.rule).lineWidth(1).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(0.5);

    // Column x-positions (landscape A4 ~ 770pt usable). Order matches COLUMNS:
    // Item Name, PO #, Display Name, Date Created, Qty Open, Vendor.
    const widths = [150, 55, 230, 70, 55, 175];
    const xs = [];
    let x = left;
    for (const w of widths) { xs.push(x); x += w; }

    function drawRow(cells, { bold = false, fill = null } = {}) {
      const y = doc.y;
      const rowH = 16;
      if (fill) doc.rect(left, y - 2, right - left, rowH).fill(fill);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(COLORS.ink);
      cells.forEach((c, i) => {
        doc.text(String(c ?? ''), xs[i] + 2, y + 2, { width: widths[i] - 4, ellipsis: true, lineBreak: false });
      });
      doc.y = y + rowH;
    }

    function drawHead() {
      drawRow(COLUMNS.map((c) => c.header), { bold: true, fill: '#eef2ee' });
      doc.strokeColor(COLORS.rule).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    }

    drawHead();
    for (const d of rows) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        drawHead();
      }
      drawRow(COLUMNS.map((c) => c.get(d)));
    }

    doc.end();
    stream.on('finish', () => resolve(file));
    stream.on('error', reject);
  });
}

// Generate both files from an already-fetched `desired` list.
async function generate(desired, { stamp = timestamp() } = {}) {
  ensureOutDir();
  const xlsx = writeXlsx(desired, stamp);
  const pdf = await writePdf(desired, stamp);
  return { xlsx, pdf };
}

module.exports = { generate, OUT_DIR };
