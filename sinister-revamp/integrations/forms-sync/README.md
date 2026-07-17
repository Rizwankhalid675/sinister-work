# Sinister Forms Sync

Standalone server-side relay for the native Sinister Diesel Help Center forms:

```text
POST /api/help-forms/sales-inquiry
POST /api/help-forms/missing-damaged-parts
POST /api/help-forms/returns-exchanges
POST /api/help-forms/order-tracking
POST /api/help-forms/tech-support
POST /api/help-forms/warranty-inquiry
POST /api/help-forms/shipping-claim
```

It validates the storefront payload and maps it to the existing `(CI) - Customer Inquiries` Monday board. It is intentionally separate from the NetSuite/Monday integration.

## Safe local verification

No packages need to be installed. Node 20 or newer is required.

```powershell
$env:DRY_RUN='true'
$env:ALLOWED_ORIGINS='http://localhost:3000,http://127.0.0.1:3000'
npm start
```

`DRY_RUN=true` accepts and validates requests but never calls Monday. Run all automated tests with:

```powershell
npm test
```

The tests inject a fake provider and do not create Monday items.

## Production configuration

Set these values in the approved server host, not in Miva or browser JavaScript:

- `PORT`: HTTP port; defaults to `8080`.
- `DRY_RUN`: must be absent or `false` in production.
- `ALLOWED_ORIGINS`: comma-separated storefront origins. Defaults to `https://sinisterdiesel.com,https://www.sinisterdiesel.com`.
- `MONDAY_API_TOKEN`: server-only credential belonging to a Monday user who can create items on board `2428283337`.

The storefront posts to same-origin paths under `/api/help-forms/*`. Before activation, configure the website proxy/CDN so that prefix forwards to this service. Do not activate the route until one controlled submission per workflow reaches the correct Monday group and triggers the expected board automation.

## Existing Monday routing

All seven routes create items on board `2428283337`, group `emailed_items`, with the existing Inquiry status:

| Route | Inquiry status index |
| --- | ---: |
| Sales Inquiry | 102 |
| Missing / Damaged Parts | 110 |
| Returns / Exchanges | 3 |
| Order Tracking | 11 |
| Tech Support | 101 |
| Warranty Inquiry | 12 |
| Shipping Claim | 106 |

The storefront sends no board IDs, status indexes, API tokens, or other internal routing data. Those values exist only in this server-side service.

## Deferred Monday Code deployment

Monday Code cannot be connected until a Monday account administrator accepts its terms. The local service is ready for that later step, but it can also run on another company-approved Node host. Once an administrator enables Monday Code:

1. Deploy this directory as server-side code.
2. Store `MONDAY_API_TOKEN` as a Monday Code secret.
3. Copy the deployment URL from **Host on monday → Server-side code**.
4. Point the storefront proxy route at that URL.
5. Run one controlled submission for every route and verify each item appears in group `emailed_items` with the expected Inquiry status.

Official references: [Monday Code setup](https://developer.monday.com/apps/docs/get-started), [Monday API authentication](https://developer.monday.com/api-reference/docs/authentication), and [create item](https://developer.monday.com/api-reference/reference/items).
