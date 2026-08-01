import { applyParams, save } from "gadget-server";
import { relationId } from "../../../lib/claimPolicy.js";
import {
  PERMISSIONS,
  requireIdentity,
  requirePermission,
} from "../../../lib/permissions.js";
import { writeAudit } from "../../../lib/audit.js";

/**
 * Add a note to a claim. Internal notes are staff-only; customer-visible
 * notes are surfaced on the public claim tracking page. Requires
 * EDIT_CLAIMS. Notes are append-only (no update/delete actions exposed).
 */
export const run = async ({ params, record, logger, api, session }) => {
  await requirePermission({ api, session }, PERMISSIONS.EDIT_CLAIMS);
  const identity = await requireIdentity({ api, session });

  const input = params?.claimNote || {};
  const claimId = relationId(record, "claim") || relationId(input, "claim");
  if (!claimId) {
    const error = new Error("claim is required");
    error.statusCode = 400;
    throw error;
  }

  const claim = await api.internal.claim.findOne(String(claimId), {
    select: { id: true, shop: { id: true } },
  });
  if (!claim || String(relationId(claim, "shop")) !== String(identity.shopId)) {
    const error = new Error("Forbidden: claim does not belong to this shop");
    error.statusCode = 403;
    throw error;
  }

  applyParams({ claimNote: input }, record);
  record.shop = { _link: String(identity.shopId) };
  record.claim = { _link: String(claimId) };
  record.authorEmail = identity.user?.email || null;
  if (!record.visibility) {
    record.visibility = "internal";
  }

  await save(record);

  await writeAudit(api, {
    action: "claimNote.create",
    entityType: "claimNote",
    entityId: record.id,
    shopId: identity.shopId,
    actorEmail: record.authorEmail,
    after: { claimId, visibility: record.visibility },
  });

  return record;
};

export const options = {
  actionType: "create",
  transactional: true,
};
