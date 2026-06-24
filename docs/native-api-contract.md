# LineUp Native API And Backend Contract

Baseline: v75 / `eff6455`. Priority 18 verified linked migration inventory and active Edge Function inventory on 2026-06-24, but did not prove deployed function source hashes or run the credentialed live authorization suite. See `docs/swift-feasibility-spike-preflight.md`.

## Transport Rules

- Supabase URL and publishable key: `src/config.js`.
- Account JWT: Supabase Auth session, sent as `Authorization: Bearer <access_token>`.
- Signed-device proof: call `device-session`, then include `device_id`, `session_id`, and `device_token` in protected requests. Web reference: `src/services/deviceSessionService.js` and `supabase/functions/_shared/security.ts`.
- Native should store JWT refresh material and signed-device token in Keychain. A stable random installation ID may replace the web-generated ID; define rotation/restoration behavior during the spike.
- Edge Functions accept requests without an `Origin`, which supports native URLSession. CORS is not authorization.
- Error body convention: `{ "error": "message" }`; common statuses are 400 validation, 401 auth/device, 403 authorization/origin, 404 resource, 409 state conflict, 429 rate limit, and 500/503 server/integration failure.
- Never call service-role APIs from the app.

## 1. Supabase Auth And Session

- **Purpose / Swift v1:** registration, login, token refresh, logout; **yes**.
- **Web / backend:** `src/main.js` (`signUp`, `signInWithPassword`, `getSession`, `signOut`); Supabase Auth; `supabase/config.toml`.
- **Auth/device:** email/password creates the auth session; device proof is separate.
- **Request/response:** Supabase Swift SDK email/password APIs; returns `User` and `Session` with access/refresh tokens.
- **Errors/abuse/privacy:** invalid credentials, confirmation-required, expired refresh, network, rate limits. Never log passwords/tokens.
- **Supported providers:** email/password only. The current product does not implement magic link, OAuth, anonymous Supabase Auth, or Sign in with Apple.
- **Callback contract:** choose a disposable spike bundle ID, derive one exact `<bundle-id>://auth/callback` URL, and add only that URL to the Supabase Auth redirect allowlist. Route opened URLs through the Supabase Swift auth URL handler. Do not add wildcard redirect rules. The production bundle ID remains a release decision.
- **Confirmation behavior:** inspect the test project's actual email-confirmation setting. Sign-up may return a user without a session when confirmation is enabled. The client must wait for the callback/session rather than treating account creation as authentication.
- **Persistence:** use the Supabase Swift session model with a Keychain-backed storage adapter. On launch/foreground, restore the session and refresh when required. On an authenticated request 401, refresh once and retry once; if refresh fails, clear account state and return to sign-in.
- **Separation:** Supabase access/refresh tokens are account credentials. The LineUp signed-device token is a separate installation proof and must never be substituted for a JWT.
- **Logout:** call Supabase sign-out and clear JWT/profile/role caches. Retain the LineUp installation tuple across ordinary logout for anti-abuse continuity.
- **Status / priority:** **spike-ready with required preflight, P0 proof**. Repository config still contains web redirects only because the native bundle ID has not been approved.
- **Swift instruction:** follow the exact preflight in `docs/swift-feasibility-spike-preflight.md`; do not invent providers, redirect URLs, or custom session truth.

## 2. Signed Device Session

- **Purpose / Swift v1:** binds abuse-sensitive operations to an issued installation/session token; **yes**.
- **Web / backend:** `src/services/deviceSessionService.js`; `device-session`; `_shared/security.ts`.
- **Auth/device:** publishable key; existing device token required only for renewal of a supplied ID. New issuance creates server IDs.
- **Request:** `{device_id?, session_id?, device_token?}`.
- **Response:** `{ok, device_id, session_id, device_token, expires_in_seconds}`; current TTL 30 days.
- **Errors/rate/privacy:** 401 invalid/expired proof, 429 issuance limit, 500 missing secret. IDs are pseudonymous but user-linked after account claim.
- **Current cryptography:** server-issued HMAC-SHA256 token with `device_id`, `session_id`, `iat`, and `exp`; signature, device binding, and expiry are validated in `_shared/security.ts`.
- **Native storage:** persist `{device_id,session_id,device_token,expires_at}` as one Keychain record using a ThisDeviceOnly accessibility class appropriate for foreground use. Never use UserDefaults.
- **Lifecycle:** first call omits proof and accepts server-generated IDs; renew before the five-minute expiry margin; on invalid/expired 401 clear the tuple, obtain one new server-issued tuple, and retry once. A second failure is a real service error.
- **Logout/deletion:** preserve installation proof through ordinary logout; after confirmed account deletion clear both account secrets and the installation tuple. Record reinstall behavior during the spike rather than assuming Keychain deletion semantics.
- **Current limitation:** there is no per-token revocation list. A compromised token lasts until its 30-day expiry unless the global HMAC secret rotates.
- **Status / priority:** **closed by existing implementation for the spike, P0 proof required**. Per-token revocation is P1 production hardening.
- **Swift instruction:** encapsulate as `DeviceSessionProvider`; never invent a token, trust an unverified cached ID, or treat this proof as user authentication.

## 3. Account And Profile Setup

- **Purpose / Swift v1:** claim device data, read/update profile, favorites, and authorized roles; **yes**.
- **Web / backend:** `accountService.js`; `account-sync`; `user_profiles`, `user_devices`, `user_favorites`, `venue_admins`.
- **Auth/device:** JWT plus signed-device proof.
- **Request:** `{action:"claim"|"update_profile"|"sync_favorites", favorites?:[venueId], preferences?:{interaction_visibility,display_name,avatar_url,profile_setup_completed,notification_pref,location_pref,terms_accepted,data_policy_seen}, device proof}`.
- **Response:** `{ok,user:{id,is_anonymous,email},preferences,favorites?,permissions:{owner,roles,venues}}`.
- **Errors/abuse/privacy:** invalid JWT/device, malformed preferences, database failure. Roles are response data for UI only; server still authorizes every privileged call.
- **Status / priority:** **ready, P0**, except avatar contract in section 16.
- **Swift instruction:** call `claim` after authenticated launch and refresh. Do not persist permissions as authority.

## 4. Early Access Status And Join

- **Purpose / Swift v1:** joined state and campus; **yes while Early Access exists**.
- **Web / backend:** `earlyAccessService.js`, `earlyAccessController.js`; `early-access`; migration `202606230001_app_store_early_access.sql`.
- **Auth/device:** JWT plus signed-device proof.
- **Request:** `{action:"status"|"join", device proof}`.
- **Response:** `{ok,early_access:{joined,joined_at,campus_slug,requested_venue_ids}}`.
- **Errors/rate/privacy:** 401 invalid account/device; 500 failure. Campus currently permits only `university_of_arizona`.
- **Status / priority:** **ready, P0**.
- **Swift instruction:** server state is authoritative; do not replace it with onboarding completion flags.

## 5. Launch Deal Request

- **Purpose / Swift v1:** record aggregate interest in a venue launch deal; **yes in Early Access**.
- **Web / backend:** `earlyAccessController.requestDeal`; `early-access`; `launch_deal_requests`; `launch_deal_interest` RPC.
- **Auth/device:** JWT plus signed-device proof. Venue aggregates require an authorized venue role.
- **Request:** `{action:"request_deal",venue_id,device proof}`.
- **Response:** `{ok,duplicate,early_access}`.
- **Errors/rate/privacy:** invalid venue, 20 requests/day account limit, RLS blocks direct table access. Venue gets aggregate count only.
- **Status / priority:** **ready, P1**.
- **Swift instruction:** pending state, backend response, then update from returned status; never create a deal row.

## 6. Permission Education Progress

- **Purpose / Swift v1:** avoid repeating explanatory screens; **yes, local UI only**.
- **Web / backend:** `cacheState.js` permission education key; no backend contract.
- **Auth/device:** none. Store only step/completed scoped to account.
- **Request/response:** local `{step:"notifications"|"location",completed:Boolean}`.
- **Errors/privacy:** loss merely repeats education. It must not imply system grant.
- **Status / priority:** **ready conceptually, P0**.
- **Swift instruction:** use replaceable app storage keyed to account; query native frameworks for actual permission truth.

## 7. Notification Permission Status

- **Purpose / Swift v1:** truthful optional permission state; **education yes, delivery only after APNs contract**.
- **Web / backend:** `permissionController.js` uses browser Notification API; no backend.
- **Request/response:** native `UNUserNotificationCenter` authorization status.
- **Errors/privacy:** denied, provisional, ephemeral, notDetermined, unavailable; never map a custom button tap to granted.
- **Status / priority:** **native implementation required, P0**.
- **Swift instruction:** use native authorization status. Do not port `Notification.requestPermission`.

## 8. APNs Token Sync

- **Purpose / Swift v1:** associate APNs tokens with account/device and notification preferences; **required before sending push**.
- **Current implementation:** **missing**. No table or Edge Function stores APNs tokens.
- **Proposed request:** authenticated signed-device endpoint with `{action:"register"|"update_preferences"|"unregister",apns_token,environment,device_id,app_version,locale,enabled_categories}`.
- **Proposed response:** `{ok,registered,updated_at}`.
- **Errors/abuse/privacy:** self-bound token only; upsert by token/installation; revoke on logout/deletion; rate limit; never expose tokens to venues.
- **Repository evidence:** no `user_push_tokens` table, token-sync Edge Function, sender, APNs credential integration, or account-deletion cleanup exists.
- **Status / priority:** **spike-ready with documented limitation** for authorization/token acquisition only; **P0 for enabling push or full rebuild scope that promises delivery**.
- **Swift instruction:** the spike may acquire an APNs sandbox token and record it redacted. Do not call, mock, or locally pretend a LineUp registration endpoint exists until a reviewed migration/function is deployed.

## 9. Location Permission Status

- **Purpose / Swift v1:** optional foreground authorization; **yes**.
- **Web / backend:** `permissionController.js`; no persistent permission-truth backend.
- **Request/response:** Core Location `CLAuthorizationStatus` and actual location callback.
- **Errors/privacy:** denied/restricted/notDetermined/reduced accuracy/timeout. Profile preference is user intent/history, not system truth.
- **Status / priority:** **native implementation required, P0**.
- **Swift instruction:** use Core Location and manual campus fallback; no Always request.

## 10. Core Location Event Ingest

- **Purpose / Swift v1:** foreground presence, check-in verification, and report verification; **yes, optional**.
- **Web / backend:** `locationService.js`; `location-ingest`; `presence_snapshots`, `venue_checkins`, `reports`, signal tables.
- **Auth/device:** JWT plus signed-device proof.
- **Request:** `{action:"presence"|"check_in"|"report",venue_id?,lat?,lng?,accuracy_m,interaction_visibility,display_name?,avatar_url?,crowd_level?,wait_minutes?,cover_amount?,cover_active?,device proof}`. Non-report actions require valid coordinates; report may omit them.
- **Response:** presence returns nearest venue/distance/area/verification; check-in returns target, verification and checkin row; report returns report row, verification, and whether signal was used.
- **Errors/rate/privacy:** 6 reports/15m/device, 5 check-ins/15m/device, 30 presence updates/15m/device; unknown venue/location errors. Exact and rounded coordinates are currently stored in owner-only presence rows.
- **Current retention:** account deletion removes user/device-linked presence, but there is no routine expiry job. Owner dashboard reads exact coordinates only from active 15/60-minute windows and coarse operational rows for 24 hours.
- **Required target contract:** exact latitude/longitude must be redacted or deleted within 24 hours; rounded operational presence may remain for at most 30 days; only de-identified aggregate venue statistics may be retained longer. Product/legal/security must approve it, and a reviewed scheduled cleanup plus verification query must exist before full native release.
- **Status / priority:** **spike-ready with disposable-account limitation**; **P0 for full rebuild** until cleanup is implemented, deployed, and verified.
- **Swift instruction:** send foreground/event-driven samples only; no background tracking; delete disposable spike accounts; do not expose individual coordinates to venues.

## 11. Live Venues And Status

- **Purpose / Swift v1:** canonical venue list and current read; **yes**.
- **Web / backend:** `venueService.js`, `ACTIVE_STATUS_SELECT`; `active_venue_status` view from migration `202606230002_current_night_events.sql`.
- **Auth/device:** public select with publishable key; RLS/security-invoker view.
- **Request:** Supabase select of documented columns: venue identity, location, hours, event/event timestamp, crowd, wait, confidence, signal count, momentum, cover, sources, freshness.
- **Response:** rows shaped by `ACTIVE_STATUS_SELECT` in `src/config.js`.
- **Errors/privacy:** unavailable/network/empty. Never substitute `src/data.js` as fresh live truth.
- **Status / priority:** **ready, P0**.
- **Swift instruction:** model server fields explicitly; realtime `live_status` changes may trigger a full view refresh.

## 12. Venue Detail

- **Purpose / Swift v1:** compose live status, deals, reports, static venue info, and actions; **yes**.
- **Current implementation:** client composition in `renderBarDetail.js`; no single detail endpoint.
- **Request/response:** join the selected `active_venue_status` row with active venue deals and `reports-feed` response.
- **Errors/privacy:** any component may fail independently; show partial/low-data states.
- **Status / priority:** **ready as composed contract, P1**. A dedicated aggregate endpoint is optional, not required for the spike.
- **Swift instruction:** do not invent a `/venue-detail` API. Compose documented calls until backend adds one.

## 13. Deals List And Venue Deals

- **Purpose / Swift v1:** active deals and venue Deals tab; **yes, read-only student use**.
- **Web / backend:** `venueDealService.js`; `venue_deals`; deal migrations `202606050001` through `005`.
- **Auth/device:** public read for active current deals; authorized staff/owner for edit under RLS.
- **Request:** select `id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at` with `is_active=true`, `starts_at<=now`, `ends_at>now`.
- **Response:** normalized `Deal` model in `venueDealService.js`.
- **Errors/abuse/privacy:** promoted label required; deal window and venue relation validated. Direct authenticated writes exist only for venue roles under RLS.
- **Status / priority:** **student read ready, P0**; native staff editing **deferred P2**.
- **Swift instruction:** active filters are mandatory; deal fields never alter Live models.

## 14. Favorites / Saved Venues

- **Purpose / Swift v1:** cross-device saved venues; **yes**.
- **Web / backend:** `account-sync` actions `claim`, `sync_favorites`, `set_favorite`; `user_favorites`.
- **Auth/device:** JWT plus signed-device proof.
- **Request:** `set_favorite` includes `{venue_id,enabled}`; sync may include `{favorites:[venueId]}`.
- **Response:** refreshed `favorites` plus profile/permissions where applicable.
- **Errors/privacy:** self-bound; direct table mutations are revoked after hardening.
- **Status / priority:** **ready, P0**.
- **Swift instruction:** optimistic visual toggle is allowed only with rollback; server list wins after response.

## 15. Reports Submit / Feed / Current Night

- **Purpose / Swift v1:** submit and display current-night structured reports; **yes**.
- **Web / backend:** `reportService.js`; `location-ingest` report action; `reports-feed`; `utils/nightlife.js`.
- **Auth/device:** submit requires JWT + signed device; feed is public POST with publishable key.
- **Submit request/response:** see section 10. No public free-form note/photo. Success includes server report ID.
- **Feed request:** `{venue_id}`. Response `{ok,reports:[{id,venue_id,crowd_level,wait_minutes,photo_signal,location_verified,created_at,author:{name,avatar_url,anonymous}}]}`; max 20.
- **Current-night rule:** 5 AM America/Phoenix through now plus five-minute clock tolerance. Backend and client both filter.
- **Errors/abuse/privacy:** account/device/rate checks on write; public identity respects per-report visibility.
- **Status / priority:** **ready, P0**.
- **Swift instruction:** after submit: fetch feed, then refresh Live; never mutate status locally.

## 16. Current-Night Events

- **Purpose / Swift v1:** optional Events tab only for a real tonight event; **yes when present**.
- **Web / backend:** `active_venue_status.event`; migration `202606230002_current_night_events.sql`; staff update via `venue-status-ingest`.
- **Auth/device:** public read; authorized staff/owner write.
- **Response:** `event` is null unless `event_updated_at` falls within the 5 AM Phoenix window.
- **Status / priority:** **ready, P1**.
- **Swift instruction:** hide the tab for null event; fall back to Live if an active event disappears.

## 17. Profile Photo / Avatar Update

- **Purpose / Swift v1:** optional profile avatar; **yes if hardened, otherwise defer photo while retaining profile**.
- **Web / backend:** `profilePhotoController.js`, `profileImage.js`; `account-sync` `avatar_url` in `user_profiles`.
- **Auth/device:** JWT + signed-device proof.
- **Request:** current web sends a compressed 512px JPEG data URL inside `preferences.avatar_url` (max 250,000 chars).
- **Response:** normal updated profile.
- **Errors/privacy:** unsupported image/decode/size, JSON/body/storage growth. Avatar is public only when interaction visibility is public.
- **Target object contract:** a reviewed `profile-avatars` Storage design with self-scoped write/delete, authenticated or explicitly approved public read, server-validated JPEG/WebP, stripped metadata, square crop, maximum 512px output, and a target binary size no larger than 250KB. The final object path/read model must be selected before migration; do not assume public URLs or expiring signed URLs fit public report identity.
- **Transition:** existing `data:image/` rows remain readable during migration. A migration tool must upload/validate each legacy value, update `avatar_url` only after successful object creation, and retain rollback evidence. Orphan cleanup and account deletion must remove current and replaced objects.
- **Status / priority:** **spike-ready for compatibility only**; **P0 for full native photo launch**. No bucket or Storage policy exists today.
- **Swift instruction:** the spike may omit photos or prove the current compressed data-URL path and label it transitional. Production uses PhotosPicker, metadata stripping, crop/compression, reviewed object upload, and backend-confirmed profile update.

## 18. Account Deletion

- **Purpose / Swift v1:** in-app self-delete; **yes**.
- **Web / backend:** `confirmDeleteAccount` in `main.js`; `account-sync` `delete_account`.
- **Auth/device:** JWT + signed device; user ID derives from JWT.
- **Request:** `{action:"delete_account",confirm:"DELETE",device proof}`.
- **Response:** `{ok:true,deleted:true}` followed by local sign-out/secret removal.
- **Errors/privacy:** 400 confirmation, 401 auth/device, 500 cleanup. Historical/de-identified aggregates may remain only as documented. Future push-token rows and avatar objects must be added to this cleanup before those systems ship.
- **Status / priority:** **ready, P0**.
- **Swift instruction:** destructive confirmation, call once, clear Keychain/caches after confirmation, never accept target user ID.

## 19. Legal / Support

- **Purpose / Swift v1:** accessible Privacy, Terms, Support; **yes**.
- **Current implementation:** `public/legal/*.html`, `renderProfile.js`, `docs/app-*`.
- **Auth/device:** none.
- **Status / priority:** **content ready, P0**. Decide whether native bundles reviewed copy or opens versioned HTTPS pages.
- **Swift instruction:** provide reachable links/sheets before login where App Review requires; support address is `support@get-lineup.app`.

## 20. Owner / Staff Authorization

- **Purpose / Swift v1:** operational roles; **web-only for v1**.
- **Web / backend:** `account-sync.permissions`, `venue_admins`, `validate-staff-code` (legacy validation surface), owner/staff functions.
- **Auth/device:** database role plus function/RLS checks. Client gating is defense in depth only.
- **Status / priority:** **backend ready; native deferred P2**.
- **Swift instruction:** no native privileged UI in v1. If added later, refresh roles from backend and test cross-venue denial.

## 21. Venue Status Ingest

- **Purpose / Swift v1:** staff live updates; **no, web operations only**.
- **Web / backend:** `venue-status-ingest`; `venue_confidence_signals`; recompute RPC; `active_venue_status`.
- **Auth/device:** authenticated owner/admin or venue-scoped staff role; origin validation; rate/audit controls.
- **Request:** `{venue_id,crowd_level,wait_minutes,cover_amount?,cover_active,event?,note?,device_id}` plus JWT.
- **Response:** `{ok,venue_id,source_type,auth_mode,live_status}`.
- **Status / priority:** **ready for existing web ops, P2 native**.
- **Swift instruction:** do not call from student app.

## 22. Owner Actions, Deal Management, And Performance

- **Purpose / Swift v1:** operational control, deal CRUD, aggregate analytics; **web-only**.
- **Web / backend:** `owner-actions`, `owner-dashboard`, direct `venue_deals` RLS writes, `venue_deal_performance` RPC, `venue-analytics-ingest`.
- **Auth/device:** owner/staff DB roles; analytics event ingest also requires JWT + signed device. Performance is venue-scoped aggregate.
- **Errors/privacy:** cross-venue denial, rate limits, no raw user/device/location rows to venue staff.
- **Status / priority:** **ready for web operations, deferred P2 native**.
- **Swift instruction:** omit privileged surfaces and billing/subscription concepts from v1.

## 23. Student Analytics Events

- **Purpose / Swift v1:** aggregate product/deal measurement; **P1, may follow core spike**.
- **Web / backend:** `venueAnalyticsService.js`, `app-event-ingest`, `venue-analytics-ingest`, analytics tables.
- **Auth/device:** JWT + signed-device proof.
- **Request:** venue/deal/event type plus sanitized metadata; location-like metadata keys are rejected.
- **Response:** `{ok,event}` or duplicate marker for impressions.
- **Errors/abuse/privacy:** allowlists, per-device/user rates, deal/venue binding, impression dedupe. Analytics never changes Live truth.
- **Status / priority:** **ready, P1**.
- **Swift instruction:** queue best-effort events; failure must not block navigation; never include coordinates.

## 24. Pull-To-Refresh / Data Reload

- **Purpose / Swift v1:** user-requested freshness; **yes conceptually**.
- **Web implementation:** `pullToRefreshController.js` physically offsets DOM then calls status/deals/report reload.
- **Backend contract:** no endpoint; invoke existing Live, Deals, and current-detail report reads concurrently, then publish a single UI state.
- **Errors:** keep existing display with freshness context and expose retry; never claim success before calls complete.
- **Status / priority:** **ready concept, P1**.
- **Swift instruction:** use native `.refreshable`; do not port touch handlers, transforms, or web indicator code.

## Native P0 Contract Gaps

| Item | Swift spike status | Full rebuild status |
| --- | --- | --- |
| Native auth callback/session | Spike-ready after exact disposable callback allowlist entry; on-device proof required | Blocked until production bundle ID/callback and restore/refresh are approved |
| APNs token lifecycle | Token acquisition may be tested; no backend sync call exists | Blocked if push delivery remains in scope |
| Profile photo storage | Current compressed data URL is compatibility-only; photo may be omitted | Blocked if profile photo ships without reviewed object storage |
| Exact-location retention | Disposable foreground samples plus account deletion are acceptable | Blocked until scheduled 24-hour exact / 30-day rounded cleanup is deployed and verified |
| Signed-device lifecycle | Existing server contract is ready; Keychain behavior is a required spike proof | P1 per-token revocation remains, but current proof does not block the spike |
| Deployed parity / live authorization | Migration and active-function inventories were checked 2026-06-24 | Live security suite remains blocked without temporary service-role credential |
