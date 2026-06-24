# LineUp Native Location Services Specification

## Decision

Swift uses **Core Location**, not `navigator.geolocation`. Location is optional. Swift v1 requests **When In Use** authorization only and must remain functional when authorization is denied, restricted, unavailable, or reduced accuracy. Background location and passive geofencing are deferred.

## User Value And Education

Explain before the system prompt:

> Location helps improve nearby venue reads, verify check-ins and reports, and keep campus results relevant. It is optional, and you can browse by campus without it.

Only an explicit Enable Location action may trigger the system prompt. A LineUp button tap is not permission truth. Core Location authorization and an actual location callback are authoritative.

Recommended purpose string:

> LineUp uses your location while the app is open to show nearby venues and improve aggregate crowd accuracy. You can use LineUp without location by selecting your campus manually.

## Required States

- not determined;
- authorized When In Use, full accuracy;
- authorized When In Use, reduced accuracy;
- denied;
- restricted;
- services unavailable;
- request timeout/location failure.

Preferences should offer system Settings when denied/restricted and education when not determined. Never display Enabled from a saved profile preference alone.

## Manual Fallback

- University of Arizona remains selectable without location.
- University/Downtown area selection remains available.
- Live, Deals, venue detail, favorites, profile, legal, and unverified report submission remain functional.
- Directions may open Maps using venue coordinates without reading user location.

## Native Event Types

### `presence`

- **When:** app foreground/resume after authorization and only at a reviewed cadence.
- **Purpose:** nearest-area context and aggregate demand support.
- **Payload:** `action`, optional `venue_id`, latitude, longitude, horizontal accuracy, visibility/profile display context, signed-device proof.
- **Response:** nearest venue/name/distance, area, accuracy, verified-near-venue.

### `check_in`

- **When:** explicit user action.
- **Purpose:** verify proximity and create a higher-confidence input/reward source.
- **Response:** target venue, verification, distance/accuracy, check-in row.

### `report`

- **When:** explicit report submit.
- **Purpose:** add structured report; location improves verification.
- **Fallback:** submit without coordinates through the same server function.

Current backend contract: `supabase/functions/location-ingest/index.ts`; client reference: `src/services/locationService.js` and `src/main.js`.

## Verification Rules

Current server logic:

- active venue coordinates are loaded server-side;
- usable accuracy is at most 100 meters;
- verification radius is 75 meters, expanded to `accuracy + 25` when larger;
- report/check-in/presence actions have separate rate limits;
- signed-device proof and authenticated account are mandatory;
- server calculates distance and verification. Swift must not claim verification itself.

## Privacy Boundaries

- No individual location is public.
- Venue staff receive aggregate analytics/interest, not raw location rows.
- Owner-only operational access must remain audited and minimized.
- Never place coordinates in student analytics metadata.
- Never show a public user dot or exact location history.
- Do not use location for paid placement or crowd manipulation.
- Remove image EXIF location metadata before avatar upload where applicable.

## Retention And Backend Gap

`presence_snapshots` currently stores rounded and exact coordinates (`lat_rounded`, `lng_rounded`, `lat_exact`, `lng_exact`). Account deletion clears user/device-linked presence, but the repository does not define a routine retention/expiry job for ordinary presence rows.

Before the full Swift rebuild:

1. approve a retention period for exact, rounded, and derived presence data;
2. add reviewed automated deletion/aggregation;
3. document owner access and incident handling;
4. decide whether exact coordinates are required after server distance verification;
5. update Privacy Label and policy copy to match actual retention.

This is **P0 for full native launch**, though the existing endpoint is sufficient for a controlled feasibility spike using disposable test data.

## Sampling Guidance

- V1 default: explicit check-in/report samples plus restrained foreground refresh.
- Do not request Always authorization.
- Do not start significant-change monitoring, region monitoring, background tasks, or continuous background updates.
- Stop updates when the app is not active.
- Avoid resending when movement/time thresholds do not justify it.
- Respect reduced accuracy; never label it precise verification unless server rules pass.

## Backend Readiness

Ready now:

- authenticated signed-device ingest;
- server-side venue distance/verification;
- separate presence/check-in/report responses;
- rate limits;
- account deletion cleanup;
- owner-only RLS for raw rows.

Needs work:

- retention/aggregation policy;
- native sampling contract and telemetry budget;
- deployed-contract parity verification during spike;
- App Store privacy answers after final implementation.

## Swift Must Not

- Port browser permission queries or `watchPosition`.
- Prompt before education or loop prompts after denial.
- Treat profile preferences as authorization.
- require location for browsing or reporting;
- request background/Always access in v1;
- expose individual locations to venues or users;
- cache coordinates as durable product truth;
- calculate “verified” solely on device;
- send coordinates through generic analytics.
