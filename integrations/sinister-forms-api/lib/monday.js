'use strict';

const config = require('./config');

// Minimal monday.com GraphQL client using the built-in fetch (Node 20+).
// Creates an item on the configured board from a normalised form submission.

const MONDAY_TIMEOUT_MS = 15000;

// monday expects column values as a JSON-encoded string keyed by column id.
// We keep the mapping here so the storefront never has to know column ids.
// Adjust these ids to match the real board (see README / board settings).
const COLUMN_MAP = {
  email: 'email',
  phone: 'phone',
  name: 'text',        // customer name
  subject: 'text0',    // form subject / topic
  message: 'long_text',
  source: 'text1',     // which form (contact, warranty, dealer, etc.)
};

function buildColumnValues(submission) {
  const cv = {};

  if (submission.email) {
    cv[COLUMN_MAP.email] = { email: submission.email, text: submission.email };
  }
  if (submission.phone) {
    cv[COLUMN_MAP.phone] = { phone: submission.phone, countryShortName: 'US' };
  }
  if (submission.name) cv[COLUMN_MAP.name] = submission.name;
  if (submission.subject) cv[COLUMN_MAP.subject] = submission.subject;
  if (submission.message) cv[COLUMN_MAP.message] = submission.message;
  if (submission.source) cv[COLUMN_MAP.source] = submission.source;

  return JSON.stringify(cv);
}

async function mondayRequest(query, variables) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MONDAY_TIMEOUT_MS);
  try {
    const res = await fetch(config.monday.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.monday.accessToken,
        'API-Version': config.monday.apiVersion,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`monday returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
    }

    if (!res.ok || json.errors) {
      const msg = json.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`;
      throw new Error(`monday API error: ${msg}`);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

async function createItem(submission) {
  const itemName = submission.name
    ? `${submission.name}${submission.source ? ` — ${submission.source}` : ''}`
    : submission.subject || submission.email || 'Storefront submission';

  const query = `
    mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) { id }
    }`;

  const variables = {
    boardId: config.monday.boardId,
    groupId: config.monday.groupId || null,
    itemName: itemName.slice(0, 255),
    columnValues: buildColumnValues(submission),
  };

  const data = await mondayRequest(query, variables);
  return data.create_item.id;
}

module.exports = { createItem };
