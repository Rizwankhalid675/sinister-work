# Sinister Diesel V2 — Master Project Constitution

Governing spec for all V2 work. This supersedes the prior shorter constitution file. Full text supplied verbatim by project owner; summarized here for quick reference during implementation. Do not replace, reinterpret, or re-architect.

**Mission:** build the industry-benchmark diesel performance ecommerce experience — premium, engineered, memorable — not an incremental revamp.

**Backend:** Miva Merchant stays the commerce engine; all business logic (products, categories, basket, checkout, accounts, orders, URLs, SEO, search, MVT, forms, APIs, analytics, integrations) must keep working. Everything visible may be redesigned.

**Legacy vs V2:** old frontend = Legacy, untouched, never deleted. New work = V2, built as inactive templates, previewed before activation.

**Design identity:** must not resemble Shopify/WooCommerce/Bootstrap/ReadyTheme/Tailwind-template. Creative direction: premium performance garage / motorsport engineering / American manufacturing / automotive tech company — not a catalog.

**Quality bar:** every component judged against "would Apple/Porsche/Rivian/DJI ship this, would it get an Awwwards nod" — if no, keep improving. No generic UI; every major page needs at least one signature/memorable experience.

**Design system:** one global system only (`css/sd2-global.css`) — no duplicated tokens, spacing, typography, colors, or component CSS. Canonical, reusable components only (Header, Mega Menu, Garage Selector, Vehicle Picker, Search Overlay, Drawer, Product Card, Category Card, Price Block, Buttons, Forms, Reviews, Gallery, Sticky Buy Box, Trust Block, FAQ, Timeline, Footer, Newsletter).

**UX arc:** Discover → Learn → Build → Compare → Trust → Buy → Install → Return → Come back (not just Browse → Cart → Checkout).

**Motion:** mechanical, premium, confident, purposeful — never flashy. Respect `prefers-reduced-motion`.

**Photography:** truck lifestyle, manufacturing, engineering, testing, dyno, installation, customers, engine bays — never generic stock.

**Content strategy:** the site should teach, not just sell — buying guides, install guides, build spotlights, platform guides, performance articles, comparison guides.

**Implementation rules:** never redesign while coding, never invent architecture mid-implementation, one milestone at a time, no skipping ahead, no rebuilding completed milestones, no re-discovery, no re-planning.

**Creative review:** never implement the first idea — generate multiple concepts, evaluate, choose strongest, refine, then implement.

**Self-review before completing any milestone:** Does this create emotion? Does it strengthen the Sinister Diesel identity? Is it memorable? Would enthusiasts share it? Portfolio-proud? If no, improve it.

**Output rules:** concise responses only — files created/modified, visual improvements, manual testing required, risks. No code explanations, no full unchanged files printed.

## Milestone roadmap
- **M0** — Creative exploration (multiple concepts before implementation)
- **M1** — Foundation *(complete)*
- **M2** — Global Components: Header, Mega Menu, Footer, Mobile Nav, Search Overlay, Garage Selector, Buttons, Cards
- **M3** — Homepage Experience
- **M4** — Category & Listing Experience
- **M5** — Search Experience
- **M6** — Product Detail Experience
- **M7** — Cart & Checkout Experience
- **M8** — Customer Dashboard
- **M9** — Final Polish (motion, accessibility, performance, responsive QA)

## Status
Architecture approved. Design system approved. Milestone 1 (Foundation) complete: `sd2-global.css` tokens/type/spacing/motion/icon system, plus inactive shells for Header V2, Footer V2, Garage Selector, Cart Drawer, Mobile Bottom Nav.

Renumbering note: this constitution's roadmap makes Global Components its own **Milestone 2** (previously bundled informally with M1/M2 in earlier session notes) and inserts a **Milestone 0** creative-exploration step preceding it. Proceeding next into Milestone 2 per this roadmap — generating multiple header/mega-menu/footer/search-overlay/card concepts before finalizing, per the Creative Review rule, since the previously-built header/footer/garage/cart/mobile-nav shells were single-pass and have not yet gone through explicit multi-concept evaluation.
