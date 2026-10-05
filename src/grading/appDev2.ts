import type { AssessmentRecord } from "@/types/assessment";
import type {
  ExamEligibilityResult,
  CourseGradeEligibilityResult,
  CriterionCheck,
} from "@/types/eligibility";
import type { GradeCalculationResult, LetterGrade } from "@/types/grading";
import { COURSES } from "@/data/courses";
import {
  computeGaa,
  checkBestFiveOfSeven,
  roundToTwo,
  calculateStandardGrade,
  calculateExamBranches,
} from "./utils";

export function evaluateAppDev2Eligibility(records: AssessmentRecord[]): {
  endTerm: ExamEligibilityResult;
  courseGrade: CourseGradeEligibilityResult;
} {
  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);

  // Best 5 of 7 weekly assessments
  const weeklyIds = [1, 2, 3, 4, 5, 6, 7].map((w) => `cs2006_ga_${w.toString().padStart(2, "0")}`);
  const best5of7 = checkBestFiveOfSeven(records, weeklyIds);

  // In-centre quiz attendance: check status === 'present', NOT score > 0!
  const qz1 = getRecord("cs2006_quiz_01");
  const qz2 = getRecord("cs2006_quiz_02");
  const attendedQuiz = qz1?.status === "present" || qz2?.status === "present";
  const quizPending = (!qz1 || qz1.status === "pending") && (!qz2 || qz2.status === "pending");

  const endTermCriteria: CriterionCheck[] = [
    {
      name: "Best 5 of first 7 weekly assessments",
      required: ">= 40/100",
      actual: best5of7.isComplete
        ? `${best5of7.average}`
        : `Pending (${best5of7.availableCount}/5 submitted)`,
      satisfied: best5of7.satisfied,
      isPending: !best5of7.isComplete,
    },
    {
      name: "In-Centre Quiz Attendance",
      required: "Present at >= 1 quiz",
      actual: attendedQuiz ? "Attended" : quizPending ? "Pending" : "Absent both quizzes",
      satisfied: attendedQuiz,
      isPending: quizPending,
    },
  ];
  const endTermEligible = endTermCriteria.every((c) => c.satisfied);

  // Course grade eligibility: attending End Term
  const endTermRecord = getRecord("cs2006_end_term");
  const attendedEndTerm = endTermRecord?.status === "present";

  const courseGradeCriteria: CriterionCheck[] = [
    {
      name: "End Term Attendance",
      required: "Present",
      actual:
        endTermRecord?.status === "present"
          ? "Present"
          : endTermRecord?.status === "absent"
            ? "Absent"
            : "Pending",
      satisfied: attendedEndTerm,
      isPending: !endTermRecord || endTermRecord.status === "pending",
    },
  ];
  const courseGradeEligible = courseGradeCriteria.every((c) => c.satisfied);

  return {
    endTerm: {
      exam: "end_term",
      eligible: endTermEligible,
      criteria: endTermCriteria,
    },
    courseGrade: {
      eligible: courseGradeEligible,
      criteria: courseGradeCriteria,
      reason: !courseGradeEligible ? "Must attend End Term exam in person." : undefined,
    },
  };
}

export function calculateAppDev2Grade(records: AssessmentRecord[]): GradeCalculationResult {
  const gaaPolicy = COURSES.CS2006.gaaPolicy!;
  const gaaResult = computeGaa(records, gaaPolicy);
  const eligibility = evaluateAppDev2Eligibility(records);

  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);
  const qz1 = getRecord("cs2006_quiz_01");
  const qz2 = getRecord("cs2006_quiz_02");
  const endTerm = getRecord("cs2006_end_term");

  const hasEndTermCompleted = endTerm?.status === "present" || endTerm?.status === "absent";

  const qz1Score = qz1?.status === "present" ? (qz1.score ?? 0) : 0;
  const qz2Score = qz2?.status === "present" ? (qz2.score ?? 0) : 0;
  const fScore = endTerm?.status === "present" ? (endTerm.score ?? 0) : 0;

  const gaaPart = gaaResult.score !== null ? 0.05 * gaaResult.score : null;

  // Branch A / Branch B formula evaluated through pure domain helper
  const { branchA, branchB, examPart, activeBranch } = calculateExamBranches(
    qz1Score,
    qz2Score,
    fScore,
  );

  let totalScore: number | null = null;
  let letterGrade: LetterGrade | null = null;

  if (gaaPart !== null && hasEndTermCompleted) {
    const rawT = gaaPart + examPart;
    totalScore = Math.min(100, roundToTwo(rawT));

    const attendedEndTerm = endTerm?.status === "present";
    if (attendedEndTerm) {
      letterGrade = calculateStandardGrade(totalScore);
    } else {
      letterGrade = "I";
    }
  }

  return {
    courseCode: "CS2006",
    gaa: gaaResult,
    totalScore,
    letterGrade,
    courseGradeEligibility: eligibility.courseGrade,
    examEligibility: [eligibility.endTerm],
    breakdown: {
      gaaScore: gaaResult.score,
      gaaContribution: gaaPart !== null ? roundToTwo(gaaPart) : null,
      qz1Score,
      qz2Score,
      endTermScore: fScore,
      branchAScore: roundToTwo(branchA),
      branchBScore: roundToTwo(branchB),
      selectedBranch: activeBranch,
      examPartContribution: roundToTwo(examPart),
    },
    formulaDescription:
      "T = 0.05 GAA + max(0.60 F + 0.25 max(Qz1, Qz2), 0.40 F + 0.25 Qz1 + 0.30 Qz2)",
  };
}
