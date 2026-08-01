/**
 * Backfill claims created before trackingToken / customerAccessToken existed
 * on the model. Idempotent — skips claims that already have a trackingToken,
 * and skips issuing a new customerAccessToken for any claim that already has
 * a non-revoked, non-expired one.
 */
import { generateToken, TOKEN_TTL_MS, expiryFromNow } from "../lib/authPassword.js";

export const run = async ({ api, logger }) => {
  const results = [];
  let cursor;
  do {
    const page = await api.claim.findMany({
      first: 250,
      after: cursor,
      select: { id: true, trackingToken: true, shopId: true },
    });

    for (const claim of page) {
      let trackingTokenAction = "skipped";
      if (!claim.trackingToken) {
        await api.claim.update(claim.id, { trackingToken: generateToken(20) });
        trackingTokenAction = "created";
      }

      let accessTokenAction = "skipped";
      const existingToken = await api.internal.customerAccessToken.maybeFindFirst({
        filter: {
          claim: { id: { equals: claim.id } },
          revokedAt: { isSet: false },
          expiresAt: { greaterThan: new Date().toISOString() },
        },
        select: { id: true },
      });
      if (!existingToken) {
        await api.internal.customerAccessToken.create({
          claim: { _link: String(claim.id) },
          shop: { _link: String(claim.shopId) },
          token: generateToken(32),
          expiresAt: expiryFromNow(TOKEN_TTL_MS.emailConfirmation),
          createdReason: "backfill",
        });
        accessTokenAction = "created";
      }

      results.push({ claimId: claim.id, trackingTokenAction, accessTokenAction });
    }

    cursor = page.hasNextPage ? page.endCursor : undefined;
  } while (cursor);

  const summary = {
    total: results.length,
    trackingTokensCreated: results.filter((r) => r.trackingTokenAction === "created").length,
    accessTokensCreated: results.filter((r) => r.accessTokenAction === "created").length,
  };
  logger.info({ summary }, "Backfilled claim tracking tokens and customer access tokens");
  return { success: true, summary, results };
};

export const options = {
  triggers: { api: true },
};
