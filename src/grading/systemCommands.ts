import type { AssessmentRecord } from "@/types/assessment";
import type { SctStatus } from "@/types/state";
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
  calculateAverage,
  roundToTwo,
  calculateStandardGrade,
} from "./utils";

export interface Se2001ExamConditions {
  sctStatus?: SctStatus;
  oppeMeetDurationMinutes?: number;
}

export function evaluateSystemCommandsEligibility(
  records: AssessmentRecord[],
  conditions: Se2001ExamConditions = {},
): {
  oppe: ExamEligibilityResult;
  reoppe: ExamEligibilityResult;
  endTerm: ExamEligibilityResult;
  courseGrade: CourseGradeEligibilityResult;
} {
  const { sctStatus = "pending", oppeMeetDurationMinutes = 90 } = conditions;
  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);

  const bpt1 = getRecord("se2001_bpt_01");
  const bpt2 = getRecord("se2001_bpt_02");
  const bpt3 = getRecord("se2001_bpt_03");
  const first3Bpts = [bpt1, bpt2, bpt3];

  const completedFirst3 = first3Bpts.filter(
    (r) => r && (r.status === "present" || r.status === "absent"),
  );
  const isFirst3Complete = completedFirst3.length === 3;
  const first3Avg = isFirst3Complete
    ? calculateAverage(completedFirst3.map((r) => (r!.status === "absent" ? 0 : (r!.score ?? 0))))
    : null;

  // --- OPPE Eligibility ---
  const oppeCriteria: CriterionCheck[] = [
    {
      name: "SCT Completion",
      required: "Passed",
      actual: sctStatus === "passed" ? "Passed" : sctStatus === "failed" ? "Failed" : "Pending",
      satisfied: sctStatus === "passed",
      isPending: sctStatus === "pending",
    },
    {
      name: "Average of First 3 BPTs (BPT4 strictly excluded)",
      required: ">= 40/100",
      actual: isFirst3Complete
        ? `${first3Avg}/100`
        : `Pending (${completedFirst3.length}/3 BPTs submitted)`,
      satisfied: isFirst3Complete && first3Avg !== null && first3Avg >= 40,
      isPending: !isFirst3Complete,
    },
  ];
  const oppeEligible = oppeCriteria.every((c) => c.satisfied);

  // --- Re-OPPE Eligibility ---
  const oppeRecord = getRecord("se2001_oppe_01");
  const attendedOppe = oppeRecord?.status === "present";
  const oppeScore = attendedOppe ? (oppeRecord?.score ?? 0) : 0;
  const oppeScorePassedReoppe = oppeScore >= 20;
  const meetPassed = oppeMeetDurationMinutes >= 90;

  const reoppeCriteria: CriterionCheck[] = [
    {
      name: "Dec 20 OPPE Attendance",
      required: "Present on Dec 20",
      actual:
        oppeRecord?.status === "present"
          ? "Present"
          : oppeRecord?.status === "absent"
            ? "Absent"
            : "Pending",
      satisfied: attendedOppe,
      isPending: !oppeRecord || oppeRecord.status === "pending",
    },
    {
      name: "Dec 20 OPPE Minimum Score",
      required: ">= 20/100",
      actual: oppeRecord ? `${oppeScore}/100` : "Pending",
      satisfied: oppeScorePassedReoppe,
      isPending: !oppeRecord || oppeRecord.status === "pending",
    },
    {
      name: "Proctoring Meet Attendance Duration",
      required: ">= 1 hour 30 mins (90m)",
      actual: `${oppeMeetDurationMinutes} minutes`,
      satisfied: meetPassed,
      isPending: false,
    },
  ];
  const reoppeEligible = reoppeCriteria.every((c) => c.satisfied);

  // --- End Term Eligibility ---
  const weeklyIds = [1, 2, 3, 4, 5, 6, 7].map((w) => `se2001_ga_${w.toString().padStart(2, "0")}`);
  const best5of7 = checkBestFiveOfSeven(records, weeklyIds);

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
      name: "OPPE Eligibility",
      required: "Eligible for OPPE",
      actual: oppeEligible ? "Eligible" : "Not eligible",
      satisfied: oppeEligible,
      isPending: oppeCriteria.some((c) => c.isPending),
    },
  ];
  const endTermEligible = endTermCriteria.every((c) => c.satisfied);

  // --- Course Grade Eligibility ---
  const endTermRecord = getRecord("se2001_end_term");
  const reoppeRecord = getRecord("se2001_reoppe_01");
  const attendedEndTerm = endTermRecord?.status === "present";

  // Effective OPPE score for passing grade is highest of OPPE or ReOPPE
  const effectiveOppeScore = Math.max(
    oppeRecord?.status === "present" ? (oppeRecord.score ?? 0) : 0,
    reoppeRecord?.status === "present" ? (reoppeRecord.score ?? 0) : 0,
  );
  const oppePassedForGrade = effectiveOppeScore >= 40;

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
      name: "Programming Exam (OPPE) Score",
      required: ">= 40/100",
      actual: `${effectiveOppeScore}/100`,
      satisfied: oppePassedForGrade,
      isPending:
        (!oppeRecord || oppeRecord.status === "pending") &&
        (!reoppeRecord || reoppeRecord.status === "pending"),
    },
  ];
  const courseGradeEligible = courseGradeCriteria.every((c) => c.satisfied);

  return {
    oppe: {
      exam: "oppe_1",
      eligible: oppeEligible,
      criteria: oppeCriteria,
    },
    reoppe: {
      exam: "re_oppe",
      eligible: reoppeEligible,
      criteria: reoppeCriteria,
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
        ? "Must attend End Term AND score >= 40 in programming exam (OPPE)."
        : undefined,
    },
  };
}

export function calculateSystemCommandsGrade(
  records: AssessmentRecord[],
  conditions: Se2001ExamConditions = {},
): GradeCalculationResult {
  const gaaPolicy = COURSES.SE2001.gaaPolicy!;
  const gaaResult = computeGaa(records, gaaPolicy);
  const eligibility = evaluateSystemCommandsEligibility(records, conditions);

  const getRecord = (id: string) => records.find((r) => r.assessmentId === id);
  const qz1 = getRecord("se2001_quiz_01");
  const oppe = getRecord("se2001_oppe_01");
  const reoppe = getRecord("se2001_reoppe_01");
  const endTerm = getRecord("se2001_end_term");

  // BPTA: average of all 4 BPTs
  const bptRecords = [
    getRecord("se2001_bpt_01"),
    getRecord("se2001_bpt_02"),
    getRecord("se2001_bpt_03"),
    getRecord("se2001_bpt_04"),
  ];
  const completedBpts = bptRecords.filter(
    (r) => r && (r.status === "present" || r.status === "absent"),
  );
  const bpta =
    completedBpts.length === 4
      ? calculateAverage(completedBpts.map((r) => (r!.status === "absent" ? 0 : (r!.score ?? 0))))
      : null;

  const hasEndTermCompleted = endTerm?.status === "present" || endTerm?.status === "absent";

  const qz1Score = qz1?.status === "present" ? (qz1.score ?? 0) : 0;
  const oppeScore = Math.max(
    oppe?.status === "present" ? (oppe.score ?? 0) : 0,
    reoppe?.status === "present" ? (reoppe.score ?? 0) : 0,
  );
  const fScore = endTerm?.status === "present" ? (endTerm.score ?? 0) : 0;

  const gaaPart = gaaResult.score !== null ? 0.05 * gaaResult.score : null;
  const bptaPart = bpta !== null ? 0.1 * bpta : null;
  const qz1Part = 0.25 * qz1Score;
  const oppePart = 0.3 * oppeScore;
  const fPart = 0.3 * fScore;

  let totalScore: number | null = null;
  let letterGrade: LetterGrade | null = null;

  if (gaaPart !== null && bptaPart !== null && hasEndTermCompleted) {
    const rawT = gaaPart + qz1Part + oppePart + fPart + bptaPart;
    totalScore = Math.min(100, roundToTwo(rawT));

    const effectiveOppeScore = Math.max(
      oppe?.status === "present" ? (oppe.score ?? 0) : 0,
      reoppe?.status === "present" ? (reoppe.score ?? 0) : 0,
    );
    const oppePassedForGrade = effectiveOppeScore >= 40;
    const attendedEndTerm = endTerm?.status === "present";
    const oppeAttempted = oppe?.status === "present" || reoppe?.status === "present";

    if (oppePassedForGrade) {
      if (attendedEndTerm) {
        letterGrade = calculateStandardGrade(totalScore);
      } else {
        letterGrade = "I";
      }
    } else {
      // OPPE failed (< 40) or absent
      if (attendedEndTerm) {
        if (oppeAttempted) {
          letterGrade = totalScore >= 40 ? "I_OP" : "U";
        } else {
          // OPPE absent
          letterGrade = totalScore >= 35 ? "I_OP" : "U";
        }
      } else {
        // End term absent
        letterGrade = oppeAttempted ? "I_BOTH" : "U";
      }
    }
  }

  return {
    courseCode: "SE2001",
    gaa: gaaResult,
    totalScore,
    letterGrade,
    courseGradeEligibility: eligibility.courseGrade,
    examEligibility: [eligibility.oppe, eligibility.reoppe, eligibility.endTerm],
    breakdown: {
      gaaScore: gaaResult.score,
      gaaContribution: gaaPart !== null ? roundToTwo(gaaPart) : null,
      qz1Score,
      qz1Contribution: roundToTwo(qz1Part),
      oppeScore,
      oppeContribution: roundToTwo(oppePart),
      bptaScore: bpta,
      bptaContribution: bptaPart !== null ? roundToTwo(bptaPart) : null,
      endTermScore: fScore,
      endTermContribution: roundToTwo(fPart),
    },
    formulaDescription: "T = 0.05 GAA + 0.25 Qz1 + 0.30 OPPE + 0.30 F + 0.10 BPTA",
  };
}
