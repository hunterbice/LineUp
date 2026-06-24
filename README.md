# LineUp

**Know Before You Go.**

LineUp is a University of Arizona nightlife decision app. It presents backend-confirmed venue status, line estimates, freshness/confidence, active deals, and current-night structured reports without pretending sparse data is live proof.

The committed web app at v75 is the product/UX, backend-contract, security, and test reference for a future **fully native SwiftUI iOS app**. It remains deployable for validation. It is not the native architecture, and LineUp is not pursuing a WebView, Capacitor, or Add-to-Home-Screen iOS strategy.

## Canonical Documentation

Start here:

- [`AGENTS.md`](AGENTS.md) — strict rules for future coding agents.
- [`docs/native-rebuild-product-spec.md`](docs/native-rebuild-product-spec.md) — canonical product behavior.
- [`docs/native-api-contract.md`](docs/native-api-contract.md) — current backend contracts and gaps.
- [`docs/native-screen-state-inventory.md`](docs/native-screen-state-inventory.md) — SwiftUI screen/state blueprint.
- [`docs/native-v1-scope.md`](docs/native-v1-scope.md) — definitive native v1 scope.
- [`docs/native-location-services-spec.md`](docs/native-location-services-spec.md) — Core Location rules.
- [`docs/native-push-notification-spec.md`](docs/native-push-notification-spec.md) — APNs plan and missing contract.
- [`docs/swift-feasibility-spike-plan.md`](docs/swift-feasibility-spike-plan.md) — required proof before the full rebuild.
- [`docs/native-swift-rebuild-risk-map.md`](docs/native-swift-rebuild-risk-map.md) — P0/P1/P2 risks.
- [`docs/native-rebuild-readiness-audit.md`](docs/native-rebuild-readiness-audit.md) — readiness decision and evidence.

Documents under `docs/archive/` are historical and non-canonical.

## Current Product

- **Live** — venue crowd bucket, line estimate, likely fullness, momentum, and freshness/confidence.
- **Deals** — only active current deals, with explicit Promoted labeling where applicable.
- **Venue detail** — Live/Deals, conditional current-night Events, current-night reports, hours, directions, check-in, and reporting.
- **Reports** — structured crowd/wait updates through authenticated signed-device ingestion.
- **Favorites and recents** — server favorites and locally cached venue ID/timestamp recents hydrated from current backend rows.
- **Early Access** — join Arizona, save spots, request aggregate launch-deal interest, and use honest low-data states.
- **Account** — profile, public/anonymous mode, optional avatar, permission guidance, legal/support, sign-out, and self-delete.

## Architecture

- Frontend: Vite JavaScript reference implementation in `src/`.
- Backend: Supabase Auth, Postgres/RLS, Realtime, and Edge Functions in `supabase/`.
- Maps: Mapbox GL JS for the web reference; native map framework is a Swift spike decision.
- Source of truth: Supabase for account, profile, favorites, venue/status, deals, reports, roles, rewards, presence, analytics, and owner/staff data.
- Client cache: `src/state/cacheState.js` only. Cache/UI state may never become backend truth.
- Security: signed-device proof, authenticated Edge Functions, RLS, scoped owner/staff roles, account deletion, rate limits, and static/live smoke tests.

The bundled `src/data.js` rows are web fallback/reference data, not authoritative live status. On a failed initial Supabase load, student UI must show unavailable/low-data behavior rather than seed activity as current truth.

## Key Backend Surfaces

| Surface | Current contract |
| --- | --- |
| Auth/session | Supabase Auth email/password |
| Device proof | `device-session` |
| Profile/favorites/deletion/roles | `account-sync` |
| Early Access/deal interest | `early-access` |
| Live venues | `active_venue_status` view |
| Active deals | `venue_deals` under RLS |
| Report/check-in/presence | `location-ingest` |
| Current-night reports | `reports-feed` |
| Product/deal analytics | `app-event-ingest`, `venue-analytics-ingest` |
| Staff live updates | `venue-status-ingest` |
| Owner operations | `owner-actions`, `owner-dashboard` |

See `docs/native-api-contract.md` before writing a client.

## Current Native Readiness

Ready for a controlled Swift feasibility spike:

- Supabase Auth/session foundation;
- signed-device issuance/verification;
- account/profile/favorites/deletion;
- Live, Deals, reports, current-night events;
- owner/staff server authorization kept outside student v1.

P0 decisions before the full native rebuild:

1. configure native auth callbacks/email confirmation;
2. add APNs token sync before enabling push delivery;
3. replace profile data-URL avatars with reviewed object storage or defer photos;
4. approve exact-location sampling and retention/cleanup;
5. validate Keychain device-session lifecycle and deployed contract parity.

## Run The Web Reference

```bash
npm install
npm run dev
```

Vite prints the local URL. Production web builds use:

```bash
npm run build
```

GitHub Pages deploys `dist/` through `.github/workflows/deploy-pages.yml`. The manifest, service worker, and offline page remain only for the web preview and regression coverage; Swift must not copy them.

## Verification

```bash
npm run smoke:source
npm run smoke:reliability
npm run smoke:security
npm run smoke:pwa
npm run build
npm run smoke:app
npm test
git diff --check
```

Run `npm run smoke:security:live` only with a temporary `SUPABASE_SERVICE_ROLE_KEY` environment variable. Never commit or print private keys.

## Safety

- Do not weaken RLS, signed-device proof, account deletion, current-night filtering, or scoped roles.
- Do not introduce fake activity, local venue overrides, public free-form UGC, payment/IAP flows, or paid influence over crowd truth.
- Do not place service-role/provider private keys, passwords, owner codes, or APNs credentials in the client or repository.
- Review `docs/production-safety.md` before migrations or function deployments.
