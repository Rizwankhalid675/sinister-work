import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "formSubmission" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "formSubmission-model",
  comment:
    "Append-only record of a single public claim-form submission attempt. resultingClaim is set only if a claim was actually created; rejectionReason explains failures (invalid order, product mismatch, etc). submissionFingerprint is used for best-effort duplicate-submission detection.",
  fields: {
    accepted: {
      type: "boolean",
      validations: { required: true },
      storageKey: "formSubmission-accepted",
    },
    client: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "client" },
      storageKey: "formSubmission-client",
    },
    form: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "claimForm" },
      storageKey: "formSubmission-form",
    },
    orderReference: {
      type: "string",
      storageKey: "formSubmission-orderReference",
    },
    rawAnswers: {
      type: "json",
      storageKey: "formSubmission-rawAnswers",
    },
    rejectionReason: {
      type: "string",
      storageKey: "formSubmission-rejectionReason",
    },
    resultingClaim: {
      type: "belongsTo",
      parent: { model: "claim" },
      storageKey: "formSubmission-resultingClaim",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "formSubmission-shop",
    },
    submissionFingerprint: {
      type: "string",
      storageKey: "formSubmission-submissionFingerprint",
    },
    submitterEmail: {
      type: "email",
      storageKey: "formSubmission-submitterEmail",
    },
    submitterIp: {
      type: "string",
      storageKey: "formSubmission-submitterIp",
    },
  },
};
