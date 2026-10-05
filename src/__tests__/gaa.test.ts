import { describe, it, expect } from "vite-plus/test";
import { computeGaa } from "@/grading/utils";
import { COURSES } from "@/data/courses";
import type { AssessmentRecord } from "@/types/assessment";

describe("GAA Calculation Engine", () => {
  describe("CS2005 (Java) - Best 6 of 7 GrPAs (A2 - A8)", () => {
    const policy = COURSES.CS2005.gaaPolicy!;

    it("returns isComplete: false and score: null when fewer than 6 GrPAs are available", () => {
      const records: AssessmentRecord[] = [
        { assessmentId: "cs2005_grpa_02", status: "present", score: 80 },
        { assessmentId: "cs2005_grpa_03", status: "present", score: 90 },
        { assessmentId: "cs2005_grpa_04", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_05", status: "present", score: 70 },
        { assessmentId: "cs2005_grpa_06", status: "pending", score: null },
      ];

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(false);
      expect(result.score).toBeNull();
      expect(result.availableCount).toBe(4);
      expect(result.requiredCount).toBe(6);
    });

    it("computes exact average when exactly 6 GrPAs are completed", () => {
      const records: AssessmentRecord[] = [
        { assessmentId: "cs2005_grpa_02", status: "present", score: 60 },
        { assessmentId: "cs2005_grpa_03", status: "present", score: 70 },
        { assessmentId: "cs2005_grpa_04", status: "present", score: 80 },
        { assessmentId: "cs2005_grpa_05", status: "present", score: 90 },
        { assessmentId: "cs2005_grpa_06", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_07", status: "present", score: 50 },
      ];

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(true);
      // (60+70+80+90+100+50) / 6 = 450 / 6 = 75
      expect(result.score).toBe(75);
      expect(result.availableCount).toBe(6);
    });

    it("drops the lowest score when all 7 GrPAs are completed", () => {
      const records: AssessmentRecord[] = [
        { assessmentId: "cs2005_grpa_02", status: "present", score: 10 }, // lowest, should be dropped
        { assessmentId: "cs2005_grpa_03", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_04", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_05", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_06", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_07", status: "present", score: 100 },
        { assessmentId: "cs2005_grpa_08", status: "present", score: 100 },
      ];

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(true);
      expect(result.score).toBe(100);
      expect(result.consideredScores).toEqual([100, 100, 100, 100, 100, 100]);
    });

    it("treats absent records as score 0 and considers them", () => {
      const records: AssessmentRecord[] = [
        { assessmentId: "cs2005_grpa_02", status: "absent", score: 0 },
        { assessmentId: "cs2005_grpa_03", status: "present", score: 60 },
        { assessmentId: "cs2005_grpa_04", status: "present", score: 60 },
        { assessmentId: "cs2005_grpa_05", status: "present", score: 60 },
        { assessmentId: "cs2005_grpa_06", status: "present", score: 60 },
        { assessmentId: "cs2005_grpa_07", status: "present", score: 60 },
      ];

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(true);
      // (60*5 + 0) / 6 = 300 / 6 = 50
      expect(result.score).toBe(50);
    });
  });

  describe("SE2001 - Best 9 of 10 GAs", () => {
    const policy = COURSES.SE2001.gaaPolicy!;

    it("drops the single lowest GA out of 10", () => {
      const records: AssessmentRecord[] = [
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => ({
          assessmentId: `se2001_ga_${w.toString().padStart(2, "0")}`,
          status: "present" as const,
          score: 80,
        })),
        { assessmentId: "se2001_ga_10", status: "present", score: 20 }, // lowest
      ];

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(true);
      expect(result.score).toBe(80);
    });
  });

  describe("CS2006 - Exactly Weeks 1 & 2 Programming Assignments", () => {
    const policy = COURSES.CS2006.gaaPolicy!;

    it("requires both PAs to be complete", () => {
      const records: AssessmentRecord[] = [
        { assessmentId: "cs2006_pa_01", status: "present", score: 90 },
      ];
      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(false);
      expect(result.score).toBeNull();

      const recordsWithBoth: AssessmentRecord[] = [
        { assessmentId: "cs2006_pa_01", status: "present", score: 90 },
        { assessmentId: "cs2006_pa_02", status: "present", score: 100 },
      ];
      const completedResult = computeGaa(recordsWithBoth, policy);
      expect(completedResult.isComplete).toBe(true);
      expect(completedResult.score).toBe(95);
    });
  });

  describe("MS2001 - First 9 Weekly GAs", () => {
    const policy = COURSES.MS2001.gaaPolicy!;

    it("requires all 9 GAs and computes arithmetic mean", () => {
      const records: AssessmentRecord[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => ({
        assessmentId: `ms2001_ga_${w.toString().padStart(2, "0")}`,
        status: "present" as const,
        score: w === 9 ? 90 : 80,
      }));

      const result = computeGaa(records, policy);
      expect(result.isComplete).toBe(true);
      // (80*8 + 90) / 9 = 730 / 9 = 81.11
      expect(result.score).toBe(81.11);
    });
  });
});
