import type { LetterGrade } from "./grading";
import type { SctStatus, TaskStatus, TaskPriority } from "./state";
import type { AssessmentStatus } from "./assessment";

export const LETTER_GRADES: readonly LetterGrade[] = [
  "S",
  "A",
  "B",
  "C",
  "D",
  "E",
  "U",
  "I",
  "I_OP",
  "I_BOTH",
] as const;

export const SCT_STATUSES: readonly SctStatus[] = ["pending", "passed", "failed"] as const;

export const ASSESSMENT_STATUSES: readonly AssessmentStatus[] = [
  "pending",
  "present",
  "absent",
] as const;

export const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = ["high", "medium", "low"] as const;

export const GRADE_THRESHOLDS = [
  { grade: "S" as const, minimum: 90 },
  { grade: "A" as const, minimum: 80 },
  { grade: "B" as const, minimum: 70 },
  { grade: "C" as const, minimum: 60 },
  { grade: "D" as const, minimum: 50 },
  { grade: "E" as const, minimum: 40 },
] as const;
