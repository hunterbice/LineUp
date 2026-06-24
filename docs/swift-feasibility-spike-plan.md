# LineUp Swift Feasibility Spike Plan

## Purpose

Build a disposable, minimal SwiftUI proof project later. It is not the production app, does not establish visual architecture, and must not enter this repository until a task explicitly starts native work.

Recommended timebox: **5–8 focused engineering days**, followed by a go/no-go review. Stop early on a P0 contract failure rather than hiding it behind fixtures.

Use `docs/swift-feasibility-spike-preflight.md` as the execution runbook. This plan defines scope; the preflight defines callback, Keychain, contract order, negative tests, and evidence.

## Goals

Prove on simulator and one physical iPhone:

1. Supabase Swift email/password registration, confirmation/deep link if enabled, login, refresh after relaunch, and logout.
2. Keychain-backed Supabase session handling and exact custom-scheme callback proof.
3. `device-session` issuance, renewal, invalid-token denial, and installation-ID persistence.
4. `account-sync claim` profile/favorites/permissions fetch.
5. `account-sync update_profile` without avatar first.
6. `early-access status` and `join`.
7. direct read of `active_venue_status` with the exact selected fields in `src/config.js`.
8. active `venue_deals` read and local active-window filtering parity.
9. venue detail composition from venue, deal, and report responses.
10. `reports-feed` fetch.
11. one structured unverified report via `location-ingest` and one foreground-location report/check-in using Core Location.
12. post-report feed refresh followed by Live refresh.
13. optional profile photo path: omit it or test current compressed data-URL compatibility; do not invent a Storage path.
14. optional APNs authorization and sandbox token acquisition; no LineUp token sync endpoint exists.
15. `account-sync delete_account` with a disposable self-only account.

## Non-Goals

- Production visual design or final navigation architecture.
- Owner/staff screens.
- Payments, rewards economy, subscriptions, analytics dashboards, background location, chat, comments, or public photos.
- Full offline synchronization.
- Shipping to TestFlight/App Store.
- Replacing or bypassing existing Edge Functions/RLS.
- Building APNs delivery, profile-photo Storage, location cleanup, or a production app architecture inside the spike.

## Proof App Shape

- One small SwiftUI app target in a disposable branch/repository.
- Screens: auth, contract-test menu, venue list, venue detail, report form, profile/delete.
- Services: `AuthStore`, `DeviceSessionProvider`, `LineUpAPI`, `VenueRepository`, `ReportRepository`.
- Models generated/handwritten only from `docs/native-api-contract.md` and actual JSON captured from disposable calls.
- Structured logs redact JWTs, device tokens, email, avatar payload, and coordinates.

## Success Criteria

- No invented endpoint, table, RPC, role, or response field.
- Session and signed-device token survive relaunch securely.
- Confirmation-required signup routes through the one allowlisted disposable callback, if enabled in the test project.
- Invalid JWT, mismatched device proof, cross-user, and unauthenticated paths fail as expected.
- Live and Deals decode production-shaped responses without fixtures.
- Report receives a server report ID; UI does not mutate status until refresh.
- 5 AM America/Phoenix filtering matches web/backend tests around 4:59/5:00 and after midnight.
- Core Location denial still permits manual campus browsing and unverified report submission.
- Account deletion removes only the disposable current user and clears Keychain.
- Ordinary logout clears account state without turning cached roles into authority; confirmed account deletion also clears the installation tuple.
- The spike produces a contract-gap report and updated canonical docs.

## Test Accounts And Data

- Disposable ordinary student accounts only; never owner/staff credentials in the app.
- One active test venue and valid current deal/report fixtures created through approved backend/admin paths, not direct production fabrication.
- A disposable bundle ID and one exact `<bundle-id>://auth/callback` allowlist entry.
- Separate sandbox APNs environment only if token acquisition is included.
- Explicit approval before writing production rows; prefer a non-production Supabase project or clearly tagged disposable records.
- Service-role key remains outside the app and is used only by controlled test tooling.

## Required Test Matrix

- Fresh signup, confirmation-required signup, login, wrong password, expired refresh, logout.
- First device issuance, renewal, corrupted token, reinstall/new installation ID.
- No location, denied location, reduced accuracy, valid foreground coordinate, timeout.
- Empty Live, low-data Live, active deal, expired deal, no reports, current-night report.
- Online, transient network failure, partial detail failure, app relaunch.
- Self-delete success and cross-user target ignored/denied.

## Risks To Resolve

- Native auth redirect URLs are absent from `supabase/config.toml`; the spike must add one exact disposable callback after selecting its bundle ID.
- APNs token sync is missing; token acquisition may be tested, delivery may not.
- Profile avatar uses a compressed data URL instead of object storage; compatibility is not production approval.
- Exact/rounded presence cleanup is not deployed; the target maximums are 24 hours exact and 30 days rounded.
- Signed-device server proof is ready, but Keychain/reinstall/logout/deletion semantics need device evidence.
- Supabase Realtime behavior, reconnect, and battery impact need measurement.
- Priority 18 matched 43 linked migration versions and found all 14 repository functions active, but function source parity/live authorization still may drift.

## Spike Blocking Versus Full-Rebuild Blocking

| Gap | Blocks spike | Blocks full rebuild |
| --- | --- | --- |
| Production auth callback not approved | No; use one disposable callback | Yes |
| APNs sync absent | No; omit push or test acquisition only | Yes if push delivery remains in scope |
| Object-storage avatar absent | No; omit or compatibility-test | Yes if photo remains in scope |
| Routine location cleanup absent | No; use disposable foreground data and delete account | Yes |
| Keychain device lifecycle unproven | It is the spike proof, not a pre-spike blocker | Yes if the proof fails |
| Live security smoke credential unavailable | No for a disposable integration proof | Yes for security signoff |

## Full Rebuild Blockers

Do not start the full Swift project if any remain:

1. auth signup/confirmation/session restore fails on device;
2. signed-device contract cannot be safely persisted/renewed;
3. report submission cannot reproduce backend-confirmed refresh order;
4. location retention/foreground scope is not approved;
5. account deletion fails or can target another account;
6. production response shapes differ materially from documented contracts;
7. profile photo remains in scope without a safe storage decision;
8. push remains promised without an APNs backend contract.

## Exit Deliverables

- pass/fail evidence for each goal;
- redacted request/response samples;
- updated API contract with confirmed optional/null fields;
- deployment parity record;
- auth/deep-link configuration record;
- location/privacy decision;
- photo-storage decision;
- push decision;
- recommendation to begin, narrow, or block the full rebuild.

The first task is: select the disposable bundle identifier, create its exact callback allowlist entry in the test Supabase project, then execute auth/session Goal 1 before adding any other screen.
