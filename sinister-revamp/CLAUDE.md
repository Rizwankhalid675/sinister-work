# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Miva Merchant V2 theme directory for Sinister Diesel (diesel performance ecommerce): a from-scratch frontend redesign built alongside the live Legacy theme, which stays untouched. There is no build system, package manager, or test runner here — this is exported/synced Miva Merchant theme content (`.mmt/`, `templates/*.mvt`, `resourcegroups/*.json`, `css/`, `js/`, `partials/`, `properties/`).

**Read `V2_CONSTITUTION.md` and `V2_STRUCTURE.md` in full before making any change.** They are the governing spec, not optional background — they define the design system, milestone roadmap, canonical components, and activation-safety rules summarized below. If anything here conflicts with those two files, the files win.

## Non-negotiable rules

- Miva Merchant remains the commerce engine — all business logic (products, categories, basket, checkout, accounts, orders, search, MVT, forms, APIs) must keep working. Only the visible frontend is being redesigned.
- **V2 work is built inactive.** Creating or editing a V2 template/partial does not put it live. Preview only via `scratch/v2-preview.html` or a manually copied Miva Admin test page.
- **Never overwrite or activate** `sfnt.mvt`, `srch.mvt`, `prod-product_display.mvt`, live header/footer, checkout, basket, or account templates with V2 files.
- One global design system: `css/sd2-global.css`, tokens prefixed `--sd2-*`. No duplicated tokens, spacing, typography, or component CSS anywhere else.
- Shared progressive-enhancement JS lives in `js/sd2-v2-components.js` (no external dependencies). JS hooks use `data-v2-*` attributes; modules must initialize only when their root hook exists and must tolerate unavailable `localStorage` (wrap in try/catch).
- localStorage keys are fixed — never rename: `sd2v2_garage`, `sd2v2_recent_searches`, `sd2_v2_recent_searches`.
- Component partials must not contain inline scripts or styles. External script includes are allowed only in inactive preview/template shells.
- Canonical components must not be duplicated inline elsewhere — e.g. Product Card is canonical in `templates/sd2-v2-product-card.mvt` / `.sd2-v2-pcard*`; listing filters are canonical in `.sd2-v2-filter-rail` / `.sd2-v2-filter-sheet` / `.sd2-v2-chips` / `.sd2-v2-pgrid`.
- Work one milestone at a time per the roadmap in `V2_CONSTITUTION.md` (M0 creative exploration → M1 Foundation → M2 Global Components → M3 Homepage → M4 Category/Listing → M5 Search → M6 PDP → M7 Cart/Checkout → M8 Customer Dashboard → M9 Final Polish). Never invent architecture mid-implementation, never redesign while coding, don't skip ahead or rebuild completed milestones.
- Many V2 partials contain `[Placeholder]` content and are not yet wired to live Miva arrays — check the "Known Placeholders" and "Future Backend Wiring Tasks" sections of `V2_STRUCTURE.md` before assuming a partial is data-complete.

## Structure

- `templates/` — ~1280 `.mvt` templates: the vast majority are Legacy (live) templates; V2 templates/partials are named with a `sd2-v2-*` or `-v2` suffix (see the inventory in `V2_STRUCTURE.md` for the current canonical list — don't re-derive it by scanning, it's already enumerated there).
- `partials/` — V2 partial components (PDP sections, cart/checkout partials, customer dashboard partials, vehicle banner).
- `css/sd2-global.css` — the single global V2 design system (tokens, layout, component, commerce, listing, search, PDP CSS).
- `js/sd2-v2-components.js` — shared V2 progressive enhancement JS.
- `resourcegroups/*.json` — Miva resource group manifests (e.g. `footer_js.json`, `footer_js_dev.json`) controlling which JS/CSS assets load.
- `properties/` — Miva property definitions (category, product, theme, readytheme_*, etc.) exported from Admin.
- `.mmt/` — Miva Merchant Theme sync metadata (`config.json`, `state.json`); treat as tool-managed, not hand-edited.
- `scratch/` — local scratch work: `v2-preview.html` (local-only preview scaffold, not deployable), `backups/`, `crawler/` (a Node tool with its own `node_modules`, unrelated to the theme runtime), wiring notes.

## Miva integration points to know before wiring any V2 template

```
Basket / cart totals                 &mvt:basket:* and BASK actions
Checkout information/shipping/payment OCST/OSEL/OPAY actions and gateway fields
Order history/detail                 ORDH/ORDL/ORDS order arrays and links
Customer account data                ACLN/ACAD/ACED customer fields
Product data                         PROD product fields, custom fields, related products
Search data                          SRCH search term/result arrays
Category/listing data                CTGY product/category arrays and facets
```

The Vehicle Banner V2 partial (`partials/sd2-v2-vehicle-banner.mvt`) can't be included as an arbitrary file — it must be registered in Miva Admin as a `readytheme` contentsection (`vehicle_banner`) and referenced via `<mvt:item name="readytheme" param="contentsection( 'vehicle_banner' )" />`.

## QA expectations

- V2 templates/partials must remain inactive until reviewed and manually assigned to copied test pages in Miva Admin.
- Responsive QA targets: desktop, laptop, tablet, mobile — for header, mega menu, search, garage, listing filters, PDP, cart, checkout, and account dashboard.
- Reduced-motion branches are required wherever motion is added (count-up, hover/motion components, skeleton shimmer, filters, media, sticky buy, PDP tabs, cart progress, drawer/sheet transitions).
