# PDP V2 Miva Wiring Notes

Preview-only notes for `templates/prod-product_display-v2-test.mvt`.

## Wired in this pass

- Product name: `&mvte:product:name;`
- Product code/SKU: `&mvte:product:code;`
- Price: `&mvt:product:formatted_price;`
- Base/was price conditional: `l.settings:product:base_price GT l.settings:product:price`
- Product image: `&mvte:product:image;` with placeholder fallback
- Description: `&mvt:product:descrip;`
- Basket action: `&mvte:urls:BASK:auto;`
- Add-to-cart fields: `Action=ADPR`, `Product_Code`, `Product_Name`, `Quantity`

## Left as placeholders

- Category breadcrumb array
- Additional product image/media arrays
- Product video
- Stock state beyond generic Miva inventory messaging
- Product custom fields for specs/material/install time
- Installation PDF/content
- Reviews and rating distribution
- Related products
- Complete-your-build bundles
- Backend fitment matching

## Test instructions

Assign `prod-product_display-v2-test.mvt` only to a copied staging product display template or test page in Miva Admin. Do not assign it over the live `prod-product_display.mvt` template.
