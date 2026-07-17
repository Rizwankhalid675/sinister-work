# Native Help Forms Design

## Goal

Replace the seven cross-origin Monday.com embeds with accessible Sinister V2 forms while preserving the existing `(CI) - Customer Inquiries` Monday board, routing labels, automations, and team workflow. Release one form at a time, beginning with Sales Inquiry.

## Architecture

- Miva renders each native form inside the existing V2 header, footer, typography, spacing, and motion system.
- The browser submits a small JSON payload to a dedicated Forms Sync service at `/api/help-forms/:form`.
- The Forms Sync service is isolated from the existing NetSuite/Monday integration. It validates and normalizes the payload, then creates an item on Monday board `2428283337` in group `emailed_items` using a server-only `MONDAY_API_TOKEN`.
- Monday credentials and board mutation logic never appear in storefront HTML or JavaScript.
- Each form owns a server-side schema mapping public field names to Monday column IDs and fixed routing values.
- The original Monday form remains available as an explicit fallback link if the company endpoint is unavailable during rollout.

## Pilot: Sales Inquiry

The storefront form collects required name, email, phone, and question fields. Issue is fixed server-side to Monday's `Sales` status label (`label1` index `102`), so customers cannot alter routing. An optional item/SKU field maps to `long_text_mm0btcjw` when supplied.

The created Monday item uses the customer's name as the item name and writes:

- `label1`: Sales
- `email`: email address plus display text
- `phone`: US phone value
- `long_text_mm0btcjw`: optional item/SKU
- `long_text8`: question
- `date85`: current submission date

## Experience

- The form uses a two-column layout on desktop and a single column on mobile.
- Required fields use native HTML validation plus inline, accessible server errors.
- Submission states are idle, submitting, success, and error.
- Success replaces the submit area with a reference number and response expectation.
- Failure preserves entered data and exposes a secure fallback link to the existing Monday form.
- A hidden honeypot rejects obvious bot submissions without creating a Monday item.

## Security and operations

- Accept JSON only and cap request bodies at 32 KB.
- Allow storefront origins only (`sinisterdiesel.com`, `www.sinisterdiesel.com`, and local development).
- Validate lengths, email syntax, phone syntax, allowed form keys, and honeypot state server-side.
- Generate a request ID for logs and responses; never return Monday IDs or raw provider errors to customers.
- The reverse proxy should rate-limit the public endpoint before production exposure.
- Log request ID, form type, timestamp, result, and provider error category, but not full customer questions.

## Rollout

Sales Inquiry is the first release. Build and verify the service locally with an injected fake Monday transport; local tests must never create a real board item. Deployment is deferred until an account administrator enables monday code or the company provides another approved server host. After deployment, configure the storefront reverse proxy so `/api/help-forms/*` reaches the service, add the Monday token through the host's secret manager, and perform one controlled test submission before enabling the endpoint in the storefront.

After Sales routing is verified, reuse the same component and relay for Missing/Damaged Parts, Returns/Exchanges, Order Tracking, Tech Support, Warranty, and Shipping Protection, adding multipart file handling only for forms that require uploads.
