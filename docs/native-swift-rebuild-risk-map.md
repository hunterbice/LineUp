# LineUp Native Swift Rebuild Risk Map

Severity: **P0** blocks safe full rebuild/launch, **P1** must be resolved during v1, **P2** later improvement.

| Risk | Severity | Why it matters / current web protection | Required Swift instruction | Verification | Evidence |
| --- | --- | --- | --- | --- | --- |
| Swift agent invents APIs | P0 | A plausible endpoint can bypass real validation or silently diverge. Web services identify actual calls. | Use only `native-api-contract.md` plus inspected source/deployed responses; document gaps. | Contract tests against disposable account. | `src/services/*`, `supabase/functions/*` |
| Stale docs drive architecture | P0 | Old handoffs describe static/PWA/local-first behavior. | Read `AGENTS.md` and `docs/native-*`; archived docs are history only. | Stale-term audit; canonical-link test. | `docs/archive/`, `README.md` |
| Fake seed/fallback data appears live | P0 | `src/data.js` contains fallback venue values and old labels. Web clears venue list on failed first backend load. | Never ship seed status as current; show unavailable/low-data. | Disconnect backend and inspect UI. | `src/data.js`, `loadSupabaseStatus` |
| Local cache becomes truth | P0 | Security smoke centralizes harmless cache and clears sensitive legacy keys. | Keychain for credentials; cache reads with timestamps only; server wins. | Relaunch/offline tests and cache audit. | `cacheState.js`, `security-smoke.mjs` |
| Auth/session mismatch | P0 | Web uses Supabase Auth JWT; native redirect URLs are absent. | Use Supabase Swift session and configure native confirmation/deep links. | Signup, callback, refresh, logout on device. | `src/main.js`, `supabase/config.toml` |
| Signed-device mismatch | P0 | Sensitive functions verify HMAC device token. Web generates/stores IDs in browser cache. | Build Keychain-backed `DeviceSessionProvider`; preserve request fields and renewal. | Valid, expired, corrupted, cross-device tests. | `deviceSessionService.js`, `_shared/security.ts` |
| Permission truth mismatch | P0 | v75 separates education from browser/system result. | Query native frameworks; never infer grant from custom button/profile pref. | Deny, allow, restricted, notDetermined tests. | `permissionController.js` |
| APNs token lifecycle missing | P0 for push | No token table/sync/sender exists. | Do not enable delivery until reviewed register/update/unregister contract exists. | Sandbox token rotation/logout/delete tests. | `native-push-notification-spec.md` |
| Core Location privacy | P0 | Backend stores exact/rounded presence; owner-only RLS and deletion exist, but no routine retention. | Foreground/event-driven only; approve retention and data minimization. | Retention job, access probes, privacy review. | `location-ingest`, presence migrations |
| Background location overreach | P0 | Web runs only while visible; native could accidentally request Always. | No Always/background/geofence in v1. | Info.plist/capability review and device test. | `native-location-services-spec.md` |
| Current-night boundary bugs | P0 | Backend/client use 5 AM America/Phoenix; duplicate implementations can drift. | Centralize timezone calendar logic and contract tests. | 4:59/5:00, midnight, future-skew tests. | `utils/nightlife.js`, `reports-feed`, migration `202606230002` |
| Owner/staff authorization | P0 | DB roles, RLS/functions, and denial tests protect venue scope. | Keep privileged UI out of v1; never trust cached roles. | ordinary/staff cross-venue live probes. | `security-smoke.mjs`, `security-live-smoke.mjs` |
| Deal truth vs paid promotion | P0 | Deal modules are separate from status; promoted is labeled. | Separate models/repositories; never feed deal rank into crowd scoring. | Source smoke and UI inspection. | `venueDealService.js`, deal migrations |
| Report spam/abuse | P1 | Signed device, auth, server validation, rates, reliability/confidence decay. | Preserve limits and server IDs; no offline fake success. | burst/rate/cross-device tests. | `location-ingest`, scoring migrations |
| Profile photo upload/privacy | P0 if photo ships | Current data URL works but scales poorly and may retain sensitive image data. | Use PhotosPicker, strip metadata, crop/compress, self-scoped Storage, deletion cleanup. | oversized/HEIC/privacy/cross-user tests. | `profileImage.js`, `account-sync` |
| Account deletion regression | P0 | Self-bound signed-device server cleanup exists. | Never accept target user; clear native secrets after success. | two-user live deletion test. | `account-sync`, `security-live-smoke.mjs` |
| Direct client writes / RLS drift | P0 | Latest migrations revoke protected mutations; deals are the intentional RLS write exception. | Use Edge Functions for reports/location/analytics/profile; re-audit grants before launch. | migration/static/live security smoke. | migrations `202606190001/002` |
| Offline/low-data dishonesty | P1 | Web shows typical/unavailable states and backend timestamps. | Keep cached read visibly stale; do not queue truth-changing success. | airplane mode/expired cache tests. | dashboard/detail renderers |
| Realtime reconnect/battery | P1 | Web subscribes to live status/reports and refetches. | Measure lifecycle/reconnect; prefer scoped refresh if realtime is noisy. | network transitions and Instruments. | `venueService.js`, `main.js` |
| App Store review | P0 | Legal/deletion/optional permissions exist; native implementation can diverge. | Preserve account deletion, optional location/push, honest data, support links. | reviewer flow on TestFlight. | `docs/app-*`, `public/legal/*` |
| PWA/WebView assumptions leak | P0 | Service worker/manifest remain in repo for web preview. | No WebView, Capacitor, manifest, service worker, browser permission, DOM, or CSS architecture in Swift. | native dependency/project review. | `AGENTS.md`, web-only files |
| Deployment drift | P0 | Static tests inspect repo; live parity requires credentials. | Record deployed migration/function versions before Swift integration. | live security smoke and function inventory. | `security-audit-priority-13.md` |
| Analytics captures location/PII | P1 | Analytics sanitizers reject location-like metadata and return aggregate performance. | Use allowlisted typed events; no coordinates, avatar, email, or raw text. | payload unit tests and DB sample audit. | `venueAnalyticsService.js`, `venue-analytics-ingest` |

## Risk Ownership Before Full Rebuild

- **Backend/security owner:** native auth redirects, APNs contract, location retention, photo storage, deployment parity.
- **Swift lead:** Keychain/device session, permissions, current-night date logic, offline states, API decoding, no privileged scope.
- **Product/legal:** push categories, location copy/retention, App Privacy Label, age-rating and nightlife copy.
- **QA:** physical-device matrix, cross-user denial, low-data/offline honesty, account deletion, App Review walkthrough.
