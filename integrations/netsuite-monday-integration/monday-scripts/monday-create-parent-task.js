#!/usr/bin/env node
/**
 * Creates a parent "Website Revamp" item, converts a list of existing items into
 * its subitems, assigns a person to the parent, and posts an update comment.
 *
 * Usage:
 *   node scripts/monday-create-parent-task.js --board 326887787 --list-users
 *   node scripts/monday-create-parent-task.js --board 326887787 \
 *     --parent-name "Website Revamp - July 2026" \
 *     --items 12458216926,12458223371,... \
 *     --person-column people --person-id <USER_ID> \
 *     --update-text "..."
 */

const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const API_URL = "https://api.monday.com/v2";

function parseArgs(argv) {
  const args = {
    board: null,
    parentName: "Website Revamp",
    items: [],
    personColumn: null,
    personId: null,
    updateText: null,
    listUsers: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--board") args.board = argv[++i];
    else if (arg === "--parent-name") args.parentName = argv[++i];
    else if (arg === "--items") args.items = argv[++i].split(",").map((s) => s.trim());
    else if (arg === "--person-column") args.personColumn = argv[++i];
    else if (arg === "--person-id") args.personId = argv[++i];
    else if (arg === "--update-text") args.updateText = argv[++i];
    else if (arg === "--list-users") args.listUsers = true;
  }
  return args;
}

async function mondayRequest(token, query, variables) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("monday.com API error: " + JSON.stringify(json.errors));
  return json.data;
}

async function listUsers(token) {
  const data = await mondayRequest(token, `query { users { id name email } }`, {});
  console.log("Board/account users:");
  for (const u of data.users) {
    console.log(`  id=${u.id.padEnd(12)} name="${u.name}" email=${u.email}`);
  }
}

async function createItem(token, boardId, itemName) {
  const data = await mondayRequest(
    token,
    `mutation ($boardId: ID!, $itemName: String!) {
      create_item(board_id: $boardId, item_name: $itemName) { id name }
    }`,
    { boardId, itemName }
  );
  return data.create_item;
}

async function createSubitem(token, parentItemId, itemName) {
  const data = await mondayRequest(
    token,
    `mutation ($parentItemId: ID!, $itemName: String!) {
      create_subitem(parent_item_id: $parentItemId, item_name: $itemName) { id name }
    }`,
    { parentItemId, itemName }
  );
  return data.create_subitem;
}

async function getItemNames(token, itemIds) {
  const data = await mondayRequest(
    token,
    `query ($ids: [ID!]) { items(ids: $ids) { id name } }`,
    { ids: itemIds }
  );
  return data.items;
}

async function setPersonColumn(token, boardId, itemId, columnId, personId) {
  const value = JSON.stringify({ personsAndTeams: [{ id: Number(personId), kind: "person" }] });
  await mondayRequest(
    token,
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId, itemId, columnId, value }
  );
}

async function postUpdate(token, itemId, body) {
  const data = await mondayRequest(
    token,
    `mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId, body }
  );
  return data.create_update;
}

async function main() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    console.error("Missing MONDAY_API_TOKEN. Set it in .env at the repo root.");
    process.exit(1);
  }
  const args = parseArgs(process.argv.slice(2));

  if (args.listUsers) {
    await listUsers(token);
    return;
  }

  if (!args.board || !args.items.length) {
    console.error("Usage: --board <id> --items id1,id2,... [--parent-name ...] [--person-column ... --person-id ...] [--update-text ...]");
    process.exit(1);
  }

  const parent = await createItem(token, args.board, args.parentName);
  console.log(`Created parent item ${parent.id}: ${parent.name}`);

  const existingItems = await getItemNames(token, args.items);
  for (const existing of existingItems) {
    const sub = await createSubitem(token, parent.id, existing.name);
    console.log(`Created subitem ${sub.id} (from ${existing.id}): ${sub.name}`);
  }

  if (args.personColumn && args.personId) {
    await setPersonColumn(token, args.board, parent.id, args.personColumn, args.personId);
    console.log(`Assigned person ${args.personId} to parent item ${parent.id}`);
  }

  if (args.updateText) {
    const update = await postUpdate(token, parent.id, args.updateText);
    console.log(`Posted update ${update.id} on parent item ${parent.id}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
