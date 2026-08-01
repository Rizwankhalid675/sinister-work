const { refreshAccessToken } = require('../tiktok');
const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

async function refreshTiktokToken() {
  try {
    const data = await refreshAccessToken();
    if (!data?.access_token) {
      log('⚠️ Token refresh returned no access token', 'error');
      return;
    }

    // Update .env with new tokens
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent
      .replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${data.access_token}`)
      .replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${data.refresh_token}`);
    fs.writeFileSync(envPath, envContent);

    // Reload env so current process uses new token
    process.env.TIKTOK_ACCESS_TOKEN = data.access_token;
    process.env.TIKTOK_REFRESH_TOKEN = data.refresh_token;

    log('✅ TikTok access token refreshed');
  } catch (err) {
    log(`❌ Token refresh failed: ${err.message}`, 'error');
  }
}

module.exports = { refreshTiktokToken };
