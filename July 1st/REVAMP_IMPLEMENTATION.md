# Sinister Diesel Premium V3 Revamp

## Source Of Truth

- `homepage-v3-premium.html` is the full design mockup/reference file.
- The Miva-ready implementation is split into smaller paste/resource files so Header, Page Template, Footer, CSS, and JS can be managed separately.

## Active Files

- Header paste file: `premium-header-v3.html`
- Page/template paste file: `premium-template-v3.html`
- Footer paste file: `premium-footer-v3.html`
- One-box branch test file: `premium-single-box-test-v3.html`
- One-box inline fallback test file: `premium-single-box-inline-test-v3.html`
- Homepage CSS resource: `global-revamp-v2.css`
- Existing-page safe CSS resource: `global-revamp-v2-sitewide.css`
- JS resource: `global-revamp-v2.js`

## Miva Placement

- Paste `premium-header-v3.html` into the custom/global Header area for the branch.
- Paste `premium-template-v3.html` into the homepage/page content/template area.
- Paste `premium-footer-v3.html` into the custom/global Footer area for the branch.
- Upload or paste `global-revamp-v2.css` as the branch CSS resource.
- Upload or paste `global-revamp-v2.js` as the branch JS resource.

Important: `global-revamp-v2.css` contains the full homepage reset/layout system. Use it for the homepage premium single-box test only. Do not load it globally across existing category/search/product/account/cart pages unless those templates have been converted to the premium markup.

For current existing Miva pages, upload/use `global-revamp-v2-sitewide.css` instead. It contains only tokens and the scoped Miva page-family polish layer, so it preserves the native theme/product grid structure.

During testing, `premium-template-v3.html` includes direct links to the branch CSS/JS resource URLs. Once the Miva resource system is confirmed to output them reliably, those two direct lines can be removed from the template to avoid double loading.

## If Header Or Footer Do Not Render

If the homepage shows the body content but not the premium header/footer, Miva is rendering the page content/template area but is not injecting the custom Header/Footer boxes for that active branch/page template.

Use `premium-single-box-test-v3.html` as a temporary one-box test in the page/template content area. It contains:

- `premium-header-v3.html`
- `premium-template-v3.html`
- `premium-footer-v3.html`

If the single-box file shows the header and footer, the code is good and the issue is Miva placement/template assignment, not HTML/CSS.

Long-term, use the three-file setup once the active Miva template is confirmed to output the branch Header and Footer areas.

If the header or truck finder appear as unstyled plain text, the page is loading an old/cached CSS resource. Test with `premium-single-box-inline-test-v3.html`; it contains the same CSS and JS inline. If the inline version looks correct, re-upload or refresh the Miva `global-revamp-v2.css` and `global-revamp-v2.js` resources, then clear branch/browser cache.

## Native Miva Search

Header search:

- Uses `method="get"` and `action="&mvte:urls:SRCH:rr;"`.
- Sends the keyword query with `name="Search"`.
- Keeps the current search value with `&mvte:global:Search;`.

Truck finder:

- Uses the same native Miva search endpoint.
- Select values are combined by `global-revamp-v2.js` into the hidden `Search` field.
- Example query output: `2024 Ford F-250 Super Duty 6.7L Power Stroke`.

This replaces the old third-party finder/search behavior for the homepage experience.

## Branch Safety

- Keep older CSS/JS resources disabled only inside the branch until the new layout is approved.
- Do not delete old resources from live production until all key pages have been checked.
- Keep the old `SFNT` and `revamp-v2` files locally for reference only; the premium v3 files are the current implementation path.
- The JS resource is safe to load outside the homepage: homepage-only features now check for their elements before running.
- The homepage CSS includes the full premium homepage system.
- The sitewide CSS includes a Miva page-family layer for listing/search, product detail, basket, checkout, customer account, support forms, blog/content pages, and error/no-result states.

## Collected Page Families

- Homepage/storefront: premium single-box test is rendering correctly.
- Listing pages: category/product list and search results, including no-results search.
- Product detail page: simple PDP with image, purchase panel, tabs, PayPal/Affirm, Q&A, wishlist, and add-to-cart.
- Basket: populated cart with simple and longer product rows.
- Checkout: customer/shipping information, shipping/payment selection, payment/complete order, receipt/confirmation, Shopper Approved post-order modal.
- Customer account: dashboard empty and populated order states, address book, order history.
- Support/help: help center, sales inquiry, order status, tech support, missing/damaged parts, shipping protection claim.
- Content pages: about, returns/exchanges, warranty policy, blog index, careers, 404/unavailable product.

## Rollout Order

1. Keep the homepage on `premium-single-box-test-v3.html` until branch header/footer injection is confirmed.
2. Upload the latest `global-revamp-v2-sitewide.css` and `global-revamp-v2.js` resources for non-homepage pages and verify no console errors.
3. Test high-risk commerce pages first: product detail, basket, checkout customer/shipping, checkout payment, receipt.
4. Test listing pages: search results, no-results search, category pages, pagination, filters, add-to-cart.
5. Test customer account pages: dashboard, address book, orders, populated and empty states.
6. Test content/support pages and careers. Careers has a custom standalone design, so review it carefully for broad CSS side effects.

## SEO And Modernization Notes

- Do not paste full `<html>`, `<head>`, or `<body>` tags into Miva page content.
- Manage title, meta description, canonical URL, and index settings in Miva Page Settings.
- Add JSON-LD schema later through the Global Header template once final content and business details are confirmed.
- Replace remaining placeholder `#` links with real category, account, cart, content, and support URLs before launch.
- Confirm product/category image alt text before launch.

## Test Checklist

- Header and footer render on desktop and mobile.
- Header search redirects to the Miva search results page.
- Truck finder redirects to the Miva search results page with selected values in the query.
- Hero animation, carousel, counters, and reveal effects run without console errors.
- Page remains usable with JavaScript disabled.
- Mobile layout has no horizontal overflow.
- Branch-only resources do not affect the live site.
- Checkout remains focused and does not accidentally render the marketing homepage footer/header inside secure checkout steps.
