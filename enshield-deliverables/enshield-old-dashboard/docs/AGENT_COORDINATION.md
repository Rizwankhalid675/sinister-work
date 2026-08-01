# Agent Coordination Record — Enshield ERP Completion

Status date: current session. This file is the single shared source of truth
for cross-agent/cross-session coordination on this task. Update it as work
progresses; do not duplicate its content elsewhere.

## Ground rules (non-negotiable)
- Legacy path `C:\Users\admin\OneDrive\Desktop\enshield-production-FULL` is
  **read-only**: inspect/search/trace only. Never edit, format, move, delete,
  install deps, or generate build output there.
- The active working application is **this** workspace
  (`enshield-old-dashboard`, a Gadget.dev app: `api/` backend + `web/` frontend).
- All schema/permission changes go through `api/models/*/schema.gadget.ts` +
  `api/lib/permissions.js` (single source of truth for RBAC — already exists).

## Discovery findings (confirmed complete)
- **Current app is already production-grade**, not a blank slate. Existing:
  - Full RBAC (`api/lib/permissions.js`, roles: Super Admin, Administrator,
    Claims Manager, Claims Agent, Finance Manager, ...).
  - Rich `claim` model (15-state enum) + `claimEvent` append-only audit trail.
  - `legacyClaim` / `legacyOrder` staging models + `api/lib/unifiedClaims.js`
    which merges live Shopify claims with imported legacy claims transparently
    in `GET-claims.js` (`source: "shopify"|"legacy"`, `readOnly` flag).
  - Legacy one-time import already implemented: `api/lib/legacyImport.js` +
    `POST-import-legacy-production.js` (see
    `docs/superpowers/plans/2026-07-27-legacy-production-data-import.md`,
    `tests/legacy-import.test.mjs`).
  - Finance/ledger subsystem: `accountingEntity/Period`, `ledgerAccount`,
    `journalEntry/Line`, `receivableDocument/Allocation`,
    `payableDocument/Allocation`, `reconciliationRun/Item`,
    `financeOperationReceipt`, `financialEvent`.
  - Integration delivery/retry system: `integrationDelivery`,
    `integrationDeliveryAttempt`, `webhookReceipt/Attempt`, with a sweep/replay
    pattern (`sweepIntegrationDeliveries`, `replayIntegrationDelivery`).
  - Email via SendGrid: `api/lib/mailer.js` (`sendWelcomeEmail`,
    `sendPasswordResetEmail`; env: `SENDGRID_API_KEY`, `MAIL_FROM_ADDRESS`,
    `MAIL_FROM_NAME`, `APP_BASE_URL`).
  - Internal auth/access: `api/lib/internalAccess.js`
    (`requireInternalAccess`, `shopIdFilter`, `resolveInternalOperator`,
    multi-shop assignment via `operatorShopAssignment`).
  - Dashboard routes exist for claims, clients, orders, users, roles, finance,
    audit log, errors, settings, metafields, insurance variants.

## STATUS UPDATE: Task 11 complete (see docs/task11-*.md for full detail)

All gaps below (originally logged as open) have since been **closed**. This
section is kept for history; do not re-do this work — check the Task 11 docs
first (`task11-go-live-checklist.md`, `task11-issues-and-solutions.md`,
`task11-executive-summary.md`, `task11-technical-test-results.md`).

1. ~~No customer-facing surfaces~~ — **DONE.** Public claim tracking route
   implemented: `api/routes/api/GET-public-claims-[token].js` +
   `web/routes/claimTracking.jsx`, using a generated/signed tracking token
   (see `generateTrackingToken`, `buildTrackingUrl` in
   `api/models/claim/actions/create.js`), rate-limited via `api/lib/rateLimit.js`,
   with PII minimized in the public projection (`PUBLIC_CLAIM_SELECT`).
2. ~~No claim-status notification wiring~~ — **DONE.** `sendClaimStatusChangedEmail`
   wired into `api/models/claim/actions/update.js` via `api/lib/claimNotifications.js`
   and `api/lib/mailer.js`; fires on every recorded transition.
3. ~~No activity-timeline UI~~ — **DONE.** Claim detail page renders `claimEvent`
   history as a timeline (see `web/components/App.jsx` / claim detail route).
4. Form builder / dynamic intake config — **out of scope for Task 11**, not
   required by the go-live checklist; revisit only if explicitly requested.
5. Terminology pass — folded into the general audit; no blocking findings.

## Next steps (external owners only — nothing further actionable in-session)
See `docs/task11-go-live-checklist.md` "External and staging gates" and
"Business / finance approvals" sections. Summary: missing `tsconfig.json`
(typecheck is a no-op), Gadget dev sync/codegen + Shopify app-proxy config,
staging IdP + reconciliation tests, dependency-advisory remediation/risk
acceptance, and written business/finance/security/product/release sign-offs.
Recommendation remains **NO-GO** until those external items close.

## Legacy API inventory + capability matrix
_(to be filled in as inventory work proceeds — append rows, do not remove
prior entries)_

NOTE: This table was stale as of the current session (rows below contradicted
the "STATUS UPDATE: Task 11 complete" section above, which is verified
against code). Corrected to match verified reality.

| Legacy capability | Legacy location | Current equivalent | Status |
|---|---|---|---|
| Claim submission (customer) | TBD | `POST /api/public-form/[slug]`, `POST /api/claim-forms`, `web/routes/claimForms.jsx` | DONE |
| Claim status page (customer) | TBD | `GET /api/public-claims/[token]`, `web/routes/claimTracking.jsx` | DONE |
| Claim CRUD (internal) | TBD | `GET/PATCH claims` | DONE (superset) |
| Notifications on status change | TBD | `sendClaimStatusChangedEmail` in `api/lib/claimNotifications.js`, wired into `claim/actions/update.js` | DONE |
| Claim evidence upload (customer + internal) | TBD | `POST /api/claims/[id]/evidence`, `POST /api/public-claims/[token]/evidence`, `api/lib/evidenceUpload.js` | DONE |
| Claim internal notes | TBD | `GET/POST /api/claims/[id]/notes`, `claimNote` model | DONE |
| Customer portal auth | TBD | `customerAccessToken` model + tracking-token flow | DONE |
| Backfill tracking tokens for pre-existing claims | TBD | `api/actions/backfillClaimTokens.js` | DONE |
