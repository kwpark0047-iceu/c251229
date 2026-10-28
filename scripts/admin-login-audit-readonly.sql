-- Run only in the c251229 project (yreoeqmcebnosmtlyump).
-- Read-only metadata and aggregate counts; no email, account ID or key output.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('account_status', 'is_approved', 'is_super_admin');
SELECT to_jsonb(p)->>'account_status' AS account_status,
       to_jsonb(p)->>'is_approved' AS is_approved, count(*) AS super_admin_count
FROM public.profiles p
WHERE to_jsonb(p)->>'is_super_admin' = 'true'
GROUP BY 1, 2;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
ROLLBACK;
