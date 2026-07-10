# Category Action Plan

Source of truth: `category_product_matrix.csv`, `empty_categories_review.csv`, `orphan_products_review.csv` (all generated from the crawl + targeted live WebFetch checks, no guessed mappings). Full per-row detail is in `category_action_plan.csv`; this file summarizes and proposes the smallest implementation.

## Summary

| Bucket | Count | Meaning |
|---|---|---|
| KEEP | 208 | Has real `productLinks` evidence from the crawl. No action needed. |
| KEEP_NAV | 24 | Zero products right now, but a structurally valid platform/apparel subcategory (e.g. "Lighting for Duramax," "Women's Hoodies"). Not linked from primary nav today. Leave as-is. |
| MAP | 3 | Empty pages that should potentially redirect to a populated category — **only 1 of 3 has a defensible target**, the other 2 are unresolved (see below, don't force a mapping). |
| REMOVE_HIDE | 3 | Dead Searchspring artifacts or non-category pages that don't belong in the category tree at all. |

**238 total categories, all accounted for.**

## Important scope finding

All 6 MAP/REMOVE_HIDE candidates share the same `linkedFrom`: **only `/site-map.html`**. A repo-wide search confirmed none of these 6 URLs are hardcoded in `cssui-global-header.mvt`, the mega menu, or the footer. `templates/smap.mvt` (the Site Map page) itself has zero hardcoded category links either — it pulls its category list dynamically from Miva's native category tree.

**This means the real fix for MAP/REMOVE_HIDE items is in Miva Admin (deactivating or redirecting the category record), not a template edit.** There is no template change that would remove these from the sitemap while they remain active categories in Miva's catalog. I'm flagging this now so the implementation step isn't planned around editing a file that won't produce the desired effect.

## MAP items — detail

| Current URL | Title | Recommended Target | Confidence | Why |
|---|---|---|---|---|
| `/stacks.html` | Stacks | `/exhaust-tips.html` (40 products) | **Medium** | Name-based inference, not extracted evidence. "Stacks" is common truck-community terminology for exhaust tips. Live breadcrumb check placed `/stacks.html` conceptually under "Exhaust Tips / Systems." Confirm with a human before implementing — this is the one MAP candidate that's actually actionable. |
| `/intake.html` | Intake | *(none — unresolved)* | **Low** | 8 real, populated intake-related categories exist (per-platform Air Intakes, Cold Air Intake, Cold Air Intake for Cummins, Intake Elbows/Manifolds ×2, a combined cross-platform page). No single unambiguous successor. Needs a human decision on which target(s), or whether this should just point at a platform picker instead of one category. |
| `/p1-innovations.html` | P1 Innovations | *(none — unresolved)* | **Low** | No brand page or category anywhere in the 238-category crawl matches "P1 Innovations." Live-confirmed empty, no error. Likely a discontinued brand partnership. Leaning REMOVE_HIDE rather than MAP, pending confirmation the brand relationship is actually gone. |

## REMOVE_HIDE items — detail

| Current URL | Title | Why |
|---|---|---|
| `/searchspring-tier-3.html` | Searchspring Tier 3 | Confirmed empty via live fetch. Name is a direct Searchspring integration artifact (tiered facet config). Site is moving off Searchspring — this should be removed, not migrated to a native equivalent. |
| `/searchspring-tier-4.html` | Searchspring Tier 4 | Same as above. |
| `/vip-club.html` | VIP Club | Not a product category by nature — a loyalty/rewards program page that's sitting in the Miva category tree for some reason. Should be excluded from category navigation entirely, not mapped to a product category. |

## Proposed smallest implementation (pending your review — not yet done)

1. **`/stacks.html` → `/exhaust-tips.html`**: the only mapping with defensible (if not certain) evidence. If confirmed, this would be a single Miva Admin action — either deactivate the `stacks` category and let its URL 301-redirect (if Miva's URL manager supports that per-category), or edit that one category record's "linked category" / redirect target. No template code changes are involved since the page isn't linked from any template.
2. **`/intake.html` and `/p1-innovations.html`**: leave unchanged until you decide how to resolve them — I won't force a target since the evidence doesn't support one.
3. **All 3 REMOVE_HIDE items**: deactivate the category record in Miva Admin (or point them to a Miva-native 404/redirect if that's the standard pattern here). No template edit accomplishes this, since `smap.mvt` renders them dynamically from the live category tree, not from static markup.
4. **KEEP_NAV (24 items)**: no action. They're not visible in primary nav today, so there's nothing to hide, and forcing them into nav or removing them isn't something the evidence supports either way.
5. **KEEP (208 items)**: no action.
6. **No product assignments changed. No Searchspring restored. No product data hardcoded anywhere** — every recommendation above is either "do nothing" or "an Admin-side category record change," consistent with your instructions.

## What still needs a human decision before anything is implemented

- Confirm or reject the `/stacks.html` → `/exhaust-tips.html` mapping (medium confidence, name-inference based).
- Decide `/intake.html`'s fate — pick one of the 8 real intake categories, split traffic across a platform picker, or leave dead.
- Confirm `/p1-innovations.html` is actually a dead brand relationship before hiding it.
- Confirm whether Miva Admin category deactivation is the correct mechanism here, or whether there's a different intended process for retiring dead categories in this store.

Waiting for your review before any implementation step.
