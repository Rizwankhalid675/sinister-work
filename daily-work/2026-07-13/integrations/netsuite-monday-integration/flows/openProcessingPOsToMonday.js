// Flow: NetSuite "Open Outside Processing POs" (report cr=449) -> monday.com board.
//
// Each open outside-processing PO line becomes one monday item, keyed by
// "PO# | ItemName". On every run:
//   - new lines are created
//   - existing lines are updated in place (matched via the NS Key column)
//   - previously-synced lines that are no longer open get Status = Done
// Mark's manual to-do group is never touched — synced rows live in their own group.

const { suiteQL } = require('../netsuite');
const monday = require('../monday');
const config = require('../config');

// Build the SuiteQL that reconstructs the report from config knobs.
function buildQuery() {
  const ns = config.netsuite;

  const vendorInclude = ns.vendorPatterns
    .map((p) => `LOWER(v.companyname) LIKE '${p.replace(/'/g, "''")}'`)
    .join(' OR ');

  const vendorExclude = (ns.excludeVendorPatterns || [])
    .map((p) => `LOWER(v.companyname) NOT LIKE '${p.replace(/'/g, "''")}'`)
    .join(' AND ');

  const clauses = [
    "t.type = 'PurchOrd'",
    "tl.mainline = 'F'",
    'tl.quantity IS NOT NULL',
    '(tl.quantity - NVL(tl.quantityshiprecv, 0)) > 0', // open quantity remaining
    `(${vendorInclude})`,
  ];
  if (vendorExclude) clauses.push(`(${vendorExclude})`);
  if (ns.dateFloor) {
    clauses.push(`t.trandate >= TO_DATE('${ns.dateFloor}', 'YYYY-MM-DD')`);
  }
  // Exclude PO header statuses we don't want (e.g. 'H' = Closed) — per Mark's
  // request "only grab POs with a status that is not equal to Closed".
  if (ns.excludeStatuses && ns.excludeStatuses.length) {
    const codes = ns.excludeStatuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
    clauses.push(`t.status NOT IN (${codes})`);
  }

  return `
    SELECT t.tranid AS ponum,
           t.trandate AS trandate,
           i.itemid AS itemid,
           i.displayname AS displayname,
           (tl.quantity - NVL(tl.quantityshiprecv, 0)) AS qtyopen,
           v.companyname AS vendor
    FROM transaction t
    JOIN transactionline tl ON tl.transaction = t.id
    JOIN item i ON i.id = tl.item
    JOIN vendor v ON v.id = t.entity
    WHERE ${clauses.join(' AND ')}
    ORDER BY t.tranid, i.itemid`;
}

// NetSuite trandate comes back as MM/DD/YYYY; monday date columns want YYYY-MM-DD.
function toMondayDate(mdY) {
  if (!mdY) return null;
  const m = String(mdY).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function cleanItemName(itemid) {
  const suffix = config.netsuite.stripItemSuffix;
  if (suffix && itemid.endsWith(suffix)) return itemid.slice(0, -suffix.length);
  return itemid;
}

// Map a NetSuite row into { key, name, fields } shape.
function mapRow(row) {
  const itemName = cleanItemName(row.itemid || '');
  const po = row.ponum || '';
  const key = `${po} | ${itemName}`;
  const display = row.displayname || itemName;
  return {
    key,
    // Item Name (SKU) leads the board's far-left Name column, per Mark's request.
    name: `${itemName} — ${display}`,
    displayName: display, // top-level for exports (PDF/XLSX)
    fields: {
      po,
      itemName,
      qtyOpen: Number(row.qtyopen) || 0,
      vendor: row.vendor || '',
      dateCreated: toMondayDate(row.trandate),
    },
  };
}

// Translate mapped fields into a monday column_values object using resolved column IDs.
function toColumnValues(cols, mapped, { includeStatus, statusLabel } = {}) {
  const cv = {};
  cv[cols.key.id] = mapped.key;
  cv[cols.po.id] = mapped.fields.po;
  cv[cols.itemName.id] = mapped.fields.itemName;
  cv[cols.qtyOpen.id] = mapped.fields.qtyOpen;
  cv[cols.vendor.id] = mapped.fields.vendor;
  if (mapped.fields.dateCreated) {
    cv[cols.dateCreated.id] = { date: mapped.fields.dateCreated };
  }
  if (includeStatus && cols.status) {
    cv[cols.status.id] = { label: statusLabel };
  }
  return cv;
}

// Query NetSuite and return the de-duped list of open PO lines to sync/report.
// Shared by run() (board sync) and the PDF/XLSX report so both use one fetch path.
async function fetchDesired() {
  const query = buildQuery();
  const rows = await suiteQL(query);
  const mapped = rows.map(mapRow);

  // De-dupe by key (a PO can legitimately list the same item twice; keep the
  // one with the larger open qty so the board shows the meaningful figure).
  const byKey = new Map();
  for (const m of mapped) {
    const prev = byKey.get(m.key);
    if (!prev || m.fields.qtyOpen > prev.fields.qtyOpen) byKey.set(m.key, m);
  }
  const desired = [...byKey.values()];
  return { rawCount: rows.length, desired };
}

async function run({ dryRun = false } = {}) {
  const log = (...a) => console.log('[open-op-pos]', ...a);

  // 1. Pull rows from NetSuite.
  const { rawCount, desired } = await fetchDesired();
  log(`NetSuite returned ${rawCount} lines -> ${desired.length} unique open PO lines`);

  if (dryRun) {
    log('DRY RUN — first 5 rows that would sync:');
    for (const d of desired.slice(0, 5)) {
      log(`  ${d.name}  [${d.key}]  qtyOpen=${d.fields.qtyOpen} vendor="${d.fields.vendor}" date=${d.fields.dateCreated}`);
    }
    log(`(no writes performed) total=${desired.length}`);
    return { created: 0, updated: 0, closed: 0, total: desired.length, dryRun: true };
  }

  // 2. Ensure board structure (group + columns).
  const boardId = config.board.id;
  const cols = await monday.ensureColumns(boardId, config.columns);
  const groupId = await monday.ensureGroup(boardId, config.board.groupTitle);

  // 3. Read existing synced items (by NS Key) in our group.
  const existing = await monday.getGroupItems(boardId, groupId, cols.key.id);
  const existingByKey = new Map(existing.filter((e) => e.keyValue).map((e) => [e.keyValue, e]));
  log(`Group has ${existing.length} existing items (${existingByKey.size} keyed)`);

  const desiredKeys = new Set(desired.map((d) => d.key));

  let created = 0;
  let updated = 0;
  let closed = 0;

  // 4. Create/update current open lines.
  for (const d of desired) {
    const match = existingByKey.get(d.key);
    const cv = toColumnValues(cols, d, {
      includeStatus: true,
      statusLabel: config.status.openLabel,
    });
    if (match) {
      await monday.updateItem(boardId, match.id, cv);
      updated++;
    } else {
      await monday.createItem(boardId, groupId, d.name, cv);
      created++;
    }
    await monday.sleep(150); // gentle pacing for rate limits
  }

  // 5. Close-out: items previously synced but no longer open -> Status = Done.
  if (cols.status) {
    for (const e of existing) {
      if (!e.keyValue || desiredKeys.has(e.keyValue)) continue;
      await monday.updateItem(boardId, e.id, {
        [cols.status.id]: { label: config.status.doneLabel },
      });
      closed++;
      await monday.sleep(150);
    }
  }

  log(`Done. created=${created} updated=${updated} closed=${closed} total=${desired.length}`);
  return { created, updated, closed, total: desired.length };
}

module.exports = { run, fetchDesired, buildQuery, mapRow };
