require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const APP_KEY = process.env.TIKTOK_APP_KEY;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;
const BASE_URL = 'https://open-api.tiktokglobalshop.com';

function generateSign(path, params) {
  const excluded = ['access_token', 'sign'];
  const sortedKeys = Object.keys(params).filter(k => !excluded.includes(k)).sort();
  let signStr = APP_SECRET + path;
  for (const key of sortedKeys) {
    signStr += `${key}${params[key]}`;
  }
  signStr += APP_SECRET;
  return crypto.createHmac('sha256', APP_SECRET).update(signStr).digest('hex');
}

function getCommonParams() {
  return {
    app_key: APP_KEY,
    access_token: process.env.TIKTOK_ACCESS_TOKEN,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    version: '202309',
  };
}

async function tiktokGet(path, extraParams = {}) {
  const params = { ...getCommonParams(), ...extraParams };
  params.sign = generateSign(path, params);
  const response = await axios.get(`${BASE_URL}${path}`, { params });
  if (response.data?.code !== 0) {
    throw new Error(`TikTok API error on ${path}: ${response.data?.message} (code ${response.data?.code})`);
  }
  return response.data?.data;
}

async function tiktokPost(path, body = {}, extraParams = {}) {
  const params = { ...getCommonParams(), ...extraParams };
  params.sign = generateSign(path, params);
  const response = await axios.post(`${BASE_URL}${path}`, body, { params });
  if (response.data?.code !== 0) {
    throw new Error(`TikTok API error on ${path}: ${response.data?.message} (code ${response.data?.code})`);
  }
  return response.data?.data;
}

// Get all orders from TikTok Shop
async function getOrders({ startTime, endTime, status = 'AWAITING_SHIPMENT' } = {}) {
  const shopId = process.env.TIKTOK_SHOP_ID;
  const now = Math.floor(Date.now() / 1000);
  const params = {
    shop_id: shopId,
    create_time_ge: startTime || (now - 24 * 60 * 60),
    create_time_lt: endTime || now,
    order_status: status,
    page_size: 50,
  };

  const allOrders = [];
  let cursor = null;

  while (true) {
    if (cursor) params.cursor = cursor;
    const data = await tiktokGet('/api/orders/search', params);
    const orders = data?.order_list || [];
    allOrders.push(...orders);
    if (!data?.next_cursor || orders.length < 50) break;
    cursor = data.next_cursor;
  }

  return allOrders;
}

// Get order details by order ID
async function getOrderDetail(orderId) {
  const shopId = process.env.TIKTOK_SHOP_ID;
  return await tiktokGet('/api/orders/detail/query', {
    shop_id: shopId,
    order_id_list: orderId,
  });
}

// Update tracking number on a TikTok order
async function updateTracking(orderId, trackingNumber, shippingProvider) {
  const shopId = process.env.TIKTOK_SHOP_ID;
  return await tiktokPost('/api/logistics/tracking', {
    order_id: orderId,
    tracking_number: trackingNumber,
    shipping_provider_id: shippingProvider || 'OTHER',
  }, { shop_id: shopId });
}

// Get all products from TikTok Shop
async function getProducts() {
  const shopId = process.env.TIKTOK_SHOP_ID;
  const allProducts = [];
  let cursor = null;

  while (true) {
    const params = { shop_id: shopId, page_size: 50 };
    if (cursor) params.cursor = cursor;
    const data = await tiktokGet('/api/products/search', params);
    const products = data?.products || [];
    allProducts.push(...products);
    if (!data?.next_cursor || products.length < 50) break;
    cursor = data.next_cursor;
  }

  return allProducts;
}

// Update product inventory/price on TikTok
async function updateProduct(productId, updates) {
  const shopId = process.env.TIKTOK_SHOP_ID;
  return await tiktokPost('/api/products/details', {
    product_id: productId,
    ...updates,
  }, { shop_id: shopId });
}

// Refresh access token using refresh token
async function refreshAccessToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    app_key: APP_KEY,
    refresh_token: process.env.TIKTOK_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  };
  const sortedKeys = Object.keys(params).sort();
  let signStr = APP_SECRET;
  for (const key of sortedKeys) signStr += `${key}${params[key]}`;
  signStr += APP_SECRET;
  const sign = crypto.createHmac('sha256', APP_SECRET).update(signStr).digest('hex');

  const response = await axios.get('https://auth.tiktok-shops.com/api/v2/token/refresh', {
    params: { ...params, sign, timestamp }
  });

  return response.data?.data;
}

module.exports = { getOrders, getOrderDetail, updateTracking, getProducts, updateProduct, refreshAccessToken };
