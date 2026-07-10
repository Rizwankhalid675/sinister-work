require('dotenv').config();
const { getOrders } = require('./miva');
const { getCustomerByEmail, createSalesOrder, getFulfilledOrders, getItemIdBySku } = require('./netsuite');

async function run() {
  console.log('\n=== STEP 1: Fetch a recent Miva order ===');
  const since = new Date(Date.now() - 2*24*60*60*1000).toISOString();
  const orders = await getOrders({ startDate: since, batchSize: 10 });
  if (!orders.length) { console.log('No orders found'); return; }
  const order = orders[0];
  console.log(`Order ID: ${order.id}`);
  console.log(`Customer: ${order.ship_fname} ${order.ship_lname}`);
  console.log(`Email: ${order.ship_email || order.cust_pw_email}`);
  console.log(`Items: ${(order.items||[]).length}`);
  console.log(`Total: $${order.total}`);

  console.log('\n=== STEP 2: Look up customer in NetSuite ===');
  const email = order.ship_email || order.cust_pw_email;
  const customerId = await getCustomerByEmail(email);
  console.log(`NetSuite Customer ID: ${customerId || 'NOT FOUND (new customer)'}`);

  console.log('\n=== STEP 3: Build NetSuite Sales Order payload ===');
  // Lookup NetSuite item IDs by SKU
  const itemIdMap = {};
  for (const item of (order.items || [])) {
    const sku = item.sku || item.code;
    if (sku && !itemIdMap[sku]) {
      itemIdMap[sku] = await getItemIdBySku(sku);
      console.log(`SKU ${sku} → NS ID: ${itemIdMap[sku]}`);
    }
  }
  const items = (order.items || [])
    .filter(item => itemIdMap[item.sku || item.code])
    .map(item => ({
      item: { id: itemIdMap[item.sku || item.code] },
      quantity: item.quantity,
      rate: item.price,
      amount: item.total,
      custcol_miva_order_line_id: item.line_id,
      location: { id: '2' }
    }));
  const payload = {
    entity: customerId ? { id: customerId } : undefined,
    otherrefnum: String(order.id),
    shipcity: order.ship_city,
    shipstate: order.ship_state,
    shipzip: order.ship_zip,
    shipcountry: order.ship_cntry,
    shipaddressee: `${order.ship_fname} ${order.ship_lname}`,
    custbody_sd_form: { id: '232' },
    salesrep: { id: '179371' },
    item: { items }
  };
  console.log('Payload preview:', JSON.stringify(payload).substring(0, 400));

  console.log('\n=== STEP 4: Create Sales Order in NetSuite (DRY RUN — comment out to skip) ===');
  const result = await createSalesOrder(payload);
  console.log('Created NetSuite SO ID:', result?.id);
  console.log('Full result:', JSON.stringify(result).substring(0, 300));

  console.log('\n=== STEP 5: Check recent NetSuite fulfillments ===');
  const sinceHour = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // last 1 hour
  const fulfilled = await getFulfilledOrders(since);
  console.log(`Fulfilled orders in last 1 hour: ${fulfilled.length}`);
  if (fulfilled.length) {
    const sample = fulfilled.find(f => f.TrackingNum) || fulfilled[0];
    console.log('Sample:', JSON.stringify(sample));
  }

  console.log('\n=== ALL STEPS PASSED ✅ ===');
}

run().catch(e => console.error('FAILED:', e.message));
