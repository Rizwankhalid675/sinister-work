# Admin Review — Categories Requiring a Miva Admin Decision (Not a Template Fix)

These 6 categories came from Miva's native category tree / sitemap, not from any hardcoded template link. No CTGY or navigation template change accomplishes anything here — the fix has to happen in Miva Admin against the category record itself.

**Path for every item below:** `Catalog → Categories → [category] → Category / URI / Active settings`

## 1. REMOVE_HIDE — recommended action, pending your go-ahead to execute in Admin

| Current URL | Category Title | Recommended Admin Action | Why |
|---|---|---|---|
| `/searchspring-tier-3.html` | Searchspring Tier 3 | Deactivate the category (set Active = No), or delete the URI so it 404s / falls out of the sitemap | Confirmed empty via live page check. Name is a Searchspring integration artifact (tiered facet config), not a real product category. Site is moving off Searchspring — nothing should point here. |
| `/searchspring-tier-4.html` | Searchspring Tier 4 | Same as above | Same as above. |
| `/vip-club.html` | VIP Club | Remove from the category tree entirely. If a VIP Club page should still exist, it belongs as a standalone content page, not a category | Not a product category by nature — a loyalty/rewards page that got placed in the category tree. Keeping it as a "category" with 0 products is a category-tree/data hygiene issue, not a template or navigation issue. |

**None of these 3 are linked from the mega menu, header, or footer** (confirmed by a repo-wide search of `cssui-global-header.mvt` and the mega-menu templates) — deactivating them in Admin will not break any visible navigation.

## 2. MAP — review only, no mapping applied yet

| Current URL | Category Title | Possible Target | Confidence | Needs |
|---|---|---|---|---|
| `/stacks.html` | Stacks | `/exhaust-tips.html` (real, populated category — 40 products) | Medium — name-based inference, not extracted evidence | **Business confirmation**: does "Stacks" actually mean exhaust tips/stacks in this catalog, or is it a distinct product line that just hasn't been populated yet? |
| `/intake.html` | Intake | Unresolved — 8 real, populated intake-related categories exist (per-platform Air Intakes for Powerstroke/Duramax/Cummins, Cold Air Intake, Cold Air Intake for Cummins, Intake Elbows/Manifolds ×2, one cross-platform combined page) | Low | **Business decision**: pick one of the 8 as the successor, or decide this generic "Intake" entry should just be retired since more specific categories already cover the space. |
| `/p1-innovations.html` | P1 Innovations | None found | Low | **Confirm whether the P1 Innovations brand relationship is still active.** No brand page or product category anywhere in the 238-category crawl references it. If the relationship has ended, this moves to REMOVE_HIDE above rather than MAP. |

**No mapping will be applied to any of these three until you confirm a decision per row.**

## What I will NOT do until you say so
- No CTGY/category template edits for these 6 URLs — they wouldn't fix anything, since the pages are dynamically generated from Miva's category tree.
- No redirects implemented.
- No category deactivation executed — that's an Admin action only you (or whoever has Admin access) can take.

Proceeding now to the remaining visual polish and PDP/search/category layout fixes that are genuinely template/CSS-controlled, per your instruction.
