// monday.js — thin GraphQL client (built-in fetch, rate-limit retry).
require('../env');

const API_URL = 'https://api.monday.com/v2';
const TOKEN = process.env.MONDAY_API_TOKEN;
if (!TOKEN) throw new Error('Missing MONDAY_API_TOKEN (Work-root .env — see ../env.js).');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res, json;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: TOKEN, 'API-Version': '2023-10' },
        body: JSON.stringify({ query, variables }),
      });
      json = await res.json();
    } catch (e) {
      if (attempt < retries) { await sleep(2000 * (attempt + 1)); continue; }
      throw e;
    }
    if (json.errors) {
      const msg = JSON.stringify(json.errors);
      if (attempt < retries && /complexity|rate|minute|429|InternalServer/i.test(msg)) {
        await sleep(2500 * (attempt + 1));
        continue;
      }
      throw new Error('monday API error: ' + msg);
    }
    return json.data;
  }
}

module.exports = { gql, sleep };
