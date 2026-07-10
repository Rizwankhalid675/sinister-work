# Sinister Diesel V2 — Project Documentation

Full technical documentation for the **Sinister Diesel V2 theme** — a from-scratch
frontend redesign of the diesel-performance ecommerce site, built inside a Miva
Merchant theme directory alongside the untouched live ("Legacy") theme.

> **Governing spec:** [`V2_CONSTITUTION.md`](V2_CONSTITUTION.md) and
> [`V2_STRUCTURE.md`](V2_STRUCTURE.md) are the authoritative source. This document
> summarizes and organizes them for onboarding; where anything here conflicts with
> those two files, **those files win**. Read them in full before making any change.

---

## 1. What this project is

Sinister Diesel's storefront runs on **Miva Merchant**. Miva stays the commerce engine
— products, categories, basket, checkout, accounts, orders, URLs, SEO, search, MVT
templating, forms, APIs, analytics, and integrations all keep working. **Only the
visible frontend is being redesigned.**

The redesign is called **V2**. The existing frontend is **Legacy**. Legacy is never
deleted and never modified by V2 work. V2 templates and partials are created **inactive**
— building or editing one does *not* put it live. A V2 file goes live only when a human
manually assigns it to a copied test page in Miva Admin and reviews it.

**Mission (from the constitution):** build the industry-benchmark diesel-performance
ecommerce experience — premium, engineered, memorable. Creative direction is a premium
performance garage / motorsport engineering / American manufacturing / automotive tech
company — deliberately *not* a generic Shopify/WooCommerce/Bootstrap/ReadyTheme catalog.

---

## 2. Repository shape

There is **no build system, package manager, or test runner** in this directory. It is
exported/synced Miva Merchant theme content managed by the Miva MMT sync tool.

```
sinister-revamp/
├─ .mmt/                  Miva Merchant Theme sync metadata (tool-managed, not hand-edited)
│   ├─ config.json        remote key + branch (branch_name: "Revamp_v2")
│   └─ state.json         sync state
├─ templates/             ~1280 .mvt templates — mostly Legacy (live); V2 named *-v2 / sd2-v2-*
├─ partials/              V2 partial components (PDP, cart/checkout, dashboard, vehicle banner)
├─ css/
│   └─ sd2-global.css     THE single global V2 design system (tokens + all component CSS)
├─ js/
│   └─ sd2-v2-components.js  Shared V2 progressive-enhancement JS (no external deps)
├─ resourcegroups/        Miva resource-group manifests (which JS/CSS assets load)
│   ├─ footer_js.json
│   └─ footer_js_dev.json
├─ properties/            Miva property definitions exported from Admin (category, product, theme, readytheme_*)
├─ scratch/
│   ├─ v2-preview.html     Local-only preview scaffold (NOT deployable)
│   ├─ backups/
│   └─ crawler/            Node crawler tool with its own node_modules (unrelated to theme runtime)
├─ V2_CONSTITUTION.md     Governing spec — mission, rules, milestone roadmap
├─ V2_STRUCTURE.md        Governing spec — file inventory, canonical components, integration points
├─ CLAUDE.md              Instructions for Claude Code in this directory
└─ DOCUMENTATION.md       This file
```

### Naming convention

- **Legacy (live) templates**: plain names — `sfnt.mvt`, `srch.mvt`,
  `prod-product_display.mvt`, `bask.mvt`, etc.
- **V2 staging templates**: `-v2` suffix — `sfnt-v2.mvt`, `ctgy-v2.mvt`, `srch-v2.mvt`,
  `prod-product_display-v2.mvt`, `bask-v2.mvt`, `ocstv2.mvt`.
- **V2 components**: `sd2-v2-*` prefix — `sd2-v2-product-card.mvt`,
  `sd2-v2-garage-selector.mvt`, etc.
- **V2 CSS classes**: `.sd2-v2-*`. **V2 CSS tokens**: `--sd2-*`.
- **V2 JS hooks**: `data-v2-*` attributes.

---

## 3. Design system

There is **one** global design system and it lives in a single file:
[`css/sd2-global.css`](css/sd2-global.css).

- All colors, spacing, radius, shadow, typography, and motion are defined as `--sd2-*`
  tokens. **No duplicated tokens, spacing, typography, or component CSS may exist
  anywhere else** — not in templates, not in partials, not inline.
- The file is organized into layers: tokens → layout → components → commerce → listing →
  search → PDP.
- CSS must continue to reference `--sd2-*` tokens rather than hardcoded values.

### Canonical components (must not be duplicated inline)

| Component | Canonical location | CSS namespace |
| --- | --- | --- |
| Product Card | `templates/sd2-v2-product-card.mvt` | `.sd2-v2-pcard*` |
| Listing filters | (in design system) | `.sd2-v2-filter-rail`, `.sd2-v2-filter-sheet`, `.sd2-v2-chips`, `.sd2-v2-pgrid` |
| Price block | `templates/sd2-v2-price-block.mvt` | `.sd2-v2-price` |
| Quantity stepper | `templates/sd2-v2-quantity-stepper.mvt` | `.sd2-v2-qty` |
| Badges | `templates/sd2-v2-product-badges.mvt` | `.sd2-v2-badge` |
| Stock indicator | `templates/sd2-v2-stock-indicator.mvt` | `.sd2-v2-stock` |
| Media / gallery | `templates/sd2-v2-product-media.mvt` | `.sd2-v2-media` |
| Accordion | `templates/sd2-v2-accordion.mvt` | `.sd2-v2-accordion` |
| Sticky buy bar | `templates/sd2-v2-sticky-buy-bar.mvt` | `.sd2-v2-sticky-buy` |
| Garage selector | `templates/sd2-v2-garage-selector.mvt` | (delegated triggers) |

The **Product Listing V2** must reuse the canonical Product Card — it must not embed a
duplicate inline card.

---

## 4. JavaScript

Shared progressive-enhancement JS lives in
[`js/sd2-v2-components.js`](js/sd2-v2-components.js) — **no external dependencies**.

Rules:
- Modules initialize **only when their root hook (`data-v2-*`) exists** — they fail
  closed when their root component is absent.
- All `localStorage` access is wrapped in `try/catch` (must tolerate unavailable storage).
- **Fixed localStorage keys — never rename:** `sd2v2_garage`,
  `sd2v2_recent_searches`, `sd2_v2_recent_searches`.
- Component partials **must not contain inline scripts or styles.** External script
  includes are allowed only in inactive preview/template shells.
- Garage toggles are delegated so dynamically rendered account/cart/PDP controls open the
  same canonical Garage component.
- Gallery image switching, counters, thumbnail keyboard nav, and zoom are centralized in
  one Commerce Foundation gallery module.
- **Reduced-motion branches are required** wherever motion is added: count-up,
  hover/motion components, skeleton shimmer, filters, media, sticky buy, PDP tabs, cart
  progress, and drawer/sheet transitions.

---

## 5. Milestone roadmap

Work proceeds **one milestone at a time** — no skipping ahead, no rebuilding completed
milestones, no re-planning. (Roadmap per `V2_CONSTITUTION.md`.)

| # | Milestone | Notes |
| --- | --- | --- |
| M0 | Creative exploration | Generate multiple concepts before implementing |
| M1 | Foundation | **Complete** — `sd2-global.css` tokens/type/spacing/motion/icons + inactive shells for Header V2, Footer V2, Garage Selector, Cart Drawer, Mobile Bottom Nav |
| M2 | Global Components | Header, Mega Menu, Footer, Mobile Nav, Search Overlay, Garage Selector, Buttons, Cards |
| M3 | Homepage Experience | |
| M4 | Category & Listing Experience | |
| M5 | Search Experience | |
| M6 | Product Detail Experience | |
| M7 | Cart & Checkout Experience | |
| M8 | Customer Dashboard | |
| M9 | Final Polish | motion, accessibility, performance, responsive QA |

**Status:** Architecture and design system approved. M1 (Foundation) complete. See the
"Status" section of the constitution for the current active milestone.

> Note: `V2_STRUCTURE.md` lists a *separate* "Completed Milestones" numbering
> (Global Experience Layer → Final Production Polish) describing which experience layers
> have staging files built. The constitution's M0–M9 roadmap is the authoritative
> *process* order; the structure file's list is the *inventory* of what exists.

---

## 6. File inventory (V2)

The canonical, current inventory of every V2 file lives in
[`V2_STRUCTURE.md`](V2_STRUCTURE.md) — **do not re-derive it by scanning the folder.**
High-level groups:

- **Shared assets** — `css/sd2-global.css`, `js/sd2-v2-components.js`, `scratch/v2-preview.html`
- **Inactive V2 templates** — 14 staging templates (`*-v2.mvt`)
- **Canonical component partials** — garage selector, cart drawer, mobile nav, vehicle
  banner, perf strip, product card, build story, search components
- **Commerce foundation partials** — ~24 price/stock/badge/media/gallery primitives
- **PDP V2 partials** — ~15 product-detail sections
- **Cart + Checkout V2 partials** — ~20 cart/checkout sections
- **Customer Dashboard V2 partials** — ~18 account sections

### Already-migrated LIVE templates (exception to "all V2 is inactive")

Two batches of **live** templates have been restyled in place to the V2 shell (not routed
through staging `-v2` files) — see `V2_STRUCTURE.md` for the full list:

1. **Account / order templates** → `sd2-v2-account` / `sd2-v2-auth` shell:
   `acln`, `aced`, `acad`, `cabk` (+ `cabk-addressbook`), `cada`, `cade`, `cpca`, `cpcd`,
   `cpce`, `cpro`, `csub`, `wlst`, `ordh`, `ords`, `ordl`, `orhl`, `logn`, `acrt`.
2. **Static content / help pages** → `.sd2-v2-static-page` / Help Center shell:
   `help-center` + help sub-pages, `abus`, `customer-reviews`, `prpo`,
   `authorized-resellers`, `genuine-sinister-parts`, `faqs`, `smap`,
   `policies-terms-conditions`, `dlrq`, `rewards`, `mildisc`, `news`, `warr`, `spons`,
   `jobapplication`, and others.

---

## 7. Miva integration points

Before wiring any V2 template to live data, know where the data comes from:

```
Basket / cart totals                 &mvt:basket:*  and BASK actions
Checkout info/shipping/payment       OCST / OSEL / OPAY actions and gateway fields
Order history / detail               ORDH / ORDL / ORDS order arrays and links
Customer account data                ACLN / ACAD / ACED customer fields
Product data                         PROD product fields, custom fields, related products
Search data                          SRCH search term / result arrays
Category / listing data              CTGY product / category arrays and facets
Garage fitment                       future backend fitment data mapped to sd2v2_garage
Recommendations                      future product / cart recommendation source
Reviews / ratings                    future review provider or Miva review data
Shipping / tax                       Miva shipping, tax, and coupon calculations
```

**Vehicle Banner special case:** `partials/sd2-v2-vehicle-banner.mvt` cannot be included
as an arbitrary file. Register it in Miva Admin as a `readytheme` contentsection named
`vehicle_banner`, then reference it with
`<mvt:item name="readytheme" param="contentsection( 'vehicle_banner' )" />`.

---

## 8. Known placeholders & future backend wiring

Many V2 partials contain `[Placeholder]` content and are **not yet wired to live Miva
arrays.** Always check the "Known Placeholders" and "Future Backend Wiring Tasks"
sections of `V2_STRUCTURE.md` before assuming a partial is data-complete. Summary of what
still needs real data: homepage product/build-story media, search suggestions/popular/
guides/no-results, financing/warranty/delivery/rating/gallery on commerce foundation, PDP
gallery/video/specs/reviews/related/bundles, cart recommendations/free-shipping/coupon/
shipping/payment/tax/review, and customer dashboard order rows/tracking/invoices/timeline/
addresses/returns/settings persistence, plus CTGY product-array wiring for the listing.

### Known risk flagged in the codebase

`templates/spons.mvt` contains a **hardcoded monday.com API token in client-side JS**
(pre-existing, not introduced by V2 migration). This is a live credential exposure — it
needs manual rotation in monday.com's API settings. It was left untouched per the
"restyle only, don't touch API/token logic" instruction.

---

## 9. How to preview / QA

- **Local preview:** `scratch/v2-preview.html` (local-only scaffold; not deployable).
- **Miva preview:** manually copy the V2 template onto a *copied test page* in Miva Admin.
  Never assign a V2 file over a live template.
- **Responsive QA targets:** desktop, laptop, tablet, mobile — for header, mega menu,
  search, garage, listing filters, PDP, cart, checkout, and account dashboard.
- **Reduced-motion QA:** verify every motion component has a working reduced-motion branch.

---

## 10. Activation safety — hard rules

- V2 work is built **inactive**; creating/editing a file never puts it live.
- **Never overwrite or activate** `sfnt.mvt`, `srch.mvt`, `prod-product_display.mvt`,
  live header/footer, checkout, basket, or account templates with V2 files.
- Legacy templates are never deleted.
- One design system only (`css/sd2-global.css`, `--sd2-*` tokens).
- Never redesign while coding; never invent architecture mid-implementation; one
  milestone at a time.
- Component partials contain no inline scripts/styles.

---

## 11. Where V2 fits in the wider Work folder

This project is part of the larger Sinister Diesel operations Work folder. Related work:

- **`integrations/`** — NetSuite sync services (Miva↔NetSuite, TikTok↔NetSuite) and the
  NetSuite↔monday.com automation. The V2 store's monday.com help-page embeds and the
  `spons.mvt` token relate to the monday.com integration documented there.
- **`docs/Website-Audit-and-Improvement-Plan.md`** — the audit that motivated this revamp.
- **`daily-work/`** — dated scratch folders of one-off page work (mockups, prime-day
  pages, performance plans) that fed into V2 exploration.
