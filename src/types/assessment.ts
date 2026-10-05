import type { CourseCode } from "./course";
import type { SourceMetadata } from "./metadata";

export type AssessmentType =
  | "weekly_objective"
  | "programming_grpa"
  | "bpt"
  | "quiz"
  | "oppe"
  | "reoppe"
  | "end_term"
  | "project_submission";

export type AssessmentStatus = "pending" | "present" | "absent";

export interface AssessmentDefinition {
  id: string;
  courseCode: CourseCode;
  name: string;
  type: AssessmentType;
  maxScore: number;
  weekNumber?: number;
  eventId?: string;
  weightDescription?: string;
  source: SourceMetadata;
}

export interface AssessmentRecord {
  assessmentId: string;
  status: AssessmentStatus;
  score: number | null; // null when pending; 0 when absent; 0..maxScore when present
  submissionDate?: string; // ISO timestamp if submitted
}
