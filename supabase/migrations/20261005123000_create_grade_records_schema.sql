-- =========================================================================
-- ACDENCE / ACADRIX GRADE SYNC: SINGLE-USER GRADE RECORDS SCHEMA
-- Migration: 20261005123000_create_grade_records_schema.sql
-- =========================================================================

-- 1. CREATE SINGLE-USER AUTHORITATIVE GRADE TABLE
CREATE TABLE IF NOT EXISTS public.grade_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    term_id TEXT NOT NULL,
    course_code TEXT NOT NULL,

    external_assignment_id TEXT NOT NULL,
    canonical_assessment_id TEXT,

    module TEXT NOT NULL,
    title TEXT NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'Assignment',

    your_score NUMERIC(5,2) CHECK (your_score IS NULL OR (your_score >= 0 AND your_score <= 100)),
    your_score_raw TEXT,

    peer_average NUMERIC(5,2) CHECK (peer_average IS NULL OR (peer_average >= 0 AND peer_average <= 100)),
    median_score NUMERIC(5,2) CHECK (median_score IS NULL OR (median_score >= 0 AND median_score <= 100)),

    score_status TEXT NOT NULL DEFAULT 'UNRELEASED',
    evaluation_status TEXT NOT NULL DEFAULT 'normal',

    due_date TIMESTAMPTZ,
    due_date_text TEXT,

    source TEXT NOT NULL DEFAULT 'grades',

    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_term_course_assignment
        UNIQUE (term_id, course_code, external_assignment_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_grade_records_term_course
ON public.grade_records(term_id, course_code);

CREATE INDEX IF NOT EXISTS idx_grade_records_canonical
ON public.grade_records(canonical_assessment_id)
WHERE canonical_assessment_id IS NOT NULL;

-- 3. SECURITY & RLS CONFIGURATION
-- Enable RLS so public write access (anon/authenticated insert/update/delete) is denied.
-- Only the service-role (via grade-sync Edge Function) performs writes.
-- Read access is permitted for client queries.
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grade_records_read_policy"
ON public.grade_records FOR SELECT
USING (true);

-- 4. REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_records;
