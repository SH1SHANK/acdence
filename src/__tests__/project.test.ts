import { describe, it, expect } from "vite-plus/test";
import { evaluateProjectGrade } from "@/grading/project";

describe("CS2006P (MAD-2 Project) Grading & Viva Progression Engine", () => {
  describe("Level 1 Viva Exact Boundary Values (19, 20, 29, 30)", () => {
    it("fails with U grade when L1 score is 19 (< 20)", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 19, null);
      expect(res.letterGrade).toBe("U");
      expect(res.l2Eligible).toBe(false);
      expect(res.statusDescription).toContain("Failed Level 1 viva");
    });

    it("passes with E grade (no L2 eligibility) when L1 score is 20", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 20, null);
      expect(res.letterGrade).toBe("E");
      expect(res.l2Eligible).toBe(false);
      expect(res.statusDescription).toContain("Awarded E grade without Level 2 viva");
    });

    it("passes with E grade (no L2 eligibility) when L1 score is 29", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 29, null);
      expect(res.letterGrade).toBe("E");
      expect(res.l2Eligible).toBe(false);
      expect(res.statusDescription).toContain("Awarded E grade without Level 2 viva");
    });

    it("qualifies for Level 2 viva when L1 score is 30 (>= 30)", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 30, null);
      expect(res.l2Eligible).toBe(true);
      expect(res.letterGrade).toBeNull(); // awaiting L2
      expect(res.statusDescription).toContain("Eligible and awaiting Level 2 viva");
    });
  });

  describe("Level 2 Viva Exact Boundary Values (0, 19, 20)", () => {
    it("awards E grade when L2 score is 0 (or absent)", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 35, 0);
      expect(res.letterGrade).toBe("E");
      expect(res.statusDescription).toContain("Absent or 0 marks in Level 2 viva");
    });

    it("awards D grade when L2 score is 19 (0 < score < 20)", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 35, 19);
      expect(res.letterGrade).toBe("D");
      expect(res.statusDescription).toContain("Awarded D grade");
    });

    it("passes and computes sum L1 + L2 when L2 score is 20 (>= 20)", () => {
      // 30 + 20 = 50 -> Grade D
      const res = evaluateProjectGrade("theory_completed_prior", 30, 20);
      expect(res.finalScore).toBe(50);
      expect(res.letterGrade).toBe("D");
    });

    it("awards S grade for high score (e.g. 40 + 55 = 95)", () => {
      const res = evaluateProjectGrade("theory_completed_prior", 40, 55);
      expect(res.finalScore).toBe(95);
      expect(res.letterGrade).toBe("S");
    });
  });

  describe("Submission Tracks & Capping Logic", () => {
    it("returns null deadline when track is not chosen", () => {
      const res = evaluateProjectGrade(null, null, null);
      expect(res.submissionDeadline).toBeNull();
    });

    it("uses Nov 17 deadline for prior theory track", () => {
      const res = evaluateProjectGrade("theory_completed_prior", null, null);
      expect(res.submissionDeadline).toBe("2026-11-17");
    });

    it("uses Dec 10 deadline and caps at 100 for current theory track", () => {
      const res = evaluateProjectGrade("theory_registered_current", 40, 65);
      expect(res.submissionDeadline).toBe("2026-12-10");
      // 40 + 65 = 105, capped to 100
      expect(res.finalScore).toBe(100);
      expect(res.letterGrade).toBe("S");
    });
  });
});
