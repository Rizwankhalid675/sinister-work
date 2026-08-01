// writeback.js — OPTIONAL push of status from the private board back onto
// source boards. Runs ONLY when --commit is passed AND config.writeBack has an
// entry for that source board. No mapping = skipped (guardrail). This is the
// only path that ever mutates a shared board, so it is deliberately narrow.
const { gql } = require('./monday');
const cfg = require('./config');

// Change a source item's status to its configured "done" label.
async function pushDone(item, { commit }) {
  const map = cfg.writeBack[String(item.boardId)];
  if (!map) return { skipped: 'no writeBack mapping for board ' + item.boardId };
  if (!commit) return { skipped: 'dry-run (pass --commit to write)' };

  await gql(
    `mutation ($board:ID!, $item:ID!, $col:String!, $val:JSON!) {
       change_column_value (board_id:$board, item_id:$item, column_id:$col, value:$val) { id }
     }`,
    {
      board: item.boardId,
      item: item.sourceItemId,
      col: map.statusColumnId,
      val: JSON.stringify({ label: map.doneLabel }),
    }
  );
  return { wrote: `${map.statusColumnId}=${map.doneLabel}` };
}

module.exports = { pushDone };
