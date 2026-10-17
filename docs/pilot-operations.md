# School pilot operations

## Implemented first increment

- Principals request an identity/authority check using a public HTTPS school reference and an explanation of their role. The app never fetches the URL. Requests are private to the principal and platform operator; ordinary staff see only status.
- New staff invitations require `verified` status. Existing invitations and memberships retain their original checks. School verification is not accreditation, legal compliance or a security certification.
- Only a database operator can execute `lessonpress.record_verification`. Do not grant this function to `authenticated`, expose the private schema, or call it from a client or service-role application endpoint.
- The school invitation quota is shared in Postgres: 20 successful invitations in a rolling window beginning at the first creation, resetting one hour later. Atomic upsert prevents parallel creations escaping the cap. Failed transactions roll back increments. This is not a complete abuse-control system for every endpoint.
- Principals can paginate activity in descending event-ID order, filter by event, search loaded records and download loaded matching records as JSON. Downloads may contain staff emails. No full data-export or deletion workflow is claimed.
- New saves, submissions and review events include revision metadata. Print requests reuse paper/revision visibility checks before recording the selected copy. Browser print completion cannot be certified. Old events without version metadata stay unchanged.

## Independent school verification

Review pending requests using the database console, not public GitHub issues:

```sql
select v.school_id,s.name,v.public_reference,v.authority_note,v.requested_at
from lessonpress.school_verification v
join lessonpress.schools s on s.id=v.school_id
where v.status='pending' order by v.requested_at;
```

Check the school's existence and the applicant's authority using an independently obtained institutional contact. A website, matching domain or requester-supplied statement alone is not sufficient. Schools using public email providers are eligible for manual checks. Do not request identity documents or student records through the current form.

After completing the actual check, use parameterised SQL in an operator tool to call:

```sql
select lessonpress.record_verification(
  '<school UUID>',
  'verified', -- or changes_requested
  '<actual reviewer name>',
  '<meaningful summary of the independent check, or information still needed>'
);
```

Do not run the placeholders or auto-verify the existing owner school. The function updates only pending requests and appends a system audit event identifying the operator. Review notes are shown to the principal, so exclude confidential contact details. Operators retain administrative access; records are not protected from privileged database administrators.

## Migration and checks

Apply migrations in numeric order, once each. Migration 002 runs transactionally. It adds tables, preserves existing data and replaces the RPC implementation with a wrapper around the original guarded function. It also permits null audit actors for operator events, which carry an explicit operator label instead of attributing an operator decision to a principal.

`node scripts/verify-school-db.js <output.sql>` creates a hosted smoke test that always rolls back fixtures. It checks independent approval, school isolation, audit output and denied application access to operator/bypass functions. Local PGlite tests cover verification/self-approval denial, revision permissions, school-wide invitation caps, expiry/reset and activity filters.

## Dependencies still outstanding

No transactional email sender or custom LessonPress domain is configured. Signup remains restricted by Supabase's existing email delivery. Invitation links are still shared manually. Do not advertise automatic invitation emails or working password recovery.

Complete email-provider provisioning and sender-domain verification first, configure Supabase SMTP and allowed redirects, then implement and verify recovery using provider-supported PKCE or token-hash flows. Do not weaken email confirmation or place recovery tokens in logs. Test expired/reused links and a real mailbox before announcing delivery.

The Marketplace CLI required authentication even for discovery in this environment. No email provider was installed and no billing or DNS changes were made. Select/provision a provider once the owner supplies a domain and connection.

Also outstanding: principal MFA, durable account/generation limits and per-school AI budgets; verified paid AI data configuration; private support/privacy contact; full school export/deletion and retention implementation; backup restore drills. Current Google provider reliability and custom live-generation limitations remain separate work.
