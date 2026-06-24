# Native Swift Rebuild Readiness Audit

Audit date: 2026-06-24  
Baseline commit: `2a1ed10` (`17B`)  
App version: `v75`

## Executive Decision

- **Ready for a controlled Swift feasibility spike:** yes.
- **Ready to begin the full Swift rebuild:** no.

The product and core backend are mature enough to prove the native integration. The full rebuild should wait for native auth callback configuration, APNs token sync decision/contract, production avatar storage, exact-location retention/sampling policy, and deployment-parity verification.

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

1. Native auth redirect/email-confirmation/deep-link configuration is absent from `supabase/config.toml`.
2. No APNs token table, registration endpoint, sender, or lifecycle exists.
3. Profile avatars are stored as large data URLs in `user_profiles`; production Swift should use self-scoped object storage and URL cleanup.
4. Exact foreground coordinates are stored in `presence_snapshots`, but no routine retention/aggregation job is defined.
5. Deployed migration/function parity must be reverified with live credentials.
6. Swift Keychain installation/device-token renewal semantics need spike proof.

### P1 Improvements

- Consider a typed/aggregate venue-detail endpoint only if client composition becomes error-prone.
- Consolidate current-night time logic into a shared contract test across Swift and backend.
- Measure Realtime reconnect/battery behavior.
- Add versioned legal-content delivery strategy.
- Add analytics aggregation/retention before scale.

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
- Decision: push is not ready to promise. Complete `native-push-notification-spec.md` P0 or defer actual permission/request/delivery honestly.

## Location Readiness

- Optional/manual fallback, server verification, signed ingest, rate limits, and deletion cleanup: ready.
- Core Location client and reduced-accuracy handling: Swift work.
- Exact-coordinate retention/sampling: unresolved P0.
- Background location: explicitly deferred.

## Profile Photo Readiness

- Product flow, crop/position, compression, unsupported-format handling: proven in web v75.
- Storage contract: not production-native ready. Base64 preference payload is acceptable only for compatibility spike testing.

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
- `smoke:security:live` requires a temporary service-role key and is reported unverified when unavailable.
- The Swift spike must add native contract tests rather than treating web smoke as native proof.

## Final Recommendation

Proceed with the small, disposable feasibility spike in `docs/swift-feasibility-spike-plan.md`. Do not create the full production Xcode project until every P0 gap has an approved contract or an explicit scope deferral. If profile photo and push are deferred, that deferral must be reflected in UI and App Store metadata rather than simulated locally.
