import type { AssessmentRecord } from "@/types/assessment";
import type { GaaPolicy } from "@/types/course";
import type { GaaResult, LetterGrade } from "@/types/grading";

/**
 * Rounds a number to two decimal places at the output boundary.
 * Uses exponential notation to shift decimals reliably for presentation.
 */
export function roundToTwo(num: number): number {
  return +(Math.round(+(num + "e+2")) + "e-2");
}

export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  return roundToTwo(sum / scores.length);
}

/**
 * Pure GAA calculation adhering to strict IITM policy:
 * - If available (present/absent) assessments are fewer than policy.count,
 *   isComplete is FALSE and score is NULL (never speculate provisional scores).
 * - Absent assessments explicitly contribute 0.
 * - Best-N sorts descending and takes the top N.
 */
export function computeGaa(records: AssessmentRecord[], policy: GaaPolicy): GaaResult {
  const poolSet = new Set(policy.poolAssessmentIds);
  const poolRecords = records.filter((r) => poolSet.has(r.assessmentId));

  // Completed records have status 'present' or 'absent'
  const completed = poolRecords.filter((r) => r.status === "present" || r.status === "absent");

  if (completed.length < policy.count) {
    return {
      isComplete: false,
      score: null,
      availableCount: completed.length,
      requiredCount: policy.count,
      consideredScores: [],
    };
  }

  // Extract effective scores: absent = 0, present = score ?? 0
  const effectiveScores = completed.map((r) => (r.status === "absent" ? 0 : (r.score ?? 0)));

  // Sort descending
  effectiveScores.sort((a, b) => b - a);

  // Take policy.count
  const considered = effectiveScores.slice(0, policy.count);
  const score = calculateAverage(considered);

  return {
    isComplete: true,
    score,
    availableCount: completed.length,
    requiredCount: policy.count,
    consideredScores: considered,
  };
}

/**
 * Standard weekly assessment gate:
 * Average of the best 5 out of the first 7 weekly assessments scores >= 40/100.
 */
export function checkBestFiveOfSeven(
  records: AssessmentRecord[],
  firstSevenAssessmentIds: string[],
): {
  isComplete: boolean;
  average: number | null;
  satisfied: boolean;
  availableCount: number;
} {
  const poolSet = new Set(firstSevenAssessmentIds);
  const completed = records.filter(
    (r) => poolSet.has(r.assessmentId) && (r.status === "present" || r.status === "absent"),
  );

  if (completed.length < 5) {
    return {
      isComplete: false,
      average: null,
      satisfied: false,
      availableCount: completed.length,
    };
  }

  const scores = completed.map((r) => (r.status === "absent" ? 0 : (r.score ?? 0)));
  scores.sort((a, b) => b - a);
  const topFive = scores.slice(0, 5);
  const avg = calculateAverage(topFive);

  return {
    isComplete: true,
    average: avg,
    satisfied: avg >= 40,
    availableCount: completed.length,
  };
}

/**
 * Shared Branch A / Branch B calculation for CS2006 and MS2001:
 * Branch A: 0.60 F + 0.25 max(Q1, Q2)
 * Branch B: 0.40 F + 0.25 Q1 + 0.30 Q2
 */
export function calculateExamBranches(
  qz1Score: number,
  qz2Score: number,
  fScore: number,
): { branchA: number; branchB: number; examPart: number; activeBranch: string } {
  const branchA = 0.6 * fScore + 0.25 * Math.max(qz1Score, qz2Score);
  const branchB = 0.4 * fScore + 0.25 * qz1Score + 0.3 * qz2Score;
  const examPart = Math.max(branchA, branchB);
  const activeBranch =
    branchA >= branchB ? "Branch A (0.6F + 0.25max(Q1,Q2))" : "Branch B (0.4F + 0.25Q1 + 0.3Q2)";
  return { branchA, branchB, examPart, activeBranch };
}

/**
 * Standard IITM grading scale for total score T (0..100)
 */
export function calculateStandardGrade(totalScore: number | null): LetterGrade | null {
  if (totalScore === null) return null;
  if (totalScore >= 90) return "S";
  if (totalScore >= 80) return "A";
  if (totalScore >= 70) return "B";
  if (totalScore >= 60) return "C";
  if (totalScore >= 50) return "D";
  if (totalScore >= 40) return "E";
  return "U";
}
