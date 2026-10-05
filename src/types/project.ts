import type { SourceMetadata } from "./metadata";
import type { LetterGrade } from "./grading";

export type ProjectTrack = "theory_completed_prior" | "theory_registered_current";

export type ProjectStageId =
  | "git_tracker"
  | "development"
  | "validation_presubmission"
  | "submission"
  | "validation_postsubmission"
  | "plagiarism_screening"
  | "viva_l1"
  | "viva_l2";

export interface ProjectStage {
  id: ProjectStageId;
  name: string;
  description: string;
  order: number;
  isGateForNext: boolean;
  source: SourceMetadata;
}

export type ProjectRequirementCategory = "tech_stack" | "core_features" | "deliverables" | "rules";

export interface ProjectRequirement {
  id: string;
  category: ProjectRequirementCategory;
  title: string;
  description: string;
  mandatory: boolean;
  source: SourceMetadata;
}

export interface ProjectGradeResult {
  track: ProjectTrack | null;
  l1Score: number | null;
  l2Score: number | null;
  l2Eligible: boolean;
  finalScore: number | null;
  letterGrade: LetterGrade | null;
  statusDescription: string;
  submissionDeadline: string | null;
}
