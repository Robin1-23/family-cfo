# Family CFO — Product Spec

> Source of truth for product decisions. Mirrors the shared spec doc
> (https://claude.ai/code/artifact/2e9b76fe-1031-4a0a-91dc-7c00c4c67630) as of 2026-10-08.
> When the product changes, update this file in the same PR as the code.

## Overview

Family CFO is a family-finance command centre for the first-generation earner (22–32) who has quietly become the money manager for their parents. It pulls the household's bank accounts, FDs, insurance, investments and documents into one dashboard, and turns them into plain-language alerts and actions.

**One-line pitch:** "Know everything your family owns, owes and is covered for — in one screen, before something goes wrong."

### The problem

- Parents' finances live in paper files, passbooks, old SMS and one uncle's memory.
- The child earns more, understands apps, and gets every call: "beta, yeh policy ka kya karna hai?"
- Real losses happen silently: lapsed health cover, mis-sold endowment plans, FDs auto-renewing at poor rates, unclaimed maturity amounts, missed tax-saving.
- A medical emergency is when the family discovers what cover they actually have — too late.

### Target personas

| Persona | Who | Core job-to-be-done |
| --- | --- | --- |
| Priya, the Family CFO (primary, payer) | 26, software engineer in Gurgaon, parents in Lucknow | "Make sure Mummy-Papa are covered and nothing lapses, without flying home to read files." |
| Ramesh, the parent (secondary user) | 58, retired govt employee, uses WhatsApp, reads Hindi | "Know my money is safe and my child can see it if something happens to me." |
| Arjun, the sibling (collaborator) | 23, first job in Pune | "Chip in on parents' premiums and know what's mine to pay." |

### Positioning

- Not a budgeting app, not an investment-selling app. It is a **family balance sheet + risk radar**.
- Competitors (INDmoney, Fi, CRED, Jupiter, ET Money) are built around one person's own money. Family CFO is built around **one household and the person responsible for it**.
- Trust promise: read-only, consent-based, no product pushing in the free tier.

### Why now

- India's Account Aggregator rails make consented, read-only access to bank, deposit, investment and insurance data possible without screen-scraping.
- DigiLocker makes official documents fetchable with consent.
- The first wave of salaried Gen Z is now 25–30 while their parents hit 55–65 — the age when health, retirement and succession questions arrive together.

## Platforms

App-first: Android at launch, iOS next, a marketing website from day 1, and a web dashboard later from the same Expo codebase.

| Platform | Role | Phase |
| --- | --- | --- |
| Android app (Expo / React Native) | Primary product: camera scanning, push alerts, one-tap Emergency Mode; most parents are on Android | MVP |
| iOS app | Same codebase, released after Android stabilises | V1.1 |
| Marketing website | Landing page, SEO content ("Is my parents' health cover enough?"), beta waitlist | MVP, from day 1 |
| Corporate / HR web portal | Company sign-up and billing via Razorpay, employee invites | Launch (weeks 11–13) |
| Web dashboard (Expo web export) | View the family balance sheet and vault on a laptop | V2 |

## Core features

The MVP ships four modules — Family Vault, Coverage Radar, Renewal Alerts and Emergency Mode — because they deliver value with manual entry and document OCR alone, before any regulated data link is live.

| Module | What it does | Phase |
| --- | --- | --- |
| Family setup | Create a household, add members (self, parents, siblings, spouse, kids), assign roles: Owner, Co-manager, Viewer (parent mode) | MVP |
| Family Vault | Upload policies, FD receipts, property papers, PAN/Aadhaar copies; OCR extracts policy number, insurer, sum assured, premium, due date, nominee, maturity | MVP |
| Coverage Radar | Per-member scorecard: health cover vs recommended, term cover vs dependants, missing critical illness/super top-up, nominee gaps | MVP |
| Renewal & Due Alerts | Premium dues, FD maturities, policy lapse windows, PUC/vehicle insurance, property tax; push + WhatsApp reminders to the right family member | MVP |
| Emergency Mode | One tap during a hospital admission: every health policy, TPA helpline, cashless hospital list link, claim checklist, documents ready to share | MVP |
| Net Worth Map | Household balance sheet: assets by member and type (bank, FD, MF, stocks, EPF, PPF, gold, property), liabilities (loans, EMIs) | V2 (AA) |
| Bank & FD Sync | Account Aggregator consent fetch of savings, FD, RD statements; idle-cash and auto-renewal-rate alerts | V2 (AA) |
| Investment Sync | MF and demat holdings via AA; flags regular-plan funds, duplicated funds, old ULIPs | V2 (AA) |
| Mis-sold Policy Check | Flags low-return endowment/money-back plans with an explained comparison (surrender value vs keep vs paid-up), no product sold | V2 |
| Tax Helper (parents) | Senior-citizen deductions checklist (80D, 80TTB, 80DDB), Form 15H reminder for FD interest, ITR-filing nudge | V2 |
| Shared Contributions | Siblings split recurring family bills (premiums, parents' medicines, EMI); ledger of who paid what | V2 |
| Succession Kit | Nominee audit across every asset, will-readiness checklist, "if something happens to me" folder unlocked to a trusted member | V3 |
| Hindi / regional parent view | Read-only simplified parent screen in Hindi (then Tamil, Bengali, Marathi), large type, voice read-out | MVP Hindi, V3 others |
| Ask Family CFO (AI) | Chat over the family's own data: "Papa ka health cover kab tak hai?" — answers cite the source document | V2 |
| Expert desk | Paid sessions with SEBI-registered investment advisers and insurance claim experts | V3 |

### Design principles

- **Read-only forever.** The app never moves money or places trades.
- **Every alert has an owner.** Each reminder is routed to the family member responsible, not broadcast to all.
- **Explain, don't sell.** Free tier never recommends a specific product; V3 advice only from registered advisers.
- **Works with zero integrations.** Manual + OCR must deliver the full MVP, so AA licensing never blocks launch.

## Screens

The MVP needs 14 screens across two views: the Family CFO's full app and a simplified parent view.

### Onboarding
1. **Welcome** — one-line pitch, "Start your family's money map", trust badges (read-only, encrypted, no selling).
2. **Phone OTP sign-in** — Firebase Auth; optional Google sign-in.
3. **Build your family** — add members as cards (name, relation, age, city); invite via WhatsApp link; role picker.
4. **Quick health check quiz** — 6 questions per parent (health cover? amount? term cover? loans? FDs? who holds the papers?) → instant first Coverage Score in under 2 minutes.
5. **Add first document** — camera/gallery/PDF upload of one policy; OCR preview with editable extracted fields.

### Main app (Family CFO view)
6. **Home: Family Dashboard** — Family Safety Score (0–100) and next 3 actions; member cards; "Due in next 30 days" strip.
7. **Member profile** — one person's policies, deposits, investments, documents, nominee status; "what's missing" list.
8. **Coverage Radar** — per-member bars for health, term, critical illness, accident; recommended vs actual; tap a gap for a plain explanation.
9. **Vault** — folders by member and type; search; OCR-extracted fields as a fact card above each file; share with expiring link.
10. **Timeline & Alerts** — calendar of every due date, maturity and renewal; each item has owner, amount, "mark paid", snooze.
11. **Emergency Mode** — red full-screen: active health policies, insurer/TPA helplines (tap to call), claim checklist, "share all with hospital desk".
12. **Net Worth Map (V2)** — household assets/liabilities by member and asset class; trend over months.
13. **Ask Family CFO (V2)** — chat with suggested questions; answers link to the source document or account.
14. **Settings & Consent Centre** — connected data sources, AA consents with expiry and revoke, export all data, delete account.

### Parent view (simplified)
- Single scroll, Hindi by default, 20pt+ type.
- Cards: "Aapka health cover", "Agle payment", "Zaroori documents", one big "Call [child's name]" button.
- Voice read-out of each card; no editing.

### Key interaction patterns
- Every alert card: what it is, why it matters (1 line), who owns it, one action button.
- Score changes animate with the reason ("+8: Papa's super top-up added").
- WhatsApp is the notification channel of record for parents; push for the CFO.

## Data sources

Launch on documents, OCR and DigiLocker; add Account Aggregator data in V2 through a regulated partner. Only entities regulated by RBI, SEBI, IRDAI or PFRDA can be a Financial Information User (FIU) on the AA network.

| Source | What it gives | Access path | Phase |
| --- | --- | --- | --- |
| Manual entry + OCR of uploads | Any policy, FD receipt, LIC bond, property paper, loan letter | Camera/PDF upload → OCR + LLM field extraction → user confirms | MVP |
| DigiLocker | Government IDs plus insurance policies issued into DigiLocker by insurers (Tata AIA Life, Bajaj Allianz, Oriental, Acko, Reliance General…) | Consent-based pull via a DigiLocker partner API or direct requester registration | MVP / V1.1 |
| MF Consolidated Account Statement (CAS) | All mutual fund holdings across AMCs | User forwards the password-protected CAMS/KFin PDF; app parses it | MVP |
| EPF passbook, PPF statement | Retirement balances | PDF upload + parsing; not on AA | MVP |
| Account Aggregator via regulated FIU partner | Savings accounts, deposits, MF folios, demat holdings, some insurance | Partner with an RBI/SEBI-regulated entity as FIU of record; build the product layer via a TSP | V2 |
| Insurance repositories (e-Insurance Account) | Policies held in demat form, nominee and renewal data | NSDL NIR, Centrico (CDSL), CAMSRep (Bima Central), Karvy; no public API — partnership target | V3 |
| Bima Sugam | IRDAI's unified insurance platform | Integrate once third-party access opens | V3 watch |
| Gmail read-only (opt-in) | Policy PDFs, premium receipts, FD confirmations | Google OAuth restricted scope; needs Google security assessment | V2 |

### What Account Aggregator can and cannot see (CASParser, Mar 2026 — verify on Sahamati's FIP-AA dashboard)

| Data type | Status on AA | Impact |
| --- | --- | --- |
| Savings accounts, singly held | Live across 72 listed banks | Reliable core for Net Worth Map |
| Mutual fund folios (CAMS, KFin) | Live, broadly connected | Replaces CAS upload in V2 |
| Equities, ETFs via CDSL/NSDL | Live; demat history capped at 2 years | Holdings fine |
| Fixed and recurring deposits | Live at ~40% of banks | Keep FD receipt OCR as fallback |
| Insurance policies | 57 insurers live, many on only 1–2 AAs | Documents remain primary |
| EPF, PPF, bonds | Proposed, no providers serving | Upload-only |
| **Joint accounts, NRE/NRO** | **Excluded** | **Many parents hold joint accounts; manual entry is first-class** |

### Rules for data handling
- Every external fetch is tied to a stored consent record: purpose, scope, duration, revocation state.
- A parent's data is fetched only with that parent's own consent (their OTP, their approval), never the child's on their behalf.
- Extracted fields are always shown for user confirmation before they drive alerts.

## Regulatory and compliance

MVP stays unregulated by being read-only, product-neutral and document-based. Not legal advice — confirm the structure with a fintech lawyer before V2.

| Area | What applies | How we handle it | Phase |
| --- | --- | --- | --- |
| AA FIU status | FIU must be RBI/SEBI/IRDAI/PFRDA-regulated | Partner with a SEBI RIA or NBFC as FIU of record; TSP for certification | V2 |
| AA certification | Sahamati-empanelled audit, quarterly self-tests, IS audit every 2 years; ~₹5–25 lakh / 5–10 months first year (vendor estimate) | Budget via partner/TSP; keep consent model in our own schema | V2 |
| DPDP Act 2023 + Rules 2025 | Consent manager registration from 13 Nov 2026; full obligations from 13 May 2027 | DPDP-grade consent, notice, deletion and breach response from day one | MVP |
| Data about other people | Parents and siblings are separate data principals | Each adult consents for themselves; others' data stays "pending consent" until they approve | MVP |
| Investment advice | Personalised paid advice needs SEBI RIA registration | Free tier: facts + generic education only; V3 advice via registered RIAs | V3 |
| Insurance distribution | Selling/recommending for commission needs IRDAI licence | Never sell in MVP/V2 | V3+ |
| Google Play financial apps policy | Restrictions on SMS/call-log permissions | No SMS reading; complete the financial-features declaration | MVP |

### Hard "never do" list
- Never move money, initiate payments or place trades.
- Never screen-scrape bank or insurer portals with user passwords.
- Never store Aadhaar numbers in full; mask to last 4 digits.
- Never sell or share household data for lead generation.
- Never show a product recommendation inside a free alert.

## Tech architecture

One Expo app, Firebase in asia-south1 (Mumbai), and Cloud Functions that hold every rule. Clients never call outside services directly; every external fetch goes through a Cloud Function that first checks a live consent record.

```
Clients (Expo / React Native)      Family CFO app · Parent view · WhatsApp
        │ reads and writes
Firebase core (asia-south1)        Auth (phone OTP, roles) · Firestore · Cloud Storage
        │ triggers
Cloud Functions (TypeScript)       OCR pipeline · Alert engine · Consent service · Ask Family CFO
        │ calls, only with consent
External services                  Document AI / LLM · WhatsApp Business API · DigiLocker · FIU partner + AA (V2)
```

- **App:** Expo + Expo Router, TypeScript, React Native; Hindi i18n from day one.
- **Backend:** Firebase Auth (phone OTP), Firestore, Cloud Storage, Cloud Functions (2nd gen), Cloud Scheduler for the daily alert sweep.
- **Extraction:** Google Document AI or an LLM with a strict JSON schema; low-confidence fields flagged for confirmation.
- **Messaging:** WhatsApp Business Platform via a BSP for parent alerts; Expo push for the earner.
- **Payments:** Google Play Billing / App Store in-app; Razorpay for web and corporate plans.
- **Security:** rules scoped by household and role; sensitive fields encrypted with Cloud KMS; all data in asia-south1.

### Firestore data model (target)

Fields marked ✅ exist in code today (see `src/lib/types.ts`); the rest are planned.

| Collection | Key fields | Notes |
| --- | --- | --- |
| users/{uid} ✅ | phone, activeHouseholdId | Created on first sign-in |
| households/{id} ✅ | name, ownerUid, plan, **roles {uid: role}**, createdAt | `roles` drives every security rule |
| …/members/{memberId} ✅ | name, relation, uid, role, language, consentStatus, birthYear, city, healthCheck {healthCover, healthCoverBand, loans, termCover, fixedDeposits, papersWith} | Non-self members start as `viewer` + `pending` |
| …/documents/{docId} ✅ | memberId, docType, title, fileName, storagePath, contentType, sizeBytes, ocrStatus, uploadedBy | `ocrStatus` starts `pending`; only Functions advance it |
| …/documents/{docId}.extractedFields ✅ | itemType, provider, numberLast4, amount, premium, dueDate, maturityDate, nominee, confidence {field: 0–1}; plus ocrError | Written only by the `extractDocument` Function (Claude, structured output); full numbers never stored |
| …/items/{itemId} ✅ | type, memberId, provider, numberLast4, amount, premium, dueDate, maturityDate (YYYY-MM-DD), nominee, sourceDocId, confirmedBy | The single table every screen reads. Created only after the user confirms (or enters by hand); `onItemCreated` then marks the source document `confirmed` |
| …/alerts/{alertId} | itemId, kind, dueAt, ownerMemberId, channel, status | Alert engine; Sprint 2 |
| …/consents/{consentId} ✅ (read-only to clients) | memberId, source, purpose, scope, grantedAt, expiresAt, revokedAt | Modelled on the ReBIT AA artefact |
| …/ledger/{entryId} | payerMemberId, itemId, amount, date | Sibling cost-split; V2 |

## Monetization and pricing

Charge the earner per household. Prices are hypotheses to test.

| Tier | Price (₹) | Includes |
| --- | --- | --- |
| Free | 0 | 1 household, up to 3 members, 15 documents, Coverage Score, basic reminders |
| Family Pro | 4,999 / year | Up to 8 members, unlimited vault, OCR auto-extract, WhatsApp alerts to parents, Emergency Mode, sibling cost-split, Hindi parent view |
| Family Pro+ | 14,999 / year | Pro + AA sync (V2), Mis-sold Policy Check, parents' tax helper, Ask Family CFO, 2 expert sessions/year |
| Expert desk | 1,499–4,999 / session | Claim-help specialist, SEBI RIA review, will-drafting partner |
| Corporate benefit | 150–300 / employee / month | Family Pro as a "care for your parents" benefit |

Guardrails: no commissions in Free/Pro; experts are fee-only; corporate benefit is the scale channel.

## Roadmap

```
Weeks 1–3   Foundation      Auth and households · Vault upload · OCR extraction · Consent records   ✅ (OCR → Sprint 2)
Weeks 4–7   Core value      Coverage Radar · Alerts + WhatsApp · Emergency Mode · Hindi parent view
Weeks 8–10  Closed beta     100 families · Subscriptions live · Fix extraction gaps · Security review
            GATE: 40% of beta families add 10+ items in 14 days
Weeks 11–13 Public launch   Play Store + web · First HR pilot · Referral loop
V2 (months 4–9)   FIU partner, AA sync, mis-sold check, Ask Family CFO
V3 (months 10+)   Expert desk, insurance repositories, Bima Sugam, succession kit
```

### Success metrics (targets to validate in beta)

| Metric | Definition | Target |
| --- | --- | --- |
| Activation | New households that see a Coverage Score in the first session | 70% |
| Depth | Households with 10+ items by day 14 | 40% |
| Parent link | Households where at least one parent accepted the invite | 40% |
| Conversion | Free → Family Pro by day 30 | 5–8% |
| Retention | Households active in month 3 | 50% |

### Key risks

| Risk | Mitigation |
| --- | --- |
| Parents won't share or fear fraud | Parent-first consent in Hindi, explainer video, read-only promise on every screen |
| OCR fails on old LIC bonds / handwritten FD receipts | Mandatory confirm step, confidence flags, templates for top 20 insurers and banks |
| FIU partner or AA integration slips | MVP never depends on AA; AA is a Pro+ upsell |
| Joint accounts invisible on AA | Manual entry stays first-class |
| Weak willingness to pay | Corporate-benefit channel; test annual vs monthly pricing |
| Crossing into regulated advice | Content review checklist; personalised advice only via RIAs |
| Data breach | KMS field encryption, data minimisation, pen test, DPDP breach runbook |

## Build status

| Sprint | Scope | Status |
| --- | --- | --- |
| 1 · Foundation | Phone OTP, onboarding, households/members, roles + rules, vault upload, dashboard, member profile, WhatsApp invite, settings | ✅ Shipped (commit b627e09) |
| 2 · Core value | OCR extraction Function + confirm screen, items collection, Welcome screen, quick health check → first Coverage Score | ✅ Built, not yet deployed |
| 2 · Core value (cont.) | Coverage Radar, alert engine + WhatsApp, Emergency Mode, Hindi parent view, parent invite/consent flow | Next |
| 3 · Beta | Subscriptions (Play Billing/Razorpay), Free-tier limits, analytics, security review, marketing site | Planned |

## Sources

- [Account Aggregator integration in 2026 — eCorpIT](https://ecorpit.com/account-aggregator-integration-fintech-builders-2026/)
- [Account Aggregators — Sahamati](https://sahamati.org.in/account-aggregators/)
- [Account Aggregator Framework — Department of Financial Services](https://financialservices.gov.in/account-aggregator-framework)
- [DPDP Act and Rules 2025: 2026 milestones — Mondaq](https://www.mondaq.com/dpdp-act-and-rules-2025-the-2026-compliance-milestones-businesses-cant-afford-to-miss/1830402)
- [DigiLocker overview — Cashfree docs](https://www.cashfree.com/docs/secure-id/digilocker/digilocker.md)
- [e-Insurance Account and repositories — Upstox](https://upstox.com/learning-center/personal-finance/what-is-e-insurance-account/article-1902/)
- [Bima Sugam enters trials — Tata AIA](https://www.tataaia.com/knowledge-centre/newsletter/bima-sugam-trials-underway-in-india.html)
