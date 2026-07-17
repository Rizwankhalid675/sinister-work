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
├─ config.js        ALL tunable knobs: board/group, column map, vendor + date filters
├─ env.js           loads the two shared .env files (Monday token + NetSuite creds)
├─ netsuite.js      SuiteQL client (TBA OAuth 1.0a; read-only) — copy of the sync tool's
├─ monday.js        monday.com GraphQL helpers (ensure columns/group, upsert, close-out)
├─ flows/
│  └─ openProcessingPOsToMonday.js   builds the query, maps rows, reconciles the board
└─ monday-scripts/  earlier standalone board-automation scripts (see below)
```

---

## Setup

1. **Node 18+** (uses global `fetch`).
2. Credentials are **reused from existing git-ignored `.env` files** — nothing new to add:
   - `MONDAY_API_TOKEN` — Work-folder root `.env` (`../../.env`)
   - `NETSUITE_ACCOUNT_ID` / `_CONSUMER_KEY` / `_CONSUMER_SECRET` / `_TOKEN_ID` / `_TOKEN_SECRET`
     — `../sinister-netsuite-sync/.env`

   `env.js` loads both automatically. A local `.env` in this folder overrides either.
3. `npm install` (installs `axios`, `dotenv`, `node-cron`, `oauth-1.0a`).

## Usage

```bash
# Preview what would sync — queries NetSuite, writes NOTHING to monday.com:
npm run dry-run

# Run the sync once (create/update/close-out on the board):
npm run sync

# Run on the cron schedule (once on start, then hourly by default):
npm start
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
