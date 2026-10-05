import type { AssessmentRecord } from "./assessment";

/**
 * Single-user canonical grade record stored in Supabase public.grade_records.
 * Ingested exclusively by Acadrix from the official IITM Grades portal.
 */
export interface DbGradeRecord {
  id?: string;
  term_id: string;
  course_code: string;
  external_assignment_id: string;
  canonical_assessment_id: string | null;
  module: string;
  title: string;
  assignment_type: string;
  your_score: number | null;
  your_score_raw: string | null;
  peer_average: number | null;
  median_score: number | null;
  score_status: string;
  evaluation_status: string;
  due_date: string | null;
  due_date_text: string | null;
  source: string;
  captured_at: string | null;
  updated_at: string;
}

/**
 * Result of resolving raw portal grade records against canonical assessment definitions.
 */
export interface GradeResolutionResult {
  /**
   * AssessmentRecords keyed by canonical AssessmentDefinition ID, ready for grade engine consumption.
   */
  assessmentRecords: Record<string, AssessmentRecord>;

  /**
   * Official portal grades that could not be matched to a canonical formula assessment.
   * Preserved for display in the Additional Portal Grades UI.
   */
  unmatchedGrades: DbGradeRecord[];

  /**
   * Map of canonical assessment ID to the underlying DbGradeRecord (for peer avg, median, etc.).
   */
  matchedGradeDetails: Record<string, DbGradeRecord>;

  /**
   * Resolution telemetry.
   */
  stats: {
    totalRecords: number;
    matchedCount: number;
    unmatchedCount: number;
  };
}

export type PortalSyncStatus = "idle" | "loading" | "synced" | "offline" | "error";
