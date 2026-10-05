import type { DbGradeRecord } from "@/types/gradeRecord";
import { SUPABASE_URL, getSupabase } from "@/lib/supabase";

export const DEFAULT_TERM_ID = "2026-09";
export const GRADE_RECORDS_CACHE_KEY = "acdence_grade_records_cache_v1";

export interface CachedGradesPayload {
  termId: string;
  records: DbGradeRecord[];
  cachedAt: string;
}

export interface FetchGradeRecordsOptions {
  supabaseUrl?: string;
  syncSecret?: string;
  fetchFn?: typeof fetch;
}

export interface FetchGradeRecordsResponse {
  ok: boolean;
  records: DbGradeRecord[];
  count: number;
  error?: string;
}

/**
 * Reads cached grade records from localStorage cache.
 */
export function getCachedGradeRecords(
  termId: string = DEFAULT_TERM_ID,
  courseCode?: string,
): DbGradeRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(GRADE_RECORDS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedGradesPayload;
    if (parsed && Array.isArray(parsed.records) && (!termId || parsed.termId === termId)) {
      if (courseCode) {
        const target = courseCode.toUpperCase().trim();
        return parsed.records.filter((r) => r.course_code.toUpperCase().trim() === target);
      }
      return parsed.records;
    }
  } catch {
    // Ignore JSON parse errors on cache
  }
  return [];
}

/**
 * Saves grade records into localStorage cache.
 */
export function saveCachedGradeRecords(
  records: DbGradeRecord[],
  termId: string = DEFAULT_TERM_ID,
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload: CachedGradesPayload = {
      termId,
      records,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(GRADE_RECORDS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Clears cached grade records from localStorage.
 */
export function clearCachedGradeRecords(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(GRADE_RECORDS_CACHE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Single-User Grade Repository Read Client.
 *
 * Reads authoritative portal grade snapshots:
 * 1. If explicit syncSecret is provided: calls protected Edge Function (GET /functions/v1/grade-sync).
 * 2. Otherwise: queries Supabase PostgREST directly (RLS protected: authenticated users have SELECT access).
 * 3. On successful fetch: updates local cache.
 * 4. On network/query failure: falls back to local cache if present.
 *
 * Architecture Invariants:
 * 1. Read-only: Acdence never mutates, upserts, or deletes public.grade_records.
 * 2. Single-user, single-tenant: No userId or tenant scoping.
 * 3. No client secret leaks: Default secrets are not bundled into client JavaScript.
 *
 * @param termId Academic term identifier (e.g., "2026-09")
 * @param courseCode Optional course code filter (e.g., "CS2006", "SE2001")
 * @param options Optional configuration overrides (useful for testing)
 * @returns Promise resolving to an array of DbGradeRecord
 */
export async function fetchGradeRecords(
  termId: string = DEFAULT_TERM_ID,
  courseCode?: string,
  options?: FetchGradeRecordsOptions,
): Promise<DbGradeRecord[]> {
  const secret =
    options?.syncSecret ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GRADE_SYNC_SECRET);

  // If a secret is explicitly provided, fetch via the protected Edge Function endpoint
  if (secret) {
    const customFetch =
      options?.fetchFn || (typeof globalThis !== "undefined" ? globalThis.fetch : fetch);
    const baseUrl = (options?.supabaseUrl || SUPABASE_URL).replace(/\/+$/, "");

    const queryParams = new URLSearchParams();
    if (termId) {
      queryParams.set("termId", termId);
    }
    if (courseCode) {
      queryParams.set("courseCode", courseCode);
    }

    const endpointUrl = `${baseUrl}/functions/v1/grade-sync?${queryParams.toString()}`;

    try {
      const headers: Record<string, string> = {
        "x-sync-secret": secret,
        Accept: "application/json",
      };

      const response = await customFetch(endpointUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson && typeof errorJson === "object" && errorJson.error) {
            errorMsg = String(errorJson.error);
          }
        } catch {
          // ignore non-json error responses
        }
        throw new Error(`Failed to fetch grade records: ${errorMsg}`);
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        records?: DbGradeRecord[];
        error?: string;
      };

      if (payload.ok === false) {
        throw new Error(payload.error || "Server returned an error response");
      }

      const records = Array.isArray(payload.records) ? payload.records : [];
      saveCachedGradeRecords(records, termId);
      return records;
    } catch (err: unknown) {
      console.warn("[gradeRepository] Edge Function fetch failed, attempting cache fallback:", err);
      const cached = getCachedGradeRecords(termId, courseCode);
      if (cached.length > 0) {
        return cached;
      }
      throw err;
    }
  }

  // Otherwise, query Supabase directly via PostgREST (RLS protected: authenticated users have SELECT access)
  try {
    const supabase = getSupabase();
    let query = supabase.from("grade_records").select("*");

    if (termId) {
      query = query.eq("term_id", termId);
    }
    if (courseCode) {
      query = query.eq("course_code", courseCode);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("[gradeRepository] Supabase postgREST error, checking cache:", error.message);
      const cached = getCachedGradeRecords(termId, courseCode);
      if (cached.length > 0) {
        return cached;
      }
      throw new Error(`Failed to fetch grade records: ${error.message}`);
    }

    const records = (data || []) as DbGradeRecord[];
    if (records.length > 0) {
      saveCachedGradeRecords(records, termId);
    }
    return records;
  } catch (err: unknown) {
    const cached = getCachedGradeRecords(termId, courseCode);
    if (cached.length > 0) {
      console.warn("[gradeRepository] Network error, returning cached grade records");
      return cached;
    }
    const message = err instanceof Error ? err.message : "Network error fetching grade records";
    console.error("[gradeRepository] fetchGradeRecords failed:", message);
    throw err;
  }
}
