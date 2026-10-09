# Family CFO — guide for Claude Code

Family CFO is an Elvyen app: a read-only family-finance command centre for the Indian earner who manages their parents' policies, deposits and papers.

## Read first

- **Product spec: `docs/PRODUCT_SPEC.md`** — features, screens, data model, compliance rules, roadmap and build status. Check it before building any feature, and update it (especially "Build status" and the data model) in the same commit as the code.
- **Expo conventions: `AGENTS.md`** — Expo SDK 57 changes often; fetch versioned docs instead of trusting memory, and add packages with `npx expo install`.
- **Setup and security model: `README.md`.**

## Non-negotiables (from the spec)

- Read-only forever: never move money, place trades or scrape portals with passwords.
- Explain, don't sell: no product recommendations or commissions in Free/Pro.
- Consent: every non-self member starts `consentStatus: "pending"`; clients can never set consent, plan or `ocrStatus` — only Cloud Functions (Admin SDK) can.
- Never store full Aadhaar/account numbers; mask to the last 4.
- All data stays in `asia-south1`. No SMS-reading permissions (Play financial-apps policy).
- Manual + OCR must work with zero integrations; Account Aggregator is V2 via a regulated FIU partner.

## Code map

```
src/app/            Expo Router screens (routes only)
src/components/     ui.tsx (Text, Screen, Button, Field, ChipGroup, Panel, Notice, HeroCard, GradientFill, ScoreRing, Amount, Skeleton, EmptyState), toast.tsx (useToast, with Undo), haptics.ts (tap, success, heavy), SafetyStrip, rows
src/lib/            pure logic — types, catalog, phone, files, permissions, readiness (unit tested)
src/providers/      AuthProvider, HouseholdProvider (live Firestore listeners → useHousehold())
src/services/       all Firebase calls (React Native Firebase v26, modular API)
functions/            Cloud Functions: extractDocument (OCR), onItemCreated, api (invites, consent, share links, delete, ask), dailyReminders (WhatsApp). Pure, unit-tested logic: extraction.ts, alerts.ts, invite.ts, ask.ts
src/theme/tokens.ts forest-and-lime palette, spacing, type scale — use tokens, no raw hex in screens
firestore.rules / storage.rules   authorisation from households/{id}.roles
tests/              lib.test.ts (npm test), firestore.rules.test.ts (npm run test:rules, needs emulator)
```

## Conventions

- Keep logic that can be pure in `src/lib/` and cover it in `tests/lib.test.ts`.
- Any new Firestore field or collection: update `src/lib/types.ts`, `firestore.rules`, the rules tests, and the data model table in the spec.
- Mirror rule logic client-side in `src/lib/permissions.ts` / `src/lib/files.ts` so the UI never offers an action the rules will reject.
- Copy is plain, sentence case, user-facing (Hindi where the member's `language` is `hi`). Errors say what happened and how to fix it.
- Design: "forest and lime", one dark theme. Deep green-black surfaces (`bg`, `surface`), one lime brand colour for the hero panel, primary buttons and anything in place; amber only for what's due or missing; red only for emergencies. On lime, text is `onTint` and buttons use `kind="dark"`; on dark, text is `ink`/`onBar`. Type stays calm: 14px body, 12px meta, 16px card titles, 24px hero titles; only hero numbers go big. One short line per description. Cards use the `shadow` token, tappables use `pressFeedback`, all text goes through `Text` (capped at `MAX_FONT_SCALE`). Polish rules: lime panels use `GradientFill`; lists load with `SkeletonList` and empty with `EmptyState`; saves confirm with a toast (offer Undo when it's reversible) and `success()`; buttons and chips already `tap()`; forms open as form sheets; list rows get hairline dividers; joined/pending people show an `Avatar` status dot.

## Before you commit

```bash
npm run typecheck && npm run lint && npm test
npm run test:rules   # whenever firestore.rules changes (needs Java + emulator)
```

## Next up (Sprint 2)

Device testing and deploy (typecheck, lint, rules tests, then `firebase deploy`), voice read-out for parents (expo-speech), push for the earner (expo-notifications), then Sprint 3: subscriptions and free-tier limits → alert engine with WhatsApp → Emergency Mode → Hindi parent view → parent invite/consent flow. Details in the spec's roadmap.
