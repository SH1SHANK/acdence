import { describe, it, expect } from "vite-plus/test";
import { CANONICAL_EVENTS, getHardCutoffs } from "@/data/events";
import { SEMESTER_CONFIG, isPreSemester } from "@/data/semester";
import { selectSemesterProgress, selectNextHardCutoff } from "@/lib/selectors";
import { getNextImportantAction } from "@/lib/nextAction";
import { getDateSummary } from "@/lib/dateSummary";

describe("Phase 3C UX Revamp & Authoritative Policy Compliance", () => {
  describe("1. Canonical SCT Windows 1, 2, 3, 4 Invariants", () => {
    it("contains all 4 canonical SCT Windows with exact dates and hard cutoff flag", () => {
      const sct1 = CANONICAL_EVENTS.find((e) => e.id === "sct_window_01");
      const sct2 = CANONICAL_EVENTS.find((e) => e.id === "sct_window_02");
      const sct3 = CANONICAL_EVENTS.find((e) => e.id === "sct_window_03");
      const sct4 = CANONICAL_EVENTS.find((e) => e.id === "sct_window_04");

      expect(sct1).toBeDefined();
      expect(sct2).toBeDefined();
      expect(sct3).toBeDefined();
      expect(sct4).toBeDefined();

      // Window 1: Oct 26 - Oct 30, 2026
      expect(sct1?.date).toBe("2026-10-30");
      expect(sct1?.hardCutoff).toBe(true);
      expect(sct1?.cutoffType).toBe("sct_window");

      // Window 2: Nov 12 - Nov 16, 2026
      expect(sct2?.date).toBe("2026-11-16");
      expect(sct2?.hardCutoff).toBe(true);
      expect(sct2?.cutoffType).toBe("sct_window");

      // Window 3: Dec 07 - Dec 11, 2026
      expect(sct3?.date).toBe("2026-12-11");
      expect(sct3?.hardCutoff).toBe(true);
      expect(sct3?.cutoffType).toBe("sct_window");

      // Window 4: Dec 24 - Dec 28, 2026
      expect(sct4?.date).toBe("2026-12-28");
      expect(sct4?.hardCutoff).toBe(true);
      expect(sct4?.cutoffType).toBe("sct_window");
    });

    it("ensures all 4 SCT windows are included in getHardCutoffs()", () => {
      const hardCutoffs = getHardCutoffs();
      const sctCutoffs = hardCutoffs.filter((c) => c.cutoffType === "sct_window");
      expect(sctCutoffs.length).toBe(4);
    });
  });

  describe("2. Authoritative Term Schedule & Content Release Dates", () => {
    it("correctly identifies Pre-Semester phase before Oct 2, 2026", () => {
      expect(isPreSemester("2026-09-19")).toBe(true);
      expect(isPreSemester("2026-09-22")).toBe(true); // Registration start
      expect(isPreSemester("2026-09-23")).toBe(true); // Registration end
      expect(isPreSemester("2026-09-30")).toBe(true);
      expect(isPreSemester("2026-10-02")).toBe(false); // Term content start
    });

    it("verifies exact content release dates and adjusted non-Sunday deadlines", () => {
      const w1 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 1);
      const w5 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 5);
      const w6 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 6);
      const w7 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 7);
      const w11 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 11);
      const w12 = SEMESTER_CONFIG.weeks.find((w) => w.weekNumber === 12);

      expect(w1?.contentReleaseDate).toBe("2026-10-02");
      expect(w1?.assignmentDeadline).toBe("2026-10-11");

      // Week 5, 6, 7 have Wednesday deadlines before exams/quizzes
      expect(w5?.assignmentDeadline).toBe("2026-11-11");
      expect(w6?.assignmentDeadline).toBe("2026-11-18");
      expect(w7?.assignmentDeadline).toBe("2026-11-25");

      // Week 11 & 12 combined final Wednesday deadline
      expect(w11?.assignmentDeadline).toBe("2026-12-23");
      expect(w12?.assignmentDeadline).toBe("2026-12-23");
    });
  });

  describe("3. Real-Time Temporal Anchor & Next Action", () => {
    it("evaluates live progress accurately for Sep 19 pre-semester", () => {
      const progress = selectSemesterProgress("2026-09-19");
      expect(progress.isPreSemester).toBe(true);
      expect(progress.currentWeekNumber).toBe(0);
      expect(progress.percentage).toBe(0);

      const action = getNextImportantAction({
        events: CANONICAL_EVENTS,
        referenceDate: "2026-09-19",
        isPreSemester: progress.isPreSemester,
        registrationStartDate: progress.registrationStartDate,
        registrationEndDate: progress.registrationEndDate,
      });

      expect(action.category).toBe("registration");
      expect(action.daysRemaining).toBe(3);
    });

    it("identifies Next Hard Cutoff correctly in pre-semester", () => {
      const cutoff = selectNextHardCutoff("2026-09-19");
      expect(cutoff.event).not.toBeNull();
      expect(cutoff.event?.id).toBe("cutoff_term_registration");
      expect(cutoff.daysLeft).toBe(4); // 2026-09-23 is 4 days away
    });
  });

  describe("4. Date Context & Shared Deadline Summaries", () => {
    it("reports shared deadline on Oct 18 (Week 2 deadline + drop window)", () => {
      const summary = getDateSummary(CANONICAL_EVENTS, "2026-10-18");
      expect(summary.hasHardCutoff).toBe(true);
      expect(summary.events.length).toBeGreaterThan(0);
    });

    it("accurately detects SCT Window 1 closing on Oct 30", () => {
      const summary = getDateSummary(CANONICAL_EVENTS, "2026-10-30");
      expect(summary.hasHardCutoff).toBe(true);
      const hasSct1 = summary.events.some((e) => e.id === "sct_window_01");
      expect(hasSct1).toBe(true);
    });
  });
});
