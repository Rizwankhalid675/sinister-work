# Enshield Dashboard — Findings & Access Plan

**Prepared by:** Rizwan Khalid
**Date:** July 17, 2026
**Re:** Enabling maintenance & development work on the Enshield admin dashboard

---

## 1. What I found

There are **two separate systems** in play, and it's important to keep them distinct:

| | **Shipping-protection app** | **Admin dashboard** |
|---|---|---|
| **URL** | `enshield-shipping-protection.gadget.app` (`*.gadget.app`) | `manage.enshield.com/dashboards/main` |
| **Purpose** | The product/engine — shipping protection installed into Shopify stores | The internal cockpit — Clients, Claims, Errors, Reports |
| **Platform** | Gadget (framework v1.5.0), Shopify-connected | Custom build, hosted on a DigitalOcean server (IP 161.35.190.126) |
| **DNS** | Managed by Gadget | enshield.com via GoDaddy |
| **Built by** | In-house (source available locally) | Insanelab (source not currently in our possession) |

**Verified facts:**
- The dashboard is live at `manage.enshield.com`, resolving to a DigitalOcean server (`161.35.190.126`).
- DNS for `enshield.com` is managed through GoDaddy.
- The dashboard's source code is **not** in our current working repository.

**Assumptions still to confirm (asked as questions, not asserted):**
- Which framework/stack the dashboard runs on.
- Whether its data syncs from the Gadget/Shopify app or is stored independently.
- Who administers the DigitalOcean server and GoDaddy DNS account.

## 2. What we need to do the work

To maintain, fix, or extend the dashboard we need:
1. **Source code** — repository access + setup notes + confirmed stack.
2. **Server access** — SSH/DigitalOcean access and the current deploy method.
3. **Database** — connection details and confirmation of the data source.
4. **DNS/domain** — confirmation of GoDaddy account control.
5. **App logins & config** — admin login(s), `.env`/config values, and third-party API keys.

## 3. How we'll do it

1. **Gather access** (this request) — collect the items above via a secure vault.
2. **Audit** — stand up the dashboard in a local/staging environment, map the codebase and its data source, and confirm how (or whether) it connects to the Gadget app.
3. **Document** — produce a short architecture + runbook so the two systems are clearly understood and safely deployable.
4. **Execute** — carry out the intended fixes/redesign on staging first, then deploy to production once verified.

## 4. Security note

A portal password was recently shared over plain email. Recommendation: **rotate that password after handover** and move all future credential sharing to a secure vault (1Password / Bitwarden). No credentials should be sent in plain text.
