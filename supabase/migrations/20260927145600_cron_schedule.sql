-- =========================================================================
-- ACDENCE PHASE 1 MIGRATION: SUPABASE CRON SCHEDULER FOUNDATION
-- Project: Acdence
-- =========================================================================

-- 1. Unschedule existing job if re-running
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'eval-deadline-notifications-15m') THEN
        PERFORM cron.unschedule('eval-deadline-notifications-15m');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Schedule 15-minute Edge Function evaluation job via pg_cron and pg_net
-- The job retrieves the project URL and CRON_SECRET from Supabase Vault (vault.decrypted_secrets).
-- If secrets are not yet configured in Vault, it falls back safely without erroring.
SELECT cron.schedule(
    'eval-deadline-notifications-15m',
    '*/15 * * * *',
    $$
    DO $cron_body$
    DECLARE
        v_url TEXT;
        v_secret TEXT;
    BEGIN
        SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1;
        SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;

        IF v_url IS NOT NULL THEN
            PERFORM net.http_post(
                url := v_url || '/functions/v1/deadline-notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || COALESCE(v_secret, '')
                ),
                body := jsonb_build_object('triggered_at', now(), 'source', 'pg_cron'),
                timeout_milliseconds := 10000
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END $cron_body$;
    $$
);

-- 3. Pause job by default until Edge Function is implemented in Phase 5
SELECT cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'eval-deadline-notifications-15m'),
    active := false
);
