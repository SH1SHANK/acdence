import { describe, it, expect } from "vite-plus/test";
import { CANONICAL_EVENTS, getEventById, getHardCutoffs, getEventsForCourse } from "@/data/events";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";

describe("Canonical Events & Single Source of Truth", () => {
  it("ensures every eventId in ASSESSMENT_DEFINITIONS references a valid canonical event", () => {
    const definitionsWithEvent = ASSESSMENT_DEFINITIONS.filter((d) => d.eventId);
    expect(definitionsWithEvent.length).toBeGreaterThan(0);

    for (const def of definitionsWithEvent) {
      const event = getEventById(def.eventId!);
      expect(event).toBeDefined();
      expect(event?.id).toBe(def.eventId);
    }
  });

  it("verifies all canonical events have valid ISO date strings (YYYY-MM-DD)", () => {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const event of CANONICAL_EVENTS) {
      expect(event.date).toMatch(isoDateRegex);
      const parsed = new Date(event.date);
      expect(isNaN(parsed.getTime())).toBe(false);
    }
  });

  it("identifies all hard eligibility cutoffs correctly", () => {
    const hardCutoffs = getHardCutoffs();
    expect(hardCutoffs.length).toBeGreaterThanOrEqual(4);

    const cutoffIds = hardCutoffs.map((c) => c.id);
    expect(cutoffIds).toContain("cutoff_week_04"); // Quiz 1 cutoff
    expect(cutoffIds).toContain("cutoff_week_07"); // End term cutoff
    expect(cutoffIds).toContain("cutoff_week_08"); // OPPE 2 cutoff
    expect(cutoffIds).toContain("cutoff_week_10"); // GAA cutoff
  });

  it("filters events correctly by course", () => {
    const se2001Events = getEventsForCourse("SE2001");
    expect(se2001Events.length).toBeGreaterThan(0);
    // Should include BPTs and general semester exams
    expect(se2001Events.some((e) => e.id.includes("bpt"))).toBe(true);
  });
});
