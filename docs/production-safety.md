# LineUp Production Safety

## Non-Negotiable Rules

- Never run `supabase db reset`, destructive SQL, bulk deletes, migration-history repair, or project deletion against production without explicit human review.
- Never allow an AI agent or unattended automation to run destructive production commands.
- Treat every migration as production code. Read the complete SQL diff and run `supabase db push --dry-run` before `supabase db push`.
- Confirm the target project reference before any deploy or database operation.
- Never place service-role keys, private provider keys, passwords, or owner/staff secrets in frontend code, committed files, build arguments, screenshots, logs, or issue text.
- Public Supabase publishable keys and public Mapbox tokens are not secrets; they still require RLS and provider-side domain restrictions.
- If a private key reaches frontend code or Git history, revoke and rotate it. Deleting the file is not remediation.
- Run the full smoke suite and dependency audit before production deployment.

## Database Change Procedure

1. Start from a clean, reviewed Git commit.
2. Inspect every pending file in `supabase/migrations/`.
3. Check for destructive statements: `drop`, `truncate`, broad `delete`, type rewrites, constraint removal, RLS disablement, policy broadening, and grants to `public` or `anon`.
4. Run `supabase db push --dry-run` and confirm only expected migrations are listed.
5. Apply migrations during a monitored window.
6. Immediately run the live security smoke and application smoke tests.
7. Confirm owner/staff access, normal-user denial paths, public reads, and current PWA version.
8. Record the migration version, commit, operator, and verification result.

## Backup and Restore

- Keep database backups independent of the application repository and local laptop.
- Confirm the Supabase backup schedule and retention before launch and after plan changes.
- A backup is not trusted until a restore has been tested in a non-production project.
- Test restoration of auth-linked profiles, favorites, reports, roles, rewards, venue data, and owner audit logs.
- Document recovery time and the person authorized to approve restoration.

## Edge Functions and Secrets

- Service-role access belongs only in Supabase Edge Function secrets.
- Every service-role function must validate method, origin, authentication or signed-device proof, input shape, authorization scope, and rate limits before reading or writing private rows.
- Never rely on CORS as authorization. Requests without a browser Origin can still reach an endpoint.
- Keep owner/staff denial logging free of passwords, tokens, precise coordinates, and raw request bodies.
- Review deployed functions against repository source; undeclared deployed functions are a release blocker.

## Incident Response

1. Pause the affected function or write path.
2. Preserve audit logs and timestamps without copying credentials into chat or tickets.
3. Rotate exposed credentials first, then remove them from code/history.
4. Identify affected tables, users, venues, and time range.
5. Restore or correct data through reviewed, reversible SQL.
6. Add a regression test that reproduces the failure before reopening the path.
7. Communicate user impact plainly if personal or location data may have been exposed.

## Required Release Verification

```bash
npm audit --audit-level=high
npm run smoke:source
npm run smoke:reliability
npm run smoke:security
npm run smoke:pwa
npm run build
npm run smoke:app
npm test
```

For security releases, also run `npm run smoke:security:live` with the service-role key supplied only as a temporary environment variable. Never paste that key into the command history or repository.
