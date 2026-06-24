# Swift Feasibility Spike Preflight

This is the exact handoff for the disposable Swift feasibility spike. It is a contract checklist, not Swift code and not approval to start the production app.

## Decision

- **The controlled Swift feasibility spike may start:** yes.
- **The full Swift rebuild may start:** no.
- **Backend mutations made by Priority 18:** none.
- **Why:** the implemented auth, signed-device, account, Live, Deals, reports, location-ingest, and deletion paths are sufficient to test integration. APNs delivery, production avatar object storage, exact-location cleanup, and live authorization verification remain explicit full-rebuild gates.

## Canonical Environment

| Item | Value / source |
| --- | --- |
| Supabase project ref | `bxngqqsxthybjikmwvqj` from `supabase/config.toml` |
| Supabase URL / publishable key | `src/config.js` |
| Backend contract | `docs/native-api-contract.md` |
| Current migration source | `supabase/migrations/` |
| Edge Function source | `supabase/functions/` |
| Current-night boundary | 5:00 AM `America/Phoenix` |
| Privileged credentials | Never stored in the app or spike repository |

Use a non-production Supabase project when available. If the linked project must be used, create disposable ordinary student accounts only and do not fabricate production venue/deal/status rows.

## Required Decisions Before Creating The Spike Target

1. Choose and record a disposable bundle identifier, for example `app.getlineup.LineUpSpike`.
2. Derive one callback URL from that identifier: `<bundle-id>://auth/callback`.
3. Add only that exact callback URL to the Supabase Auth redirect allowlist for the test project. Do not add wildcard redirects.
4. Confirm whether email confirmation is enabled in the test project. The spike must test the actual setting rather than assume a session is returned by sign-up.
5. Use email/password only. No OAuth, magic link, anonymous Supabase auth, or Sign in with Apple is currently a LineUp contract.
6. Decide whether APNs token acquisition is in the timebox. APNs token **sync is not available** and must not be simulated.
7. Decide whether avatar compatibility is in the timebox. The current data-URL path is compatibility-only; production object storage is not ready.

The production bundle identifier and callback URL remain a product/release decision. The example above is not production configuration.

## Spike Contract Order

Run the proof in this order so later results do not hide an earlier contract failure:

1. Configure Supabase Swift with the public URL/key.
2. Prove email/password sign-up, confirmation callback if required, sign-in, relaunch restore, refresh, and sign-out.
3. Obtain a signed installation session from `device-session` with an empty body or empty proof fields.
4. Persist the returned `device_id`, `session_id`, `device_token`, and computed expiry together in Keychain.
5. Call `account-sync` action `claim` with JWT plus signed-device proof.
6. Call `early-access` actions `status` and `join`.
7. Fetch `active_venue_status` using exactly `ACTIVE_STATUS_SELECT` from `src/config.js`.
8. Fetch current active `venue_deals`; apply the documented active-window filter.
9. Fetch `reports-feed` for one current venue.
10. Submit one structured report through `location-ingest`, first without location and then with one foreground Core Location sample if authorized.
11. After submit, refresh `reports-feed`, then refresh Live. Never mutate venue status locally.
12. Call `account-sync` action `update_profile` without an avatar.
13. Optionally prove the current compressed data-URL avatar compatibility path; label the result transitional.
14. Optionally prove iOS notification authorization and APNs sandbox token acquisition; do not call a nonexistent LineUp token-sync endpoint.
15. Call `account-sync` action `delete_account` with `confirm:"DELETE"` for the disposable current user, then clear account and installation secrets from Keychain.

## Native Auth And Session Checklist

- Use Supabase Swift email/password APIs.
- Route the selected custom-scheme callback through the Supabase Swift auth URL handler.
- Keep Supabase access/refresh material in a Keychain-backed session store.
- On foreground/relaunch, ask the SDK for the current session and refresh when necessary.
- On an authentication 401, attempt one SDK refresh and retry once. If refresh fails, clear account session state and show sign-in.
- Keep account JWT/session state separate from LineUp signed-device proof.
- Sign-out clears JWT/profile/role caches. Installation proof may remain across ordinary sign-out for abuse continuity.
- Account deletion clears both account session data and the LineUp installation tuple after the server confirms deletion.
- Never persist password, owner/staff roles as authority, or service-role credentials.

Official Supabase references:

- [Swift auth reference](https://supabase.com/docs/reference/swift/auth-api)
- [Redirect URL allowlist](https://supabase.com/docs/guides/auth/redirect-urls)
- [Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking?platform=swift)

## Signed-Device Checklist

Current server contract:

- Function: `device-session`.
- Request: `{device_id?,session_id?,device_token?}`.
- First issuance: server generates `ldv_*` and `lsn_*` identifiers.
- Renewal: supplied `device_id` plus token must verify; server issues a new 30-day token.
- Token: HMAC-SHA256 payload containing `device_id`, `session_id`, `iat`, and `exp`.
- Validation: token signature, device binding, and expiry are server-checked.
- Renewal margin: five minutes, matching the web reference.

Spike storage recommendation: keep the installation tuple in Keychain using a ThisDeviceOnly accessibility class appropriate to the app's foreground use. Treat all four fields as one replaceable record. Do not store it in UserDefaults.

Recovery behavior:

1. valid tuple: reuse;
2. near expiry: renew with current tuple;
3. invalid/expired 401: erase tuple, request one new server-issued installation, retry the original operation once;
4. repeated failure: stop, show a retryable service error, and log only redacted diagnostics;
5. ordinary logout: retain installation tuple, clear account session/profile/role state;
6. account deletion: clear tuple after confirmed server deletion;
7. reinstall/new device: a new server-issued installation is acceptable; the spike must record observed Keychain reinstall behavior.

The current HMAC format has no per-token server revocation list. A compromised token remains usable until expiry unless the global secret changes. This is a P1 production hardening item, not permission to weaken current verification.

## Explicitly Missing Contracts

### APNs

No `user_push_tokens` table, token-sync Edge Function, sender, or cleanup path exists. The spike may test native authorization and APNs sandbox token acquisition only. It must record the token redacted and must not store it in LineUp's backend. Push delivery remains disabled.

### Profile Photo Object Storage

The current endpoint accepts a compressed JPEG data URL in `user_profiles.avatar_url`. The spike may test this only to prove backward compatibility. Production needs a reviewed Supabase Storage decision, object policy, deletion/orphan cleanup, and URL-read strategy before native photo launch.

### Exact-Location Cleanup

`location-ingest` stores exact and rounded foreground coordinates in owner-only `presence_snapshots`. Account deletion removes linked rows, but no routine cleanup job exists. The spike may use foreground samples from disposable accounts and must delete the test account. Full release requires the retention job described in `docs/native-location-services-spec.md`.

## Required Negative Tests

- wrong password and confirmation-required sign-up;
- expired or corrupted Supabase session;
- missing, corrupted, expired, and mismatched signed-device proof;
- unauthenticated `account-sync`, `early-access`, and report submission;
- report without location and location denied;
- report burst that reaches the documented rate limit;
- expired deal omitted;
- prior-night report omitted at the 5 AM Phoenix boundary;
- delete-account attempt cannot target another user;
- normal user cannot access owner/staff data.

## Evidence Package

The spike exit report must include:

- bundle identifier and exact callback URL used;
- Supabase Auth settings observed, including email-confirmation behavior;
- redacted request/response samples for every called LineUp function;
- decoded model fields and nullability differences;
- Keychain relaunch/renewal/reinstall results;
- 4:59 AM, 5:00 AM, midnight, and clock-skew current-night results;
- Core Location denial/reduced/full-accuracy results;
- APNs acquisition result or explicit skip;
- avatar compatibility result or explicit skip;
- self-delete and cleanup result;
- failures and contract changes required before the full rebuild.

## Preflight Verification Outside The App

Before the spike calls the linked backend, run:

```bash
supabase migration list --linked
supabase functions list --project-ref bxngqqsxthybjikmwvqj
npm run smoke:source
npm run smoke:reliability
npm run smoke:security
```

For the destructive live authorization suite, supply the service-role key without putting it in shell history:

```bash
read -s "SUPABASE_SERVICE_ROLE_KEY?Temporary service-role key: "
export SUPABASE_SERVICE_ROLE_KEY
npm run smoke:security:live
unset SUPABASE_SERVICE_ROLE_KEY
```

Success means the script completes all denial, self-only, aggregate-only, and cleanup probes and exits 0. Any failure blocks promotion from a disposable spike to the full rebuild. Never put the key in source, `.env`, command history, logs, or the native client.
