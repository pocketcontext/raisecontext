# Implementation sequence

1. Finalize the first-release schema and invariants. Select a PocketContext revision, build it, and introduce a compatibility pin with the first passing integration suite.
2. Implement identities, organizations, people, rounds, opportunities, and participants. Test explicit provisioning, REST and SQL permissions, relations, and uniqueness using synthetic records.
3. Add introductions, activities, notes, messages, and drafts. Implement attribution, audit history, and revision-checked writes with transaction and concurrency tests.
4. Add commitments and receipts with tested amendment, cancellation, correction, and currency behavior.
5. Build the installable agent skill and client. Cover research provenance, meeting preparation, recording outcomes, follow-up drafts, and fundraise review. Test installation independently of a repository checkout.
6. Add RaiseContext-specific container configuration, CI, backup and restore checks, and deployment documentation. Verify a clean installation against the pinned server.
7. Deploy a private internal workspace and use it for PocketContext's fundraise. Keep real records outside source control and public examples.
8. Add an early-access website offering once the core workflow is usable. Update the application selector, analytics allowlist, examples, and Italian and German translations. Run website typecheck, build, translation checks, and relevant browser checks. A demo link requires a deployed and verified synthetic demo.

Public positioning: startup fundraising through an AI assistant, including investor research, introductions, conversations, and next actions. Do not promise investor access, automatic fundraising, or unimplemented integrations.

Repository creation does not deploy infrastructure or publish a website offering.
