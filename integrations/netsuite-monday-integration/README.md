<!-- Folder note: [[_index]] · Overview: [[Integrations]] -->

# NetSuite ↔ monday.com Integration

Automation that bridges **NetSuite** (Sinister Diesel's ERP / commerce backend) and
**monday.com** (project + task tracking), so work status and operational data flow
between the two systems instead of being copied by hand.

This folder sits alongside the other NetSuite integrations in [`../`](../):

| Folder | Purpose |
| --- | --- |
| [`../sinister-netsuite-sync`](../sinister-netsuite-sync) | Miva ↔ NetSuite order/shipment/customer sync (Windows fork) |
| [`../sinister-netsuite-sync-linux`](../sinister-netsuite-sync-linux) | Same tool, deployed Linux fork (dashboard + PM2) |
| [`../tiktok-netsuite-sync`](../tiktok-netsuite-sync) | TikTok Shop ↔ NetSuite order/shipment sync |
| **`netsuite-monday-integration`** (this folder) | NetSuite ↔ monday.com task/status automation |

---

## What's here

```
netsuite-monday-integration/
├─ README.md            ← this file
└─ monday-scripts/      ← standalone monday.com board automation (GraphQL API)
   ├─ monday-push-tasks.js            create board items from a task list
   ├─ monday-create-parent-task.js    create a parent item + convert items to subitems, assign a person, post an update
   ├─ monday-add-task-with-subitems.js create a task together with its subitems in one call
   ├─ monday-set-status-column.js     set a status column value on an item
   ├─ monday-set-due-date.js          set a date/due-date column on an item
   └─ monday-delete-item.js           delete a board item
```

> These scripts were previously at the Work-folder root as `scripts/`. They were moved
> here so all NetSuite-related integration work lives under `integrations/`. Their
> `.env` lookup was updated to walk up to the **Work folder root** (`../../../.env`),
> so they still read the same shared token file — see **Setup** below.

---

## How the two systems relate

**Direction today (implemented): work status → monday.com.**
The `monday-scripts/` push Sinister Diesel operational tasks (e.g. the website revamp
milestones, online-department work) onto a monday.com board as items/subitems, set
their status and due dates, and post updates. This is the reporting/visibility layer:
NetSuite and the Miva store are the source of truth for commerce; monday.com is where
the team tracks the *work* around it.

**Direction intended (NetSuite → monday.com data): scaffold for future wiring.**
The natural next step is to feed NetSuite records into the same board — for example:

| NetSuite source | monday.com target |
| --- | --- |
| Sales orders / open fulfillments (`suiteQL`) | Board items with status = fulfillment state |
| Customer / RMA records | Items with due dates + owner (person column) |
| Margin-check exceptions (from `sinister-netsuite-sync/margin-check`) | Items flagged for pricing review |

The NetSuite REST/SuiteQL client already exists in the sibling sync tools
(`../sinister-netsuite-sync/netsuite.js` — `suiteQL`, `getCustomerByEmail`,
`createSalesOrder`, etc.). A future NetSuite→monday job would import that client, run a
SuiteQL query, and call the same monday.com GraphQL helpers used here. No such job is
wired yet — this README documents the boundary so it can be built cleanly.

---

## Setup

1. Generate a monday.com API token (monday.com → **Admin → API**).
2. Ensure the shared env file exists at the **Work folder root**:
   `C:\Users\admin\OneDrive\Desktop\Work\.env` (git-ignored) containing:
   ```
   MONDAY_API_TOKEN=your-token-here
   ```
   Every script loads this file via `path.join(__dirname, "..", "..", "..", ".env")`.
3. Node.js 18+ (the scripts use the built-in global `fetch`). No `npm install` is
   required — there are no third-party dependencies.

## Usage

All scripts print usage when required args are missing, and support discovery flags:

```bash
# Discover board column IDs before writing:
node monday-scripts/monday-push-tasks.js --board 326887787 --list-columns

# Discover board user IDs (for person columns):
node monday-scripts/monday-create-parent-task.js --board 326887787 --list-users

# Push tasks and mark them Done on the "status" column:
node monday-scripts/monday-push-tasks.js --board 326887787 --status-column status --status-label Done
```

The board ID used to date is **326887787** (Website Revamp tracking).

## Conventions

- **Never hardcode the API token** — always read it from the git-ignored root `.env`.
- Use the `--list-columns` / `--list-users` flags to resolve board-specific column and
  user IDs before writing; monday.com column IDs are board-specific, not global.
- monday.com's GraphQL API is at `https://api.monday.com/v2`; all calls are POSTs with
  the token in the `Authorization` header.
