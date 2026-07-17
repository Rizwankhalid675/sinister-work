# App Audit & Runbook Template

> Reusable skeleton for auditing and operating a Gadget + Shopify app.
> Fill in every `TODO` / `[ ]`. Seeded with findings for **enshield-shipping-protection**
> (Gadget frameworkVersion `v1.5.0`, Shopify API `2026-01`). Duplicate this file per app.

---

## 0. App Snapshot

| Field | Value |
|-------|-------|
| App name | enshield-shipping-protection |
| Application URL | https://enshield-shipping-protection.gadget.app/ |
| Gadget framework | v1.5.0 |
| Shopify API version | 2026-01 |
| Connection type | partner |
| Enabled models (sync) | shopifyOrder, shopifyProduct, shopifyProductVariant |
| Custom models | shippingInsuranceProduct, shippingInsuranceSetting, shopifyCart, shopifySync, session |
| Custom actions | createInsuranceVariants, createProductViaCurl, scheduledShopifySync, sendOrderToEnshield, sendTrackingToEnshield, setupInsuranceProduct, setupShippingInsuranceProduct, syncInsuranceProduct |
| Webhooks | routes/webhooks/cart |
| Auth model | email/password plugin (recently added) |
| Roles | shopify-app-users (`Role-Shopify-App`), unauthenticated |

---

## 1. Security & Access Audit

### 1.1 OAuth scope reconciliation  ⚠️ FINDING (open)
Scope declarations disagree between two sources of truth:

| Scope | `settings.gadget.ts` | `shopify.app.toml` |
|-------|:---:|:---:|
| read_products / write_products | ✅ | ✅ |
| read_orders / write_orders | ✅ | ✅ |
| write_checkouts | ✅ | ✅ |
| read_checkouts | ✅ | ❌ |
| read_customers / write_customers | ✅ | ❌ |
| read_product_listings / write_product_listings | ✅ | ❌ |
| write_order_edits | ❌ | ✅ |

**Action:** Decide the authoritative set, make both files match, redeploy. Over-broad
scopes (customers, product_listings) should be dropped if unused; `write_order_edits`
must be added to `settings.gadget.ts` if actually needed.
`[ ]` Reconciled  `[ ]` Verified in Shopify Partners install screen

### 1.2 Auth / permissions
- `[ ]` Confirm email/password auth plugin is wired to the intended user model.
- `[ ]` Review `accessControl/permissions.gadget.ts` — every model grant is
  intentional; no accidental `create/update/delete: true` for `unauthenticated`.
- `[ ]` Confirm `.gelly` filters scope each read to the owning shop (tenant isolation).
- `[ ]` No signed-in role has broader access than the app requires.

### 1.3 Secrets & config
- `[ ]` Enshield API key/endpoint stored as Gadget environment secret, not in code.
- `[ ]` No secrets in committed files (grep the repo; check `createProductViaCurl.js`).
- `[ ]` Separate credentials for dev vs. production environments.

---

## 2. Reliability Runbook

### 2.1 Integration surfaces
| Surface | File(s) | Failure mode | Recovery |
|---------|---------|--------------|----------|
| Order → Enshield | `sendOrderToEnshield.js` | dispatch fails / Enshield down | TODO: retry policy? DLQ? |
| Tracking → Enshield | `sendTrackingToEnshield.js` | tracking missing/late | TODO |
| Scheduled Shopify sync | `scheduledShopifySync.js` | sync stalls / partial | TODO: re-run trigger |
| Cart webhook | `routes/webhooks/cart` | webhook lost / dup | TODO: idempotency key |
| Insurance product setup | `setupInsuranceProduct.js`, `createInsuranceVariants.js` | variant drift | TODO |

### 2.2 On-call playbook (fill per incident type)
- **Sync stopped:** `[ ]` check `shopifySync` records → `[ ]` inspect last error →
  `[ ]` re-trigger `scheduledShopifySync` → `[ ]` verify order counts reconcile.
- **Orders not reaching Enshield:** `[ ]` confirm secret valid → `[ ]` check action
  logs → `[ ]` replay failed orders → TODO: how to replay.
- **Webhook backlog:** `[ ]` check Gadget webhook queue → `[ ]` confirm HMAC → TODO.

### 2.3 Deploy / rollback
- `[ ]` Deploy path: `ggt push` → `revamp-dev` → promote to production. Document exact steps.
- `[ ]` Rollback: previous Gadget deploy id + how to revert. TODO.
- `[ ]` Post-deploy smoke test: create test order, confirm Enshield receives it.

---

## 3. Repo Hygiene  ⚠️ FINDING (open)
- Name collision: top-level `enshield-app/` (this Gadget app) vs.
  `enshield-deliverables/enshield-app/` (a separate Vite build) share a name in the
  parent `Work` repo. Decide canonical location / rename one to avoid confusion.
- `[ ]` `.gitignore` excludes `.gadget/`, `node_modules/`, secrets.

---

## 4. Sign-off
| Reviewer | Date | Scope covered |
|----------|------|---------------|
| TODO | TODO | TODO |
