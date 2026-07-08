#!/usr/bin/env node
/**
 * Pushes a list of completed revamp tasks to a monday.com board as items.
 *
 * Setup:
 *   1. Rotate/generate a monday.com API token (Admin > API in monday.com).
 *   2. Create a file named ".env" in the repo root (already git-ignored) containing:
 *        MONDAY_API_TOKEN=your-token-here
 *   3. Run:  node scripts/monday-push-tasks.js
 *
 * Usage:
 *   node scripts/monday-push-tasks.js --board 326887787 --list-columns
 *   node scripts/monday-push-tasks.js --board 326887787 --status-column status --status-label Done
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
    statusColumn: null,
    statusLabel: "Done",
    platformColumn: null,
    platformLabel: "Website",
    listColumns: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--board") args.board = argv[++i];
    else if (arg === "--status-column") args.statusColumn = argv[++i];
    else if (arg === "--status-label") args.statusLabel = argv[++i];
    else if (arg === "--platform-column") args.platformColumn = argv[++i];
    else if (arg === "--platform-label") args.platformLabel = argv[++i];
    else if (arg === "--list-columns") args.listColumns = true;
  }
  return args;
}

async function mondayRequest(token, query, variables) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error("monday.com API error: " + JSON.stringify(json.errors));
  }
  return json.data;
}

async function listColumns(token, boardId) {
  const data = await mondayRequest(
    token,
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns { id title type }
      }
    }`,
    { boardId: [boardId] }
  );
  const columns = data.boards[0]?.columns ?? [];
  console.log(`Columns on board ${boardId}:`);
  for (const col of columns) {
    console.log(`  id=${col.id.padEnd(20)} type=${col.type.padEnd(12)} title="${col.title}"`);
  }
}

async function createItem(token, boardId, itemName, columnValues) {
  const data = await mondayRequest(
    token,
    `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
      create_item(
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues
      ) { id name }
    }`,
    {
      boardId,
      itemName,
      columnValues: columnValues ? JSON.stringify(columnValues) : null,
    }
  );
  return data.create_item;
}

// Summary of completed revamp work, derived from the "July 1st" and "June 30th" folders.
const REVAMP_TASKS = [
  "Homepage revamp v2/v3 (premium layout, header, footer, sitewide CSS/JS)",
  "Category (CTGY) page layout templates and premium wrapper",
  "PDP layout template and PDPL changes reference",
  "SFNT homepage variants (v2 single-template test, page-test-content, July 4th sale version)",
  "Cold-side charge pipe product pages (v2, v3)",
  "Fuel filter conversion kit product pages (v2)",
  "Global revamp CSS/JS (sitewide styles and scripts, revamp-prod.css/js)",
  "Miva truck finder snippet integration",
  "July 4th sale page build",
];

async function main() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    console.error("Missing MONDAY_API_TOKEN environment variable. See script header for setup.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.board) {
    console.error("Missing --board <boardId>");
    process.exit(1);
  }

  if (args.listColumns) {
    await listColumns(token, args.board);
    return;
  }

  for (const task of REVAMP_TASKS) {
    const columnValues = {};
    if (args.statusColumn) columnValues[args.statusColumn] = { label: args.statusLabel };
    if (args.platformColumn) columnValues[args.platformColumn] = { label: args.platformLabel };
    const item = await createItem(
      token,
      args.board,
      task,
      Object.keys(columnValues).length ? columnValues : undefined
    );
    console.log(`Created item ${item.id}: ${item.name}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});