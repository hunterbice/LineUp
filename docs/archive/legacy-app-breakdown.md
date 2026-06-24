> Archived historical document. Not canonical for the native Swift rebuild. See `AGENTS.md` and `docs/native-*` for current direction.

# LineUp App Breakdown

## Executive Summary

LineUp is a mobile-first nightlife intelligence app for University of Arizona students and Tucson nightlife visitors. The app helps users decide where to go by showing live-feeling venue status, crowd level, line wait, people inside, closing time, line photos, comments, saved favorites, and persistent highlights.

The product is currently implemented as a Progressive Web App prototype. It can be opened in a browser, installed to a phone home screen, cached for offline loading, and run without an app store submission. The current version is intentionally local-first and front-end only: data is stored in the user's browser through `localStorage`, and the app does not yet connect to a backend.

The long-term product vision is to become the real-time decision layer for going out: a lightweight, trusted, campus-specific app that answers, "Where should we go right now?" before a group wastes time walking to a dead bar, standing in a bad line, or missing a venue before close.

## Product Positioning

LineUp is not trying to be a generic event calendar or a social media feed. Its core job is immediate nightlife decision support.

Primary user question:

"What is happening at each bar right now, and is it worth going?"

Primary value:

LineUp reduces uncertainty before a night out by making crowd, line, timing, and venue activity visible in one fast mobile interface.

Target first market:

University of Arizona nightlife, especially the Main Gate / University Boulevard bar cluster and the 4th Avenue / Downtown Tucson nightlife cluster.

Expansion path:

After Tucson validation, the same model can expand to other college towns and campus nightlife districts where students face the same decision problem every weekend.

## Current User Experience

The first screen is the venue list. Users see bars grouped by area and can quickly scan each venue's:

- Venue name
- Venue category / vibe tag
- Closing status
- Crowd level
- Line wait
- Inside-now count
- Last updated freshness
- Favorite status

The app uses a dark premium interface suited to nightlife. It has restrained accents, compact cards, and a professional tone. Recent design work moved the experience away from casual emoji-heavy prototype styling and toward a polished consumer app feel.

The venue detail screen includes:

- Back navigation to all bars
- Venue header
- Close time under the venue name
- Favorite toggle
- Crowd status pill
- Tabs for `Tonight` and `Highlights`
- Live crowd reports
- Line photos
- Live report submission
- Comments
- Secondary LineLeap jump option placed lower in the screen

LineLeap is intentionally not positioned as the main call to action. It appears only after the user has consumed LineUp's own venue intelligence, so LineUp remains the primary destination and LineLeap becomes a fallback option.

## Current Design Direction

The current product direction is "premium, clean, real app." The design is moving away from anything that feels like a side project, student sketch, or casual group chat.

Current styling choices:

- Dark default theme
- System font stack for native iPhone / Android feel
- Strong but restrained red accent
- Compact but touch-friendly controls
- Professional capitalization
- Minimal clutter
- Less visual noise per screen
- Taller venue cards so fewer items appear at once
- More scrolling, less compression

The app should feel like a trustworthy nightlife utility, not a novelty.

## Core Product Features

### Venue List

The venue list is the main discovery surface. It renders bars for the selected area and sorts favorites to the top.

Current area tabs:

- Main Gate
- 4th / Downtown

Each venue card includes a visual identity tile, venue name, closing text, venue tag, favorite button, crowd meter, crowd status, line wait, inside-now read, and freshness.

### Closing Time Logic

Closing time is a major product feature because nightlife is highly time-sensitive.

Current behavior:

- If a venue is more than two hours from close, the app shows `Closes at 2 AM`.
- If a venue is within two hours of close, the app shows `Closes in 1h 42m`.
- If a venue is within 45 minutes of close, the app shows `Closing soon · 38m left`.
- If a venue is closed, the app shows `Closed · Opens 8 PM`.

This keeps closing information useful without creating urgency too early.

### Inside-Now Count

The inside count was recently reframed from a casual approximate value to a smarter product signal.

Previous format:

- `~40 Inside`

Current format:

- `40`
- `Inside now`
- On the detail screen: `LineUp read`

The app no longer uses a tilde symbol, because college users may not interpret it clearly and it can make the product feel less confident. Instead, LineUp rounds the number into smart bands behind the scenes and presents it as an "inside now" read. This communicates confidence while avoiding language like "estimate," which could make the app sound inaccurate.

Current inside count rounding logic:

- Counts below 80 round to the nearest 5.
- Counts below 250 round to the nearest 10.
- Counts below 500 round to the nearest 25.
- Counts above 500 round to the nearest 50 and show a plus sign.
- Zero activity shows `No Activity`.

### Crowd Status

Crowd levels are represented as four states:

- `DEAD`
- `SLOW`
- `BUSY`
- `PACKED`

These are not framed as good or bad. They are information signals. Different users want different types of nights, so the app should avoid moralizing crowd intensity.

### Line Wait

The app displays either:

- `No Line`
- A wait in minutes, such as `20 Min`

The line wait is one of the highest-value signals because it directly affects where users choose to go.

### Live Reports

Users can submit a live report from the detail screen by choosing a crowd level and optionally adding a comment.

The report form includes:

- Crowd level picker
- Name field
- Notes field
- Post Report button

When a report is posted in the prototype:

- The crowd level updates.
- The inside count is recalculated.
- The line wait is recalculated.
- Freshness resets to `1 min ago`.
- The comment is inserted at the top of the comments list.

### Photos

The app supports two photo concepts:

- Live line photos
- Highlights

Live line photos are intended for current-night decision making. They reset after close.

Highlights are persistent memories from the night. They do not clear when the bar closes.

The prototype rejects photos under 720px wide or tall to preserve minimum quality.

### Comments

Comments are currently local and reset after close. They are designed to capture short, useful field reports such as line movement, cover notes, capacity status, or entrance details.

Example comments currently seeded:

- `Line is wrapped past Frog & Firkin.`
- `Upstairs is at capacity right now.`
- `Line is moving steadily.`
- `High traffic for the Thursday special.`
- `Side entrance moved quickly.`

### Favorites

Users can favorite venues from the list or detail screen.

Favorites are stored locally and sorted to the top of the list. This allows users to personalize the app around their usual spots.

### Theme Toggle

The app supports light and dark themes, but dark is the default. Theme preference is saved in local storage.

### PWA Installation

The app has been converted into a Progressive Web App. It includes:

- Web app manifest
- Service worker
- Offline page
- App icons
- Apple touch icon
- Standalone display mode
- Portrait orientation
- Theme color
- Safe-area viewport handling for iPhones

This allows the app to behave more like a native mobile app when saved to the home screen.

## File-by-File Breakdown

### `index.html`

This is the main app file. It contains the complete front-end application:

- HTML shell
- CSS design system
- JavaScript state model
- Venue data
- Rendering logic
- Event handlers
- PWA registration

Approximate size:

- 453 lines

Major responsibilities:

- Defines app metadata and mobile viewport settings.
- Links to the manifest and icons.
- Provides all visual styling.
- Defines venue data.
- Defines seeded prototype state.
- Handles local persistence.
- Renders the list view.
- Renders the detail view.
- Handles favorites.
- Handles comments and reports.
- Handles live photo uploads.
- Handles highlight uploads.
- Handles close/open state logic.
- Registers the service worker.

Important functions:

- `load()`
- `save()`
- `loadFavorites()`
- `saveFavorites()`
- `applyTheme()`
- `insideRead(n)`
- `tucsonNow()`
- `hourLabel(h)`
- `closingInfo(b)`
- `tileHTML(b, sz, r)`
- `pill(lvl)`
- `renderList()`
- `lineLeapUrl(b)`
- `renderPhotoTiles(arr, emptyText)`
- `detailTabsHTML()`
- `partnerJumpHTML(b)`
- `renderDetail()`
- `bindLiveForm(st)`
- `bindHighlightForm(st)`
- `handlePhoto(e, target, msg)`

Important local storage keys:

- `lineup_state_v1`
- `lineup_state`
- `lineup_favorites`
- `lineup_theme`

Current venues:

Main Gate:

- Gentle Ben's
- The Blind Pig
- No Anchovies
- Frog & Firkin
- The Saddle
- Fuku Sushi
- Agave House

4th / Downtown:

- O'Malley's
- The Hut
- Dirtbag's
- Sky Bar
- Playground
- Hi Fi Kitchen & Cocktails

Important note:

`index.html` is currently a single-file prototype. This is fine for speed and early product iteration, but a production app should eventually split the code into components, modules, stylesheets, and backend API calls.

### `manifest.webmanifest`

This file defines how LineUp behaves when installed as a PWA.

Approximate size:

- 40 lines

Current values:

- App name: `LineUp`
- Short name: `LineUp`
- Description: `Know the line, crowd, and vibe before you go out around U of A.`
- Start URL: `./index.html`
- Scope: `./`
- Display: `standalone`
- Orientation: `portrait`
- Background color: `#080807`
- Theme color: `#080807`
- Categories: `social`, `lifestyle`, `navigation`

Icons included:

- `icons/icon.svg`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-512.png`

Investor / product meaning:

The app can be distributed immediately through a link and installed on phones without waiting for App Store approval. This lowers early testing friction.

### `sw.js`

This is the service worker. It powers offline app-shell caching and PWA behavior.

Approximate size:

- 62 lines

Current cache name:

- `lineup-pwa-v5`

Cached app shell:

- `./`
- `./index.html`
- `./manifest.webmanifest`
- `./offline.html`
- `./icons/icon.svg`
- `./icons/icon-192.png`
- `./icons/icon-512.png`
- `./icons/maskable-512.png`
- `./icons/apple-touch-icon.png`

Behavior:

- On install, caches the app shell.
- On activate, deletes old caches.
- For navigation requests, tries network first, then cached `index.html`, then `offline.html`.
- For asset requests, tries cache first, then network, and caches successful responses.

Product meaning:

LineUp can load even with poor signal, which matters in crowded nightlife areas where mobile networks may be unreliable. Live data still requires connectivity, but the app itself remains accessible.

### `offline.html`

This is the fallback page shown when the app cannot load live content.

Approximate size:

- 26 lines

Content:

- App mark
- `LineUp is offline`
- Explanation that the app shell is saved but live nightlife data needs a connection
- Try again button

Product meaning:

The app handles connection failure gracefully instead of showing a generic browser error.

### `icons/`

This folder contains PWA and home-screen assets.

Files:

- `icon.svg`
- `icon-192.png`
- `icon-512.png`
- `maskable-512.png`
- `apple-touch-icon.png`

Product meaning:

These assets let LineUp look like an app when installed on iOS or Android.

### Screenshot Files

The workspace also contains development screenshots from previous design checks:

- `pwa-check.png`
- `calm-card-check.png`
- `premium-style-check.png`
- `close-threshold-check.png`

These are not required for the app to run. They are design QA artifacts from prior iterations.

## Current Technical Architecture

The current app is a static front-end PWA.

Architecture:

- Single HTML file
- Inline CSS
- Inline JavaScript
- Local browser storage
- Static service worker
- Static manifest
- Static icons

No current backend:

- No database
- No authentication
- No real-time sync
- No moderation system
- No server-side photo storage
- No admin dashboard
- No analytics pipeline

This is a strong prototype shape because it allows rapid iteration, but it should not be mistaken for production infrastructure.

## Data Model

### Venue Object

Each venue includes:

- `id`
- `tab`
- `name`
- `tag`
- `icon` or `logo`
- `open`
- `close`

Example:

```js
{
  id: "bens",
  tab: "U",
  name: "Gentle Ben's",
  tag: "Brewpub · upstairs deck",
  icon: "beer emoji",
  open: 20,
  close: 2
}
```

### State Object

Each venue's live state includes:

- `lvl`
- `heads`
- `wait`
- `fresh`
- `cmts`
- `highlights`
- `livePhotos`
- `resetKey`

Example:

```js
{
  lvl: "packed",
  heads: 610,
  wait: 25,
  fresh: 4,
  cmts: [],
  highlights: [],
  livePhotos: [],
  resetKey: ""
}
```

### Comment Object

Each comment includes:

- `n`: poster name
- `t`: text
- `a`: age in minutes

Example:

```js
{
  n: "Maya R.",
  t: "Line is wrapped past Frog & Firkin.",
  a: 6
}
```

## Current Strengths

LineUp has a clear user problem:

Students and nightlife visitors waste time deciding where to go because line, crowd, and closing information is fragmented, unreliable, or only available by physically walking there.

LineUp has a clear usage moment:

The app is useful right before going out, while walking between bars, while waiting in line, and while coordinating with friends.

LineUp has a strong first market:

Campus nightlife is dense, repeatable, social, and time-sensitive. Students visit the same venues frequently, making habit formation plausible.

LineUp has low distribution friction:

As a PWA, it can be shared by link, installed to phones, and tested without app store overhead.

LineUp has expansion potential:

The model can expand from U of A to other college nightlife markets.

## Current Limitations

The current prototype does not yet have a live backend. All user submissions are local to the device.

The inside count is currently simulated from local state, not generated from real sensor data, venue integrations, staff reports, payment data, Wi-Fi density, or crowd-sourced validation.

Photo uploads are stored as base64 data in local storage. This is not production-safe because browser storage quotas are limited.

Comments are not moderated. A production app will need abuse prevention, reporting, filtering, and possibly campus-specific moderation rules.

Freshness is represented as a static minute value. A production app should store timestamps and calculate freshness dynamically.

The nightly reset logic is good for a prototype but should eventually use venue-specific operating windows and a backend reset job.

The app currently has no user identity system. This keeps onboarding simple but limits trust, reputation, spam control, and contribution incentives.

The app currently has no analytics. A production version should measure installs, venue views, report submissions, retention, tab usage, and conversion to external partners.

## Recommended Production Roadmap

### Phase 1: MVP Validation

Goal:

Validate whether students repeatedly open LineUp before and during nights out.

Recommended work:

- Keep PWA distribution.
- Add a real backend.
- Store reports, comments, venue state, and photos centrally.
- Add real timestamps.
- Add basic analytics.
- Add anonymous or lightweight user IDs.
- Recruit initial U of A users.
- Manually seed high-confidence venue data during launch nights.

Suggested backend options:

- Supabase
- Firebase

Suggested tables:

- `venues`
- `venue_status`
- `reports`
- `comments`
- `photos`
- `favorites`
- `users`
- `moderation_events`

### Phase 2: Trust and Quality

Goal:

Make the data feel reliable enough that users check it before leaving.

Recommended work:

- Add confidence scoring.
- Weight newer reports more heavily.
- Weight trusted users more heavily.
- Add report verification through multiple submissions.
- Add "last confirmed" language.
- Add stale-state warnings.
- Add moderation tools.
- Add photo review or flagging.

Possible product language:

- `LineUp read`
- `Live read`
- `Recently confirmed`
- `Updated 6 min ago`
- `High confidence`

Avoid product language:

- `Estimate`
- `Guess`
- `Approximate`
- `Maybe`

### Phase 3: Growth Loop

Goal:

Turn LineUp into a habit and a social utility.

Recommended work:

- Friend sharing that keeps people inside LineUp.
- Group planning.
- Favorite venue alerts.
- Push notifications for favorite bars becoming busy.
- "Where should we go?" recommendation mode.
- Campus ambassador launch strategy.
- Venue partnerships.
- LineLeap or ticketing integration only after LineUp value is consumed.

### Phase 4: Native App or Hybrid App

Goal:

Move beyond PWA if retention and usage justify app store investment.

Recommended work:

- Wrap with Capacitor or build React Native.
- Add push notifications.
- Add location-aware venue sorting.
- Add background refresh where appropriate.
- Preserve PWA as the fastest acquisition channel.

## Investor Framing

LineUp sits at the intersection of nightlife, local discovery, social coordination, and real-time decision intelligence.

The wedge is college nightlife because:

- Venues are geographically concentrated.
- Users have repeated weekly demand.
- Social groups make decisions collectively.
- Information decays quickly, making real-time updates valuable.
- A small number of venues can create a useful initial network.
- Campus ambassadors can drive adoption efficiently.

Potential monetization paths:

- Venue-sponsored placement
- Premium venue dashboards
- Ticketing / cover integrations
- Line-skip partner revenue
- Event promotion
- Student brand partnerships
- Market data insights for venues

Important strategic note:

LineUp should not give away the primary user journey to external partners too early. External actions like LineLeap should be placed after the user sees LineUp's own live value, so LineUp remains the habitual app.

## What Makes LineUp Defensible Over Time

The prototype itself is not yet defensible. The defensibility would come from:

- Real-time campus-specific data
- User habit and retention
- Venue coverage
- Trusted contribution network
- Historical nightlife patterns
- Brand recognition on campus
- Operational playbook for launching new college towns
- Partnerships with venues and promoters

The app should prioritize trust and freshness above feature quantity. A simple app with reliable data beats a feature-rich app with questionable information.

## AI Handoff Instructions

If another AI is continuing development, it should understand the following:

1. This is a mobile-first PWA prototype for U of A nightlife.
2. Preserve the premium, professional tone.
3. Avoid casual lowercase copy, emoji-heavy UI, and clutter.
4. Do not make LineLeap the primary call to action.
5. Keep close time prominent.
6. Treat crowd level as descriptive, not judgmental.
7. Avoid saying `estimate` for inside count.
8. Use `Inside now` and `LineUp read` language.
9. Prioritize LineUp's own live reports, photos, and comments.
10. Keep the app fast and usable on iPhone and Android.
11. Do not add a landing page as the first screen.
12. The first screen should remain the usable venue list.
13. If adding backend functionality, replace local-only storage carefully.
14. If adding photos, use real storage instead of localStorage base64.
15. If adding analytics, preserve user privacy and avoid heavy scripts.

## Immediate Recommended Fixes

Highest priority:

- Add real backend persistence.
- Convert freshness values to timestamps.
- Add centralized photo storage.
- Add moderation / reporting.
- Add analytics.
- Create admin controls for venue status.

Medium priority:

- Split `index.html` into maintainable modules.
- Improve accessibility labels.
- Add loading and network states.
- Add empty states for real backend loading.
- Add install prompts for PWA.
- Add push notification strategy.

Lower priority:

- Native app wrapper.
- Venue owner dashboards.
- Advanced recommendation engine.
- Payment / ticketing integrations.

## Current Project Files

Required runtime files:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/icon.svg`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-512.png`
- `icons/apple-touch-icon.png`

Development / QA files:

- `pwa-check.png`
- `calm-card-check.png`
- `premium-style-check.png`
- `close-threshold-check.png`

## Current Status

LineUp is currently a strong interactive prototype and PWA foundation. It demonstrates the product experience, core user flow, mobile design direction, and initial nightlife data model. It is not yet a production-ready social app because it lacks shared backend data, moderation, identity, analytics, and scalable media storage.

The next major milestone should be turning the prototype from local simulation into a real live-data MVP for one campus market.
