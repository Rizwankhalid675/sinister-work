/**
 * TikTok Shop OAuth Authorization
 * Run: node auth.js
 * Opens browser to authorize your TikTok Shop, saves access token to .env
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_KEY = process.env.TIKTOK_APP_KEY;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;
const PORT = process.env.PORT || 3001;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const app = express();

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    res.send('<h2>Error: No authorization code received.</h2>');
    return;
  }

  try {
    // Exchange auth code for access token
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params = {
      app_key: APP_KEY,
      auth_code: code,
      grant_type: 'authorized_code',
    };

    // Generate signature
    const sortedKeys = Object.keys(params).sort();
    let signStr = APP_SECRET;
    for (const key of sortedKeys) {
      signStr += `${key}${params[key]}`;
    }
    signStr += APP_SECRET;
    const sign = crypto.createHmac('sha256', APP_SECRET).update(signStr).digest('hex');

    const response = await axios.get('https://auth.tiktok-shops.com/api/v2/token/get', {
      params: {
        ...params,
        sign,
        timestamp,
      }
    });

    const data = response.data?.data;
    if (!data?.access_token) {
      res.send(`<h2>Error getting token: ${JSON.stringify(response.data)}</h2>`);
      return;
    }

    const { access_token, refresh_token, open_id, seller_base_region } = data;

    // Get shop ID
    const shopSign = generateSign(APP_SECRET, '/api/v2/shop/get_authorized_shop', { app_key: APP_KEY, access_token, timestamp });
    const shopRes = await axios.get('https://open-api.tiktokglobalshop.com/api/v2/shop/get_authorized_shop', {
      params: { app_key: APP_KEY, access_token, timestamp, sign: shopSign }
    });
    const shopId = shopRes.data?.data?.shops?.[0]?.cipher || shopRes.data?.data?.shops?.[0]?.id || '';

    // Save to .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent
      .replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${access_token}`)
      .replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${refresh_token}`)
      .replace(/TIKTOK_SHOP_ID=.*/, `TIKTOK_SHOP_ID=${shopId}`);
    fs.writeFileSync(envPath, envContent);

    console.log('✅ Access token saved to .env');
    console.log(`   Access Token: ${access_token.substring(0, 20)}...`);
    console.log(`   Shop ID: ${shopId}`);

    res.send(`
      <h2>✅ Authorization successful!</h2>
      <p>Access token saved. You can close this window and run <code>node index.js</code> to start the sync.</p>
      <p><strong>Shop ID:</strong> ${shopId}</p>
    `);

    server.close();
  } catch (err) {
    console.error('Auth error:', err.response?.data || err.message);
    res.send(`<h2>Error: ${err.message}</h2><pre>${JSON.stringify(err.response?.data, null, 2)}</pre>`);
  }
});

function generateSign(secret, path, params) {
  const sortedKeys = Object.keys(params).sort();
  let signStr = secret + path;
  for (const key of sortedKeys) {
    signStr += `${key}${params[key]}`;
  }
  signStr += secret;
  return crypto.createHmac('sha256', secret).update(signStr).digest('hex');
}

const server = app.listen(PORT, () => {
  // Use auth.tiktok-shops.com for draft/private apps (no publish required)
  const authUrl = `https://auth.tiktok-shops.com/oauth/authorize/seller?client_key=${APP_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&tts_state=sinisterdiesel`;
  console.log('Opening browser for TikTok Shop authorization...');
  console.log(`If browser does not open, visit: ${authUrl}`);

  // Open browser
  const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`;
  exec(cmd);
});
