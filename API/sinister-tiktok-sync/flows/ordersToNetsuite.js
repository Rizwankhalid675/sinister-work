const { getOrders, getOrderDetail } = require('../tiktok');
const { createSalesOrder, getCustomerByEmail, getItemIdBySku, createInventoryItem, nsRequest, suiteQL } = require('../netsuite');
const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

const SYNCED_FILE = path.join(__dirname, '../logs/synced_orders.json');

function loadSyncedOrders() {
  if (!fs.existsSync(SYNCED_FILE)) return {};
  return JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf8'));
}

function saveSyncedOrder(tiktokOrderId, netsuiteId) {
  const synced = loadSyncedOrders();
  synced[tiktokOrderId] = { netsuiteId, syncedAt: new Date().toISOString() };
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(synced, null, 2));
}

// Map TikTok shipping provider to NetSuite ship method ID (reuse existing NS IDs)
const CARRIER_MAP = {
  'UPS': 8297,
  'USPS': 9316,
  'FEDEX': 10326,
  'OTHER': 10325,
};

function mapTiktokOrderToNetsuite(order, customerId, itemIdMap = {}) {
  const recipient = order.recipient_address || {};
  const phone = recipient.phone_number || '';
  const items = (order.line_items || [])
    .filter(item => itemIdMap[item.seller_sku])
    .map(item => ({
      item: { id: itemIdMap[item.seller_sku] },
      description: item.product_name,
      quantity: item.quantity,
      price: { id: '-1' },
      rate: parseFloat(item.sale_price) || 0,
      amount: parseFloat(item.sale_price) * item.quantity,
      taxcode: { id: '-7' },
      location: { id: '2' }
    }));

  const shippingCost = parseFloat(order.payment?.shipping_fee) || 0;

  return {
    shippingAddress: {
      override: false,
      addressee: recipient.name || '',
      addr1: recipient.address_line1 || '',
      addr2: recipient.address_line2 || '',
      city: recipient.city || '',
      state: recipient.state || '',
      zip: recipient.zipcode || '',
      country: { id: recipient.country_code || 'US' },
      addrPhone: phone
    },
    billingAddress: {
      override: false,
      addressee: recipient.name || '',
      addr1: recipient.address_line1 || '',
      city: recipient.city || '',
      state: recipient.state || '',
      zip: recipient.zipcode || '',
      country: { id: recipient.country_code || 'US' },
    },
    customForm: { id: '232' },
    trandate: order.create_time
      ? new Date(order.create_time * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    custbody_tiktok_order_id: String(order.id),
    custbody_hb_miva_order_total: parseFloat(order.payment?.total_amount) || 0,
    salesrep: { id: '179371' },
    shipphone: phone,
    shippingcost: shippingCost,
    orderstatus: { id: 'A' },
    item: { items },
    ...(customerId ? { entity: { id: customerId } } : {})
  };
}

async function upsertCustomer(order) {
  const recipient = order.recipient_address || {};
  const email = order.buyer_email || `tiktok_${order.buyer_uid}@sinisterdiesel.com`;

  let customerId = await getCustomerByEmail(email);
  if (customerId) return customerId;

  const result = await nsRequest('POST', 'customer', {
    email,
    firstname: recipient.name?.split(' ')[0] || 'TikTok',
    lastname: recipient.name?.split(' ').slice(1).join(' ') || 'Customer',
    phone: recipient.phone_number || '',
    subsidiary: { id: '1' }
  });
  return result?.id || null;
}

async function syncTiktokOrdersToNetsuite() {
  const synced = loadSyncedOrders();
  const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const orders = await getOrders({ startTime: since, status: 'AWAITING_SHIPMENT' });

  log(`TikTok: Found ${orders.length} orders to check`);

  for (const order of orders) {
    if (synced[order.id]) {
      log(`TikTok Order ${order.id} already synced — skipping`);
      continue;
    }

    try {
      // Get full order details
      const detail = await getOrderDetail(order.id);
      const fullOrder = detail?.order_list?.[0] || order;

      // Upsert customer
      const customerId = await upsertCustomer(fullOrder);
      if (!customerId) {
        log(`⚠️ TikTok Order ${order.id} — could not create customer`, 'error');
        continue;
      }

      // Resolve NS item IDs by SKU
      const itemIdMap = {};
      for (const item of (fullOrder.line_items || [])) {
        const sku = item.seller_sku;
        if (!sku || itemIdMap[sku] !== undefined) continue;

        let id = await getItemIdBySku(sku);
        if (!id) {
          let attempt = sku;
          while (!id && attempt.includes('_')) {
            attempt = attempt.replace(/_[^_]+$/, '');
            id = await getItemIdBySku(attempt);
          }
        }
        if (!id) {
          id = await createInventoryItem(sku, item.product_name, parseFloat(item.sale_price));
          if (id) log(`✅ Auto-created NS item for SKU ${sku} → ID ${id}`);
        }
        itemIdMap[sku] = id || null;
      }

      const nsOrder = mapTiktokOrderToNetsuite(fullOrder, customerId, itemIdMap);
      const result = await createSalesOrder(nsOrder);
      const nsId = result?.id || 'unknown';
      saveSyncedOrder(order.id, nsId);
      log(`✅ TikTok Order ${order.id} → NetSuite Sales Order ${nsId}`);

    } catch (err) {
      log(`❌ TikTok Order ${order.id} failed: ${err.message}`, 'error');
    }
  }
}

module.exports = { syncTiktokOrdersToNetsuite };
