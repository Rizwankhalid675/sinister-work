// Staff evidence upload. Requires internal access with EDIT_CLAIMS on the
// claim's own shop (never a caller-supplied shop id) so a staff member can
// only attach evidence to claims within their assigned shop scope.

import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess } from "../../lib/internalAccess.js";
import { relationId } from "../../lib/claimPolicy.js";
import {
  createEvidenceRecords,
  validateEvidenceFilesPayload,
} from "../../lib/evidenceUpload.js";

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
    // Scope access to exactly this claim's own shop -- do not let the
    // caller widen this to "all" via query params on an upload route.
    const access = await requireInternalAccess({ api, session }, PERMISSIONS.EDIT_CLAIMS, shopId);
    if (!access.shopIds.includes(String(shopId)) && !access.includesLegacy) {
      await reply.code(403).send({ success: false, error: "Forbidden" });
      return;
    }

    const files = validateEvidenceFilesPayload(request.body?.files);
    const uploaderEmail = access.operator?.email || access.appUser?.email || null;

    const { created, failed } = await createEvidenceRecords(api, {
      claimId: claim.id,
      shopId,
      uploaderType: "staff",
      uploaderEmail,
      files,
    });

    await reply.code(created.length ? 201 : 502).send({
      success: created.length > 0,
      created,
      failed,
    });
  } catch (error) {
    logger.error(
      { errorName: error?.name, statusCode: error?.statusCode },
      "Error uploading claim evidence (staff)"
    );
    const statusCode = [400, 403, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({
      success: false,
      error: statusCode === 500 ? "Internal server error while uploading evidence" : error.message,
    });
  }
};

export default route;
