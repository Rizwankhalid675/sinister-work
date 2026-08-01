// Add a note to a claim. Staff-only (EDIT_CLAIMS), scoped to the claim's
// own shop the same way the evidence upload route is.

import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";
import { relationId } from "../../lib/claimPolicy.js";

const VISIBILITIES = new Set(["internal", "customer"]);

const route = async ({ request, reply, api, logger, session }) => {
  try {
    const claimId = request.params?.id;
    if (!claimId) {
      await reply.code(400).send({ success: false, error: "Claim id is required" });
      return;
    }

    const body = typeof request.body?.body === "string" ? request.body.body.trim() : "";
    if (!body) {
      await reply.code(400).send({ success: false, error: "Note body is required" });
      return;
    }
    const visibility = VISIBILITIES.has(request.body?.visibility) ? request.body.visibility : "internal";

    const claim = await api.claim.maybeFindFirst({
      filter: { id: { equals: String(claimId) } },
      select: { id: true, shop: { id: true } },
    });
    if (!claim) {
      await reply.code(404).send({ success: false, error: "Claim not found" });
      return;
    }

    const shopId = relationId(claim, "shop");
    const access = await requireInternalAccess({ api, session }, PERMISSIONS.EDIT_CLAIMS, shopId);
    if (!access.shopIds.includes(String(shopId)) && !access.includesLegacy) {
      await reply.code(403).send({ success: false, error: "Forbidden" });
      return;
    }

    // Route through the model's own create action so applyParams, the
    // tenant re-verification, and the audit write it performs all run --
    // do not construct the record directly from this route.
    const note = await api.claimNote.create({
      claim: { _link: String(claim.id) },
      body,
      visibility,
    });

    await reply.code(201).send({ success: true, note });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error creating claim note");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({
      success: false,
      error: statusCode === 500 ? "Internal server error while creating claim note" : error.message,
    });
  }
};

export default route;
