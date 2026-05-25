# LineUp

LineUp is a mobile-first Progressive Web App for University of Arizona nightlife. It shows venue crowd status, line wait, on-site activity, close time, comments, line photos, venue photos, highlights, favorites, and LineLeap jump links.

## Run Locally

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

## GitHub Pages

This project is a static PWA. To host it with GitHub Pages:

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Set branch to `main` and folder to `/root`.
5. Save.

Your app will be available at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

On iPhone, open that URL in Safari, tap Share, then choose `Add to Home Screen`.

## Runtime Files

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/`
- `brand-assets/`

