# Stabilization Implementation Plan

Goal: Preserve current changes while making release differences reproducible and validating isolated database behavior before application fixes.

Architecture: Read-only source inventories are separate from deployment manifests. Existing release/baseline.json remains immutable; a local snapshot is not proof of production identity or successful validation.

Constraints: No production database/account writes, no deployment, no Docker resets or volume removal, crons remain empty. Never copy environment values into reports.

- [x] Add test-first source snapshot tooling: SHA-256, exact added/changed/deleted sets, safe paths, no symlinks, no secret files, cron rejection.
- [x] Record workspace and HEAD differences locally without staging unrelated changes or replacing the existing release baseline.
- [ ] Check Docker engine with a bounded read-only query; run existing isolated tests only against explicitly validated local configuration. Record blockers rather than claiming skipped tests passed.
- [x] Reproduce theme behavior before changing color/design preferences. Preserve their distinct semantics.
- [x] Add failing backup pagination tests, then implement deterministic pagination and all-or-error handling.
- [x] Run type-check, lint, isolated-inclusive test, build in order and record actual results. Stop release on missing DB verification.

DB execution is blocked by a timed-out read-only Docker query. Final pipeline passed with 522 tests passed and 20 DB tests skipped; this does not satisfy the DB completion gate. No production deployment or baseline promotion was performed.

Each production fix requires an executed failing regression test followed by the same test passing. Release and production schema application require separate approval.
