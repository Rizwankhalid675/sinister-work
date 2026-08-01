// Update a claim form: edit fields/instructions/name, or change status
// (draft -> published -> unpublished/archived). publicSlug is immutable
// once created -- it is never accepted from the request body -- since
// changing it would silently invalidate/redirect any links already
// distributed to customers.
import { PERMISSIONS, requirePermission } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";

const STATUSES = new Set(["draft", "published", "unpublished", "archived"]);

const route = async ({ request, params, reply, api, logger, session }) => {
  try {
    await requirePermission({ api, session }, PERMISSIONS.EDIT_CLIENTS);
    const id = params?.id;
    if (!id) return reply.code(400).send({ success: false, error: "Form id is required" });

    const existing = await api.claimForm.maybeFindFirst({
      filter: { id: { equals: String(id) } },
      select: { id: true, status: true, shop: { id: true } },
    });
    if (!existing) return reply.code(404).send({ success: false, error: "Claim form not found" });

    const access = await requireInternalAccess({ api, session }, PERMISSIONS.EDIT_CLIENTS, undefined);
    const formShopId = existing.shop?.id ? String(existing.shop.id) : null;
    const allowed = formShopId ? access.shopIds.includes(formShopId) : access.includesLegacy;
    if (!allowed) return reply.code(403).send({ success: false, error: "Forbidden" });

    const body = request.body || {};
    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.instructions !== undefined) patch.instructions = body.instructions;
    if (Array.isArray(body.fields)) patch.fields = body.fields;
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) {
        return reply.code(400).send({ success: false, error: `status must be one of: ${[...STATUSES].join(", ")}` });
      }
      patch.status = body.status;
      if (body.status === "published" && existing.status !== "published") {
        patch.publishedAt = new Date();
      }
    }

    const record = await api.claimForm.update(String(id), patch);
    await reply.send({ success: true, form: record });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error updating claim form");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply
      .code(statusCode)
      .send({ success: false, error: statusCode === 500 ? "Internal server error while updating claim form" : error.message });
  }
};
export default route;
