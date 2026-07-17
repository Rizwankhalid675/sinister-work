# Sales Inquiry Miva Functionality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing V2 Sales Inquiry form submit safely through Miva, send an internal request and customer acknowledgement, and remove its dependency on `/api/help-forms/sales-inquiry`.

**Architecture:** The visible V2 page remains unchanged except for native form attributes and status rendering. A dedicated Miva page template, `HFSI`, validates posted fields, sends plain-text mail through `v9_SendEmail`, and redirects back to Sales Inquiry with `status=submitted` or `status=error`. The company mailbox forwards `[Sales Inquiry]` messages to Monday through a private mail rule outside storefront code.

**Tech Stack:** Miva Merchant templates, Miva Template Language, `g.Module_Library_Utilities`, `v9_SendEmail`, Node built-in test runner for static contract tests.

## Global Constraints

- Preserve the current Sales Inquiry V2 layout, copy, header, footer, and CSS.
- Do not render or commit Monday API tokens, OAuth secrets, signing secrets, or email-to-board addresses.
- The form must work without JavaScript.
- Validate required fields on the server and retain HTML validation in the browser.
- Do not include customer values in redirect query strings.
- Use the existing company recipient `info@sinisterdiesel.com`, matching `CGFM`, `RSFM`, and `WARF`.
- Release Sales Inquiry independently before converting another form.

---

### Task 1: Define the Sales Inquiry Native-Submission Contract

**Files:**
- Create: `scratch/sd2-sales-miva-form.test.js`
- Test: `scratch/sd2-sales-miva-form.test.js`

**Interfaces:**
- Consumes: `templates/help-sales-inquiry.mvt`, `templates/hfsi.mvt`, `js/sd2-v2-components.js`
- Produces: a static contract that subsequent tasks must satisfy

- [ ] **Step 1: Write the failing contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Sales Inquiry posts to the native HFSI page', () => {
  const page = read('templates/help-sales-inquiry.mvt');
  assert.match(page, /method=["']post["']/i);
  assert.match(page, /action=["']&mvte:urls:HFSI:auto;["']/i);
  assert.match(page, /name=["']contactName["']/i);
  assert.match(page, /name=["']contactEmail["']/i);
  assert.match(page, /name=["']contactPhone["']/i);
  assert.match(page, /name=["']contactItemSku["']/i);
  assert.match(page, /name=["']contactMessage["']/i);
  assert.doesNotMatch(page, /data-endpoint=|\/api\/help-forms\//i);
});

test('HFSI validates, emails, and returns a safe status', () => {
  const processor = read('templates/hfsi.mvt');
  assert.match(processor, /v9_SendEmail\(l\.mail\)/);
  assert.match(processor, /v9_SendEmail\(l\.visitor_mail\)/);
  assert.match(processor, /\[Sales Inquiry\]/);
  assert.match(processor, /status=submitted/);
  assert.match(processor, /status=error/);
  assert.doesNotMatch(processor, /api\.monday\.com|MONDAY|Bearer|email-to-board/i);
  assert.doesNotMatch(processor, /status=error[^\n]*(contactName|contactEmail|contactPhone|contactMessage)/i);
});

test('shared JS does not intercept a native Miva form', () => {
  const page = read('templates/help-sales-inquiry.mvt');
  assert.doesNotMatch(page, /data-sd2-help-form=/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scratch/sd2-sales-miva-form.test.js`

Expected: FAIL because `templates/hfsi.mvt` does not exist and Sales Inquiry still uses the API endpoint.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add scratch/sd2-sales-miva-form.test.js
git commit -m "test: define native Sales Inquiry submission"
```

### Task 2: Create the HFSI Miva Processor

**Files:**
- Create: `templates/hfsi.mvt`
- Test: `scratch/sd2-sales-miva-form.test.js`

**Interfaces:**
- Consumes POST globals `contactName`, `contactEmail`, `contactPhone`, `contactItemSku`, `contactMessage`, and `website`
- Produces internal mail, customer acknowledgement, and a redirect to `HLSI` with a status only

- [ ] **Step 1: Add the minimal processor**

Create `templates/hfsi.mvt` with this behavior:

```mvt
<mvt:assign name="g.eol" value="asciichar(13) $ asciichar(10)" />
<mvt:assign name="g.http_referer" value="s.http_referer" />

<mvt:if expr="NOT ('help-sales-inquiry' CIN g.http_referer OR 'HLSI' CIN g.http_referer)">
	<meta http-equiv="refresh" content="0;url=&mvte:urls:HLSI:auto_sep;status=error" />
	<mvt:exit />
</mvt:if>

<mvt:if expr="NOT ISNULL g.website">
	<meta http-equiv="refresh" content="0;url=&mvte:urls:HLSI:auto_sep;status=submitted" />
	<mvt:exit />
</mvt:if>

<mvt:if expr="ISNULL g.contactName OR ISNULL g.contactEmail OR ISNULL g.contactPhone OR ISNULL g.contactMessage">
	<meta http-equiv="refresh" content="0;url=&mvte:urls:HLSI:auto_sep;status=error" />
	<mvt:exit />
</mvt:if>

<mvt:assign name="l.mail:from" value="asciichar(34) $ g.store:name $ asciichar(34) $ ' <' $ g.store:email $ '>'" />
<mvt:assign name="l.mail:to" value="'info@sinisterdiesel.com'" />
<mvt:assign name="l.mail:reply" value="asciichar(34) $ g.contactName $ asciichar(34) $ ' <' $ g.contactEmail $ '>'" />
<mvt:assign name="l.mail:subject" value="'[Sales Inquiry] ' $ g.contactName" />
<mvt:assign name="l.mail:message" value="'Name: ' $ g.contactName $ g.eol $ 'Email: ' $ g.contactEmail $ g.eol $ 'Phone: ' $ g.contactPhone $ g.eol $ 'Product or SKU: ' $ g.contactItemSku $ g.eol $ g.eol $ 'Question:' $ g.eol $ g.contactMessage" />
<mvt:assign name="l.mail:headers" value="'Reply-To:' $ l.mail:reply $ g.eol $ 'MIME-Version: 1.0' $ g.eol $ 'Content-Type: text/plain; charset=utf-8' $ g.eol" />
<mvt:do file="g.Module_Library_Utilities" name="g.sent" value="v9_SendEmail(l.mail)" />

<mvt:if expr="g.sent">
	<mvt:assign name="l.visitor_mail:from" value="l.mail:from" />
	<mvt:assign name="l.visitor_mail:to" value="l.mail:reply" />
	<mvt:assign name="l.visitor_mail:subject" value="'[Sinister Diesel] We received your sales inquiry'" />
	<mvt:assign name="l.visitor_mail:message" value="'Hi ' $ g.contactName $ ',' $ g.eol $ g.eol $ 'We received your sales inquiry. A member of the Sinister Diesel team will review it and respond using the contact information you provided.' $ g.eol $ g.eol $ 'Sinister Diesel'" />
	<mvt:assign name="l.visitor_mail:headers" value="'Reply-To:' $ l.mail:from $ g.eol $ 'MIME-Version: 1.0' $ g.eol $ 'Content-Type: text/plain; charset=utf-8' $ g.eol" />
	<mvt:do file="g.Module_Library_Utilities" name="g.visitor_sent" value="v9_SendEmail(l.visitor_mail)" />
	<meta http-equiv="refresh" content="0;url=&mvte:urls:HLSI:auto_sep;status=submitted" />
<mvt:else>
	<meta http-equiv="refresh" content="0;url=&mvte:urls:HLSI:auto_sep;status=error" />
</mvt:if>
```

- [ ] **Step 2: Run the focused processor contract**

Run: `node --test scratch/sd2-sales-miva-form.test.js`

Expected: the processor test passes; the page-action test still fails.

- [ ] **Step 3: Commit the processor**

```powershell
git add templates/hfsi.mvt scratch/sd2-sales-miva-form.test.js
git commit -m "feat: add Miva Sales Inquiry processor"
```

### Task 3: Wire the Existing V2 Sales Form to HFSI

**Files:**
- Modify: `templates/help-sales-inquiry.mvt`
- Modify: `js/sd2-v2-components.js`
- Modify: `scratch/sd2-native-help-pages.test.js`
- Test: `scratch/sd2-sales-miva-form.test.js`

**Interfaces:**
- Consumes: HFSI POST field names from Task 2
- Produces: a progressive native HTML form and visible status state

- [ ] **Step 1: Change only the form plumbing**

Change the opening tag to:

```mvt
<form class="sd2-help-form" method="post" action="&mvte:urls:HFSI:auto;" accept-charset="UTF-8" data-submit-label="Send Sales Request">
```

Rename fields without changing their visual markup:

```text
name       -> contactName
email      -> contactEmail
phone      -> contactPhone
itemSku    -> contactItemSku
question   -> contactMessage
website    -> website
```

Render Miva status before the action row:

```mvt
<mvt:if expr="g.status EQ 'submitted'">
	<p class="sd2-help-form__status is-success" role="status">Your sales request was sent successfully.</p>
<mvt:elseif expr="g.status EQ 'error'">
	<p class="sd2-help-form__status is-error" role="alert">We could not send your request. Check the required fields and try again.</p>
</mvt:if>
```

Remove `data-sd2-help-form`, `data-endpoint`, API-only success markup, and API-only fallback markup from this one page. Do not remove the shared asynchronous handler until the other six Help forms are migrated.

- [ ] **Step 2: Update legacy tests for the one-page exception**

In `scratch/sd2-native-help-pages.test.js`, remove Sales Inquiry from the set that requires `/api/help-forms/sales-inquiry`, and add an assertion that it posts to `HFSI`.

- [ ] **Step 3: Run the Sales contract and shared Help tests**

Run:

```powershell
node --test scratch/sd2-sales-miva-form.test.js
node --test scratch/sd2-native-help-pages.test.js scratch/sd2-help-forms.test.js
```

Expected: PASS. Shared API helper tests remain green because six Help forms still use them.

- [ ] **Step 4: Commit the native form wiring**

```powershell
git add templates/help-sales-inquiry.mvt js/sd2-v2-components.js scratch/sd2-native-help-pages.test.js scratch/sd2-sales-miva-form.test.js
git commit -m "feat: submit Sales Inquiry through Miva"
```

### Task 4: Register and Deploy HFSI in Miva Admin

**Files:**
- Miva Admin page: `HFSI`
- Deploy: `templates/hfsi.mvt`, `templates/help-sales-inquiry.mvt`

**Interfaces:**
- Consumes: local processor and form templates
- Produces: an active Miva route resolvable as `&mvte:urls:HFSI:auto;`

- [ ] **Step 1: Create the processing page once**

In Miva Admin, go to **Advanced → Templates → Pages → Add Page** and use:

```text
Code: HFSI
Name: Help Form — Sales Inquiry Processor
Title: Help Form — Sales Inquiry Processor
HTTPS: Yes
Cache: Never / no page cache
```

The processing page is not linked in navigation and must not use the public header/footer.

- [ ] **Step 2: Pull the new page into MMT tracking**

Run: `mmt pull HFSI`

Expected: `templates\hfsi.mvt` appears in MMT state. If the installed MMT version does not accept a page argument, run `mmt pull`, preserve the tested local `hfsi.mvt`, and confirm `mmt status` lists only the intended template differences.

- [ ] **Step 3: Push the tested templates**

Run:

```powershell
mmt push --notes "Enable native Miva Sales Inquiry submission"
```

Expected: MMT commits `templates\hfsi.mvt` and `templates\help-sales-inquiry.mvt` plus the intentionally updated shared assets only.

### Task 5: Verify the Real Submission and Monday Handoff

**Files:**
- Verify URL: `https://sinisterdiesel.com/help-sales-inquiry.html?BranchKey=<preview-branch-key>`
- External configuration: company mailbox forwarding rule

**Interfaces:**
- Consumes: live Miva HFSI route and company mailbox
- Produces: evidence that the Sales flow is ready before cloning the pattern

- [ ] **Step 1: Submit invalid data**

Leave one required field blank and submit.

Expected: browser validation prevents submission; bypassed/invalid server posts return to Sales Inquiry with the V2 error notice and no customer values in the URL.

- [ ] **Step 2: Submit a controlled valid request**

Use a test subject/name clearly labeled `V2 SALES FORM TEST`.

Expected: return to the V2 Sales page with the success notice; one internal email arrives at `info@sinisterdiesel.com`; one acknowledgement arrives at the test customer address.

- [ ] **Step 3: Configure the private mailbox rule**

Create a company-mailbox rule that forwards messages whose subject starts with `[Sales Inquiry]` to the private Monday email-to-board address. Do not paste that private address into Miva, JavaScript, this repository, tickets, or screenshots.

- [ ] **Step 4: Re-submit and verify Monday**

Expected: exactly one Monday item is created; its name contains `[Sales Inquiry] V2 SALES FORM TEST`; the update contains name, email, phone, optional SKU, and question.

- [ ] **Step 5: Run final local verification**

Run:

```powershell
node --test scratch/sd2-sales-miva-form.test.js scratch/sd2-native-help-pages.test.js scratch/sd2-help-forms.test.js
git diff --check
```

Expected: all tests PASS and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Commit the verified rollout documentation**

Update `V2_STRUCTURE.md` so Sales Inquiry is marked Miva-native while the remaining six forms remain pending, then run:

```powershell
git add V2_STRUCTURE.md
git commit -m "docs: record native Sales Inquiry rollout"
```
