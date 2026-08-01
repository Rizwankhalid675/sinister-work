// Public (unauthenticated) claim tracking lookup by opaque token.
// Intentionally does NOT go through requireInternalAccess — this is a
// customer-facing endpoint reached via emailed tracking links. Only a
// deliberately narrow projection of claim fields is exposed; no PII beyond
// what the customer themselves already knows (their own claim).
//
// Resolution order:
//   1. Try the token as a customerAccessToken (preferred: expiring,
//      revocable, usage-tracked). Rejected if expired or revoked.
//   2. Fall back to the claim's legacy bare `trackingToken` field, for
//      claims/emails created before customerAccessToken existed. This path
//      never expires and is not revocable -- callers should prefer minting a
//      customerAccessToken for any claim still relying on it (see the
//      backfill script).
//
// Rate limited per-IP and per-token to blunt brute-force token guessing,
// since these tokens are the only access control on this route.

import { checkRateLimit, clientIpFromRequest } from "../../lib/rateLimit.js";

const IP_LIMIT = { windowMs: 60 * 1000, max: 30 };
const TOKEN_LIMIT = { windowMs: 60 * 1000, max: 10 };

const PUBLIC_CLAIM_SELECT = {
  id: true,
  status: true,
  reason: true,
  claimValueMinor: true,
  claimCurrency: true,
  createdAt: true,
  updatedAt: true,
  trackingNumber: true,
  order: { id: true, name: true },
};

async function resolveClaimViaAccessToken(api, token) {
  const matches = await api.internal.customerAccessToken.findMany({
    filter: { token: { equals: token } },
    first: 1,
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      useCount: true,
      claim: PUBLIC_CLAIM_SELECT,
    },
  });
  const accessToken = [...matches][0];
  if (!accessToken) return { claim: null, accessToken: null };
  if (accessToken.revokedAt) return { claim: null, accessToken: null, reason: "revoked" };
  if (accessToken.expiresAt && new Date(accessToken.expiresAt).getTime() < Date.now()) {
    return { claim: null, accessToken: null, reason: "expired" };
  }
  return { claim: accessToken.claim || null, accessToken };
}

async function resolveClaimViaLegacyTrackingToken(api, token) {
  const matches = await api.claim.findMany({
    filter: { trackingToken: { equals: token } },
    first: 1,
    select: PUBLIC_CLAIM_SELECT,
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
    const ipCheck = checkRateLimit(`public-claims:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(ipCheck.retryAfterMs / 1000))
        .send({ success: false, error: "Too many requests. Please try again shortly." });
      return;
    }
    const tokenCheck = checkRateLimit(`public-claims:token:${token}`, TOKEN_LIMIT);
    if (!tokenCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(tokenCheck.retryAfterMs / 1000))
        .send({ success: false, error: "Too many requests. Please try again shortly." });
      return;
    }

    const { claim: viaAccessToken, accessToken } = await resolveClaimViaAccessToken(api, token);
    const claim = viaAccessToken || (await resolveClaimViaLegacyTrackingToken(api, token));

    if (!claim) {
      await reply.code(404).send({ success: false, error: "Claim not found" });
      return;
    }

    if (accessToken) {
      try {
        await api.internal.customerAccessToken.update(accessToken.id, {
          lastUsedAt: new Date(),
          useCount: (accessToken.useCount || 0) + 1,
        });
      } catch {
        logger.warn(
          { context: "customerAccessToken usage tracking" },
          "failed to record customerAccessToken usage (non-fatal)"
        );
      }
    }

    await reply.send({ success: true, claim });
  } catch {
    logger.error({ context: "public claim tracking lookup" }, "Error fetching public claim by tracking token");
    await reply.code(500).send({ success: false, error: "Internal server error while fetching claim" });
  }
};

export default route;
