# Integrations

← back to [[🏠 Work Home]]

Systems that connect Sinister Diesel's platforms: **NetSuite** (ERP), **Miva Merchant**
(storefront), **TikTok Shop**, and **monday.com** (task tracking).

Folder: `integrations/` — full details in `integrations/README.md`.

---

## Projects

### 🔁 Miva ↔ NetSuite sync
- `integrations/sinister-netsuite-sync` — **Windows** fork. Orders Miva→NS, Shipments
  NS→Miva, Deposits/Invoices in NS, Product IDs linked both ways, Customers Miva→NS.
  Includes `margin-check/` vendor cost/margin auditing (Holley / Platinum tier).
- `integrations/sinister-netsuite-sync-linux` — **deployed** Linux fork. Same sync + live
  dashboard (port 3001), nginx, PM2 (`sinister-diesel-sync` + `dashboard-api`).

> ⚠️ **Never run Windows + Linux instances at the same time** — independent JSON tracking
> files mean running both creates duplicate orders.

### 🎵 TikTok Shop ↔ NetSuite
- `integrations/tiktok-netsuite-sync` — cron service. TikTok orders → NetSuite sales
  orders; NetSuite fulfillments → TikTok tracking. TikTok tokens expire in 24h → separate
  12h token-refresh cron rewrites `.env`.

### 📋 NetSuite ↔ monday.com
- `integrations/netsuite-monday-integration` — monday.com board automation
  (`monday-scripts/`): push tasks, create parent + subitems, set status/due dates, delete
  items. Scaffolded for future NetSuite→monday.com data feeds.
- **Board used:** 326887787 (Website Revamp tracking).
- Token comes from the shared **Work-root `.env`** (`MONDAY_API_TOKEN`).

---

## Shared patterns
- **Idempotency via JSON ledgers** under each project's `logs/` — checked before every
  write, updated after.
- **NetSuite client** (`netsuite.js`): `suiteQL`, `createSalesOrder`, `getCustomerByEmail`,
  `getItemIdBySku`, `createInventoryItem`, `nsRequest`.
- Secrets in git-ignored `.env`; some services rewrite refreshed OAuth tokens at runtime.

---

## Related
- [[Website Revamp]] — the V2 store embeds monday.com help forms; `spons.mvt` has a
  (flagged) monday.com token to rotate.
- [[🏠 Work Home]]
