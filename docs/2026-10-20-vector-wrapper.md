# Local Vector start wrapper

## Scope and usage

This wrapper is fixed to `tmp/sopo-isolated` and its `sopo-isolated` Docker
project. It does not deploy, modify production configuration, reset a database,
or delete volumes. `vercel.json` must retain `crons: []`.

```powershell
node scripts/local-supabase.mjs plan
node scripts/local-supabase.mjs start
node scripts/local-supabase.mjs repair
node scripts/local-supabase.mjs verify
node --test scripts/local-vector.test.mjs
```

`start` runs the installed Supabase CLI before checking/repairing Vector.
`repair` also works after a direct CLI start/recreation. No global CLI hook or
scheduled process is installed. Use this wrapper for subsequent starts.

## Safety and recovery

- Only local Docker Unix sockets/named pipes are accepted; TCP/SSH endpoints
  are refused. No host ports are published for Vector.
- Vector uses a pinned image digest and read-only socket/config bind mounts.
  **Read-only socket mounting does not make Docker API access read-only.**
  The user explicitly approved this local Docker control privilege.
- Source logs are filtered to the isolated project's label. Analytics sinks
  must reference the isolated local Analytics container. Unknown image/config
  layouts fail closed and require review rather than automatic upgrades. The
  reviewed transforms/sinks are additionally SHA-256 pinned, including local
  headers: CLI template or local credential changes require explicit review and
  a new pipeline digest. Inline YAML sinks cannot bypass that digest check.
- Replacement preserves the old container, configuration and metadata. Failed
  startup/log verification removes only the newly owned container (without
  volume deletion) and restores the old name/restart policy/running state.
  A rollback failure is reported explicitly for manual inspection.
- An exclusive lock prevents concurrent wrapper runs. After an interrupted run,
  inspect Docker state and ensure no wrapper is running before manually removing
  the stale `.local-state/vector/sopo-isolated/repair.lock`.
- `.local-state/` is Git-ignored. Backups and CLI output can contain local keys;
  do not publish them. Restrict Windows ACLs as appropriate. Do not delete a
  run directory while its configuration is mounted by the active container.
- Supabase CLI stop may remove preserved containers bearing its project label;
  file backups remain. Do not use `--no-backup`, `--all`, reset, or volume prune
  as part of this workflow.

## Verification

Verification sends an unauthenticated synthetic health request to local Kong,
observes its unique marker at Vector's Kong sink input, and checks that the
sink's sent-event counter increases while Vector remains healthy with no new
restarts. It then reads only the isolated `_supabase._analytics` log tables to
confirm that the exact marker was actually stored at the destination. No real
account or business row is used. Local Analytics naturally
receives the synthetic log; this is not a production DB operation.

Native tests cover endpoint/project guards, configuration rewrite idempotency,
mount argument safety, success and rollback/failure paths. This is not a rerun
of the application's type-check/lint/test/build pipeline.

## Results (2026-10-20)

- Data-preserving CLI stop followed by wrapper start: replacement applied,
  healthy, restart count zero, synthetic event forwarded.
- Subsequent repair: no replacement, same container ID, restart count zero.
- Final verification: exact synthetic marker found in local Analytics storage.
- Native tests: 13 passed, zero failed; wrapper syntax check passed.
- Rollback paths are fault-tested with injected operations, not destructive
  failure injection against the running stack.
