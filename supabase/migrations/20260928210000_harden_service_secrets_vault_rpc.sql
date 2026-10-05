-- =========================================================================
-- ACDENCE PHASE 5 HARDENING: SECURE SERVICE SECRETS VAULT RPC
-- 1. Whitelists permitted secret names ('cron_secret', 'onesignal_app_id', 'onesignal_rest_api_key')
-- 2. Blocks arbitrary secret retrieval from Supabase Vault
-- 3. Restricts execute privileges strictly to service_role and postgres
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_service_secret(p_secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
    v_secret text;
BEGIN
    -- Strict whitelist of permitted service secrets
    IF p_secret_name NOT IN ('cron_secret', 'onesignal_app_id', 'onesignal_rest_api_key') THEN
        RAISE EXCEPTION 'Access denied to secret: %', p_secret_name;
    END IF;

    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = p_secret_name
    LIMIT 1;

    RETURN v_secret;
END;
$$;

-- Restrict execution strictly to service_role and postgres
REVOKE EXECUTE ON FUNCTION public.get_service_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_secret(text) TO service_role;
