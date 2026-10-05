export type ExamType = "quiz_1" | "quiz_2" | "oppe_1" | "oppe_2" | "re_oppe" | "end_term";

export interface CriterionCheck {
  name: string;
  required: string;
  actual: string;
  satisfied: boolean;
  isPending?: boolean;
}

export interface ExamEligibilityResult {
  exam: ExamType;
  eligible: boolean;
  criteria: CriterionCheck[];
  reason?: string;
}

export interface CourseGradeEligibilityResult {
  eligible: boolean;
  criteria: CriterionCheck[];
  reason?: string;
}
