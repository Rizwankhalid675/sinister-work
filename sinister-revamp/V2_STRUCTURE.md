# Sinister Diesel V2 Structure

## Status

All V2 files are inactive unless manually wired to a copied test page in Miva Admin. No V2 template in this inventory is activated over a live template by file creation alone.

## Completed Milestones

```
1  Global Experience Layer
2  Homepage V2
3  Category / Engine Hub / Listing V2
4  Search Experience V2
5  Shared Commerce Foundation
6  Product Detail Experience V2
7  Cart + Checkout Experience V2
8  Customer Dashboard Experience V2
9  Final Production Polish
```

## Shared Assets

```
css/sd2-global.css                  Shared V2 tokens, layout, component, commerce, listing, search, and PDP CSS.
js/sd2-v2-components.js             Shared V2 progressive enhancement. No external dependencies.
scratch/v2-preview.html             Preview-only local scaffold. Not deployable.
```

## Inactive V2 Templates

```
templates/cssui-global-header-v2.mvt
templates/cssui-global-footer-v2.mvt
templates/cssui-mega-menu-v2.mvt
templates/cssui-search-console-v2.mvt
templates/sfnt-v2.mvt
templates/ctgy-v2.mvt
templates/ctgy-engine-v2.mvt
templates/ctgy-listing-v2.mvt
templates/srch-v2.mvt
templates/prod-product_display-v2.mvt
templates/prod-product_display-v2-test.mvt
templates/bask-v2.mvt
templates/ocst-v2.mvt
templates/account-dashboard-v2.mvt
```

## Canonical V2 Component Partials

```
templates/sd2-v2-garage-selector.mvt
templates/sd2-v2-cart-drawer.mvt
templates/sd2-v2-mobile-nav.mvt
partials/sd2-v2-vehicle-banner.mvt
templates/sd2-v2-perfstrip.mvt
templates/sd2-v2-product-card.mvt
templates/sd2-v2-build-story.mvt
templates/sd2-v2-search-results-header.mvt
templates/sd2-v2-search-suggestions.mvt
templates/sd2-v2-search-empty-state.mvt
```

## Commerce Foundation Partials

```
templates/sd2-v2-price-block.mvt
templates/sd2-v2-stock-indicator.mvt
templates/sd2-v2-shipping-badge.mvt
templates/sd2-v2-rating-summary.mvt
templates/sd2-v2-review-summary.mvt
templates/sd2-v2-quantity-stepper.mvt
templates/sd2-v2-buy-button.mvt
templates/sd2-v2-sticky-buy-bar.mvt
templates/sd2-v2-product-badges.mvt
templates/sd2-v2-savings-badge.mvt
templates/sd2-v2-fitment-badge.mvt
templates/sd2-v2-financing-badge.mvt
templates/sd2-v2-warranty-badge.mvt
templates/sd2-v2-delivery-estimate.mvt
templates/sd2-v2-trust-icons.mvt
templates/sd2-v2-spec-table.mvt
templates/sd2-v2-feature-list.mvt
templates/sd2-v2-accordion.mvt
templates/sd2-v2-product-media.mvt
templates/sd2-v2-product-media-container.mvt
templates/sd2-v2-image-gallery.mvt
templates/sd2-v2-thumbnail-rail.mvt
templates/sd2-v2-zoom-viewer.mvt
```

## PDP V2 Partials

```
partials/sd2-v2-product-hero.mvt
partials/sd2-v2-product-gallery.mvt
partials/sd2-v2-buy-box.mvt
partials/sd2-v2-product-summary.mvt
partials/sd2-v2-fitment-confirmation.mvt
partials/sd2-v2-specifications.mvt
partials/sd2-v2-installation-section.mvt
partials/sd2-v2-feature-grid.mvt
partials/sd2-v2-product-tabs.mvt
partials/sd2-v2-review-summary.mvt
partials/sd2-v2-review-preview.mvt
partials/sd2-v2-product-faq.mvt
partials/sd2-v2-shipping-information.mvt
partials/sd2-v2-related-products.mvt
partials/sd2-v2-complete-build.mvt
```

## Cart + Checkout V2 Partials

```
partials/sd2-v2-cart-drawer-polish.mvt
partials/sd2-v2-cart-page.mvt
partials/sd2-v2-cart-line-item.mvt
partials/sd2-v2-order-summary.mvt
partials/sd2-v2-coupon-area.mvt
partials/sd2-v2-shipping-estimator.mvt
partials/sd2-v2-empty-cart-state.mvt
partials/sd2-v2-checkout-layout.mvt
partials/sd2-v2-checkout-step-indicator.mvt
partials/sd2-v2-checkout-information.mvt
partials/sd2-v2-checkout-shipping.mvt
partials/sd2-v2-checkout-payment.mvt
partials/sd2-v2-checkout-review.mvt
partials/sd2-v2-address-card.mvt
partials/sd2-v2-shipping-method-card.mvt
partials/sd2-v2-payment-card.mvt
partials/sd2-v2-editable-section.mvt
partials/sd2-v2-validation-placeholder.mvt
partials/sd2-v2-mobile-checkout-bar.mvt
```

## Customer Dashboard V2 Partials

```
partials/sd2-v2-account-dashboard.mvt
partials/sd2-v2-account-welcome-header.mvt
partials/sd2-v2-account-summary.mvt
partials/sd2-v2-account-quick-actions.mvt
partials/sd2-v2-account-recent-orders.mvt
partials/sd2-v2-account-saved-vehicles-preview.mvt
partials/sd2-v2-account-orders.mvt
partials/sd2-v2-account-order-detail.mvt
partials/sd2-v2-account-garage.mvt
partials/sd2-v2-account-vehicle-card.mvt
partials/sd2-v2-account-addresses.mvt
partials/sd2-v2-account-address-card.mvt
partials/sd2-v2-account-returns.mvt
partials/sd2-v2-account-return-card.mvt
partials/sd2-v2-account-settings.mvt
partials/sd2-v2-account-profile-card.mvt
partials/sd2-v2-account-empty-state.mvt
```

## Canonical Component Rules

- Product Card V2 is canonical in `templates/sd2-v2-product-card.mvt` and `.sd2-v2-pcard*`.
- Vehicle Banner V2 markup exists in `partials/sd2-v2-vehicle-banner.mvt` for reference only. Because arbitrary file includes are not supported, register it in Miva Admin as `readytheme` contentsection `vehicle_banner` before using `<mvt:item name="readytheme" param="contentsection( 'vehicle_banner' )" />`.
- Listing filters are canonical in `.sd2-v2-filter-rail`, `.sd2-v2-filter-sheet`, `.sd2-v2-chips`, and `.sd2-v2-pgrid`; Product Listing V2 must not use duplicate inline product cards.
- Commerce primitives are canonical in the Commerce Foundation partials and reused by PDP via shared `.sd2-v2-price`, `.sd2-v2-qty`, `.sd2-v2-badge`, `.sd2-v2-stock`, `.sd2-v2-media`, `.sd2-v2-accordion`, and `.sd2-v2-sticky-buy` classes.
- New JS hooks use `data-v2-*`.
- Local storage keys remain `sd2v2_garage`, `sd2v2_recent_searches`, and `sd2_v2_recent_searches`; usage is guarded with `try/catch`.
- Reduced-motion branches exist for count-up, hover/motion components, skeleton shimmer, filters, media, sticky buy, PDP tabs, cart progress, and drawer/sheet transitions.
- Cart + Checkout V2 components are inactive reusable partials only. Live basket, checkout, account, and payment templates remain outside this V2 inventory.
- Customer Dashboard V2 components are inactive reusable partials only. Live account, address, order history, order detail, and return templates remain outside this V2 inventory.
- Shared drawer/panel triggers use `data-v2-*` hooks and fail closed when their root component is absent.
- Garage toggles are delegated so dynamically rendered account/cart/PDP controls open the same canonical Garage component.
- Gallery image switching, counters, thumbnail keyboard navigation, and zoom are centralized in the Commerce Foundation gallery module.

## Known Placeholders

- Homepage: generated/placeholder product and build-story media where production assets are unavailable.
- Search: suggested correction, popular products, buying guides, and discovery/no-results content placeholders.
- Commerce foundation: financing, warranty, delivery estimate, rating/review, and gallery data placeholders.
- PDP: additional gallery images, video, Buy Now, financing, specifications custom fields, install documents, review distribution, related products, bundle recommendations, and recently viewed content.
- Cart + Checkout: cart recommendations, free-shipping threshold/progress, delivery estimates, coupon validation, shipping methods, payment method fields, gateway validation, tax, and final review data.
- Customer Dashboard: order history rows, tracking/invoice links, order detail timeline, purchased products, address book data, return request data, profile settings persistence, notification preference persistence, and account empty-state copy.
- Category Hub / Engine Hub: legacy `category_depth` and `subcategory_count` gating is preserved from `ctgy.mvt`; product-listing fallback still requires confirmed CTGY product array wiring.

## Known Miva Integration Points

```
Basket / cart totals                 &mvt:basket:* and BASK actions
Checkout information/shipping/payment OCST/OSEL/OPAY actions and gateway fields
Order history/detail                 ORDH/ORDL/ORDS order arrays and links
Customer account data                ACLN/ACAD/ACED customer fields
Product data                         PROD product fields, custom fields, related products
Search data                          SRCH search term/result arrays
Category/listing data                CTGY product/category arrays and facets
Garage fitment                       future backend fitment data mapped to sd2v2_garage
Recommendations                      future product/cart recommendation source
Reviews/ratings                      future review provider or Miva review data
Shipping/tax                         Miva shipping, tax, and coupon calculations
```

## Future Backend Wiring Tasks

- Replace marked `[Placeholder]` content with real Miva arrays, custom fields, and service responses.
- Wire Category Hub, Engine Hub, and Product Listing staging templates to confirmed CTGY child category, product, facet, sort, and pagination arrays.
- Confirm BASK `basket:groups` iterator alias and Miva item/contentsection mapping before activating cart line-item composition via `partials/sd2-v2-cart-line-item.mvt`, then wire quantity updates, remove actions, coupon validation, shipping estimator, and totals.
- Preserve OCST parity from `ocst.mvt`, `ocst-customer.mvt`, `ocst-mivapay.mvt`, and `ocst-basket.mvt` before activating checkout fields, payment gateway fields, validation messages, and order review. Confirmed field names are documented in `templates/ocst-v2.mvt`.
- Wire customer dashboard order history, invoices, tracking, returns, addresses, profile updates, and preferences.
- Wire PDP reviews, related products, complete-build bundles, install documents, specs, and media galleries.
- Wire search suggestions, popular searches, recent searches handoff, spelling fallback, and no-results recommendations.

## QA Notes

- V2 templates and partials must remain inactive until reviewed and manually assigned to copied test pages.
- External script includes are allowed only in inactive preview/template shells; component partials must not contain inline scripts or styles.
- CSS must continue to use `--sd2-*` tokens for colors, spacing, radius, shadow, typography, and motion.
- JS modules must continue to initialize only when their root hook exists and must tolerate unavailable localStorage.
- Responsive QA targets: desktop, laptop, tablet, and mobile for header, mega menu, search, garage, listing filters, PDP, cart, checkout, and account dashboard.

## Activation Safety

- Do not overwrite or activate `sfnt.mvt`, `srch.mvt`, `prod-product_display.mvt`, header/footer live templates, checkout, basket, or account templates with V2 files.
- Preview through `scratch/v2-preview.html` locally or through manually copied Miva test pages only.
