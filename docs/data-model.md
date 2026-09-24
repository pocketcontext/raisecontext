# Initial fundraising model

This is a proposed model, not an implemented schema. Final fields and invariants must be established with migrations and integration tests.

## Records

| Collection | Responsibility |
| --- | --- |
| users | Provisioned human and agent identities; excluded from SQL |
| user_directory | Minimal SQL-readable identity references for attribution and assignment |
| organizations | VC firms and other investor organizations |
| people | Partners, angels, introducers, and other contacts; optional organization |
| rounds | Fundraising campaign, target amount, currency, timing, and status |
| opportunities | One investor's potential participation in one round, stage, owner, next action, and pass reason |
| opportunity_participants | People involved in an opportunity and their roles |
| introductions | Introducer, target person, opportunity, request status, and follow-up |
| activities | Planned or completed meetings, calls, and tasks with owners and dates |
| notes | Research and meeting evidence with source references and verification dates |
| messages | Actual incoming or outgoing correspondence with source and actual timestamp |
| drafts | Proposed correspondence, separate from actual messages |
| commitments | Investor amounts and evidence, distinguishing indicated interest from signed commitments |
| receipts | Dated funds received against a commitment |
| audit_log | Attributed record changes, protected from ordinary user modification |

## Relationships and invariants

- A deployment serves one startup. A round has many investor opportunities.
- An opportunity identifies either an organization or an individual investor. Enforce exactly one investor identity and uniqueness within a round. An individual angel does not require an invented organization.
- Participants link multiple people to an opportunity, independently of the investor identity.
- Initial opportunity stages: research, introduction, contacted, meeting, diligence, decision, closed, and passed. Track financial milestones separately from relationship stages.
- An introduction identifies the introducer and target person; a connection alone is not evidence of willingness to introduce.
- Activities, notes, correspondence, and drafts link to the relevant opportunity or contact. Validate references and avoid cross-round inconsistencies.
- Research distinguishes sourced statements from assessments. Record source location and verification date; unknown values remain distinguishable from zero or false.
- Proposed opportunity amounts are estimates. Indicated interest is not a signed commitment. Receipts record actual funds received; partial payments remain representable.
- Define cancellation, amendment, and receipt correction semantics before implementing financial totals. Preserve historical evidence and avoid double-counting an indication later signed.
- Monetary values use integer minor units and explicit currencies. Round summaries must identify currency mismatches rather than silently aggregate them.
- Validate related writes transactionally. Reject stale revisions rather than silently overwriting concurrent updates.
- Disable accounts while retaining historical attribution. Ordinary users cannot rewrite audit history.

## Access

All provisioned users share the exposed fundraising workspace. Owners assign work; they do not create privacy boundaries. Do not provision external investors into this shared workspace.

SQL uses explicit column allowlists, excluding authentication and administrative data. REST permissions must independently protect records and privileged writes. If selective external access becomes necessary, design and test a separate access policy before granting it.
