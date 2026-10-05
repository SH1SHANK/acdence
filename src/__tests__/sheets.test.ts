import { describe, it, expect } from "vite-plus/test";
import { createInitialUserState } from "@/lib/persistence";
import * as actions from "@/lib/actions";
import { calculateCourseGrade } from "@/grading";
import { evaluateProjectGrade } from "@/grading/project";
import { selectCourseGrades, selectProjectSummary } from "@/lib/selectors";

describe("Phase 3B: Sheet Interactions & Live Calculations", () => {
  it("live assessment score entry dynamically recalculates T score and GAA for CS2005", () => {
    let state = createInitialUserState();

    // Initially T is null because essential components are missing
    let grades = selectCourseGrades(state);
    expect(grades.CS2005?.totalScore).toBeNull();
    expect(grades.CS2005?.gaa.score).toBeNull();

    // Add 6 GrPAs for CS2005 (best 6 of 7)
    const grpaScores = [80, 90, 85, 95, 70, 100];
    grpaScores.forEach((score, idx) => {
      const id = `cs2005_grpa_0${idx + 2}`;
      state = actions.updateAssessmentRecord(state, id, {
        status: "present",
        score,
      });
    });

    grades = selectCourseGrades(state);
    // Average of [80, 90, 85, 95, 70, 100] = 520 / 6 = 86.666...
    expect(grades.CS2005?.gaa.score).toBeCloseTo(86.67, 1);

    // Add 7th GrPA with lower score (60); it should be dropped
    state = actions.updateAssessmentRecord(state, "cs2005_grpa_08", {
      status: "present",
      score: 60,
    });
    grades = selectCourseGrades(state);
    expect(grades.CS2005?.gaa.score).toBeCloseTo(86.67, 1);

    // Add Quiz 1 = 80, Quiz 2 = 70, OPPE 1 = 80, OPPE 2 = 90, End Term = 85
    state = actions.updateAssessmentRecord(state, "cs2005_quiz_01", {
      status: "present",
      score: 80,
    });
    state = actions.updateAssessmentRecord(state, "cs2005_quiz_02", {
      status: "present",
      score: 70,
    });
    state = actions.updateAssessmentRecord(state, "cs2005_oppe_01", {
      status: "present",
      score: 80,
    });
    state = actions.updateAssessmentRecord(state, "cs2005_oppe_02", {
      status: "present",
      score: 90,
    });
    state = actions.updateAssessmentRecord(state, "cs2005_end_term", {
      status: "present",
      score: 85,
    });

    grades = selectCourseGrades(state);
    expect(grades.CS2005?.totalScore).not.toBeNull();
    expect(grades.CS2005?.totalScore).toBeGreaterThan(70);
  });

  it("SCT status toggle modifies OPPE eligibility gates", () => {
    let state = createInitialUserState();
    expect(state.sctStatus.CS2005).toBe("pending");

    // Initially with pending SCT, OPPE is ineligible
    let grade = calculateCourseGrade("CS2005", Object.values(state.assessmentRecords), {
      sctStatus: state.sctStatus,
    });
    const oppe1 = grade.examEligibility.find((e) => e.exam === "oppe_1");
    expect(oppe1?.eligible).toBe(false);

    // Set SCT to passed
    state = actions.setSctStatus(state, "CS2005", "passed");
    expect(state.sctStatus.CS2005).toBe("passed");
  });

  it("project track selection updates submission deadline and evaluation base", () => {
    let state = createInitialUserState();
    expect(state.projectState.track).toBeNull();

    // Select prior theory track
    state = actions.setProjectTrack(state, "theory_completed_prior");
    let summary = selectProjectSummary(state);
    expect(summary.track).toBe("theory_completed_prior");
    expect(summary.submissionDeadline).toBe("2026-11-17");

    // Select current theory track
    state = actions.setProjectTrack(state, "theory_registered_current");
    summary = selectProjectSummary(state);
    expect(summary.track).toBe("theory_registered_current");
    expect(summary.submissionDeadline).toBe("2026-12-10");
  });

  it("interactive stage toggling properly updates completedStageIds and currentStage", () => {
    let state = createInitialUserState();
    let summary = selectProjectSummary(state);
    expect(summary.currentStageId).toBe("git_tracker");

    // Complete git_tracker
    state = actions.toggleProjectStage(state, "git_tracker");
    expect(state.projectState.completedStageIds).toContain("git_tracker");

    summary = selectProjectSummary(state);
    expect(summary.currentStageId).toBe("development");

    // Toggle git_tracker off
    state = actions.toggleProjectStage(state, "git_tracker");
    expect(state.projectState.completedStageIds).not.toContain("git_tracker");

    summary = selectProjectSummary(state);
    expect(summary.currentStageId).toBe("git_tracker");
  });

  it("viva calculator enforces exact official grade boundaries", () => {
    // 1. L1 < 20 -> Fail U
    let res = evaluateProjectGrade("theory_completed_prior", 18, null);
    expect(res.letterGrade).toBe("U");
    expect(res.statusDescription).toContain("Fail");

    // 2. 20 <= L1 < 30 -> Pass E (no L2)
    res = evaluateProjectGrade("theory_completed_prior", 25, null);
    expect(res.letterGrade).toBe("E");
    expect(res.l2Eligible).toBe(false);

    // 3. L1 >= 30 -> Eligible for L2
    res = evaluateProjectGrade("theory_completed_prior", 35, null);
    expect(res.l2Eligible).toBe(true);

    // 4. L2 absent / 0 -> E
    res = evaluateProjectGrade("theory_completed_prior", 35, 0);
    expect(res.letterGrade).toBe("E");

    // 5. 0 < L2 < 20 -> D
    res = evaluateProjectGrade("theory_completed_prior", 35, 15);
    expect(res.letterGrade).toBe("D");

    // 6. L2 >= 20 -> Pass with sum L1 + L2
    res = evaluateProjectGrade("theory_completed_prior", 35, 45);
    expect(res.letterGrade).toBe("A");
    expect(res.finalScore).toBe(80);
  });

  it("toggling viva preparation SOP items mutates state correctly", () => {
    let state = createInitialUserState();
    expect(state.vivaChecklistState["viva_check_dual_camera"]).toBe(false);

    state = actions.toggleVivaItem(state, "viva_check_dual_camera");
    expect(state.vivaChecklistState["viva_check_dual_camera"]).toBe(true);

    state = actions.toggleVivaItem(state, "viva_check_dual_camera");
    expect(state.vivaChecklistState["viva_check_dual_camera"]).toBe(false);
  });
});
