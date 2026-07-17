# netsuite-monday-integration/ (folder)

Part of → [[Integrations]] → [[🏠 Work Home]]

NetSuite → monday.com sync for the **manufacturing** dept. Reconstructs the
"Open Outside Processing POs" saved report (`cr=449`) as SuiteQL and pushes each open
finishing-vendor PO line onto board `18416856698` (own group, update-in-place, close-out
to Done). Cron entry `index.js`; all filters in `config.js`. See `README.md`.
Older one-off board scripts live in `monday-scripts/`.
