// Cron entrypoint: syncs NetSuite "Open Outside Processing POs" onto the
// manufacturing monday.com board on a schedule. Overlap-guarded so a slow run
// never stacks on the next tick.
require('./env');
const cron = require('node-cron');
const { run } = require('./flows/openProcessingPOsToMonday');
const config = require('./config');

let running = false;

async function tick() {
  if (running) {
    console.log('[cron] previous sync still running — skipping this tick');
    return;
  }
  running = true;
  console.log('═══════════════════════════════════════');
  console.log(`[cron] Open Outside Processing POs sync started ${new Date().toISOString()}`);
  try {
    const res = await run();
    console.log(`[cron] ✅ created=${res.created} updated=${res.updated} closed=${res.closed}`);
  } catch (err) {
    console.error(`[cron] ❌ sync error: ${err.message}`);
  } finally {
    running = false;
    console.log('═══════════════════════════════════════');
  }
}

// Run once on startup, then on the configured schedule.
tick();
cron.schedule(config.cron, tick);
console.log(`[cron] scheduled: "${config.cron}" (board ${config.board.id})`);
