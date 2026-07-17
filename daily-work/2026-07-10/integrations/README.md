<!-- Folder note: [[_index]] · Overview: [[Integrations]] -->

# Integrations

All the systems that connect Sinister Diesel's platforms together — NetSuite (ERP),
Miva Merchant (storefront), TikTok Shop, and monday.com (task tracking).

| Folder | Connects | Purpose |
| --- | --- | --- |
| [`sinister-netsuite-sync`](sinister-netsuite-sync) | Miva ↔ NetSuite | Order/shipment/customer/deposit sync (Windows fork). Replaces Celigo. Includes `margin-check/` vendor cost auditing. |
| [`sinister-netsuite-sync-linux`](sinister-netsuite-sync-linux) | Miva ↔ NetSuite | Same tool, **deployed** Linux fork — adds live dashboard, nginx, PM2. |
| [`tiktok-netsuite-sync`](tiktok-netsuite-sync) | TikTok Shop ↔ NetSuite | Cron service syncing TikTok orders → NetSuite sales orders, and NetSuite fulfillments → TikTok tracking. |
| [`netsuite-monday-integration`](netsuite-monday-integration) | NetSuite ↔ monday.com | monday.com board automation (task/status/subitems) + scaffold for feeding NetSuite data into monday.com. |

> **Do not run the Windows and Linux NetSuite-sync instances simultaneously** — each keeps
> its own local JSON tracking files, so running both causes duplicate order creation.

## Shared conventions

- **Idempotency via JSON ledgers:** every sync writes to local JSON files under `logs/`
  and checks them before each write to NetSuite/Miva/TikTok. Always update the ledger when
  adding a new sync path.
- **Secrets never hardcoded:** all tokens live in git-ignored `.env` files. Some services
  rewrite refreshed OAuth tokens back into their own `.env` at runtime.
- **NetSuite client:** `netsuite.js` in the sync tools exposes `suiteQL`, `createSalesOrder`,
  `getCustomerByEmail`, `getItemIdBySku`, `createInventoryItem`, and generic `nsRequest` —
  reuse it for any new NetSuite-sourced integration.
