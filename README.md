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
python3 -m http.server 4173
```

Then open:

```
http://127.0.0.1:4173/
```

Or use the Claude Code launch config (`.claude/launch.json`) which runs `npx serve .` on port 4173.

---

## Hosting

The app is hosted on GitHub Pages with a custom domain via `CNAME`.

**Manual deploy:**
1. Push to `main` on GitHub
2. Pages auto-deploys from the repo root
3. Custom domain is set in `CNAME` → `get-lineup.app`

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
| `reward_events` | Future server-backed rewards ledger |

The app now reads from the `active_venue_status` view when Supabase is available and falls back to local prototype data if it is offline. User reports update the UI immediately and also insert into Supabase in the background.

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
- New confidence signals and app intent events trigger recomputation for their venue.
- Confidence is intentionally stricter than crowd scoring: baseline priors can move the displayed estimate, but they do not count as fresh live inputs.

Real source ingestion:

- `venue-status-ingest` is a Supabase Edge Function that lets the current staff/owner flow submit venue updates into `venue_confidence_signals`. This is a temporary bridge for the existing `2244` / `4444` prototype access codes; production should replace it with Supabase Auth venue roles.
- `besttime-prior-import` is a Supabase Edge Function scaffold for importing BestTime forecast curves into `venue_hourly_priors`. It requires a `BESTTIME_PUBLIC_KEY` Supabase secret and mapped `besttime_venue_id` values in `besttime_venue_map`.
- BestTime should stay a forecast/prior source until Tucson live coverage is validated against manual ground truth.
- The app now syncs in-app staff updates to Supabase, where they are treated as high-trust venue/admin signals and recompute the live score.

Security status:

- RLS is enabled on all public tables.
- Venue/live status is publicly readable.
- Public users can submit reports.
- Staff/owner updates require future authenticated Supabase users.
- The in-app `2244` / `4444` admin flow is still prototype-only and should be replaced by Supabase Auth before launch.

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
