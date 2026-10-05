import { describe, it, expect } from "vite-plus/test";
import { evaluateJavaEligibility, calculateJavaGrade } from "@/grading/java";
import type { AssessmentRecord } from "@/types/assessment";

describe("CS2005 (Java) Grading & Eligibility Engine", () => {
  const makeBaseRecords = (): AssessmentRecord[] => [
    // GrPAs (A2 - A8) all 80
    ...[2, 3, 4, 5, 6, 7, 8].map((w) => ({
      assessmentId: `cs2005_grpa_${w.toString().padStart(2, "0")}`,
      status: "present" as const,
      score: 80,
    })),
    // Weekly assessments (W1 - W7) all 80
    ...[1, 2, 3, 4, 5, 6, 7].map((w) => ({
      assessmentId: `cs2005_ga_${w.toString().padStart(2, "0")}`,
      status: "present" as const,
      score: 80,
    })),
    // Quizzes
    { assessmentId: "cs2005_quiz_01", status: "present", score: 80 },
    { assessmentId: "cs2005_quiz_02", status: "present", score: 90 },
    // PEs
    { assessmentId: "cs2005_oppe_01", status: "present", score: 70 },
    { assessmentId: "cs2005_oppe_02", status: "present", score: 85 },
    // End Term
    { assessmentId: "cs2005_end_term", status: "present", score: 75 },
  ];

  describe("OPPE 1 Eligibility", () => {
    it("requires SCT to be passed and A2, A3, A4 >= 40", () => {
      const records = makeBaseRecords();
      // SCT pending -> not eligible
      let res = evaluateJavaEligibility(records, "pending");
      expect(res.oppe1.eligible).toBe(false);

      // SCT passed -> eligible
      res = evaluateJavaEligibility(records, "passed");
      expect(res.oppe1.eligible).toBe(true);

      // One GrPA < 40 -> not eligible
      const recordsFail = records.map((r) =>
        r.assessmentId === "cs2005_grpa_03" ? { ...r, score: 39 } : r,
      );
      res = evaluateJavaEligibility(recordsFail, "passed");
      expect(res.oppe1.eligible).toBe(false);
    });
  });

  describe("OPPE 2 Eligibility (Standalone Rule)", () => {
    it("requires SCT + A5..A8 >= 40 + Best 5 of first 7 weekly assessments >= 40", () => {
      const records = makeBaseRecords();
      let res = evaluateJavaEligibility(records, "passed");
      expect(res.oppe2.eligible).toBe(true);

      // A7 < 40 -> fails OPPE2 even if OPPE1 was passed
      const recordsFailA7 = records.map((r) =>
        r.assessmentId === "cs2005_grpa_07" ? { ...r, score: 39 } : r,
      );
      res = evaluateJavaEligibility(recordsFailA7, "passed");
      expect(res.oppe2.eligible).toBe(false);
      expect(res.oppe1.eligible).toBe(true); // OPPE1 still unaffected!
    });
  });

  describe("End Term Eligibility: Attendance Check", () => {
    it("satisfies quiz gate if student attended at least 1 quiz even with score 0", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_quiz_01")
          return { ...r, status: "present" as const, score: 0 };
        if (r.assessmentId === "cs2005_quiz_02")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const res = evaluateJavaEligibility(records, "passed");
      expect(res.endTerm.eligible).toBe(true);
      const quizCheck = res.endTerm.criteria.find((c) => c.name.includes("Quiz"));
      expect(quizCheck?.satisfied).toBe(true);
    });

    it("fails quiz gate if student was absent from both quizzes", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_quiz_01")
          return { ...r, status: "absent" as const, score: 0 };
        if (r.assessmentId === "cs2005_quiz_02")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const res = evaluateJavaEligibility(records, "passed");
      expect(res.endTerm.eligible).toBe(false);
    });
  });

  describe("Course Grade Gate: Programming Exam Gate & Incomplete Grades", () => {
    it("awards I_OP if both PE1 and PE2 are below 30 but student attended ET and T >= 40", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_oppe_01") return { ...r, score: 29 };
        if (r.assessmentId === "cs2005_oppe_02") return { ...r, score: 25 };
        return r;
      });

      const gradeRes = calculateJavaGrade(records, "passed");
      expect(gradeRes.courseGradeEligibility.eligible).toBe(false);
      expect(gradeRes.letterGrade).toBe("I_OP");
    });

    it("awards U if both PE1 and PE2 are below 30 and T < 40", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_oppe_01") return { ...r, score: 10 };
        if (r.assessmentId === "cs2005_oppe_02") return { ...r, score: 10 };
        if (r.assessmentId === "cs2005_end_term") return { ...r, score: 10 };
        if (r.assessmentId === "cs2005_quiz_01") return { ...r, score: 10 };
        if (r.assessmentId === "cs2005_quiz_02") return { ...r, score: 10 };
        return r;
      });

      const gradeRes = calculateJavaGrade(records, "passed");
      expect(gradeRes.courseGradeEligibility.eligible).toBe(false);
      expect(gradeRes.letterGrade).toBe("U");
    });

    it("awards I_BOTH if PE was failed (<30) and End Term was absent", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_oppe_01") return { ...r, score: 25 };
        if (r.assessmentId === "cs2005_oppe_02") return { ...r, score: 20 };
        if (r.assessmentId === "cs2005_end_term")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const gradeRes = calculateJavaGrade(records, "passed");
      expect(gradeRes.letterGrade).toBe("I_BOTH");
    });

    it("awards I if PE was passed (>=30) but End Term was absent", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_oppe_01") return { ...r, score: 60 };
        if (r.assessmentId === "cs2005_end_term")
          return { ...r, status: "absent" as const, score: 0 };
        return r;
      });

      const gradeRes = calculateJavaGrade(records, "passed");
      expect(gradeRes.letterGrade).toBe("I");
    });

    it("passes course grade gate if at least one PE is >= 30 and ET is attended", () => {
      const records = makeBaseRecords().map((r) => {
        if (r.assessmentId === "cs2005_oppe_01") return { ...r, score: 30 };
        if (r.assessmentId === "cs2005_oppe_02") return { ...r, score: 20 };
        return r;
      });

      const gradeRes = calculateJavaGrade(records, "passed");
      expect(gradeRes.courseGradeEligibility.eligible).toBe(true);
      expect(gradeRes.letterGrade).not.toBe("U");
      expect(gradeRes.letterGrade).not.toBe("I_OP");
    });
  });

  describe("Formula Verification: 0.20 Quiz Coefficient & PE Bonus", () => {
    it("verifies exact calculation: GAA=100, Q1=80, Q2=90, PE1=70, PE2=90, F=80", () => {
      const records: AssessmentRecord[] = [
        ...[2, 3, 4, 5, 6, 7, 8].map((w) => ({
          assessmentId: `cs2005_grpa_${w.toString().padStart(2, "0")}`,
          status: "present" as const,
          score: 100,
        })),
        ...[1, 2, 3, 4, 5, 6, 7].map((w) => ({
          assessmentId: `cs2005_ga_${w.toString().padStart(2, "0")}`,
          status: "present" as const,
          score: 100,
        })),
        { assessmentId: "cs2005_quiz_01", status: "present", score: 80 },
        { assessmentId: "cs2005_quiz_02", status: "present", score: 90 },
        { assessmentId: "cs2005_oppe_01", status: "present", score: 70 },
        { assessmentId: "cs2005_oppe_02", status: "present", score: 90 },
        { assessmentId: "cs2005_end_term", status: "present", score: 80 },
      ];

      // Manual breakdown:
      // GAA = 100 -> 0.05 * 100 = 5.0
      // PE max = max(70, 90) = 90 -> 0.20 * 90 = 18.0
      // F = 80 -> 0.45 * 80 = 36.0
      // Qz: branchA = 0.20 * max(80, 90) = 0.20 * 90 = 18.0
      //     branchB = 0.10 * 80 + 0.20 * 90 = 8.0 + 18.0 = 26.0
      //     max(18, 26) = 26.0
      // PE bonus = 0.10 * min(70, 90) = 0.10 * 70 = 7.0
      // Total T = 5.0 + 18.0 + 36.0 + 26.0 + 7.0 = 92.0
      const result = calculateJavaGrade(records, "passed");
      expect(result.totalScore).toBe(92);
      expect(result.letterGrade).toBe("S");
      expect(result.breakdown.peMinBonusContribution).toBe(7);
      expect(result.breakdown.qzContribution).toBe(26);
    });
  });
});
