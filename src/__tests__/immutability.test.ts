import { describe, it, expect } from "vite-plus/test";
import type { AssessmentRecord } from "@/types/assessment";
import { computeGaa, checkBestFiveOfSeven, calculateAverage } from "@/grading/utils";
import { COURSES } from "@/data/courses";
import { calculateJavaGrade } from "@/grading/java";
import { calculateSystemCommandsGrade } from "@/grading/systemCommands";
import { calculateAppDev2Grade } from "@/grading/appDev2";
import { calculateBdmGrade } from "@/grading/bdm";
import { selectAttentionItems, selectCourseGrades } from "@/lib/selectors";
import { createInitialUserState } from "@/lib/persistence";

describe("Immutability Guarantees", () => {
  it("computeGaa does not mutate the input records array or objects", () => {
    const records: AssessmentRecord[] = [
      { assessmentId: "cs2005_grpa_02", score: 80, status: "present" },
      { assessmentId: "cs2005_grpa_03", score: 90, status: "present" },
      { assessmentId: "cs2005_grpa_04", score: 70, status: "present" },
      { assessmentId: "cs2005_grpa_05", score: 85, status: "present" },
      { assessmentId: "cs2005_grpa_06", score: 95, status: "present" },
      { assessmentId: "cs2005_grpa_07", score: 60, status: "present" },
      { assessmentId: "cs2005_grpa_08", score: 100, status: "present" },
    ];
    const snapshot = JSON.stringify(records);
    computeGaa(records, COURSES.CS2005.gaaPolicy!);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it("checkBestFiveOfSeven does not mutate input records", () => {
    const records: AssessmentRecord[] = [
      { assessmentId: "cs2005_ga_01", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_02", score: 50, status: "present" },
      { assessmentId: "cs2005_ga_03", score: 80, status: "present" },
      { assessmentId: "cs2005_ga_04", score: 90, status: "present" },
      { assessmentId: "cs2005_ga_05", score: 40, status: "present" },
      { assessmentId: "cs2005_ga_06", score: 75, status: "present" },
      { assessmentId: "cs2005_ga_07", score: 85, status: "present" },
    ];
    const weeklyIds = [1, 2, 3, 4, 5, 6, 7].map(
      (w) => `cs2005_ga_${w.toString().padStart(2, "0")}`,
    );
    const snapshot = JSON.stringify(records);
    checkBestFiveOfSeven(records, weeklyIds);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it("calculateAverage does not mutate input numbers array", () => {
    const scores = [80, 95, 40, 60, 100];
    const snapshot = [...scores];
    calculateAverage(scores);
    expect(scores).toEqual(snapshot);
  });

  it("all course grading calculations preserve input records immutability", () => {
    const records: AssessmentRecord[] = [
      { assessmentId: "cs2005_grpa_02", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_03", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_04", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_05", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_06", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_07", score: 100, status: "present" },
      { assessmentId: "cs2005_grpa_08", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_01", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_02", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_03", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_04", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_05", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_06", score: 100, status: "present" },
      { assessmentId: "cs2005_ga_07", score: 100, status: "present" },
      { assessmentId: "cs2005_quiz_01", score: 80, status: "present" },
      { assessmentId: "cs2005_quiz_02", score: 80, status: "present" },
      { assessmentId: "cs2005_oppe_01", score: 80, status: "present" },
      { assessmentId: "cs2005_oppe_02", score: 80, status: "present" },
      { assessmentId: "cs2005_end_term", score: 80, status: "present" },
    ];
    const snapshot = JSON.stringify(records);
    calculateJavaGrade(records, "passed");
    calculateSystemCommandsGrade(records, { sctStatus: "passed" });
    calculateAppDev2Grade(records);
    calculateBdmGrade(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it("selectors do not mutate persisted user state", () => {
    const state = createInitialUserState();
    const snapshot = JSON.stringify(state);
    selectAttentionItems(state, "2026-10-15");
    selectCourseGrades(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
