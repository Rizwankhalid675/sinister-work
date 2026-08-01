// Public (unauthenticated) resolution of a published claim-intake form by
// its opaque publicSlug. Intentionally does NOT go through
// requireInternalAccess. Only forms with status "published" are resolvable;
// draft/unpublished/archived forms return 404 to avoid leaking existence.
// Rate limited per-IP to blunt scraping/enumeration.

import { checkRateLimit, clientIpFromRequest } from "../../lib/rateLimit.js";

const IP_LIMIT = { windowMs: 60 * 1000, max: 60 };

const route = async ({ request, reply, api, logger }) => {
  try {
    const slug = request.params?.slug;
    if (!slug || typeof slug !== "string" || slug.length < 6) {
      await reply.code(400).send({ success: false, error: "Invalid form reference" });
      return;
    }

    const ip = clientIpFromRequest(request);
    const ipCheck = checkRateLimit(`public-form:ip:${ip}`, IP_LIMIT);
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
        name: true,
        instructions: true,
        fields: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!form || form.status !== "published") {
      await reply.code(404).send({ success: false, error: "Form not found" });
      return;
    }

    // Never expose id/status/publishedAt beyond what the customer needs to
    // render + submit the form.
    await reply.send({
      success: true,
      form: {
        name: form.name,
        instructions: form.instructions,
        fields: form.fields,
      },
    });
  } catch (error) {
    logger.error({ errorName: error?.name }, "Error resolving public claim form");
    await reply.code(500).send({ success: false, error: "Internal server error while resolving form" });
  }
};

export default route;
