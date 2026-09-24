# Schema and workflows

The live `schema` endpoint and server validation are authoritative. `schema.json` is the tested SQL schema snapshot.

An opportunity links one round to exactly one investor organization or individual person. Multiple contacts attach through `opportunity_participants`. A round and its opportunities use the same currency. Ownership identifies responsibility within the shared workspace.

Use `organizations` and `people` for contacts, `rounds` for fundraising campaigns, and `opportunities` for progress. `introductions` records an introducer, target person, status, and evidence. `activities` records planned and completed work. `notes` separates research, meetings, and assessments with source and verification date. `messages` records actual correspondence; `drafts` records proposed text.

Monetary values are integer minor units with explicit currency. `proposed_known` distinguishes an unknown opportunity amount from zero. `commitments` distinguish indicated, signed, and cancelled amounts. `receipts` record actual payments against signed commitments; voiding requires a reason. Preserve history when correcting records. Read server errors and current records rather than forcing an inconsistent financial transition.

Every domain record has `revision`, `created_by`, `updated_by`, `created`, and `updated`. The server owns these fields. PATCH bodies include `expected_revision`. `audit_log` is readable but cannot be changed by ordinary users. `user_directory` exposes names and IDs without credentials.

## Common requests

- Investor research: resolve an existing person or organization before adding one. Record factual sources and dates in research notes; keep fit judgments in assessment notes.
- Meeting preparation: join opportunity, round, participants, notes, messages, and outstanding activities. Identify unanswered questions and promised actions.
- Meeting outcomes: record a meeting note, complete the relevant activity, add concrete follow-ups, and update stage only when supported by the outcome. Use a transactional batch for related writes.
- Weekly review: group active opportunities by stage, list overdue next actions, and distinguish missing information from confirmed inactivity.
- Round totals: report indicated commitments, signed commitments, and nonvoid receipts separately. Aggregate each relationship before joining to avoid multiplying amounts across participants or activities.
