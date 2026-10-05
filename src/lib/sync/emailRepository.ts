// ============================================================================
// ACADRIX / ACDENCE — EMAIL INTELLIGENCE REPOSITORY
// Supabase-first single-user client for email messages and academic events
// ============================================================================

import { getSupabase } from "@/lib/supabase";
import type {
  DbEmailMessage,
  DbEmailEvent,
  EmailMessage,
  EmailEvent,
  EmailClassification,
  EmailOfficiality,
  EmailImportance,
  EmailCategory,
  EmailEventType,
  EmailDuplicateStatus,
} from "@/types/email";
import type { CourseCode } from "@/types/course";

export const EMAIL_MESSAGES_CACHE_KEY = "acdence_email_messages_cache_v1";
export const EMAIL_EVENTS_CACHE_KEY = "acdence_email_events_cache_v1";

export interface CachedEmailsPayload {
  emails: EmailMessage[];
  cachedAt: string;
}

export interface CachedEmailEventsPayload {
  events: EmailEvent[];
  cachedAt: string;
}

export interface FetchEmailOptions {
  courseCode?: CourseCode | string;
  classification?: EmailClassification;
  importance?: EmailImportance;
  category?: EmailCategory;
  limit?: number;
}

/**
 * Transforms a raw database email row to a typed domain EmailMessage.
 */
export function mapDbEmailToDomain(row: DbEmailMessage, events?: EmailEvent[]): EmailMessage {
  return {
    id: row.id,
    providerMessageId: row.provider_message_id,
    threadId: row.thread_id,
    receivedAt: row.received_at,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    subject: row.subject,
    classification: (row.classification as EmailClassification) || "POSSIBLY_OFFICIAL",
    officiality: (row.officiality as EmailOfficiality) || "UNKNOWN",
    importance: (row.importance as EmailImportance) || "MEDIUM",
    category: (row.category as EmailCategory) || "ACADEMIC",
    courseCode: row.course_code || null,
    courseName: row.course_name,
    eventTitle: row.event_title,
    eventType: (row.event_type as EmailEventType) || null,
    deadline: row.deadline,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    requiredAction: row.required_action,
    affectedAssessment: row.affected_assessment,
    confidence: row.confidence,
    duplicateStatus: (row.duplicate_status as EmailDuplicateStatus) || "NEW_EMAIL",
    dedupKey: row.dedup_key,
    evidence: row.evidence,
    additionalAcademicEvents: row.additional_academic_events,
    processingNotes: row.processing_notes,
    emailSummary: row.email_summary ?? null,
    emailBody: row.email_body,
    contentFingerprint: row.content_fingerprint,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

/**
 * Transforms a raw database email event row to a typed domain EmailEvent.
 */
export function mapDbEventToDomain(row: DbEmailEvent): EmailEvent {
  return {
    id: row.id,
    emailId: row.email_id,
    eventType: (row.event_type as EmailEventType) || "DEADLINE",
    title: row.title,
    termId: row.term_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    affectedAssessment: row.affected_assessment,
    startAt: row.start_at,
    endAt: row.end_at,
    deadline: row.deadline,
    location: row.location,
    requiredAction: row.required_action,
    confidence: row.confidence,
    sourceText: row.source_text,
    dedupKey: row.dedup_key,
    source: "EMAIL",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Reads cached email messages from localStorage.
 */
export function getCachedEmails(): EmailMessage[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(EMAIL_MESSAGES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedEmailsPayload;
    if (parsed && Array.isArray(parsed.emails)) {
      return parsed.emails;
    }
  } catch {
    // Ignore JSON parse errors on cache
  }
  return [];
}

/**
 * Saves email messages into localStorage cache.
 */
export function saveCachedEmails(emails: EmailMessage[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload: CachedEmailsPayload = {
      emails,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(EMAIL_MESSAGES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota warnings
  }
}

/**
 * Reads cached email events from localStorage.
 */
export function getCachedEmailEvents(): EmailEvent[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(EMAIL_EVENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedEmailEventsPayload;
    if (parsed && Array.isArray(parsed.events)) {
      return parsed.events;
    }
  } catch {
    // Ignore cache read errors
  }
  return [];
}

/**
 * Saves email events into localStorage cache.
 */
export function saveCachedEmailEvents(events: EmailEvent[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload: CachedEmailEventsPayload = {
      events,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(EMAIL_EVENTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota warnings
  }
}

/**
 * Clears cached email data from localStorage.
 */
export function clearCachedEmails(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(EMAIL_MESSAGES_CACHE_KEY);
    window.localStorage.removeItem(EMAIL_EVENTS_CACHE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Fetches all email messages from Supabase (authenticated PostgREST).
 * Updates local cache upon successful fetch, falls back to cache on network failure.
 */
export async function fetchEmailMessages(options?: FetchEmailOptions): Promise<EmailMessage[]> {
  try {
    const supabase = getSupabase();
    let query = supabase.from("email_messages").select("*, email_events(*)");

    if (options?.courseCode) {
      query = query.eq("course_code", options.courseCode);
    }
    if (options?.classification) {
      query = query.eq("classification", options.classification);
    }
    if (options?.importance) {
      query = query.eq("importance", options.importance);
    }
    if (options?.category) {
      query = query.eq("category", options.category);
    }

    query = query.order("received_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("[emailRepository] Supabase fetch error, checking cache:", error.message);
      const cached = getCachedEmails();
      if (cached.length > 0) return cached;
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }

    const emails: EmailMessage[] = (data || []).map((row: any) => {
      const rawEvents: DbEmailEvent[] = Array.isArray(row.email_events) ? row.email_events : [];
      const events = rawEvents.map(mapDbEventToDomain);
      return mapDbEmailToDomain(row, events);
    });

    if (emails.length > 0) {
      saveCachedEmails(emails);
    } else {
      const cached = getCachedEmails();
      if (cached.length > 0) return cached;
    }

    return emails;
  } catch (err: unknown) {
    const cached = getCachedEmails();
    if (cached.length > 0) {
      console.warn("[emailRepository] Network error, returning cached email messages");
      return cached;
    }
    throw err;
  }
}

/**
 * Fetches high-priority / important emails sorted by urgency (earliest deadline first, then newest received).
 */
export async function fetchImportantEmails(): Promise<EmailMessage[]> {
  const allEmails = await fetchEmailMessages();
  return allEmails
    .filter((e) => e.classification === "OFFICIAL_IMPORTANT" || e.importance === "HIGH")
    .sort((a, b) => {
      // Sort by earliest deadline if available
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      // Otherwise newest received first
      const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return timeB - timeA;
    });
}

/**
 * Fetches relevant emails (OFFICIAL_IMPORTANT or OFFICIAL_RELEVANT).
 */
export async function fetchRelevantEmails(): Promise<EmailMessage[]> {
  const allEmails = await fetchEmailMessages();
  return allEmails.filter(
    (e) => e.classification === "OFFICIAL_IMPORTANT" || e.classification === "OFFICIAL_RELEVANT",
  );
}

/**
 * Fetches email-derived academic events from Supabase.
 */
export async function fetchEmailEvents(courseCode?: string): Promise<EmailEvent[]> {
  try {
    const supabase = getSupabase();
    let query = supabase.from("email_events").select("*");

    if (courseCode) {
      query = query.eq("course_code", courseCode);
    }

    query = query.order("deadline", { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.warn("[emailRepository] Supabase events error, checking cache:", error.message);
      const cached = getCachedEmailEvents();
      if (cached.length > 0) return cached;
      throw new Error(`Failed to fetch email events: ${error.message}`);
    }

    const events = (data || []).map(mapDbEventToDomain);
    if (events.length > 0) {
      saveCachedEmailEvents(events);
    } else {
      const cached = getCachedEmailEvents();
      if (cached.length > 0) return cached;
    }
    return events;
  } catch (err: unknown) {
    const cached = getCachedEmailEvents();
    if (cached.length > 0) {
      return cached;
    }
    throw err;
  }
}

/**
 * Fetches upcoming email-derived academic events (deadline >= now OR start_at >= now).
 */
export async function fetchUpcomingEmailEvents(): Promise<EmailEvent[]> {
  const events = await fetchEmailEvents();
  const now = new Date().getTime();

  return events
    .filter((e) => {
      const dTime = e.deadline ? new Date(e.deadline).getTime() : null;
      const sTime = e.startAt ? new Date(e.startAt).getTime() : null;
      return (dTime !== null && dTime >= now) || (sTime !== null && sTime >= now);
    })
    .sort((a, b) => {
      const timeA =
        (a.deadline ? new Date(a.deadline).getTime() : null) ??
        (a.startAt ? new Date(a.startAt).getTime() : Infinity);
      const timeB =
        (b.deadline ? new Date(b.deadline).getTime() : null) ??
        (b.startAt ? new Date(b.startAt).getTime() : Infinity);
      return timeA - timeB;
    });
}

/**
 * Fetches a single email message with its attached events by ID.
 */
export async function fetchEmailMessageById(id: string): Promise<EmailMessage | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("email_messages")
    .select("*, email_events(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    // Fallback to cache search
    const cached = getCachedEmails();
    return cached.find((e) => e.id === id) || null;
  }

  const rawEvents: DbEmailEvent[] = Array.isArray(data.email_events) ? data.email_events : [];
  const events = rawEvents.map(mapDbEventToDomain);
  return mapDbEmailToDomain(data, events);
}

/**
 * Safe text/HTML sanitizer for rendering untrusted email body content.
 * Strips script tags, iframes, objects, inline event handlers, and javascript: URIs.
 */
export function sanitizeEmailContent(content?: string | null): string {
  if (!content) return "";
  return (
    content
      // Remove scripts and their content
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      // Remove iframes and their content
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
      // Remove objects and embeds
      .replace(/<object\b[\s\S]*?<\/object>/gi, "")
      .replace(/<embed\b[\s\S]*?<\/embed>/gi, "")
      // Remove all inline event handlers (onerror, onload, onclick, etc.)
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // Neutralize javascript: URI schemes
      .replace(
        /(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
        '$1="about:blank"',
      )
      .replace(/javascript\s*:/gi, "about:blank;")
  );
}
