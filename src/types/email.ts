// ============================================================================
// ACADRIX / ACDENCE EMAIL INTELLIGENCE DATA TYPES
// Canonical TypeScript interfaces for Google Workspace Studio Email Ingestion
// ============================================================================

import type { CourseCode } from "./course";

export type EmailClassification =
  | "OFFICIAL_IMPORTANT"
  | "OFFICIAL_RELEVANT"
  | "OFFICIAL_ROUTINE"
  | "POSSIBLY_OFFICIAL"
  | "NON_OFFICIAL"
  | "PROMOTIONAL"
  | "IRRELEVANT";

export type EmailOfficiality = "OFFICIAL" | "PROBABLY_OFFICIAL" | "UNKNOWN";

export type EmailImportance = "HIGH" | "MEDIUM" | "LOW";

export type EmailCategory =
  | "ACADEMIC"
  | "EXAM"
  | "ASSIGNMENT"
  | "ADMINISTRATIVE"
  | "PLACEMENT"
  | "ACTIVITY"
  | "GENERAL";

export type EmailEventType =
  | "DEADLINE"
  | "EXAM"
  | "SESSION"
  | "REGISTRATION"
  | "ANNOUNCEMENT"
  | "MEETING";

export type EmailDuplicateStatus =
  | "NEW_EMAIL"
  | "EXACT_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "POSSIBLE_DUPLICATE"
  | "UPDATE_TO_EXISTING_INFORMATION";

/**
 * Database schema representation of public.email_messages
 */
export interface DbEmailMessage {
  id: string;
  provider_message_id: string;
  thread_id: string | null;
  received_at: string | null;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  classification: string | null;
  officiality: string | null;
  importance: string | null;
  category: string | null;
  course_code: string | null;
  course_name: string | null;
  event_title: string | null;
  event_type: string | null;
  deadline: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  required_action: string | null;
  affected_assessment: string | null;
  confidence: string | null;
  duplicate_status: string | null;
  dedup_key: string | null;
  evidence: string | null;
  additional_academic_events: string | null;
  processing_notes: string | null;
  email_summary: string | null;
  email_body: string | null;
  content_fingerprint: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema representation of public.email_events
 */
export interface DbEmailEvent {
  id: string;
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
  confidence: string | null;
  source_text: string | null;
  dedup_key: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Domain representation of an Email Message in Acdence
 */
export interface EmailMessage {
  id: string;
  providerMessageId: string;
  threadId: string | null;
  receivedAt: string | null;
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  classification: EmailClassification | null;
  officiality: EmailOfficiality | null;
  importance: EmailImportance | null;
  category: EmailCategory | null;
  courseCode: CourseCode | string | null;
  courseName: string | null;
  eventTitle: string | null;
  eventType: EmailEventType | string | null;
  deadline: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  requiredAction: string | null;
  affectedAssessment: string | null;
  confidence: string | null;
  duplicateStatus: EmailDuplicateStatus | string | null;
  dedupKey: string | null;
  evidence: string | null;
  additionalAcademicEvents: string | null;
  processingNotes: string | null;
  emailSummary: string | null;
  emailBody: string | null;
  contentFingerprint: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events?: EmailEvent[];
}

/**
 * Domain representation of an Email-Derived Academic Event
 */
export interface EmailEvent {
  id: string;
  emailId: string;
  eventType: EmailEventType | string;
  title: string;
  termId: string | null;
  courseCode: CourseCode | string | null;
  courseName: string | null;
  affectedAssessment: string | null;
  startAt: string | null;
  endAt: string | null;
  deadline: string | null;
  location: string | null;
  requiredAction: string | null;
  confidence: string | null;
  sourceText: string | null;
  dedupKey: string | null;
  source: "EMAIL";
  createdAt: string;
  updatedAt: string;
}

/**
 * Exact 28-column transport record received from Google Apps Script / Sheet
 */
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

export interface IngestEmailPayload {
  source?: string;
  records: IngestEmailRecord[];
}
