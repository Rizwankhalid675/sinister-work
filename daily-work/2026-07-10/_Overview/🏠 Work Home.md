# 🏠 Sinister Diesel — Work Home

The master index for this whole Work vault. Everything below is a linked note you can
click through, and the connections show up in Obsidian's **Graph View**.

> This is a working directory for **Sinister Diesel** (diesel-performance ecommerce)
> operations — several independent projects plus dated scratch work, all in one place.

---

## 🗂 Top-level areas

- [[Integrations]] — NetSuite, Miva, TikTok, and monday.com automation
- [[Website Revamp]] — the Miva Merchant V2 frontend redesign
- [[Daily Work]] — dated scratch folders of one-off page work
- [[Tools]] — third-party tools & skills kept here for reference
- [[Docs & Assets]] — audit plans, checklists, feeds, images

---

## 📁 Folder map

```
Work/
├─ _Overview/           ← these Obsidian index notes
├─ integrations/        → [[Integrations]]
│   ├─ sinister-netsuite-sync
│   ├─ sinister-netsuite-sync-linux
│   ├─ tiktok-netsuite-sync
│   └─ netsuite-monday-integration
├─ website-revamp/      → [[Website Revamp]]
│   └─ sinister-revamp   (Miva V2 theme)
├─ daily-work/          → [[Daily Work]]   (2026-06-17 … 2026-07-29)
├─ tools/               → [[Tools]]
├─ docs/                → [[Docs & Assets]]
└─ assets/              → [[Docs & Assets]]
```

---

## 🔑 Key facts

- The Work folder is a **git repository** and an **Obsidian vault**.
- Some projects (`sinister-revamp`, `sinister-netsuite-sync`) contain their own nested
  `.git` repos — treat them as self-contained.
- Secrets live in git-ignored `.env` files — never commit tokens.
- The revamp is governed by `V2_CONSTITUTION.md` + `V2_STRUCTURE.md` — see [[Website Revamp]].

---

## 🧭 Where to start

| I want to… | Go to |
| --- | --- |
| Understand the site redesign | [[Website Revamp]] |
| Work on order/inventory sync | [[Integrations]] |
| Find a past mockup or plan | [[Daily Work]] |
| See the audit that started it all | [[Docs & Assets]] |
