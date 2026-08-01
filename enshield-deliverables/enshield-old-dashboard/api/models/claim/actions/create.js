import {
  applyParams,
  save,
} from "gadget-server";
import { writeAudit } from "../../../lib/audit.js";
import { generateToken, TOKEN_TTL_MS, expiryFromNow } from "../../../lib/authPassword.js";
import { persistClaimMutation } from "../../../lib/claimMutation.js";
import {
  permissionForClaimChange,
  relationId,
  validateClaimRelationships,
  validateMinorCurrencyPair,
} from "../../../lib/claimPolicy.js";
import {
  PERMISSIONS,
  requireIdentity,
  requirePermission,
} from "../../../lib/permissions.js";

/**
 * Create a claim. New claims always start in "Draft" (the schema default);
 * we stamp createdByEmail from the acting session and record an audit entry.
 * Status transitions after creation go through update.js (state machine).
 */
export const run = async ({ params, record, logger, api, session }) => {
  const input = params?.claim || {};
  if ("claimValue" in input || "orderValue" in input) {
    const error = new Error("Claim money must use minor-unit and currency fields");
    error.statusCode = 400;
    throw error;
  }
  const claimMoney = validateMinorCurrencyPair(
    input.claimValueMinor,
    input.claimCurrency,
    "claim"
  );
  const orderMoney =
    input.orderValueMinor == null && input.orderCurrency == null
      ? null
      : validateMinorCurrencyPair(
          input.orderValueMinor,
          input.orderCurrency,
          "order"
        );
  const normalizedInput = {
    ...input,
    claimValueMinor: claimMoney.amountMinor,
    claimCurrency: claimMoney.currency,
    ...(orderMoney
      ? {
          orderValueMinor: orderMoney.amountMinor,
          orderCurrency: orderMoney.currency,
        }
      : {}),
  };
  const requestedStatus = normalizedInput.status || "Draft";
  const initialStatus = ["Draft", "Submitted"].includes(requestedStatus)
    ? requestedStatus
    : "Draft";
  await requirePermission(
    { api, session },
    initialStatus === "Draft"
      ? PERMISSIONS.EDIT_CLAIMS
      : permissionForClaimChange("Draft", initialStatus)
  );
  const identity = await requireIdentity({ api, session });
  applyParams({ claim: normalizedInput }, record);

  const actorEmail = identity.user?.email || null;
  record.__actorEmail = actorEmail;
  if (actorEmail) {
    record.createdByEmail = actorEmail;
  }
  if (!record.trackingToken) {
    record.trackingToken = generateToken(20);
  }

  // Never allow a claim to be born in any state other than Draft/Submitted.
  // (Merchants may submit directly; agents create as Draft.)
  if (record.status && !["Draft", "Submitted"].includes(record.status)) {
    record.status = "Draft";
  }

  const shopId = relationId(record, "shop");
  if (String(shopId) !== String(identity.shopId)) {
    const error = new Error("Forbidden: claim shop does not match session shop");
    error.statusCode = 403;
    throw error;
  }
  await validateClaimRelationships({
    api,
    shopId: identity.shopId,
    clientId: relationId(record, "client"),
    orderId: relationId(record, "order"),
  });

  await persistClaimMutation({
    saveRecord: () => save(record),
    createAudit: () =>
      writeAudit(api, {
        action: "claim.create",
        entityType: "claim",
        entityId: record.id,
        shopId: identity.shopId,
        actorEmail,
        before: null,
        after: {
          status: record.status,
          claimValueMinor: record.claimValueMinor,
          claimCurrency: record.claimCurrency,
        },
      }),
  });

  // Issue the customer's access token for this claim. Best-effort: a failure
  // here must not roll back claim creation (the claim itself already
  // committed above); staff can always reissue a token later.
  try {
    await api.internal.customerAccessToken.create({
      claim: { _link: String(record.id) },
      shop: { _link: String(identity.shopId) },
      token: generateToken(32),
      expiresAt: expiryFromNow(TOKEN_TTL_MS.emailConfirmation),
      createdReason: "claim_created",
    });
  } catch (error) {
    logger?.warn?.(
      { error: error?.message, claimId: record.id },
      "failed to issue customerAccessToken at claim creation (non-fatal)"
    );
  }
};

export const options = {
  actionType: "create",
  transactional: true,
};
