#!/usr/bin/env node
// loop.js — run the sync continuously on this local machine.
//
//   node loop.js            # sync + report every config.loopIntervalMinutes
//   node loop.js --commit   # same, with write-back enabled each cycle
//
// Ctrl+C to stop. Each cycle shells the same code path as index.js by requiring
// it as a module would re-run main once; instead we re-exec the run function.
const { spawnSync } = require('child_process');
const path = require('path');
const cfg = require('./config');

const passThru = process.argv.slice(2);
const intervalMs = cfg.loopIntervalMinutes * 60 * 1000;

function runOnce() {
  const stamp = new Date().toISOString();
  console.log(`\n===== [my-tasks loop] cycle @ ${stamp} =====`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'index.js'), ...passThru], {
    stdio: 'inherit',
  });
  if (r.status !== 0) console.error('[my-tasks loop] cycle exited non-zero — will retry next interval');
}

console.log(`[my-tasks loop] starting; every ${cfg.loopIntervalMinutes} min. Ctrl+C to stop.`);
runOnce();
setInterval(runOnce, intervalMs);
