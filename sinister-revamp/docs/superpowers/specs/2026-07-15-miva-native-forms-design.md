# Miva-Native Forms Design

## Goal

Replace the nonfunctional `/api/help-forms/*` browser submissions and the remaining legacy Monday form embeds with Sinister Diesel V2 forms that are processed by Miva. Preserve the current customer-service workflow by sending each validated submission to both the appropriate company mailbox and a private Monday email-to-board address.

## Scope

### Help Center forms

- Sales Inquiry
- Missing / Damaged Parts
- Returns / Exchanges
- Order Tracking
- Parts Tech Support
- Warranty Inquiry
- Shipping Protection

### Remaining legacy forms

- Dealer Application
- Careers / Job Application

The Sponsor Application already uses a native Miva `SSFM` processor and remains on that working path. Its V2 presentation can be reused as the form design reference.

## Architecture

Each public form posts to a dedicated HTTPS Miva processing page. The processing page validates the request, rejects bots, builds a plain-text message, sends the message through Miva's server-side `v9_SendEmail` utility to the appropriate company mailbox, and redirects back to the originating page with a success or error status. A private mailbox rule forwards classified messages to Monday's email-to-board address.

```text
V2 form -> Miva processor -> company mailbox -> private forwarding rule -> Monday board
                            -> customer confirmation
```

No Monday token, OAuth secret, signing secret, or email-to-board address is rendered into storefront HTML or JavaScript.

## Legacy Mechanism Being Replaced

The previously working Sponsor page did not submit through Miva. Its browser JavaScript contained a Monday bearer token and board ID, constructed a `create_item` GraphQL mutation, and posted directly to `https://api.monday.com/v2`.

That mechanism is not reused because any visitor can extract the token and write to the Monday account outside the form. It also has no server-side rate limit or trustworthy validation. The visible media picker was presentation-only: selected images and videos were never included in the Monday request or uploaded with `add_file_to_column`.

The exposed legacy token and the Monday application secrets shown during setup must be rotated before production release.

## Miva Processor Pages

| Code | Purpose | Return page |
| --- | --- | --- |
| `HFSI` | Sales Inquiry | `help-sales-inquiry.html` |
| `HFMD` | Missing / Damaged Parts | `help-online-account-issues.html` |
| `HFRX` | Returns / Exchanges | `help-returns-exchanges.html` |
| `HFOT` | Order Tracking | `help-check-order-status.html` |
| `HFTS` | Parts Tech Support | `help-sinister-diesel-parts-tech-support.html` |
| `HFWI` | Warranty Inquiry | `help-warranty-inquiry.html` |
| `HFSP` | Shipping Protection | `help-shipping-protection-requests.html` |
| `HFDA` | Dealer Application | `dealer-application.html` |
| `HFCA` | Careers / Job Application | `job-application-full.html` |

The page codes must be created once in Miva Admin before MMT can update their templates.

## Recipient Configuration

Company recipients remain in the Miva processor templates, matching the current `CGFM`, `RSFM`, and `WARF` pattern. Monday email-to-board addresses are not stored in Miva or this repository. A rule in the company mailbox forwards only the recognized form subject prefixes to the private Monday address.

Monday board addresses are private because they contain a board-specific credential. Each processor uses a form-specific subject prefix so Monday automations can classify and route submissions:

- `[Sales Inquiry]`
- `[Missing / Damaged Parts]`
- `[Return / Exchange]`
- `[Order Tracking]`
- `[Parts Tech Support]`
- `[Warranty Inquiry]`
- `[Shipping Protection]`
- `[Dealer Application]`
- `[Career Application]`

## Submission Behavior

1. The form uses a real `method="post"` Miva action and remains functional without JavaScript.
2. JavaScript may enhance validation and loading states but cannot be required for delivery.
3. Required fields are validated again on the processing page.
4. A hidden honeypot field silently accepts bot submissions without sending mail.
5. The processor normalizes line endings and constructs a labeled plain-text body.
6. Miva sends the internal message to the company recipient.
7. Miva sends a separate acknowledgement to the customer without exposing internal recipients.
8. The user is redirected to the originating page with `status=submitted` or `status=error`.
9. The form page renders an accessible success or error notice and retains safe field values after validation errors.

## Monday Behavior

The company mailbox forwards recognized form messages to Monday. The email subject becomes the new Monday item name, and the email body becomes the item's update. Any detailed column routing is handled by Monday automations using the subject prefix. This design intentionally avoids calling Monday's browser API or exposing credentials.

## Attachments

Dealer applications and career applications require attachments. They are a separate release gate:

- Allowed types are PDF for dealer applications and PDF/DOC/DOCX for résumés.
- File size is capped server-side.
- Original filenames are sanitized.
- Files are never placed in a public graphics directory.
- Submission must fail safely if the attachment cannot be stored or delivered.

Until secure Miva attachment handling is verified in the active store, the current Dealer and Careers embeds remain active. The iframe is removed only after a full attachment submission reaches its intended destination.

## Styling

All forms use the existing V2 header, footer, breadcrumbs, typography, spacing, buttons, focus states, and responsive form controls. The native Sponsor form is the visual reference. Form structure remains open and editorial rather than placing every field in separate cards.

## Security

- Rotate the Monday client and signing secrets exposed in prior screenshots.
- Never commit Monday API tokens or email-to-board addresses.
- Require HTTPS.
- Escape submitted values in confirmation/error output.
- Apply server-side length limits.
- Do not include sensitive submission values in redirect query strings.
- Add CSRF protection if the installed Miva form-processing mechanism exposes a supported token.
- Rate-limit or add reCAPTCHA to high-abuse forms.

## Testing

### Automated contract tests

- Every form posts to its correct Miva processor code.
- No `/api/help-forms/` endpoints remain in live templates or JavaScript.
- No `forms.monday.com` iframe remains after its native replacement is verified.
- No Monday credentials or board email addresses appear in public assets.
- Each processor has required-field, honeypot, success, provider-failure, and safe-redirect coverage.

### Miva branch QA

- Submit one valid and one invalid request per Help Center form.
- Confirm the company inbox receives the internal message.
- Confirm Monday creates one item with the correct subject and body.
- Confirm the customer receives an acknowledgement.
- Confirm duplicate clicks do not create duplicate submissions.
- Verify keyboard, mobile, reduced-motion, and screen-reader status behavior.
- Verify Dealer PDF and Careers résumé delivery before removing either iframe.

## Release Order

1. Sales Inquiry as the proof-of-flow.
2. Remaining six Help Center forms, one at a time.
3. Dealer Application with secure PDF handling.
4. Careers with secure résumé handling.
5. Remove obsolete frontend relay code and update `V2_STRUCTURE.md`.

Each release is independently reversible by restoring that page's previous form markup.
