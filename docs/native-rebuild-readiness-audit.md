# Native Swift Rebuild Readiness Audit

Audit date: 2026-06-24  
Baseline commit: `eff6455` (`Priority 17 blueprint`)
App version: `v75`

## Executive Decision

- **Ready for a controlled Swift feasibility spike:** yes.
- **Ready to begin the full Swift rebuild:** no.

The product and core backend are mature enough to prove native integration. Priority 18 converted every P0 into an exact spike contract or a clearly bounded full-rebuild gate. The full rebuild still waits for production auth callback approval, APNs delivery infrastructure if push remains in scope, production avatar storage if photos remain in scope, automated exact-location cleanup, on-device Keychain proof, and credentialed live authorization verification.

## Priority 18 P0 Closure Summary

| P0 | Classification after Priority 18 | Blocks spike | Blocks full rebuild | Exact next action |
| --- | --- | --- | --- | --- |
| Native auth callback/session | Spike-ready with documented limitation | No | Yes, until production callback/session proof | Choose disposable bundle ID, allowlist one exact callback, run on-device signup/confirmation/restore/refresh/logout matrix |
| APNs token sync/lifecycle | Spike-ready for authorization/token acquisition only | No | Yes if push delivery ships | Either omit push or implement reviewed token schema/function/RLS/provider/cleanup and live tests |
| Profile-photo object storage | Spike-ready for omission or compatibility test | No | Yes if photo ships | Decide read model, implement self-scoped Storage/migration/replacement/deletion cleanup, then cross-user tests |
| Exact-location retention | Spike-ready with disposable foreground data | No | Yes | Deploy and verify 24-hour exact and 30-day rounded cleanup before release |
| Signed-device/Keychain lifecycle | Closed by existing server implementation for spike; native proof remains | No | No, subject to successful spike | Implement/test Keychain tuple, renewal, invalid recovery, relaunch, reinstall, logout, deletion; add revocation as P1 |
| Deployed parity/live security | Migration/function inventory verified; credentialed authorization suite blocked | No for disposable spike | Yes for security signoff | Run `smoke:security:live` with a temporary service-role key and archive redacted pass evidence |

No migration, Edge Function, table, Storage bucket, or production permission behavior was added in Priority 18. Missing systems are intentionally not represented as implemented.

## Current Repo State

- Vite web reference organized into state, controllers, services, renderers, utilities, tests, and Supabase source.
- Priority 17A and 17B behavior is committed: simplified setup, guided truthful permissions, circular photo sheet/crop/compression, Live/Deals detail tabs, conditional events, current-night reports, native-feeling refresh, and redundant-summary removal.
- Supabase is the product source of truth. Custom local storage is constrained to cache/UI and device bootstrap through `cacheState.js`.
- PWA files remain deployable web-preview infrastructure, not the iOS strategy.

## Canonical Sources

1. `AGENTS.md`
2. `docs/native-rebuild-product-spec.md`
3. `docs/native-api-contract.md`
4. `docs/native-screen-state-inventory.md`
5. `docs/native-v1-scope.md`
6. location/push/spike/risk documents under `docs/native-*` and `docs/swift-*`
7. current code, latest migrations, and Edge Functions

Archived documents are historical only.

## Stale Material Found And Handled

- Root PWA/App Store readiness guide recommended Capacitor: archived.
- Old app breakdown described dark, frontend-only, localStorage-first product: archived.
- Priority 16 App Store audit described a wrapper/WebView follow-up: archived.
- Ignored 1,590-line master handoff described static PWA/no backend/LineLeap/comments: inspected and archived under a trackable legacy name.
- README contained correct new direction but stale single-file, optimistic-report, Pulse, LineLeap, and missing-function claims: rewritten.
- Location review described a wrapper mapping WebView geolocation: rewritten around Core Location.

## Backend Strengths

- Supabase Auth and self-bound user identity.
- RLS enabled for all migration-created public tables, checked by `security-smoke.mjs`.
- Protected direct mutation paths revoked by migrations `202606190001/002`.
- HMAC signed-device proof for account, reports/location, analytics, rewards, profile summary, and Early Access.
- Authenticated, venue-scoped owner/staff authorization.
- Self-only account deletion with linked personal-data cleanup.
- Reports, checks, presence, app events, and analytics rate controls.
- Server scoring separates historical priors, user signals, verified inputs, and staff/owner updates.
- Deals and paid placement are structurally separate from live crowd truth.
- Current-night report and event filtering uses a 5 AM America/Phoenix boundary.
- Aggregate-only venue deal performance and launch-interest access.

## Backend Gaps

### P0 Before Full Swift Rebuild

1. Production native auth redirect/email-confirmation/deep-link configuration is absent from `supabase/config.toml`; the disposable spike procedure is exact in `swift-feasibility-spike-preflight.md`.
2. No APNs token table, registration endpoint, sender, or lifecycle exists. Push may be omitted, but must not be promised.
3. Profile avatars are stored as compressed data URLs in `user_profiles`; production Swift photo launch requires reviewed object storage and lifecycle cleanup.
4. Exact foreground coordinates are stored in `presence_snapshots`; the 24-hour exact / 30-day rounded policy has no deployed scheduled enforcement.
5. Credentialed live authorization/IDOR probes remain unverified because `SUPABASE_SERVICE_ROLE_KEY` was unavailable.
6. Swift Keychain installation/device-token renewal semantics need on-device spike proof; the server contract itself is ready.

### P1 Improvements

- Consider a typed/aggregate venue-detail endpoint only if client composition becomes error-prone.
- Consolidate current-night time logic into a shared contract test across Swift and backend.
- Measure Realtime reconnect/battery behavior.
- Add versioned legal-content delivery strategy.
- Add analytics aggregation/retention before scale.
- Add per-device signed-token revocation/rotation beyond the current 30-day HMAC expiry.
- Decide whether profile avatars use authenticated signed reads or approved public object URLs before creating a bucket.

### P2 Later

- Native owner/staff operations.
- Rewards economy expansion.
- multi-campus schema/product work;
- advanced push segmentation;
- background/proximity experiences only after explicit privacy approval.

## Direct Client Mutation Review

Protected reports, app signals, analytics, live status, profiles, favorites, rewards, presence, roles, and owner data use Edge Functions or revoked direct writes. `venue_deals` intentionally retains authenticated insert/update under venue-scoped and plan-scoped RLS for the existing web staff tool. Swift student v1 should read deals only and omit that mutation surface.

## Push Readiness

- Education/product copy: ready conceptually.
- Native authorization: must be implemented with `UNUserNotificationCenter`.
- Delivery backend: missing.
- Spike: native authorization and sandbox token acquisition may be tested without backend sync.
- Decision: push is not ready to promise. Complete `native-push-notification-spec.md` P0 or omit actual permission/delivery honestly.

## Location Readiness

- Optional/manual fallback, server verification, signed ingest, rate limits, and deletion cleanup: ready.
- Core Location client and reduced-accuracy handling: Swift work.
- Target retention: exact coordinates no longer than 24 hours; rounded operational presence no longer than 30 days; only de-identified aggregates may persist longer.
- Enforcement: unresolved P0 because no scheduled cleanup exists.
- Background location: explicitly deferred.

## Profile Photo Readiness

- Product flow, crop/position, compression, unsupported-format handling: proven in web v75.
- Storage contract: not production-native ready. Compressed data-URL preference payload is acceptable only for compatibility spike testing; the spike may omit photo entirely.
- Object-storage read model, self-scoped policies, legacy migration, replacement/orphan cleanup, and account-deletion cleanup remain P0 if photo ships.

## Deployed Backend Parity Evidence

Priority 18 performed read-only checks against linked project `bxngqqsxthybjikmwvqj`:

- `supabase migration list --linked`: all 43 local migration versions through `202606230002` had matching remote entries.
- `supabase functions list --project-ref bxngqqsxthybjikmwvqj`: all 14 repository Edge Function names were ACTIVE (`venue-status-ingest`, `besttime-prior-import`, `location-ingest`, `device-profile-summary`, `reward-ledger`, `account-sync`, `owner-dashboard`, `owner-actions`, `validate-staff-code`, `app-event-ingest`, `device-session`, `reports-feed`, `venue-analytics-ingest`, `early-access`).
- These commands verify inventory, not deployed source hashes or behavior.
- `SUPABASE_SERVICE_ROLE_KEY` was absent, so `npm run smoke:security:live` was not run. Full authorization parity remains unverified.

## Reports And Current-Night Readiness

- Structured submit and feed contracts: ready.
- Backend-confirmed report → feed refresh → Live refresh order: documented and tested.
- 5 AM Phoenix boundary exists on server and web.
- No public free-form text/photo/chat.
- Swift must add timezone boundary tests; otherwise ready.

## Owner / Staff Readiness

Backend authorization is strong and web tools exist. Recommendation: keep owner/staff web-only for Swift v1. This reduces native attack surface and avoids mixing operator workflows into the student binary.

## App Store Readiness

Strengths:

- in-app account deletion;
- Privacy, Terms, Support;
- optional permission flow and manual fallback;
- no fake Apple sign-in, payments, public UGC, or fake activity;
- honest Early Access/low-data behavior;
- structured reports and restrained nightlife copy.

Remaining native work:

- TestFlight build, native privacy strings/capabilities, screenshots, App Privacy Label reconciliation, disposable reviewer account, deep-link validation, and device QA.

## Code Cleanup Decision

No runtime code was removed in this pass. Old `lineLeap` fallback fields, legacy CSS class names containing `intel`, and PWA infrastructure still occur internally. They are not current student product direction, but removing them is broader than a documentation-readiness pass and could disturb fallback/scoring/web regression behavior. They are recorded as P1 web cleanup, not instructions for Swift.

## Verification Strategy

- Static/source/reliability/security/PWA/app smoke and build remain required for this documentation change.
- `smoke:security:live` requires a temporary service-role key and is reported blocked when unavailable. Use the no-history command in `swift-feasibility-spike-preflight.md`.
- The Swift spike must add native contract tests rather than treating web smoke as native proof.

## Priority 18 Search Classification

The required repo-wide term sweep (excluding `docs/archive/`, `node_modules/`, and build output) produced these classes:

| Terms | Classification |
| --- | --- |
| APNs, push token, `push-token`, `user_push_tokens` | Canonical proposed native contract / **P0 gap**. No runtime table or function exists. |
| `Notification.requestPermission`, browser notification, `navigator.geolocation` | Intentional web-reference implementation or “do not copy” native documentation. |
| Core Location, PhotosPicker, Keychain | Canonical native guidance; no Swift/native files exist in this repo. |
| `location-ingest`, `lat_exact`, `lng_exact` | Current backend implementation and migrations. Exact-coordinate cleanup is a **P0 full-rebuild gap**. |
| retention, cleanup | Mix of current account cleanup and canonical missing routine-retention guidance; not evidence of a deployed schedule. |
| profile photo, avatar, base64, storage, bucket | Current web profile implementation plus canonical object-storage gap. `bucket` also appears as unrelated crowd-scoring terminology in migrations. |
| signed-device, device secret | Current implementation/security tests and canonical native lifecycle. Secret values remain server-only. |
| auth callback, redirect, session refresh | Canonical spike guidance plus current web-only redirect config. The exact phrase `session refresh` did not occur; refresh behavior is documented as restore/refresh/refresh-once. |
| account deletion | Current server implementation, UI/tests, and canonical cleanup requirements. |
| `SUPABASE_SERVICE_ROLE_KEY`, `smoke:security:live` | Server/test-only. The secret is absent from this environment; live verification remains blocked. |

Archived hits remain historical and non-canonical. No search result justified adding a new backend table/function in this pass.

## Final Recommendation

Proceed with the small, disposable feasibility spike using both `docs/swift-feasibility-spike-plan.md` and `docs/swift-feasibility-spike-preflight.md`. Do not create the full production Xcode project until every full-rebuild P0 is implemented and verified or explicitly removed from v1 scope. If profile photo or push is deferred, that deferral must be reflected in UI and App Store metadata rather than simulated locally.
