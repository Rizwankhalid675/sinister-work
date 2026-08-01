import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "claimNote" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "claimNote-model",
  comment:
    "A note attached to a claim by a staff member. May be internal-only (visible only to staff) or customer-visible (shown on the public claim tracking page). Append-only; notes are never edited or deleted, only added.",
  fields: {
    authorEmail: {
      type: "string",
      validations: { required: true },
      storageKey: "claimNote-authorEmail",
    },
    body: {
      type: "string",
      validations: { required: true },
      storageKey: "claimNote-body",
    },
    claim: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "claim" },
      storageKey: "claimNote-claim",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "claimNote-shop",
    },
    visibility: {
      type: "enum",
      default: "internal",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["internal", "customer"],
      validations: { required: true },
      storageKey: "claimNote-visibility",
    },
  },
};
