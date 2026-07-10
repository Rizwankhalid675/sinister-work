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

async function t(label, method, url, data) {
  const authData = oauth.authorize({ url, method }, token);
  const auth = oauth.toHeader(authData).Authorization.replace('OAuth ', `OAuth realm="${ACCOUNT_ID}",`);
  try {
    const r = await axios({ method, url, headers: { Authorization: auth, 'Content-Type': 'application/json', 'Prefer': 'transient' }, data });
    console.log('OK ' + label + ':', JSON.stringify(r.data).substring(0, 200));
  } catch (e) {
    console.log('FAIL ' + label + ':', JSON.stringify(e.response ? e.response.data : e.message));
  }
}

(async () => {
  await t('salesorder', 'GET', BASE + '/record/v1/salesorder?limit=1');
  await t('suiteql', 'POST', BASE + '/query/v1/suiteql', { q: 'SELECT id FROM transaction WHERE rownum <= 1' });
  await t('customer', 'GET', BASE + '/record/v1/customer?limit=1');
})();
