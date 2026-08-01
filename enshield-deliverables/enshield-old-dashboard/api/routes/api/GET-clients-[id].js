import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";
import { deriveLegacyClientRollups } from "../../lib/legacyRollups.js";

const route = async ({ reply, api, logger, session, params = {} }) => {
  try {
    const { id } = params;
    if (!id) {
      const error = new Error("Client id is required");
      error.statusCode = 400;
      throw error;
    }

    const access = await requireInternalAccess({ api, session }, PERMISSIONS.VIEW_CLIENTS);

    const client = await api.client.findOne(id, {
      select: {
        id: true, storeName: true, storeId: true, platform: true, plan: true,
        status: true, claimCount: true, valueInTransit: true, valueInTransitMinor: true,
        valueInTransitCurrency: true, createdAt: true, shop: { id: true, name: true, domain: true },
      },
    }).catch(() => null);
    if (!client) return await reply.code(404).send({ success: false, error: "Client not found" });

    const isLegacyClient = !client.shop?.id;
    if (isLegacyClient && !access.includesLegacy) {
      return await reply.code(403).send({ success: false, error: "Forbidden" });
    }
    if (!isLegacyClient) {
      const allowedShops = new Set(access.shopIds.map(String));
      if (!allowedShops.has(String(client.shop.id))) {
        return await reply.code(403).send({ success: false, error: "Forbidden" });
      }
    }

    let rollup = {};
    let orders = [];
    let claims = [];

    if (isLegacyClient) {
      const clientFilter = { clientId: { equals: client.id } };
      const [orderRecords, claimRecords] = await Promise.all([
        api.legacyOrder.findMany({ filter: clientFilter, first: 100, sort: { placedAt: "Descending" }, select: { id: true, orderNumber: true, placedAt: true, status: true, isShipped: true, valueMinor: true, currency: true } }),
        api.legacyClaim.findMany({ filter: clientFilter, first: 50, sort: { createdAt: "Descending" }, select: { id: true, status: true, claimReason: true, createdAt: true } }),
      ]);
      orders = [...orderRecords];
      claims = [...claimRecords];
      const rollups = deriveLegacyClientRollups([client], orders, claims);
      rollup = rollups.get(String(client.id)) || {};
    } else {
      const [orderRecords, claimRecords] = await Promise.all([
        api.shopifyOrder.findMany({ filter: { shopId: { equals: client.shop.id } }, first: 100, sort: { shopifyCreatedAt: "Descending" }, select: { id: true, name: true, shopifyCreatedAt: true, financialStatus: true, fulfillmentStatus: true, currentTotalPriceSet: true } }),
        api.claim.findMany({ filter: { shopId: { equals: client.shop.id } }, first: 50, sort: { createdAt: "Descending" }, select: { id: true, status: true, claimReason: true, createdAt: true } }),
      ]);
      orders = [...orderRecords];
      claims = [...claimRecords];
    }

    await reply.send({
      success: true,
      client: { ...client, ...rollup },
      orders,
      claims,
    });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error fetching client detail");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({ success: false, error: statusCode === 500 ? "Internal server error while fetching client" : error.message });
  }
};

export default route;
