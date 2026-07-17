require('dotenv').config();
const cron = require('node-cron');
const { syncTiktokOrdersToNetsuite } = require('./flows/ordersToNetsuite');
const { syncShipmentsToTiktok } = require('./flows/shipmentsToTiktok');
const { refreshTiktokToken } = require('./flows/tokenRefresh');
const { log } = require('./logger');

const INTERVAL = process.env.SYNC_INTERVAL_MINUTES || 5;

let syncRunning = false;

async function runSync() {
  if (syncRunning) {
    log('Previous sync still running — skipping this tick');
    return;
  }
  syncRunning = true;
  log('═══════════════════════════════════════');
  log('Sinister Diesel TikTok Shop Sync Started');

  try {
    // Flow 1: TikTok Orders → NetSuite Sales Orders
    log('Running Flow 1: TikTok Orders → NetSuite...');
    await syncTiktokOrdersToNetsuite();

    // Flow 2: NetSuite Shipments → TikTok tracking updates
    log('Running Flow 2: Shipments → TikTok...');
    await syncShipmentsToTiktok();

    log('✅ All flows completed successfully');
  } catch (err) {
    log(`❌ Sync error: ${err.message}`, 'error');
  } finally {
    syncRunning = false;
  }

  log('═══════════════════════════════════════');
}

// Refresh TikTok token every 12 hours (tokens expire in 24h)
cron.schedule('0 */12 * * *', async () => {
  log('Refreshing TikTok access token...');
  await refreshTiktokToken();
});

// Run immediately on start
runSync();

// Then run every X minutes
cron.schedule(`*/${INTERVAL} * * * *`, () => {
  runSync();
});

log(`TikTok Sync scheduler running — syncing every ${INTERVAL} minutes`);
