import { describe, it, expect } from "vite-plus/test";
import { createInitialUserState } from "@/lib/persistence";
import * as actions from "@/lib/actions";
import {
  selectSemesterProgress,
  selectNextHardCutoff,
  selectCourseGrades,
  selectNextCourseEvent,
  selectAttentionItems,
  selectUpNextEvents,
  selectProjectSummary,
} from "@/lib/selectors";
import { TMA_V2_REQUIREMENTS } from "@/data/project";

describe("selectors & actions", () => {
  it("selectSemesterProgress calculates correct week and percentage", () => {
    const pre = selectSemesterProgress("2026-09-19");
    expect(pre.isPreSemester).toBe(true);
    expect(pre.currentWeekNumber).toBe(0);
    expect(pre.registrationStartDate).toBe("2026-09-22");
    expect(pre.registrationEndDate).toBe("2026-09-23");

    const p1 = selectSemesterProgress("2026-10-05");
    expect(p1.isPreSemester).toBe(false);
    expect(p1.currentWeekNumber).toBe(1);
    expect(p1.totalWeeks).toBe(12);

    const p2 = selectSemesterProgress("2026-10-18");
    expect(p2.currentWeekNumber).toBe(2);
    expect(p2.weekTitle).toBe("Week 2");
  });

  it("selectNextHardCutoff returns next valid academic cutoff", () => {
    const cutoff = selectNextHardCutoff("2026-10-18");
    expect(cutoff.event).not.toBeNull();
    if (cutoff.event) {
      expect(cutoff.daysLeft).toBeGreaterThanOrEqual(0);
      expect(cutoff.event.hardCutoff || cutoff.event.isHardCutoff).toBe(true);
    }
  });

  it("selectCourseGrades calculates pure grades from user state", () => {
    const state = createInitialUserState();
    const grades = selectCourseGrades(state);

    expect(grades.CS2005).not.toBeNull();
    expect(grades.SE2001).not.toBeNull();
    expect(grades.CS2006).not.toBeNull();
    expect(grades.MS2001).not.toBeNull();
    expect(grades.CS2006P).toBeNull(); // Project handled separately
  });

  it("selectNextCourseEvent returns upcoming event for specific course", () => {
    const nextEvent = selectNextCourseEvent("CS2005", "2026-10-01");
    expect(nextEvent).not.toBeNull();
    if (nextEvent) {
      expect(nextEvent.courseCode).toBe("CS2005");
    }
  });

  it("selectAttentionItems identifies pending SCT and critical cutoffs with canonical dates", () => {
    const state = createInitialUserState();

    // 1. In Pre-semester (Sep 19, 2026), SCT should be connected to Window 1 (Oct 30)
    const sepItems = selectAttentionItems(state, "2026-09-19");
    expect(sepItems.length).toBeGreaterThan(0);

    const sepSctItems = sepItems.filter((i) => i.type === "missing_prerequisite");
    expect(sepSctItems.length).toBe(2); // CS2005 & SE2001

    for (const item of sepSctItems) {
      expect(item.date).toBe("2026-10-30"); // Canonical SCT Window 1 close date
      expect(item.deadlineFormatted).toBe("October 30");
      expect(item.daysRemaining).toBe(41); // 41 days until Oct 30, NOT 0 ("Due Today")
      expect(item.title).toContain("Window 1");
    }

    // 2. When SCT is passed for CS2005, only SE2001 remains
    state.sctStatus.CS2005 = "passed";
    const updatedItems = selectAttentionItems(state, "2026-09-19");
    const remainingSct = updatedItems.filter((i) => i.type === "missing_prerequisite");
    expect(remainingSct.length).toBe(1);
    expect(remainingSct[0].courseCode).toBe("SE2001");

    // 3. During semester lookahead (Oct 18, 2026), 12 days remain until Window 1 closes
    state.sctStatus.CS2005 = "pending";
    const octItems = selectAttentionItems(state, "2026-10-18");
    const octSct = octItems.filter((i) => i.type === "missing_prerequisite");
    expect(octSct.length).toBe(2);
    expect(octSct[0].daysRemaining).toBe(12);
    expect(octSct[0].deadlineFormatted).toBe("October 30");
  });

  it("selectUpNextEvents returns sorted upcoming events within limit", () => {
    const events = selectUpNextEvents("2026-10-18", 6);
    expect(events.length).toBeLessThanOrEqual(6);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.date >= "2026-10-18").toBe(true);
    }
  });

  it("selectProjectSummary derives dynamic requirements count and stage", () => {
    const state = createInitialUserState();
    const summary = selectProjectSummary(state);

    expect(summary.track).toBeNull();
    expect(summary.completedRequirementsCount).toBe(0);
    expect(summary.totalRequirementsCount).toBe(TMA_V2_REQUIREMENTS.length);
    expect(summary.currentStageId).toBe("git_tracker");
  });

  it("actions modify state immutably", () => {
    let state = createInitialUserState();
    expect(state.sctStatus.CS2005).toBe("pending");

    state = actions.setSctStatus(state, "CS2005", "passed");
    expect(state.sctStatus.CS2005).toBe("passed");

    state = actions.setProjectTrack(state, "theory_completed_prior");
    expect(state.projectState.track).toBe("theory_completed_prior");

    state = actions.toggleProjectStage(state, "git_tracker");
    expect(state.projectState.completedStageIds).toContain("git_tracker");

    state = actions.toggleProjectRequirement(state, "tma_req_flask");
    expect(state.projectState.checkedRequirements).toContain("tma_req_flask");

    state = actions.updateAssessmentRecord(state, "cs2005_grpa_02", {
      status: "present",
      score: 95,
    });
    expect(state.assessmentRecords.cs2005_grpa_02.score).toBe(95);
    expect(state.assessmentRecords.cs2005_grpa_02.status).toBe("present");
  });
});
