# Location Permission Review

Canonical detail: `docs/native-location-services-spec.md`.

## Current Product Rule

- Location is optional.
- Education appears before the real system prompt.
- A custom LineUp button tap is not authorization truth.
- University of Arizona and area browsing work without location.
- Without location, structured reports submit as unverified account reports.
- Individual location is not public or exposed raw to venue operators.

## Native Swift Direction

Use Core Location with When In Use authorization only. Do not copy browser geolocation or browser permission APIs. Do not request Always/background location in Swift v1.

Recommended purpose string:

> LineUp uses your location while the app is open to show nearby venues and improve aggregate crowd accuracy. You can use LineUp without location by selecting your campus manually.

## Review Test

1. Decline location permission.
2. Confirm University of Arizona remains selected.
3. Open Live, Deals, venue detail, favorites, and Profile.
4. Submit an unverified structured report.
5. Confirm permission does not loop and exact location is not publicly displayed.

## Open P0 Decision

The current backend stores exact and rounded foreground presence coordinates but has no repository-defined routine retention job. Approve retention, aggregation/deletion, and native sampling before full Swift implementation.
