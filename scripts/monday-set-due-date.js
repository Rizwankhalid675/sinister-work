#!/usr/bin/env node
/**
 * Sets a date column value on a list of monday.com item IDs.
 *
 * Usage:
 *   node scripts/monday-set-due-date.js --board 326887787 --date-column date1 --date 2026-07-06 --items 123,456,789
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
  const args = { board: null, dateColumn: null, date: null, items: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--board") args.board = argv[++i];
    else if (arg === "--date-column") args.dateColumn = argv[++i];
    else if (arg === "--date") args.date = argv[++i];
    else if (arg === "--items") args.items = argv[++i].split(",").map((s) => s.trim());
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

async function setDate(token, boardId, itemId, dateColumn, date) {
  const data = await mondayRequest(
    token,
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) { id }
    }`,
    { boardId, itemId, columnId: dateColumn, value: JSON.stringify({ date }) }
  );
  return data.change_column_value;
}

async function main() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    console.error("Missing MONDAY_API_TOKEN. Set it in .env at the repo root.");
    process.exit(1);
  }
  const args = parseArgs(process.argv.slice(2));
  if (!args.board || !args.dateColumn || !args.date || !args.items.length) {
    console.error("Usage: --board <id> --date-column <colId> --date YYYY-MM-DD --items id1,id2,...");
    process.exit(1);
  }

  for (const itemId of args.items) {
    await setDate(token, args.board, itemId, args.dateColumn, args.date);
    console.log(`Set due date ${args.date} on item ${itemId}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
