require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
const oauth = new OAuth({
  consumer: { key: process.env.NETSUITE_CONSUMER_KEY, secret: process.env.NETSUITE_CONSUMER_SECRET },
  signature_method: 'HMAC-SHA256',
  hash_function(base_string, key) { return crypto.createHmac('sha256', key).update(base_string).digest('base64'); }
});
const token = { key: process.env.NETSUITE_TOKEN_ID, secret: process.env.NETSUITE_TOKEN_SECRET };
const BASE = `https://${ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest`;

async function suiteQL(q) {
  const url = `${BASE}/query/v1/suiteql`;
  const authData = oauth.authorize({ url, method: 'POST' }, token);
  const auth = oauth.toHeader(authData).Authorization.replace('OAuth ', `OAuth realm="${ACCOUNT_ID}",`);
  const r = await axios.post(url, { q }, { headers: { Authorization: auth, 'Content-Type': 'application/json', 'Prefer': 'transient' } });
  return r.data.items || [];
}

async function nsGet(path) {
  const url = `${BASE}/record/v1/${path}`;
  const authData = oauth.authorize({ url, method: 'GET' }, token);
  const auth = oauth.toHeader(authData).Authorization.replace('OAuth ', `OAuth realm="${ACCOUNT_ID}",`);
  const r = await axios.get(url, { headers: { Authorization: auth, 'Content-Type': 'application/json' } });
  return r.data;
}

(async () => {
  try {
    // Get recent item fulfillments via REST record API
    const r = await nsGet('itemfulfillment?limit=2&fields=id,custbody_miva_order_id,custbody_miva_shipment_id,shipcargo,shipcarrier');
    console.log('itemfulfillment list:', JSON.stringify(r).substring(0, 800));
  } catch(e) { console.log('FAIL:', e.response?.data || e.message); }

  try {
    // Get a single itemfulfillment by ID to see available fields
    const ids = await suiteQL("SELECT id FROM transaction WHERE type = 'ItemShip' AND rownum <= 1");
    if (ids.length) {
      const r = await nsGet(`itemfulfillment/${ids[0].id}`);
      console.log('Single fulfillment fields:', Object.keys(r).join(', '));
      console.log('miva fields:', JSON.stringify({
        custbody_miva_order_id: r.custbody_miva_order_id,
        custbody_miva_shipment_id: r.custbody_miva_shipment_id
      }));
    }
  } catch(e) { console.log('FAIL single:', e.response?.data || e.message); }
})();
