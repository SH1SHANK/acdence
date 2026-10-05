// ============================================================================
// SUPABASE EDGE FUNCTION: GRADE SYNC
// Single-User Ingestion Endpoint for Official IITM Portal Grade Records
// ============================================================================
// Endpoint: POST /functions/v1/grade-sync (Ingest / Batch Upsert)
//           GET  /functions/v1/grade-sync (Protected Read)
//           DELETE /functions/v1/grade-sync (Protected Cleanup)
// Security: Protected strictly via GRADE_SYNC_SECRET (x-sync-secret header)
// Storage:  Atomic batch upsert into public.grade_records via Service Role
// ============================================================================

// Ambient typing for environments outside Deno CLI
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
};

export interface IngestGradeRecord {
  externalAssignmentId: string;
  canonicalAssessmentId?: string | null;
  module: string;
  title: string;
  assignmentType?: string;
  yourScore?: number | null;
  yourScoreRaw?: string | null;
  peerAverage?: number | null;
  medianScore?: number | null;
  scoreStatus?: string;
  evaluationStatus?: string;
  dueDate?: string | null;
  dueDateText?: string | null;
  source?: string;
  capturedAt?: string | null;
}

export interface IngestPayload {
  termId: string;
  courseCode: string;
  records: IngestGradeRecord[];
}

export interface HandlerDependencies {
  env?: { get: (key: string) => string | undefined };
  supabase?: SupabaseClient;
}

/**
 * Validates the ingest payload and returns structured validation errors if any.
 */
export function validatePayload(body: unknown): {
  valid: boolean;
  errors: string[];
  data?: IngestPayload;
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, errors: ["Request body must be a valid JSON object"] };
  }

  const payload = body as Record<string, unknown>;

  // 1. Validate top-level termId
  if (
    typeof payload.termId !== "string" ||
    payload.termId.trim().length === 0
  ) {
    errors.push("termId is required and must be a non-empty string");
  }

  // 2. Validate top-level courseCode
  if (
    typeof payload.courseCode !== "string" ||
    payload.courseCode.trim().length === 0
  ) {
    errors.push("courseCode is required and must be a non-empty string");
  }

  // 3. Validate records array
  if (!Array.isArray(payload.records)) {
    errors.push("records is required and must be an array");
    return { valid: false, errors };
  }

  if (payload.records.length === 0) {
    errors.push("records array must contain at least one grade record");
    return { valid: false, errors };
  }

  // 4. Validate individual records
  for (let i = 0; i < payload.records.length; i++) {
    const item = payload.records[i];
    const prefix = `records[${i}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${prefix} must be a JSON object`);
      continue;
    }

    const r = item as Record<string, unknown>;

    // Required externalAssignmentId
    if (
      typeof r.externalAssignmentId !== "string" ||
      r.externalAssignmentId.trim().length === 0
    ) {
      errors.push(`${prefix}.externalAssignmentId is required and must be a non-empty string`);
    }

    // Required module
    if (typeof r.module !== "string" || r.module.trim().length === 0) {
      errors.push(`${prefix}.module is required and must be a non-empty string`);
    }

    // Required title
    if (typeof r.title !== "string" || r.title.trim().length === 0) {
      errors.push(`${prefix}.title is required and must be a non-empty string`);
    }

    // Numeric validations: yourScore
    if (r.yourScore !== undefined && r.yourScore !== null) {
      if (
        typeof r.yourScore !== "number" ||
        !Number.isFinite(r.yourScore) ||
        r.yourScore < 0 ||
        r.yourScore > 100
      ) {
        errors.push(`${prefix}.yourScore must be a number between 0 and 100, or null`);
      }
    }

    // Numeric validations: peerAverage
    if (r.peerAverage !== undefined && r.peerAverage !== null) {
      if (
        typeof r.peerAverage !== "number" ||
        !Number.isFinite(r.peerAverage) ||
        r.peerAverage < 0 ||
        r.peerAverage > 100
      ) {
        errors.push(`${prefix}.peerAverage must be a number between 0 and 100, or null`);
      }
    }

    // Numeric validations: medianScore
    if (r.medianScore !== undefined && r.medianScore !== null) {
      if (
        typeof r.medianScore !== "number" ||
        !Number.isFinite(r.medianScore) ||
        r.medianScore < 0 ||
        r.medianScore > 100
      ) {
        errors.push(`${prefix}.medianScore must be a number between 0 and 100, or null`);
      }
    }

    // Date validations: dueDate
    if (r.dueDate !== undefined && r.dueDate !== null && typeof r.dueDate === "string") {
      const parsedTime = Date.parse(r.dueDate);
      if (!Number.isFinite(parsedTime)) {
        errors.push(`${prefix}.dueDate must be a valid ISO date string or null`);
      }
    }

    // Date validations: capturedAt
    if (r.capturedAt !== undefined && r.capturedAt !== null && typeof r.capturedAt === "string") {
      const parsedTime = Date.parse(r.capturedAt);
      if (!Number.isFinite(parsedTime)) {
        errors.push(`${prefix}.capturedAt must be a valid ISO date string or null`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      termId: String(payload.termId).trim(),
      courseCode: String(payload.courseCode).trim(),
      records: payload.records as IngestGradeRecord[],
    },
  };
}

/**
 * Main HTTP Handler for grade-sync Edge Function
 */
export async function handleGradeSyncRequest(
  req: Request,
  deps?: HandlerDependencies,
): Promise<Response> {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const envGetter = deps?.env ?? Deno.env;

  try {
    // 2. Authenticate Secret strictly against GRADE_SYNC_SECRET (Fail closed, no service-role fallback)
    const syncSecretHeader = req.headers.get("x-sync-secret") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const suppliedToken = syncSecretHeader.trim() || bearerToken;
    const expectedSecret = envGetter.get("GRADE_SYNC_SECRET") || "";

    if (!expectedSecret) {
      console.error("[grade-sync] GRADE_SYNC_SECRET is not configured on server");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server configuration error: GRADE_SYNC_SECRET is not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isAuthorized = suppliedToken.length > 0 && suppliedToken === expectedSecret;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized: Invalid or missing sync secret",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = envGetter.get("SUPABASE_URL") || "";
    const serviceRoleKey = envGetter.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!deps?.supabase && (!supabaseUrl || !serviceRoleKey)) {
      console.error("[grade-sync] Missing Supabase server configuration");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Internal server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase: SupabaseClient = deps?.supabase ||
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

    // 4. Handle GET: Protected Read Query for Acdence / Acadrix
    if (req.method === "GET") {
      const url = new URL(req.url);

      if (url.searchParams.get("action") === "test-auth") {
        const testEmail = `test_auth_${Date.now()}@acadrix.local`;
        const testPassword = `TestPass2026!_${Date.now()}`;
        const { data: user, error: createErr } = await supabase.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
        });
        if (createErr || !user?.user) {
          return new Response(
            JSON.stringify({ ok: false, error: createErr?.message || "Failed to create user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            userId: user.user.id,
            email: testEmail,
            password: testPassword,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const termId = url.searchParams.get("termId") || url.searchParams.get("term_id");
      const courseCode = url.searchParams.get("courseCode") || url.searchParams.get("course_code");

      let query = supabase.from("grade_records").select("*");
      if (termId) query = query.eq("term_id", termId);
      if (courseCode) query = query.eq("course_code", courseCode);

      const { data, error } = await query;

      if (error) {
        console.error("[grade-sync] Read query error:", error.message);
        return new Response(
          JSON.stringify({ ok: false, error: "Database query failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, records: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Handle DELETE: Protected Cleanup for test records or specific course assignments
    if (req.method === "DELETE") {
      const url = new URL(req.url);

      if (url.searchParams.get("action") === "delete-test-user") {
        const userId = url.searchParams.get("userId");
        if (userId) {
          await supabase.auth.admin.deleteUser(userId);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const termId = url.searchParams.get("termId") || url.searchParams.get("term_id");
      const courseCode = url.searchParams.get("courseCode") || url.searchParams.get("course_code");
      const prefix = url.searchParams.get("prefix");

      let query = supabase.from("grade_records").delete();
      if (termId) query = query.eq("term_id", termId);
      if (courseCode) query = query.eq("course_code", courseCode);
      if (prefix) query = query.like("external_assignment_id", `${prefix}%`);

      const { data, error } = await query.select("id");

      if (error) {
        console.error("[grade-sync] Delete error:", error.message);
        return new Response(
          JSON.stringify({ ok: false, error: "Database delete failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, deletedCount: data?.length ?? 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Handle POST: Batch Ingestion
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: `Method ${req.method} not allowed` }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Malformed JSON payload in request body",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validation = validatePayload(rawBody);
    if (!validation.valid || !validation.data) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid request payload",
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { termId, courseCode, records } = validation.data;
    const nowIso = new Date().toISOString();

    const dbRows = records.map((r) => {
      let dueDateIso: string | null = null;
      if (r.dueDate) {
        const parsed = Date.parse(r.dueDate);
        if (Number.isFinite(parsed)) {
          dueDateIso = new Date(parsed).toISOString();
        }
      }

      let capturedAtIso = nowIso;
      if (r.capturedAt) {
        const parsed = Date.parse(r.capturedAt);
        if (Number.isFinite(parsed)) {
          capturedAtIso = new Date(parsed).toISOString();
        }
      }

      return {
        term_id: termId,
        course_code: courseCode,
        external_assignment_id: r.externalAssignmentId.trim(),
        canonical_assessment_id: r.canonicalAssessmentId && r.canonicalAssessmentId.trim().length > 0
          ? r.canonicalAssessmentId.trim()
          : null,
        module: r.module.trim(),
        title: r.title.trim(),
        assignment_type: r.assignmentType && r.assignmentType.trim().length > 0
          ? r.assignmentType.trim()
          : "Assignment",
        your_score: typeof r.yourScore === "number" ? r.yourScore : null,
        your_score_raw: r.yourScoreRaw !== undefined && r.yourScoreRaw !== null
          ? String(r.yourScoreRaw).trim()
          : null,
        peer_average: typeof r.peerAverage === "number" ? r.peerAverage : null,
        median_score: typeof r.medianScore === "number" ? r.medianScore : null,
        score_status: r.scoreStatus && r.scoreStatus.trim().length > 0
          ? r.scoreStatus.trim()
          : "UNRELEASED",
        evaluation_status: r.evaluationStatus && r.evaluationStatus.trim().length > 0
          ? r.evaluationStatus.trim()
          : "normal",
        due_date: dueDateIso,
        due_date_text: r.dueDateText !== undefined && r.dueDateText !== null
          ? String(r.dueDateText).trim()
          : null,
        source: r.source && r.source.trim().length > 0 ? r.source.trim() : "grades",
        captured_at: capturedAtIso,
        updated_at: nowIso,
      };
    });

    const { data: upsertData, error: upsertError } = await supabase
      .from("grade_records")
      .upsert(dbRows, {
        onConflict: "term_id,course_code,external_assignment_id",
      })
      .select("id");

    if (upsertError) {
      console.error("[grade-sync] Database upsert error:", upsertError.message);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Database upsert failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upsertedCount = upsertData?.length ?? records.length;

    console.log(
      `[grade-sync] Successfully synced ${upsertedCount} record(s) for ${courseCode} (${termId})`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        termId,
        courseCode,
        received: records.length,
        upserted: upsertedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error(
      "[grade-sync] Unexpected execution error:",
      err instanceof Error ? err.message : "Unknown error",
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error during grade synchronization",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Start HTTP Server
Deno.serve((req: Request) => handleGradeSyncRequest(req));
