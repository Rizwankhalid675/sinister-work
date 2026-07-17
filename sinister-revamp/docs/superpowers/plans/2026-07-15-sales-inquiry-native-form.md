# Sales Inquiry Native Form Implementation Plan

**Goal:** Complete and test a dedicated local Forms Sync service that securely creates the same Monday customer-inquiry item, without changing the unrelated company integration or submitting real test items.

**Architecture:** Create a standalone Node HTTP service under this project with dependency-injected Monday transport. Automated tests use an in-memory fake; production uses the Monday GraphQL API only when a server-side token is configured. The existing native Miva form continues to target a same-origin reverse-proxy route and retains the public Monday form as its fallback.

**Tech Stack:** Miva templates, existing V2 CSS/vanilla JavaScript, Node 18 built-in HTTP server, Monday GraphQL API, Node built-in test runner.

---

### Task 1: Define and test the Sales payload contract

**Files:**
- Create: `integrations/forms-sync/src/sales.js`
- Create: `integrations/forms-sync/test/sales.test.js`

1. Write failing tests for required fields, trimming, invalid email/phone, oversize values, honeypot rejection, and the exact Monday column payload.
2. Run `node --test test/helpForms-sales.test.js` and confirm the tests fail because the module is absent.
3. Implement the smallest validator and Monday payload mapper that passes.
4. Re-run the focused test and confirm it passes.

### Task 2: Add and test the public HTTP relay

**Files:**
- Create: `integrations/forms-sync/src/app.js`
- Create: `integrations/forms-sync/src/monday-client.js`
- Create: `integrations/forms-sync/src/server.js`
- Create: `integrations/forms-sync/test/app.test.js`
- Create: `integrations/forms-sync/test/monday-client.test.js`
- Create: `integrations/forms-sync/package.json`
- Create: `integrations/forms-sync/.env.example`
- Create: `integrations/forms-sync/README.md`

1. Write failing tests for POST success, validation failure, unsupported route, wrong content type, body limit, CORS allowlist, and provider failure masking.
2. Run the focused server test and confirm the expected failures.
3. Implement a dependency-injected request handler and server startup using Node built-ins.
4. Start the standalone server on `PORT`; refuse provider submissions when `MONDAY_API_TOKEN` is absent.
5. Document local startup, fake-only tests, required deployment secrets, reverse-proxy routing, and the deferred monday-code administrator step.
6. Add `npm test` and run the full test suite.

### Task 3: Add the native Miva form

**Files:**
- Modify: `templates/help-sales-inquiry.mvt`
- Modify: `css/sd2-global.css`

1. Replace the iframe with semantic fields for name, email, phone, optional item/SKU, and question.
2. Add V2 form, status, fallback, responsive, focus, error, and success styles.
3. Preserve the normal V2 header/footer and the existing Monday form URL as the fallback.

### Task 4: Add storefront submission behavior

**Files:**
- Create: `scratch/sd2-help-form-contract.test.js`
- Modify: `js/sd2-v2-components.js`

1. Write a failing DOM-independent contract test for payload normalization and state transitions.
2. Run it and confirm it fails before adding the implementation.
3. Add the Sales form controller: native validation, JSON POST, disabled/submitting state, accessible success/error messages, request reference, data preservation, and fallback reveal.
4. Re-run the contract test.

### Task 5: Verify the integrated release

1. Run backend tests with `npm test`.
2. Run JavaScript syntax checks for edited storefront files.
3. Do not run `mmt push`; deployment remains under the user's control.
4. Confirm no token, client secret, or signing secret exists in tracked files.
5. Verify the service locally with an injected fake Monday client and confirm no real Monday request occurs.
6. Document that production activation requires an approved host, a server-side `MONDAY_API_TOKEN`, and reverse-proxy routing for `/api/help-forms/*`.
