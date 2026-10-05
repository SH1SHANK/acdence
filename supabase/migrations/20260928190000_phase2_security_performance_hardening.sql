-- =========================================================================
-- ACDENCE PHASE 2 DATABASE HARDENING MIGRATION
-- 1. Revoke notification RPC execution from public/anon/authenticated
-- 2. Drop obsolete 4-argument finalize_notification_delivery overload
-- 3. Restrict notification_deliveries table writes from client roles
-- 4. Add covering foreign key index on notification_deliveries.user_id
-- 5. Optimize all RLS policies using (select auth.uid()) for InitPlan caching
-- =========================================================================

-- 1. DROP OBSOLETE 4-ARG OVERLOAD OF finalize_notification_delivery
DROP FUNCTION IF EXISTS public.finalize_notification_delivery(uuid, boolean, text, text);

-- 2. HARDEN EXECUTE PRIVILEGES ON NOTIFICATION RPCS
REVOKE EXECUTE ON FUNCTION public.claim_notification_delivery(uuid, text, text, text, date, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_delivery(uuid, text, text, text, date, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.finalize_notification_delivery(uuid, boolean, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_notification_delivery(uuid, boolean, text, text, integer) TO service_role;

-- 3. RESTRICT CLIENT WRITES ON NOTIFICATION DELIVERIES TABLE
REVOKE ALL ON public.notification_deliveries FROM anon, authenticated;
GRANT SELECT ON public.notification_deliveries TO authenticated;

-- 4. COVERING FOREIGN KEY INDEX ON notification_deliveries.user_id
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON public.notification_deliveries (user_id);

-- 5. RLS POLICIES OPTIMIZATION (auth_rls_initplan: (select auth.uid()))

-- user_settings
DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own ON public.user_settings FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own ON public.user_settings FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own ON public.user_settings FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS user_settings_delete_own ON public.user_settings;
CREATE POLICY user_settings_delete_own ON public.user_settings FOR DELETE USING ((select auth.uid()) = id);

-- assessment_records
DROP POLICY IF EXISTS assessment_records_select_own ON public.assessment_records;
CREATE POLICY assessment_records_select_own ON public.assessment_records FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS assessment_records_insert_own ON public.assessment_records;
CREATE POLICY assessment_records_insert_own ON public.assessment_records FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS assessment_records_update_own ON public.assessment_records;
CREATE POLICY assessment_records_update_own ON public.assessment_records FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS assessment_records_delete_own ON public.assessment_records;
CREATE POLICY assessment_records_delete_own ON public.assessment_records FOR DELETE USING ((select auth.uid()) = user_id);

-- sct_status
DROP POLICY IF EXISTS sct_status_select_own ON public.sct_status;
CREATE POLICY sct_status_select_own ON public.sct_status FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS sct_status_insert_own ON public.sct_status;
CREATE POLICY sct_status_insert_own ON public.sct_status FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS sct_status_update_own ON public.sct_status;
CREATE POLICY sct_status_update_own ON public.sct_status FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS sct_status_delete_own ON public.sct_status;
CREATE POLICY sct_status_delete_own ON public.sct_status FOR DELETE USING ((select auth.uid()) = user_id);

-- project_state
DROP POLICY IF EXISTS project_state_select_own ON public.project_state;
CREATE POLICY project_state_select_own ON public.project_state FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS project_state_insert_own ON public.project_state;
CREATE POLICY project_state_insert_own ON public.project_state FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS project_state_update_own ON public.project_state;
CREATE POLICY project_state_update_own ON public.project_state FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS project_state_delete_own ON public.project_state;
CREATE POLICY project_state_delete_own ON public.project_state FOR DELETE USING ((select auth.uid()) = user_id);

-- viva_checklist
DROP POLICY IF EXISTS viva_checklist_select_own ON public.viva_checklist;
CREATE POLICY viva_checklist_select_own ON public.viva_checklist FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS viva_checklist_insert_own ON public.viva_checklist;
CREATE POLICY viva_checklist_insert_own ON public.viva_checklist FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS viva_checklist_update_own ON public.viva_checklist;
CREATE POLICY viva_checklist_update_own ON public.viva_checklist FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS viva_checklist_delete_own ON public.viva_checklist;
CREATE POLICY viva_checklist_delete_own ON public.viva_checklist FOR DELETE USING ((select auth.uid()) = user_id);

-- semester_tasks
DROP POLICY IF EXISTS semester_tasks_select_own ON public.semester_tasks;
CREATE POLICY semester_tasks_select_own ON public.semester_tasks FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS semester_tasks_insert_own ON public.semester_tasks;
CREATE POLICY semester_tasks_insert_own ON public.semester_tasks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS semester_tasks_update_own ON public.semester_tasks;
CREATE POLICY semester_tasks_update_own ON public.semester_tasks FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS semester_tasks_delete_own ON public.semester_tasks;
CREATE POLICY semester_tasks_delete_own ON public.semester_tasks FOR DELETE USING ((select auth.uid()) = user_id);

-- notification_deliveries (SELECT only, client writes remain disallowed)
DROP POLICY IF EXISTS notification_deliveries_select_own ON public.notification_deliveries;
CREATE POLICY notification_deliveries_select_own ON public.notification_deliveries FOR SELECT USING ((select auth.uid()) = user_id);
