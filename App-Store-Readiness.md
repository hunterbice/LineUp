# LineUp PWA and App Store Readiness

## Current Mobile Install State

LineUp is currently a mobile-first PWA. It has:

- Web app manifest with standalone display.
- iOS home-screen metadata.
- Apple touch icon.
- App icons at 32, 180, 192, 512, and maskable 512 sizes.
- Service worker shell caching.
- Offline fallback page.
- Install prompt flow for mobile browsers.
- Shortcut URLs for Live, Map, and Pulse.

## What Changed In Priority 6

- The install prompt no longer marks iOS install complete when the user only taps continue.
- The app now listens for the real `appinstalled` event when supported.
- Manifest now includes richer description, launch handling, display override, favicon entry, and app shortcuts.
- Shortcut URLs can open directly into Map or Pulse through the `page` query parameter.
- Service worker cache moved to `lineup-pwa-v51`.
- Service worker now avoids caching unrelated cross-origin API responses.
- Offline page now uses LineUp wordmark branding instead of a plain letter mark.
- Added `scripts/pwa-smoke.mjs` for repeatable install-readiness checks.

## Before Public PWA Launch

- Host only on the production domain: `https://get-lineup.app`.
- Confirm HTTPS is active and redirects from HTTP to HTTPS.
- Confirm Mapbox token has production domain restrictions.
- Confirm Supabase allowed origins include only production and approved local development origins.
- Run `node scripts/pwa-smoke.mjs`.
- Test install on:
  - iPhone Safari.
  - Android Chrome.
  - Desktop Chrome.
  - Installed PWA mode.
- Clear old service worker/cache after major UI releases if stale shells appear.

## App Store Path

For the App Store, LineUp should move from pure PWA to a native shell after the backend stabilizes.

Recommended path:

1. Keep the web app as the source of truth.
2. Move from single-file HTML to Vite + TypeScript.
3. Add Capacitor for iOS and Android wrappers.
4. Keep Supabase and Mapbox integrations in the web layer.
5. Add native permissions copy for location.
6. Add native push notifications only after account/auth flows are production-ready.
7. Submit iOS through Apple Developer Program and Android through Google Play Console.

## Native Permission Copy

Location permission:

LineUp uses your location while the app is open to verify nearby reports, check-ins, and venue proximity. LineUp does not show your identity publicly and does not store a public movement trail.

Notifications:

LineUp can send nightlife alerts for saved venues, rewards, nearby check-ins, and major crowd changes.

## Remaining Gaps

- No native iOS/Android wrapper yet.
- No Sign in with Apple yet.
- No push notification backend yet.
- No public privacy policy or terms page yet.
- No app-store screenshots sized for Apple/Google submission yet.
- No automated mobile visual regression tests yet.
