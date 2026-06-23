# LineUp Prelaunch Security Checklist

## Secrets and Build

- [ ] Search tracked files, ignored env files, MCP/agent config, workflows, Vite config, public assets, and Git history for private credentials.
- [ ] Build production assets and scan `dist/` for service-role keys, private provider keys, passwords, bearer tokens, and owner/staff codes.
- [ ] Confirm only the Supabase publishable key and domain-restricted Mapbox public token are present in the browser bundle.
- [ ] Confirm `.env*` files are ignored except `.env.example`.
- [ ] Rotate any private credential that ever entered Git history or frontend output.

## Supabase Authorization

- [ ] Inventory every public table and confirm RLS is enabled.
- [ ] Review effective policies and grants for `anon`, `authenticated`, `public`, and `service_role`.
- [ ] Confirm browsers cannot directly mutate reports, signals, analytics, rewards, live status, roles, subscriptions, devices, profiles, favorites, presence, or audit rows.
- [ ] Confirm public reads expose only active venue/deal data and explicitly public confidence data.
- [ ] Confirm owner/staff roles cannot be self-assigned.
- [ ] Confirm every `SECURITY DEFINER` function has a fixed `search_path`, scoped grants, and an internal authorization check where needed.
- [ ] Confirm performance RPCs return aggregates, not user/device/location rows.

## Attacker Checks

- [ ] Call owner and staff endpoints without auth; expect `401` or `403`.
- [ ] Call owner analytics for another venue; expect denial.
- [ ] As venue A staff, submit a venue B status/deal update; expect denial.
- [ ] As user A, read user B profile, favorites, device summary, or reward data; expect no rows or denial.
- [ ] Attempt direct role assignment, subscription mutation, live-status mutation, report insert, analytics insert, and reward minting; expect denial.
- [ ] Attempt `is_promoted=true` without an eligible plan; expect RLS denial.
- [ ] Submit an analytics event with a deal from another venue; expect rejection.
- [ ] Confirm anonymous subscription reads return no rows.

Example requests must use placeholders, never real secrets:

```bash
curl -i "$SUPABASE_URL/rest/v1/venue_subscriptions?select=*" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY"

curl -i "$SUPABASE_URL/functions/v1/owner-dashboard" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "content-type: application/json" \
  --data '{}'

curl -i "$SUPABASE_URL/rest/v1/live_status?venue_id=eq.bens" \
  -X PATCH \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "content-type: application/json" \
  --data '{"crowd_level":"packed"}'
```

## Abuse and Cost Controls

- [ ] Verify signed-device proof for reports, check-ins, presence, app events, analytics, rewards, account sync, and device summaries.
- [ ] Verify per-user and per-device limits for report, check-in, presence, app-event, and analytics paths.
- [ ] Verify device-token issuance, staff failures, owner failures, and BestTime imports are rate limited.
- [ ] Verify duplicate deal impressions are suppressed and deal/venue attribution is enforced.
- [ ] Confirm analytics metadata rejects precise location keys, large values, and unsupported types.
- [ ] Set Supabase usage/billing alerts and review Edge Function, database, egress, and auth usage weekly during launch.
- [ ] Add daily analytics aggregation before raw event volume becomes expensive; do not expose raw user analytics to venue staff.

## Client and Privacy

- [ ] Confirm role, auth, profile, rewards, presence, analytics, subscriptions, reports, and live venue truth are not restored from custom `localStorage` keys.
- [ ] Confirm harmless caches contain only IDs/timestamps or UI preferences.
- [ ] Confirm Supabase Auth is the session source of truth.
- [ ] Confirm owner controls are hidden for normal users, while backend denial is independently tested.
- [ ] Confirm logs and error messages contain no tokens, passwords, profile photos, precise coordinates, or private report contents.

## Supply Chain and Recovery

- [ ] Confirm `package-lock.json` is committed.
- [ ] Run `npm audit --audit-level=high` and review `npm outdated`.
- [ ] Remove unexplained or unused dependencies.
- [ ] Confirm production backups and retention.
- [ ] Complete a non-production restore test and record the result.

## Release Gate

- [ ] Review `supabase db push --dry-run` output.
- [ ] Run all static, PWA, build, browser, and live security tests.
- [ ] Verify the deployed service worker version.
- [ ] Verify deployed Edge Function versions and repository parity.
- [ ] Confirm no console errors on account setup, Live, detail, report, favorites/recents, Profile, staff, owner, deals, and performance views.
- [ ] Record commit hash, migration version, function versions, test evidence, and operator approval.
