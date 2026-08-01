import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "claimEvidence" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "claimEvidence-model",
  comment:
    "A single private evidence file attached to a claim (image, document, or video). file is Gadget-managed storage, never publicly addressable. uploaderType/uploaderEmail record who added it for audit purposes. removedAt supports soft-delete without breaking referential history.",
  fields: {
    byteSize: {
      type: "number",
      decimals: 0,
      storageKey: "claimEvidence-byteSize",
    },
    claim: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "claim" },
      storageKey: "claimEvidence-claim",
    },
    file: {
      type: "file",
      allowPublicAccess: false,
      validations: { required: true },
      storageKey: "claimEvidence-file",
    },
    kind: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["image", "document", "video"],
      validations: { required: true },
      storageKey: "claimEvidence-kind",
    },
    mimeType: {
      type: "string",
      storageKey: "claimEvidence-mimeType",
    },
    originalFilename: {
      type: "string",
      storageKey: "claimEvidence-originalFilename",
    },
    removedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "claimEvidence-removedAt",
    },
    removedByEmail: {
      type: "string",
      storageKey: "claimEvidence-removedByEmail",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "claimEvidence-shop",
    },
    uploaderEmail: {
      type: "string",
      storageKey: "claimEvidence-uploaderEmail",
    },
    uploaderType: {
      type: "enum",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["staff", "customer", "public_form"],
      validations: { required: true },
      storageKey: "claimEvidence-uploaderType",
    },
  },
};
