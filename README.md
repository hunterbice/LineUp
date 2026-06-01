# LineUp

**Know the move before you move.**

LineUp is a mobile-first Progressive Web App for University of Arizona nightlife. It shows live crowd status, estimated line wait, closing times, momentum trends, venue events, and LineLeap jump links — all in a dark, branded interface built for iPhone Safari.

Live at: [get-lineup.app](https://get-lineup.app)

---

## Features

- **Live tab** — real-time crowd level (QUIET / SLOW / BUSY / PACKED), line wait, and confidence signal for every active venue
- **University / Downtown tabs** — two area views covering Main Gate and 4th Ave / Congress
- **Detail sheet** — swipe between venues, view full stats, mini Intel row, crowd chart, recent reports, and CTA buttons (Directions, LineLeap, Report)
- **Pulse Planner** — vibe-based venue recommendations using live crowd + scene scoring
- **Map** — draggable pin map with geofence and color-coded crowd indicators
- **Night Intel** — timing guidance, signal strength, and best move summary
- **Favorites** — pin bars to the top of the live list
- **Swipe navigation** — swipe left/right to move between venues inside a detail sheet; swipe down to close
- **Add to Home Screen prompt** — branded install sheet shown automatically on first mobile visit (iOS Safari instructions + Android/Chrome native prompt)
- **PWA** — installable, offline-capable, standalone display, service worker caching

---

## Brand

| Token | Value |
|---|---|
| Background | `#07080B` (Midnight Signal) |
| Brand teal | `#12E0C4` |
| Brand glow | `rgba(18,224,196,.28)` |
| Busy | `#FFB23F` |
| Packed | `#FF4F7B` |

---

## Assets

| File | Role |
|---|---|
| `assets/LineUp_Header_Wordmark_2x.png` | Transparent wordmark — app header, install prompt, splash (flat version) |
| `assets/LineUp_Splash_Wordmark_2x.png` | 3D splash wordmark — loading screen only |
| `icons/icon-192.png` | App icon — home screen, install prompt mini-brand |
| `icons/icon-512.png` | App icon — PWA manifest |
| `icons/maskable-512.png` | Safe-zone maskable icon for Android |
| `icons/apple-touch-icon.png` | iOS home screen icon |
| `brand-assets/gentle-bens-logo.png` | Venue logo |
| `brand-assets/frog-firkin-logo.png` | Venue logo |

---

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```
http://127.0.0.1:4179/
```

The app must run through Vite for development because the browser bundle imports
Supabase, Mapbox, and other dependencies from `node_modules`.

---

## Hosting

The app is hosted on GitHub Pages with a custom domain via `CNAME`.
Production deploys must publish the Vite build output from `dist/`, not the repo
root. The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` runs
`npm ci`, `npm run build`, and uploads `dist/` as the Pages artifact.

**Deploy:**
1. Push to `main` on GitHub
2. GitHub Actions builds and deploys `dist/`
3. GitHub Pages should be configured to use **GitHub Actions** as the source
4. Custom domain is preserved by `public/CNAME` → `get-lineup.app`

---

## BestTime Setup

BestTime uses a private key for creating venue forecasts and a public key for reading/querying existing venue data. Never commit the private key.

1. Create a local env file from the example:

```bash
cp .env.example .env.local
```

2. Paste your BestTime keys into `.env.local`.

3. Load the env file and seed the active LineUp venues:

```bash
set -a
source .env.local
set +a
node scripts/besttime-seed.mjs
```

This creates `data/besttime-venues.json`, which is intentionally ignored by Git. The file maps each active LineUp venue to the BestTime venue id returned by the API.

Security note: if a private key is ever shown in a screenshot, chat, or public page, rotate it in BestTime before launch.

---

## Supabase Backend

Supabase project:

```text
https://bxngqqsxthybjikmwvqj.supabase.co
```

Current backend tables:

| Table | Purpose |
|---|---|
| `venues` | Source-of-truth venue metadata, addresses, coordinates, areas, hours, and links |
| `live_status` | Current crowd, line wait, confidence, momentum, cover, event, freshness, and sources |
| `reports` | User-submitted crowd and line reports |
| `confidence_sources` | Source weights for confidence scoring, including venue updates, scouts, reports, photos, BestTime, geofence activity, app interest, events, and historical baseline |
| `venue_confidence_signals` | Individual confidence inputs observed for a venue, with reliability, freshness decay, source type, and optional metadata |
| `reporter_reliability` | Device/user trust scores for future agreement-based weighting |
| `venue_hourly_priors` | Per-venue, per-day, per-hour baseline curves used when live reports are sparse |
| `app_signal_events` | First-party intent telemetry such as detail views, directions taps, favorites, LineLeap taps, and report opens |
| `ground_truth_observations` | Manual calibration observations from launch-night headcounts, lines, photos, and notes |
| `venue_admins` | Future Supabase Auth permissions for owners and venue staff |
| `reward_events` | Server-backed rewards ledger (points earned per device/user) |
| `reward_redemptions` | Redeemed rewards (e.g. line-skip) with status and redemption code |
| `venue_checkins` | Verified/unverified proximity check-ins used as confidence signals |
| `venue_staff_codes` | Per-venue numeric staff access codes (expiring) for the staff console |
| `owner_audit_logs` | Audit trail of owner/staff actions and auth failures |
| `presence_snapshots` | Rounded location presence pings for live activity and verification |
| `user_profiles` | Profile rows for authenticated (including anonymous) users |
| `user_devices` | Device-to-user mapping for claiming anonymous device data |
| `user_favorites` | Server-side favorites synced across a user's devices |

> Reconciliation note (2026-05-28): the rows from `reward_redemptions` down were added by matching table names referenced in the Edge Functions and client code. The four model/config tables above (`confidence_sources`, `reporter_reliability`, `venue_hourly_priors`, `ground_truth_observations`) are documented but not referenced by app/function code — confirm exact columns and which tables exist against the live schema.

The app now reads from the `active_venue_status` view when Supabase is available and falls back to bundled venue data if it is offline. User reports update the UI immediately and also insert into Supabase in the background.

Confidence is no longer just a static label. The backend computes a signal score from source quality, reliability, and freshness. High-trust inputs such as owner/venue updates and verified scouts carry more weight, while historical baseline and app interest help fill gaps without pretending to be live proof. User reports automatically create confidence signals, and every signal fades over time so stale reads lose influence as the night changes.

Data-source strategy:

- Treat crowdsourced reports, venue/admin updates, verified scouts, and verified photos as the primary year-one live truth layer.
- Treat BestTime Basic as a forecast/prior provider, not as ground truth. Do not pay for live BestTime until Tucson venue coverage is manually validated.
- Do not scrape Google Popular Times, Snap Map, Instagram locations, or other private/social APIs. They create ToS and investor-diligence risk.
- Use first-party app behavior as a small supporting signal only: detail views, directions taps, map pin taps, favorites, LineLeap taps, report opens, and Pulse recommendations.
- Use `venue_hourly_priors` for Bayesian shrinkage when reports are sparse.
- Use `ground_truth_observations` to calibrate the model during launch nights.

Initial model targets:

- Line reports decay fastest, roughly 30 minutes.
- Crowd reports decay slower, roughly 45-90 minutes.
- Venue/admin and trusted scout signals decay slower than ordinary reports.
- Baseline priors use a pseudo-count around `3` so sparse venues do not swing wildly from one report.
- Public client reports cannot mark themselves GPS verified. Verified proximity should be added later through a Supabase Edge Function or native app backend check.

Scoring engine:

- `preview_venue_live_score(venue_id, as_of)` computes a live crowd score, wait estimate, confidence score, momentum, and source labels without mutating state.
- `recompute_venue_live_status(venue_id, as_of)` writes the computed result into `live_status`.
- `recompute_all_live_status(as_of)` refreshes every active venue.
- `get_device_profile_summary(target_device_id)` returns a privacy-safe device profile summary used by the profile screen (called by the `device-profile-summary` function).
- New confidence signals and app intent events trigger recomputation for their venue.
- Confidence is intentionally stricter than crowd scoring: baseline priors can move the displayed estimate, but they do not count as fresh live inputs.

Real source ingestion:

- `venue-status-ingest` is a Supabase Edge Function that lets approved staff accounts, venue-specific staff codes, or owner emergency access submit venue updates into `venue_confidence_signals`.
- `validate-staff-code` is the clean staff-password check used before opening the venue console. It validates the server-side owner/staff secrets or a row in `venue_staff_codes` without creating a venue confidence signal.
- `owner-actions` is the protected owner command surface for live venue overrides, venue status changes, staff-code creation, redemption review, and per-venue owner detail views. It accepts either the server-side emergency code or a Supabase Auth user with `role='owner'` in `venue_admins`.
- `device-session` issues a signed server token for the current device/session. Report, check-in, rewards, and account-claim functions require this token before trusting a `device_id`.
- `besttime-prior-import` is a Supabase Edge Function scaffold for importing BestTime forecast curves into `venue_hourly_priors`. It requires a `BESTTIME_PUBLIC_KEY` Supabase secret and mapped `besttime_venue_id` values in `besttime_venue_map`. (Note: this function's source is not yet present in this repo — it is planned/external. Add it under `supabase/functions/besttime-prior-import/` before relying on it.)
- BestTime should stay a forecast/prior source until Tucson live coverage is validated against manual ground truth.
- The app now syncs in-app staff updates to Supabase, where they are treated as high-trust venue/admin signals and recompute the live score.

Deployable local function source lives in:

| Function | Path |
|---|---|
| `validate-staff-code` | `supabase/functions/validate-staff-code/index.ts` |
| `device-session` | `supabase/functions/device-session/index.ts` |
| `owner-actions` | `supabase/functions/owner-actions/index.ts` |
| `owner-dashboard` | `supabase/functions/owner-dashboard/index.ts` |
| `venue-status-ingest` | `supabase/functions/venue-status-ingest/index.ts` |
| `account-sync` | `supabase/functions/account-sync/index.ts` |
| `location-ingest` | `supabase/functions/location-ingest/index.ts` |
| `app-event-ingest` | `supabase/functions/app-event-ingest/index.ts` |
| `reward-ledger` | `supabase/functions/reward-ledger/index.ts` |
| `device-profile-summary` | `supabase/functions/device-profile-summary/index.ts` |
| Shared CORS helpers | `supabase/functions/_shared/cors.ts` |
| Shared security/rate-limit helpers | `supabase/functions/_shared/security.ts` |

When the Supabase CLI or MCP is available:

```bash
supabase functions deploy validate-staff-code --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy device-session --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy owner-actions --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy owner-dashboard --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy venue-status-ingest --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy account-sync --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy location-ingest --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy app-event-ingest --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy reward-ledger --project-ref bxngqqsxthybjikmwvqj
supabase functions deploy device-profile-summary --project-ref bxngqqsxthybjikmwvqj
supabase secrets set LINEUP_OWNER_CODE=<rotating-owner-code> LINEUP_STAFF_CODE_PEPPER=<random-staff-code-pepper> LINEUP_DEVICE_TOKEN_SECRET=<random-device-token-secret> --project-ref bxngqqsxthybjikmwvqj
```

Deployment status:

- `device-session` source present in repo; deploy before enforcing signed device trust in production.
- `validate-staff-code` deployed to Supabase on May 27, 2026.
- `owner-actions` deployed to Supabase on May 27, 2026.
- `owner-dashboard` source present in repo; confirm whether it is deployed.
- `venue-status-ingest` deployed to Supabase on May 27, 2026.
- `account-sync` deployed to Supabase on May 27, 2026.
- `location-ingest` deployed to Supabase on May 27, 2026.
- `app-event-ingest` deployed to Supabase on May 27, 2026.
- `reward-ledger` deployed to Supabase on May 27, 2026.
- `device-profile-summary` deployed to Supabase on May 27, 2026.
- `LINEUP_OWNER_CODE` and `LINEUP_STAFF_CODE_PEPPER` are set as Supabase function secrets.

Security status:

- RLS is enabled on all public tables.
- Venue/live status is publicly readable.
- Public users can submit reports.
- Staff/owner updates require future authenticated Supabase users.
- Venue admin access is now venue-specific: staff accounts come from `venue_admins`, and fallback staff codes are stored as per-venue hashes with expirations.
- Owner dashboard/detail responses are data-minimized: no raw user IDs, device IDs, exact GPS trails, broad row metadata, or full stored staff codes are returned to the browser.

---

## Runtime Files

| File | Purpose |
|---|---|
| `index.html` | Entire app — single-file PWA |
| `manifest.webmanifest` | PWA manifest (standalone display, icons, theme) |
| `sw.js` | Service worker — app shell cache + offline fallback |
| `offline.html` | Shown when offline and no cache hit |
| `icons/` | All PWA and favicon icon sizes |
| `assets/` | Wordmark images |
| `brand-assets/` | Venue logos |
| `scripts/besttime-seed.mjs` | Local-only helper to create BestTime venue forecasts |
| `data/besttime-venues.example.json` | Safe example shape for generated BestTime venue data |

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `lineup_favorites` | Array of favorited venue IDs |
| `lineup_area` | Last selected area (`main_gate` or `fourth_downtown`) |
| `lineup_install_prompt_dismissed_at` | Timestamp of last "Remind me later" tap |
| `lineup_install_prompt_completed` | Set to `"true"` when user completes install flow |
| `lineup_pwa_installed` | Set to `"true"` when app is opened in standalone mode |
