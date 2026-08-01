// Central configuration for the NetSuite "Open Outside Processing POs" ->
// monday.com sync. Everything the report's exact filter depends on lives here,
// so tightening it to match the saved report (cr=449) is a config edit, not a
// code change.

module.exports = {
  // ── monday.com target ────────────────────────────────────────────────
  board: {
    id: '18416856698', // Manufacturing board (sinisterdiesel.monday.com/boards/18416856698)
    groupTitle: 'Open Outside Processing POs', // synced rows go in their own group;
                                               // Mark's existing to-do group is untouched
  },

  // monday.com column titles we ensure exist and write to. The script resolves
  // these titles to board-specific column IDs at runtime (creating any that are
  // missing), so you never hardcode column IDs. `key` is a hidden text column
  // holding the NetSuite match key for update-in-place.
  columns: [
    { key: 'key',        title: 'NS Key',       type: 'text' },   // hidden match key: "PO# | ItemName"
    { key: 'po',         title: 'PO #',         type: 'text' },
    { key: 'itemName',   title: 'Item Name',    type: 'text' },   // maps report "Item: Name" (SKU)
    { key: 'qtyOpen',    title: 'Qty Open',     type: 'numbers' },
    { key: 'vendor',     title: 'Vendor',       type: 'text' },
    { key: 'dateCreated',title: 'Date Created', type: 'date' },
    { key: 'status',     title: 'Status',       type: 'status' }, // reuse the board's default Status column if present
  ],

  // Status labels used on the board. These MUST already exist on the board's
  // Status column — monday.com does not auto-create status labels. The board's
  // default Status column ships with: "Working on it", "Done", "Stuck".
  // Open PO lines -> openLabel; lines that drop off the report -> doneLabel.
  status: {
    openLabel: 'Working on it',
    doneLabel: 'Done',
  },

  // ── Pinned reports item ──────────────────────────────────────────────
  // After each sync, a fresh PDF + XLSX are generated and attached to a single
  // pinned item at the top of the group, so Mark can click and download the
  // current overview straight from the board (no extra server needed).
  reportsItem: {
    name: '📄 DOWNLOAD REPORTS',
    filesColumnTitle: 'Files', // file column on the reports item (created if missing)
  },

  // ── NetSuite report reconstruction (cr=449) ──────────────────────────
  // The saved report's exact criteria live in NetSuite; this is our best
  // reconstruction from the data. Adjust to match once a CSV export is available.
  netsuite: {
    // A PO line counts as "open outside processing" when it belongs to a
    // finishing vendor AND still has open quantity (ordered - received > 0).
    //
    // Vendors are matched by these LOWER() LIKE patterns. Add/remove to match
    // the report. Junk vendors are excluded via `excludeVendorPatterns` below.
    vendorPatterns: [
      '%coating%',
      '%metal finishing%',
      '%powdercoat%',
      '%anodiz%',
    ],
    // Vendors to always exclude even if they match above (dead/placeholder records).
    excludeVendorPatterns: [
      '%do not use%',
    ],

    // Exclude these PO header status codes. Codes (transaction.status for PurchOrd):
    //   B = Pending Receipt          E = Pending Billing/Partially Received
    //   D = Partially Received       F = Pending Bill
    //   G = Fully Billed             H = Closed
    // Per Mark: don't show Closed POs. 'H' = Closed.
    excludeStatuses: ['H'],

    // Only include PO lines dated on/after this floor (YYYY-MM-DD), matching the
    // report's forward date window which excluded old 2023/2024 POs. Set to null
    // to include all open lines regardless of age.
    dateFloor: '2026-01-01',

    // Strip this suffix from item names so charge-line SKUs match the report's
    // clean SKUs (e.g. "ANO-..._OutsourceCharge" -> "ANO-...").
    stripItemSuffix: '_OutsourceCharge',
  },

  // ── cron ─────────────────────────────────────────────────────────────
  // How often the sync runs. Default hourly; overridable via env.
  cron: process.env.MONDAY_SYNC_CRON || '0 * * * *',
};
