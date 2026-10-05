import type { CourseCode } from "./course";
import type { SourceMetadata } from "./metadata";

export type EventType =
  | "assignment"
  | "eligibility_close"
  | "exam"
  | "bpt_release"
  | "bpt_deadline"
  | "project_milestone"
  | "project_submission"
  | "project_validation"
  | "viva"
  | "academic_milestone";

export type EventImportance = "critical" | "high" | "medium" | "low";

export type HardCutoffType =
  | "quiz_1_eligibility"
  | "end_term_eligibility"
  | "oppe_1_eligibility"
  | "oppe_2_eligibility"
  | "gaa_calculation"
  | "oppe_bpt_eligibility"
  | "term_registration"
  | "sct_window";

export interface AcademicEvent {
  id: string;
  courseCode?: CourseCode;
  title: string;
  type: EventType;
  subType?: string;
  start: string; // ISO date YYYY-MM-DD or datetime
  end?: string; // deadline or window closing where applicable
  date: string; // primary calendar sort date (YYYY-MM-DD)
  time?: string; // e.g. "23:59 IST" or "14:00 - 16:00 IST"
  importance: EventImportance;
  hardCutoff: boolean;
  isHardCutoff: boolean; // compatibility alias
  cutoffType?: HardCutoffType;
  description: string;
  source: SourceMetadata;
}
