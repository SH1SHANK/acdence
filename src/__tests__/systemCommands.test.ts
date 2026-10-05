import { describe, it, expect } from "vite-plus/test";
import {
  evaluateSystemCommandsEligibility,
  calculateSystemCommandsGrade,
} from "@/grading/systemCommands";
import type { AssessmentRecord } from "@/types/assessment";

describe("SE2001 (System Commands) Grading & Eligibility Engine", () => {
  const makeBaseRecords = (): AssessmentRecord[] => [
    // 10 GAs
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => ({
      assessmentId: `se2001_ga_${w.toString().padStart(2, "0")}`,
      status: "present" as const,
      score: 80,
    })),
    // BPT 1 - 4
    { assessmentId: "se2001_bpt_01", status: "present", score: 50 },
    { assessmentId: "se2001_bpt_02", status: "present", score: 60 },
    { assessmentId: "se2001_bpt_03", status: "present", score: 70 },
    { assessmentId: "se2001_bpt_04", status: "present", score: 80 },
    // Quiz 1
    { assessmentId: "se2001_quiz_01", status: "present", score: 75 },
    // OPPE
    { assessmentId: "se2001_oppe_01", status: "present", score: 60 },
    // End Term
    { assessmentId: "se2001_end_term", status: "present", score: 70 },
  ];

  describe("BPT Window Exclusion: OPPE Eligibility Gate", () => {
    it("strictly excludes BPT 4: 3 BPTs at 39 + BPT 4 at 100 results in INELIGIBLE", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_bpt_01") return { ...r, score: 39 };
        if (r.assessmentId === "se2001_bpt_02") return { ...r, score: 39 };
        if (r.assessmentId === "se2001_bpt_03") return { ...r, score: 39 };
        if (r.assessmentId === "se2001_bpt_04") return { ...r, score: 100 };
        return r;
      });

      const res = evaluateSystemCommandsEligibility(records, { sctStatus: "passed" });
      // Average of first 3 is 39 < 40
      expect(res.oppe.eligible).toBe(false);
    });

    it("verifies OPPE eligibility when first 3 BPTs average >= 40 even if BPT 4 is 0", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_bpt_01") return { ...r, score: 40 };
        if (r.assessmentId === "se2001_bpt_02") return { ...r, score: 40 };
        if (r.assessmentId === "se2001_bpt_03") return { ...r, score: 40 };
        if (r.assessmentId === "se2001_bpt_04") return { ...r, score: 0 };
        return r;
      });

      const res = evaluateSystemCommandsEligibility(records, { sctStatus: "passed" });
      // Average of first 3 is 40 >= 40
      expect(res.oppe.eligible).toBe(true);
    });
  });

  describe("Re-OPPE Eligibility Criteria", () => {
    it("requires score >= 20 and meet duration >= 90 mins", () => {
      const records = makeBaseRecords().map((r) =>
        r.assessmentId === "se2001_oppe_01" ? { ...r, score: 19 } : r,
      );

      // Score 19 -> ineligible
      let res = evaluateSystemCommandsEligibility(records, {
        sctStatus: "passed",
        oppeMeetDurationMinutes: 90,
      });
      expect(res.reoppe.eligible).toBe(false);

      // Score 20 but meet 89 min -> ineligible
      const records20 = makeBaseRecords().map((r) =>
        r.assessmentId === "se2001_oppe_01" ? { ...r, score: 20 } : r,
      );
      res = evaluateSystemCommandsEligibility(records20, {
        sctStatus: "passed",
        oppeMeetDurationMinutes: 89,
      });
      expect(res.reoppe.eligible).toBe(false);

      // Score 20 and meet 90 min -> eligible
      res = evaluateSystemCommandsEligibility(records20, {
        sctStatus: "passed",
        oppeMeetDurationMinutes: 90,
      });
      expect(res.reoppe.eligible).toBe(true);
    });
  });

  describe("Course Grade Gate: Programming Exam Gate & Incomplete Grades", () => {
    it("awards I_OP if OPPE score is below 40 but student attended ET and T >= 40", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_oppe_01") return { ...r, score: 39 };
        return r;
      });

      const gradeRes = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
      expect(gradeRes.courseGradeEligibility.eligible).toBe(false);
      expect(gradeRes.letterGrade).toBe("I_OP");
    });

    it("awards U if OPPE score is below 40 and T < 40", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_oppe_01") return { ...r, score: 10 };
        if (r.assessmentId === "se2001_end_term") return { ...r, score: 10 };
        if (r.assessmentId === "se2001_quiz_01") return { ...r, score: 10 };
        return r;
      });

      const gradeRes = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
      expect(gradeRes.courseGradeEligibility.eligible).toBe(false);
      expect(gradeRes.letterGrade).toBe("U");
    });

    it("awards I_BOTH if OPPE was failed (<40) and End Term was absent", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_oppe_01") return { ...r, score: 30 };
        if (r.assessmentId === "se2001_end_term")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const gradeRes = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
      expect(gradeRes.letterGrade).toBe("I_BOTH");
    });

    it("awards I if OPPE was passed (>=40) but End Term was absent", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "se2001_oppe_01") return { ...r, score: 70 };
        if (r.assessmentId === "se2001_end_term")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const gradeRes = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
      expect(gradeRes.letterGrade).toBe("I");
    });
  });

  describe("Formula Verification", () => {
    it("verifies T = 0.05 GAA + 0.25 Qz1 + 0.30 OPPE + 0.30 F + 0.10 BPTA", () => {
      // GAA: 10 GAs of 100 -> GAA = 100 -> 0.05 * 100 = 5.0
      // Qz1: 80 -> 0.25 * 80 = 20.0
      // OPPE: 90 -> 0.30 * 90 = 27.0
      // F: 80 -> 0.30 * 80 = 24.0
      // BPTA: 4 BPTs of 100 -> 0.10 * 100 = 10.0
      // Total T = 5.0 + 20.0 + 27.0 + 24.0 + 10.0 = 86.0 -> Grade A
      const records: AssessmentRecord[] = [
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => ({
          assessmentId: `se2001_ga_${w.toString().padStart(2, "0")}`,
          status: "present" as const,
          score: 100,
        })),
        { assessmentId: "se2001_bpt_01", status: "present", score: 100 },
        { assessmentId: "se2001_bpt_02", status: "present", score: 100 },
        { assessmentId: "se2001_bpt_03", status: "present", score: 100 },
        { assessmentId: "se2001_bpt_04", status: "present", score: 100 },
        { assessmentId: "se2001_quiz_01", status: "present", score: 80 },
        { assessmentId: "se2001_oppe_01", status: "present", score: 90 },
        { assessmentId: "se2001_end_term", status: "present", score: 80 },
      ];

      const gradeRes = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
      expect(gradeRes.totalScore).toBe(86);
      expect(gradeRes.letterGrade).toBe("A");
      expect(gradeRes.breakdown.bptaScore).toBe(100);
    });
  });
});
