import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { SctStatus } from "@/types/state";
import type { GradeCalculationResult } from "@/types/grading";
import { calculateJavaGrade } from "./java";
import { calculateSystemCommandsGrade, type Se2001ExamConditions } from "./systemCommands";
import { calculateAppDev2Grade } from "./appDev2";
import { calculateBdmGrade } from "./bdm";

export * from "./utils";
export * from "./java";
export * from "./systemCommands";
export * from "./appDev2";
export * from "./bdm";
export * from "./project";

export interface GradeEvaluationOptions {
  sctStatus?: Record<CourseCode, SctStatus>;
  se2001Conditions?: Se2001ExamConditions;
}

/**
 * Polymorphic grading engine dispatcher: returns GradeCalculationResult for any theory course.
 */
export function calculateCourseGrade(
  courseCode: CourseCode,
  records: AssessmentRecord[],
  options: GradeEvaluationOptions = {},
): GradeCalculationResult {
  const sct = options.sctStatus?.[courseCode] ?? "pending";

  switch (courseCode) {
    case "CS2005":
      return calculateJavaGrade(records, sct);
    case "SE2001":
      return calculateSystemCommandsGrade(records, {
        sctStatus: sct,
        ...options.se2001Conditions,
      });
    case "CS2006":
      return calculateAppDev2Grade(records);
    case "MS2001":
      return calculateBdmGrade(records);
    case "CS2006P":
      throw new Error("CS2006P is a project course. Use evaluateProjectGrade() instead.");
    default: {
      const _exhaustiveCheck: never = courseCode;
      throw new Error(`Unknown course code: ${String(_exhaustiveCheck)}`);
    }
  }
}
