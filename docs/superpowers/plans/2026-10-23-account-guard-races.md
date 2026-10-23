# Account Guard Race Repair

Goal: Prevent stale profile requests from signing out a newly authenticated user or acting after unmount, while retaining fail-closed business access.

- [x] Reproduce unmount, account switch and sign-out notification behavior with deferred synthetic profile responses.
- [x] Subscribe to auth changes synchronously, invalidate previous request generations, and schedule Supabase checks outside the auth callback.
- [x] Ignore stale responses before UI mutation or local sign-out; unsubscribe and cancel scheduled checks on cleanup.
- [x] Run targeted and full sequential type-check/lint/test/build in the credential-free verification copy. Record the separate isolated DB blocker without weakening the release gate.

Final: targeted 21 passed; sequential type-check/lint/test/build exit 0, 528 tests passed and 20 DB tests skipped; 41 tool tests passed. Deployment source matches the verification copy. Real DB and browser verification, production migration, commit grouping and deployment remain unperformed.

Docker normal start is investigated separately; no Ubuntu start/stop, volume removal, production writes, emails, deployment or cron activation.
