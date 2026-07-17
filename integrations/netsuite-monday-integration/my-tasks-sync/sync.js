// sync.js — mirror the token owner's assigned tasks into the private board.
//
// Read-only against source boards. Writes ONLY to the private target board,
// except optional write-back which is gated behind --commit AND a per-board
// entry in config.writeBack (see config.js). Default run touches nothing shared.
const { gql } = require('./monday');
const cfg = require('./config');

// --- resolve who "me" is -------------------------------------------------
async function resolveMe() {
  if (cfg.userId) return String(cfg.userId);
  const d = await gql(`query { me { id name } }`);
  return String(d.me.id);
}

// --- find all tasks assigned to me across every board I can see ----------
// monday has no global "assigned to me" query, so we page boards and read the
// people columns. We match the user id against people column values.
async function fetchAssignedItems(myId) {
  const found = [];
  let page = 1;
  for (;;) {
    const d = await gql(
      `query ($page:Int!) {
         boards (limit: 25, page: $page, state: active) {
           id name
           columns { id title type }
           items_page (limit: 100) {
             items {
               id name
               column_values { id type text value }
             }
           }
         }
       }`,
      { page }
    );
    const boards = d.boards || [];
    if (boards.length === 0) break;

    for (const b of boards) {
      const peopleCols = b.columns.filter((c) => c.type === 'people').map((c) => c.id);
      if (peopleCols.length === 0) continue;
      const statusCols = b.columns.filter((c) => c.type === 'status');
      const dateCols = b.columns.filter((c) => c.type === 'date');

      for (const it of b.items_page.items) {
        const assignedToMe = it.column_values.some((cv) => {
          if (!peopleCols.includes(cv.id) || !cv.value) return false;
          try {
            const persons = JSON.parse(cv.value).personsAndTeams || [];
            return persons.some((p) => String(p.id) === myId && p.kind === 'person');
          } catch { return false; }
        });
        if (!assignedToMe) continue;

        const statusText = statusCols
          .map((c) => (it.column_values.find((cv) => cv.id === c.id) || {}).text)
          .filter(Boolean)
          .join(' / ');
        const dueRaw = dateCols
          .map((c) => (it.column_values.find((cv) => cv.id === c.id) || {}).text)
          .filter(Boolean)[0] || '';

        found.push({
          sourceItemId: it.id,
          name: it.name,
          boardId: b.id,
          boardName: b.name,
          status: statusText,
          due: dueRaw,
          link: `https://monday.com/boards/${b.id}/pulses/${it.id}`,
        });
      }
    }
    page++;
  }
  return found;
}

// --- read what's already mirrored so we upsert instead of duplicating ----
async function fetchMirrored() {
  const map = new Map(); // sourceItemId -> { id, cvText }
  let cursor = null;
  for (;;) {
    const d = await gql(
      `query ($board:[ID!], $cursor:String) {
         boards (ids: $board) {
           items_page (limit: 100, cursor: $cursor) {
             cursor
             items { id name column_values { id text } }
           }
         }
       }`,
      { board: [cfg.targetBoardId], cursor }
    );
    const ip = d.boards[0].items_page;
    for (const it of ip.items) {
      const key = (it.column_values.find((c) => c.id === cfg.targetColumns.sourceItemId) || {}).text;
      if (key) map.set(String(key), { id: it.id, item: it });
    }
    if (!ip.cursor) break;
    cursor = ip.cursor;
  }
  return map;
}

module.exports = { resolveMe, fetchAssignedItems, fetchMirrored };
