import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "notificationEvent" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "notificationEvent-model",
  comment:
    "Durable, idempotent record of a claim-lifecycle notification (email) attempt. One row per logical notification event; deliveryState and attemptCount track retries. idempotencyKey has a unique constraint so a duplicate attempt can never create a second row.",
  fields: {
    attemptCount: {
      type: "number",
      default: 0,
      decimals: 0,
      storageKey: "notificationEvent-attemptCount",
    },
    claim: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "claim" },
      storageKey: "notificationEvent-claim",
    },
    deliveryState: {
      type: "enum",
      default: "pending",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["pending", "sending", "sent", "failed", "skipped"],
      validations: { required: true },
      storageKey: "notificationEvent-deliveryState",
    },
    eventType: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: [
        "claim_created",
        "under_review",
        "additional_info_required",
        "approved",
        "declined",
        "resolved",
        "closed",
        "status_changed_generic",
      ],
      validations: { required: true },
      storageKey: "notificationEvent-eventType",
    },
    failureReason: {
      type: "string",
      storageKey: "notificationEvent-failureReason",
    },
    fromStatus: {
      type: "string",
      storageKey: "notificationEvent-fromStatus",
    },
    idempotencyKey: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "notificationEvent-idempotencyKey",
    },
    lastAttemptAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "notificationEvent-lastAttemptAt",
    },
    providerMessageId: {
      type: "string",
      storageKey: "notificationEvent-providerMessageId",
    },
    recipientEmail: {
      type: "email",
      storageKey: "notificationEvent-recipientEmail",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "notificationEvent-shop",
    },
    testMode: {
      type: "boolean",
      default: false,
      storageKey: "notificationEvent-testMode",
    },
    toStatus: {
      type: "string",
      storageKey: "notificationEvent-toStatus",
    },
  },
};
