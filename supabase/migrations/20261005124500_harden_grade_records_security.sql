-- =========================================================================
-- ACDENCE / ACADRIX GRADE SYNC: SECURITY HARDENING & CLEANUP
-- 1. Drop public anon read policy on grade_records.
-- 2. Restrict direct SELECT to authenticated users only.
-- 3. Clean up test records so grade_records starts completely clean.
-- =========================================================================

-- 1. DROP INSECURE PUBLIC READ POLICY
DROP POLICY IF EXISTS "grade_records_read_policy" ON public.grade_records;
DROP POLICY IF EXISTS "grade_records_authenticated_read" ON public.grade_records;

-- 2. CREATE AUTHENTICATED-ONLY READ POLICY (anon role gets 0 rows / denied)
CREATE POLICY "grade_records_authenticated_read"
ON public.grade_records
FOR SELECT
TO authenticated
USING (true);

-- 3. CLEAN UP ALL TEST ROWS
TRUNCATE TABLE public.grade_records;
