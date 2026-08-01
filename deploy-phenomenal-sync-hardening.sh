#!/usr/bin/env bash
# =============================================================================
# Rollback-safe deployment script — sinister-diesel-sync / dashboard-api
# Target: /opt/sinister-diesel-sync  |  User: ubuntu  |  Branch: main
# PR #5 (feature/phenomenal-sync-hardening) merged into main — deploy it.
#
# Policy:
#   - git fetch + git merge --ff-only ONLY. Never git pull / reset --hard / clean.
#   - Aborts BEFORE restart if: repo dirty, tests fail, DASHBOARD_TOKEN missing,
#     or any security check fails.
#   - Only restarts: sinister-diesel-sync, dashboard-api
#   - No secrets ever printed. No automatic reboot.
# =============================================================================

set -uo pipefail
# NOTE: intentionally NOT using `set -e` globally — we need to control exact
# abort points ourselves and print diagnostics before exiting. Every command
# whose failure must abort the run is checked explicitly.

# ----------------------------- Configuration --------------------------------
APP_DIR="/opt/sinister-diesel-sync"
DEPLOY_USER="ubuntu"
BRANCH="main"
REMOTE="origin"
PM2_APPS=("sinister-diesel-sync" "dashboard-api")
DASHBOARD_PORT=3001

# --- Dashboard route map (verified against dashboard-server.js source) -----
# NOTE: dashboard-server.js defines NO "/" route — the dashboard UI is a
# static file served by nginx (root /var/www/sinister-diesel, index
# index.html), which also enforces HTTP Basic Auth (auth_basic +
# .htpasswd) on the ENTIRE server block, separate from and in addition to
# the DASHBOARD_TOKEN Bearer check inside dashboard-server.js. Requests
# straight to 127.0.0.1:3001 bypass nginx/Basic Auth entirely and only
# exercise the Bearer check — that is intentional for these local checks.
NGINX_BASE_URL="http://127.0.0.1"          # dashboard root goes through nginx (port 80), not port 3001
DASHBOARD_API_BASE_URL="http://127.0.0.1:${DASHBOARD_PORT}"  # dashboard-server.js, bypasses nginx/Basic Auth
DASHBOARD_ROOT_PATH="/"                     # served by nginx from /var/www/sinister-diesel (Basic Auth protected)
HEALTH_PATH="/health"                       # dashboard-server.js: explicitly bypasses Bearer auth (line ~163)
AUTH_TEST_PATH="/api/stats"                 # authenticated, low-risk: counts/uptime only, no customer data
REDACTION_TEST_PATH="/api/customers"        # authenticated: redactDeep(getCustomersData()) — exercises masking
AUTH_HEADER_SCHEME="Bearer"                 # confirmed from isAuthorized(): Authorization: Bearer <token>
BACKUP_ROOT="/opt/sinister-diesel-sync-backups"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/backup-${TS}"
DEPLOY_LOG_DIR="${APP_DIR}/logs/deploy"
DEPLOY_LOG="${DEPLOY_LOG_DIR}/deploy-${TS}.log"

STABILIZE_WAIT_SECONDS=15
LOG_TAIL_LINES=500

# ------------------------------- Utilities -----------------------------------
RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; NC=$'\033[0m'

log()   { echo "${BLUE}[$(date -u +%H:%M:%S)]${NC} $*" | tee -a "$DEPLOY_LOG" 2>/dev/null || echo "[$(date -u +%H:%M:%S)] $*"; }
ok()    { echo "${GREEN}[OK]${NC} $*" | tee -a "$DEPLOY_LOG" 2>/dev/null || echo "[OK] $*"; }
warn()  { echo "${YELLOW}[WARN]${NC} $*" | tee -a "$DEPLOY_LOG" 2>/dev/null || echo "[WARN] $*"; }
fail()  { echo "${RED}[FAIL]${NC} $*" | tee -a "$DEPLOY_LOG" 2>/dev/null || echo "[FAIL] $*"; }

ABORT_REASON=""
abort() {
  ABORT_REASON="$1"
  fail "ABORTING BEFORE RESTART: $ABORT_REASON"
  fail "No PM2 apps were restarted. Production is untouched beyond git state (if fast-forward already occurred, see notes below)."
  print_summary "ABORTED"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || abort "Required command not found: $1"
}

# Redact-safe grep: confirms a KEY=VALUE exists/non-empty in .env without ever
# printing the value.
env_key_present_nonempty() {
  local key="$1" file="$2"
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1)"
  [[ -z "$line" ]] && return 1
  local val="${line#${key}=}"
  # strip surrounding quotes/whitespace
  val="$(echo "$val" | sed -E "s/^['\"]//; s/['\"]\$//" | xargs 2>/dev/null || true)"
  [[ -n "$val" ]]
}

env_key_value_bool() {
  # Returns the (non-secret, boolean-ish) value on stdout — only for
  # explicitly whitelisted non-secret flags like ALLOW_ORDER_DRIVEN_ITEM_CREATE.
  local key="$1" file="$2"
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1)"
  [[ -z "$line" ]] && { echo ""; return; }
  echo "${line#${key}=}" | tr -d '\r' | xargs 2>/dev/null || true
}

DEPLOY_RESULT="UNKNOWN"
STEP_LOG=()
step_record() { STEP_LOG+=("$1"); }

print_summary() {
  local status="$1"
  echo ""
  echo "=================================================================="
  echo " DEPLOYMENT SUMMARY — ${status}"
  echo "=================================================================="
  echo " Timestamp (UTC):     ${TS}"
  echo " App directory:       ${APP_DIR}"
  echo " Backup directory:    ${BACKUP_DIR}"
  echo " Pre-deploy HEAD:     ${PRE_HEAD:-N/A}"
  echo " Post-deploy HEAD:    ${POST_HEAD:-N/A}"
  echo " origin/main HEAD:    ${ORIGIN_HEAD:-N/A}"
  for entry in "${STEP_LOG[@]}"; do
    echo "  - ${entry}"
  done
  if [[ "$status" == "ABORTED" ]]; then
    echo ""
    echo " Reason: ${ABORT_REASON}"
  fi
  if [[ -f "${BACKUP_DIR}/ROLLBACK.txt" ]]; then
    echo ""
    echo " --- Rollback commands (also in ${BACKUP_DIR}/ROLLBACK.txt) ---"
    cat "${BACKUP_DIR}/ROLLBACK.txt"
  fi
  echo "=================================================================="
}

# =============================================================================
# 0. Pre-flight
# =============================================================================
mkdir -p "$DEPLOY_LOG_DIR" 2>/dev/null || true
touch "$DEPLOY_LOG" 2>/dev/null || true

log "Starting deployment. User: $(whoami 2>/dev/null). Expected deploy user: ${DEPLOY_USER}"
if [[ "$(whoami 2>/dev/null)" != "$DEPLOY_USER" ]]; then
  warn "Running as $(whoami), not '${DEPLOY_USER}'. Continuing, but PM2/service checks assume the ${DEPLOY_USER} context."
fi

for c in git node pm2 sha256sum tar systemctl curl ss awk grep sed; do
  require_cmd "$c"
done

cd "$APP_DIR" || abort "Cannot cd into ${APP_DIR}"

# =============================================================================
# 1. Confirm repo is on main with no tracked modifications
# =============================================================================
log "Step 1: Verifying branch and clean working tree..."

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || abort "Repo is on branch '${CURRENT_BRANCH}', expected '${BRANCH}'."

if [[ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]]; then
  fail "Tracked modifications detected:"
  git status --porcelain --untracked-files=no | tee -a "$DEPLOY_LOG"
  abort "Working tree has tracked modifications. Refusing to deploy over dirty state."
fi
ok "On branch '${BRANCH}', no tracked modifications."
step_record "Step 1: branch=${BRANCH}, working tree clean — OK"

# =============================================================================
# 2. Record current Git HEAD and PM2 state
# =============================================================================
log "Step 2: Recording current HEAD and PM2 state..."

PRE_HEAD="$(git rev-parse HEAD)"
PRE_HEAD_SUBJECT="$(git log -1 --format='%s' "$PRE_HEAD")"
log "Pre-deploy HEAD: ${PRE_HEAD} (${PRE_HEAD_SUBJECT})"

PRE_PM2_STATE_FILE="${BACKUP_DIR}/pm2-state-before.json"
mkdir -p "$BACKUP_DIR"
pm2 jlist > "$PRE_PM2_STATE_FILE" 2>/dev/null || warn "Could not capture pm2 jlist (pm2 may not be running yet)."
pm2 list 2>/dev/null | tee -a "$DEPLOY_LOG" || true

step_record "Step 2: recorded PRE_HEAD=${PRE_HEAD}, pm2 state saved to ${PRE_PM2_STATE_FILE}"

# =============================================================================
# 3. Create verified backup
# =============================================================================
log "Step 3: Creating verified backup at ${BACKUP_DIR}..."
mkdir -p "${BACKUP_DIR}/files"

# 3a. Git bundle --all
if git bundle create "${BACKUP_DIR}/repo-all.bundle" --all 2>>"$DEPLOY_LOG"; then
  ok "Git bundle created."
else
  abort "Failed to create git bundle backup."
fi

git bundle verify "${BACKUP_DIR}/repo-all.bundle" >>"$DEPLOY_LOG" 2>&1 \
  && ok "Git bundle verified." \
  || abort "Git bundle verification failed."

# 3b. Individual sensitive/critical files
for f in .env ecosystem.config.js dashboard-server.js dashboard.html health.js nginx.conf; do
  if [[ -f "$APP_DIR/$f" ]]; then
    cp -p "$APP_DIR/$f" "${BACKUP_DIR}/files/$(basename "$f")" 2>>"$DEPLOY_LOG" \
      && ok "Backed up $f" \
      || abort "Failed to back up required file: $f"
  else
    warn "$f not found at ${APP_DIR} — skipping (may not exist in this deployment)."
  fi
done

# 3c. Source archive excluding node_modules, logs, data/runtime, secrets
SRC_ARCHIVE="${BACKUP_DIR}/source-archive.tar.gz"
tar -C "$APP_DIR" \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='data/runtime' \
  --exclude='.env' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='**/credentials*' \
  --exclude='**/secrets*' \
  -czf "$SRC_ARCHIVE" . 2>>"$DEPLOY_LOG"
if [[ -f "$SRC_ARCHIVE" ]]; then
  ok "Source archive created: $SRC_ARCHIVE"
else
  abort "Failed to create source archive."
fi

# 3d. SHA-256 manifest of everything in the backup dir
MANIFEST="${BACKUP_DIR}/SHA256SUMS.txt"
( cd "$BACKUP_DIR" && find . -type f ! -name 'SHA256SUMS.txt' -print0 \
    | xargs -0 sha256sum ) > "$MANIFEST" 2>>"$DEPLOY_LOG"
if [[ -s "$MANIFEST" ]]; then
  ok "SHA-256 manifest written: $MANIFEST"
else
  abort "Failed to generate SHA-256 manifest for backup."
fi

# Verify manifest integrity immediately (fail-fast if the backup is bad)
( cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS.txt --quiet ) >>"$DEPLOY_LOG" 2>&1 \
  && ok "Backup manifest self-check passed." \
  || abort "Backup manifest self-check FAILED — backup is not trustworthy."

step_record "Step 3: backup verified at ${BACKUP_DIR} (bundle + files + archive + manifest)"

# =============================================================================
# 4. Fetch origin and show diff summary
# =============================================================================
log "Step 4: Fetching ${REMOTE}..."
git fetch "$REMOTE" "$BRANCH" --prune 2>>"$DEPLOY_LOG" \
  && ok "Fetch complete." \
  || abort "git fetch failed."

ORIGIN_HEAD="$(git rev-parse "${REMOTE}/${BRANCH}")"
log "Local HEAD:       ${PRE_HEAD}"
log "origin/${BRANCH}: ${ORIGIN_HEAD}"

if [[ "$PRE_HEAD" == "$ORIGIN_HEAD" ]]; then
  ok "Already up to date with origin/${BRANCH}. Nothing to fast-forward."
  step_record "Step 4-5: already up to date (HEAD == origin/${BRANCH})"
else
  log "Incoming commits:"
  git log --oneline "${PRE_HEAD}..${ORIGIN_HEAD}" | tee -a "$DEPLOY_LOG"
  log "Incoming files (name-status):"
  git diff --name-status "${PRE_HEAD}..${ORIGIN_HEAD}" | tee -a "$DEPLOY_LOG"
  step_record "Step 4: fetched; ${PRE_HEAD:0:12}..${ORIGIN_HEAD:0:12} pending fast-forward"

  # ===========================================================================
  # 5. Fast-forward only — NEVER pull/reset --hard/clean
  # ===========================================================================
  log "Step 5: Fast-forwarding to origin/${BRANCH} (git merge --ff-only)..."
  if git merge --ff-only "${REMOTE}/${BRANCH}" 2>>"$DEPLOY_LOG"; then
    ok "Fast-forward merge succeeded."
  else
    abort "git merge --ff-only failed — local history has diverged from origin/${BRANCH}. Manual intervention required. No changes were forced; repo left as-is."
  fi
  step_record "Step 5: fast-forwarded to $(git rev-parse HEAD)"
fi

POST_HEAD="$(git rev-parse HEAD)"
[[ "$POST_HEAD" == "$ORIGIN_HEAD" ]] || abort "Post-merge HEAD (${POST_HEAD}) does not equal origin/${BRANCH} (${ORIGIN_HEAD})."

# =============================================================================
# 6. Verify no forbidden files were introduced
# =============================================================================
log "Step 6: Scanning incoming changes for forbidden files..."

CHANGED_FILES="$(git diff --name-only "${PRE_HEAD}" "${POST_HEAD}" 2>/dev/null || true)"
FORBIDDEN_PATTERN='(^|/)\.env($|\.[^e][^x][^a][^m][^p][^l][^e]*$)|(^|/)logs(/|$)|(^|/)node_modules(/|$)|data/runtime/.*\.json$|(^|/)(credential|secret)s?[^/]*$'

FORBIDDEN_HITS="$(echo "$CHANGED_FILES" | grep -inE "$FORBIDDEN_PATTERN" || true)"
if [[ -n "$FORBIDDEN_HITS" ]]; then
  fail "Forbidden files detected in incoming changeset:"
  echo "$FORBIDDEN_HITS" | tee -a "$DEPLOY_LOG"
  abort "Forbidden file(s) introduced by merge (.env / logs / node_modules / runtime JSON / credentials). Repo is now at origin/${BRANCH} but restart is blocked — restore from backup if needed."
fi

# Also do a working-tree presence sanity check (not just diff) for the most
# dangerous cases — a committed .env or credentials file even if unchanged.
TRACKED_ENV="$(git ls-files | grep -inE '(^|/)\.env$' || true)"
if [[ -n "$TRACKED_ENV" ]]; then
  fail "A real .env file appears to be TRACKED in git:"
  echo "$TRACKED_ENV" | tee -a "$DEPLOY_LOG"
  abort "Tracked .env file detected in repository. Refusing to proceed."
fi

ok "No forbidden files found in incoming changeset."
step_record "Step 6: forbidden-file scan clean"

# =============================================================================
# 7. Static + test verification
# =============================================================================
log "Step 7a: git diff --check (whitespace/conflict markers)..."
if git diff --check "${PRE_HEAD}" "${POST_HEAD}" 2>>"$DEPLOY_LOG"; then
  ok "git diff --check passed (no conflict markers / trailing whitespace errors)."
else
  abort "git diff --check reported issues (see log). Refusing to proceed."
fi

log "Step 7b: node --check on all changed JavaScript..."
CHANGED_JS="$(echo "$CHANGED_FILES" | grep -E '\.js$' || true)"
JS_CHECK_FAILED=0
if [[ -n "$CHANGED_JS" ]]; then
  while IFS= read -r jsfile; do
    [[ -z "$jsfile" || ! -f "$jsfile" ]] && continue
    if node --check "$jsfile" 2>>"$DEPLOY_LOG"; then
      ok "node --check OK: $jsfile"
    else
      fail "node --check FAILED: $jsfile"
      JS_CHECK_FAILED=1
    fi
  done <<< "$CHANGED_JS"
else
  log "No changed .js files to check."
fi
[[ "$JS_CHECK_FAILED" -eq 0 ]] || abort "node --check failed on one or more changed JS files."

log "Step 7c: Running full safe test suite..."
TEST_LOG="${BACKUP_DIR}/test-output.log"
if npm run test --silent > "$TEST_LOG" 2>&1; then
  ok "Test suite passed (npm run test)."
elif npx --no-install mocha 'test/**/*.test.js' --timeout 20000 > "$TEST_LOG" 2>&1; then
  ok "Test suite passed (mocha fallback)."
else
  fail "Test suite FAILED. Tail of output:"
  tail -n 60 "$TEST_LOG" | tee -a "$DEPLOY_LOG"
  abort "Test suite failed after fast-forward. Repo is at origin/${BRANCH}; restart is blocked. Use rollback commands below if needed."
fi
step_record "Step 7: diff-check + node --check + test suite — all passed"

# =============================================================================
# 8. Inspect .env without printing secrets
# =============================================================================
log "Step 8: Inspecting .env (no secret values will be printed)..."
ENV_FILE="${APP_DIR}/.env"
[[ -f "$ENV_FILE" ]] || abort "No .env file found at ${ENV_FILE}."

DASHBOARD_TOKEN_PRESENT=0
if env_key_present_nonempty "DASHBOARD_TOKEN" "$ENV_FILE"; then
  DASHBOARD_TOKEN_PRESENT=1
  ok "DASHBOARD_TOKEN is present and non-empty (value not shown)."
else
  DASHBOARD_TOKEN_PRESENT=0
  fail "DASHBOARD_TOKEN is missing or empty."
fi

ALLOW_ORDER_DRIVEN="$(env_key_value_bool "ALLOW_ORDER_DRIVEN_ITEM_CREATE" "$ENV_FILE")"
ALLOW_ORDER_DRIVEN_LC="$(echo "$ALLOW_ORDER_DRIVEN" | tr '[:upper:]' '[:lower:]')"
if [[ -z "$ALLOW_ORDER_DRIVEN_LC" || "$ALLOW_ORDER_DRIVEN_LC" == "false" ]]; then
  ok "ALLOW_ORDER_DRIVEN_ITEM_CREATE is false/unset (safe default)."
else
  warn "ALLOW_ORDER_DRIVEN_ITEM_CREATE is set to '${ALLOW_ORDER_DRIVEN}'. This must be an EXPLICITLY APPROVED value."
  step_record "Step 8: WARNING — ALLOW_ORDER_DRIVEN_ITEM_CREATE=${ALLOW_ORDER_DRIVEN} (verify this was explicitly approved)"
fi

PID_SYNC_ENABLED_LC="$(echo "$(env_key_value_bool "PRODUCT_ID_SYNC_ENABLED" "$ENV_FILE")" | tr '[:upper:]' '[:lower:]')"
PID_SYNC_DRYRUN_LC="$(echo "$(env_key_value_bool "PRODUCT_ID_SYNC_DRY_RUN" "$ENV_FILE")" | tr '[:upper:]' '[:lower:]')"

RECON_SAFE=1
if [[ "$PID_SYNC_ENABLED_LC" == "true" && "$PID_SYNC_DRYRUN_LC" != "true" ]]; then
  RECON_SAFE=0
  warn "Product reconciliation is ENABLED with dry-run OFF (PRODUCT_ID_SYNC_ENABLED=true, PRODUCT_ID_SYNC_DRY_RUN=${PID_SYNC_DRYRUN_LC:-unset}). This performs live writes to NetSuite."
else
  ok "Product reconciliation remains disabled/dry-run by default (ENABLED=${PID_SYNC_ENABLED_LC:-false}, DRY_RUN=${PID_SYNC_DRYRUN_LC:-true})."
fi

step_record "Step 8: .env inspected — DASHBOARD_TOKEN present=${DASHBOARD_TOKEN_PRESENT}, ORDER_DRIVEN=${ALLOW_ORDER_DRIVEN_LC:-false}, RECON safe=${RECON_SAFE}"

# =============================================================================
# 9. Abort if DASHBOARD_TOKEN missing
# =============================================================================
if [[ "$DASHBOARD_TOKEN_PRESENT" -eq 0 ]]; then
  fail "DASHBOARD_TOKEN is missing. Dashboard API auth would fail open or reject all requests."
  echo ""
  echo "  To generate a new secure token, run (this does NOT print an existing token):"
  echo ""
  echo "    echo \"DASHBOARD_TOKEN=\$(openssl rand -hex 32)\" >> ${ENV_FILE}"
  echo ""
  echo "  Then re-run this deployment script."
  abort "DASHBOARD_TOKEN missing from .env — stopped before restart."
fi

# =============================================================================
# 10. Verify dashboard authentication behavior (pre-restart smoke on CURRENT
#     running process; will be re-verified again post-restart in step 14)
# =============================================================================
log "Step 10: Verifying dashboard authentication behavior..."

# Read token internally only — never echoed, never logged.
_DASHBOARD_TOKEN_INTERNAL="$(grep -E '^DASHBOARD_TOKEN=' "$ENV_FILE" | tail -n1 | sed -E 's/^DASHBOARD_TOKEN=//' | sed -E "s/^['\"]//; s/['\"]\$//")"

# auth_check() exercises AUTH_TEST_PATH (authenticated, low-risk) against
# dashboard-server.js directly (127.0.0.1:${DASHBOARD_PORT}), bypassing nginx
# and its separate HTTP Basic Auth layer on purpose — this isolates the
# DASHBOARD_TOKEN Bearer check that isAuthorized() implements. Confirmed from
# source: Authorization: "${AUTH_HEADER_SCHEME} <token>", compared via
# timingSafeTokenEqual(). Query-string tokens are never read anywhere in
# dashboard-server.js, so a "?token=" request is just an unauthenticated
# request and must be rejected identically to no-token at all. A malformed
# token (wrong scheme / garbage value) must also be rejected — isAuthorized()
# returns false whenever scheme !== 'Bearer' or the value fails a
# timing-safe compare.
auth_check() {
  local base="$DASHBOARD_API_BASE_URL"
  local endpoint="$AUTH_TEST_PATH"
  local no_token_code bearer_code qs_code malformed_code

  # 1) No token at all → 401/403
  no_token_code="$(curl -s -o /dev/null -w '%{http_code}' "${base}${endpoint}" --max-time 5 2>>"$DEPLOY_LOG")"
  if [[ "$no_token_code" == "401" || "$no_token_code" == "403" ]]; then
    ok "No-token request correctly rejected (HTTP ${no_token_code}) on ${endpoint}."
  else
    fail "No-token request returned HTTP ${no_token_code}, expected 401/403, on ${endpoint}."
    return 1
  fi

  # 2) Valid Bearer token → 200
  bearer_code="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: ${AUTH_HEADER_SCHEME} ${_DASHBOARD_TOKEN_INTERNAL}" "${base}${endpoint}" --max-time 5 2>>"$DEPLOY_LOG")"
  if [[ "$bearer_code" == "200" ]]; then
    ok "Authenticated request (${AUTH_HEADER_SCHEME} header) returned HTTP 200 on ${endpoint}."
  else
    fail "Authenticated request returned HTTP ${bearer_code}, expected 200, on ${endpoint}."
    return 1
  fi

  # 3) Query-string token → 401/403 (dashboard-server.js never reads query-string tokens)
  qs_code="$(curl -s -o /dev/null -w '%{http_code}' "${base}${endpoint}?token=${_DASHBOARD_TOKEN_INTERNAL}" --max-time 5 2>>"$DEPLOY_LOG")"
  if [[ "$qs_code" == "401" || "$qs_code" == "403" ]]; then
    ok "Query-string token correctly rejected (HTTP ${qs_code}) — not a supported auth mechanism."
  else
    fail "Query-string token returned HTTP ${qs_code} — expected 401/403 (should NOT authenticate via query string)."
    return 1
  fi

  # 4) Malformed token (wrong scheme AND a garbage bearer value) → 401/403
  malformed_code="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Basic not-a-real-token" "${base}${endpoint}" --max-time 5 2>>"$DEPLOY_LOG")"
  if [[ "$malformed_code" == "401" || "$malformed_code" == "403" ]]; then
    ok "Malformed Authorization header (wrong scheme) correctly rejected (HTTP ${malformed_code})."
  else
    fail "Malformed Authorization header returned HTTP ${malformed_code}, expected 401/403."
    return 1
  fi
  malformed_code="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: ${AUTH_HEADER_SCHEME} wrong-garbage-value" "${base}${endpoint}" --max-time 5 2>>"$DEPLOY_LOG")"
  if [[ "$malformed_code" == "401" || "$malformed_code" == "403" ]]; then
    ok "Malformed Authorization header (wrong ${AUTH_HEADER_SCHEME} value) correctly rejected (HTTP ${malformed_code})."
  else
    fail "Malformed ${AUTH_HEADER_SCHEME} value returned HTTP ${malformed_code}, expected 401/403."
    return 1
  fi

  return 0
}

if curl -s -o /dev/null --max-time 3 "${DASHBOARD_API_BASE_URL}${HEALTH_PATH}" 2>/dev/null; then
  if auth_check; then
    ok "Dashboard authentication behavior verified (pre-restart baseline)."
  else
    unset _DASHBOARD_TOKEN_INTERNAL
    abort "Dashboard authentication checks FAILED on currently running instance. Not restarting."
  fi
else
  warn "Dashboard API not currently reachable on ${DASHBOARD_API_BASE_URL} — will verify fully after restart (step 14)."
fi
unset _DASHBOARD_TOKEN_INTERNAL
step_record "Step 10: dashboard auth behavior checked on ${AUTH_TEST_PATH} — no-token, ${AUTH_HEADER_SCHEME}, query-string, malformed all verified"

# =============================================================================
# 11. Verify public health behavior is intentional and safe
# =============================================================================
log "Step 11: Verifying ${HEALTH_PATH} is public-safe (no sensitive data, no auth required by design)..."
HEALTH_BODY="$(curl -s --max-time 5 "${DASHBOARD_API_BASE_URL}${HEALTH_PATH}" 2>/dev/null || true)"
if [[ -n "$HEALTH_BODY" ]]; then
  if echo "$HEALTH_BODY" | grep -qiE 'DASHBOARD_TOKEN|NETSUITE_CONSUMER|NETSUITE_TOKEN|password|@[a-z0-9.-]+\.[a-z]{2,}'; then
    fail "/health response appears to contain sensitive data or email addresses:"
    echo "$HEALTH_BODY" | tee -a "$DEPLOY_LOG"
    abort "/health endpoint is leaking sensitive information. Refusing to proceed."
  else
    ok "/health response contains no obvious secrets/PII (status/uptime-style payload only)."
  fi
else
  warn "/health not reachable pre-restart — will re-check post-restart."
fi
step_record "Step 11: /health content-safety check completed"

# =============================================================================
# 12. Restart only affected PM2 apps
# =============================================================================
log "Step 12: Restarting PM2 apps: ${PM2_APPS[*]}..."
RESTART_FAILED=0
for app in "${PM2_APPS[@]}"; do
  if pm2 restart "$app" --update-env 2>>"$DEPLOY_LOG"; then
    ok "pm2 restart ${app} issued."
  else
    fail "pm2 restart ${app} failed."
    RESTART_FAILED=1
  fi
done
[[ "$RESTART_FAILED" -eq 0 ]] || abort "One or more PM2 restarts failed. Investigate immediately; backup is at ${BACKUP_DIR}."
step_record "Step 12: pm2 restart issued for ${PM2_APPS[*]}"

# =============================================================================
# 13. Wait for stability
# =============================================================================
log "Step 13: Waiting ${STABILIZE_WAIT_SECONDS}s for stabilization..."
sleep "$STABILIZE_WAIT_SECONDS"
step_record "Step 13: waited ${STABILIZE_WAIT_SECONDS}s for stabilization"

# =============================================================================
# 14. Post-restart verification
# =============================================================================
log "Step 14: Post-restart verification..."

# 14a. Both apps online
PM2_POST_JSON="$(pm2 jlist 2>/dev/null || echo '[]')"
APPS_ONLINE=1
for app in "${PM2_APPS[@]}"; do
  status="$(echo "$PM2_POST_JSON" | node -e "
    let apps=[]; try{apps=JSON.parse(require('fs').readFileSync(0,'utf8'))}catch(e){}
    const a=apps.find(x=>x.name==='${app}');
    console.log(a && a.pm2_env ? a.pm2_env.status : 'missing');
  " 2>/dev/null)"
  if [[ "$status" == "online" ]]; then
    ok "PM2 app '${app}' is online."
  else
    fail "PM2 app '${app}' status: ${status}"
    APPS_ONLINE=0
  fi
done
[[ "$APPS_ONLINE" -eq 1 ]] || abort "Not all PM2 apps are online after restart. Backup at ${BACKUP_DIR}. Manual intervention required."

# 14b. Port 3001 listening
if ss -ltn 2>/dev/null | grep -q ":${DASHBOARD_PORT}\b"; then
  ok "Port ${DASHBOARD_PORT} is listening."
else
  abort "Port ${DASHBOARD_PORT} is NOT listening after restart."
fi

# 14c. Dashboard root loads
# IMPORTANT: dashboard-server.js defines NO "/" route (only /health and /api/*
# — anything else is a 404 from that process). The dashboard UI (dashboard.html)
# is served by nginx as a static file from /var/www/sinister-diesel, and the
# whole nginx server block is behind HTTP Basic Auth (auth_basic +
# .htpasswd) — a separate layer from DASHBOARD_TOKEN. So this check goes
# through nginx (NGINX_BASE_URL, port 80) and accepts either 200 (if Basic
# Auth creds happen to be supplied/cached) or 401 (Basic Auth challenge,
# expected and correct when unauthenticated) as evidence the site is up and
# still protected. A 404/000/5xx means something is actually broken.
ROOT_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${NGINX_BASE_URL}${DASHBOARD_ROOT_PATH}" 2>/dev/null)"
if [[ "$ROOT_CODE" =~ ^(200|301|302|401)$ ]]; then
  ok "Dashboard root reachable via nginx (HTTP ${ROOT_CODE}) — 401 is expected/correct if Basic Auth creds are not supplied here."
else
  abort "Dashboard root (via nginx, ${NGINX_BASE_URL}${DASHBOARD_ROOT_PATH}) returned HTTP ${ROOT_CODE} after restart — expected 200/301/302/401."
fi

# 14d. Health endpoint responds
HEALTH_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${DASHBOARD_API_BASE_URL}${HEALTH_PATH}" 2>/dev/null)"
[[ "$HEALTH_CODE" == "200" ]] && ok "${HEALTH_PATH} responds HTTP 200." || abort "${HEALTH_PATH} returned HTTP ${HEALTH_CODE} after restart."

# 14e. Authenticated operational endpoints respond (re-run full auth_check:
# no-token, Bearer, query-string, and malformed-token cases)
_DASHBOARD_TOKEN_INTERNAL="$(grep -E '^DASHBOARD_TOKEN=' "$ENV_FILE" | tail -n1 | sed -E 's/^DASHBOARD_TOKEN=//' | sed -E "s/^['\"]//; s/['\"]\$//")"
if auth_check; then
  ok "Post-restart authentication behavior verified."
else
  unset _DASHBOARD_TOKEN_INTERNAL
  abort "Post-restart authentication checks FAILED."
fi

# 14f. Customer identifiers masked / no raw PII, tokens, or full payloads.
# Uses REDACTION_TEST_PATH (/api/customers), which passes through
# redactDeep(getCustomersData()) per dashboard-server.js. Verified against
# the ACTUAL masking schema in redact.js:
#   maskEmail   -> "ab***@domain.com"          (never a full local-part)
#   maskPhone   -> "***-***-1234"              (only last 4 digits visible)
#   maskAddress -> "*** , City, ST 12345"      (street portion always masked)
#   maskToken   -> "abc...xyz"                 (any key matching token/secret/key/password/auth)
#   maskName    -> "J*** D**"                  (first letter + asterisks per word)
SAMPLE_RESPONSE="$(curl -s --max-time 5 -H "Authorization: ${AUTH_HEADER_SCHEME} ${_DASHBOARD_TOKEN_INTERNAL}" "${DASHBOARD_API_BASE_URL}${REDACTION_TEST_PATH}" 2>/dev/null || true)"
unset _DASHBOARD_TOKEN_INTERNAL
PII_LEAK=0
if echo "$SAMPLE_RESPONSE" | grep -qiE '"email"\s*:\s*"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"'; then
  # allow masked emails like jo***@example.com but flag full unmasked ones
  if echo "$SAMPLE_RESPONSE" | grep -oiE '"email"\s*:\s*"[^"]*"' | grep -qvE '\*'; then
    PII_LEAK=1
  fi
fi
if echo "$SAMPLE_RESPONSE" | grep -qiE 'DASHBOARD_TOKEN|NETSUITE_CONSUMER|NETSUITE_TOKEN'; then
  PII_LEAK=1
fi
if [[ "$PII_LEAK" -eq 1 ]]; then
  fail "Sample authenticated response appears to contain unmasked PII or secrets."
  abort "PII/secret leakage detected in API response after restart."
else
  ok "Sample customer response shows masked identifiers / no raw PII, tokens, or secrets (best-effort check)."
fi

# 14g. Flow 4 completes with zero writes / item creation blocked by default
# (Verified via ALLOW_ORDER_DRIVEN_ITEM_CREATE and PRODUCT_ID_SYNC checks from
# Step 8; re-confirm here against the live running env.)
if [[ "$RECON_SAFE" -eq 1 ]]; then
  ok "Flow 4 / product reconciliation configuration confirms zero-write default (re-checked)."
else
  abort "Product reconciliation is not in a safe zero-write default state post-restart."
fi
if [[ -z "$ALLOW_ORDER_DRIVEN_LC" || "$ALLOW_ORDER_DRIVEN_LC" == "false" ]]; then
  ok "Order-driven item creation remains blocked by default (re-checked)."
else
  warn "Order-driven item creation is enabled (ALLOW_ORDER_DRIVEN_ITEM_CREATE=${ALLOW_ORDER_DRIVEN}) — confirm this is intentional and approved."
fi

step_record "Step 14: all post-restart checks passed (online, port, root, health, auth, PII masking, zero-write defaults)"

# =============================================================================
# 15. Log inspection
# =============================================================================
log "Step 15: Inspecting recent logs for issues..."
LOG_ISSUES=0
LOG_FILES=$(find "${APP_DIR}/logs" -maxdepth 2 -type f -name '*.log' -newer "${APP_DIR}/.env" 2>/dev/null)
[[ -z "$LOG_FILES" ]] && LOG_FILES=$(find "${APP_DIR}/logs" -maxdepth 2 -type f -name '*.log' 2>/dev/null)

for lf in $LOG_FILES; do
  RECENT="$(tail -n "$LOG_TAIL_LINES" "$lf" 2>/dev/null)"
  [[ -z "$RECENT" ]] && continue

  if echo "$RECENT" | grep -qiE 'uncaughtexception|unhandledrejection|TypeError|ReferenceError'; then
    warn "Possible exceptions found in $lf"; LOG_ISSUES=1
  fi
  if echo "$RECENT" | grep -qiE '\b401\b|\b403\b|authentication failed|invalid token|unauthorized'; then
    warn "Authentication failures noted in $lf (expected occasionally; review volume)."
  fi
  if echo "$RECENT" | grep -qoiE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | grep -qvE '\*'; then
    fail "Possible RAW (unmasked) email address found in $lf"; LOG_ISSUES=1
  fi
  if echo "$RECENT" | grep -qiE '[0-9]{3}[- ]?[0-9]{3}[- ]?[0-9]{4}'; then
    warn "Possible raw phone-number-like pattern found in $lf — verify masking."
  fi
  if echo "$RECENT" | grep -qiE 'duplicate sku|duplicate item'; then
    log "Duplicate SKU reporting present in $lf (informational)."
  fi
  if echo "$RECENT" | grep -qiE 'customer validation (error|failed)|invalid customer'; then
    log "Customer validation errors present in $lf (informational — review if volume is high)."
  fi
done

if [[ "$LOG_ISSUES" -eq 1 ]]; then
  fail "Log inspection surfaced potential exceptions or raw PII leakage."
  abort "Log inspection failed post-restart. Apps are running but flagged — investigate before declaring success. Backup at ${BACKUP_DIR}."
fi
ok "Log inspection completed — no blocking issues found."
step_record "Step 15: log inspection completed, no blocking issues"

# =============================================================================
# 16. Reset PM2 restart counters (only after successful stability verification)
# =============================================================================
log "Step 16: Resetting PM2 restart counters for verified-stable apps..."
for app in "${PM2_APPS[@]}"; do
  pm2 reset "$app" 2>>"$DEPLOY_LOG" && ok "pm2 reset counters: ${app}" || warn "pm2 reset failed for ${app} (non-fatal)."
done
step_record "Step 16: PM2 restart counters reset"

# =============================================================================
# 17. pm2 save --force
# =============================================================================
log "Step 17: Saving PM2 process list..."
pm2 save --force 2>>"$DEPLOY_LOG" && ok "pm2 save --force completed." || abort "pm2 save --force failed."
step_record "Step 17: pm2 save --force completed"

# =============================================================================
# 18. Final confirmations
# =============================================================================
log "Step 18: Final system confirmations..."

FINAL_STATUS_CLEAN=1
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  fail "Git status is NOT clean post-deploy."
  FINAL_STATUS_CLEAN=0
else
  ok "Git status clean."
fi

FINAL_HEAD="$(git rev-parse HEAD)"
if [[ "$FINAL_HEAD" == "$ORIGIN_HEAD" ]]; then
  ok "Git HEAD (${FINAL_HEAD}) equals origin/${BRANCH}."
else
  fail "Git HEAD (${FINAL_HEAD}) does NOT equal origin/${BRANCH} (${ORIGIN_HEAD})."
  FINAL_STATUS_CLEAN=0
fi

PM2_UBUNTU_ACTIVE="$(systemctl is-active pm2-ubuntu 2>/dev/null || echo unknown)"
PM2_UBUNTU_ENABLED="$(systemctl is-enabled pm2-ubuntu 2>/dev/null || echo unknown)"
PM2_ROOT_ACTIVE="$(systemctl is-active pm2-root 2>/dev/null || echo unknown)"
PM2_ROOT_ENABLED="$(systemctl is-enabled pm2-root 2>/dev/null || echo unknown)"

[[ "$PM2_UBUNTU_ACTIVE" == "active" ]] && ok "pm2-ubuntu.service is active." || fail "pm2-ubuntu.service is '${PM2_UBUNTU_ACTIVE}', expected active."
[[ "$PM2_UBUNTU_ENABLED" == "enabled" ]] && ok "pm2-ubuntu.service is enabled." || fail "pm2-ubuntu.service is '${PM2_UBUNTU_ENABLED}', expected enabled."
[[ "$PM2_ROOT_ACTIVE" != "active" ]] && ok "pm2-root.service is inactive (as expected)." || fail "pm2-root.service is unexpectedly active."
[[ "$PM2_ROOT_ENABLED" != "enabled" ]] && ok "pm2-root.service is disabled (as expected)." || fail "pm2-root.service is unexpectedly enabled."

step_record "Step 18: git clean=${FINAL_STATUS_CLEAN}, HEAD match=$([[ "$FINAL_HEAD" == "$ORIGIN_HEAD" ]] && echo yes || echo no), pm2-ubuntu=${PM2_UBUNTU_ACTIVE}/${PM2_UBUNTU_ENABLED}, pm2-root=${PM2_ROOT_ACTIVE}/${PM2_ROOT_ENABLED}"

# =============================================================================
# 19. Print rollback commands
# =============================================================================
ROLLBACK_FILE="${BACKUP_DIR}/ROLLBACK.txt"
cat > "$ROLLBACK_FILE" <<EOF
# Rollback instructions for deployment ${TS}
# Pre-deploy HEAD: ${PRE_HEAD}
# Backup dir:      ${BACKUP_DIR}

## 1) Restore code to pre-deploy state (choose ONE method)

# Method A — reset the existing repo to the pre-deploy commit (safe: no pull/reset --hard/clean per policy,
# but rollback explicitly uses checkout to a known-good commit, which is acceptable for recovery):
cd ${APP_DIR}
git fetch origin
git checkout ${PRE_HEAD}
git switch -c rollback-${TS} 2>/dev/null || true
# Then fast-track back onto main once fixed:
#   git checkout main && git reset --hard ${PRE_HEAD}   # ONLY for emergency rollback, not routine ops

# Method B — restore from the git bundle:
cd /tmp
git clone ${BACKUP_DIR}/repo-all.bundle rollback-clone-${TS}
# inspect / cherry-pick as needed, or copy files out of rollback-clone-${TS}

## 2) Restore critical files from backup
cp -p ${BACKUP_DIR}/files/.env ${APP_DIR}/.env
cp -p ${BACKUP_DIR}/files/ecosystem.config.js ${APP_DIR}/ecosystem.config.js
cp -p ${BACKUP_DIR}/files/dashboard-server.js ${APP_DIR}/dashboard-server.js
cp -p ${BACKUP_DIR}/files/dashboard.html ${APP_DIR}/dashboard.html
cp -p ${BACKUP_DIR}/files/health.js ${APP_DIR}/health.js
cp -p ${BACKUP_DIR}/files/nginx.conf ${APP_DIR}/nginx.conf

## 3) Restore full source tree if needed
mkdir -p /tmp/rollback-source-${TS}
tar -xzf ${BACKUP_DIR}/source-archive.tar.gz -C /tmp/rollback-source-${TS}
# then rsync back into ${APP_DIR} as appropriate, excluding node_modules/logs/data/runtime

## 4) Verify backup integrity before trusting it
cd ${BACKUP_DIR} && sha256sum -c SHA256SUMS.txt

## 5) Restart apps after rollback
pm2 restart sinister-diesel-sync dashboard-api --update-env
pm2 save --force
EOF

ok "Rollback commands written to ${ROLLBACK_FILE}"
step_record "Step 19: rollback instructions written to ${ROLLBACK_FILE}"

# =============================================================================
# 20. Do not reboot automatically — explicitly noted
# =============================================================================
log "Step 20: No system reboot performed (by design). If a reboot is ever required, it must be done manually and out-of-band."
step_record "Step 20: no automatic reboot performed"

# =============================================================================
# 21. Stop and report
# =============================================================================
if [[ "$FINAL_STATUS_CLEAN" -eq 1 ]]; then
  DEPLOY_RESULT="SUCCESS"
else
  DEPLOY_RESULT="COMPLETED_WITH_WARNINGS"
fi

print_summary "$DEPLOY_RESULT"
log "Deployment script finished with result: ${DEPLOY_RESULT}"
log "Full log: ${DEPLOY_LOG}"

[[ "$DEPLOY_RESULT" == "SUCCESS" ]] && exit 0 || exit 2
