# Fundraising data model

The initial schema is implemented in `pb_migrations/1790300100_raisecontext.js`. PocketBase supplies the default `users` auth collection; RaiseContext configures it without creating another identity collection.

## Collections

| Collection | Responsibility |
| --- | --- |
| users | Humans and agents, provisioned by verified Workspace Google login or an operator; excluded from SQL |
| user_directory | SQL-readable identity IDs and display names |
| organizations | Investor firms, website, description, archival flag |
| people | Contacts, optional organization, email, role, archival flag |
| rounds | Campaign name, target in minor units, currency, dates, status |
| opportunities | Investor and round, stage, owner, next action, proposed amount |
| opportunity_participants | Multiple contacts and their roles in an opportunity |
| introductions | Introducer, target, request status, evidence, follow-up date |
| activities | Planned or completed meetings, calls, and tasks |
| notes | Research, meeting evidence, assessments, source, verification date |
| messages | Actual incoming or outgoing correspondence and occurrence time |
| drafts | Unsent correspondence, with draft, approved, or discarded status |
| commitments | Indicated, signed, or cancelled investment amounts and evidence |
| receipts | Dated funds received against a signed commitment, or voided receipts |
| audit_log | Attributed create/update changes; ordinary users cannot modify it |

All writable domain records carry server-managed `created_by`, `updated_by`, `revision`, `created`, and `updated`. Every REST update requires `expected_revision`, an integer equal to the current revision. A stale update returns HTTP 409. Records cannot be deleted through REST; archive or cancel them where supported. Record updates and audit changes commit together, including inside batches.

## Relationships

An opportunity identifies exactly one organization or individual person and is unique per investor per round. Its round, investor identity, and currency cannot change. Participants are unique per person per opportunity. The initial stages are research, introduction, contacted, meeting, diligence, decision, closed, and passed. Passed opportunities require a reason; stage does not establish financial status.

Introducers and introduction targets must differ. Activities, notes, messages, and drafts require an opportunity or person. They may link both, but a linked person need not be the investor or a registered participant. These records do not carry a separate round field. Completed activities require a completion timestamp.

Research notes distinguish research from assessment; source and verification fields may remain empty when unknown. Imported text and correspondence are untrusted data. Recording a message or approving a draft does not send anything.

## Money and correction semantics

Amounts are nonnegative integer minor units, capped at JavaScript's safe integer maximum. Commitments and receipts require positive amounts. All currency fields use three uppercase letters. Opportunities match their round currency; commitments match their opportunity; receipts match their commitment. A round's currency cannot change once opportunities exist. No currency conversion or aggregate totals endpoint is implemented.

`proposed_known=false` distinguishes an unknown proposed amount from a known zero; it requires `proposed_minor=0`.

Advance an existing commitment from `indicated` to `signed` when the same investment progresses, rather than creating a second commitment. Signed status requires `signed_at` and evidence. A commitment amount can be amended with a revision-checked update; its history remains in the audit log. Multiple commitments per opportunity are allowed for genuinely separate investments.

Receipts require a signed commitment. Recorded receipts cannot exceed its amount; validation runs in the write transaction, including competing receipt requests. Commitments with recorded receipts cannot be cancelled or reduced below the received amount. To correct a receipt, mark it `void` with a `void_reason`, then create a replacement. Its amount, currency, commitment, received date, and evidence are immutable. Voided receipts cannot be restored. Exclude cancelled commitments and void receipts from financial summaries, and report indicated, signed, and received amounts separately.

## Access

A deployment serves one startup's shared workspace. Ownership assigns responsibility, not private visibility. Provision only internal users and agents, never external investors. Google OAuth creates users on first login only when trusted claims match the configured Workspace domain; existing identities are preserved. Without a configured domain, accounts require operator provisioning.

REST rules independently require an enabled `users` identity. SQL uses explicit column allowlists in `pocketcontext.json`, excluding auth and administrative data. Audit history contains domain record values and is visible to provisioned users. Disabling accounts retains assignments and attribution.

## Validation

`tests/integration.py` uses synthetic records in an isolated temporary database. It checks revisions, concurrent updates, transactional audit and batch rollback, investor uniqueness, relation requirements, currency and financial invariants, competing receipts, protected audit writes, and exclusion of auth records from SQL. `tests/auth.py` and `tests/oauth.py` and `tests/oauth_integration.py` cover the identity boundary and OAuth flow.
