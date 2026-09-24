# RaiseContext

Startup fundraising operated through a coding agent, built on [PocketContext](https://github.com/pocketcontext/pocketcontext).

RaiseContext is a new application with its own fundraising data model. It is not a fork of DealContext. Its first intended use is PocketContext's own fundraise, followed by an offering for other startup teams.

## Status

Design scaffold only. Collections, migrations, hooks, the agent skill, tests, and deployment are not implemented. There is no runnable application or public demo yet.

## First release

- Track rounds, investor organizations, people, and investor opportunities.
- Record introduction requests, meetings, research, correspondence, and next actions.
- Distinguish proposed investment, verbal interest, signed commitments, and funds received.
- Prepare meeting briefs, draft follow-ups, and review stalled conversations through an installable agent skill.

See [the initial data model](docs/data-model.md) and [implementation sequence](docs/implementation.md).

## Architecture

PocketContext supplies the application-independent server. RaiseContext will supply collections, migrations, validation hooks, explicit SQL column allowlists, an agent skill, and tests. Reads use authenticated schema and read-only SQL endpoints. Writes use PocketBase's standard REST API.

The first release is one startup's shared fundraising workspace per deployment. Only explicitly provisioned users may access it; ownership assigns responsibility, not private visibility. Humans and agents will use one identity collection. No conventional application frontend is planned.

DealContext can inform authentication, auditing, concurrency protection, client, and deployment patterns. Adapted code must preserve applicable license notices and attribution. RaiseContext will maintain its own tests and server pin once a server revision has been adopted and tested.

## Scope boundaries

The first release excludes investor database subscriptions, automatic message sending, cap-table management, legal document generation, and document hosting. Store references to externally shared documents. Recording correspondence does not send it; drafts remain separate from sent messages.

The public repository must contain no real fundraising records, credentials, tokens, or local databases. Tests and examples use synthetic data. Website sales enquiries about RaiseContext remain in DealContext.
