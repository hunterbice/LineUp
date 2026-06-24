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

## APNs Token Contract — Missing P0

Create a reviewed authenticated, signed-device Edge Function before enabling push.

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

Swift v1 may ship permission education without requesting authorization only if the UI clearly says push is unavailable, but the preferred plan is to complete P0 before enabling the button.

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
