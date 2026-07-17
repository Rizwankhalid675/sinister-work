// report.js — build a day-end report from mirrored items and write it locally
// (dated file under reports/) and optionally post it as an update on the
// private board. Posting an update to your own private board mutates nothing
// shared, so it is safe to run by default.
const fs = require('fs');
const path = require('path');
const { gql } = require('./monday');
const cfg = require('./config');

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isDone(statusText) {
  if (!statusText) return false;
  const s = statusText.toLowerCase();
  return ['done', 'complete', 'approved'].some((w) => s.includes(w));
}

// items: array of { name, boardName, status, due, link }
function buildReport(items) {
  const date = today();
  const done = items.filter((i) => isDone(i.status));
  const open = items.filter((i) => !isDone(i.status));
  const overdue = open.filter((i) => i.due && i.due < date);

  const L = [];
  L.push(`# Day-End Report — ${date}`);
  L.push('');
  L.push(`Assigned to me: **${items.length}**  |  Done: **${done.length}**  |  Open: **${open.length}**  |  Overdue: **${overdue.length}**`);
  L.push('');
  L.push(`## Completed today / done (${done.length})`);
  done.forEach((i) => L.push(`- [x] ${i.name}  _(${i.boardName})_ — ${i.status}`));
  L.push('');
  L.push(`## Still open (${open.length})`);
  open.forEach((i) => {
    const flag = i.due && i.due < date ? '  ⚠️ OVERDUE' : '';
    L.push(`- [ ] ${i.name}  _(${i.boardName})_ — ${i.status || 'no status'}${i.due ? ` — due ${i.due}` : ''}${flag}`);
  });
  L.push('');
  L.push(`### Where you stand`);
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
  L.push(`${pct}% of your assigned work is done. ${overdue.length ? `${overdue.length} item(s) are past due — prioritize those.` : 'Nothing overdue. 🎉'}`);
  return { date, text: L.join('\n'), stats: { total: items.length, done: done.length, open: open.length, overdue: overdue.length } };
}

function writeLocal(report) {
  const dir = path.join(__dirname, cfg.reportsDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `day-end-${report.date}.md`);
  fs.writeFileSync(file, report.text, 'utf8');
  return file;
}

// Post the report as an update on the private board itself (first item, or a
// dedicated "Day-End Reports" anchor). Simplest: post to the board via a
// self-item. Here we attach as an update on the board's first mirrored item is
// wrong; instead we create/append a text on a pinned report item.
async function postToMonday(report, anchorItemId) {
  if (!anchorItemId) return { skipped: 'no anchor item id given' };
  await gql(
    `mutation ($item:ID!, $body:String!) {
       create_update (item_id:$item, body:$body) { id }
     }`,
    { item: anchorItemId, body: report.text }
  );
  return { posted: true };
}

module.exports = { buildReport, writeLocal, postToMonday, today, isDone };
