# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is a working directory for Sinister Diesel (diesel performance ecommerce) operations, not a single application. It contains several independent, unrelated projects plus many dated scratch folders (`June 17th`, `June 18th`, ... `July29th`) of one-off HTML/CSS/JS page work — those scratch folders have no build system and are not meant to be treated as part of any project below. There is no root `package.json`, README, or CI — each project below is self-contained with its own `package.json` where applicable.

## Projects

### `API/sinister-tiktok-sync/` — TikTok Shop ↔ NetSuite sync service

Node.js cron service syncing TikTok Shop orders/shipments with NetSuite.

- `npm start` — runs `node index.js`, the main sync loop (`node-cron`, default every `SYNC_INTERVAL_MINUTES`=5, guards against overlapping runs via a `syncRunning` flag)
- `npm run auth` — runs `node auth.js`, one-time OAuth bootstrap (Express callback server on port 3001) that writes tokens into `.env`
- No test suite exists in this project.

Architecture:
- `flows/ordersToNetsuite.js` — pulls TikTok orders (`AWAITING_SHIPMENT`, last 24h) → dedupes against `logs/synced_orders.json` → upserts NetSuite customer by email → resolves/auto-creates NetSuite items by SKU (with SKU-suffix-stripping fallback) → creates NetSuite Sales Order.
- `flows/shipmentsToTiktok.js` — pulls NetSuite fulfillments (last 24h) → dedupes against `logs/synced_shipments.json` → pushes tracking numbers back to TikTok.
- `flows/tokenRefresh.js` — separate cron every 12h; TikTok access tokens expire in 24h, so this calls `tiktok.js`'s `refreshAccessToken()` and rewrites `TIKTOK_ACCESS_TOKEN`/`TIKTOK_REFRESH_TOKEN` in `.env`.
- `netsuite.js` — NetSuite REST client using TBA OAuth 1.0a (`oauth-1.0a`); exposes `createSalesOrder`, `getCustomerByEmail`, `getItemIdBySku`, `createInventoryItem`, generic `nsRequest`, `suiteQL`.
- `tiktok.js` — TikTok Shop API client (HMAC-SHA256 signed requests): `getOrders`, `getOrderDetail`, `updateTracking`, `refreshAccessToken`.
- Idempotency pattern used throughout: local JSON files under `logs/` act as a sync-state ledger, checked before each write to NetSuite/TikTok — always update the ledger when adding a new sync path.

### `sinister-netsuite-sync/` and `sinister-netsuite-sync-linux/` — Miva ↔ NetSuite sync service

Two parallel deployments of the same sync tool (replaces Celigo middleware). `sinister-netsuite-sync-linux` is the current/deployed fork — it adds a live dashboard (`dashboard-server.js` + `dashboard.html`, port 3001, `/api/logs` and `/api/stats`), `nginx.conf`, PM2 process management (`ecosystem.config.js`, running two apps: `sinister-diesel-sync` + `dashboard-api`), `setup.sh`, and deploy docs (`DEPLOY.md`, `README.md`). The Windows version instead has `install-service.js` and several ad-hoc manual test scripts (`test-e2e.js`, `test-ns.js`, `test-sql.js`, `test-status.js`, `test-item-fields.js` — run directly with `node`, no test framework).

**Do not run both the Windows and Linux instances simultaneously** — each maintains independent local JSON tracking files, so running both causes duplicate order creation.

- Windows: `npm start` (`node index.js`)
- Linux: `npm run pm2:start` (`pm2 start ecosystem.config.js`), plus `pm2:stop` / `pm2:restart` / `pm2:logs` / `pm2:status`

Sync directions: Orders Miva→NS, Shipments NS→Miva, Deposits/Invoices created and closed in NS, Product IDs kept linked Miva↔NS, Customers Miva→NS. Same JSON-ledger idempotency pattern as the TikTok service.

**`margin-check/`** (present in both, near-identical) — a standalone vendor cost/margin auditing tool, unrelated to the sync flows above. Workflow is two steps because parsing a 14MB vendor XLSX in-process spikes memory ~350-400MB, too much for the production server (<1GB): first run `convert-price-file.js` manually to flatten a new vendor XLSX price file into CSV, then `check-priceoffile.js` streams that CSV, compares against NetSuite cost data (`suiteQL`) and Miva active product codes (`getActiveProductCodes`), and generates a PDF margin report via `pdf-report.js`. Currently hardcoded to Holley vendor / Platinum cost tier — check `vendors.config.js` before extending to other vendors.

### `sinister-revamp/` — Miva Merchant V2 theme (site redesign)

A Miva Merchant theme directory (`.mmt/`, `templates/*.mvt`, `resourcegroups/*.json`, `css/`, `js/`, `partials/`, `properties/`, `scratch/`) implementing a from-scratch V2 frontend redesign while Legacy templates stay live. **Read `V2_CONSTITUTION.md` and `V2_STRUCTURE.md` in full before making any change here** — they are the governing spec, not optional context. Key rules distilled:

- Miva Merchant remains the commerce engine; only the frontend is being redesigned. Legacy templates are untouched and never deleted.
- V2 work is built as **inactive** templates/partials — nothing here goes live by being created. Preview only via `scratch/v2-preview.html` or manually copied Miva test pages in Admin.
- **Never overwrite or activate** `sfnt.mvt`, `srch.mvt`, `prod-product_display.mvt`, live header/footer, checkout, basket, or account templates with V2 files.
- One global design system only: `css/sd2-global.css`, tokens prefixed `--sd2-*`. No duplicated tokens/spacing/typography/component CSS outside it.
- JS hooks use `data-v2-*` attributes; JS modules must initialize only when their root hook exists and must tolerate unavailable localStorage (wrap in try/catch). Shared progressive-enhancement JS lives in `js/sd2-v2-components.js` (no external dependencies).
- localStorage keys are fixed: `sd2v2_garage`, `sd2v2_recent_searches`, `sd2_v2_recent_searches` — don't rename.
- Component partials must not contain inline scripts or styles; external script includes are allowed only in inactive preview/template shells.
- Canonical components must not be duplicated inline elsewhere (e.g. Product Card is canonical in `templates/sd2-v2-product-card.mvt` / `.sd2-v2-pcard*`; listing filters are canonical in `.sd2-v2-filter-rail` / `.sd2-v2-filter-sheet` / `.sd2-v2-chips` / `.sd2-v2-pgrid`).
- The constitution's implementation rules: work one milestone at a time (see roadmap M0–M9 in `V2_CONSTITUTION.md`), never invent architecture mid-implementation, never redesign while coding, don't skip ahead or rebuild completed milestones.
- Miva integration points (basket/cart, checkout OCST/OSEL/OPAY, order history ORDH/ORDL/ORDS, customer ACLN/ACAD/ACED, product PROD, search SRCH, category CTGY) are listed in `V2_STRUCTURE.md` — many V2 partials currently reference `[Placeholder]` content and are documented as not yet wired to live Miva arrays; check the "Known Placeholders" / "Future Backend Wiring Tasks" sections there before assuming a partial is data-complete.

### `scripts/` — monday.com board automation

Standalone Node scripts (no shared package.json) for creating/updating items on a specific monday.com board via its GraphQL API, run ad hoc with `node scripts/<name>.js`. Auth token is read from a git-ignored root `.env` (`MONDAY_API_TOKEN`), never hardcoded. Each script prints `--help`-style usage when required args are missing; use `--list-columns` / `--list-users` flags where present to discover board-specific column/user IDs before writing.

## Cross-cutting notes

- No root CI (`.github/workflows` does not exist) and no root test runner — testing is per-project and largely manual (ad hoc `node test-*.js` scripts in the NetSuite sync tools).
- Secrets (`.env`, `**/.env`) are git-ignored repo-wide; never commit tokens. Several projects here write refreshed OAuth tokens back into their own `.env` file at runtime (TikTok sync's token refresh flow).
- `Website-Audit-and-Improvement-Plan.md` at the repo root is a planning/audit document (not code) covering the live Miva site's template architecture and integration health — useful background when working in `sinister-revamp/`.
