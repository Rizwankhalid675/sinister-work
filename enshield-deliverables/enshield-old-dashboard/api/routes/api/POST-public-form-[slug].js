// Public (unauthenticated) claim-form submission. Resolves the form by its
// opaque publicSlug, validates the submitted order/product reference belongs
// to the form's own client+shop, and — if valid — creates a Draft claim on
// the customer's behalf plus a customerAccessToken for tracking. Every
// attempt (accepted or rejected) is recorded as an append-only
// formSubmission row for staff visibility/abuse detection, independent of
// whether a claim was actually created.
//
// Tenant isolation: the form's client/shop are the ONLY trust anchors here.
// Nothing in the request body can select a different client or shop —
// orderReference is looked up scoped to the form's own shop, and rejected if
// it doesn't resolve there.

import crypto from "node:crypto";
import { checkRateLimit, clientIpFromRequest } from "../../lib/rateLimit.js";
import { generateToken, TOKEN_TTL_MS, expiryFromNow } from "../../lib/authPassword.js";
import { validateClaimRelationships } from "../../lib/claimPolicy.js";

const IP_LIMIT = { windowMs: 60 * 1000, max: 10 };
const FINGERPRINT_LIMIT = { windowMs: 60 * 60 * 1000, max: 3 };

function fingerprintFor({ formId, submitterEmail, orderReference }) {
  return crypto
    .createHash("sha256")
    .update(`${formId}:${(submitterEmail || "").toLowerCase()}:${(orderReference || "").trim()}`)
    .digest("hex");
}

async function recordSubmission(api, { form, body, accepted, rejectionReason, resultingClaimId, ip, fingerprint }) {
  try {
    await api.formSubmission.create({
      form: { _link: String(form.id) },
      client: { _link: String(form.client.id) },
      shop: { _link: String(form.shop.id) },
      ...(resultingClaimId ? { resultingClaim: { _link: String(resultingClaimId) } } : {}),
      submitterEmail: typeof body.email === "string" ? body.email.trim() : undefined,
      submitterIp: ip,
      orderReference: typeof body.orderReference === "string" ? body.orderReference.trim() : undefined,
      submissionFingerprint: fingerprint,
      accepted,
      ...(rejectionReason ? { rejectionReason } : {}),
      rawAnswers: body.answers && typeof body.answers === "object" ? body.answers : {},
    });
  } catch (error) {
    // Best-effort audit trail; never let a logging failure block/rollback a
    // legitimate submission (or mask a rejection already being returned).
  }
}

const route = async ({ request, reply, api, logger }) => {
  const slug = request.params?.slug;
  const body = request.body || {};
  const ip = clientIpFromRequest(request);

  try {
    if (!slug || typeof slug !== "string" || slug.length < 6) {
      await reply.code(400).send({ success: false, error: "Invalid form reference" });
      return;
    }

    const ipCheck = checkRateLimit(`public-form-submit:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(ipCheck.retryAfterMs / 1000))
        .send({ success: false, error: "Too many requests. Please try again shortly." });
      return;
    }

    const form = await api.claimForm.maybeFindFirst({
      filter: { publicSlug: { equals: slug } },
      select: {
        id: true,
        status: true,
        client: { id: true },
        shop: { id: true },
      },
    });

    if (!form || form.status !== "published") {
      await reply.code(404).send({ success: false, error: "Form not found" });
      return;
    }

    const orderReference =
      typeof body.orderReference === "string" ? body.orderReference.trim() : "";
    const submitterEmail = typeof body.email === "string" ? body.email.trim() : "";

    const fingerprint = fingerprintFor({ formId: form.id, submitterEmail, orderReference });
    const fpCheck = checkRateLimit(`public-form-submit:fp:${fingerprint}`, FINGERPRINT_LIMIT);
    if (!fpCheck.allowed) {
      await reply
        .code(429)
        .header("Retry-After", Math.ceil(fpCheck.retryAfterMs / 1000))
        .send({
          success: false,
          error: "A submission for this order/email was already received. Please try again later.",
        });
      return;
    }

    if (!orderReference) {
      await recordSubmission(api, {
        form,
        body,
        accepted: false,
        rejectionReason: "missing_order_reference",
        ip,
        fingerprint,
      });
      await reply.code(400).send({ success: false, error: "Order reference is required" });
      return;
    }

    // Resolve the order strictly within the form's own shop -- never let a
    // client-supplied order reference resolve across tenants.
    const order = await api.shopifyOrder.maybeFindFirst({
      filter: {
        AND: [
          { shop: { id: { equals: String(form.shop.id) } } },
          {
            OR: [
              { name: { equals: orderReference } },
              { confirmationNumber: { equals: orderReference } },
            ],
          },
        ],
      },
      select: { id: true, name: true },
    });

    if (!order) {
      await recordSubmission(api, {
        form,
        body,
        accepted: false,
        rejectionReason: "order_not_found",
        ip,
        fingerprint,
      });
      await reply
        .code(404)
        .send({ success: false, error: "We could not find that order. Please check the order number and try again." });
      return;
    }

    // Belt-and-suspenders: re-confirm client/order/shop relationships using
    // the same policy the authenticated create route relies on.
    await validateClaimRelationships({
      api,
      shopId: form.shop.id,
      clientId: form.client.id,
      orderId: order.id,
    });

    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
    if (!reason) {
      await recordSubmission(api, {
        form,
        body,
        accepted: false,
        rejectionReason: "missing_reason",
        ip,
        fingerprint,
      });
      await reply.code(400).send({ success: false, error: "A reason for the claim is required" });
      return;
    }

    const trackingToken = generateToken(20);
    const claim = await api.claim.create({
      shop: { _link: String(form.shop.id) },
      client: { _link: String(form.client.id) },
      order: { _link: String(order.id) },
      reason,
      status: "Submitted",
      trackingToken,
      createdByEmail: submitterEmail || undefined,
    });

    let customerAccessToken = null;
    try {
      customerAccessToken = await api.internal.customerAccessToken.create({
        claim: { _link: String(claim.id) },
        shop: { _link: String(form.shop.id) },
        token: generateToken(32),
        expiresAt: expiryFromNow(TOKEN_TTL_MS.emailConfirmation),
        createdReason: "public_form_submission",
      });
    } catch {
      logger.warn(
        { context: "customerAccessToken issuance" },
        "failed to issue customerAccessToken for public form submission (non-fatal)"
      );
    }

    await recordSubmission(api, {
      form,
      body,
      accepted: true,
      resultingClaimId: claim.id,
      ip,
      fingerprint,
    });

    await reply.code(201).send({
      success: true,
      claim: {
        id: claim.id,
        trackingNumber: claim.trackingToken,
      },
      trackingToken: customerAccessToken?.token || trackingToken,
    });
  } catch (error) {
    logger.error(
      { context: "public claim form submission" },
      "Error handling public claim form submission"
    );
    const statusCode = [400, 403, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
    await reply
      .code(statusCode)
      .send({
        success: false,
        error:
          statusCode === 500
            ? "Internal server error while submitting claim"
            : error.message,
      });
  }
};

export default route;
