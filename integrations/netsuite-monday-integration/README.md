<!-- Folder note: [[_index]] · Overview: [[Integrations]] -->

# NetSuite ↔ monday.com Integration

Automation bridging **NetSuite** (Sinister Diesel's ERP) and **monday.com** so the
manufacturing team tracks operational data on a board instead of copying it by hand.

This folder sits alongside the other NetSuite integrations in [`../`](../):

| Folder | Purpose |
| --- | --- |
| [`../sinister-netsuite-sync`](../sinister-netsuite-sync) | Miva ↔ NetSuite order/shipment/customer sync (Windows fork) |
| [`../sinister-netsuite-sync-linux`](../sinister-netsuite-sync-linux) | Same tool, deployed Linux fork (dashboard + PM2) |
| [`../tiktok-netsuite-sync`](../tiktok-netsuite-sync) | TikTok Shop ↔ NetSuite order/shipment sync |
| **`netsuite-monday-integration`** (this folder) | NetSuite → monday.com data + task automation |

---

## What runs today: Open Outside Processing POs → monday.com

The manufacturing team needs visibility into parts that are **out at finishing
vendors** (powdercoat/anodize — AIC, AMF, MFG, etc.) and not yet fully received.
NetSuite's saved report **"Open Outside Processing POs"** (`cr=449`) shows this, but
saved reports aren't reachable through the NetSuite API. This service **reconstructs
that report as a SuiteQL query** and pushes each open PO line onto the manufacturing
board as an item.

- **Board:** `18416856698` (Manufacturing) → group **"Open Outside Processing POs"**.
  Other groups on the board (e.g. Mark's manual to-do list) are never touched.
- **One item per PO line**, named `PO#### — <Display Name>`
  (e.g. `PO#8328 — Blue Powdercoat - 6.7C-19 Cold Air Intake`).
- **Columns written:** PO #, Item Name (SKU), Qty Open, Vendor, Date Created, Status.
- **Update-in-place:** each item stores a hidden **NS Key** (`PO# | ItemName`). On every
  run, matching lines are updated (no duplicates), new lines are created, and lines that
  have dropped off the report (received/closed) get **Status → Done**.
- **Schedule:** `index.js` runs the sync once on startup, then on a cron (default hourly).

### Files

```
netsuite-monday-integration/
├─ index.js         cron entrypoint (overlap-guarded)
├─ config.js        ALL tunable knobs: board/group, column map, vendor/status/date filters
├─ env.js           loads the two shared .env files (Monday token + NetSuite creds)
├─ netsuite.js      SuiteQL client (TBA OAuth 1.0a; read-only) — copy of the sync tool's
├─ monday.js        monday.com GraphQL helpers (ensure columns/group, upsert, close-out)
├─ exports.js       PDF + XLSX generation (pdfkit + xlsx)
├─ report.js        standalone report entrypoint (npm run report)
├─ flows/
│  └─ openProcessingPOsToMonday.js   builds the query, maps rows, reconciles the board
├─ reports/         generated PDF/XLSX output (git-ignored)
└─ monday-scripts/  earlier standalone board-automation scripts (see below)
```

## Ops-manager report (PDF + XLSX)

For the manufacturing ops manager, `npm run report` pulls the same open-PO data and
writes a timestamped **PDF** (fixed, shareable snapshot) and **XLSX** (sortable/filterable,
with autofilter) into `reports/` — a local mirror of the report's NetSuite Excel/PDF
exports. It does **not** touch the board. Columns lead with **Item Name** (Mark's request),
then PO #, Display Name, Date Created, Qty Open, Vendor.

### Download from the board (pinned reports item)

So Mark can grab the overview without asking, **each sync run** also generates the same
PDF + XLSX and attaches them to a single pinned item — **`📄 DOWNLOAD REPORTS`** — at the
top of the group (its Files column). He clicks the item → downloads the current files.

- The item is created once and **reused** every run (matched by name), never duplicated.
- Prior files are **cleared before re-upload**, so the item always holds just the current
  PDF + XLSX (monday's `add_file_to_column` appends, so the flow clears first).
- The item has **no NS Key**, so the sync's create/update/close-out logic skips it — it is
  never matched, updated, or flipped to Done.
- Config lives in `config.reportsItem` (`name`, `filesColumnTitle`). Best-effort: if file
  generation/upload fails, the sync logs a `WARN` and still succeeds (board data is already
  correct by that point).

---

## Setup

1. **Node 18+** (uses global `fetch`).
2. Credentials are **reused from existing git-ignored `.env` files** — nothing new to add:
   - `MONDAY_API_TOKEN` — Work-folder root `.env` (`../../.env`)
   - `NETSUITE_ACCOUNT_ID` / `_CONSUMER_KEY` / `_CONSUMER_SECRET` / `_TOKEN_ID` / `_TOKEN_SECRET`
     — `../sinister-netsuite-sync/.env`

   `env.js` loads both automatically. A local `.env` in this folder overrides either.
3. `npm install` (installs `axios`, `dotenv`, `node-cron`, `oauth-1.0a`, `pdfkit`, `xlsx`).

## Usage

```bash
# Preview what would sync — queries NetSuite, writes NOTHING to monday.com:
npm run dry-run

# Run the sync once (create/update/close-out on the board):
npm run sync

# Run on the cron schedule (once on start, then hourly by default):
npm start

# Generate the ops-manager PDF + XLSX into ./reports (does NOT touch the board):
npm run report
```

Change the schedule with `MONDAY_SYNC_CRON` (standard 5-field cron) in `.env`, or edit
`config.cron`.

---

## Tuning the report filter (`config.js` → `netsuite`)

The saved report's exact criteria live inside NetSuite; this service reconstructs them.
If the board doesn't match the report, adjust these — **no code changes needed**:

| Knob | What it does |
| --- | --- |
| `vendorPatterns` | `LOWER(companyname) LIKE` patterns for finishing vendors to **include**. |
| `excludeVendorPatterns` | Patterns to **exclude** even if included above (e.g. `%do not use%`). |
| `excludeStatuses` | PO header status codes to drop. `['H']` excludes **Closed** POs (per Mark). Codes: B/D/E/F pending, G billed, **H closed**. |
| `dateFloor` | Only PO lines dated on/after this `YYYY-MM-DD`. Set `null` for all open lines. Mirrors the report's forward date window (currently `2026-01-01`). |
| `stripItemSuffix` | Suffix trimmed from item SKUs so charge-line SKUs match the report (`_OutsourceCharge`). |

> **To match the report precisely:** export report `cr=449` to CSV/Excel and compare
> against `npm run dry-run` output, then tighten `vendorPatterns` / `dateFloor` until the
> row set matches. The current reconstruction = *open PO lines* (`quantity − received > 0`)
> *from finishing vendors, dated ≥ 2026-01-01*.

### Definition of "open"

A PO line is open when `tl.quantity − NVL(tl.quantityshiprecv, 0) > 0` — ordered quantity
minus quantity received. That remainder is the **Qty Open** shown on the board.

### Status labels

`config.status` labels **must already exist** on the board's Status column (monday.com
does not auto-create status labels). The default board ships with *Working on it / Done /
Stuck*, so open lines use **Working on it** and closed-out lines use **Done**.

---

## monday-scripts/ (earlier, standalone)

Ad-hoc board-automation scripts predating this sync (create items/subitems, set status,
set due date, delete). Run individually with `node monday-scripts/<name>.js`; they support
`--list-columns` / `--list-users` discovery flags and read `MONDAY_API_TOKEN` from the
Work-root `.env`. Kept for reference and one-off board edits.

## Conventions

- **Never hardcode secrets** — always read from the git-ignored `.env` files via `env.js`.
- The sync is **read-only against NetSuite** (SuiteQL only) and **non-destructive on the
  board** (own group, upsert by key, close-out instead of delete).
- monday.com column IDs are board-specific — the sync resolves them from column *titles*
  at runtime and creates any missing ones, so IDs are never hardcoded.
# Native storefront help-form relay

The same service can receive native Sinister Diesel help forms and create items
on the existing `(CI) - Customer Inquiries` Monday board. The relay is disabled
unless a port is configured, so existing cron-only deployments are unchanged.

```env
HELP_FORMS_PORT=3088
HELP_FORMS_HOST=127.0.0.1
```

Route storefront requests from `/api/help-forms/*` to that listener at the
reverse proxy. The first supported route is:

```text
POST /api/help-forms/sales-inquiry
Content-Type: application/json
```

The listener uses the existing server-side `MONDAY_API_TOKEN`. Never expose the
token in Miva templates or browser JavaScript. Apply rate limiting at the reverse
proxy before enabling the route publicly.
