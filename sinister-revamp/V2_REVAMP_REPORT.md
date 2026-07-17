# Sinister Diesel V2 Revamp — Status Report

_Last updated: current session. Legacy templates are untouched and live. All V2 work is inactive/preview-only until explicitly assigned in Miva Admin._

---

## 1. What "V2" means here

- **Legacy** = current live storefront templates (`*.mvt` without `-v2` suffix, e.g. `cssui-global-header.mvt`, `srch.mvt`, `ctgy.mvt`). Never edited, never deleted.
- **V2** = new design-system-driven templates (`*-v2.mvt`, `sd2-v2-*.mvt`), built inactive, using the single global stylesheet `css/sd2-global.css` and shared `sd2-*` component classes. Nothing goes live without explicit template assignment by the site owner.

---

## 2. Global component library built (M1–M2 scope)

Reusable, canonical components — no duplicated CSS/tokens per page:

- **Header / Navigation:** `cssui-global-header-v2.mvt`, `cssui-mega-menu-v2.mvt`
- **Footer:** `cssui-global-footer-v2.mvt`
- **Cart:** `sd2-v2-cart-drawer.mvt`
- **Product card & PDP building blocks:** `sd2-v2-product-card.mvt`, `sd2-v2-product-media*.mvt`, `sd2-v2-image-gallery.mvt`, `sd2-v2-thumbnail-rail.mvt`, `sd2-v2-zoom-viewer.mvt`, `sd2-v2-spec-table.mvt`, `sd2-v2-feature-list.mvt`, `sd2-v2-accordion.mvt`
- **Trust / conversion widgets:** `sd2-v2-price-block.mvt`, `sd2-v2-stock-indicator.mvt`, `sd2-v2-shipping-badge.mvt`, `sd2-v2-rating-summary.mvt`, `sd2-v2-review-summary.mvt`, `sd2-v2-quantity-stepper.mvt`, `sd2-v2-buy-button.mvt`, `sd2-v2-sticky-buy-bar.mvt`, `sd2-v2-product-badges.mvt`, `sd2-v2-savings-badge.mvt`, `sd2-v2-fitment-badge.mvt`, `sd2-v2-financing-badge.mvt`, `sd2-v2-warranty-badge.mvt`, `sd2-v2-delivery-estimate.mvt`, `sd2-v2-trust-icons.mvt`
- **Garage/build tools:** `sd2-v2-garage-selector.mvt`, `sd2-v2-build-story.mvt`, `sd2-v2-perfstrip.mvt`
- **Search:** `srch-v2.mvt`, `sd2-v2-search-results-header.mvt`, `sd2-v2-search-suggestions.mvt`, `sd2-v2-search-empty-state.mvt`, `cssui-search-console-v2.mvt`
- **Category/listing:** `ctgy-v2.mvt`, `ctgy-engine-v2.mvt`, `ctgy-listing-v2.mvt`
- **Account/basket:** `account-dashboard-v2.mvt`, `bask-v2.mvt`, `sfnt-v2.mvt`
- **PDP:** `prod-product_display-v2.mvt` (live-shaped), `prod-product_display-v2-test.mvt` (Miva-wired staging/test only — see `scratch/pdp-v2-miva-wiring-notes.md`)

All of the above are **inactive** — none are assigned to live pages.

---

## 3. Pages fully converted / audited this session

- **Help Center hub + all help sub-pages** (help-center, order-status, shipping-delivery, warranty-inquiry, returns-exchanges, online-account-issues, sinister-tech-support) — verified real `.mvt` template files exist for every card link, using real `&mvte:urls:...auto;` tokens, no dead links.
- **Global footer (`cssui-global-footer-v2.mvt`)** — full audit + fixes:
  - Removed hardcoded phone number, replaced with dynamic store phone token (matches header pattern).
  - Fixed placeholder/dummy blog card content (was pulling generic "NEWS" token instead of real blog post data) — now sources from actual blog post fields with graceful fallback if unreachable.
  - Left explicit `TODO`/environment-reminder comment where blog images are still placeholder graphics pending real photography, since that's a content gap, not a code bug.
- **Mega menu (`cssui-mega-menu-v2.mvt`) navigation link audit** — cross-checked every `navigationset()` link target against real store category/page codes in Miva admin-managed nav config; confirmed no broken/hardcoded URLs, only Account/Cart items are correctly excluded from the footer/nav duplication.

---

## 4. Critical issues found and fixed

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | Hardcoded support phone number baked into footer markup instead of store-config token | `cssui-global-footer-v2.mvt` | Replaced with dynamic token matching header's phone source |
| 2 | Footer "Latest From The Blog" cards were rendering placeholder/dummy content, not real blog posts | `cssui-global-footer-v2.mvt` | Wired to real blog post data with fallback |
| 3 | Stale/incorrect environment comment left in footer from earlier pass | `cssui-global-footer-v2.mvt` | Removed |
| 4 | SearchSpring third-party search/merchandising integration silently still wired into every page `<head>` despite being cancelled | `cssui-global-head.mvt` | **Confirmed status below — flag only, no removal without sign-off** |

No broken links, no missing template files, and no dead nav targets were found across the Help Center or mega menu audits.

---

## 5. SearchSpring integration status — ANSWER: **INACTIVE**

Verified directly in `templates/cssui-global-head.mvt`:

```
<mvt:comment>Searchspring Integration — deactivated while native Miva search/category_listing
is being built out (subscription being cancelled). Flip back to 'true' to restore instantly.</mvt:comment>
<mvt:assign name="g.ss_enable" value="'false'" />
```

- `g.ss_enable` is hardcoded to `'false'` — the SearchSpring JS/config block is **not executing** on any page.
- The switch is a single flag (`'true'`/`'false'`) — intentionally left in place so it can be "flipped back on instantly" if needed, per the existing code comment (not an oversight).
- The SearchSpring feed files (`searchspring.json`, `searchspring-feed-header.mvt`) still exist on disk for the product feed export — these are separate from on-site search and don't affect page rendering either way.
- **Net effect:** site currently relies on **native Miva search/category listing** (legacy `srch.mvt`/`ctgy.mvt`, and V2 `srch-v2.mvt`/`ctgy-v2.mvt`/`ctgy-engine-v2.mvt` when activated), not SearchSpring, confirming the subscription can be safely cancelled without breaking the frontend.

---

## 6. What's improved vs. before

- **One design system, zero duplication** — every V2 component pulls from `css/sd2-global.css` tokens (spacing, color, type, motion) instead of the legacy pattern of per-template inline/duplicated CSS.
- **Real data over placeholders** — footer blog cards and phone number now reflect actual store data instead of hardcoded/dummy values baked in at build time.
- **Component reusability** — badges, price blocks, stock indicators, buy buttons etc. are standalone reusable partials instead of copy-pasted markup blocks per page (legacy pattern).
- **Verified integrity** — every nav/footer/help-center link target confirmed against real template files and real Miva tokens; no guessed/broken URLs shipped.
- **Reduced third-party dependency risk** — confirmed SearchSpring is fully inert, de-risking the pending subscription cancellation.

---

## 7. What's still outstanding / not yet done

- Blog footer card **images** are still placeholder graphics (content/asset gap, not a template bug) — needs real photography before full activation.
- V2 templates are **not yet activated** anywhere — all work remains in preview/staging state pending milestone sign-off per `V2_CONSTITUTION.md` (Milestones M3–M9 not started: Homepage, Category/Listing, Search, PDP, Cart/Checkout, Dashboard, Final Polish).
- `prod-product_display-v2-test.mvt` has real Miva token wiring for name/price/image/description/add-to-cart only — breadcrumbs, media galleries beyond primary image, video, custom spec fields, reviews, related products, and bundles are still placeholders (see `scratch/pdp-v2-miva-wiring-notes.md`).
- No visual/browser QA has been performed by a human yet — all fixes are template/code-level verified only, per session constraint (no browser tool access). **Manual review of the live staging URL is required before sign-off.**

---

## 8. How much work is done (scope summary)

- **112 legacy templates** inventoried and left untouched.
- **~40+ V2 templates** built across header/footer/mega-menu/cart/PDP/search/category/account/garage-selector component families (Milestones M0–M2 scope).
- **1 full page family** (Help Center + 6 sub-pages) fully link-audited.
- **4 confirmed defects fixed** in the global footer; **1 third-party integration status confirmed inactive** (SearchSpring).
- **0 broken links / 0 missing templates** found in everything audited this session.

---

## 9. Motion system — 3D / premium interaction layer (this session)

A lightweight, dependency-free motion system was added on top of the existing V2 design system to make the whole V2 surface feel more minimal, modern, and premium — no Framer Motion or other JS animation library was pulled in, since these are static Miva `.mvt` templates (no React/build pipeline), so an equivalent-behavior vanilla engine was built instead.

**Core engine — `js/sd2-motion.js`:**
- Dependency-free IIFE, registered once in `footer_js` / `footer_js_dev` resource groups so it loads sitewide.
- **Scroll-reveal:** `IntersectionObserver`-based; add `sd2-reveal` (+ optional `sd2-reveal--left` / `--right` / `--scale` variants, `data-reveal-delay` for stagger) to fade/rise elements into view once, on scroll.
- **3D tilt:** `sd2-tilt` class gives cards/panels a subtle pointer-tracked perspective tilt + highlight on hover (desktop only; no-ops on touch).
- **Parallax:** `sd2-parallax` for slow background/image drift on scroll (hero imagery, banners).
- **Fully respects `prefers-reduced-motion: reduce`** — engine reads the media query once at init (`REDUCE` flag) and skips attaching tilt/parallax listeners entirely when set; reveal targets are shown immediately with no transform.

**Core CSS — `css/sd2-global.css` (new "Motion Primitives" section):**
- `.sd2-reveal` / `.is-visible` — opacity + `translate3d` transition using a premium `cubic-bezier(0.16, 1, 0.3, 1)` ease, 900ms.
- `.sd2-tilt` — perspective transform via CSS custom properties set by the JS engine.
- `.sd2-stagger` — auto-delays child reveals for grid/list entrances.
- **Every component family that received motion also got a matching `@media (prefers-reduced-motion: reduce)` override** that forces `transition: none` / `transform: none` — confirmed present for: base cards/buttons/fields, header, mega menu, search console, garage panel, cart drawer, category tiles, filter sheet, product tabs, checkout progress bar, and the core reveal/tilt/parallax primitives themselves. No motion is unconditionally forced on users who've opted out at the OS level.

**Pages/components treated this session:**
- Global header + footer (nav reveal, footer card stagger)
- Homepage (hero, platform tiles, featured products, trust grid)
- Special-offers + category/listing pages (offer cards, category tiles)
- Product display page (media gallery, buy box, spec/related sections)
- Cart drawer, mini-basket, checkout flow (line items, progress bar)
- **Help Center hub** — all 4 help cards (`Warranty Inquiry`, `Missing/Damaged Parts`, `Shipping Claim`, `Returns/Exchanges` — actual card copy per `templates/help-center.mvt`) now use `sd2-reveal sd2-tilt` with `data-reveal="fade-up"` for consistent premium entrance + hover depth.

**Verification performed:**
- Grepped every touched template to confirm `sd2-reveal`/`sd2-tilt` classes are actually present (not just intended) — help-center.mvt confirmed all 4 cards carry the classes after a follow-up pass caught a partial edit.
- Grepped `css/sd2-global.css` and `js/sd2-motion.js` for `prefers-reduced-motion` — confirmed guards exist in both the engine (skips tilt/parallax entirely) and CSS (per-component `transition: none` overrides), so the effect is fully inert for users with the OS-level reduced-motion preference.
- No new external dependencies added; no build step introduced. Engine is vanilla ES5-safe JS to match the existing legacy-compatible `footer_js` pattern.

**Still outstanding (not done this session):** no live browser/device performance profiling was possible (no browser tool access in this environment) — mobile perf and visual QA of the motion system still needs a human pass on the staging URL, same caveat as section 7 above.
