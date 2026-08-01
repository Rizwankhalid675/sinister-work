// Standalone report generator: pulls open outside-processing PO lines from
// NetSuite and writes a PDF + XLSX into ./reports. Does NOT touch monday.com.
// Intended as the manufacturing ops manager's overview of open OP POs.
//   node report.js   (or: npm run report)
require('./env');
const { fetchDesired } = require('./flows/openProcessingPOsToMonday');
const { generate } = require('./exports');

(async () => {
  console.log('[report] querying NetSuite…');
  const { rawCount, desired } = await fetchDesired();
  console.log(`[report] ${rawCount} lines -> ${desired.length} unique open PO lines`);

  if (!desired.length) {
    console.log('[report] nothing to export.');
    return;
  }

  const { xlsx, pdf } = await generate(desired);
  console.log(`[report] ✅ wrote:\n  ${xlsx}\n  ${pdf}`);
})().catch((err) => {
  console.error(`[report] ❌ ${err.message}`);
  process.exit(1);
});
