export type SourceDocument =
  | "sept_2026_grading"
  | "mad2_project_instructions"
  | "viva_checklist"
  | "trekking_app_v2";

export interface SourceMetadata {
  documentName: string;
  documentSection: string;
  page: number | string;
  term: "September 2026";
  verifiedAt: string;
  notes?: string;
}

export interface StalenessReport {
  isStale: boolean;
  lastVerified: string;
  notes?: string;
}
