import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "claimForm" model, go to https://enshield-shipping-protection.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v2",
  storageKey: "claimForm-model",
  comment:
    "A client-specific, publishable claim-intake form definition. publicSlug is the sole trusted identifier for public resolution (opaque, unique, never a raw numeric/client ID). fields is an ordered JSON array of field configs (see formField-like shape). status controls whether the public route will accept submissions.",
  fields: {
    client: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "client" },
      storageKey: "claimForm-client",
    },
    createdByEmail: {
      type: "string",
      storageKey: "claimForm-createdByEmail",
    },
    fields: {
      type: "json",
      validations: { required: true },
      storageKey: "claimForm-fields",
    },
    instructions: {
      type: "richText",
      storageKey: "claimForm-instructions",
    },
    name: {
      type: "string",
      validations: { required: true },
      storageKey: "claimForm-name",
    },
    publicSlug: {
      type: "string",
      validations: { required: true, unique: true },
      storageKey: "claimForm-publicSlug",
    },
    publishedAt: {
      type: "dateTime",
      includeTime: true,
      storageKey: "claimForm-publishedAt",
    },
    shop: {
      type: "belongsTo",
      validations: { required: true },
      parent: { model: "shopifyShop" },
      storageKey: "claimForm-shop",
    },
    status: {
      type: "enum",
      default: "draft",
      acceptMultipleSelections: false,
      acceptUnlistedOptions: false,
      options: ["draft", "published", "unpublished", "archived"],
      validations: { required: true },
      storageKey: "claimForm-status",
    },
    submissions: {
      type: "hasMany",
      children: { model: "formSubmission", belongsToField: "form" },
      storageKey: "claimForm-submissions",
    },
  },
};
