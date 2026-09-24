# Container and deployment

RaiseContext uses the PocketContext revision in `POCKETCONTEXT_VERSION`. The image serves HTTP on port 80, offers database-backed `GET /up`, and stores state in `/storage/pb_data`. It runs PocketContext under tini and Litestream, restoring a missing database before startup. A failed restore prevents startup.

The image and deployment scripts adapt TaskContext's container infrastructure. RaiseContext owns its migrations, schema, configuration, image, deployment target, and tests.

## Configuration

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Public origin; production uses `https://raise.pocketcontext.com`. Also restricts browser origins. |
| `RAISECONTEXT_SUPERUSER_EMAIL`, `RAISECONTEXT_SUPERUSER_PASSWORD` | Operator provisioning at startup. Production reuses the other applications' operator credentials. |
| `RAISECONTEXT_GOOGLE_CLIENT_ID`, `RAISECONTEXT_GOOGLE_CLIENT_SECRET` | Google OAuth credentials on the existing `users` auth collection. Both are required together. |
| `RAISECONTEXT_GOOGLE_WORKSPACE_DOMAIN` | Enables Google just-in-time signup for verified accounts whose hosted domain and email domain match this value. Production uses `pocketcontext.com`. Unset means no automatic signup. |
| `RAISECONTEXT_TRUSTED_PROXY_HEADER` | Set to `X-Forwarded-For` behind ONCE. |
| `RAISECONTEXT_RATE_LIMITS` | Image defaults to `true`. |
| `LITESTREAM_BUCKET`, `LITESTREAM_PATH` | Private replica bucket and RaiseContext-only prefix; use `once-pocketcontext/raisecontext` for this deployment. Never reuse another application's prefix. |
| `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY` | Credentials for the replica. |
| `LITESTREAM_ENDPOINT`, `LITESTREAM_REGION` | S3-compatible endpoint and region. |
| `LITESTREAM_SYNC_INTERVAL` | Defaults to `10s`. |
| `LITESTREAM_DISABLED` | Exactly `true` disables replication; intended for isolated tests. |
| `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAILER_FROM_ADDRESS` | Optional ONCE mail configuration. |

Keep deployment secrets in the sibling unversioned `once-pocketcontext/.envrc.private`, with RaiseContext-specific variable names. Configure Google's authorized redirect URI as `https://raise.pocketcontext.com/api/oauth2-redirect`. Google sign-in automatically creates an account in the default `users` collection when verified Google claims match `RAISECONTEXT_GOOGLE_WORKSPACE_DOMAIN`. Public REST signup remains locked. Existing accounts keep their IDs; disabled accounts cannot return through Google signup. With the domain unset, only existing provisioned accounts can sign in. Provision password-based agents through the superuser REST API in the same `users` collection; do not create another auth collection.

The production repository and GHCR package are public by operator choice; the ONCE host pulls anonymously. Application records, credentials, and backups remain private.

## Build and verification

Build the pinned server in an isolated checkout:

```sh
revision=$(cat POCKETCONTEXT_VERSION)
git -C ../pocketcontext worktree add --detach /tmp/raisecontext-server "$revision"
make -C /tmp/raisecontext-server build
python3 tests/integration.py --binary /tmp/raisecontext-server/bin/pocketcontext
python3 tests/auth.py --binary /tmp/raisecontext-server/bin/pocketcontext
python3 tests/oauth_integration.py --binary /tmp/raisecontext-server/bin/pocketcontext
python3 tests/deploy.py --binary /tmp/raisecontext-server/bin/pocketcontext
python3 tests/deploy_workflow.py
```

With Docker available:

```sh
docker build -t raisecontext:local .
python3 docker/smoke.py config --image raisecontext:local
python3 docker/smoke.py smoke --image raisecontext:local
python3 docker/smoke.py restore --image raisecontext:local
```

All tests use synthetic records and disposable storage. The restore drill checks recovery after abrupt termination and preservation of a final write through graceful Litestream shutdown. Never test against production storage or replicas.

## Updates

CI gates publication to `ghcr.io/pocketcontext/raisecontext` on integration, authentication, container startup, persistence, and restore tests. Main publishes native AMD64 and ARM64 images with `latest` and commit tags.

Keep ONCE automatic updates disabled. An ordinary ONCE update can overlap containers, which risks two SQLite and Litestream writers against one volume and replica. Pull first, gracefully stop the exact RaiseContext container, require exit status zero, then update it. Sibling applications remain running. Updates briefly interrupt availability.

`deploy/deploy-raisecontext.py` implements this fixed-target sequence with a lock and conditional recovery. It accepts no arguments and only targets `raise.pocketcontext.com` with `ghcr.io/pocketcontext/raisecontext`. Install its forced-command SSH hook from a trusted copy with `sudo python3 deploy/install.py`. The installer expects an existing RaiseContext deployment key, preserves other keys, and validates its narrowly scoped sudoers entry.

Optional continuous deployment requires repository variable `COLORS_PROFILE` naming a GitHub environment with `SSH_PRIVATE_KEY`, `SERVER_IP`, `SERVER_USER`, and pinned `SSH_KNOWN_HOSTS`. Install the safe hook before enabling that variable. Reinstall the hook if scaffold provisioning rewrites the deployment keys. CI verifies public `/up` after deployment; health establishes database availability, not the deployed source revision.
