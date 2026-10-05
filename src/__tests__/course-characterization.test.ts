import { describe, it, expect } from "vite-plus/test";
import type { AssessmentRecord } from "@/types/assessment";
import { calculateJavaGrade } from "@/grading/java";
import { calculateSystemCommandsGrade } from "@/grading/systemCommands";
import { calculateAppDev2Grade } from "@/grading/appDev2";
import { calculateBdmGrade } from "@/grading/bdm";
import { evaluateProjectGrade } from "@/grading/project";

function createRecord(
  id: string,
  score: number | null,
  status: "pending" | "present" | "absent" = "present",
): AssessmentRecord {
  return {
    assessmentId: id,
    score,
    status,
  };
}

describe("Course Characterization Baseline: CS2005 (Java)", () => {
  it("calculates formula components and full score accurately", () => {
    // 7 GrPAs (A2..A8): 100, 100, 100, 100, 100, 100, 50 -> best 6 = 100 each -> GAA = 100
    // PE1 = 80, PE2 = 60 -> max = 80 (0.2*80 = 16), min = 60 (0.1*60 = 6)
    // Q1 = 80, Q2 = 90 -> Branch A: 0.2*90 = 18; Branch B: 0.1*80 + 0.2*90 = 8+18 = 26 -> max = 26
    // F (End Term) = 80 -> 0.45*80 = 36
    // Total T = 0.05*100 (5) + 16 + 6 + 26 + 36 = 89 -> A grade
    const records: AssessmentRecord[] = [
      createRecord("cs2005_ga_01", 100),
      createRecord("cs2005_ga_02", 100),
      createRecord("cs2005_ga_03", 100),
      createRecord("cs2005_ga_04", 100),
      createRecord("cs2005_ga_05", 100),
      createRecord("cs2005_ga_06", 100),
      createRecord("cs2005_ga_07", 100),
      createRecord("cs2005_grpa_02", 100),
      createRecord("cs2005_grpa_03", 100),
      createRecord("cs2005_grpa_04", 100),
      createRecord("cs2005_grpa_05", 100),
      createRecord("cs2005_grpa_06", 100),
      createRecord("cs2005_grpa_07", 100),
      createRecord("cs2005_grpa_08", 50),
      createRecord("cs2005_quiz_01", 80),
      createRecord("cs2005_quiz_02", 90),
      createRecord("cs2005_oppe_01", 80),
      createRecord("cs2005_oppe_02", 60),
      createRecord("cs2005_end_term", 80),
    ];

    const result = calculateJavaGrade(records, "passed");
    expect(result.gaa.score).toBe(100);
    expect(result.totalScore).toBe(89);
    expect(result.letterGrade).toBe("A");
    expect(result.courseGradeEligibility.eligible).toBe(true);
  });

  it("assigns I_OP if End Term passed but both PEs fail (< 30) and T >= 40", () => {
    const records: AssessmentRecord[] = [
      createRecord("cs2005_ga_01", 100),
      createRecord("cs2005_ga_02", 100),
      createRecord("cs2005_ga_03", 100),
      createRecord("cs2005_ga_04", 100),
      createRecord("cs2005_ga_05", 100),
      createRecord("cs2005_ga_06", 100),
      createRecord("cs2005_ga_07", 100),
      createRecord("cs2005_grpa_02", 100),
      createRecord("cs2005_grpa_03", 100),
      createRecord("cs2005_grpa_04", 100),
      createRecord("cs2005_grpa_05", 100),
      createRecord("cs2005_grpa_06", 100),
      createRecord("cs2005_grpa_07", 100),
      createRecord("cs2005_grpa_08", 100),
      createRecord("cs2005_quiz_01", 100),
      createRecord("cs2005_quiz_02", 100),
      createRecord("cs2005_oppe_01", 20),
      createRecord("cs2005_oppe_02", 20),
      createRecord("cs2005_end_term", 100),
    ];

    const result = calculateJavaGrade(records, "passed");
    expect(result.letterGrade).toBe("I_OP");
  });
});

describe("Course Characterization Baseline: SE2001 (System Commands)", () => {
  it("calculates 0.05 GAA + 0.25 Qz1 + 0.30 OPPE + 0.30 F + 0.10 BPTA", () => {
    // 10 GAs: all 100 -> best 9 = 100 -> GAA = 100 (5)
    // 4 BPTs: 80, 80, 80, 80 -> avg = 80 -> BPTA = 80 (8)
    // Qz1 = 80 -> 0.25*80 = 20
    // OPPE = 80 -> 0.30*80 = 24
    // F = 80 -> 0.30*80 = 24
    // Total T = 5 + 8 + 20 + 24 + 24 = 81 -> A grade
    const records: AssessmentRecord[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        createRecord(`se2001_ga_${(i + 1).toString().padStart(2, "0")}`, 100),
      ),
      createRecord("se2001_bpt_01", 80),
      createRecord("se2001_bpt_02", 80),
      createRecord("se2001_bpt_03", 80),
      createRecord("se2001_bpt_04", 80),
      createRecord("se2001_quiz_01", 80),
      createRecord("se2001_oppe_01", 80),
      createRecord("se2001_end_term", 80),
    ];

    const result = calculateSystemCommandsGrade(records, { sctStatus: "passed" });
    expect(result.gaa.score).toBe(100);
    expect(result.totalScore).toBe(81);
    expect(result.letterGrade).toBe("A");
    expect(result.courseGradeEligibility.eligible).toBe(true);
  });
});

describe("Course Characterization Baseline: CS2006 & MS2001", () => {
  it("evaluates Branch A when 0.6F + 0.25max(Q1,Q2) exceeds Branch B", () => {
    // F = 90, Q1 = 40, Q2 = 30
    // Branch A: 0.6*90 + 0.25*40 = 54 + 10 = 64
    // Branch B: 0.4*90 + 0.25*40 + 0.30*30 = 36 + 10 + 9 = 55
    // CS2006: GAA avg(PA1, PA2) = 100 -> 0.05*100 = 5 -> Total = 69 -> C
    const records: AssessmentRecord[] = [
      ...Array.from({ length: 7 }, (_, i) =>
        createRecord(`cs2006_ga_${(i + 1).toString().padStart(2, "0")}`, 100),
      ),
      createRecord("cs2006_pa_01", 100),
      createRecord("cs2006_pa_02", 100),
      createRecord("cs2006_quiz_01", 40),
      createRecord("cs2006_quiz_02", 30),
      createRecord("cs2006_end_term", 90),
    ];

    const result = calculateAppDev2Grade(records);
    expect(result.totalScore).toBe(69);
    expect(result.letterGrade).toBe("C");
    expect(result.breakdown.selectedBranch).toContain("Branch A");
  });

  it("evaluates Branch B when 0.4F + 0.25Q1 + 0.30Q2 exceeds Branch A", () => {
    // F = 40, Q1 = 90, Q2 = 90
    // Branch A: 0.6*40 + 0.25*90 = 24 + 22.5 = 46.5
    // Branch B: 0.4*40 + 0.25*90 + 0.30*90 = 16 + 22.5 + 27 = 65.5
    // MS2001: GAA = 100 -> 0.05*100 = 5 -> Total = 70.5 -> B
    const records: AssessmentRecord[] = [
      ...Array.from({ length: 9 }, (_, i) =>
        createRecord(`ms2001_ga_${(i + 1).toString().padStart(2, "0")}`, 100),
      ),
      createRecord("ms2001_quiz_01", 90),
      createRecord("ms2001_quiz_02", 90),
      createRecord("ms2001_end_term", 40),
    ];

    const result = calculateBdmGrade(records);
    expect(result.totalScore).toBe(70.5);
    expect(result.letterGrade).toBe("B");
    expect(result.breakdown.selectedBranch).toContain("Branch B");
  });
});

describe("Course Characterization Baseline: CS2006P (MAD-2 Project)", () => {
  it("evaluates L1 thresholds: <20 (U), 20-29 (E), >=30 (L2 eligible)", () => {
    expect(evaluateProjectGrade("theory_registered_current", 15, null).letterGrade).toBe("U");
    expect(evaluateProjectGrade("theory_registered_current", 25, null).letterGrade).toBe("E");
    expect(evaluateProjectGrade("theory_registered_current", 35, null).l2Eligible).toBe(true);
    expect(evaluateProjectGrade("theory_registered_current", 35, null).letterGrade).toBeNull();
  });

  it("evaluates L2 thresholds: 0 (E), 1-19 (D), >=20 (sum capped at 100 for Track B)", () => {
    expect(evaluateProjectGrade("theory_registered_current", 35, 0).letterGrade).toBe("E");
    expect(evaluateProjectGrade("theory_registered_current", 35, 15).letterGrade).toBe("D");
    // L1 = 40, L2 = 70 -> sum 110, capped to 100 for Track B -> S grade
    const cappedResult = evaluateProjectGrade("theory_registered_current", 40, 70);
    expect(cappedResult.finalScore).toBe(100);
    expect(cappedResult.letterGrade).toBe("S");
  });
});
