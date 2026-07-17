# Enshield.com — Audit: Executive Summary

**Site:** enshield.com  |  **Platform:** GoDaddy Website Builder (React 17)  |  **Overall grade: C-**

Enshield sells a genuinely strong product — shipping protection that turns merchant risk into profit — but the current site **undersells it**. It's a functional brochure page limited by the builder, thin content, and no conversion structure.

## The 5 things holding it back

1. **No conversion path.** The hero has one vague button ("eCommerce Client") — no "Book a Demo," no lead capture. B2B buyers hit a dead end.
2. **Thin, repetitive content.** The headline "Redefining the standard…" repeats; there's no How-It-Works, no numbers, no depth for SEO.
3. **Zero social proof.** No logos, testimonials, stats, or case studies — fatal for a trust/insurance product.
4. **Builder bloat & slow load.** Heavy inline CSS + three tracking scripts (GA + Pixel + GTM) + PNG imagery hurt performance.
5. **Unfinished feel.** Placeholder "filler@godaddy.com" is visible in the account area.

## What we recommend
Rebuild the marketing front-end around a **conversion-first flow**:
**Hero + demo CTA → proof (logos/stats) → How It Works → profit story → testimonials → booking CTA.**

Keep the existing brand (dark + teal shield) — it's good. The attached **live mockup** (`enshield-mockup.html`) shows exactly this, ready to open in the meeting.

## Quick wins we can ship this week
- Add a clear **"Book a Demo"** CTA above the fold
- Remove placeholder data; fix the duplicate H1
- Add **FAQ + Organization schema (JSON-LD)** and a custom social-share image
- Consolidate analytics into GTM

## Bigger opportunity
Move off the GoDaddy builder to a lean **React/Next.js or static** front-end (using the mockup as the baseline), add a content/SEO layer, and quantify the profit story with real merchant numbers.

**Bottom line:** The product is meeting-ready. The website isn't — yet. A focused rebuild turns a template brochure into a lead-generating asset.
