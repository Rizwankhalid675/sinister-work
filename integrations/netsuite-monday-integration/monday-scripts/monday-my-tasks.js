// monday-my-tasks.js
//
// Lists every item ("task") assigned to you across all boards — where your
// monday.com user appears in ANY person-type column (People, Owner, Person,
// etc.). This is the "My Tasks" dashboard you wanted, delivered as a script.
//
// Usage (from this folder or with node path):
//   node monday-my-tasks.js                 # tasks assigned to the token owner
//   node monday-my-tasks.js --user 12345678 # tasks for a specific user id
//   node monday-my-tasks.js --json          # machine-readable JSON output
//   node monday-my-tasks.js --board 987654  # limit to one board id
//   node monday-my-tasks.js --open          # hide Done/closed items (best-effort)
//
// Token: reuses MONDAY_API_TOKEN from the Work-root .env (see ../env.js).
require('../env');

const API_URL = 'https://api.monday.com/v2';
const TOKEN = process.env.MONDAY_API_TOKEN;

if (!TOKEN) {
  throw new Error('Missing MONDAY_API_TOKEN. Expected in the Work-root .env — see env.js.');
}

// ── args ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getFlag = (name) => argv.includes(name);
const getOpt = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
};
const asJson = getFlag('--json');
const openOnly = getFlag('--open');
const forcedUserId = getOpt('--user');
const onlyBoard = getOpt('--board');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mondayRequest(query, variables, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN,
        'API-Version': '2023-10',
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) {
      const msg = JSON.stringify(json.errors);
      if (attempt < retries && /complexity|rate|minute|429/i.test(msg)) {
        await sleep(2500 * (attempt + 1));
        continue;
      }
      throw new Error('monday.com API error: ' + msg);
    }
    return json.data;
  }
}

// ── who am I ──────────────────────────────────────────────────────────
async function resolveMe() {
  if (forcedUserId) return { id: String(forcedUserId), name: '(user ' + forcedUserId + ')' };
  const data = await mondayRequest(`query { me { id name email } }`);
  if (!data.me) throw new Error('Could not resolve current user from token.');
  return { id: String(data.me.id), name: data.me.name, email: data.me.email };
}

// Does a person-type column value contain the target user id?
function columnHasUser(col, userId) {
  if (!col || !col.value) return false;
  // person columns have type 'people'; also catch legacy 'person'.
  if (col.type !== 'people' && col.type !== 'person') return false;
  try {
    const parsed = JSON.parse(col.value);
    const persons = parsed.personsAndTeams || parsed.persons_and_teams || [];
    return persons.some(
      (p) => (p.kind === 'person' || !p.kind) && String(p.id) === String(userId)
    );
  } catch {
    return false;
  }
}

// Best-effort "is this item closed/done?" — checks status columns for a
// label that reads like Done/Closed/Complete.
function looksDone(cols) {
  return cols.some((c) => {
    if (c.type !== 'status' || !c.text) return false;
    return /^(done|closed|complete|completed|resolved)$/i.test(c.text.trim());
  });
}

async function fetchBoards() {
  const boards = [];
  let page = 1;
  for (;;) {
    const data = await mondayRequest(
      `query ($page: Int!) {
         boards (limit: 50, page: $page, state: active) { id name }
       }`,
      { page }
    );
    const batch = data.boards || [];
    boards.push(...batch);
    if (batch.length < 50) break;
    page++;
    await sleep(300);
  }
  return onlyBoard ? boards.filter((b) => String(b.id) === String(onlyBoard)) : boards;
}

// Page through a single board's items and collect ones assigned to the user.
async function tasksForBoard(board, userId) {
  const found = [];
  let cursor = null;
  for (;;) {
    const data = await mondayRequest(
      `query ($boardId: ID!, $cursor: String) {
         boards (ids: [$boardId]) {
           items_page (limit: 100, cursor: $cursor) {
             cursor
             items {
               id
               name
               url
               group { title }
               column_values { id text type value }
             }
           }
         }
       }`,
      { boardId: String(board.id), cursor }
    );
    const ip = data.boards?.[0]?.items_page;
    if (!ip) break;
    for (const item of ip.items) {
      const cols = item.column_values || [];
      const assigned = cols.some((c) => columnHasUser(c, userId));
      if (!assigned) continue;
      if (openOnly && looksDone(cols)) continue;

      const status = cols.find((c) => c.type === 'status' && c.text);
      const dateCol = cols.find((c) => c.type === 'date' && c.text);
      found.push({
        board: board.name,
        boardId: String(board.id),
        group: item.group?.title || '',
        id: item.id,
        name: item.name,
        url: item.url,
        status: status?.text || '',
        due: dateCol?.text || '',
      });
    }
    if (!ip.cursor) break;
    cursor = ip.cursor;
    await sleep(300);
  }
  return found;
}

async function main() {
  const me = await resolveMe();
  const boards = await fetchBoards();

  if (!asJson) {
    console.error(`Scanning ${boards.length} board(s) for tasks assigned to ${me.name} (id ${me.id})...`);
  }

  const all = [];
  for (const board of boards) {
    try {
      const tasks = await tasksForBoard(board, me.id);
      all.push(...tasks);
      if (!asJson && tasks.length) {
        console.error(`  ${board.name}: ${tasks.length}`);
      }
    } catch (e) {
      console.error(`  ! ${board.name}: ${e.message}`);
    }
    await sleep(200);
  }

  if (asJson) {
    console.log(JSON.stringify({ user: me, count: all.length, tasks: all }, null, 2));
    return;
  }

  // Pretty grouped output.
  console.log('\n================  MY TASKS  ================');
  console.log(`User: ${me.name}   Total: ${all.length}\n`);

  if (!all.length) {
    console.log('No tasks found assigned to you.');
    return;
  }

  const byBoard = new Map();
  for (const t of all) {
    if (!byBoard.has(t.board)) byBoard.set(t.board, []);
    byBoard.get(t.board).push(t);
  }
  for (const [boardName, tasks] of byBoard) {
    console.log(`\n▸ ${boardName}  (${tasks.length})`);
    for (const t of tasks) {
      const bits = [t.status && `[${t.status}]`, t.due && `due ${t.due}`]
        .filter(Boolean)
        .join('  ');
      console.log(`   • ${t.name}${bits ? '   ' + bits : ''}`);
      console.log(`     ${t.url}`);
    }
  }
  console.log('');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
