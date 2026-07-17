#!/usr/bin/env node
// index.js — one run of the My Tasks system.
//
// Usage:
//   node index.js                 # sync mirror + write local day-end report (safe)
//   node index.js --report        # same, and print the report to stdout
//   node index.js --commit        # ALSO write status back to source boards
//                                  #   (only for boards mapped in config.writeBack)
//   node index.js --post <itemId> # also post the report as a monday update
//
// Read-only against shared boards unless --commit. Mirrors into your private
// board (config.targetBoardId).
const { gql } = require('./monday');
const cfg = require('./config');
const { resolveMe, fetchAssignedItems, fetchMirrored } = require('./sync');
const { pushDone } = require('./writeback');
const { buildReport, writeLocal, postToMonday, today, isDone } = require('./report');

// Map a source item to a "Progress" label on the mirror board.
// Done wins; otherwise an open item with a past due date is Overdue.
function mirrorLabel(item) {
  const L = cfg.targetStatusLabels;
  if (isDone(item.status)) return L.done;
  if (item.due && new Date(item.due) < new Date(today())) return L.overdue;
  return L.open;
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const commit = has('--commit');
// --post <id> uses an explicit item; --post with no id (or --post-report) falls
// back to config.reportAnchorItemId. --no-post disables posting entirely.
const postIdx = args.indexOf('--post');
let anchorItemId = null;
if (!has('--no-post')) {
  if (postIdx >= 0 && args[postIdx + 1] && !args[postIdx + 1].startsWith('--')) {
    anchorItemId = args[postIdx + 1];
  } else if (has('--post') || has('--post-report')) {
    anchorItemId = cfg.reportAnchorItemId || null;
  }
}

// upsert one source item into the private board
async function upsertMirror(item, mirrored) {
  const c = cfg.targetColumns;
  const colVals = {
    [c.sourceStatus]: item.status || '',
    [c.sourceBoard]: item.boardName || '',
    [c.sourceItemId]: String(item.sourceItemId),
    [c.sourceLink]: { url: item.link, text: 'open' },
    [c.lastSynced]: new Date().toISOString(),
    [cfg.targetStatusColumnId]: { label: mirrorLabel(item) },
  };
  if (item.due) colVals[c.due] = { date: item.due };

  const existing = mirrored.get(String(item.sourceItemId));
  if (existing) {
    await gql(
      `mutation ($board:ID!, $item:ID!, $vals:JSON!) {
         change_multiple_column_values (board_id:$board, item_id:$item, column_values:$vals) { id }
       }`,
      { board: cfg.targetBoardId, item: existing.id, vals: JSON.stringify(colVals) }
    );
    return 'updated';
  }
  await gql(
    `mutation ($board:ID!, $name:String!, $vals:JSON!) {
       create_item (board_id:$board, item_name:$name, column_values:$vals) { id }
     }`,
    { board: cfg.targetBoardId, name: item.name, vals: JSON.stringify(colVals) }
  );
  return 'created';
}

async function main() {
  const myId = await resolveMe();
  console.log(`[my-tasks] user id ${myId} — scanning boards…`);

  const items = await fetchAssignedItems(myId);
  console.log(`[my-tasks] found ${items.length} tasks assigned to me`);

  const mirrored = await fetchMirrored();
  let created = 0, updated = 0;
  for (const it of items) {
    const r = await upsertMirror(it, mirrored);
    r === 'created' ? created++ : updated++;
  }
  console.log(`[my-tasks] mirror: ${created} created, ${updated} updated`);

  // optional write-back
  if (commit) {
    let wrote = 0, skipped = 0;
    for (const it of items.filter((i) => isDone(i.status))) {
      const r = await pushDone(it, { commit: true });
      r.wrote ? wrote++ : skipped++;
    }
    console.log(`[my-tasks] write-back: ${wrote} written, ${skipped} skipped (unmapped boards)`);
  }

  // day-end report
  const report = buildReport(items);
  const file = writeLocal(report);
  console.log(`[my-tasks] report -> ${file}`);
  if (has('--report')) console.log('\n' + report.text + '\n');
  if (anchorItemId) {
    const r = await postToMonday(report, anchorItemId);
    console.log(`[my-tasks] post to monday: ${JSON.stringify(r)}`);
  }

  console.log(`[my-tasks] done for ${today()} — ${report.stats.done}/${report.stats.total} done, ${report.stats.overdue} overdue`);
}

main().catch((e) => { console.error('[my-tasks] FAILED:', e.message); process.exit(1); });
