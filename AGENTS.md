# LineUp Agent Rules

## Direction

LineUp v75 is the canonical product reference for a future fully native SwiftUI iOS app. The web app remains a deployable product/UX, backend-contract, security, and test reference. It is not the native architecture.

- Future iOS work uses SwiftUI and the Supabase Swift SDK.
- Do not add Capacitor, a WebView wrapper, or native files until a later task explicitly starts the Swift project.
- The manifest and service worker are web-preview infrastructure only.
- Read `docs/native-rebuild-product-spec.md`, `docs/native-api-contract.md`, `docs/native-v1-scope.md`, and `docs/native-swift-rebuild-risk-map.md` before native work.
- Before a Swift spike, follow `docs/swift-feasibility-spike-preflight.md`. Do not infer missing APNs, avatar Storage, or retention infrastructure from a proposed contract.

## Non-Negotiable Truth

- Supabase is authoritative for auth, profiles, favorites, venues, live status, deals, reports, roles, rewards, presence, analytics, owner data, and staff data.
- Live status, reports, staff updates, owner updates, and deals remain backend-confirmed.
- Paid placement and deals must never change crowd, wait, freshness, or confidence truth.
- Preserve RLS, Edge Function validation, signed-device proof, account deletion, owner/staff authorization, aggregate-only venue analytics, and current-night filtering.
- Never invent APIs, rows, roles, permissions, activity, crowd levels, waits, deals, reports, events, users, or analytics.

## Client Storage

`src/state/cacheState.js` is the only web `localStorage` boundary. Its retained values are harmless cache/UI state such as selected area, recent venue IDs/timestamps, permission-education progress, public-token overrides, and signed-device bootstrap data. Do not restore account, role, permission, profile, report, deal, presence, analytics, reward, or venue truth from custom local storage. Native code should use Keychain for secrets/tokens and small replaceable caches for display only.

## Product Boundaries

- Student v1: auth, setup, optional permission education, Live, Deals, venue detail, structured reports, favorites, profile/account, legal/support, and deletion.
- No public comments, chat, free-form report text, public photo feed, payments, Stripe, IAP, paid boosts, background location, or fake fallback activity.
- Owner/staff tools remain web-only for native v1 unless scope is explicitly changed.

## Working Method

1. Audit current files, migrations, functions, policies, and tests before major edits.
2. Treat current code and newest migrations as evidence; archived docs are history only.
3. If a contract is missing or ambiguous, document the gap and stop rather than inventing it.
4. Prefer narrow changes that preserve existing boundaries.
5. Update canonical docs whenever a product or backend contract changes.
6. Treat proposed schemas/endpoints as missing until their migration/function exists, is deployed, and has negative authorization tests.

## Verification

For relevant changes run:

```bash
npm run smoke:source
npm run smoke:reliability
npm run smoke:security
npm run smoke:pwa
npm run build
npm run smoke:app
npm test
git diff --check
```

Run `npm run smoke:security:live` for security releases when `SUPABASE_SERVICE_ROLE_KEY` is supplied through a temporary environment variable. Never commit or print that key. Report failed, blocked, and unverified checks exactly.
