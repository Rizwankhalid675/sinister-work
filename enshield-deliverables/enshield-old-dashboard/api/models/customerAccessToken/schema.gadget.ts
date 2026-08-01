import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "customerAccessToken" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "customerAccessToken-model",
  comment:
    "An opaque, revocable, expiring token granting customer access to exactly one claim. token has a unique constraint. revokedAt/expiresAt control validity; a token is usable only when neither is in the past/set.",
  fields: {
    claim: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "claim" },
      storageKey: "customerAccessToken-claim",
    },
    createdReason: {
      type: "enum",
      default: "claim_created",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "claim_created",
        "customer_requested_renewal",
        "staff_reissued",
        "backfill",
      ],
      storageKey: "customerAccessToken-createdReason",
    },
    expiresAt: {
      type: "dateTime",
      includeTime: true,
      validations: { required: true },
      storageKey: "customerAccessToken-expiresAt",
    },
    lastUsedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "customerAccessToken-lastUsedAt",
    },
    revokedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "customerAccessToken-revokedAt",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "customerAccessToken-shop",
    },
    token: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "customerAccessToken-token",
    },
    useCount: {
      type: "number",
      default: 0,
      decimals: 0,
      storageKey: "customerAccessToken-useCount",
    },
  },
};
