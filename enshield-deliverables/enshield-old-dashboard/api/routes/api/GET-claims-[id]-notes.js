// List notes for a claim. Internal-visibility notes are only returned to
// staff with EDIT_CLAIMS (any VIEW_CLAIMS holder can still see customer-
// visible notes here, mirroring what the public tracking page would show,
// but internal notes require the higher bar).

import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";
import { relationId } from "../../lib/claimPolicy.js";

const route = async ({ request, reply, api, logger, session }) => {
  try {
    const claimId = request.params?.id;
    if (!claimId) {
      await reply.code(400).send({ success: false, error: "Claim id is required" });
      return;
    }

    const claim = await api.claim.maybeFindFirst({
      filter: { id: { equals: String(claimId) } },
      select: { id: true, shop: { id: true } },
    });
    if (!claim) {
      await reply.code(404).send({ success: false, error: "Claim not found" });
      return;
    }

    const shopId = relationId(claim, "shop");
    const access = await requireInternalAccess({ api, session }, PERMISSIONS.VIEW_CLAIMS, shopId);
    if (!access.shopIds.includes(String(shopId)) && !access.includesLegacy) {
      await reply.code(403).send({ success: false, error: "Forbidden" });
      return;
    }

    // Re-check the higher EDIT_CLAIMS bar (non-fatal): callers who only hold
    // VIEW_CLAIMS still get a 200 above, just filtered to customer-visible
    // notes only.
    let canSeeInternal = false;
    try {
      const editAccess = await requireInternalAccess({ api, session }, PERMISSIONS.EDIT_CLAIMS, shopId);
      canSeeInternal = editAccess.shopIds.includes(String(shopId)) || editAccess.includesLegacy;
    } catch (editError) {
      if (editError?.statusCode !== 403) throw editError;
    }

    const filter = canSeeInternal
      ? { claim: { id: { equals: claim.id } } }
      : { claim: { id: { equals: claim.id } }, visibility: { equals: "customer" } };

    const notes = await api.claimNote.findMany({
      filter,
      sort: { createdAt: "Descending" },
      first: 100,
      select: {
        id: true,
        body: true,
        visibility: true,
        authorEmail: true,
        createdAt: true,
      },
    });

    await reply.send({ success: true, notes });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error fetching claim notes");
    const statusCode = [400, 401, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({
      success: false,
      error: statusCode === 500 ? "Internal server error while fetching claim notes" : error.message,
    });
  }
};

export default route;
