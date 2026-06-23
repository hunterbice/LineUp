# Location Permission Review

## Current behavior

- Location is requested only after an explicit user action or when the browser already reports permission as granted.
- Foreground location supports nearby venue discovery, presence signals, check-in verification, and report confidence.
- LineUp remains usable without location: the user selects University of Arizona during setup and can switch between University and Downtown manually.
- The student UI avoids geofence and continuous-tracking language.
- Location data is not shown publicly to other users or sent raw to venue operators.

## Recommended iOS purpose string

> LineUp uses your location to show nearby venues and improve aggregate crowd accuracy. You can use the app without location by selecting your campus manually.

Use this for `NSLocationWhenInUseUsageDescription` in Priority 17. Do not request Always Location for the first submission.

## App Review test

1. Decline location permission.
2. Confirm University of Arizona remains selected.
3. Open Live, Deals, Map, venue detail, favorites, and Profile.
4. Confirm reporting still submits as an unverified account report.
5. Confirm the app never loops the permission prompt or blocks navigation.

## Native-wrapper follow-up

The iOS wrapper must map WebView geolocation to When In Use permission, prevent background collection, and preserve the manual campus path after denial.
