# Enshield.com — Website Audit Report

**Prepared for:** Brian
**Site:** https://enshield.com/
**Date:** July 2026
**Scope:** Full audit — Tech stack, SEO, Performance, UX/Conversion, Accessibility, Content, Mobile

---

## 1. Executive Summary (1-page)

Enshield.com is a **GoDaddy Website Builder** site (Starfield/Go Daddy WB 8.0.0000) selling shipping protection to eCommerce merchants. The product positioning is strong — "Build Profit into Every Checkout" is a compelling B2B angle — but the current site is **held back by the platform, thin content, and weak conversion structure**.

**Overall grade: C-** — a functional brochure site that undersells a genuinely good product.

### Top 5 priorities
| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **No clear conversion path / weak CTAs** — only "eCommerce Client" button, no demo funnel above the fold | 🔴 High | Low |
| 2 | **Thin content & duplicated headline** — "Redefining the standard…" repeats; no How-It-Works, no proof, no numbers | 🔴 High | Med |
| 3 | **Zero social proof** — no logos, testimonials, case studies, or stats to build B2B trust | 🔴 High | Med |
| 4 | **GoDaddy builder bloat** — heavy CSS/JS, Facebook Pixel + GTM + GA + reCAPTCHA all loading, slow LCP | 🟠 Med | Med |
| 5 | **Placeholder/leaked data** — "filler@godaddy.com" visible in account area; unfinished feel | 🟠 Med | Low |

### Recommendation
Rebuild the marketing front-end around a **conversion-first structure** (hero → proof → how-it-works → profit story → testimonials → booking CTA). The attached **live HTML mockup** (`enshield-mockup.html`) demonstrates this direction using the existing brand (dark + teal shield). This can ship as a static/Next.js front-end while keeping GoDaddy for the client portal if needed.

---

## 2. Technology Stack (detected)

| Layer | Detected |
|-------|----------|
| Platform | GoDaddy Website Builder 8.0.0000 (Starfield Technologies) |
| Hosting/CDN | GoDaddy (img1.wsimg.com asset CDN, AWS) |
| Frontend | React 17.0.2, core-js 3.32.2 |
| Analytics | Google Analytics, Facebook Pixel (ID 282429905966327), Google Tag Manager |
| Security | reCAPTCHA, TrustedSite badge |
| Fonts | Libre Franklin (headings→body), Cabin (Google Fonts, self-hosted via wsimg) |
| PWA | Yes — manifest.webmanifest + service worker (sw.js) |
| Misc | Open Graph tags present, appointments/booking widget |

**Notes:** React 17 is **two majors behind** (current is 19). Three separate tracking scripts (GA + Pixel + GTM) load on every page — consolidate through GTM to cut requests. The builder injects large inline CSS (multiple `data-glamor` stylesheets) that inflates HTML payload.

---

## 3. SEO Audit

**Strengths**
- ✅ Title tag present & keyword-rich: *"Enshield | Shipping Protection for Lost & Stolen Packages"*
- ✅ Meta description present and well-written
- ✅ Open Graph + Twitter Card tags configured
- ✅ Favicon set (multiple sizes), manifest, apple-touch-icons
- ✅ `lang="en-US"` set

**Issues**
- 🔴 **Duplicate H1 / repeated headline** — "Redefining the standard in Shipping Protection" appears multiple times; search engines see thin, repetitive content.
- 🔴 **Very little indexable text** — one short feature section; no blog, no FAQ content depth, no landing pages for keywords like "Shopify shipping protection," "package protection for merchants."
- 🟠 **No structured data** — missing Organization / Product / FAQPage schema (JSON-LD). FAQ schema alone could win rich results.
- 🟠 **OG image is a transparent logo** — poor social share preview; use a designed 1200×630 card.
- 🟠 **No visible sitemap.xml / robots.txt confirmation** — verify both exist and are submitted.
- 🟠 Generator meta exposes "Go Daddy Website Builder" — minor, but signals a template site.

**Recommendations**
1. One unique H1 per page; move repeated copy into distinct sections.
2. Add JSON-LD: `Organization`, `Product`/`Service`, `FAQPage`.
3. Build a content layer: `/how-it-works`, `/for-shopify`, `/for-woocommerce`, a resources/blog.
4. Create a custom OG share image.

---

## 4. Performance

**Likely issues (based on stack — recommend a Lighthouse/PageSpeed run to confirm numbers):**
- 🟠 **Large HTML document** — extensive inline builder CSS (`cxs-*` glamor sheets) shipped on first load.
- 🟠 **Render-blocking third-party JS** — many `img1.wsimg.com/blobby/.../radpack/@widget/...` bundles load synchronously.
- 🟠 **3× analytics/pixel scripts** (GA + FB Pixel + GTM) add network + main-thread cost.
- 🟠 **Hero uses large `blob-*.png` logo** served responsively — good — but format is PNG, not WebP/AVIF.
- ✅ Fonts use `font-display:swap` (good, avoids invisible text).
- ✅ Service worker present (repeat-visit caching benefit).

**Recommendations**
1. Run PageSpeed Insights on mobile + desktop and record Core Web Vitals (LCP, CLS, INP).
2. Convert hero/logo imagery to WebP/AVIF.
3. Defer/async non-critical scripts; consolidate tracking into GTM only.
4. On a rebuild, drop the builder's glamor CSS for a lean stylesheet (the mockup's CSS is ~15KB vs. the builder's inline sheets).

---

## 5. UX & Conversion

**Issues**
- 🔴 **No above-the-fold conversion action** — the hero has a headline and one "eCommerce Client" button; there's no "Book a Demo" or lead capture. B2B buyers need an obvious next step.
- 🔴 **No "How It Works"** — merchants can't quickly grasp integration effort or the profit mechanic.
- 🔴 **No proof** — zero logos, testimonials, stats, or case studies. For a trust product (insurance/protection), this is the single biggest gap.
- 🟠 **Weak information hierarchy** — three feature blocks (Ease of Mind / Integration / Turning Risk into Profit) are good copy but visually flat and buried.
- 🟠 **Ambiguous nav** — "eCommerce Client" reads like a portal login, not a signup CTA; label is unclear.
- 🟠 **Placeholder account data** ("filler@godaddy.com") shows the account UI is unfinished/misconfigured.
- 🟠 **Single booking widget low on page** — should be reinforced with a sticky/repeated CTA.

**Recommendations (reflected in the mockup)**
1. Hero with dual CTA: **"Book a Demo"** (primary) + "See how it works."
2. Add a **4-step How It Works** (Connect → Protect → Earn → Relax).
3. Add a **stats band** (+18% margin, 2M+ orders, <24h claims, 0 tickets — swap in real numbers).
4. Add **testimonials + logo strip**.
5. Add a **profit-story split** section visualizing the revenue upside.
6. Persistent header CTA + closing CTA band.

---

## 6. Accessibility

**Observed / likely**
- ✅ `lang` attribute set; SVG icons have some ARIA labels (e.g., Hamburger link labelled).
- 🟠 **Color contrast** — light-grey body text on white in the lower section (`rgb(94,94,94)` on white ≈ okay; verify all grey-on-grey combos meet WCAG AA 4.5:1).
- 🟠 **Repeated headline** can confuse screen-reader heading navigation.
- 🟠 Verify all interactive elements are keyboard-reachable and have visible focus states (builder defaults are inconsistent).
- 🟠 Confirm images have meaningful `alt` text (hero logo, feature graphic).

**Recommendations:** Run axe DevTools / Lighthouse a11y; fix contrast, ensure logical heading order, add focus outlines, confirm alt text.

---

## 7. Content & Messaging

**Strengths:** Positioning is sharp — "Build Profit into Every Checkout" and "monetize risk instead of absorbing it" are strong B2B hooks. The three-pillar framing (peace of mind / integration / profit) is the right story.

**Gaps:** No numbers, no proof, no differentiation vs. competitors (Route, Corso, etc.), no pricing/how-you-get-paid clarity, no FAQ depth, no objection handling. Copy tells but never *shows*.

**Recommendations:** Quantify claims, add competitor differentiation, clarify the merchant payout model, expand FAQ, add a short explainer video or animation.

---

## 8. Mobile

- ✅ Responsive viewport meta present; builder is responsive by default.
- 🟠 Verify hero logo doesn't dominate the mobile fold and push CTAs below the scroll.
- 🟠 Confirm tap targets ≥44px and nav drawer works cleanly.
- The mockup is built mobile-first with a collapsing nav and stacked sections.

---

## 9. Prioritized Action Plan

**Quick wins (this week)**
- Remove placeholder account data; add a clear "Book a Demo" primary CTA in the hero.
- Fix duplicate H1; add FAQ + Organization JSON-LD; create a custom OG image.
- Consolidate GA/Pixel into GTM.

**Near-term (2–4 weeks)**
- Add How-It-Works, stats band, testimonials, logo strip (see mockup).
- Convert images to WebP; defer non-critical JS; run + fix Lighthouse.

**Strategic (rebuild)**
- Move the marketing front-end off GoDaddy builder to a lean React/Next.js or static build using the mockup as the design baseline; keep the portal separately if required.
- Add content/SEO layer (platform landing pages + blog).

---

## 10. Deliverables in this package
- `enshield-mockup.html` — live, full-rebrand homepage mockup (open in any browser).
- `enshield-audit-report.md` — this detailed report.
- `enshield-exec-summary.md` — 1-page summary for the meeting.

> **Note on metrics:** Performance and accessibility numbers above are directional, inferred from the detected stack and page source. Before the meeting, run **PageSpeed Insights** and **Lighthouse** on the live URL to attach exact scores — I can generate those commands/steps on request.
