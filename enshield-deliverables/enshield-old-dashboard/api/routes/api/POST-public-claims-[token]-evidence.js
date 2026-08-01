// Customer evidence upload via their opaque tracking token (the same token
// family used by GET /api/public-claims/:token). Only a live, unrevoked,
// unexpired customerAccessToken -- or the legacy bare claim.trackingToken
// fallback -- authorizes an upload. Rate limited per-token/per-IP to blunt
// brute-force token guessing on this write path.

import { checkRateLimit, clientIpFromRequest } from "../../lib/rateLimit.js";
import { relationId } from "../../lib/claimPolicy.js";
import {
  createEvidenceRecords,
  validateEvidenceFilesPayload,
} from "../../lib/evidenceUpload.js";

const IP_LIMIT = { windowMs: 60 * 1000, max: 10 };
const TOKEN_LIMIT = { windowMs: 60 * 60 * 1000, max: 20 };

async function resolveClaimViaAccessToken(api, token) {
  const matches = await api.internal.customerAccessToken.findMany({
    filter: { token: { equals: token } },
    first: 1,
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      claim: { id: true, shop: { id: true } },
    },
  });
  const accessToken = [...matches][0];
  if (!accessToken) return null;
  if (accessToken.revokedAt) return null;
  if (accessToken.expiresAt && new Date(accessToken.expiresAt).getTime() < Date.now()) return null;
  return accessToken.claim || null;
}

async function resolveClaimViaLegacyTrackingToken(api, token) {
  const matches = await api.claim.findMany({
    filter: { trackingToken: { equals: token } },
    first: 1,
    select: { id: true, shop: { id: true } },
  });
  return [...matches][0] || null;
}

const route = async ({ request, reply, api, logger }) => {
  try {
    const token = request.params?.token;
    if (!token || typeof token !== "string" || token.length < 10) {
      await reply.code(400).send({ success: false, error: "Invalid tracking token" });
      return;
    }

    const ip = clientIpFromRequest(request);
    const ipCheck = checkRateLimit(`public-evidence:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(ipCheck.retryAfterMs / 1000))
        .send({ success: false, error: "Too many requests. Please try again shortly." });
      return;
    }
    const tokenCheck = checkRateLimit(`public-evidence:token:${token}`, TOKEN_LIMIT);
    if (!tokenCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(tokenCheck.retryAfterMs / 1000))
        .send({ success: false, error: "Too many requests. Please try again shortly." });
      return;
    }

    const claim =
      (await resolveClaimViaAccessToken(api, token)) ||
      (await resolveClaimViaLegacyTrackingToken(api, token));

    if (!claim) {
      await reply.code(404).send({ success: false, error: "Claim not found" });
      return;
    }

    const shopId = relationId(claim, "shop");
    const files = validateEvidenceFilesPayload(request.body?.files);
    const submitterEmail =
      typeof request.body?.email === "string" ? request.body.email.trim() : null;

    const { created, failed } = await createEvidenceRecords(api, {
      claimId: claim.id,
      shopId,
      uploaderType: "customer",
      uploaderEmail: submitterEmail,
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
      "Error uploading claim evidence (customer token)"
    );
    const statusCode = [400, 404].includes(error?.statusCode) ? error.statusCode : 500;
    await reply.code(statusCode).send({
      success: false,
      error: statusCode === 500 ? "Internal server error while uploading evidence" : error.message,
    });
  }
};

export default route;
