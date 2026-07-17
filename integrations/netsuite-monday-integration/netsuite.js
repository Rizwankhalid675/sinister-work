// NetSuite REST/SuiteQL client (TBA OAuth 1.0a).
// Trimmed copy of ../sinister-netsuite-sync/netsuite.js — this sync only reads
// (SuiteQL), it never writes to NetSuite.
require('./env');
const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

const ACCOUNT_ID      = process.env.NETSUITE_ACCOUNT_ID;
const CONSUMER_KEY    = process.env.NETSUITE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.NETSUITE_CONSUMER_SECRET;
const TOKEN_ID        = process.env.NETSUITE_TOKEN_ID;
const TOKEN_SECRET    = process.env.NETSUITE_TOKEN_SECRET;

if (!ACCOUNT_ID || !CONSUMER_KEY || !TOKEN_ID) {
  throw new Error(
    'Missing NETSUITE_* credentials. Expected in ../sinister-netsuite-sync/.env — see env.js.'
  );
}

const BASE_URL = `https://${ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest`;

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA256',
  hash_function(base_string, key) {
    return crypto.createHmac('sha256', key).update(base_string).digest('base64');
  },
});

const token = { key: TOKEN_ID, secret: TOKEN_SECRET };

function getTBAHeader(method, url) {
  const authData = oauth.authorize({ url, method }, token);
  const header = oauth.toHeader(authData);
  // NetSuite requires realm as the account ID (no dashes)
  return header.Authorization.replace('OAuth ', `OAuth realm="${ACCOUNT_ID}",`);
}

// Runs a SuiteQL query, auto-paginating through all result pages.
async function suiteQL(query) {
  const url = `${BASE_URL}/query/v1/suiteql`;
  const limit = 1000;
  let offset = 0;
  let items = [];
  try {
    while (true) {
      const pagedUrl = `${url}?limit=${limit}&offset=${offset}`;
      const response = await axios.post(
        pagedUrl,
        { q: query },
        {
          headers: {
            Authorization: getTBAHeader('POST', pagedUrl),
            'Content-Type': 'application/json',
            Prefer: 'transient',
          },
        }
      );
      const page = response.data.items || [];
      items = items.concat(page);
      if (response.data.hasMore !== true) break;
      offset += limit;
    }
    return items;
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`SuiteQL failed: ${detail}`);
  }
}

module.exports = { suiteQL };
