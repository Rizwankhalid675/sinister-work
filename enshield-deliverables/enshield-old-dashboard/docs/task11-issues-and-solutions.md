# Task 11 Issues and Solutions for Parley, Mieke, and the Team

Date: 2026-07-23

## What is working locally

- The dashboard, operational pages, finance shadow workspace, permissions, claims workflow, webhook verification, delivery outbox, and CSV safety checks pass their configured local automated tests.
- Desktop and mobile browser journeys pass with no tested accessibility or console errors.
- The production frontend compiles.
- All 115 API/action JavaScript modules now parse and load in the local verification environment.
- No targeted hardcoded secrets were found in application source.

## Issues found and what we did

### API actions could not all load locally

**Impact:** Sixteen action files would fail direct Node ESM loading, reducing confidence in runtime portability.

**Solution:** We added an all-module regression test, corrected extensionless local imports, and removed type-only names from runtime imports. All 115 now load locally.

### Protection-price endpoint trusted a supplied shop domain

**Impact:** A caller could probe another tenant and trigger privileged reads/Shopify work without a verified storefront boundary.

**Solution:** The route now fails before any read unless Gadget supplies a verified Shopify app-proxy and current-shop context. The route selects the shop by the verified ID and rejects a mismatched supplied domain.

**Team action:** Configure and test the Shopify app proxy in development/staging, then update the theme request to use that proxy. Until then, the storefront price lookup intentionally returns an authentication error.

### Logs contained excess tenant/business metadata

**Impact:** Domains, URLs, pricing details, product identifiers, response details, and stack/body data could be retained in logs.

**Solution:** Broad application-source and strict named-module regression checks were added. The reviewed logs now contain only allowlisted event codes, error names, status codes, or approved correlation hashes; they do not include raw errors, responses, domains, tracking data, product/variant identifiers, or pricing data.

### Dependency advisories remain

**Impact:** An initial pass under-counted this: a proper `yarn audit` (the repo uses `yarn.lock`, not `package-lock.json`, so `npm audit` silently under-reports) found 168 advisories — 6 critical, 84 high, 53 moderate, 15 low. All 6 criticals (`form-data`, `liquidjs`, `simple-git`) trace to the `@shopify/cli-kit` dev-tooling chain rather than runtime dependencies of the deployed app, but they still pose risk to developer machines running the Shopify CLI.

**Solution completed:** Direct React Router and Vite packages were upgraded to patched ranges.

**Team action:** Refresh the Gadget-generated client/server packages and codegen in an authorized development environment, rerun the full suite, and review/remediate or formally risk-accept the remaining Shopify/Gadget transitive advisories (especially the 6 criticals). Do not force incompatible Fastify major-version overrides.

### CSV does not match the new export contract

**Impact:** The supplied file is valid but lacks tenant, currency, filter, generated-at, and truncation evidence, so Finance cannot use it as a complete reconciliation artifact.

**Solution:** Keep the file as a legacy summary only. Generate a new staging export and compare it with Shopify/Gadget source records captured at the same cutoff time.

## What we still need before go-live

- Authorized Gadget development sync/code generation and schema validation.
- Lint is configured and passes locally (0 errors); keep it required in CI going forward.
- A configured static typecheck lane; `tsc --noEmit` currently does nothing because no `tsconfig.json` exists in the repo, so typechecking has never actually run — this is still blocked/not run.
- Staging internal identity-provider callback and role/tenant tests.
- Shopify app-proxy configuration and signed storefront test.
- Staging Shopify/Gadget data reconciliation with a fixed cutoff.
- Dependency audit cleared or formally risk-accepted by Security.
- Written owner/CPA approvals for finance rules. Finance must remain shadow-only.
- Operations, Security, Product, Finance, and Release owner sign-off.
