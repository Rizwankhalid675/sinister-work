require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
const oauth = new OAuth({ consumer: { key: process.env.NETSUITE_CONSUMER_KEY, secret: process.env.NETSUITE_CONSUMER_SECRET }, signature_method: 'HMAC-SHA256', hash_function(b,k){return crypto.createHmac('sha256',k).update(b).digest('base64');} });
const token = { key: process.env.NETSUITE_TOKEN_ID, secret: process.env.NETSUITE_TOKEN_SECRET };
const BASE = `https://${ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest`;

async function sql(q) {
  const url = BASE + '/query/v1/suiteql';
  const h = oauth.toHeader(oauth.authorize({url, method:'POST'}, token));
  const auth = h.Authorization.replace('OAuth ', `OAuth realm="${ACCOUNT_ID}",`);
  const r = await axios.post(url, {q}, {headers:{Authorization:auth,'Content-Type':'application/json','Prefer':'transient'}});
  return r.data.items;
}

(async () => {
  try {
    // Test join with date filter
    const r1 = await sql("SELECT id, otherrefnum, status, trandate FROM salesorder WHERE otherrefnum = '2762216'");
    console.log('SO lookup:', JSON.stringify(r1));
    console.log('Statuses:', JSON.stringify(r));
  } catch(e) { console.log('FAIL:', e.response?.data?.['o:errorDetails']?.[0]?.detail || e.message); }
})();
