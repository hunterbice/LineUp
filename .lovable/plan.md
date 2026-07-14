# LineUp Web Presence — Build Plan

Rebuilding LineUp's public website as a conversion-focused marketing site. The iOS app stays the source of truth for all student-facing functionality — no PWA, no consumer web features. This plan delivers **Phase 1: the public marketing site**, then scopes the dashboard and auth as later phases.

## Guiding rules (apply throughout)
- Every page serves exactly one goal: **app installs** or **venue signups/retention**.
- No consumer web features (Live, Deals, Maps, Favorites, Profile, crowd editing).
- App Store CTAs render a "Coming Soon" state (app not yet live) — styled as real App Store buttons but non-linking / notify state.
- Dark-mode-first, electric-blue accent, glass surfaces, strong type. Reference quality bar: Apple / Linear / Arc / Mercury / Ramp. No generic startup template.

---

## Phase 1 — Public marketing site (this build)

### Design system (`src/styles.css`)
- Convert tokens to dark-first: near-black background, layered elevated surfaces, electric-blue primary (`--primary`), muted foregrounds, subtle borders. Keep oklch format.
- Add semantic tokens: `--glass` surface + border, brand glow, gradient tokens for hero, and status-color tokens matching the product's separated signals (crowd / line / wait / deals / freshness) so UI mockups look authentic.
- Load a strong typeface (e.g. a geometric/grotesk display + clean body) via `<link>` in `__root.tsx` head, mapped in `@theme`.
- Set real head metadata in `__root.tsx` (title "LineUp — Know Before You Go", description, og/twitter). Remove template defaults.

### Shared layout & components
- `src/components/site/` : `SiteHeader` (sticky, transparent over hero → solid on scroll), `SiteFooter` (legal/support links), `AppStoreButton` (coming-soon variant), `ClaimVenueButton`, `PhoneMockup` (iPhone frame rendering authentic LineUp UI cards — "No Anchovies", "Busy Inside", "15 minute line", "$3 Wells Tonight", "Updated 4 minutes ago"), `VenueCoverageMap` (stylized Tucson/University District map — static SVG/visual, no live data).
- Header nav: Logo · Students · Venues · Download App · Venue Login. Primary CTA Download App, secondary Claim Your Venue.

### Routes (`src/routes/`), each with its own `head()` metadata
- `index.tsx` — **Home**: 7 sections per brief (Hero, Problem 3-cards, How It Works 3-steps, Product Features 7 outcomes, Coverage map, Social Proof — UArizona / 13 launch venues, Final CTA).
- `students.tsx` — **Students**: install-focused (avoid lines, better decisions, deals, tonight discovery) using authentic UI mockups, no web feature clones.
- `venues.tsx` — **Venues**: sells outcomes not features. Headline "Fill the nights you choose", 5 value props, CTAs Claim Your Venue + Book a Demo.
- `download.tsx` — **Download App**: large coming-soon App Store CTA + notify state.
- `contact.tsx` — **Contact** and `support.tsx` — **Support**.
- `privacy.tsx`, `terms.tsx`, `account-deletion.tsx` — legal pages (structured content; account-deletion explains iOS-app data deletion flow).
- `venue-login.tsx` — **Venue Login** placeholder in Phase 1: branded page that explains dashboard access is coming, wired to become the real auth entry in Phase 2 (no fake auth).

Social-proof metrics (13 venues, UArizona) built as easily-replaceable data so they can go dynamic later. Demo/sample content clearly labeled as demo.

### Coverage of "DO NOT build"
No consumer login, web map data, web reporting, favorites, social, notifications, or crowd editing in this phase.

---

## Phase 2 — Auth + venue dashboard shell (later, separate approval)
- Connect the existing Supabase project (you provide access) — no schema changes without approval.
- Email/password venue login + password reset; `_authenticated/` protected route layout.
- Role model enforcement server-side (`venue_owner`, `venue_admin`, `venue_staff`, `lineup_admin`, `lineup_owner`) via server functions + RLS. Client role checks are UI-only, never security.
- Dashboard shell + sidebar: Tonight · Deals · Events · Analytics · Team · Venue Profile · Billing · Settings.

## Phase 3 — Dashboard pages (later)
- **Tonight** (priority): Inside Crowd, Line Status, Wait Time, Cover Charge, Active Events, Active Deals, Confidence, Last Updated + quick-update actions.
- **Analytics**: aggregate only (Impressions, Detail Opens, Deal Opens, Direction Clicks, Favorites, Attributed Visits, Campaign Performance) — never user identity/location/device/coordinates.
- **Billing**: architecture for Free Verified / Growth / Pro / Launch Partner with configurable, non-hardcoded pricing.
- Deals, Events, Team, Venue Profile, Settings.

---

## Technical notes
- TanStack Start file-based routing; each public section is its own SSR route with unique metadata (not hash anchors).
- No secrets in client code; all privileged actions server-verified (Phase 2+).
- App Store links are coming-soon until you provide a URL.

I'll start with the design system + shared layout + Home, then the remaining public pages. Approve to begin Phase 1.