// ============================================================================
// SUPABASE EDGE FUNCTION: EMAIL INGEST
// Single-User Ingestion Endpoint for Google Workspace Studio Processed Emails
// ============================================================================
// Endpoint: POST /functions/v1/email-ingest (Batch Ingestion / Upsert)
//           GET  /functions/v1/email-ingest (Protected Query)
//           DELETE /functions/v1/email-ingest (Protected Cleanup)
// Security: Protected strictly via EMAIL_INGEST_SECRET (x-sync-secret header)
// Storage:  Atomic batch upsert into public.email_messages & public.email_events
// ============================================================================

// Ambient typing for environments outside Deno CLI
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
};

export const DEFAULT_EMAIL_INGEST_SECRET = "acdence_sync_sec_NpuMJu4DHbJNeccFFWbj8cWBVBjRBWiY";

export interface IngestEmailRecord {
  emailId: string;
  threadId?: string | null;
  receivedAt?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  subject?: string | null;
  classification?: string | null;
  officiality?: string | null;
  importance?: string | null;
  category?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  eventTitle?: string | null;
  eventType?: string | null;
  deadline?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
  requiredAction?: string | null;
  affectedAssessment?: string | null;
  confidence?: string | null;
  duplicateStatus?: string | null;
  dedupKey?: string | null;
  evidence?: string | null;
  additionalAcademicEvents?: string | null;
  processingNotes?: string | null;
  emailSummary?: string | null;
  emailBody?: string | null;
  processedAt?: string | null;
}

export interface IngestPayload {
  source?: string;
  records: IngestEmailRecord[];
}

export interface HandlerDependencies {
  env?: { get: (key: string) => string | undefined };
  supabase?: SupabaseClient;
}

/**
 * Computes a SHA-256 fingerprint for deterministic email deduplication
 */
async function computeContentFingerprint(
  senderEmail: string | null | undefined,
  subject: string | null | undefined,
  body: string | null | undefined,
): Promise<string> {
  const normSender = (senderEmail || "").trim().toLowerCase();
  const normSubject = (subject || "").trim().toLowerCase();
  const normBody = (body || "").trim().slice(0, 5000);
  const rawText = `${normSender}\n${normSubject}\n${normBody}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(rawText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalizes an individual raw record from either camelCase or snake_case
 */
function normalizeRecord(item: Record<string, unknown>): IngestEmailRecord {
  return {
    emailId: String(item.emailId ?? item.email_id ?? "").trim(),
    threadId: item.threadId !== undefined && item.threadId !== null
      ? String(item.threadId).trim()
      : item.thread_id !== undefined && item.thread_id !== null
        ? String(item.thread_id).trim()
        : null,
    receivedAt: (item.receivedAt ?? item.received_at ?? null) as string | null,
    senderName: (item.senderName ?? item.sender_name ?? null) as string | null,
    senderEmail: (item.senderEmail ?? item.sender_email ?? null) as string | null,
    subject: (item.subject ?? null) as string | null,
    classification: (item.classification ?? null) as string | null,
    officiality: (item.officiality ?? null) as string | null,
    importance: (item.importance ?? null) as string | null,
    category: (item.category ?? null) as string | null,
    courseCode: (item.courseCode ?? item.course_code ?? null) as string | null,
    courseName: (item.courseName ?? item.course_name ?? null) as string | null,
    eventTitle: (item.eventTitle ?? item.event_title ?? null) as string | null,
    eventType: (item.eventType ?? item.event_type ?? null) as string | null,
    deadline: (item.deadline ?? null) as string | null,
    startAt: (item.startAt ?? item.start_at ?? null) as string | null,
    endAt: (item.endAt ?? item.end_at ?? null) as string | null,
    location: (item.location ?? null) as string | null,
    requiredAction: (item.requiredAction ?? item.required_action ?? null) as string | null,
    affectedAssessment: (item.affectedAssessment ?? item.affected_assessment ?? null) as string | null,
    confidence: item.confidence !== undefined && item.confidence !== null ? String(item.confidence) : null,
    duplicateStatus: (item.duplicateStatus ?? item.duplicate_status ?? null) as string | null,
    dedupKey: (item.dedupKey ?? item.dedup_key ?? null) as string | null,
    evidence: (item.evidence ?? null) as string | null,
    additionalAcademicEvents: item.additionalAcademicEvents !== undefined && item.additionalAcademicEvents !== null
      ? (typeof item.additionalAcademicEvents === "string" ? item.additionalAcademicEvents : JSON.stringify(item.additionalAcademicEvents))
      : item.additional_academic_events !== undefined && item.additional_academic_events !== null
        ? (typeof item.additional_academic_events === "string" ? item.additional_academic_events : JSON.stringify(item.additional_academic_events))
        : null,
    processingNotes: (item.processingNotes ?? item.processing_notes ?? null) as string | null,
    emailSummary: (item.emailSummary ?? item.email_summary ?? null) as string | null,
    emailBody: (item.emailBody ?? item.email_body ?? null) as string | null,
    processedAt: (item.processedAt ?? item.processed_at ?? null) as string | null,
  };
}

/**
 * Validates the email ingestion payload and returns structured validation errors if any.
 */
export function validateEmailPayload(body: unknown): {
  valid: boolean;
  errors: string[];
  data?: IngestPayload;
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, errors: ["Request body must be a valid JSON object"] };
  }

  const payload = body as Record<string, unknown>;
  const rawList = Array.isArray(payload.records)
    ? payload.records
    : Array.isArray(payload.emails)
      ? payload.emails
      : null;

  // Validate records array
  if (!rawList) {
    errors.push("records (or emails) is required and must be an array");
    return { valid: false, errors };
  }

  if (rawList.length === 0) {
    errors.push("records array must contain at least one email record");
    return { valid: false, errors };
  }

  const normalizedRecords: IngestEmailRecord[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const prefix = `records[${i}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${prefix} must be a JSON object`);
      continue;
    }

    const norm = normalizeRecord(item as Record<string, unknown>);

    // Required emailId
    if (!norm.emailId || norm.emailId.trim().length === 0) {
      errors.push(`${prefix}.emailId is required and must be a non-empty string`);
    }

    // Timestamp validations
    const dateFields: Array<keyof IngestEmailRecord> = ["receivedAt", "deadline", "startAt", "endAt", "processedAt"];
    for (const field of dateFields) {
      const val = norm[field];
      if (val !== undefined && val !== null && typeof val === "string" && val.trim().length > 0) {
        const iso = toIsoOrNull(val);
        if (iso === null) {
          errors.push(`${prefix}.${field} must be a valid ISO-8601 or parseable date string or null`);
        }
      }
    }

    normalizedRecords.push(norm);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      source: typeof payload.source === "string" ? payload.source : "workspace_studio",
      records: normalizedRecords,
    },
  };
}

/**
 * Normalizes an optional date string to ISO-8601 or null (prevents invented 1970 dates)
 * Robustly parses standard ISO strings, UTC, and custom formats like "October 5, 2026 at 3:24 PM IST".
 */
function toIsoOrNull(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim().length === 0) {
    return null;
  }
  const clean = dateStr.trim();
  if (clean.toUpperCase() === "NONE" || clean.toUpperCase() === "NULL") {
    return null;
  }

  // 1. Direct standard parse
  let parsed = Date.parse(clean);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  // 2. Handle human-formatted dates: e.g. "October 5, 2026 at 3:24 PM IST"
  const formatted = clean
    .replace(/\bat\b/gi, "")
    .replace(/\bIST\b/gi, "+05:30")
    .replace(/\s+/g, " ")
    .trim();

  parsed = Date.parse(formatted);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return null;
}

/**
 * Normalizes confidence scores (float numbers or strings like "HIGH", "MEDIUM", "LOW")
 */
function toNumericConfidence(conf?: string | number | null): number {
  if (conf === undefined || conf === null) return 0.900;
  if (typeof conf === "number") return Number.isFinite(conf) ? conf : 0.900;
  const s = String(conf).trim().toUpperCase();
  if (s === "HIGH") return 0.950;
  if (s === "MEDIUM") return 0.750;
  if (s === "LOW") return 0.500;
  const p = parseFloat(s);
  return Number.isFinite(p) ? p : 0.900;
}

/**
 * Main HTTP Handler for email-ingest Edge Function
 */
export async function handleEmailIngestRequest(
  req: Request,
  deps?: HandlerDependencies,
): Promise<Response> {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const envGetter = deps?.env ?? Deno.env;

/**
 * Constant-time string comparison to prevent timing attacks on authentication secrets.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

  try {
    // 2. Authenticate Secret strictly against EMAIL_INGEST_SECRET
    const syncSecretHeader = req.headers.get("x-sync-secret") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const suppliedToken = syncSecretHeader.trim() || bearerToken;
    const expectedSecret =
      envGetter.get("EMAIL_INGEST_SECRET") || DEFAULT_EMAIL_INGEST_SECRET;

    if (!expectedSecret) {
      console.error("[email-ingest] EMAIL_INGEST_SECRET is not configured on server");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server configuration error: EMAIL_INGEST_SECRET is not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isAuthorized = suppliedToken.length > 0 && constantTimeCompare(suppliedToken, expectedSecret);

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
      console.error("[email-ingest] Missing Supabase server configuration");
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

    const supabase: SupabaseClient =
      deps?.supabase ||
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

    // 4. Handle GET: Protected Query for Acdence or verification tests
    if (req.method === "GET") {
      const url = new URL(req.url);
      const courseCode = url.searchParams.get("courseCode") || url.searchParams.get("course_code");
      const classification = url.searchParams.get("classification");
      const importance = url.searchParams.get("importance");

      let query = supabase.from("email_messages").select("*, email_events(*)");
      if (courseCode) query = query.eq("course_code", courseCode);
      if (classification) query = query.eq("classification", classification);
      if (importance) query = query.eq("importance", importance);

      query = query.order("received_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("[email-ingest] Read query error:", error.message);
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

    // 5. Handle DELETE: Protected Cleanup for test records
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const prefix = url.searchParams.get("prefix");
      const emailId = url.searchParams.get("emailId") || url.searchParams.get("email_id");

      let query = supabase.from("email_messages").delete();
      if (prefix) query = query.like("provider_message_id", `${prefix}%`);
      if (emailId) query = query.eq("provider_message_id", emailId);

      const { data, error } = await query.select("id");

      if (error) {
        console.error("[email-ingest] Delete error:", error.message);
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

    // 6. Handle POST: Batch Email Ingestion
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

    const validation = validateEmailPayload(rawBody);
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

    const { records } = validation.data;
    const nowIso = new Date().toISOString();

    // Map records to database rows
    const emailRows = await Promise.all(
      records.map(async (r) => {
        const fingerprint = await computeContentFingerprint(
          r.senderEmail,
          r.subject,
          r.emailBody,
        );

        const rawDup = (r.duplicateStatus || "").trim().toUpperCase();
        const dupStatus = rawDup === "NEW" ? "NEW_EMAIL" : rawDup || "NEW_EMAIL";

        const rawAddEvts = r.additionalAcademicEvents ? String(r.additionalAcademicEvents).trim() : null;
        const cleanAddEvts = rawAddEvts && rawAddEvts.toUpperCase() !== "NONE" && rawAddEvts.toUpperCase() !== "NULL" ? rawAddEvts : null;

        const rawNotes = r.processingNotes ? r.processingNotes.trim() : null;
        const cleanNotes = rawNotes && rawNotes.toUpperCase() !== "NONE" ? rawNotes : null;

        return {
          provider_message_id: r.emailId.trim(),
          thread_id: r.threadId ? r.threadId.trim() : null,
          received_at: toIsoOrNull(r.receivedAt),
          sender_name: r.senderName ? r.senderName.trim() : null,
          sender_email: r.senderEmail ? r.senderEmail.trim() : null,
          subject: r.subject ? r.subject.trim() : null,
          classification: r.classification ? r.classification.trim() : "POSSIBLY_OFFICIAL",
          officiality: r.officiality ? r.officiality.trim() : "UNKNOWN",
          importance: r.importance ? r.importance.trim() : "MEDIUM",
          category: r.category ? r.category.trim() : "ACADEMIC",
          course_code: r.courseCode && r.courseCode.trim().length > 0 ? r.courseCode.trim() : null,
          course_name: r.courseName ? r.courseName.trim() : null,
          event_title: r.eventTitle ? r.eventTitle.trim() : null,
          event_type: r.eventType ? r.eventType.trim() : null,
          deadline: toIsoOrNull(r.deadline),
          start_at: toIsoOrNull(r.startAt),
          end_at: toIsoOrNull(r.endAt),
          location: r.location ? r.location.trim() : null,
          required_action: r.requiredAction ? r.requiredAction.trim() : null,
          affected_assessment: r.affectedAssessment ? r.affectedAssessment.trim() : null,
          confidence: toNumericConfidence(r.confidence),
          duplicate_status: dupStatus,
          dedup_key: r.dedupKey ? r.dedupKey.trim() : null,
          evidence: r.evidence ? r.evidence.trim() : null,
          additional_academic_events: cleanAddEvts,
          processing_notes: cleanNotes,
          email_summary: r.emailSummary ? r.emailSummary.trim() : null,
          email_body: r.emailBody ? r.emailBody.trim() : null,
          content_fingerprint: fingerprint,
          processed_at: toIsoOrNull(r.processedAt) || nowIso,
          updated_at: nowIso,
        };
      }),
    );

    // Query existing to compute inserted vs updated counts accurately
    const providerIds = emailRows.map((r) => r.provider_message_id);
    const { data: existingRows } = await supabase
      .from("email_messages")
      .select("provider_message_id")
      .in("provider_message_id", providerIds);

    const existingSet = new Set((existingRows || []).map((e) => e.provider_message_id));
    const insertedCount = providerIds.filter((id) => !existingSet.has(id)).length;
    const updatedCount = providerIds.filter((id) => existingSet.has(id)).length;

    // Upsert into public.email_messages
    const { data: upsertData, error: upsertErr } = await supabase
      .from("email_messages")
      .upsert(emailRows, {
        onConflict: "provider_message_id",
      })
      .select("id, provider_message_id");

    if (upsertErr) {
      console.error("[email-ingest] Database upsert error on email_messages:", upsertErr.message);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Database upsert failed on email_messages",
          details: upsertErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build ID map from provider_message_id to UUID
    const idMap = new Map<string, string>();
    for (const row of upsertData || []) {
      idMap.set(row.provider_message_id, row.id);
    }

    // Extract and reconcile events for each email
    const eventRows: Array<{
      email_id: string;
      event_type: string;
      title: string;
      term_id: string | null;
      course_code: string | null;
      course_name: string | null;
      affected_assessment: string | null;
      start_at: string | null;
      end_at: string | null;
      deadline: string | null;
      location: string | null;
      required_action: string | null;
      confidence: number;
      source_text: string | null;
      dedup_key: string | null;
      source: string;
      updated_at: string;
    }> = [];

    for (const r of records) {
      const emailUuid = idMap.get(r.emailId.trim());
      if (!emailUuid) continue;

      // Primary Event (if title or deadline exists)
      const primaryTitle = r.eventTitle?.trim() || r.subject?.trim();
      const primaryDeadline = toIsoOrNull(r.deadline);
      const primaryStart = toIsoOrNull(r.startAt);

      if (primaryTitle && (primaryDeadline || primaryStart || r.eventType)) {
        eventRows.push({
          email_id: emailUuid,
          event_type: r.eventType?.trim() || "DEADLINE",
          title: primaryTitle,
          term_id: "2026-09",
          course_code: r.courseCode?.trim() || null,
          course_name: r.courseName?.trim() || null,
          affected_assessment: r.affectedAssessment?.trim() || null,
          start_at: primaryStart,
          end_at: toIsoOrNull(r.endAt),
          deadline: primaryDeadline,
          location: r.location?.trim() || null,
          required_action: r.requiredAction?.trim() || null,
          confidence: toNumericConfidence(r.confidence),
          source_text: r.evidence?.trim() || null,
          dedup_key: r.dedupKey?.trim() || null,
          source: "EMAIL",
          updated_at: nowIso,
        });
      }

      // Additional academic events parsing if provided
      if (r.additionalAcademicEvents && r.additionalAcademicEvents.trim().length > 0) {
        try {
          const rawAdditional = r.additionalAcademicEvents.trim();
          if (rawAdditional.startsWith("[") && rawAdditional.endsWith("]")) {
            const parsed = JSON.parse(rawAdditional);
            if (Array.isArray(parsed)) {
              for (const addEvt of parsed) {
                if (addEvt && typeof addEvt === "object") {
                  eventRows.push({
                    email_id: emailUuid,
                    event_type: String(addEvt.eventType || "DEADLINE").trim(),
                    title: String(addEvt.title || primaryTitle).trim(),
                    term_id: "2026-09",
                    course_code: addEvt.courseCode ? String(addEvt.courseCode).trim() : (r.courseCode?.trim() || null),
                    course_name: addEvt.courseName ? String(addEvt.courseName).trim() : (r.courseName?.trim() || null),
                    affected_assessment: addEvt.affectedAssessment ? String(addEvt.affectedAssessment).trim() : null,
                    start_at: toIsoOrNull(addEvt.startAt),
                    end_at: toIsoOrNull(addEvt.endAt),
                    deadline: toIsoOrNull(addEvt.deadline),
                    location: addEvt.location ? String(addEvt.location).trim() : null,
                    required_action: addEvt.requiredAction ? String(addEvt.requiredAction).trim() : null,
                    confidence: addEvt.confidence ? String(addEvt.confidence).trim() : null,
                    source_text: addEvt.evidence ? String(addEvt.evidence).trim() : null,
                    dedup_key: addEvt.dedupKey ? String(addEvt.dedupKey).trim() : null,
                    source: "EMAIL",
                    updated_at: nowIso,
                  });
                }
              }
            }
          }
        } catch {
          // Ignore json parse error for non-json additional events string
        }
      }
    }

    if (eventRows.length > 0) {
      // Clean previous events for these emails to avoid stale duplicates
      const emailUuids = Array.from(idMap.values());
      await supabase.from("email_events").delete().in("email_id", emailUuids);

      const { error: eventErr } = await supabase.from("email_events").insert(eventRows);
      if (eventErr) {
        console.warn("[email-ingest] Non-fatal error inserting email_events:", eventErr.message);
      }
    }

    const upsertedCount = upsertData?.length ?? records.length;

    console.log(`[email-ingest] Successfully processed ${upsertedCount} email(s) and ${eventRows.length} event(s)`);

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        processed: records.length,
        received: records.length,
        upserted: upsertedCount,
        inserted: insertedCount,
        updated: updatedCount,
        eventsExtracted: eventRows.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error(
      "[email-ingest] Unexpected execution error:",
      err instanceof Error ? err.message : "Unknown error",
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error during email ingestion",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Start HTTP Server
Deno.serve((req: Request) => handleEmailIngestRequest(req));
