// Fetch a single claim form (for the form builder edit view).
import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";

const route = async ({ params, reply, api, logger, session }) => {
  try {
    const id = params?.id;
    if (!id) return reply.code(400).send({ success: false, error: "Form id is required" });

    const access = await requireInternalAccess({ api, session }, PERMISSIONS.VIEW_CLIENTS, undefined);
    const form = await api.claimForm.maybeFindFirst({
      filter: { id: { equals: String(id) } },
      select: {
        id: true, name: true, instructions: true, publicSlug: true, fields: true,
        status: true, publishedAt: true, createdAt: true, createdByEmail: true,
        client: { id: true, storeName: true },
        shop: { id: true },
      },
    });
    if (!form) return reply.code(404).send({ success: false, error: "Claim form not found" });

    const formShopId = form.shop?.id ? String(form.shop.id) : null;
    const allowed = formShopId ? access.shopIds.includes(formShopId) : access.includesLegacy;
    if (!allowed) return reply.code(403).send({ success: false, error: "Forbidden" });

    await reply.send({ success: true, form });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error fetching claim form");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply
      .code(statusCode)
      .send({ success: false, error: statusCode === 500 ? "Internal server error while fetching claim form" : error.message });
  }
};
export default route;
