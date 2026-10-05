import { describe, it, expect } from "vite-plus/test";
import { CANONICAL_EVENTS } from "@/data/events";
import { selectSemesterProgress, selectNextHardCutoff } from "@/lib/selectors";
import { getNextImportantAction } from "@/lib/nextAction";
import { getDateSummary } from "@/lib/dateSummary";
import { parseDateComponents } from "@/lib/datetime";

describe("3-Zone At A Glance Architecture & Deterministic Logic", () => {
  const TODAY = "2026-09-19";

  describe("Zone 1: Semester Progress (25% Width)", () => {
    it("reports Pre-Semester Phase with 0% progress on Sep 19 without repeated dates", () => {
      const progress = selectSemesterProgress(TODAY);
      expect(progress.isPreSemester).toBe(true);
      expect(progress.percentage).toBe(0);
      expect(progress.currentWeekNumber).toBe(0);
    });

    it("evaluates active semester progress during term (e.g. Week 3)", () => {
      const progress = selectSemesterProgress("2026-10-25");
      expect(progress.isPreSemester).toBe(false);
      expect(progress.currentWeekNumber).toBe(3);
      expect(progress.percentage).toBe(25);
    });
  });

  describe("Zone 2: Next Important Anchor (50% Width)", () => {
    it("merges Immediate Priority and Next Hard Cutoff into Course Registration Closes countdown", () => {
      const progress = selectSemesterProgress(TODAY);
      const action = getNextImportantAction({
        events: CANONICAL_EVENTS,
        referenceDate: TODAY,
        isPreSemester: progress.isPreSemester,
      });
      const nextCutoff = selectNextHardCutoff(TODAY);

      expect(action.category).toBe("registration");
      expect(nextCutoff.event).toBeDefined();
      expect(nextCutoff.event?.id).toBe("cutoff_term_registration");

      // Closes on Sep 23 23:59 IST -> 4 days from Sep 19
      expect(nextCutoff.daysLeft).toBe(4);
    });

    it("handles active registration day countdown (e.g., Sep 22)", () => {
      const refDate = "2026-09-22";
      const nextCutoff = selectNextHardCutoff(refDate);
      expect(nextCutoff.daysLeft).toBe(1); // 1 day until Sep 23
    });

    it("handles registration closing day countdown (e.g., Sep 23)", () => {
      const refDate = "2026-09-23";
      const nextCutoff = selectNextHardCutoff(refDate);
      expect(nextCutoff.daysLeft).toBe(0); // TODAY
    });

    it("transitions to Course Drop hard cutoff after registration closes", () => {
      const postRegDate = "2026-09-25";
      const nextCutoff = selectNextHardCutoff(postRegDate);
      expect(nextCutoff.event?.id).toBe("course_drop_deadline");
      expect(nextCutoff.event?.date).toBe("2026-10-18");
    });
  });

  describe("Zone 3: Today / Selected Day Context (25% Width)", () => {
    it("reports 'No deadlines' when today (Sep 19) has no academic gates", () => {
      const summary = getDateSummary(CANONICAL_EVENTS, TODAY);
      expect(summary.deadlineCount).toBe(0);
      expect(summary.isSharedDeadline).toBe(false);
      expect(summary.hasExam).toBe(false);

      const parts = parseDateComponents(TODAY);
      expect(parts.month).toBe("SEP");
      expect(parts.dayNum).toBe(19);
    });

    it("reports 4 course deadlines when selecting Oct 18 (Week 2 shared deadline)", () => {
      const selectedDate = "2026-10-18";
      const summary = getDateSummary(CANONICAL_EVENTS, selectedDate);

      expect(summary.isSharedDeadline).toBe(true);
      expect(summary.deadlineCount).toBe(4);
      expect(summary.courses).toContain("CS2005");
      expect(summary.courses).toContain("SE2001");
      expect(summary.courses).toContain("CS2006");
      expect(summary.courses).toContain("MS2001");

      const parts = parseDateComponents(selectedDate);
      expect(parts.month).toBe("OCT");
      expect(parts.dayNum).toBe(18);
    });

    it("keeps Zone 1 and Zone 2 completely unaffected when selecting different dates", () => {
      // Zone 1 and 2 are always bound to live todayDate
      const zone1Today = selectSemesterProgress(TODAY);
      const zone2Today = selectNextHardCutoff(TODAY);

      // Navigating selectedDate in the calendar strip
      const navigatedDate = "2026-11-16"; // SCT Window 2 close
      const zone3Navigated = getDateSummary(CANONICAL_EVENTS, navigatedDate);

      // Verifying Zone 3 reflects the navigated date
      expect(zone3Navigated.hasHardCutoff).toBe(true);

      // Verifying Zone 1 & Zone 2 remain locked to today
      expect(zone1Today.percentage).toBe(0);
      expect(zone2Today.daysLeft).toBe(4);
    });
  });
});
