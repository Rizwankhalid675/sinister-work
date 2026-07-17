// monday.com GraphQL helpers for the Open Outside Processing POs sync.
// No third-party deps — uses the built-in global fetch (Node 18+).
require('./env');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.monday.com/v2';
const FILE_URL = 'https://api.monday.com/v2/file';
const TOKEN = process.env.MONDAY_API_TOKEN;

if (!TOKEN) {
  throw new Error('Missing MONDAY_API_TOKEN. Expected in the Work-root .env — see env.js.');
}

// Small delay helper to stay under monday.com rate limits on big pushes.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mondayRequest(query, variables, { retries = 3 } = {}) {
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
      // Retry on transient rate-limit / complexity errors.
      if (attempt < retries && /complexity|rate|minute|429/i.test(msg)) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw new Error('monday.com API error: ' + msg);
    }
    return json.data;
  }
}

// ── Columns ────────────────────────────────────────────────────────────
// Fetch existing columns, then ensure each configured column exists (matching
// by title, case-insensitive). Returns a map of config-key -> { id, type }.
async function ensureColumns(boardId, columnConfigs) {
  const data = await mondayRequest(
    `query ($boardId: [ID!]) { boards(ids: $boardId) { columns { id title type } } }`,
    { boardId: [boardId] }
  );
  const existing = data.boards[0]?.columns ?? [];
  const byTitle = new Map(existing.map((c) => [c.title.trim().toLowerCase(), c]));

  const resolved = {};
  for (const cfg of columnConfigs) {
    const found = byTitle.get(cfg.title.trim().toLowerCase());
    if (found) {
      resolved[cfg.key] = { id: found.id, type: found.type };
      continue;
    }
    // Create the missing column.
    const created = await mondayRequest(
      `mutation ($boardId: ID!, $title: String!, $type: ColumnType!) {
        create_column(board_id: $boardId, title: $title, column_type: $type) { id title type }
      }`,
      { boardId, title: cfg.title, type: cfg.type }
    );
    const col = created.create_column;
    resolved[cfg.key] = { id: col.id, type: col.type };
  }
  return resolved;
}

// ── Groups ─────────────────────────────────────────────────────────────
// Ensure a group with the given title exists; return its groupId.
async function ensureGroup(boardId, groupTitle) {
  const data = await mondayRequest(
    `query ($boardId: [ID!]) { boards(ids: $boardId) { groups { id title } } }`,
    { boardId: [boardId] }
  );
  const groups = data.boards[0]?.groups ?? [];
  const found = groups.find(
    (g) => g.title.trim().toLowerCase() === groupTitle.trim().toLowerCase()
  );
  if (found) return found.id;

  const created = await mondayRequest(
    `mutation ($boardId: ID!, $title: String!) {
      create_group(board_id: $boardId, group_name: $title) { id title }
    }`,
    { boardId, title: groupTitle }
  );
  return created.create_group.id;
}

// ── Existing items in a group ──────────────────────────────────────────
// Returns array of { id, name, keyValue } for every item in the group, reading
// the NS Key column so we can match on re-sync. Paginated via items_page cursor.
async function getGroupItems(boardId, groupId, keyColumnId) {
  const items = [];
  let cursor = null;

  // First page is queried through the group; subsequent pages via next_items_page.
  const firstQuery = `query ($boardId: ID!, $groupId: String!, $keyCol: [String!]) {
    boards(ids: [$boardId]) {
      groups(ids: [$groupId]) {
        items_page(limit: 100) {
          cursor
          items { id name column_values(ids: $keyCol) { id text } }
        }
      }
    }
  }`;
  const firstData = await mondayRequest(firstQuery, {
    boardId,
    groupId,
    keyCol: [keyColumnId],
  });
  const page = firstData.boards[0]?.groups[0]?.items_page;
  if (page) {
    for (const it of page.items) {
      items.push({ id: it.id, name: it.name, keyValue: it.column_values[0]?.text || '' });
    }
    cursor = page.cursor;
  }

  while (cursor) {
    const nextData = await mondayRequest(
      `query ($cursor: String!, $keyCol: [String!]) {
        next_items_page(limit: 100, cursor: $cursor) {
          cursor
          items { id name column_values(ids: $keyCol) { id text } }
        }
      }`,
      { cursor, keyCol: [keyColumnId] }
    );
    const np = nextData.next_items_page;
    for (const it of np.items) {
      items.push({ id: it.id, name: it.name, keyValue: it.column_values[0]?.text || '' });
    }
    cursor = np.cursor;
  }

  return items;
}

async function createItem(boardId, groupId, itemName, columnValues) {
  const data = await mondayRequest(
    `mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $cv: JSON) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $cv) { id }
    }`,
    { boardId, groupId, itemName, cv: JSON.stringify(columnValues) }
  );
  return data.create_item.id;
}

async function updateItem(boardId, itemId, columnValues) {
  await mondayRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $cv: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cv) { id }
    }`,
    { boardId, itemId, cv: JSON.stringify(columnValues) }
  );
}

// ── Reports item (files) ───────────────────────────────────────────────
// Ensure a single column of the given type exists (by title); returns its id.
// Used for the Files column on the pinned reports item.
async function ensureColumn(boardId, title, type) {
  const data = await mondayRequest(
    `query ($boardId: [ID!]) { boards(ids: $boardId) { columns { id title type } } }`,
    { boardId: [boardId] }
  );
  const existing = data.boards[0]?.columns ?? [];
  const found = existing.find(
    (c) => c.title.trim().toLowerCase() === title.trim().toLowerCase() && c.type === type
  );
  if (found) return found.id;

  const created = await mondayRequest(
    `mutation ($boardId: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $type) { id }
    }`,
    { boardId, title, type }
  );
  return created.create_column.id;
}

// Find an item in a group by exact name (case-insensitive). Returns its id or null.
// Used to reuse the pinned reports item across runs instead of duplicating it.
async function findItemByName(boardId, groupId, itemName) {
  const target = itemName.trim().toLowerCase();
  const data = await mondayRequest(
    `query ($boardId: ID!, $groupId: String!) {
      boards(ids: [$boardId]) {
        groups(ids: [$groupId]) {
          items_page(limit: 100) { items { id name } }
        }
      }
    }`,
    { boardId, groupId }
  );
  const items = data.boards[0]?.groups[0]?.items_page?.items ?? [];
  const found = items.find((it) => it.name.trim().toLowerCase() === target);
  return found ? found.id : null;
}

// Clear all files from an item's file column so a fresh run replaces the pair
// instead of stacking (monday's add_file_to_column appends). Uses the documented
// { "clearAll": true } file-column value on change_column_value.
async function clearFileColumn(boardId, itemId, columnId) {
  await mondayRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId, itemId, columnId, value: JSON.stringify({ clearAll: true }) }
  );
}

// Upload a local file into an item's Files column via monday's multipart /v2/file
// endpoint (not the JSON GraphQL path — file uploads must be multipart/form-data).
async function uploadFileToColumn(itemId, columnId, filePath) {
  const query = `mutation ($file: File!, $itemId: ID!, $columnId: String!) {
    add_file_to_column(item_id: $itemId, column_id: $columnId, file: $file) { id }
  }`;

  const form = new FormData();
  form.append('query', query);
  form.append('variables', JSON.stringify({ itemId, columnId, file: null }));
  form.append('map', JSON.stringify({ file: ['variables.file'] }));
  const bytes = fs.readFileSync(filePath);
  form.append('file', new Blob([bytes]), path.basename(filePath));

  const res = await fetch(FILE_URL, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'API-Version': '2023-10' },
    body: form,
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('monday.com file upload error: ' + JSON.stringify(json.errors));
  }
  return json.data.add_file_to_column.id;
}

module.exports = {
  mondayRequest,
  ensureColumns,
  ensureColumn,
  ensureGroup,
  getGroupItems,
  findItemByName,
  createItem,
  updateItem,
  clearFileColumn,
  uploadFileToColumn,
  sleep,
};
