import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client-safe default credentials for active Acdence Supabase project
const DEFAULT_SUPABASE_URL = "https://aocrcrdmwmdtthrwypii.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY3JjcmRtd21kdHRocnd5cGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODg5OTYsImV4cCI6MjEwNjA2NDk5Nn0.LTTbBscGie1nfUTnjAjvuuJ2tjW0F4znDl9C5C8bAp8";

export const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabase();

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
