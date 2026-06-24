# LineUp Swift V1 Scope

## Product Goal

Deliver a fully native SwiftUI student app that preserves LineUp’s honest Live/Deals decision loop and existing Supabase security boundaries. The feasibility spike in `docs/swift-feasibility-spike-plan.md` must pass before the full project begins.

## In Swift V1

- Supabase Swift email/password auth, secure session restoration, refresh, and logout.
- Native account setup and Arizona Early Access join/status.
- Guided notification and location education with real native authorization state.
- Live venue list with University/Downtown area selection, freshness, low-data states, favorites-first behavior, and recent venue hydration.
- Deals list containing only active current deals and honest empty/error states.
- Venue detail with Live/Deals and conditional current-night Events.
- Current-night structured reports feed and report submission.
- Current-night 5 AM America/Phoenix boundary.
- Favorites/saved venues through `account-sync`.
- Profile, edit profile, public/anonymous mode, Account, sign-out.
- Profile photo selection/crop/compression **only after** the production storage contract is approved; otherwise launch with optional photo temporarily disabled rather than copy the base64 workaround.
- In-app account deletion.
- Privacy, Terms, Support.
- Optional foreground Core Location for presence/check-in/report verification, after retention rules are approved.
- Optional notification permission and APNs token sync only after the P0 push endpoint exists.
- Native pull-to-refresh concept using `.refreshable`.
- Low-data, partial-data, network-error, and offline/stale states.
- Map/directions only if the spike confirms the chosen native map framework and venue coordinate behavior without delaying core Live/Deals delivery.

## Not In Swift V1 Unless Explicitly Approved

- Owner billing, Stripe, IAP, subscriptions, paid boosts, or external purchase flows.
- Native venue subscriptions or sales tooling.
- Background location, Always authorization, passive geofence truth, or proximity campaigns.
- Public comments, chat, free-form reports, public photo feeds, or social timelines.
- Complex rewards economy or native redemption operations. Existing rewards may remain visible only if product scope confirms value and backend behavior is verified.
- Full owner/admin console, staff-code flows, advanced owner analytics, or BestTime import tools.
- Multi-campus backend expansion beyond the planned/manual campus fallback.
- Dark mode; current canonical design is Clean Blue Light Mode.
- watchOS, widgets, Live Activities, App Clips, CarPlay, or Siri integrations.
- Offline mutation queues that can falsely imply a report/status/deal was accepted.
- Any WebView, Capacitor, or PWA shell.

## Owner / Staff Decision: A — Keep Web-Only For V1

Recommendation: retain existing owner/staff controls in the secured web operations surface while the native app serves students only.

Reasons:

1. Student Live/Deals/reporting is the product’s core adoption loop.
2. Privileged screens expand threat modeling, QA accounts, App Review explanation, and cross-venue authorization risk.
3. Existing web tools already call `owner-dashboard`, `owner-actions`, `venue-status-ingest`, RLS-governed deal writes, and aggregate performance RPCs.
4. A later operations app/module can be designed for staff workflows rather than exposing hidden admin affordances in the student binary.

Native v1 must still handle an unauthorized privileged deep link safely, but it should not render Control navigation.

## Launch Gates

Before full implementation:

- Swift feasibility spike passes all required calls.
- Native auth callback/confirmation paths are configured.
- Device session is stable across relaunch and Keychain restoration.
- Precise-location retention/sampling is approved.
- Profile photo storage is production-safe or photos are deferred.
- APNs token sync exists or notification request/delivery is deferred honestly.
- Deployed functions/migrations match repository source.
- Disposable non-admin reviewer account and App Store metadata are prepared.

## Never-Copy Boundaries

- No `localStorage` truth model; use Keychain for credentials and replaceable caches for reads.
- No browser Notification/Permissions/geolocation APIs.
- No service-worker/manifest/install strategy.
- No bundled seed venue status as live data.
- No client-only role checks.
- No optimistic crowd, report, venue, deal, owner, staff, or permission truth.
- No paid influence over crowd status or confidence.
