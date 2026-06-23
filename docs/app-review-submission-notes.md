# Draft App Review Submission Notes

LineUp is in Early Access for its University of Arizona fall launch. It is a real, functional venue-planning utility: users can create an account, select University of Arizona, save venues, request aggregate launch-deal interest, view venue pages and active venue-posted deals, submit structured crowd reports, manage privacy/location preferences, contact support, and initiate account deletion.

Location is optional. Reviewers can decline permission and use the campus/area controls manually. Before the fall launch or when recent data is sparse, LineUp labels venue information as low recent data or a typical pattern rather than presenting synthetic live activity.

No payment, subscription purchase, Stripe checkout, or venue advertising purchase is sold inside the iOS-facing app. Authorized venue accounts may manage already-enabled venue content; commercial arrangements occur outside the app.

## Reviewer steps

1. Open LineUp.
2. Sign in with the non-admin reviewer credentials entered privately in App Store Connect, or create an account if production email confirmation permits it.
3. Confirm University of Arizona and finish Early Access setup.
4. Save a venue from Live.
5. Open the venue detail and request a launch deal when no active deal exists.
6. Open Deals to view current venue-posted deals or the honest empty state.
7. Open Profile to review Preferences, Privacy Policy, Terms, Support, and Account & Access.
8. Open Delete Account to inspect the confirmation flow. The reviewer does not need to complete deletion unless testing that requirement.

## Demo account requirement

Create a disposable, ordinary production user immediately before submission. Enter its email and password only in App Store Connect. Do not grant owner or venue-staff roles and do not commit the credential to source control.

## Expected low-data behavior

Live crowd updates are backend-confirmed. During off-season or sparse periods, the app may show "Low recent data" or "Typical for now." This is intentional and avoids fake live claims.
