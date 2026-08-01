// Create a new client-scoped public claim-intake form (form builder "New form").
// publicSlug is always server-generated (opaque, high-entropy) -- never
// client-suppliable -- since it is the sole trust anchor for the public
// resolution route (see GET-public-form-[slug].js).
import { PERMISSIONS, requirePermission } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";
import { generateToken } from "../../lib/authPassword.js";

const route = async ({ request, reply, api, logger, session }) => {
  try {
    await requirePermission({ api, session }, PERMISSIONS.EDIT_CLIENTS);
    const body = request.body || {};
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const instructions = typeof body.instructions === "string" ? body.instructions : undefined;
    const fields = Array.isArray(body.fields) ? body.fields : [];
    const createdByEmail = typeof body.createdByEmail === "string" ? body.createdByEmail.trim() : "";

    if (!clientId) return reply.code(400).send({ success: false, error: "clientId is required" });
    if (!name) return reply.code(400).send({ success: false, error: "name is required" });

    const client = await api.client.maybeFindFirst({
      filter: { id: { equals: clientId } },
      select: { id: true, shop: { id: true } },
    });
    if (!client) return reply.code(404).send({ success: false, error: "Client not found" });

    // Confirm the caller's access actually covers this client's shop (or
    // legacy scope) before letting them create a form for it.
    const access = await requireInternalAccess({ api, session }, PERMISSIONS.EDIT_CLIENTS, undefined);
    const clientShopId = client.shop?.id ? String(client.shop.id) : null;
    const allowed = clientShopId
      ? access.shopIds.includes(clientShopId)
      : access.includesLegacy;
    if (!allowed) return reply.code(403).send({ success: false, error: "Forbidden" });

    const publicSlug = generateToken(12);

    const record = await api.claimForm.create({
      client: { _link: clientId },
      ...(clientShopId ? { shop: { _link: clientShopId } } : {}),
      name,
      ...(instructions !== undefined ? { instructions } : {}),
      publicSlug,
      fields,
      status: "draft",
      ...(createdByEmail ? { createdByEmail } : {}),
    });

    await reply.code(201).send({ success: true, form: record });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error creating claim form");
    const statusCode = [400, 401, 403, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
    await reply
      .code(statusCode)
      .send({ success: false, error: statusCode === 500 ? "Internal server error while creating claim form" : error.message });
  }
};
export default route;
