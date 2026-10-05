-- =========================================================================
-- ACDENCE SECURITY HARDENING: REMOVE OBSOLETE SERVICE SECRETS VAULT RPC
-- 1. Drop public.get_service_secret(p_secret_name)
--    Secrets (CRON_SECRET, ONESIGNAL_*) are now provided directly through
--    native Supabase Edge Function environment variables.
-- 2. Eliminates unnecessary database privilege coupling and PostgREST RPC exposure.
-- 3. Hardens pg_net schema tables against client-role inspection.
-- 4. pg_cron continues to access vault.decrypted_secrets directly as superuser/postgres.
-- =========================================================================

-- 1. Hardens net schema tables against anon/authenticated inspection
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated, PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM anon, authenticated, PUBLIC;
REVOKE USAGE ON SCHEMA net FROM anon, authenticated, PUBLIC;

-- 2. Drop obsolete get_service_secret RPC
REVOKE ALL ON FUNCTION public.get_service_secret(text) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_service_secret(text);
