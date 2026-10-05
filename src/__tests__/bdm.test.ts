import { describe, it, expect } from "vite-plus/test";
import { evaluateBdmEligibility, calculateBdmGrade } from "@/grading/bdm";
import type { AssessmentRecord } from "@/types/assessment";

describe("MS2001 (Business Data Management) Grading & Eligibility Engine", () => {
  const makeBaseRecords = (): AssessmentRecord[] => [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => ({
      assessmentId: `ms2001_ga_${w.toString().padStart(2, "0")}`,
      status: "present" as const,
      score: 80,
    })),
    { assessmentId: "ms2001_quiz_01", status: "present", score: 85 },
    { assessmentId: "ms2001_quiz_02", status: "present", score: 75 },
    { assessmentId: "ms2001_end_term", status: "present", score: 80 },
  ];

  it("verifies End Term quiz attendance gate", () => {
    const records = makeBaseRecords().map((r) => {
      if (r.assessmentId === "ms2001_quiz_01")
        return { ...r, status: "present" as const, score: 0 };
      if (r.assessmentId === "ms2001_quiz_02") return { ...r, status: "absent" as const, score: 0 };
      return r;
    });

    const res = evaluateBdmEligibility(records);
    expect(res.endTerm.eligible).toBe(true);
  });

  it("computes T correctly using first 9 GAs and active formula branch", () => {
    // GAA: 9 GAs at 100 -> 0.05 * 100 = 5.0
    // Q1=100, Q2=100, F=100 -> both branches give 0.6*100 + 0.25*100 = 85.0 (Branch B: 0.4*100 + 0.25*100 + 0.3*100 = 95.0)
    // Total T = 5.0 + 95.0 = 100.0 -> Grade S
    const records = makeBaseRecords().map((r) => ({ ...r, score: 100 }));
    const gradeRes = calculateBdmGrade(records);
    expect(gradeRes.totalScore).toBe(100);
    expect(gradeRes.letterGrade).toBe("S");
    expect(gradeRes.breakdown.selectedBranch).toContain("Branch B");
  });
});
