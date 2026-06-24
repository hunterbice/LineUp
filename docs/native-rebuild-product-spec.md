# LineUp Native Rebuild Product Specification

Canonical baseline: web v75 at commit `2a1ed10`  
Tagline: **Know Before You Go**

## Purpose And Promise

LineUp is a campus nightlife decision utility. It helps a student answer: **Where should we go right now?** The core promise is honest, current venue context before a group spends time walking, traveling, or waiting.

LineUp combines backend-confirmed venue status, line estimates, confidence/freshness, current deals, structured user reports, verified proximity signals, and historical priors. Sparse data must look sparse. Typical patterns may support a low-data state but must never be presented as live observation.

## Users

- **Student:** browses venues and deals, favorites places, submits structured reports, controls public/anonymous attribution, and manages their account.
- **Venue staff:** publishes venue-scoped live updates and deals through authorized tools. Recommended web-only for native v1.
- **LineUp owner/operator:** operates venues, access, audit, and aggregate analytics. Web-only for native v1.
- **App reviewer/support:** tests the student journey without privileged access.

## Student Journey

1. Register or sign in with email/password.
2. Complete lightweight setup: University of Arizona, display name, optional profile photo, and public/anonymous mode.
3. Join Arizona Early Access.
4. See notification education, then the real optional system prompt only after opting in.
5. See location education, then the real optional system prompt only after opting in.
6. Enter Live. Notifications and location may both be declined without reducing core browsing access.
7. Browse Live or Deals, open venue detail, favorite a venue, report a structured crowd/wait read, or request a launch deal.
8. Manage profile, permission guidance, legal/support, sign-out, and account deletion.

## Early Access And Launch Modes

### Early Access

- Campus is University of Arizona with manual University/Downtown browsing.
- Users can join, save venues, request aggregate launch-deal interest, browse active deals, and inspect honest low-data venue states.
- Do not claim a fresh live read when only a historical prior exists.

### Live Launch

- The same screens remain; fresher venue, verified report, check-in, and presence signals improve the read.
- Launch mode is a data condition, not a separate fake dataset or client-side switch.

## Setup And Permissions

- Setup contains campus, display name, photo, identity mode, and Early Access action.
- Notification and location education are dedicated optional steps after setup.
- Education completion is harmless UI progress; it is not system-permission truth.
- System APIs are authoritative for permission result.
- The app remains usable through manual campus/area selection.
- Native Swift must use `UNUserNotificationCenter` and Core Location rather than copying browser APIs.

## Live

Live is status-first. Each card prioritizes:

1. venue identity and area;
2. crowd bucket and direction/momentum;
3. line estimate and likely fullness band;
4. freshness/confidence language;
5. favorite, detail, and report actions;
6. a small deal indicator only when a real active deal exists.

Favorites appear as “Your spots”; recent venues are hydrated from current backend venue rows. The rest appear under nearby/all spots. No stale cached status may replace backend state.

## Deals

Deals shows only rows that are active, started, not expired, and attached to a current venue. Cards are deal-first: title, venue, description, time window, honest ending cue, and explicit “Promoted” label where applicable. Tapping opens the venue detail Deals tab. Deals and paid placement never influence live crowd truth.

## Venue Detail

The detail hierarchy is:

1. venue identity, address, favorite, hours, and last call;
2. main status hero with crowd, line, likely fullness, and freshness;
3. optional launch-deal request;
4. centered Live and Deals tabs; Events appears only for an explicit current-night event;
5. Live Activity metrics and current-night structured reports;
6. actions: directions, check-in, report.

Opening from Live defaults to Live. Opening from Deals activates Deals. The removed redundant decision-summary strip must not return.

## Reports And Current-Night Logic

- Reports are structured: crowd bucket and wait, with optional cover fields where currently supported.
- No public note, comment, chat, or report photo is part of Swift v1.
- Submission goes through `location-ingest`; location-backed and unverified account reports use the same server boundary.
- The client waits for backend success, refreshes `reports-feed`, then refreshes `active_venue_status`.
- The nightlife day begins at **5:00 AM America/Phoenix**. Reports after midnight remain part of the prior outing. Historical rows remain for analytics, abuse prevention, and model work but do not render as tonight.
- Events require a current `event_updated_at` in the same 5 AM nightlife window.

## Profile And Account

- Profile presents the current account identity, favorites, permission guidance, rewards summary if retained, legal/support, and Account.
- Public mode may show display name and avatar on structured reports. Anonymous mode renders “Anonymous User”; backend linkage remains for moderation and abuse controls.
- Logout belongs in Account, not the profile landing page.
- Account deletion is initiated in-app and calls the authenticated, signed-device self-delete action. A caller cannot select another user.

## Profile Photo

- Circular placeholder/photo with camera edit affordance.
- Source sheet: Take Photo, Choose from Library, conditional Remove, Cancel.
- Circular crop/position step before save.
- Web v75 saves a compressed 512px JPEG data URL through `account-sync`.
- Swift should use `PhotosPicker`, crop/position, compression, and ultimately a server-approved object-storage URL. Base64-in-profile is a feasibility fallback, not the preferred production native contract.

## Privacy, Legal, And Support

- Privacy, Terms, and Support remain reachable without privileged access.
- Location is optional and used for nearby context, verification, and aggregate model inputs; it is never public individual truth.
- Venue operators may receive aggregate analytics/interest only, not raw individual location trails.
- Account deletion removes the auth user and linked personal activity as implemented by `account-sync`; de-identified aggregates may remain where documented.

## Owner And Staff

Owner/staff screens are not student product scope. Existing web tools remain the operational surface for Swift v1. Native code must not infer privileges from cached/client state; roles come from `account-sync` and are independently enforced by RLS/functions.

## Data Honesty

- Supabase is authoritative.
- No fake activity, crowd, wait, deal, report, event, analytics, role, or permission state.
- Offline or failed reads show unavailable/low-data states, not seeded live truth.
- Backend-confirmed mutations use pending state and refresh after success.
- Historical priors are clearly labeled typical patterns.
- Paid deal promotion is isolated from status scoring.

## What Swift Should Copy

- Product hierarchy, copy intent, screen states, optional permission sequencing, current-night boundary, backend-confirmed refresh order, low-data honesty, and security boundaries.
- The normalized models documented in `docs/native-api-contract.md`.
- The screen/state requirements in `docs/native-screen-state-inventory.md`.

## What Swift Must Not Copy

- DOM render strings, global `window` handlers, browser event plumbing, CSS layout, Mapbox GL JS integration, browser Notification/Permissions APIs, `navigator.geolocation`, service worker, manifest, web pull-gesture implementation, data-URL photo storage as a long-term design, or `localStorage` semantics.
- Bundled venue seed values as live truth. `src/data.js` is a web fallback/reference only.
- Client role assumptions or direct privileged writes.

## Scope

Swift v1 is defined in `docs/native-v1-scope.md`. The feasibility spike must precede the full project. Push delivery, native auth callbacks, production photo storage, and location retention require explicit readiness decisions before the full rebuild begins.
