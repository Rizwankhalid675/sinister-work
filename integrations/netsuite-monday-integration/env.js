// Shared .env loader.
//
// Credentials are split across two existing git-ignored files (we reuse them
// rather than duplicating secrets):
//   - MONDAY_API_TOKEN            -> Work-folder root .env      (../../.env)
//   - NETSUITE_* (6 TBA vars)     -> sinister-netsuite-sync/.env (../sinister-netsuite-sync/.env)
//
// dotenv does not overwrite already-set vars, so loading both is safe and
// order-independent. A local .env in THIS folder (if present) wins first.
const path = require('path');

const candidates = [
  path.join(__dirname, '.env'),                                   // local override (optional)
  path.join(__dirname, '..', '..', '.env'),                       // Work root: MONDAY_API_TOKEN
  path.join(__dirname, '..', 'sinister-netsuite-sync', '.env'),   // NETSUITE_* TBA creds
];

for (const p of candidates) {
  require('dotenv').config({ path: p });
}

module.exports = {};
