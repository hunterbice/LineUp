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

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `lineup_favorites` | Array of favorited venue IDs |
| `lineup_area` | Last selected area (`main_gate` or `fourth_downtown`) |
| `lineup_install_prompt_dismissed_at` | Timestamp of last "Remind me later" tap |
| `lineup_install_prompt_completed` | Set to `"true"` when user completes install flow |
| `lineup_pwa_installed` | Set to `"true"` when app is opened in standalone mode |
