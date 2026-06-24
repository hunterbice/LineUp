# LineUp Native Screen And State Inventory

This inventory translates v75 behavior into SwiftUI requirements. “Web equivalent” identifies evidence, not an architecture to port.

## Shared State Rules

- Backend models: auth session, profile, favorites, permissions, venues/status, deals, reports, early access, rewards, roles, owner data.
- Local UI only: selected tab/area, navigation path, active sheet, draft report, permission-education completion, recent venue IDs/timestamps, transient image crop.
- Replaceable read cache may improve startup but must retain timestamps and yield to server responses.
- Every screen needs loading, empty, error, low-data/offline, and accessibility behavior where applicable.

## Student Screens

### Splash / Launch

- **Swift v1:** yes. **Web:** splash in `index.html`/`main.js`.
- **Purpose/data:** brand while restoring Supabase session, signed-device session, profile, Live and Deals.
- **States:** fast launch, signed-out, signed-in/setup incomplete, backend unavailable.
- **Navigation:** route to Auth, Setup, permission education, or Live.
- **Swift notes:** native launch assets and short in-app loading state; never wait indefinitely. Do not copy service-worker boot or DOM splash timers.

### Auth / Register / Login

- **Swift v1:** yes. **Web:** `renderAccountGateHtml`, `submitEmailAuth`.
- **Data/actions:** email, password, optional registration display name; sign up/sign in; password visibility.
- **States:** idle, submitting, email confirmation required, invalid credentials, rate/network failure.
- **Offline:** explain connection requirement; no fake signed-in session.
- **Source:** Supabase Auth only. **Do not copy:** browser autofill/event rerender patterns.

### Setup

- **Swift v1:** yes. **Web:** `renderSetupGateHtml`, `saveSetup`.
- **Data/actions:** campus, display name, optional avatar, public/anonymous mode, Join Early Access.
- **States:** loaded profile defaults, validation, saving, error.
- **Navigation:** Auth/launch → Setup → Notification Education.
- **Source:** `account-sync` then `early-access`; server confirmation required. No direct permission buttons.

### Notification Education

- **Swift v1:** yes. **Web:** `renderPermissionEducationHtml`, `permissionController`.
- **Data/actions:** explanatory copy, Enable Notifications, Not Now.
- **States:** not determined, requesting, granted, denied, unavailable/error.
- **Navigation:** Setup/Preferences → Location Education or back to Preferences.
- **Source:** system authorization status; local education completion only. **Do not copy:** browser Notification API.

### Location Education

- **Swift v1:** yes. **Web:** same renderer/controller.
- **Data/actions:** optional foreground rationale, Enable Location, Not Now.
- **States:** notDetermined, authorized full/reduced accuracy, denied, restricted, unavailable, timeout.
- **Navigation:** after Notifications → Live; Preferences review may return to Profile.
- **Source:** Core Location. Manual campus path always remains.

### Early Access Confirmation

- **Swift v1:** yes while launch mode exists. **Web:** join transition and dashboard Early Access banner.
- **Purpose/data:** confirm backend join/campus, not a dead launch wall.
- **States:** joining, joined, failed/retry.
- **Navigation:** Setup completion → permissions; dashboard reflects joined state.
- **Do not copy:** decorative web splash overlay as business state.

### Live

- **Swift v1:** yes. **Web:** `renderDashboard.js`, `renderLive`.
- **Data:** `active_venue_status`, favorites, recent IDs, primary active deal badges, area.
- **Actions/navigation:** area switch, favorite, detail, report, pull refresh; bottom tabs.
- **Loading:** venue-card skeletons. **Empty:** no current venues. **Error/offline:** unavailable message; cached rows only with stale context.
- **Low data:** typical-pattern/needs-fresh-reports language.
- **Source:** backend venue rows; cache cannot override status.
- **Swift notes:** `ScrollView`/lazy stack and `.refreshable`; do not copy DOM cards or bundled seed truth.

### Deals

- **Swift v1:** yes. **Web:** `renderDealsPage.js`.
- **Data:** active current deals joined to current venues.
- **Actions/navigation:** tap deal → venue detail with Deals active; best-effort analytics.
- **States:** skeleton, “No active deals right now,” network failure, active cards, ending/ends-soon.
- **Source:** `venue_deals` active window; Promoted is explicit. Do not show venues without a deal.

### Venue Detail Shell

- **Swift v1:** yes. **Web:** `renderBarDetail.js`, `barDetailController.js`.
- **Data:** selected venue, favorite, active deals, current-night reports, current event.
- **Actions:** back, favorite, directions, check-in, report, launch-deal request.
- **Entry:** Live defaults Live; Deals defaults Deals; map/recent/favorite defaults Live.
- **States:** loading composition, unavailable venue, partial section failure.
- **Do not copy:** overlay/detail-stage swipe implementation or inline HTML handlers.

### Venue Detail — Live

- **Swift v1:** yes.
- **Data:** crowd, wait, range, confidence/freshness, report count, sources, current-night reports.
- **States:** staff-confirmed, verified nearby, recent signals, historical pattern, low recent data, unavailable.
- **Empty:** “No recent reports tonight.”
- **Truth:** no redundant decision strip; no optimistic status after report.

### Venue Detail — Deals

- **Swift v1:** yes.
- **Data:** current active deals for selected venue.
- **States:** cards or honest no-deals state.
- **Navigation:** retained as active when opened from Deals.
- **Truth:** promotion never affects Live.

### Venue Detail — Events

- **Swift v1:** yes only when real current-night event exists.
- **Data:** `active_venue_status.event` after backend 5 AM filter.
- **States:** tab absent when null; if event disappears while selected, return to Live.
- **Do not copy:** seed/default event strings.

### Report Flow

- **Swift v1:** yes. **Web:** `renderReportSheet.js`, `reportController.js`, `submitReport`.
- **Data/actions:** venue, crowd choice, wait preset/input, supported cover fields, submit/cancel.
- **Permission:** location may improve verification but is optional.
- **States:** draft, submitting, verified success, unverified success, rate/validation/network failure.
- **Source:** `location-ingest`; on success refresh feed then Live. No free-form text/photo/public UGC.

### Favorites / Your Spots / Recently Checked

- **Swift v1:** yes. **Web:** `retentionController.js`, `renderRetentionDashboard`.
- **Data:** server favorites; local recent venue IDs/timestamps hydrated from current venue rows.
- **States:** empty education, hydrated rows, removed venue ignored.
- **Truth:** recents contain no status/deal/report payload.

### Profile

- **Swift v1:** yes. **Web:** `renderProfile.js`.
- **Data/actions:** identity, Early Access, edit profile, favorites, preferences, rewards summary if retained, legal/support, Account.
- **States:** loading profile, missing optional values, network error.
- **Source:** `account-sync` and optional reward summary. No giant initial avatar for anonymous users.

### Edit Profile

- **Swift v1:** yes.
- **Data/actions:** display name, public/anonymous mode, avatar editor.
- **States:** editing, saving, saved, failure/rollback.
- **Source:** `account-sync update_profile`; system/public display follows returned profile.

### Profile Photo Crop

- **Swift v1:** conditional on photo-storage hardening. **Web:** `renderProfilePhoto.js`, `profilePhotoController.js`.
- **Data/actions:** PhotosPicker/camera image, circular crop, drag/reposition, remove/cancel/save.
- **States:** loading/decoding, crop, compress/upload, unsupported format, failure.
- **Swift notes:** use PhotosPicker and image renderer; remove EXIF/location metadata; upload compressed result to approved storage. Do not copy canvas or base64 as production design.

### Account

- **Swift v1:** yes.
- **Actions:** sign out, delete account; account identity context.
- **States:** signed in, signing out, deletion confirmation/submitting/error.
- **Source:** Supabase Auth and `account-sync`; no local account authority.

### Permission Settings / Status

- **Swift v1:** yes.
- **Data/actions:** actual notification/location authorization; open system settings where denied; review education where not determined.
- **States:** system-specific statuses, not confirmed/unavailable.
- **Do not copy:** stored `notification_pref`/`location_pref` as permission truth.

### Delete Account

- **Swift v1:** yes.
- **Action:** destructive confirmation then signed-device self-delete.
- **States:** confirmation, deleting, success/sign-out, error/retry.
- **Source:** `account-sync delete_account`; never accept another user ID.

### Privacy / Terms / Support

- **Swift v1:** yes.
- **Data:** reviewed bundled/versioned content or HTTPS legal pages.
- **Actions:** contact support, open links/mail.
- **States:** content, load error/offline copy.

### Low-Data State

- **Swift v1:** yes, cross-screen state.
- **Copy:** Low recent data; Showing typical pattern; Needs fresh reports.
- **Truth:** historical priors may fill a read but are not “live.” No fake counts.

### Offline State

- **Swift v1:** yes.
- **Behavior:** retain last replaceable read with timestamps where safe; show offline/stale context; allow retry; disable mutations until reachable.
- **Do not copy:** service-worker cache semantics or web offline page.

## Privileged Screens

### Unauthorized Owner / Staff

- **Swift v1:** no privileged navigation; denial handling still required if a route/deep link is attempted.
- **State:** generic access denied, no leaked role/venue data.
- **Source:** backend denial, not hidden-tab logic.

### Owner / Staff Dashboard

- **Swift v1:** later; web-only recommendation. **Web:** `renderOwnerDashboard.js`, `renderVenueControls.js`.
- **Data/actions:** role-scoped venues, status, reports/check-ins/signals, audit/operations.
- **Source:** `owner-dashboard`, `owner-actions`, `venue-status-ingest`.
- **Do not copy:** web hidden-entry patterns. A later native ops app/module needs separate threat modeling.

### Owner Deal Editor

- **Swift v1:** later/web-only.
- **Data/actions:** active deal CRUD and promotion fields under RLS/plan rules.
- **Source:** `venue_deals`; never mutate Live truth.

### Deal Performance Analytics

- **Swift v1:** later/web-only.
- **Data:** aggregate impressions/taps/detail/report/favorite metrics.
- **Source:** venue-scoped `venue_deal_performance`; no raw user/device/location rows.
