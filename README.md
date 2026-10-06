# RaiseContext

Startup fundraising operated through a coding agent, built on [PocketContext](https://github.com/pocketcontext/pocketcontext). RaiseContext has its own fundraising model and is not a DealContext fork. An authenticated read-only browser reader is available at `/`.

## Application

Track rounds, investors, participants, introductions, activities, research, correspondence and drafts. Commitments distinguish indicated interest from signed amounts; receipts track funds actually received. Writes enforce revisions, attribution, transactional audit history, currency consistency and receipt limits. See [the data model](docs/data-model.md).

One deployment serves one startup's shared fundraising workspace. Owners assign work, not private visibility. With a trusted Workspace domain configured, verified Google identities in that domain receive an account on first login and shared fundraising access. PocketBase's existing default `users` collection serves both humans and agents; RaiseContext does not create another auth collection. Direct public signup remains blocked.

## Build and run

Build the server revision recorded in `POCKETCONTEXT_VERSION`, using the Go version in its `go.mod`, CGO and a C compiler. Keep a separate checkout if your existing server checkout differs from the pin.

```sh
# From a PocketContext checkout at the pinned revision:
make build
# From this application directory:
/path/to/pocketcontext serve --dir ./pb_data --http 127.0.0.1:8090
```

Startup applies migrations. The application directory supplies `pb_migrations`, `pb_hooks` and `pocketcontext.json`. Keep `pb_data` outside Git. Use the administration dashboard at `/_/` for provisioning and maintenance; ordinary application operations use a `users` account.

## Google SSO

Configure a Google OAuth Web application with an Internal audience for your Workspace and these authorized redirect URIs:

- `http://127.0.0.1:8765/callback` for the CLI.
- `https://raise.pocketcontext.com/api/oauth2-redirect` for browser OAuth.

Supply `RAISECONTEXT_GOOGLE_CLIENT_ID`, `RAISECONTEXT_GOOGLE_CLIENT_SECRET` and `RAISECONTEXT_GOOGLE_WORKSPACE_DOMAIN=pocketcontext.com` through private deployment configuration. Both client values must be supplied together. Google credentials are stored in private application settings and backups.

Google login verifies the provider email, Google's verified-email claim, and the exact Workspace domain. With `RAISECONTEXT_GOOGLE_WORKSPACE_DOMAIN` configured, first login creates a `users` account from those trusted claims. Existing accounts retain their identity, assignments and history; client-supplied account fields cannot grant access. With the domain unset, Google login requires an existing account. Password login remains available for accounts with a configured password. Disable an account with the operator-managed `disabled` field to revoke access; account deletion is blocked to preserve attribution. Workspace suspension alone does not revoke an existing application session. Tokens last seven days and the CLI renews active sessions.

## Agent client

Install or copy `skills/raisecontext` to the agent's skill directory. The portable client needs Python 3, a server URL and an ordinary user's Workspace email. Replace `/absolute/path/to/raisecontext-skill` below with the directory containing the installed `SKILL.md`; these commands work from any working directory.

```sh
export RAISECONTEXT_URL=https://raise.pocketcontext.com
export RAISECONTEXT_USER_EMAIL=you@pocketcontext.com
"/absolute/path/to/raisecontext-skill/raisecontext" login --google
"/absolute/path/to/raisecontext-skill/raisecontext" whoami
"/absolute/path/to/raisecontext-skill/raisecontext" check
```

Optional `RAISECONTEXT_USER_PASSWORD` enables password authentication. Never use superuser credentials in the agent client. For SSH login, forward port 8765 from the browser machine. The client stores only the application token in a private cache; provider tokens are not retained.

Reads use authenticated schema and read-only SQL endpoints. Writes use PocketBase REST. Updates include `expected_revision`; stale writes return 409. Related writes can use transactional batches. Drafting or recording a message does not send it.

## Validate

All tests use synthetic records and isolated temporary databases.

```sh
python3 tests/integration.py --binary /absolute/path/to/pocketcontext
python3 tests/tracing.py --binary /absolute/path/to/pinned/pocketcontext
python3 tests/auth.py --binary /absolute/path/to/pocketcontext
python3 tests/oauth_integration.py --binary /absolute/path/to/pocketcontext
python3 tests/skill.py --binary /absolute/path/to/pocketcontext
python3 tests/deploy.py --binary /absolute/path/to/pocketcontext
python3 tests/oauth.py
python3 tests/deploy_workflow.py
```

When an intentional schema change occurs, run `tests/skill.py --binary ... --write-schema` and review the snapshot and skill references. CI additionally checks container startup, persistence, crash restore and shutdown synchronization before publishing native AMD64 and ARM64 images.

## Deployment and scope

See [deployment instructions](docs/deployment.md). Disable ONCE automatic updates and use the fixed-target wrapper to stop the old database writer cleanly before replacement. Backups require a dedicated bucket/prefix. Real investor records, tokens and credentials never belong in source control or examples.

RaiseContext does not supply an investor database, automatic message sending, cap-table management, legal document generation or document hosting. Store external document references. Website enquiries about buying RaiseContext remain in DealContext. A public website offering and demo are separate work.

Authentication/client and deployment patterns were adapted from the sibling TaskContext application; the domain schema is independent.

## Request observability

The pinned server enables an authenticated, bounded in-memory trace buffer for `raisecontext`. Collection is client opt-in; ordinary commands produce no traces. See [optional skill tracing](skills/raisecontext/references/tracing.md) for separate ObserveContext login, private upload, SQL-text consent, delivery retries and measurement limits. No ObserveContext credentials are installed on this server.

## Browser reader and permanent links

The authenticated reader at `/` provides a collection chooser, server-side text search,
paginated records, collection-specific filters, and outgoing/reverse relationship links.
Use `/#/<collection>/<record-id>` for a current-record permalink. Renames preserve this
identity; deletion or loss of access may make a link unavailable. Search/filter state is
stored in the hash query, and **Copy record link** omits that state. **Copy search link**
shares the current collection/filter view. Links do not grant access or preserve history.
The destination survives password or configured Google sign-in and reload.

Records are read through the existing authenticated SQL endpoint. The browser never
queries auth collections, writes business records, or acknowledges anything on opening.
Relationship labels use only authorized SQL; unavailable targets reveal no resolved
label. User-directory records contain display names only.

The official PocketBase JavaScript SDK stores application tokens in an app-specific
`LocalAuthStore` in local storage. Sign-in survives reloads, new tabs and browser
restarts until expiry or sign-out. Authentication changes synchronize across tabs;
sign-out clears displayed data and stored credentials but does not revoke copied
tokens. Tokens are accessible to browser JavaScript. Old per-tab sessions are discarded
on upgrade, requiring one fresh sign-in. Active sessions renew on startup/focus at
most once per five minutes per tab; rejected credentials require sign-in. Refresh on focus or
the **Refresh** button reloads current data.

Markdown never executes HTML or loads remote images. Record metadata is
collapsed below business fields. Currency amounts retain their original minor-unit
values alongside formatted currency. No mixed-currency totals are calculated.

The reader's explicit navigation model lives in `ui/src/config.ts`. Keep its schema
snapshot aligned with the exported schema when changing columns; `tests/reader.py`
compares it with the real authenticated schema. The UI is built into the application
image; for local development build it before starting the ordinary server:

```sh
cd ui
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm e2e
cd ..
python3 tests/reader.py --binary /absolute/path/to/pinned/pocketcontext --browser
```

Use Node.js 24 and pnpm 10.33.2. The browser smoke uses synthetic records and an isolated
temporary database. It tests actual production assets, authentication, direct links,
reload, search pagination, mobile navigation, and SQL/schema compatibility. Unit and
mocked browser tests additionally cover query escaping, malformed routes, relationship
labels, and inert Markdown. Generated assets are not committed.
For browser Google OAuth, register the application's own
`https://<application-host>/api/oauth2-redirect` URI in its existing OAuth client.

## Packaged CLI development

Install uv, then run `uv venv` and `uv pip install -e .`. Activate `.venv` before running the Python validation commands above. The full-name command is `raisecontext`; old script paths and short aliases are removed. The installed skill launcher requires uv and Python 3.11 or later and fetches its package at a full Git commit. Initial installation requires network access.

The implementation and bundled schema live in `src/raisecontext_client/`; keep its schema snapshot identical to `skills/raisecontext/references/schema.json`. Publish and test the package commit before updating the launcher to that commit. The ObserveContext dependency is pinned separately. Tracing is inactive unless explicitly enabled by `observecontext capture -- raisecontext ...`; capture failures must preserve the command result.

For a released launcher, run `python3 tests/skill.py --binary /absolute/path/to/pinned/pocketcontext --client /absolute/path/to/copied/raisecontext`. This uses a fresh uv cache and isolated synthetic records. Put the real uv binary on `PATH` when a version-manager shim depends on `HOME`; authentication tests deliberately use temporary home directories. Source/schema mutation checks use a private package copy.

## Read-only migration maintenance

A superuser can inspect `GET /api/context/maintenance` and freeze writes with
`PUT /api/context/maintenance` and `{"readOnly":true,"expectedGeneration":N}`,
using the returned generation. Wait for `state: "read_only"` before taking the
final migration snapshot. Existing writes drain; new mutations return HTTP 503.
Authorized reads, SQL queries, and original-file downloads remain available;
login flows requiring writes can fail. Public submissions are rejected, not queued.

The private `pb_data/maintenance.json` marker persists the freeze across restarts.
Frozen startup preserves stored settings and credentials, skips replica restore
and superuser provisioning, and fails for malformed markers, missing databases
or pending migrations. Preserve the marker alongside the database when migrating.
Thaw explicitly with `readOnly:false` and the current generation; stale generations
return HTTP 409. Freeze does not fence external processes or another host: pause CD
and disable source restart/deployment authority before activating a replacement.

Validate using synthetic temporary data:

```sh
python3 tests/maintenance.py --binary /absolute/path/to/pinned/pocketcontext
python3 tests/maintenance_entrypoint.py
```

Replicated startup waits for Litestream’s private IPC synchronization before serving.
A fresh writable instance initializes its database first; a frozen instance still
requires its existing database. Failed synchronization stops startup. This ensures
Litestream initializes before a quick clean shutdown; replication remains asynchronous.

## Primary object storage preparation

Set all of `RAISECONTEXT_S3_BUCKET`, `RAISECONTEXT_S3_ENDPOINT`,
`RAISECONTEXT_S3_REGION`, `RAISECONTEXT_S3_ACCESS_KEY_ID` and
`RAISECONTEXT_S3_SECRET_ACCESS_KEY` to enable PocketBase primary file storage.
Optional `RAISECONTEXT_S3_FORCE_PATH_STYLE` defaults to `true` and accepts only
`true` or `false`. Partial configuration stops startup without exposing values.
An existing remote backend requires explicit matching configuration; removing
variables never silently reverts to local disk. Frozen startup requires the stored
backend and credentials to match exactly and does not write settings.

Use a dedicated private file bucket and bucket-scoped credentials separate from
`LITESTREAM_*`. Uploads and downloads continue through PocketBase; each file's
existing authorization still applies. These settings do not copy existing local
files, change record permissions or introduce new file fields. Copy and reconcile
all existing file keys and checksums before enabling remote storage on existing
data. Keep object retention at least as long as database recovery history; do not
clean objects based on a potentially stale database restore.

SQLite recovery retains the existing Litestream restore and initial-sync startup
contract. File storage and SQLite have no shared transaction, and unexpected host
loss can lose database commits not yet replicated. Keep one writer and replica
publisher per replica path; preserve the source volume through verified recovery.
With no S3 configuration and no stored remote backend, local storage is unchanged.
No deployed application is switched by this preparation.

Validate startup configuration using synthetic isolated databases:

```sh
python3 tests/object_storage.py --binary /absolute/path/to/pinned/pocketcontext
```

The image release gate exercises actual protected uploads, owner/outsider/anonymous
file access, and exact Litestream recovery against isolated MinIO buckets with
separate bucket-scoped credentials:

```sh
python3 docker/object_storage_smoke.py --image raisecontext:ci --minio-image raisecontext-minio-fixture:9e49d5e-7394ce0
```

Build the fixture using `docker/minio.Dockerfile`, or run the ordinary container
restore gate first. The S3 gate uses a one-hour replication interval, freezes and
cleanly stops the source, restores into a separate volume, and compares the full
logical database before removing the source volume. The recovered container must
remain frozen, preserve protected-file access and reject writes until explicit thaw.
A third stage commits a final record after thaw, cleanly stops and destroys the
second volume, then verifies automatic entrypoint recovery on an empty volume
without an auxiliary snapshot or maintenance marker. The record, protected object
and authorization must survive, and the server initializes new auxiliary state.

For a planned frozen migration, the bundle must include `maintenance.json` and a
consistent `auxiliary.db` snapshot made with SQLite's backup API from the stopped
source, including any WAL state. Litestream restores `data.db`; it does not replicate
PocketBase's auxiliary database or the maintenance marker. Frozen startup refuses
to create the missing auxiliary database. Preserve both bundle files privately
alongside the verified primary restore. This differs from writable disaster recovery,
where a fresh startup can create auxiliary state. These tests do not migrate live files.

### Pause continuous deployment

Set the repository Actions variable `CONTEXT_DEPLOY_PAUSED=true` to keep CI and
image publication running while the deployment job is skipped. Preserve the
existing `COLORS_PROFILE`; clearing it is not the pause mechanism. Resume only
when a deployment is intended by setting `CONTEXT_DEPLOY_PAUSED=false` (or deleting
that variable). The pause applies to newly evaluated jobs; separately finish or
cancel any deployment already running before treating the host as fenced.

## Strict container runtime

The container now requires separate primary S3 and Litestream storage and explicit
fresh-install initialization. See [container runtime](docs/container-runtime.md)
for startup, staged verified recovery, maintenance and validation requirements.
Local direct-server development may still use local storage. The old deployment
is retired; fresh deployment is outside this change.

See [CI and deployment](docs/ci-and-deployment.md) for common release controls.
