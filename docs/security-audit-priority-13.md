# Priority 13 Security and Abuse Readiness Audit

Audit baseline: `c27fe11` on `main` with a clean working tree. Final audit date: 2026-06-23.

This ledger records evidence, including failed checks. `PASS` and `FIXED` mean the named source was inspected and the listed proof was run; they do not mean a control was inferred from frontend behavior.

| Item | Files/schema inspected | Commands/tests run | Finding | Action taken | Status |
| --- | --- | --- | --- | --- | --- |
| Temporary owner QA cleanup | `/tmp/lineup-owner-qa.json`; Supabase Auth; `venue_admins` for temp user `f4e43292-9fc3-4341-a933-cc48af860fd3` | Scoped service-role cleanup; post-delete Auth/role queries; temp-file checks | One interrupted-QA owner user and one null-venue owner role existed. No venue, deal, status, analytics, report, subscription, or crowd row had been changed. | Deleted role and user, removed credential file, verified zero matching users/roles. Later privileged QA runs also cleaned users, roles, profiles, devices, and scoped issuance logs in `finally`. | FIXED |
| Secrets/frontend bundle audit | `.gitignore`, `.env.example`, `.mcp.json`, workflow, Vite/config, public assets, repo/history, `dist/` | Redacted `rg`; `git log -S`; env-history/file inventory; `npm run build`; built-bundle private marker scan | No service role, provider private key, owner code, password, or bearer secret found in tracked source/history/bundle. History hits were placeholders or server-side env variable names. Public Supabase/Mapbox identifiers remain expected browser values. | Kept env files ignored; documented rotation rule; no rotation required by repository evidence. | PASS |
| Supabase tables/RLS/grants | All 41 migrations; 24 public tables; policies/grants; migration `202606190001`; remote migration list | `smoke:security`; `smoke:source`; `supabase db push --dry-run`; migration push; live REST denial probes | RLS was enabled on all migration-created tables, but legacy direct insert policies/grants allowed browser bypass for reports, app signals, and analytics. Other server-owned tables retained unnecessary mutation grants. | Dropped direct policies; revoked browser mutation privileges across server-owned tables; preserved public reads and RLS-gated deal edits only. Remote migration parity confirmed through `202606190002`. | FIXED |
| RPC/function audit | All SQL functions; 13 local/deployed Edge Functions; downloaded deployed BestTime source | Function/grant searches; SECURITY DEFINER search-path assertion; `supabase functions list/download/deploy`; live endpoint probes | `venue_deal_performance` inherited default `PUBLIC` execute; deployed BestTime source was initially absent and revealed config availability before auth. All SECURITY DEFINER blocks pin `search_path`. | Added source for BestTime import; auth/owner/rate limits; revoked PUBLIC/anon performance RPC execute; explicitly scoped helper/RPC grants; deployed all affected functions. | FIXED |
| Owner/staff access control | owner/staff controllers/renderers; account role sync; `owner-actions`, `owner-dashboard`, `venue-status-ingest`, deal RLS | Static authorization assertions; live normal-user and staff-A/venue-B probes; self-cleaning owner/staff mobile UI QA | Frontend gating was UX-only and backend role checks existed. Cached permissions could spoof privileged UI until refresh. Staff venue scope was enforced server-side. | Removed cached permissions/auth truth; kept backend role hydration; verified normal user denial, owner/staff Control rendering, venue-B denial, and no console errors. | FIXED |
| IDOR/BOLA tests | `account-sync`, `device-profile-summary`, role/deal/performance policies, live security script | Two temporary-user live test: profile/favorites isolation, cross-device summary, forged user ID, staff-A/venue-B status and analytics, owner denial, role self-assignment; automatic cleanup | `device-profile-summary` previously accepted arbitrary device IDs without auth/device ownership. | Require auth, signed device proof, and `user_devices` ownership; strip raw device ID; live IDOR/BOLA suite passes and removes users/roles. | FIXED |
| localStorage/cache-only audit | `cacheState.js`, `main.js`, all `src/**/*.js` | Direct-storage scan in source/security smoke; key-content assertions | Custom local cache restored auth, roles, reward/profile summaries, profile photo/preferences, presence, and redemption activity. | Removed sensitive cache reads/writes; clear legacy sensitive keys on boot; retain only harmless UI/ID/timestamp/device-session caches. | FIXED |
| Analytics abuse audit | analytics service/controller/render; analytics table/RLS; new ingest; app-event and location ingest | Static metadata/attribution/rate assertions; live direct-insert denial; live app endpoint denial | Browser analytics wrote directly; app events and presence could rotate client device IDs; duplicate/cost controls were incomplete. | Added authenticated signed-device analytics Edge Function, sanitization, location-key stripping, deal/venue validation, per-device/user limits, impression dedupe; require device proof for app events and all location actions. | FIXED |
| Dependency audit | `package.json`, `package-lock.json`, import usage | `npm audit --json`; `npm outdated`; package-use search; final `npm audit --audit-level=high` | Vite 8.0.14 matched a high-severity Windows path-denial advisory. All direct packages are used; lockfile tracked. | Patched only Vite to 8.0.16. Final audit: zero vulnerabilities. | FIXED |
| Production safety docs | `docs/production-safety.md` | Content review | No consolidated destructive-operation, restore, secret, incident, or release guardrail existed. | Added production database, AI-agent, backup/restore, secret, incident, and release rules. | FIXED |
| Prelaunch checklist | `docs/prelaunch-security-checklist.md` | Content review | Security release checks were spread across prompts/tests. | Added bundle, RLS, IDOR, abuse, privacy, dependency, recovery, billing, and release gates plus safe curl templates. | FIXED |
| Verification commands | Test scripts, production Supabase, v70 assets | Full required chain, `npm test`, live security smoke, privileged UI QA, dependency audit | Early runs caught stale v69 assertion, unauthenticated BestTime config leak, default PUBLIC RPC execute, auth-gate timing in QA, and logged-out reward 401. | Fixed each issue and reran. Final required and live suites pass. | PASS |

## Table Inventory

All 24 migration-created public tables have RLS enabled. Migration `202606190001` removes browser mutation grants from every server-owned table listed below; Edge Functions use service-role access only after validation.

| Table | Sensitive/PII | Read surface | Write authority | Risk/result |
| --- | --- | --- | --- | --- |
| `venues` | No | Public venue catalog | Owner Edge Function/service only | Public read intentional; browser mutation revoked. |
| `live_status` | No personal data | Public current venue status | Scoring/owner/staff Edge paths | Direct browser update/insert revoked. |
| `reports` | User ID, note, device/location-verification context | Redacted `reports-feed`; no raw public table read | Location/report Edge path | Direct insert policy removed. |
| `venue_admins` | Account roles | Own/authorized role lookup | Owner/service only | Self-assignment denied live. |
| `reward_events` | User/device reward history | Own user | Reward Edge Function | Direct minting revoked. |
| `confidence_sources` | No | Public labels/config | Service/owner backend | Browser mutation revoked. |
| `venue_confidence_signals` | Signal metadata; may reference reports/check-ins | Public rows only where policy allows | Ingest/scoring service | Browser mutation revoked. |
| `reporter_reliability` | User/device-derived score | Own user/owner | Service scoring | RPC and table writes locked. |
| `venue_hourly_priors` | No | Public typical patterns | Owner/import service | Browser mutation revoked. |
| `app_signal_events` | User/device interaction metadata | Owner only | App-event Edge Function | Signed-device/auth/rate controls; direct insert removed. |
| `ground_truth_observations` | Potential operator notes | Owner only | Owner/service | Browser mutation revoked. |
| `besttime_venue_map` | Provider IDs | Owner only | Owner import service | Browser mutation revoked. |
| `source_import_runs` | Import errors/operator metadata | Owner only | Import service | Browser mutation revoked. |
| `presence_snapshots` | Precise/rounded location, user/device | Owner operations only | Location Edge Function | Auth + signed device + rate limit. |
| `venue_checkins` | User/device/location distance | Owner/user-derived operations | Location Edge Function | Auth + signed device; browser mutation revoked. |
| `reward_redemptions` | User reward code/status | Own user/owner operations | Reward/owner Edge Functions | Browser mutation revoked. |
| `user_profiles` | Display name, avatar, preferences | Own user/owner | Account Edge Function | No custom local cache; cross-user read denied live. |
| `user_devices` | Account/device association | Own user/owner | Account Edge Function | Cross-device profile access denied live. |
| `user_favorites` | User preferences | Own user/owner | Account Edge Function | Cross-user read denied live. |
| `owner_audit_logs` | Security actors/action metadata | Owner only | Service functions | Browser mutation revoked; logs avoid secrets/raw body. |
| `venue_staff_codes` | Hashed/managed staff credentials | Owner only | Owner service | No browser mutation; shared prototype codes not used. |
| `venue_deals` | Venue marketing content | Active/current rows public; assigned role edit | Authenticated venue role via RLS | Only intentional browser write; plan/promotion and venue scope enforced. |
| `venue_subscriptions` | Commercial plan state | Assigned roles only | Owner Edge Function/service | Anonymous reads and browser writes denied. |
| `venue_analytics_events` | User/device interaction metadata | Assigned venue aggregate/raw policy scope; aggregate RPC preferred | Analytics Edge Function | Direct inserts removed; signed-device/auth/rate/dedupe controls. |

## RPC Inventory

| Function/group | Security/exposure | Data/action | Result |
| --- | --- | --- | --- |
| `touch_updated_at()` | Trigger; fixed `search_path` | Timestamp only | PASS. |
| `private.is_lineup_owner()`, `private.can_manage_venue(text)` | SECURITY DEFINER; fixed path; explicitly scoped grants | Role checks used by RLS | PASS; no client role parameter trusted. |
| `private.venue_has_deal_plan(text)`, `private.can_promote_venue_deal(text,text)` | SECURITY DEFINER; fixed path; RLS helpers | Subscription/promotion eligibility | PASS. |
| `private.analytics_deal_matches_venue(uuid,text)` | SECURITY DEFINER; fixed path | Deal/venue attribution | PASS; also validated in Edge ingest. |
| `crowd_bucket_to_score`, `score_to_crowd_bucket`, `score_to_confidence_band`, `crowd_bucket_index` | Pure SQL helpers | No private rows/mutation | Low risk/PASS. |
| `preview_venue_live_score(text,timestamptz)` | Fixed path; explicit anon/auth execute | Aggregate venue score preview | Public venue result only; PASS. |
| `recompute_venue_live_status`, `recompute_all_live_status` | SECURITY DEFINER; fixed path; revoked public/anon/auth execute | Writes derived status | Service/trigger only; PASS. |
| Recompute/report/check-in trigger functions | SECURITY DEFINER; fixed path; direct execute revoked | Derived confidence/reliability updates | Trigger/service only; PASS. |
| `submit_venue_status_update(...)` | SECURITY DEFINER; fixed path; all browser execute revoked | Legacy status mutation | Locked; Edge path used instead. |
| `recompute_reporter_reliability(text)`, `get_device_profile_summary(text)` | SECURITY DEFINER; fixed path; service role only | User/device quality summary | Edge wrapper enforces authenticated device ownership. |
| `venue_deal_performance(text)` | SECURITY DEFINER; fixed path; authenticated only; internal venue role check | Aggregate counts only | PUBLIC/anon execute revoked; cross-venue returns no data. |

## Edge Function Inventory

| Function | Authorization and scope | Writes/returns | Result |
| --- | --- | --- | --- |
| `device-session` | Origin validation; issuance rate limit | Signed opaque device/session token; audit event | FIXED. |
| `account-sync` | Auth + signed device; uses auth user ID | Own profile/device/favorites/permissions | PASS. |
| `app-event-ingest` | Auth + signed device + per-user/device limits | Sanitized app event | FIXED. |
| `venue-analytics-ingest` | Auth + signed device + limits + active venue/deal match | Sanitized append-only analytics | ADDED/FIXED. |
| `location-ingest` | Auth + signed device for every action + distance/rate validation | Presence/check-in/report and derived signals | FIXED. |
| `device-profile-summary` | Auth + signed device + account/device binding | Redacted own profile summary | FIXED. |
| `reports-feed` | Public read endpoint; origin/method/venue validation; bounded result | Redacted public report rows | PASS. |
| `reward-ledger` | Auth + signed device + proof/rate rules | Own rewards/redemptions | PASS. |
| `validate-staff-code` | Auth/account role + origin + failed-attempt rate/audit | Venue permissions only | PASS. |
| `venue-status-ingest` | Auth role scoped to requested venue + failed-attempt rate/audit | Venue signal and backend-confirmed status | PASS. |
| `owner-actions` | Authenticated owner role + failed-attempt rate/audit | Owner mutations/details | PASS. |
| `owner-dashboard` | Authenticated owner/admin role + failed-attempt rate/audit | Owner operating summaries/raw operational rows | PASS for owner-only surface. |
| `besttime-prior-import` | Auth then owner role, origin, hourly rate limit | Provider priors/import audit | FIXED; source retrieved and versioned. Provider key currently not configured. |

## Security Findings and Fixes

1. Browser clients could bypass report/app-event/analytics validation with direct table inserts. Fixed with RLS policy removal, grant revocation, and Edge-only ingestion.
2. Device profile summary exposed an IDOR surface through caller-supplied device IDs. Fixed with authenticated signed-device ownership checks and output redaction.
3. App events and foreground presence accepted rotatable device IDs. Fixed by requiring signed device proof; user/device rate limits remain enforced.
4. Analytics lacked a server boundary and practical duplicate/cost controls. Fixed with a dedicated ingest function, sanitization, attribution checks, dual rate limits, and impression dedupe.
5. Device token issuance was unthrottled. Fixed with IP actor throttling and auditable issuance events.
6. BestTime import disclosed configuration state before authorization and lacked rate limiting/source parity. Fixed and deployed.
7. Deal performance inherited PostgreSQL `PUBLIC` execute. Fixed in `202606190002`; live anonymous invocation is denied.
8. Custom localStorage restored authorization and sensitive account-derived state. Removed and legacy keys cleared on boot.
9. Vite 8.0.14 had a high-severity advisory. Patched to 8.0.16; final audit reports zero vulnerabilities.
10. Logged-out bootstrap called `reward-ledger`, producing a background 401. Added an auth guard; final privileged UI QA has no console errors/401 responses.

## Deferred With Reason

1. The existing local Supabase database has migration-history drift: it originally recorded only `202605310000`, `202605310001`, `202606010000`, and `202606010001` while already containing earlier tables. Non-destructive history repair/replay collided with existing `venues`; no local reset was performed. Production is not affected: remote history is aligned through `202606190002`, both pushes succeeded, and production denial tests pass. Rebuild local Supabase from a fresh disposable instance before relying on local migration replay.
2. Direct `supabase db dump --linked --schema public,private` could not resolve the direct database hostname from Docker. Effective production behavior was instead verified with remote migration parity and live REST/RPC/Edge denial tests. Infrastructure DNS should be corrected before using this workstation for backup verification.
3. `BESTTIME_PUBLIC_KEY` is not currently configured, so the owner-only import returns an authenticated `503` after access checks. This is an integration availability item, not an authorization bypass.
4. Supabase backup retention/restore rehearsal, provider billing alerts, and Mapbox domain restrictions require account-console confirmation and remain launch checklist operator tasks.

## Verification Evidence

Final successful commands:

- `npm run smoke:source`
- `npm run smoke:reliability`
- `npm run smoke:pwa`
- `npm run smoke:security`
- `npm run build`
- `npm run smoke:app`
- `npm test`
- `npm run smoke:security:live` with a runtime-only service role key
- `npm audit --audit-level=high` (zero vulnerabilities)
- `supabase db push --dry-run`, then migration pushes for `202606190001` and `202606190002`
- Deployment of all 13 repository Edge Functions
- Self-cleaning mobile privileged UI QA for owner and venue staff

Failed checks retained as evidence:

- Initial security smoke used an incorrect owner-dashboard implementation matcher; corrected to assert the actual database role lookup.
- Local migration replay failed because of pre-existing local history/schema drift; production was not reset or repaired blindly.
- Reliability smoke initially retained v69; updated to v70 and rerun.
- First live smoke exposed BestTime config-before-auth behavior; fixed and redeployed.
- Second live smoke exposed default `PUBLIC` performance RPC execute; fixed by migration and rerun.
- Privileged UI QA initially raced the auth-gate rerender, then exposed a logged-out reward 401; the auth guard was fixed and final QA passed.

## Temporary QA Cleanup Evidence

- Interrupted credential file found and removed: yes.
- Interrupted user ID deleted: `f4e43292-9fc3-4341-a933-cc48af860fd3`.
- Matching interrupted `venue_admins` row deleted: 1.
- Matching auth users and role rows after cleanup: 0.
- Final owner/staff QA temporary users, roles, profiles, devices, and scoped issuance logs after cleanup: 0.
- Production venue/deal/status/report/analytics/subscription/live crowd data modified by privileged UI QA: no.
