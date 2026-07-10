# Sinister Diesel — Website Audit & Improvement Plan
**Prepared:** June 2026  
**Platform:** Miva Merchant  
**Scope:** Template architecture, component health, checkout flow, SEO, and third-party integrations

---

## Executive Summary

The Sinister Diesel website is built on Miva Merchant and is a well-structured e-commerce store with a full feature set covering product display, checkout, customer accounts, subscriptions, loyalty, warranty, and marketing feeds. The site has grown organically over time and currently carries **several discontinued/deprecated components**, **orphaned pages**, and **redundant integrations** that add maintenance overhead and potential performance risk without delivering value.

This document covers:
1. What the site looks like today (structure, components, integrations)
2. What is broken, deprecated, or at risk
3. What can be improved across performance, checkout conversion, SEO, and maintainability

---

## Section 1: How the Website Works Today

### 1.1 Page Structure

The site has **143 pages** organized across the following functional areas:

| Area | Pages | Examples |
|---|---|---|
| Product & Category | PROD, PLST, CTGY, SRCH | Product display, category listing, search results |
| Checkout Flow | OCST, OSEL, OPAY, INVC, BASK | Full 4-step checkout |
| Customer Account | ACLN, CPRO, CPWD, CEML, CABK | Login, profile, addresses, password |
| Order Management | ORDH, ORDS, ORHL, INVC | Order history, status, invoice |
| Email Templates | EMAIL_ORDERCONF_*, EMAIL_SHIPMENT_*, etc. | 14 transactional email templates |
| Data Feeds | listrak_*, searchspring-feed, feed_data_* | 9 active data feeds |
| Content / Marketing | careers, vip-club, sponsorapp, videos-* | Brand & engagement pages |
| Returns & Warranty | RMRQ, RMFM, WARF, WARR, SARP | Returns, RMA, warranty |
| Affiliates | AFAD, AFED, AFCL, AFPW | Full affiliate program |
| Wishlists | WISH, WLST, WLAD, WLED | Wishlist management |
| Subscriptions | CSUB, CSBE, EMAIL_SUBSCRIPTION_* | Recurring order management |

### 1.2 Layout System

The site uses **6 page layouts**:

| Layout | Purpose |
|---|---|
| Storefront | Main wrapper — homepage, general pages |
| Category Display | Product listing and category pages |
| Product Details | Single product page |
| Landing Page #1 | Campaign / promotional pages |
| Landing Page #2 | Secondary campaign layout |
| Blank | Utility pages (feeds, print, maintenance) |

### 1.3 Global Slots

**4 global injection points** allow components to render across all pages without being assigned to each page individually:

| Slot | Visibility | Purpose |
|---|---|---|
| global_header | Internal only | Sitewide header rendering |
| global_footer | Internal only | Sitewide footer rendering |
| product_details_additional_data | Public | Extra data/widgets on product pages |
| product_list_additional_data | Public | Extra data/widgets on listing pages |

### 1.4 Component Ecosystem (110 Components)

The site uses **110 component codes** powered by **~45 unique modules**. Key modules include:

| Module | What It Does |
|---|---|
| `cmp-cssui-*` | Core UI components (basket, navigation, breadcrumbs, forms, search) |
| `cmp-mv-*` | Platform-level logic (payments, shipping, tax, order fields) |
| `readytheme` | Base theme layer |
| `cmp-mv-flex` | Flexible content injection |
| `cmp-mv-imagemachine` | Product image handling |
| `cmp-mv-attributemachine` | Product variant/attribute selection |
| `combofacets` | Faceted search filtering |
| `cmp-mv-shipestimate` | Shipping estimate calculator |

### 1.5 Checkout Flow

The current checkout path is:

```
Cart (BASK)
  └─► Customer Info (OCST)
        └─► Shipping & Payment Selection (OSEL)
              └─► Payment Info (OPAY)
                    └─► Invoice / Confirmation (INVC)
```

**Upsell gates** are inserted after shipping selection:
- `OUS1` — Single upsell product offer
- `OUSM` — Multiple upsell product offers

**Payment methods active:**
- Braintree (credit cards)
- PayPal Complete Payments (`paypalcp`)
- Apple Pay (`applepay`)
- MivaPay Vault (`mivapay`) — stored cards
- Split Payment (`splitpayment`)
- Gift Certificates (`giftcertificate`)
- Affirm BNPL (`mvaffirm`)

### 1.6 Third-Party Integrations

| Partner | Purpose | Status |
|---|---|---|
| SearchSpring | Site search + faceted filtering | Active |
| Listrak | Email marketing (customers, orders, products feeds) | Active |
| Zinrelo | Loyalty/rewards program | Active |
| Shopper Approved | Product review feed | Active |
| Extend | Warranty upsell | Active |
| Affirm | Buy Now Pay Later | Active |
| Braintree | Payment processing | Active |
| PayPal Complete Payments | Payment processing | Active |
| Apple Pay | Payment processing | Active |
| Kount | Fraud detection | Needs review |
| Amazon Pay | Payment processing | **Discontinued** |
| Google Analytics (mvga) | Analytics | **Deprecated** |
| UPS Developer Kit | Shipping rates | **Discontinued** |

---

## Section 2: Current Problems & Risks

### 2.1 Discontinued & Deprecated Components (High Priority)

These components are confirmed discontinued or deprecated and should be audited and removed:

#### Amazon Pay — 4 components still active
- `amazonpay`, `amazonpay_address`, `amazonpay_button`, `amazonpay_wallet`
- **Risk:** Dead code running on every page load these components appear on. Three dedicated checkout pages (`AMAZONPAY_OCST`, `AMAZONPAY_OPAY`, `AMAZONPAY_OSEL`) still exist and may be accessible to customers, leading to dead-end checkout experiences.
- **Action:** Remove all 4 components, archive the 3 Amazon Pay pages.

#### Legacy UPS Developer Kit — 1 component still present
- `ups` (module: `upsxml`)
- **Risk:** The discontinued UPS Developer Kit is a legacy integration that Miva has stopped supporting. If customers are seeing shipping rates from this module, they may get inaccurate or no rates.
- **Action:** Confirm what shipping rate module is currently in use. If UPS rates are needed, migrate to the current UPS integration. Remove the `ups` component.

#### Google Analytics (Deprecated) — 3 components still present
- `ga_jsencode`, `ga_tracking`, `ga_transaction`
- **Risk:** The `mvga` module is deprecated, meaning it likely loads outdated GA tracking code (Universal Analytics / GA3). Google sunset Universal Analytics in 2024. These components are injecting dead tracking code on every page.
- **Action:** Remove all 3 `mvga` components. Confirm GA4 is implemented via Google Tag Manager or a current Miva GA4 module.

---

### 2.2 Orphaned & Redundant Pages (Medium Priority)

| Page | Issue |
|---|---|
| `AMAZONPAY_OCST/OPAY/OSEL` | Amazon Pay discontinued — these pages serve no purpose |
| `SFNT_TEST` | Test version of storefront — should not be publicly accessible |
| `black_friday` | Named redirect page — confirm if it redirects properly year-round or should be seasonal |
| `UNDL` (Undelete kit) | Internal utility page — should be access-controlled |
| `OPRC` (Order Already Processed) | Edge case page — confirm it still renders correctly |
| `PATR` / `UATM` / `UATR` | Missing product attributes pages — may indicate incomplete product data |

---

### 2.3 Checkout Friction Points (Medium Priority)

- **No saved address pre-fill confirmation** — CADA/CADE pages exist but the checkout flow doesn't visibly leverage saved address book to pre-fill OCST.
- **Upsell placement** (`OUS1`/`OUSM`) — Upsells appear after shipping selection but before payment, which can feel disruptive. Industry standard is post-checkout upsells or inline suggestions on the cart page.
- **Minimum purchase gate** (`OMIN`) — Customers hit a dead-end if they don't meet a minimum. No obvious path to add more items.
- **PayPal Express separate return screen** (`PPRS`) — Adds an extra redirect step vs. inline resolution.
- **Split payment** is available but not prominently called out — this is a strong differentiator for large purchases.

---

### 2.4 SEO Gaps (Medium Priority)

- **`prodctgy_meta`** is present but there is no dedicated SEO audit page or automated schema injection visible in the component list.
- **`sitemap_exclude`** exists alongside `sitemap` — confirm which pages are being excluded and whether those exclusions are intentional (e.g., checkout pages should be excluded, but category/product pages must not be).
- **No structured data (JSON-LD) component** visible — Product schema, breadcrumb schema, and review schema should be injected on PROD/CTGY pages for Google rich results.
- **`http_headers`** component is present but its configuration should be reviewed — proper Cache-Control, security headers (CSP, HSTS, X-Frame-Options), and canonical header behavior all affect SEO and security.
- **Shopper Approved feed** (`feed_data_sa_products`) supplies review data but structured review markup on product pages was not confirmed — this is needed for Google star ratings in search results.

---

### 2.5 Performance Concerns (Medium Priority)

- **Component count:** 110 components across the site. While many are modular, each page likely renders 15–30 components. Any dead/deprecated components add unnecessary render weight.
- **Affirm loads twice per page in some configurations** — `mvaffirm_analytics` and `mvaffirm_analytics_head` both exist, as do `mvaffirm_aslowas` and `mvaffirm_aslowas_head`. Double-loading Affirm scripts can cause render-blocking.
- **PayPal head component** (`paypalcp_buttons_head`) — PayPal scripts should be loaded asynchronously. Confirm this is not a render-blocking script.
- **`readytheme`** — The ReadyTheme module is the base layer. If this has not been updated recently, it may be missing performance improvements from newer Miva releases.
- **`cmp-mv-flex`** (Flex Component) — Flex components are powerful but can become a dumping ground for inline content/scripts. A content audit of all Flex items is recommended.

---

## Section 3: Improvement Roadmap

### Priority 1 — Immediate (Clean Up Dead Weight)

| Task | Effort | Impact |
|---|---|---|
| Remove Amazon Pay components (4) and archive Amazon Pay pages (3) | Low | Reduces page load, eliminates dead checkout paths |
| Remove deprecated Google Analytics components (3) | Low | Stops loading dead tracking code |
| Confirm and remove UPS legacy component | Low | Eliminates discontinued module risk |
| Make `SFNT_TEST` access-controlled or remove | Low | Security / prevents customer confusion |

---

### Priority 2 — Short Term (1–4 Weeks)

| Task | Effort | Impact |
|---|---|---|
| Audit all Flex component content for outdated scripts or inline styles | Medium | Performance, maintainability |
| Review `http_headers` config — add CSP, HSTS, proper Cache-Control | Medium | Security + SEO |
| Confirm GA4 is correctly implemented (replace deprecated mvga) | Medium | Analytics accuracy |
| Confirm Affirm scripts are not double-loading | Low | Page speed |
| Confirm PayPal script loads asynchronously | Low | Page speed |
| Review `sitemap_exclude` list against current page inventory | Low | SEO coverage |
| Add JSON-LD structured data for Product, Breadcrumb, and Review schema | Medium | Google rich results, SEO |

---

### Priority 3 — Medium Term (1–3 Months)

| Task | Effort | Impact |
|---|---|---|
| Rework upsell placement — test post-checkout vs. pre-payment | Medium | Checkout conversion |
| Add visible "add more items" CTA on the minimum purchase page (OMIN) | Low | Checkout conversion |
| Promote split payment visibility on cart and checkout pages | Low | Average order value |
| Review Kount integration — confirm it is active, licensed, and tuned | Medium | Fraud prevention |
| Audit subscription email templates (6 templates) for branding consistency | Low | Customer experience |
| Conduct product data audit — address PATR/UATM/UATR trigger frequency | Medium | Conversion, SEO |
| Update ReadyTheme if behind current release | Medium | Performance, compatibility |

---

### Priority 4 — Ongoing

| Task | Frequency | Notes |
|---|---|---|
| Review data feeds (9 active) for accuracy and freshness | Monthly | Listrak, Zinrelo, SearchSpring, Google Shopping, Extend |
| Monitor Shopper Approved review feed for schema rendering | Quarterly | Confirm star ratings appear in Google SERPs |
| Audit new pages added against layout/slot assignment | Per release | Prevents orphaned pages accumulating |
| Check for Miva platform updates | Per release | Security patches, module updates |

---

## Section 4: Quick Wins Summary

These are the lowest-effort, highest-impact actions to take first:

1. **Remove Amazon Pay** — 4 components + 3 pages gone. No customer can accidentally reach a broken checkout path.
2. **Remove deprecated Google Analytics** — 3 components removed. No dead tracking code running on every page.
3. **Confirm GA4 is live** — Without this, conversion and traffic data may have gaps since GA3 sunset.
4. **Check Affirm double-load** — A 5-minute template check could eliminate a render-blocking script duplicate.
5. **Lock down SFNT_TEST** — One permission change prevents a duplicate storefront from being indexed or visited by customers.

---

## Appendix: Full Component Inventory by Category

### Payment Components
`payment`, `paymentcards`, `paymentmethod`, `paymentmethods`, `paymentsettings`, `braintree`, `applepay`, `mivapay`, `splitpayment`, `giftcertificate`, `paypalcp_buttons`, `paypalcp_buttons_head`, `paypalcp_credit`, `mvaffirm_analytics`, `mvaffirm_analytics_head`, `mvaffirm_aslowas`, `mvaffirm_aslowas_head`

### Product & Category Components
`product`, `product_attributes`, `product_display`, `product_display_imagemachine`, `attributemachine`, `category`, `category_listing`, `category_title`, `category_tree`, `all_products`, `facets`, `combination_facets`, `related_products`, `search_results`, `searchfield`, `prod_ctgy_hdft`, `prodctgy_meta`, `discount_volume`, `upsale`, `upsell_attr_mult`

### Checkout & Order Components
`basket`, `order`, `order_contents`, `order_customer`, `orderhistory_list`, `backorder`, `shipment`, `shippingmethods`, `shipestimate`, `shipestimate_rates`, `tax`, `splitpayment`, `view_order`

### Customer & Account Components
`customer`, `customerlink`, `customercredithistory`, `customerwishlists`, `addressbook`, `addressfields`, `paymentcards`, `subscriptions`, `subscriptionfields`

### Feed & Analytics Components
`feed_data_order`, `feed_data_product`, `templatefeed`, `ga_jsencode` *(deprecated)*, `ga_tracking` *(deprecated)*, `ga_transaction` *(deprecated)*, `zinrelo`, `zinrelo_transaction`

### Deprecated / Discontinued Components
`amazonpay`, `amazonpay_address`, `amazonpay_button`, `amazonpay_wallet`, `ups`, `ga_jsencode`, `ga_tracking`, `ga_transaction`

---

*Document prepared from Miva Merchant template exports: pages, layouts, page slots, and component assignments.*
