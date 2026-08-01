const { getFulfilledShipments } = require('../netsuite');
const { updateTracking } = require('../tiktok');
const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

const SYNCED_FILE = path.join(__dirname, '../logs/synced_shipments.json');

function loadSyncedShipments() {
  if (!fs.existsSync(SYNCED_FILE)) return {};
  return JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf8'));
}

function saveSyncedShipment(fulfillmentId) {
  const synced = loadSyncedShipments();
  synced[fulfillmentId] = { syncedAt: new Date().toISOString() };
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(synced, null, 2));
}

async function syncShipmentsToTiktok() {
  const synced = loadSyncedShipments();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const shipments = await getFulfilledShipments(since);

  log(`Found ${shipments.length} TikTok shipments to push tracking for`);

  for (const shipment of shipments) {
    if (synced[shipment.id]) {
      log(`Shipment ${shipment.id} already pushed to TikTok — skipping`);
      continue;
    }
    if (!shipment.tiktokOrderId || !shipment.trackingNumber) {
      log(`⚠️ Shipment ${shipment.id} missing TikTok order ID or tracking number — skipping`);
      continue;
    }

    try {
      await updateTracking(shipment.tiktokOrderId, shipment.trackingNumber, shipment.carrier);
      saveSyncedShipment(shipment.id);
      log(`✅ Pushed tracking ${shipment.trackingNumber} to TikTok Order ${shipment.tiktokOrderId}`);
    } catch (err) {
      log(`❌ Failed to push tracking for TikTok Order ${shipment.tiktokOrderId}: ${err.message}`, 'error');
    }
  }
}

module.exports = { syncShipmentsToTiktok };
