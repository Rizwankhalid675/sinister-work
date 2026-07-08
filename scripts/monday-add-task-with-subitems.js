#!/usr/bin/env node
/**
 * Creates a parent item on a monday.com board with a set of named subitems,
 * optionally sets a status/date/person column on the parent, and posts an update.
 *
 * Usage:
 *   node scripts/monday-add-task-with-subitems.js --board 326887787 \
 *     --parent-name "NetSuite Update" \
 *     --subitems "Subitem one|Subitem two" \
 *     --status-column status --status-label Done \
 *     --date-column date1 --date 2026-07-08 \
 *     --person-column people --person-id 4665234 \
 *     --update-text "..."
 */

const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
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
    parentName: null,
    subitems: [],
    statusColumn: null,
    statusLabel: "Done",
    dateColumn: null,
    date: null,
    personColumn: null,
    personId: null,
    updateText: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--board") args.board = argv[++i];
    else if (arg === "--parent-name") args.parentName = argv[++i];
    else if (arg === "--subitems") args.subitems = argv[++i].split("|").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--status-column") args.statusColumn = argv[++i];
    else if (arg === "--status-label") args.statusLabel = argv[++i];
    else if (arg === "--date-column") args.dateColumn = argv[++i];
    else if (arg === "--date") args.date = argv[++i];
    else if (arg === "--person-column") args.personColumn = argv[++i];
    else if (arg === "--person-id") args.personId = argv[++i];
    else if (arg === "--update-text") args.updateText = argv[++i];
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

async function createItem(token, boardId, itemName, columnValues) {
  const data = await mondayRequest(
    token,
    `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) { id name }
    }`,
    { boardId, itemName, columnValues: columnValues ? JSON.stringify(columnValues) : null }
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
    `mutation ($itemId: ID!, $body: String!) { create_update(item_id: $itemId, body: $body) { id } }`,
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
  if (!args.board || !args.parentName) {
    console.error("Usage: --board <id> --parent-name <name> [--subitems 'a|b|c'] [--status-column ... --status-label ...] [--date-column ... --date ...] [--person-column ... --person-id ...] [--update-text ...]");
    process.exit(1);
  }

  const columnValues = {};
  if (args.statusColumn) columnValues[args.statusColumn] = { label: args.statusLabel };
  if (args.dateColumn && args.date) columnValues[args.dateColumn] = { date: args.date };

  const parent = await createItem(
    token,
    args.board,
    args.parentName,
    Object.keys(columnValues).length ? columnValues : undefined
  );
  console.log(`Created parent item ${parent.id}: ${parent.name}`);

  for (const subName of args.subitems) {
    const sub = await createSubitem(token, parent.id, subName);
    console.log(`Created subitem ${sub.id}: ${sub.name}`);
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
