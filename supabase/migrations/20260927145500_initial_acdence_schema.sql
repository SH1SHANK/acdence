-- =========================================================================
-- ACDENCE PHASE 1 MIGRATION: INITIAL SCHEMA, RPCs, RLS & SCHEDULER FOUNDATION
-- Project: Acdence (Single-User Academic Operations Cockpit)
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. USER SETTINGS TABLE
-- Stores synchronized user notes and non-sensitive repository tracking metadata.
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notes JSONB NOT NULL DEFAULT '{}'::jsonb,
    github_repo_url TEXT,
    github_repo_owner TEXT,
    github_repo_name TEXT,
    github_last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ASSESSMENT RECORDS TABLE
-- Stores user marks and attendance status for all 52 canonical assessments.
CREATE TABLE IF NOT EXISTS public.assessment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent')),
    score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    submission_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_assessment UNIQUE (user_id, assessment_id)
);

-- 4. SCT STATUS TABLE
-- Stores OPPE System Compatibility Test (SCT) window clearance per course.
CREATE TABLE IF NOT EXISTS public.sct_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL CHECK (course_code IN ('CS2005', 'SE2001', 'CS2006', 'CS2006P', 'MS2001')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_course_sct UNIQUE (user_id, course_code)
);

-- 5. PROJECT STATE TABLE
-- Stores TMA V2 project track, checklist progress, and viva scores for CS2006P.
CREATE TABLE IF NOT EXISTS public.project_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track TEXT CHECK (track IS NULL OR track IN ('theory_completed_prior', 'theory_registered_current')),
    completed_stage_ids TEXT[] NOT NULL DEFAULT '{}',
    checked_requirements TEXT[] NOT NULL DEFAULT '{}',
    l1_score NUMERIC(5,2) CHECK (l1_score IS NULL OR (l1_score >= 0 AND l1_score <= 100)),
    l2_score NUMERIC(5,2) CHECK (l2_score IS NULL OR (l2_score >= 0 AND l2_score <= 100)),
    submission_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_project UNIQUE (user_id)
);

-- 6. VIVA CHECKLIST TABLE
-- Stores user completion toggles for online project viva prerequisites.
CREATE TABLE IF NOT EXISTS public.viva_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_viva_item UNIQUE (user_id, item_id)
);

-- 7. SEMESTER TASKS TABLE
-- Stores user-created custom tasks, priorities, and due dates.
CREATE TABLE IF NOT EXISTS public.semester_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_task_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    course_code TEXT CHECK (course_code IS NULL OR course_code IN ('CS2005', 'SE2001', 'CS2006', 'CS2006P', 'MS2001')),
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_client_task UNIQUE (user_id, client_task_id)
);

-- 8. NOTIFICATION DELIVERIES TABLE (Active Delivery State Machine)
-- Controls atomic dispatch claims, 5-minute leases, and bounded retries for push alerts.
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL UNIQUE,
    event_id TEXT NOT NULL,
    rule_code TEXT NOT NULL,
    target_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    lease_until TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- 9. PERFORMANCE & QUERY INDEXES
-- Non-redundant indexes supporting critical query patterns
CREATE INDEX IF NOT EXISTS idx_semester_tasks_user_status ON public.semester_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_semester_tasks_due_date ON public.semester_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_status ON public.notification_deliveries(status, lease_until);

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sct_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 11. USER-SCOPED RLS POLICIES
-- user_settings policies
CREATE POLICY "user_settings_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_settings_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user_settings_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = id);

-- assessment_records policies
CREATE POLICY "assessment_records_select_own" ON public.assessment_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assessment_records_insert_own" ON public.assessment_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assessment_records_update_own" ON public.assessment_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assessment_records_delete_own" ON public.assessment_records FOR DELETE USING (auth.uid() = user_id);

-- sct_status policies
CREATE POLICY "sct_status_select_own" ON public.sct_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sct_status_insert_own" ON public.sct_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sct_status_update_own" ON public.sct_status FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sct_status_delete_own" ON public.sct_status FOR DELETE USING (auth.uid() = user_id);

-- project_state policies
CREATE POLICY "project_state_select_own" ON public.project_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_state_insert_own" ON public.project_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_state_update_own" ON public.project_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_state_delete_own" ON public.project_state FOR DELETE USING (auth.uid() = user_id);

-- viva_checklist policies
CREATE POLICY "viva_checklist_select_own" ON public.viva_checklist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "viva_checklist_insert_own" ON public.viva_checklist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "viva_checklist_update_own" ON public.viva_checklist FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "viva_checklist_delete_own" ON public.viva_checklist FOR DELETE USING (auth.uid() = user_id);

-- semester_tasks policies
CREATE POLICY "semester_tasks_select_own" ON public.semester_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "semester_tasks_insert_own" ON public.semester_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "semester_tasks_update_own" ON public.semester_tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "semester_tasks_delete_own" ON public.semester_tasks FOR DELETE USING (auth.uid() = user_id);

-- notification_deliveries policies (read-only for client; mutations managed via service-role / RPCs)
CREATE POLICY "notification_deliveries_select_own" ON public.notification_deliveries FOR SELECT USING (auth.uid() = user_id);

-- 12. REALTIME PUBLICATION SETUP
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sct_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.viva_checklist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.semester_tasks;

-- 13. ATOMIC RPC: CLAIM NOTIFICATION DELIVERY
-- Uses row-level lock (FOR UPDATE) to guarantee at-most-once dispatch claim with 5-minute lease.
CREATE OR REPLACE FUNCTION public.claim_notification_delivery(
    p_user_id UUID,
    p_notification_key TEXT,
    p_event_id TEXT,
    p_rule_code TEXT,
    p_target_date DATE,
    p_lease_duration_seconds INT DEFAULT 300,
    p_max_attempts INT DEFAULT 3
)
RETURNS TABLE (
    claimed BOOLEAN,
    delivery_id UUID,
    attempt INT,
    current_status TEXT,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_row public.notification_deliveries%ROWTYPE;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_lease_until TIMESTAMPTZ := v_now + (p_lease_duration_seconds || ' seconds')::interval;
BEGIN
    -- 1. Attempt row-level lock on existing notification key
    SELECT * INTO v_row
    FROM public.notification_deliveries
    WHERE notification_key = p_notification_key
    FOR UPDATE;

    -- 2. Case: Brand new delivery candidate -> Insert directly as 'sending' with attempt_count = 1
    IF NOT FOUND THEN
        INSERT INTO public.notification_deliveries (
            user_id,
            notification_key,
            event_id,
            rule_code,
            target_date,
            status,
            attempt_count,
            lease_until,
            updated_at
        ) VALUES (
            p_user_id,
            p_notification_key,
            p_event_id,
            p_rule_code,
            p_target_date,
            'sending',
            1,
            v_lease_until,
            v_now
        )
        RETURNING * INTO v_row;

        RETURN QUERY SELECT true, v_row.id, v_row.attempt_count, v_row.status, 'new_claim'::TEXT;
        RETURN;
    END IF;

    -- 3. Case: Already successfully delivered -> Terminal state, reject claim
    IF v_row.status = 'sent' THEN
        RETURN QUERY SELECT false, v_row.id, v_row.attempt_count, v_row.status, 'already_sent'::TEXT;
        RETURN;
    END IF;

    -- 4. Case: Max retry attempts reached -> Reject claim
    IF v_row.attempt_count >= p_max_attempts THEN
        RETURN QUERY SELECT false, v_row.id, v_row.attempt_count, v_row.status, 'max_attempts_exceeded'::TEXT;
        RETURN;
    END IF;

    -- 5. Case: Reclaimable if status is 'failed' OR (status is 'sending' AND active lease expired)
    IF v_row.status = 'failed' OR (v_row.status = 'sending' AND (v_row.lease_until IS NULL OR v_row.lease_until < v_now)) THEN
        UPDATE public.notification_deliveries
        SET status = 'sending',
            attempt_count = v_row.attempt_count + 1,
            lease_until = v_lease_until,
            updated_at = v_now
        WHERE id = v_row.id
        RETURNING * INTO v_row;

        RETURN QUERY SELECT true, v_row.id, v_row.attempt_count, v_row.status, 'reclaimed_lease'::TEXT;
        RETURN;
    END IF;

    -- 6. Case: Actively sending under unexpired lease by another worker
    RETURN QUERY SELECT false, v_row.id, v_row.attempt_count, v_row.status, 'active_lease'::TEXT;
    RETURN;
END;
$$;

-- 14. ATOMIC RPC: FINALIZE NOTIFICATION DELIVERY
-- Protected against stale workers via p_expected_attempt and status = 'sending' check.
CREATE OR REPLACE FUNCTION public.finalize_notification_delivery(
    p_delivery_id UUID,
    p_success BOOLEAN,
    p_provider_message_id TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_expected_attempt INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_rows_updated INT;
BEGIN
    IF p_success THEN
        UPDATE public.notification_deliveries
        SET status = 'sent',
            provider_message_id = p_provider_message_id,
            sent_at = v_now,
            lease_until = NULL,
            last_error = NULL,
            updated_at = v_now
        WHERE id = p_delivery_id
          AND status = 'sending'
          AND (p_expected_attempt IS NULL OR attempt_count = p_expected_attempt);
    ELSE
        UPDATE public.notification_deliveries
        SET status = 'failed',
            last_error = p_error_message,
            lease_until = NULL,
            updated_at = v_now
        WHERE id = p_delivery_id
          AND status = 'sending'
          AND (p_expected_attempt IS NULL OR attempt_count = p_expected_attempt);
    END IF;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN (v_rows_updated > 0);
END;
$$;
