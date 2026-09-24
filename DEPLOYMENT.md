# Production deployment

Deployed on 2026-09-24 at https://raise.pocketcontext.com on the existing ONCE host. The operator dashboard is at `/_/`; application operations use the installable agent skill. No conventional fundraising frontend is included.

## Initial verified release

- Application commit: `9708ac86b5640afe5cda6a1a027d82106f7d8f10`.
- PocketContext pin: `381f81042586afdaa6498b8c0e2a78229a55bdff`.
- Initial image: `ghcr.io/pocketcontext/raisecontext@sha256:2c1eafee66d1c4ed44ba0d9c81f63fa4f156e10439a421ffc760470cad460cea`.
- [Release CI](https://github.com/pocketcontext/raisecontext/actions/runs/35973909080) passed application, auth, Google protocol, portable skill, deployment configuration/orchestration, container startup, persistence, crash restore, shutdown synchronization, and native AMD64/ARM64 publication.

The repository and container package are public, as requested. The existing host pulled the image anonymously. No credentials or real fundraising records are included.

## Infrastructure and access

The local unversioned `../once-pocketcontext/colors.yml` configures one CPU, 512 MiB, and RaiseContext-specific mappings from `.envrc.private` (mode 0600). Operator credentials match the existing applications. Google uses its own client, Workspace domain `pocketcontext.com`, and the existing default PocketBase `users` collection (`_pb_users_auth_`). No additional auth collection was created. Accounts require explicit operator provisioning before Google login; direct public signup remains blocked.

The private replica is bucket `raisecontext-backup`, prefix `once-pocketcontext/raisecontext`, using the configured EU R2 endpoint. Authenticated bucket access and an empty prefix were checked before first startup; nonempty LTX replica objects were verified after deployment.

Scaffold build and dry-run passed. A targeted DNS plan created exactly one proxied A record for `raise.pocketcontext.com` at the existing host, using the existing DNS state backend. No full convergence, new compute, SMTP changes, or sibling key rotation occurred.

## Verification

Public HTTPS `/up`, shared operator authentication, Google provider/client configuration, password login availability, seven-day user tokens, explicit provisioning rules, denied anonymous schema/user reads, default users identity, resource limits, and empty business/user collections were verified. No synthetic production records were created. Real Google browser consent remains a human end-to-end check; protocol behavior is covered by isolated synthetic-provider tests.

The local workstation resolver returned an unrelated address for the new hostname. Verification used the public Cloudflare addresses resolved by the remote host, preserving the public hostname and TLS certificate validation. Public health also passed directly from that host. Existing sibling containers remained running.

## Continuous deployment

A dedicated `raisecontext-deploy` SSH key invokes the root-owned `/usr/local/sbin/deploy-raisecontext` wrapper. Sibling authorized keys were preserved. GitHub environment `once-pocketcontext` holds the restricted key and pinned server identity; `COLORS_PROFILE=once-pocketcontext` enables deployment after image publication.

The restricted key successfully exercised a controlled update from the immutable image to `latest`, preserving environment, data, replica, and resources. ONCE automatic updates are disabled. The wrapper locks, pulls first, gracefully stops the exact container, checks clean exit, and then updates only RaiseContext.

For rollback, pull the chosen immutable image before stopping the writer. Stop it gracefully and require clean exit before `once update raise.pocketcontext.com --image <digest> --auto-update=false`. Never run two database/replica writers or restore a replica beside a running writer. Reinstall the safe wrapper after any full scaffold operation that rewrites deployment keys.
