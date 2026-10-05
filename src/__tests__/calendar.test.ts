import { describe, it, expect } from "vite-plus/test";
import { CANONICAL_EVENTS } from "@/data/events";
import {
  isPast,
  isUpcoming,
  getUpcomingEvents,
  getEventsBetween,
  getNextEvent,
  getNextHardCutoff,
  getEventsForCourse,
  getEventsByType,
} from "@/lib/calendar";

describe("Calendar Data & Pure Helpers Engine", () => {
  const mockReferenceDate = "2026-11-16"; // Just after Quiz 1 (Nov 15)

  describe("isPast and isUpcoming Pure Logic", () => {
    it("identifies past dates correctly", () => {
      expect(isPast("2026-11-15", mockReferenceDate)).toBe(true);
      expect(isPast("2026-11-16", mockReferenceDate)).toBe(false);
      expect(isPast("2026-11-17", mockReferenceDate)).toBe(false);
    });

    it("identifies upcoming dates correctly", () => {
      expect(isUpcoming("2026-11-15", mockReferenceDate)).toBe(false);
      expect(isUpcoming("2026-11-16", mockReferenceDate)).toBe(true);
      expect(isUpcoming("2026-11-17", mockReferenceDate)).toBe(true);
    });
  });

  describe("getUpcomingEvents & Chronological Ordering", () => {
    it("returns events on or after referenceDate sorted chronologically", () => {
      const upcoming = getUpcomingEvents(CANONICAL_EVENTS, mockReferenceDate);
      expect(upcoming.length).toBeGreaterThan(0);

      for (let i = 0; i < upcoming.length - 1; i++) {
        expect(upcoming[i].date <= upcoming[i + 1].date).toBe(true);
      }

      // Quiz 1 was Nov 15, so it should NOT be in upcoming as of Nov 16
      expect(upcoming.some((e) => e.id === "exam_quiz_1")).toBe(false);
      // Project submission Nov 17 should be in upcoming
      expect(upcoming.some((e) => e.id === "cs2006p_sub_track_prior")).toBe(true);
    });
  });

  describe("getEventsBetween", () => {
    it("returns events within given window inclusive", () => {
      // Window: Nov 15 to Nov 22
      const windowEvents = getEventsBetween(CANONICAL_EVENTS, "2026-11-15", "2026-11-22");

      expect(windowEvents.length).toBeGreaterThan(0);
      for (const e of windowEvents) {
        expect(e.date >= "2026-11-15").toBe(true);
        expect(e.date <= "2026-11-22").toBe(true);
      }

      // Should include Quiz 1 (Nov 15), Project sub (Nov 17), BPT 3 due (Nov 20), OPPE 1 (Nov 22)
      const ids = windowEvents.map((e) => e.id);
      expect(ids).toContain("exam_quiz_1");
      expect(ids).toContain("cs2006p_sub_track_prior");
      expect(ids).toContain("se2001_bpt_03_due");
      expect(ids).toContain("exam_cs2005_oppe_1");
    });
  });

  describe("getNextEvent & getNextHardCutoff", () => {
    it("finds the exact next event after a given date", () => {
      // On Nov 17, 2026, the next event is Nov 17 (cs2006p_sub_track_prior)
      const next = getNextEvent(CANONICAL_EVENTS, "2026-11-17");
      expect(next).not.toBeNull();
      expect(next?.date).toBe("2026-11-17");
      expect(next?.id).toBe("cs2006p_sub_track_prior");
    });

    it("finds the exact next hard cutoff", () => {
      // On Nov 18, 2026, next hard cutoff is Nov 20 (SE2001 BPT 3 / OPPE cutoff)
      const nextCutoff = getNextHardCutoff(CANONICAL_EVENTS, "2026-11-18");
      expect(nextCutoff).not.toBeNull();
      expect(nextCutoff?.date).toBe("2026-11-20");
      expect(nextCutoff?.hardCutoff).toBe(true);
    });

    it("finds the course-specific next hard cutoff", () => {
      // On Nov 02, 2026, next hard cutoff affecting CS2005 is Nov 16 (sct_window_02)
      const nextJavaCutoff = getNextHardCutoff(CANONICAL_EVENTS, "2026-11-02", "CS2005");
      expect(nextJavaCutoff).not.toBeNull();
      expect(nextJavaCutoff?.id).toBe("sct_window_02");

      // On Nov 17, 2026, next hard cutoff affecting CS2005 is Nov 25 (End Term eligibility cutoff)
      const nextJavaPostSctCutoff = getNextHardCutoff(CANONICAL_EVENTS, "2026-11-17", "CS2005");
      expect(nextJavaPostSctCutoff?.id).toBe("cutoff_week_07");

      // Next course-exclusive cutoff tagged directly to CS2005 is Nov 29 (OPPE 2 cutoff)
      const javaExclusiveCutoff = getNextEvent(
        CANONICAL_EVENTS,
        "2026-11-02",
        (e) => (e.hardCutoff || e.isHardCutoff) && e.courseCode === "CS2005",
      );
      expect(javaExclusiveCutoff).not.toBeNull();
      expect(javaExclusiveCutoff?.courseCode).toBe("CS2005");
      expect(javaExclusiveCutoff?.id).toBe("cutoff_week_08");
    });
  });

  describe("Filtering by Course and EventType", () => {
    it("filters events by course including term-wide events", () => {
      const javaEvents = getEventsForCourse(CANONICAL_EVENTS, "CS2005");
      expect(javaEvents.length).toBeGreaterThan(0);
      // Contains CS2005 OPPE 1
      expect(javaEvents.some((e) => e.id === "exam_cs2005_oppe_1")).toBe(true);
      // Also contains semester-wide exams like Quiz 1 and End Term
      expect(javaEvents.some((e) => e.id === "exam_quiz_1")).toBe(true);
      expect(javaEvents.some((e) => e.id === "exam_end_term")).toBe(true);
    });

    it("filters events by exact event type", () => {
      const exams = getEventsByType(CANONICAL_EVENTS, "exam");
      expect(exams.length).toBeGreaterThan(0);
      for (const e of exams) {
        expect(e.type).toBe("exam");
      }

      const eligibilityCutoffs = getEventsByType(CANONICAL_EVENTS, "eligibility_close");
      expect(eligibilityCutoffs.length).toBeGreaterThanOrEqual(4);
      for (const e of eligibilityCutoffs) {
        expect(e.type).toBe("eligibility_close");
        expect(e.hardCutoff).toBe(true);
      }
    });
  });
});
