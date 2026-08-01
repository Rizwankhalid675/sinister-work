import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess, shopIdFilter } from "../../lib/internalAccess.js";
import { currencyOf, money } from "../../lib/money.js";
import { hasEnshieldProtection } from "../../lib/protection.js";
import { projectLegacyOrder } from "../../lib/unifiedOrders.js";

const shopifySelect = {
  id: true, name: true, currentTotalPriceSet: true, originalTotalPriceSet: true,
  totalShippingPriceSet: true, totalRefundedSet: true, noteAttributes: true,
  financialStatus: true, fulfillmentStatus: true, cancelledAt: true, closedAt: true,
  processedAt: true, shopifyCreatedAt: true, email: true, phone: true,
  shippingAddress: true, billingAddress: true, trackingNumber: true,
  enshieldProtectionAmountMinor: true, enshieldProtectionCurrency: true,
  enshieldPricingVersion: true,
  shop: { id: true, name: true, domain: true },
};

const outputOrder = (order) => ({
  id: order.id,
  name: order.name,
  source: order.source || "shopify",
  value: money(order.currentTotalPriceSet),
  originalValue: money(order.originalTotalPriceSet),
  shippingValue: money(order.totalShippingPriceSet),
  refundedValue: money(order.totalRefundedSet),
  currency: currencyOf(order.currentTotalPriceSet) || "USD",
  protected: hasEnshieldProtection(order),
  protectionAmountMinor: order.enshieldProtectionAmountMinor ?? null,
  protectionCurrency: order.enshieldProtectionCurrency ?? null,
  pricingVersion: order.enshieldPricingVersion ?? null,
  financialStatus: order.financialStatus || null,
  fulfillmentStatus: order.cancelledAt ? "cancelled" : order.fulfillmentStatus || null,
  createdAt: order.shopifyCreatedAt || order.processedAt || null,
  closedAt: order.closedAt || null,
  cancelledAt: order.cancelledAt || null,
  email: order.email || null,
  phone: order.phone || null,
  trackingNumber: order.trackingNumber || null,
  shippingAddress: order.shippingAddress || null,
  billingAddress: order.billingAddress || null,
  shop: order.shop,
});

const route = async ({ reply, api, logger, session, params = {} }) => {
  try {
    const { id } = params;
    if (!id) {
      const error = new Error("Order id is required");
      error.statusCode = 400;
      throw error;
    }

    const access = await requireInternalAccess({ api, session }, PERMISSIONS.VIEW_ORDERS);

    if (String(id).startsWith("legacy:")) {
      if (!access.includesLegacy) {
        return await reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const legacyId = String(id).slice("legacy:".length);
      const order = await api.legacyOrder.findOne(legacyId, {
        select: {
          id: true, sourceKey: true, legacyId: true, platform: true, orderNumber: true,
          placedAt: true, status: true, isShipped: true, trackingNumber: true,
          valueMinor: true, shippingMinor: true, protectionCostMinor: true, currency: true,
          client: { id: true, storeName: true },
        },
      }).catch(() => null);
      if (!order) return await reply.code(404).send({ success: false, error: "Order not found" });
      const [claims, notes] = await Promise.all([
        api.legacyClaim.findMany({ filter: { orderId: { equals: legacyId } }, first: 50, select: { id: true, status: true, claimReason: true, createdAt: true } }).catch(() => []),
        Promise.resolve([]),
      ]);
      return await reply.send({ success: true, order: projectLegacyOrder(order), claims: [...claims] });
    }

    const order = await api.shopifyOrder.findOne(id, { select: shopifySelect }).catch(() => null);
    if (!order) return await reply.code(404).send({ success: false, error: "Order not found" });

    if (!access.includesLegacy) {
      const allowedShops = new Set(access.shopIds.map(String));
      if (!order.shop?.id || !allowedShops.has(String(order.shop.id))) {
        return await reply.code(403).send({ success: false, error: "Forbidden" });
      }
    }

    const claims = await api.claim.findMany({
      filter: { orderId: { equals: order.id } },
      first: 50,
      select: { id: true, status: true, claimReason: true, createdAt: true, claimValue: true },
    }).catch(() => []);

    await reply.send({ success: true, order: outputOrder(order), claims: [...claims] });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error fetching order detail");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({ success: false, error: statusCode === 500 ? "Internal server error while fetching order" : error.message });
  }
};

export default route;
