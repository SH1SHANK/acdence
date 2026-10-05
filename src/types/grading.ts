import type { CourseCode } from "./course";
import type { CourseGradeEligibilityResult, ExamEligibilityResult } from "./eligibility";

export interface GaaResult {
  isComplete: boolean;
  score: number | null;
  availableCount: number;
  requiredCount: number;
  consideredScores: number[];
}

export type LetterGrade = "S" | "A" | "B" | "C" | "D" | "E" | "U" | "I" | "I_OP" | "I_BOTH";

export interface GradeCalculationResult {
  courseCode: CourseCode;
  gaa: GaaResult;
  totalScore: number | null; // T: 0 to 100, or null if essential components pending
  letterGrade: LetterGrade | null;
  courseGradeEligibility: CourseGradeEligibilityResult;
  examEligibility: ExamEligibilityResult[];
  breakdown: Record<string, number | null | string>;
  formulaDescription: string;
}
