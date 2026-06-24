> Archived historical document. Not canonical for the native Swift rebuild. See `AGENTS.md` and `docs/native-*` for current direction.

# LineUp Master Handoff

## Purpose Of This Document

This document is a complete handoff for the current LineUp app. It is written so another AI, developer, designer, investor, or advisor can understand what the app is, how it works, what files exist, what choices have already been made, what the product direction is, and what should be improved next.

Use this as the canonical context file before making future edits.

## One Sentence Summary

LineUp is a mobile-first Progressive Web App for University of Arizona nightlife that helps students decide where to go by showing venue crowd status, line wait, on-site activity, closing time, comments, line photos, venue photos, highlights, favorites, and optional LineLeap links.

## Product Thesis

College nightlife decisions are fast, social, and uncertain. Students often waste time walking to bars that are too empty, too packed, closed soon, or stuck behind a bad line. LineUp exists to answer one practical question:

"Where should we go right now?"

The product is not meant to be a social media app first. It is not meant to be an event calendar first. It is a live decision layer for going out.

LineUp should feel like a polished consumer utility, not a school project. The desired brand feel is premium, clean, useful, and trustworthy.

## Target Market

Initial market:

- University of Arizona
- Tucson nightlife
- Main Gate / University Boulevard bars
- 4th Avenue and Downtown Tucson bars

Primary users:

- University of Arizona students
- Student friend groups deciding where to go
- People already out and choosing the next stop
- Visitors who do not know the local nightlife flow

Core usage moments:

- Before leaving home
- In an Uber
- Walking between bars
- Waiting in line
- Deciding whether to stay or leave
- Coordinating with friends

## Current App Format

LineUp is currently a static PWA.

It is built with:

- `index.html`
- Inline CSS
- Inline JavaScript
- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- Local image assets
- Browser `localStorage`

There is no backend yet.

Current hosting target:

- GitHub Pages

Current repository:

- `https://github.com/hunterbice/LineUp`

Likely GitHub Pages URL after Pages is enabled:

- `https://hunterbice.github.io/LineUp/`

## Current File Inventory

Runtime files:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `.nojekyll`
- `icons/icon.svg`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-512.png`
- `icons/apple-touch-icon.png`
- `brand-assets/gentle-bens-logo.png`
- `brand-assets/frog-firkin-logo.png`

Documentation and project files:

- `README.md`
- `LineUp-App-Breakdown.md`
- `LineUp-Master-Handoff.md`
- `.gitignore`

Local QA screenshot files are ignored by git:

- `pwa-check.png`
- `calm-card-check.png`
- `premium-style-check.png`
- `close-threshold-check.png`

## `index.html`

This is the main app file. It currently contains the whole app in one file:

- Head metadata
- PWA tags
- CSS design system
- HTML app shell
- Venue data
- Seed data
- Local persistence logic
- Rendering logic
- Report form logic
- Photo upload logic
- Favorite logic
- Theme logic
- Service worker registration

Approximate current size:

- 475 lines

### Head Metadata

The document is standard HTML5.

Important metadata:

- UTF-8 charset
- Mobile viewport with `viewport-fit=cover`
- Theme color: `#080807`
- Description: `LineUp helps University of Arizona students check the line, crowd, and vibe before they go out.`
- Apple mobile capable tag
- Apple app title: `LineUp`
- Apple status bar: `black-translucent`
- Manifest linked at `manifest.webmanifest`
- App icons linked from `icons/`

The app is designed for mobile-first viewing and iPhone safe areas.

### App Shell

The body contains:

- `#app`
- Header
- Main brand row
- Theme toggle
- Live indicator
- Subheading
- Area tabs
- Hidden crowd legend
- List container
- Detail container
- Toast container

The first screen is the actual app, not a marketing page. This is intentional. LineUp should open directly to useful venue status.

### Visual Identity

Current brand:

- Name: `LineUp`
- Mark: small triangle glyph inside a red rounded square
- Default theme: dark
- Accent: red/pink
- Layout: premium, compact, phone-first

The design has been intentionally moved away from:

- Emoji-heavy UI
- Casual lowercase copy
- Cluttered cards
- Share links at the top
- Redundant stats tabs
- Prototype-looking sections

### CSS Variables

The app uses CSS custom properties for theme colors.

Light theme variables include:

- `--bg`
- `--bg2`
- `--card`
- `--ink`
- `--muted`
- `--hint`
- `--line`
- `--red`
- `--tile`
- `--logo-invert`
- crowd status colors
- toast colors

Dark theme overrides are applied through:

```html
html[data-theme="dark"]
```

The dark theme is the primary intended experience.

### Important Layout Areas

Header:

- Brand row
- Theme button
- Live dot
- Area tabs

Venue list:

- Cards
- Logo tile
- Venue name
- Close status
- Venue tag
- Favorite button
- Crowd meter
- Stats grid

Detail view:

- Back button
- Venue header
- Close time
- Favorite
- Crowd pill
- Detail tabs
- Live stats
- Collapsed photo panels
- Report form
- Comments
- Secondary LineLeap partner section

## Current Venues

There are currently 12 venues.

Main Gate:

- Gentle Ben's
- The Blind Pig
- No Anchovies
- Frog & Firkin
- The Saddle
- Fuku Sushi
- Agave House

4th / Downtown:

- O'Malley's on Fourth
- The Hut
- Dirtbag's
- Sky Bar
- Playground
- Hi Fi

Removed:

- IBT's was removed completely from the app and documentation.

## Venue Data Model

Venue objects live in `BARS`.

Fields:

- `id`
- `tab`
- `name`
- `tag`
- `icon`
- `logo`
- `open`
- `close`
- `lineLeap`

Example:

```js
{
  id: "bens",
  tab: "U",
  name: "Gentle Ben's",
  tag: "Brewpub · upstairs deck",
  logo: "gentlebens",
  open: 20,
  close: 2,
  lineLeap: "https://tickets.lineleap.com/venues/x8A6Qq18onI9LuD9iTvJ"
}
```

The `tab` field controls area grouping:

- `U` means Main Gate
- `P` means 4th / Downtown

The `open` and `close` fields use 24-hour numeric values.

Example:

- `open: 20` means 8 PM
- `close: 2` means 2 AM

The app handles overnight closing times.

## Venue Logos

There are two logo systems:

1. `LOGOS`
2. `ASSET_LOGOS`

`LOGOS` contains embedded base64 image data for some existing logos.

`ASSET_LOGOS` maps names to local image files:

```js
var ASSET_LOGOS = {
  gentlebens: "brand-assets/gentle-bens-logo.png",
  frogfirkin: "brand-assets/frog-firkin-logo.png"
};
```

Current external brand assets:

- `brand-assets/gentle-bens-logo.png`
- `brand-assets/frog-firkin-logo.png`

Frog & Firkin logo note:

- A previous Frog logo showed as a white box in the small tile.
- It was replaced with a transparent cutout file.
- Current file is `brand-assets/frog-firkin-logo.png`.

Logo rendering:

- `tileHTML(b, sz, r)` chooses either `ASSET_LOGOS[b.logo]` or `LOGOS[b.logo]`.
- If no logo exists, it falls back to an icon/emoji.
- Logo images are shown inside `.tile`.

Potential future improvement:

- Replace remaining embedded base64 logos with clean files in `brand-assets/`.
- Create simplified square mark versions for small tiles.
- Avoid detailed full wordmarks in 54px tiles.

## Crowd Levels

Crowd levels live in `LV`.

Current levels:

- `dead`
- `chill`
- `busy`
- `packed`

Display labels:

- `DEAD`
- `SLOW`
- `BUSY`
- `PACKED`

Each level has:

- `t`: label
- `bg`: background color
- `ink`: text color
- `fill`: meter fill color
- `pct`: meter width and rough intensity value

Important product note:

Crowd labels should be treated as descriptive, not moral judgment. Some users want a quiet bar. Some users want packed. The app should avoid implying that one is universally better.

Possible future copy improvement:

- Consider replacing `DEAD` with a less negative term such as `LIGHT`, `LOW`, or `QUIET`.
- User already disliked `No Activity`; this is related.

## On-Site Activity Metric

The app previously used:

- `~40 Inside`
- `Inside now`
- `No Activity`
- `Building`

Current user-facing language:

- `On-site now`
- `LineUp read`
- `Quiet` for zero/reset state

Reason:

Many bars have patios, decks, rooftops, outdoor areas, or hybrid spaces. `Inside` is too literal. `On-site` covers the whole venue footprint.

Function:

```js
function insideRead(n)
```

Even though the function name is still `insideRead`, the UI language is now `On-site now`.

Current behavior:

- If `n <= 0`, return `Quiet`.
- If `n < 80`, round to nearest 5.
- If `n < 250`, round to nearest 10.
- If `n < 500`, round to nearest 25.
- Otherwise round to nearest 50 and add `+`.

Product reason:

The app avoids using `estimate` because that sounds inaccurate. The better language is a confident "LineUp read."

Potential future improvement:

- Rename `insideRead` to `onsiteRead` internally.
- Rename `heads` to `onsiteCount` or `venueLoad`.
- Keep migration logic for old saved data.

## Line Wait

The card and detail view show line wait.

Display:

- If wait is greater than zero: `20 Min`
- If wait is zero: `No Line`

Line wait is a core decision signal and should stay prominent.

Potential future improvement:

- Add wait confidence.
- Add line direction/entrance notes.
- Add separate `Cover` or `Cover charge` signal.
- Add "moving fast" versus "not moving" reports.

## Closing Time Logic

Closing time is intentionally prominent.

Function:

```js
function closingInfo(b)
```

Current behavior:

- If open and more than 2 hours from close: `Closes at 2 AM`
- If open and within 2 hours: `Closes in 1h 42m`
- If open and within 45 minutes: `Closing soon · 38m left`
- If closed: `Closed · Opens 8 PM`

The detail header also shows a supporting `detail` string:

- `Closes at 2 AM`
- `Opens at 8 PM`

Time zone:

- Uses `America/Phoenix` in `tucsonNow()`.

Important note:

Arizona does not observe daylight saving time like most states, so using `America/Phoenix` is correct for Tucson time handling.

Potential future improvement:

- Use a backend venue schedule table.
- Support day-specific hours.
- Support temporary closures.
- Support special events.
- Support holiday hours.

## Area Tabs

Top-level tabs:

- `Main Gate`
- `4th / Downtown`

Internal values:

- `curTab = "U"`
- `curTab = "P"`

The active tab controls which venues render in the list.

Potential future improvement:

- Rename `P` to a clearer internal value.
- Add `All`, `Favorites`, or `Nearby` tab.
- Add location-based sorting.

## List View

Function:

```js
renderList()
```

Responsibilities:

- Reset closed bars when necessary.
- Hide detail view.
- Show list view.
- Show area tabs.
- Set active tab styling.
- Filter venues by current tab.
- Sort favorites to top.
- Render venue cards.
- Bind favorite button clicks.
- Bind card clicks to open detail view.

List card contents:

- Logo tile
- Venue name
- Close badge
- Venue tag
- Favorite button
- Crowd meter
- Crowd level
- Line wait
- On-site activity read
- Freshness

Sorting:

Favorites first, then alphabetical by venue name.

Potential future improvement:

- Sort by live relevance instead of alphabetical.
- Add "best right now" ranking.
- Add venue status confidence.
- Add "new reports" indicator.

## Detail View

Function:

```js
renderDetail()
```

Responsibilities:

- Hide list view.
- Hide area tabs.
- Render venue header.
- Render selected detail tab.
- Bind back button.
- Bind favorite button.
- Bind tab buttons.
- Bind live form.
- Bind highlight form.

Detail tabs:

- `Tonight`
- `Highlights`

Removed:

- A previous `Stats` tab was removed because it was redundant.

Tonight tab includes:

- Reset note
- On-site now stat
- Line wait stat
- Freshness stat
- Photos section
- Line Photos collapsed panel
- Venue Photos collapsed panel
- Submit Live Report form
- Comments
- LineLeap section

Highlights tab includes:

- Persistent highlights note
- Photo grid
- Add Highlight Photo button
- Quality rule note
- LineLeap section

## Photo System

There are currently three photo categories:

1. Line Photos
2. Venue Photos
3. Highlights

### Line Photos

State key:

- `livePhotos`

User-facing label:

- `Line Photos`

Purpose:

- Show current line conditions.
- Help users decide whether to go or skip.

Empty state:

- `No line photos yet.`
- `Upload one from outside the venue.`

Upload button:

- `Add Line Photo`

Toast:

- `Line photo added`

Reset behavior:

- Clears after venue closes.

### Venue Photos

State key:

- `insidePhotos`

User-facing label:

- `Venue Photos`

Purpose:

- Show what the venue looks like from the floor, patio, rooftop, or deck.
- Avoid using the word `inside` because some venues are partly outdoor.

Empty state:

- `No venue photos yet.`
- `Upload one from the floor, patio, or deck.`

Upload button:

- `Add Venue Photo`

Toast:

- `Venue photo added`

Reset behavior:

- Clears after venue closes.

Potential future improvement:

- Rename internal state from `insidePhotos` to `venuePhotos`.

### Highlights

State key:

- `highlights`

Purpose:

- Persistent memories from the night.
- They do not clear with live stats.

Upload button:

- `Add Highlight Photo`

Toast:

- `Highlight saved`

Current quality rule:

- Photos under 720px wide or tall are rejected.

Important UX decision:

Line and venue photos are collapsed by default. They are not visible as open grids on the main detail screen. This prevents low-quality user photos from degrading the premium look of the app.

Collapsed panel function:

```js
photoPanelHTML(title, arr, emptyText, inputId, buttonId, buttonText)
```

Collapsed row shows:

- Title
- Photo count
- `View` or `Hide`

Example:

- `0 Photos · View`

Potential future improvements:

- Add photo moderation.
- Add delete/report controls.
- Add separate camera capture flow.
- Add server-side image compression.
- Store images in object storage instead of localStorage.
- Add blurred placeholders.
- Add "recent" timestamps.

## Comments

Comments are stored per venue in `cmts`.

Comment object:

```js
{
  n: "Maya R.",
  t: "Line is wrapped past Frog & Firkin.",
  a: 6
}
```

Fields:

- `n`: name
- `t`: text
- `a`: age in minutes

Seeded examples:

- `Line is wrapped past Frog & Firkin.`
- `Upstairs is at capacity right now.`
- `Line is moving steadily.`
- `High traffic for the Thursday special.`
- `Side entrance moved quickly.`

Empty state:

- `No live comments yet — resets after close.`

Reset behavior:

- Clears after venue closes.

Potential future improvements:

- Add moderation.
- Add profanity filtering.
- Add report abuse.
- Add verified user badges.
- Add vote/useful reactions.
- Add comment categories such as line, cover, vibe, bouncer, music.

## Live Report Form

Function:

```js
bindLiveForm(st)
```

Fields:

- Crowd level picker
- Name input
- Comment textarea
- Post Report button

Crowd buttons:

- `DEAD`
- `SLOW`
- `BUSY`
- `PACKED`

Behavior when posting:

- If no crowd level and no text, show toast:
  - `Select a crowd level or add a comment`
- If crowd level selected:
  - Update `st.lvl`
  - Recalculate `st.heads`
  - Recalculate `st.wait`
- Set freshness to `1`
- Add comment if text exists
- Save local state
- Re-render detail
- Scroll to top
- Show toast:
  - `Report posted`

Prototype count logic:

- Uses crowd level percentage and random variation to create an on-site read.

Potential future improvement:

- Replace random local simulation with backend aggregation.
- Track actual report timestamps.
- Weight reports by user trust.
- Add report confidence.

## Favorites

Favorites are stored locally.

Storage key:

- `lineup_favorites`

Functions:

- `loadFavorites()`
- `saveFavorites()`
- `isFav(id)`
- `toggleFav(id)`

Behavior:

- Favorite button toggles venue id in local array.
- Favorites sort to the top.
- Toast messages:
  - `Added to favorites`
  - `Removed from favorites`

Potential future improvement:

- Sync favorites to user account.
- Add favorite alerts.
- Add favorite-only tab.

## Theme System

Default theme:

- Dark

Theme preference:

- Stored in `lineup_theme`

Function:

```js
applyTheme(t)
```

Behavior:

- Applies `data-theme` to the document element.
- Updates theme button icon.
- Saves preference.

Icons:

- Moon/sun style symbols.

Potential future improvement:

- Keep dark-only for brand consistency.
- If light theme remains, polish light mode separately.

## Local Storage

Current storage keys:

- `lineup_state_v1`
- `lineup_state`
- `lineup_favorites`
- `lineup_theme`

Important note:

Photos are stored as base64 strings in localStorage. This is fine for a prototype but not production-safe because localStorage has limited quota and poor binary data handling.

Production recommendation:

- Move photos to Supabase Storage, Firebase Storage, S3, or another object store.
- Store metadata in database rows.

## Nightly Reset Logic

Functions:

- `todayKey()`
- `resetClosedBars()`

Behavior:

When a venue is closed and has not reset for the current day:

- `lvl` becomes `dead`
- `heads` becomes `0`
- `wait` becomes `0`
- `fresh` becomes `120`
- `cmts` becomes empty
- `livePhotos` becomes empty
- `insidePhotos` becomes empty
- `resetKey` becomes today's key

Highlights do not reset.

Potential future improvement:

- Reset based on venue operating window, not just calendar date.
- Use backend scheduled jobs.
- Preserve analytics before reset.

## LineLeap Integration

LineLeap is intentionally secondary. It should not be the main action because users should stay in LineUp and consume LineUp's value first.

Current placement:

- Near the bottom of detail pages
- After reports/photos/comments

Section copy:

- `Need to skip the line?`
- `Check LineLeap after reviewing live reports, photos, and comments in LineUp.`
- Button: `Open LineLeap Jump`

Function:

```js
lineLeapUrl(b)
```

Behavior:

- If a venue has a verified direct LineLeap URL, use it.
- Otherwise use LineLeap ticket search:
  - `https://tickets.lineleap.com/search?search=VENUE Tucson`

Verified direct LineLeap pages:

- Gentle Ben's
- The Blind Pig
- FUKU Sushi

Direct URLs:

```js
Gentle Ben's:
https://tickets.lineleap.com/venues/x8A6Qq18onI9LuD9iTvJ

The Blind Pig:
https://tickets.lineleap.com/venues/68qkdDCFpSfoYYohyZtx

FUKU Sushi:
https://tickets.lineleap.com/venues/YFkL5bY30v4tP9bjs6ic
```

Potential future improvement:

- Verify and add direct pages for every supported venue.
- Track outbound click conversion.
- Open LineLeap in a way that does not make users forget LineUp.
- Consider affiliate/partner revenue only after retention is proven.

## PWA Manifest

File:

- `manifest.webmanifest`

Current values:

- `name`: `LineUp`
- `short_name`: `LineUp`
- `description`: `Know the line, crowd, and vibe before you go out around U of A.`
- `id`: `./`
- `start_url`: `./index.html`
- `scope`: `./`
- `display`: `standalone`
- `display_override`: `["standalone", "minimal-ui", "browser"]`
- `orientation`: `portrait`
- `background_color`: `#080807`
- `theme_color`: `#080807`
- `categories`: `social`, `lifestyle`, `navigation`

Icons:

- SVG icon
- 192 PNG icon
- 512 PNG icon
- maskable 512 PNG icon

The manifest was adjusted for GitHub Pages by using a relative `id`.

## Service Worker

File:

- `sw.js`

Current cache:

- `lineup-pwa-v11`

Cached app shell:

- `./`
- `./index.html`
- `./manifest.webmanifest`
- `./offline.html`
- icons
- brand assets

Install behavior:

- Opens cache.
- Adds app shell.
- Calls `self.skipWaiting()`.

Activate behavior:

- Deletes old caches.
- Calls `self.clients.claim()`.

Fetch behavior:

- Only handles GET requests.
- Navigation requests are network-first.
- If navigation network fails, use cached `index.html`.
- If that fails, use `offline.html`.
- Asset requests are cache-first, then network.
- Successful asset responses are cached.

Potential future improvement:

- Add explicit cache busting strategy.
- Add update prompt.
- Add version display.
- Avoid caching broken external responses.

## Offline Page

File:

- `offline.html`

Purpose:

- Friendly fallback when the app cannot load.

Content:

- App mark
- Heading: `LineUp is offline`
- Message: `The app shell is saved on this phone, but live nightlife data needs a connection.`
- Link: `Try again`

## GitHub Pages Setup

File:

- `.nojekyll`

Purpose:

- Tells GitHub Pages to serve files directly without Jekyll processing.

Hosting steps:

1. Push repo to GitHub.
2. Go to repo settings.
3. Open Pages.
4. Source: deploy from branch.
5. Branch: `main`.
6. Folder: `/root`.
7. Save.

Expected URL:

```text
https://hunterbice.github.io/LineUp/
```

Phone install steps:

1. Open URL in Safari on iPhone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch LineUp from home screen.

Android install:

1. Open URL in Chrome.
2. Use install prompt or browser menu.
3. Add to home screen.

## README

File:

- `README.md`

Purpose:

- Short project overview.
- Local run instructions.
- GitHub Pages instructions.
- Runtime file list.

## Git Ignore

File:

- `.gitignore`

Ignored:

- `.DS_Store`
- `*.log`
- Local QA screenshots

Reason:

The screenshot files are useful locally but do not need to ship with the app.

## Current Product Copy

Header:

- `LineUp`
- `Tucson Nightlife · Live Venue Status`
- `LIVE`

Tabs:

- `Main Gate`
- `4th / Downtown`

Detail tabs:

- `Tonight`
- `Highlights`

Metrics:

- `Crowd`
- `Line`
- `On-site now`
- `Freshness`
- `LineUp read`

Photo labels:

- `Line Photos`
- `Venue Photos`
- `Add Line Photo`
- `Add Venue Photo`

Report labels:

- `Submit Live Report`
- `Post Report`
- `Name`
- `Line length, cover, notes...`

LineLeap:

- `Need to skip the line?`
- `Check LineLeap after reviewing live reports, photos, and comments in LineUp.`
- `Open LineLeap Jump`

Tone rules:

- Professional capitalization.
- Avoid casual lowercase.
- Avoid emojis as product UI where possible.
- Avoid sounding like a teenager texting.
- Avoid saying `estimate`.
- Avoid implying a venue is completely empty.

## Current Known Issues

### No Backend

All data is local to the browser. Reports, comments, favorites, and photos are not shared between users.

### Photo Storage

Photos are base64 in localStorage. This can hit browser quota quickly.

### Freshness

Freshness is stored as a number of minutes, not a timestamp. It does not age naturally unless app logic updates it.

### Moderation

No moderation exists for comments or photos.

### Identity

No user accounts or trust scores exist.

### Accessibility

Some buttons could use improved ARIA labels. Some clickable card behavior may need keyboard support.

### Single File Architecture

`index.html` contains all HTML, CSS, and JS. This is workable for a prototype but should be split for production.

### Venue Accuracy

Hours, venue list, and LineLeap links should be regularly verified.

### Stale Local Storage

Users may have older local storage shapes. `ensureV1Data()` currently patches missing arrays, but bigger schema changes should include migration logic.

## Recommended Backend Data Model

Possible tables:

### `venues`

- `id`
- `name`
- `area`
- `slug`
- `tagline`
- `address`
- `lat`
- `lng`
- `logo_url`
- `open_time`
- `close_time`
- `lineleap_url`
- `active`
- `created_at`
- `updated_at`

### `venue_status`

- `id`
- `venue_id`
- `crowd_level`
- `onsite_count`
- `line_wait_minutes`
- `confidence`
- `updated_at`

### `reports`

- `id`
- `venue_id`
- `user_id`
- `crowd_level`
- `line_wait_minutes`
- `comment`
- `created_at`
- `source`

### `photos`

- `id`
- `venue_id`
- `user_id`
- `type`
- `url`
- `caption`
- `status`
- `created_at`

Photo types:

- `line`
- `venue`
- `highlight`

Photo statuses:

- `pending`
- `approved`
- `hidden`
- `reported`

### `comments`

- `id`
- `venue_id`
- `user_id`
- `body`
- `status`
- `created_at`

### `users`

- `id`
- `display_name`
- `trust_score`
- `created_at`

### `favorites`

- `id`
- `user_id`
- `venue_id`
- `created_at`

### `moderation_events`

- `id`
- `target_type`
- `target_id`
- `action`
- `reason`
- `created_at`
- `created_by`

## Suggested Tech Stack For MVP

Option 1: Supabase

- Postgres database
- Row-level security
- Auth
- Storage
- Realtime updates

Option 2: Firebase

- Firestore
- Firebase Auth
- Firebase Storage
- Hosting

Option 3: Static plus Airtable/Sheets admin

- Faster but less scalable.

Recommendation:

Use Supabase for a serious MVP. It gives relational data, realtime subscriptions, and storage in one system.

## Product Roadmap

### Phase 1: Public PWA

- Host on GitHub Pages.
- Test on phone.
- Share with a small user group.
- Validate visual polish and basic flow.

### Phase 2: Real Data MVP

- Add backend.
- Store reports centrally.
- Store photos in object storage.
- Add timestamps.
- Add basic analytics.
- Add admin ability to adjust venue status.

### Phase 3: Trust Layer

- Confidence score.
- Recent confirmation labels.
- User trust weighting.
- Stale warnings.
- Report validation.
- Photo moderation.

### Phase 4: Growth

- Favorite alerts.
- Push notifications.
- Group sharing.
- Venue partnerships.
- Ambassador strategy.
- Campus launch campaigns.

### Phase 5: Multi-Campus

- Add campus/city model.
- Add venue onboarding system.
- Add admin dashboard.
- Replicate launch playbook.

## Monetization Ideas

Potential revenue:

- Venue-sponsored placements
- Event promotion
- Premium venue dashboard
- LineLeap or ticketing affiliate revenue
- Cover/ticket integrations
- Brand partnerships
- Student ambassador campaigns
- Data insights for venues

Important warning:

Do not make LineLeap or any external partner more important than LineUp's own app experience. The app should become the habit.

## Design Principles Going Forward

Keep:

- Premium dark look
- Clean card layout
- Professional capitalization
- Useful first screen
- Real venue signals
- Close time prominence
- Secondary LineLeap placement
- Collapsed photo panels

Avoid:

- Landing pages as first screen
- Too much red
- Too many emojis
- Visible bad photos
- Redundant tabs
- Overly casual wording
- Saying `estimate`
- Making venues feel judged or shamed

## Copy Ideas To Test

For low on-site read:

- `Quiet`
- `Light`
- `Early`
- `Low`

For on-site read label:

- `On-site now`
- `Venue load`
- `Live count`
- `Current read`

For freshness:

- `Updated 6 min ago`
- `Confirmed 6 min ago`
- `Last read 6 min ago`

For photo rows:

- `Line Photos`
- `Venue Photos`
- `See Photos`
- `View Photos`

For confidence:

- `LineUp read`
- `Live read`
- `Recently confirmed`
- `High confidence`

## Specific Future Tweaks

High-value UI tweaks:

- Consider replacing `DEAD` with `LIGHT`.
- Add a "Best right now" sort.
- Add color restraint to the crowd meter.
- Make cards slightly more scannable on small phones.
- Add a small confidence indicator.
- Add "cover" and "music" notes.
- Add "line moving" status.

High-value product tweaks:

- Add backend.
- Add real-time status sync.
- Add anonymous user IDs.
- Add moderation.
- Add photo compression.
- Add admin controls.
- Add analytics.

High-value brand tweaks:

- Refine app icon.
- Create consistent venue logo treatments.
- Replace base64 logo blob with asset files.
- Add a stronger LineUp wordmark if needed.

## Instructions For Future AIs

Before changing the app:

1. Read this file.
2. Read `README.md`.
3. Inspect `index.html`.
4. Preserve the mobile-first PWA behavior.
5. Preserve the premium, professional tone.
6. Keep LineLeap secondary.
7. Keep the venue list as the first screen.
8. Avoid adding a landing page.
9. Avoid making photos visible by default.
10. Avoid saying `estimate`.
11. Use `On-site now`, not `Inside now`.
12. Use `Venue Photos`, not `Inside Photos`.
13. Avoid casual lowercase copy.
14. Test on localhost after changes.
15. Bump `CACHE_NAME` in `sw.js` after user-visible PWA changes.

## Current Local Run Command

From the project folder:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/index.html
```

Use cache-busting query strings while testing:

```text
http://127.0.0.1:4173/index.html?v=latest
```

## Current Git Notes

The project has been initialized as a git repository.

Initial commit:

- `Initial LineUp PWA`

Remote:

- `https://github.com/hunterbice/LineUp.git`

GitHub Desktop is recommended for pushing if Terminal authentication is difficult.

After future local changes:

1. Commit in GitHub Desktop.
2. Push origin.
3. Wait for GitHub Pages to rebuild.
4. Refresh the Pages URL.
5. On phone, refresh or reinstall if the PWA cache is stubborn.

## Final Current Status

LineUp is currently a strong front-end PWA prototype. It is ready for phone testing through GitHub Pages once pushed and Pages is enabled. It demonstrates:

- The core nightlife decision flow
- Venue status cards
- Detail pages
- On-site read language
- Line wait
- Close timing
- Live reports
- Comments
- Collapsed photo panels
- Venue photos
- Highlights
- Favorites
- LineLeap links
- Offline app shell
- Installable PWA behavior

The next major step is not more UI polish. The next major step is backend-backed live data, moderation, photo storage, and analytics.
