import type { AssessmentRecord } from "@/types/assessment";
import type { SctStatus } from "@/types/state";
import type {
  ExamEligibilityResult,
  CourseGradeEligibilityResult,
  CriterionCheck,
} from "@/types/eligibility";
import type { GradeCalculationResult, LetterGrade } from "@/types/grading";
import { COURSES } from "@/data/courses";
import { computeGaa, checkBestFiveOfSeven, roundToTwo, calculateStandardGrade } from "./utils";

export function evaluateJavaEligibility(
  records: AssessmentRecord[],
  sctStatus: SctStatus,
): {
  oppe1: ExamEligibilityResult;
  oppe2: ExamEligibilityResult;
  endTerm: ExamEligibilityResult;
  courseGrade: CourseGradeEligibilityResult;
} {
  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);

  // GrPA scores A2 - A8
  const a2 = getRecord("cs2005_grpa_02");
  const a3 = getRecord("cs2005_grpa_03");
  const a4 = getRecord("cs2005_grpa_04");
  const a5 = getRecord("cs2005_grpa_05");
  const a6 = getRecord("cs2005_grpa_06");
  const a7 = getRecord("cs2005_grpa_07");
  const a8 = getRecord("cs2005_grpa_08");

  // Best 5 of 7 weekly assessments
  const weeklyIds = [1, 2, 3, 4, 5, 6, 7].map((w) => `cs2005_ga_${w.toString().padStart(2, "0")}`);
  const best5of7 = checkBestFiveOfSeven(records, weeklyIds);

  // --- OPPE 1 Eligibility ---
  const oppe1Criteria: CriterionCheck[] = [
    {
      name: "SCT Completion",
      required: "Passed",
      actual: sctStatus === "passed" ? "Passed" : sctStatus === "failed" ? "Failed" : "Pending",
      satisfied: sctStatus === "passed",
      isPending: sctStatus === "pending",
    },
    {
      name: "Week 2 GrPA (A2)",
      required: ">= 40",
      actual: a2 ? (a2.status === "pending" ? "Pending" : `${a2.score ?? 0}`) : "Not submitted",
      satisfied: a2?.status === "present" && (a2.score ?? 0) >= 40,
      isPending: !a2 || a2.status === "pending",
    },
    {
      name: "Week 3 GrPA (A3)",
      required: ">= 40",
      actual: a3 ? (a3.status === "pending" ? "Pending" : `${a3.score ?? 0}`) : "Not submitted",
      satisfied: a3?.status === "present" && (a3.score ?? 0) >= 40,
      isPending: !a3 || a3.status === "pending",
    },
    {
      name: "Week 4 GrPA (A4)",
      required: ">= 40",
      actual: a4 ? (a4.status === "pending" ? "Pending" : `${a4.score ?? 0}`) : "Not submitted",
      satisfied: a4?.status === "present" && (a4.score ?? 0) >= 40,
      isPending: !a4 || a4.status === "pending",
    },
  ];
  const oppe1Eligible = oppe1Criteria.every((c) => c.satisfied);

  // --- OPPE 2 Eligibility (Standalone rule) ---
  const oppe2Criteria: CriterionCheck[] = [
    {
      name: "SCT Completion",
      required: "Passed",
      actual: sctStatus === "passed" ? "Passed" : sctStatus === "failed" ? "Failed" : "Pending",
      satisfied: sctStatus === "passed",
      isPending: sctStatus === "pending",
    },
    {
      name: "Week 5 GrPA (A5)",
      required: ">= 40",
      actual: a5 ? (a5.status === "pending" ? "Pending" : `${a5.score ?? 0}`) : "Not submitted",
      satisfied: a5?.status === "present" && (a5.score ?? 0) >= 40,
      isPending: !a5 || a5.status === "pending",
    },
    {
      name: "Week 6 GrPA (A6)",
      required: ">= 40",
      actual: a6 ? (a6.status === "pending" ? "Pending" : `${a6.score ?? 0}`) : "Not submitted",
      satisfied: a6?.status === "present" && (a6.score ?? 0) >= 40,
      isPending: !a6 || a6.status === "pending",
    },
    {
      name: "Week 7 GrPA (A7)",
      required: ">= 40",
      actual: a7 ? (a7.status === "pending" ? "Pending" : `${a7.score ?? 0}`) : "Not submitted",
      satisfied: a7?.status === "present" && (a7.score ?? 0) >= 40,
      isPending: !a7 || a7.status === "pending",
    },
    {
      name: "Week 8 GrPA (A8)",
      required: ">= 40",
      actual: a8 ? (a8.status === "pending" ? "Pending" : `${a8.score ?? 0}`) : "Not submitted",
      satisfied: a8?.status === "present" && (a8.score ?? 0) >= 40,
      isPending: !a8 || a8.status === "pending",
    },
    {
      name: "Best 5 of first 7 weekly assessments",
      required: ">= 40",
      actual: best5of7.isComplete
        ? `${best5of7.average}`
        : `Pending (${best5of7.availableCount}/5 submitted)`,
      satisfied: best5of7.satisfied,
      isPending: !best5of7.isComplete,
    },
  ];
  const oppe2Eligible = oppe2Criteria.every((c) => c.satisfied);

  // --- End Term Eligibility ---
  const qz1 = getRecord("cs2005_quiz_01");
  const qz2 = getRecord("cs2005_quiz_02");
  const attendedQuiz = qz1?.status === "present" || qz2?.status === "present";
  const quizPending = (!qz1 || qz1.status === "pending") && (!qz2 || qz2.status === "pending");

  const endTermCriteria: CriterionCheck[] = [
    {
      name: "Best 5 of first 7 weekly assessments",
      required: ">= 40",
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

  // --- Course Grade Eligibility ---
  const endTermRecord = getRecord("cs2005_end_term");
  const pe1 = getRecord("cs2005_oppe_01");
  const pe2 = getRecord("cs2005_oppe_02");

  const attendedEndTerm = endTermRecord?.status === "present";
  const pePassed =
    (pe1?.status === "present" && (pe1.score ?? 0) >= 30) ||
    (pe2?.status === "present" && (pe2.score ?? 0) >= 30);

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
    {
      name: "Programming Exam Pass (PE1 or PE2 >= 30)",
      required: ">= 30 in at least one PE",
      actual: pePassed
        ? `PE1: ${pe1?.score ?? 0}, PE2: ${pe2?.score ?? 0}`
        : (!pe1 || pe1.status === "pending") && (!pe2 || pe2.status === "pending")
          ? "Pending"
          : `PE1: ${pe1?.score ?? 0}, PE2: ${pe2?.score ?? 0}`,
      satisfied: pePassed,
      isPending: (!pe1 || pe1.status === "pending") && (!pe2 || pe2.status === "pending"),
    },
  ];

  const courseGradeEligible = courseGradeCriteria.every((c) => c.satisfied);

  return {
    oppe1: {
      exam: "oppe_1",
      eligible: oppe1Eligible,
      criteria: oppe1Criteria,
    },
    oppe2: {
      exam: "oppe_2",
      eligible: oppe2Eligible,
      criteria: oppe2Criteria,
    },
    endTerm: {
      exam: "end_term",
      eligible: endTermEligible,
      criteria: endTermCriteria,
    },
    courseGrade: {
      eligible: courseGradeEligible,
      criteria: courseGradeCriteria,
      reason: !courseGradeEligible
        ? "Must attend End Term AND score >= 30 in at least one programming exam (PE1 or PE2)."
        : undefined,
    },
  };
}

export function calculateJavaGrade(
  records: AssessmentRecord[],
  sctStatus: SctStatus = "pending",
): GradeCalculationResult {
  const gaaPolicy = COURSES.CS2005.gaaPolicy!;
  const gaaResult = computeGaa(records, gaaPolicy);
  const eligibility = evaluateJavaEligibility(records, sctStatus);

  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);
  const qz1 = getRecord("cs2005_quiz_01");
  const qz2 = getRecord("cs2005_quiz_02");
  const pe1 = getRecord("cs2005_oppe_01");
  const pe2 = getRecord("cs2005_oppe_02");
  const endTerm = getRecord("cs2005_end_term");

  // Check if essential final components are completed
  const hasEndTermCompleted = endTerm?.status === "present" || endTerm?.status === "absent";

  // Effective exam scores: absent = 0, present = score ?? 0
  const qz1Score = qz1?.status === "present" ? (qz1.score ?? 0) : 0;
  const qz2Score = qz2?.status === "present" ? (qz2.score ?? 0) : 0;
  const pe1Score = pe1?.status === "present" ? (pe1.score ?? 0) : 0;
  const pe2Score = pe2?.status === "present" ? (pe2.score ?? 0) : 0;
  const fScore = endTerm?.status === "present" ? (endTerm.score ?? 0) : 0;

  // Formula components
  const gaaPart = gaaResult.score !== null ? 0.05 * gaaResult.score : null;
  const peMaxPart = 0.2 * Math.max(pe1Score, pe2Score);
  const peMinBonus = 0.1 * Math.min(pe1Score, pe2Score);
  const fPart = 0.45 * fScore;

  // Quiz component: max(0.20 max(Q1, Q2), 0.10 Q1 + 0.20 Q2)
  const qzBranchA = 0.2 * Math.max(qz1Score, qz2Score);
  const qzBranchB = 0.1 * qz1Score + 0.2 * qz2Score;
  const qzPart = Math.max(qzBranchA, qzBranchB);

  let totalScore: number | null = null;
  let letterGrade: LetterGrade | null = null;

  if (gaaPart !== null && hasEndTermCompleted) {
    const rawT = gaaPart + peMaxPart + fPart + qzPart + peMinBonus;
    totalScore = Math.min(100, roundToTwo(rawT));

    const pePassed =
      (pe1?.status === "present" && (pe1.score ?? 0) >= 30) ||
      (pe2?.status === "present" && (pe2.score ?? 0) >= 30);
    const attendedEndTerm = endTerm?.status === "present";
    const peAttempted = pe1?.status === "present" || pe2?.status === "present";

    if (pePassed) {
      if (attendedEndTerm) {
        letterGrade = calculateStandardGrade(totalScore);
      } else {
        letterGrade = "I";
      }
    } else {
      // Programming exam failed (< 30 in both) or absent
      if (attendedEndTerm) {
        if (peAttempted) {
          letterGrade = totalScore >= 40 ? "I_OP" : "U";
        } else {
          // PE absent (PE1 and PE2 = 0)
          letterGrade = totalScore >= 35 ? "I_OP" : "U";
        }
      } else {
        // End term absent
        letterGrade = peAttempted ? "I_BOTH" : "U";
      }
    }
  }

  return {
    courseCode: "CS2005",
    gaa: gaaResult,
    totalScore,
    letterGrade,
    courseGradeEligibility: eligibility.courseGrade,
    examEligibility: [eligibility.oppe1, eligibility.oppe2, eligibility.endTerm],
    breakdown: {
      gaaScore: gaaResult.score,
      gaaContribution: gaaPart !== null ? roundToTwo(gaaPart) : null,
      qz1Score,
      qz2Score,
      qzContribution: roundToTwo(qzPart),
      pe1Score,
      pe2Score,
      peMaxContribution: roundToTwo(peMaxPart),
      peMinBonusContribution: roundToTwo(peMinBonus),
      endTermScore: fScore,
      endTermContribution: roundToTwo(fPart),
    },
    formulaDescription:
      "T = 0.05 GAA + 0.20 max(PE1, PE2) + 0.45 F + max(0.20 max(Qz1, Qz2), 0.10 Qz1 + 0.20 Qz2) + 0.10 min(PE1, PE2)",
  };
}
