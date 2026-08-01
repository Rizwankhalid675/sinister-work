#!/usr/bin/env node
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
async function main() {
  const token = process.env.MONDAY_API_TOKEN;
  const [boardId, itemId, columnId, label] = process.argv.slice(2);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({
      query: `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
      }`,
      variables: { boardId, itemId, columnId, value: JSON.stringify({ label }) },
    }),
  });
  console.log(await res.text());
}
main();
