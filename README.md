# Family CFO

A family-finance command centre for the person who manages their parents' money: one place for the household's policies, deposits and papers, with alerts before anything lapses. An Elvyen product.

This repo is the **Foundation sprint** (weeks 1–3 of the MVP plan).

## What's built

| Area | Status |
| --- | --- |
| Phone OTP sign-in (+91) | Done |
| Onboarding: create household, add family in one step | Done |
| Family dashboard with essential-papers score and "Do next" list | Done |
| Member profiles, add member, WhatsApp invite (Hindi/English) | Done |
| Vault: scan with camera, pick photo or PDF, upload with progress, open file | Done |
| Roles (owner / co-manager / viewer) enforced in Firestore + Storage rules | Done |
| Consent model: non-self members start as "pending consent" | Done |
| Settings: profile, family, data & consent placeholder | Done |
| OCR extraction, Coverage Radar, alerts, Emergency Mode, Hindi parent view | Next sprints |

## Stack

Expo SDK 57 · Expo Router · TypeScript · React Native Firebase v26 (modular API) · Firestore + Cloud Storage in `asia-south1` (Mumbai).

```
src/
  app/                 Expo Router screens
    sign-in.tsx        phone OTP
    onboarding.tsx     create household + family
    (app)/(tabs)/      Family, Vault, Settings
    (app)/member/      member profile, add member
    (app)/upload.tsx   add to vault
  components/          UI kit, SafetyStrip, rows
  lib/                 pure logic (phone, files, permissions, readiness) — unit tested
  providers/           auth + household state (live Firestore listeners)
  services/            Firebase calls
  theme/               "passbook" palette and type scale
firestore.rules        security rules (roles map on each household)
storage.rules          vault file rules
tests/                 unit tests + Firestore rules tests
```

## Setup

1. **Install**
   ```bash
   npm install
   ```
2. **Create a Firebase project** (console.firebase.google.com):
   - Firestore: create in **asia-south1 (Mumbai)**.
   - Storage: enable, same region.
   - Authentication → Sign-in method → enable **Phone**.
   - Add an **Android app** with package `com.elvyen.familycfo`. Add your debug and release **SHA-1 and SHA-256** fingerprints (needed for phone auth). Download `google-services.json` to the project root.
   - Add an **iOS app** with bundle ID `com.elvyen.familycfo`, download `GoogleService-Info.plist` to the root, and upload your APNs key (phone auth on iOS).
   - Both files are gitignored on purpose.
3. **Deploy rules**
   ```bash
   npx firebase login
   npx firebase use --add          # pick your project
   npm run deploy:rules
   ```
4. **Run a development build** (Expo Go won't work — React Native Firebase needs native code)
   ```bash
   npx expo prebuild --clean
   npm run android                  # needs Android Studio
   # or build in the cloud:
   npx eas-cli@latest build --profile development --platform android
   npm start
   ```
   For EAS builds, upload the Firebase files as secret file variables named `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST` (`app.config.js` reads them).

**Tip:** add test phone numbers with fixed codes under Authentication → Sign-in method → Phone, so you don't burn SMS quota while developing.

## Checks

```bash
npm run typecheck
npm run lint
npm test               # pure logic
npm run test:rules     # Firestore rules against the emulator (needs Java 11+)
```

`test:rules` has not been run yet — the emulator couldn't be downloaded in the environment this sprint was built in. Run it once locally before deploying rules to production.

## Security model in one paragraph

Every household document has a `roles` map (`uid → owner | co_manager | viewer`). Firestore and Storage rules authorise every read and write from that map. Members added by the earner are unlinked viewers with `consentStatus: "pending"`; the client can never change consent, plan or OCR status — those are written by Cloud Functions (Admin SDK) in later sprints. Files live under `households/{hid}/members/{mid}/documents/{did}/`, are limited to PDF/JPG/PNG/HEIC/WebP under 20 MB, and are readable only by household members.

## Next sprint (weeks 4–7)

- Cloud Function: OCR + LLM extraction on upload → `extracted` fields with confidence, confirm screen.
- Coverage Radar from extracted sum assured vs member age.
- Alert engine (daily Cloud Scheduler sweep) + WhatsApp Business messages.
- Emergency Mode and the Hindi parent view.
- Invite links so parents can join and grant consent themselves.
