import { describe, it, expect } from "vite-plus/test";
import { evaluateAppDev2Eligibility, calculateAppDev2Grade } from "@/grading/appDev2";
import type { AssessmentRecord } from "@/types/assessment";

describe("CS2006 (Application Development II) Grading & Eligibility Engine", () => {
  const makeBaseRecords = (): AssessmentRecord[] => [
    { assessmentId: "cs2006_pa_01", status: "present", score: 80 },
    { assessmentId: "cs2006_pa_02", status: "present", score: 90 },
    ...[1, 2, 3, 4, 5, 6, 7].map((w) => ({
      assessmentId: `cs2006_ga_${w.toString().padStart(2, "0")}`,
      status: "present" as const,
      score: 75,
    })),
    { assessmentId: "cs2006_quiz_01", status: "present", score: 80 },
    { assessmentId: "cs2006_quiz_02", status: "present", score: 85 },
    { assessmentId: "cs2006_end_term", status: "present", score: 70 },
  ];

  describe("Quiz Attendance Gate vs Score", () => {
    it("satisfies End Term eligibility if Quiz 1 attended with score 0", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2006_quiz_01")
          return { ...r, status: "present" as const, score: 0 };
        if (r.assessmentId === "cs2006_quiz_02")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const res = evaluateAppDev2Eligibility(records);
      expect(res.endTerm.eligible).toBe(true);
    });

    it("fails End Term eligibility if absent from both quizzes", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2006_quiz_01")
          return { ...r, status: "absent" as const, score: 0 };
        if (r.assessmentId === "cs2006_quiz_02")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const res = evaluateAppDev2Eligibility(records);
      expect(res.endTerm.eligible).toBe(false);
    });
  });

  describe("Formula Branch Selection", () => {
    it("selects Branch A when 0.6F + 0.25max is higher", () => {
      // High F (100), low Qz1 (10), high Qz2 (90)
      // Branch A: 0.6*100 + 0.25*90 = 60 + 22.5 = 82.5
      // Branch B: 0.4*100 + 0.25*10 + 0.3*90 = 40 + 2.5 + 27 = 69.5
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2006_end_term") return { ...r, score: 100 };
        if (r.assessmentId === "cs2006_quiz_01") return { ...r, score: 10 };
        if (r.assessmentId === "cs2006_quiz_02") return { ...r, score: 90 };
        return r;
      });

      const gradeRes = calculateAppDev2Grade(records);
      expect(gradeRes.breakdown.branchAScore).toBe(82.5);
      expect(gradeRes.breakdown.branchBScore).toBe(69.5);
      expect(gradeRes.breakdown.selectedBranch).toContain("Branch A");
    });

    it("selects Branch B when 0.4F + 0.25Q1 + 0.3Q2 is higher", () => {
      // Low F (20), high Qz1 (100), high Qz2 (100)
      // Branch A: 0.6*20 + 0.25*100 = 12 + 25 = 37.0
      // Branch B: 0.4*20 + 0.25*100 + 0.3*100 = 8 + 25 + 30 = 63.0
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2006_end_term") return { ...r, score: 20 };
        if (r.assessmentId === "cs2006_quiz_01") return { ...r, score: 100 };
        if (r.assessmentId === "cs2006_quiz_02") return { ...r, score: 100 };
        return r;
      });

      const gradeRes = calculateAppDev2Grade(records);
      expect(gradeRes.breakdown.branchAScore).toBe(37);
      expect(gradeRes.breakdown.branchBScore).toBe(63);
      expect(gradeRes.breakdown.selectedBranch).toContain("Branch B");
    });
  });
});
