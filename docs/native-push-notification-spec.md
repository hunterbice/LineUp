# LineUp Native Push Notification Specification

## Decision

Swift uses **Apple Push Notification service (APNs)** through native iOS APIs. Browser notifications and `Notification.requestPermission` are web-reference behavior only. Notifications are optional, and every core screen works without them.

There is currently no APNs token schema or sync endpoint. Push delivery must not be advertised as functional until that backend contract is implemented, deployed, and tested.

## Permission Journey

1. Complete core account setup.
2. Show a short LineUp education screen explaining useful categories.
3. User taps Enable Notifications or Not Now.
4. Only Enable invokes `UNUserNotificationCenter.requestAuthorization`.
5. Display the actual system result; a LineUp tap is never equivalent to grant.
6. Continue to Location education regardless of result.

Suggested purpose copy:

> Get updates for saved venues, new deals, launch news, and important LineUp alerts. Notifications are optional.

## Native Authorization States

Support notDetermined, denied, authorized, provisional, and ephemeral where available. Preferences should link to system Settings when denied. Local education progress may prevent repetitive education but must not become permission truth.

## APNs Token Contract — Missing P0 For Delivery

No implementation exists. The names and shapes in this section are a review contract, not callable backend. Create a reviewed authenticated, signed-device Edge Function before enabling push.

Suggested actions:

- `register`: `{device_id,session_id,device_token,apns_token,environment:"sandbox"|"production",bundle_id,app_version,locale,enabled_categories}`
- `update_preferences`: same actor proof plus category set.
- `unregister`: signed-device proof plus APNs token/installation binding.

Suggested response:

```json
{"ok":true,"registered":true,"updated_at":"ISO-8601"}
```

Required server behavior:

- JWT user derives ownership; caller cannot choose another user.
- Signed-device proof binds the installation.
- APNs token is unique and rotated/upserted safely.
- Environment and bundle ID are validated.
- Old tokens are invalidated on APNs feedback, logout, reinstall/rotation, and account deletion.
- Venue staff cannot read tokens or individual subscriptions.
- Rate limits and audit-safe errors apply.
- Service-role credentials and APNs signing keys remain server-only.
- Account deletion must remove token rows before deleting the auth user; ordinary logout must revoke the account/installation association even if the client cannot reach the server later.
- RLS/grants must deny student/venue reads and direct client mutation. Only the reviewed server function may write token rows.
- Raw APNs tokens must not be returned by owner dashboards, analytics, exports, or logs.

### Required backend shape before implementation

Use a private/server-only token record, not a browser-readable public table. The reviewed migration must provide at least:

- `id` UUID primary key;
- `user_id` referencing `auth.users` with account-deletion cleanup;
- LineUp `device_id` and a server-validated installation binding;
- `platform = 'ios'`;
- `environment = 'sandbox' | 'production'`;
- exact `bundle_id`;
- server-private APNs token material needed for delivery;
- deterministic `token_hash` for uniqueness/dedupe and optional `token_last4` for redacted support;
- `enabled` and allowlisted notification categories;
- `last_seen_at`, `revoked_at`, `created_at`, and `updated_at`.

A hash alone cannot send a notification. The raw token must therefore live only in a private/server-access path with provider encryption at rest and least-privilege access. The architecture review must choose that storage mechanism before the migration is written.

The future `push-token-sync` function must:

- validate the Supabase JWT and current signed-device proof;
- derive `user_id` from JWT and reject a caller-supplied user ID;
- bind environment and bundle ID to a server allowlist;
- validate token format/length and never log it;
- upsert/rotate by token hash plus installation;
- revoke this binding on `unregister` without affecting another user's token;
- rate-limit and audit only redacted metadata;
- expose no token read action to students, venues, owner dashboards, or analytics.

This is an exact implementation contract, not evidence that `user_push_tokens` or `push-token-sync` exists.

## Token Lifecycle

1. Register for remote notifications only after authorization.
2. Receive token from `didRegisterForRemoteNotificationsWithDeviceToken`.
3. Convert and sync through the reviewed endpoint.
4. Resync on app launch after account/device session is restored, token change, preference change, and app version/environment change.
5. On logout, unregister this account/installation association before clearing Keychain when reachable; server expiry must handle offline logout.
6. On account deletion, remove token rows as part of self-delete.
7. Never assume an APNs token is permanent or equal to a user ID.

## Preference Categories

Candidate v1 opt-ins:

- saved venue updates;
- new active deals for saved venues;
- Arizona launch/important service announcements;
- account/security notices where legally appropriate.

Deferred:

- proximity-triggered alerts;
- high-frequency crowd-change alerts;
- friend/social alerts;
- rewards marketing;
- venue-paid targeting;
- background-location-triggered notifications.

## Anti-Spam Rules

- Default to conservative frequency caps and quiet hours.
- Dedupe by venue/deal/event and notification window.
- Expired deals/events must never send.
- Paid promotion must be labeled and must not imply crowd truth.
- Users can disable categories or all notifications.
- Do not send alcohol-purchase or excessive-drinking prompts.
- Record delivery intent/aggregate outcomes without exposing individual identity to venues.

## Current Web Equivalent

- Education/status: `src/controllers/permissionController.js`, `src/ui/renderShell.js`, `src/ui/renderProfile.js`.
- Profile fields `notification_pref` and `location_pref` record preference/history but are not system truth.
- No server push sender, APNs key integration, device-token table, or delivery scheduler exists.

## Readiness Priorities

- **P0:** native authorization/status flow; APNs registration schema/function; token lifecycle; deletion/logout cleanup; server secret/storage plan.
- **P1:** category preferences, saved-venue targeting, frequency/dedupe rules, delivery observability, test sandbox.
- **P2:** advanced segmentation, proximity campaigns, richer analytics, promotional products.

### Swift feasibility spike

- Native notification education and real authorization status may be tested.
- APNs sandbox token acquisition may be tested and recorded only in redacted evidence.
- The token must not be sent to a nonexistent LineUp endpoint or inserted directly into Supabase.
- This limitation does **not** block the controlled spike.

### Full Swift rebuild

Push delivery remains blocked until schema, Edge Function, RLS/grants, logout/deletion cleanup, environment validation, APNs provider integration, and live negative tests are implemented and deployed. Swift v1 may omit push entirely; if omitted, the UI and App Store metadata must not promise delivery.

## App Store And Privacy Guidance

- Explain direct user value before prompting.
- Do not require permission for app use.
- Privacy disclosures must cover device token, user association, preferences, and delivery analytics.
- Do not call APNs registration “tracking.” Do not use push tokens for cross-app tracking.
- Review notification content for nightlife/alcohol age-rating risk.

## Swift Must Not

- Port browser Notification APIs.
- Treat a custom button tap or stored preference as authorization.
- invent an APNs endpoint or table;
- store APNs signing credentials in the app;
- expose raw tokens to venue staff;
- send notifications from the client;
- enable paid venue alerts that imply Live status;
- request permission at first launch without education.
