import { describe, it, expect } from "vite-plus/test";
import {
  createInitialUserState,
  exportStateAsJson,
  importStateFromJson,
  resetUserState,
} from "@/lib/persistence";
import * as actions from "@/lib/actions";
import { COURSES } from "@/data/courses";
import { REFERENCE_DOCUMENTS } from "@/content";
import { CANONICAL_EVENTS } from "@/data/events";

describe("Phase 3D Final QA & State Sovereignty", () => {
  describe("JSON Export & Import Integrity", () => {
    it("exports current state as clean, formatted JSON with exact schema fields", () => {
      const state = createInitialUserState();
      const jsonStr = exportStateAsJson(state);

      expect(typeof jsonStr).toBe("string");
      const parsed = JSON.parse(jsonStr);

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.assessmentRecords).toBeDefined();
      expect(parsed.sctStatus).toBeDefined();
      expect(parsed.projectState).toBeDefined();
      expect(parsed.vivaChecklistState).toBeDefined();
      expect(parsed.tasks).toBeDefined();
      expect(parsed.updatedAt).toBeDefined();

      // Invariant: never leak derived metrics
      expect(parsed.totalScore).toBeUndefined();
      expect(parsed.calculatedT).toBeUndefined();
      expect(parsed.eligibility).toBeUndefined();
      expect(parsed.gaaScore).toBeUndefined();
    });

    it("imports previously exported JSON and restores deep state cleanly", () => {
      const initial = createInitialUserState();
      // Modify some records
      const modified = actions.updateAssessmentRecord(initial, "cs2005_ga_02", {
        status: "present",
        score: 95,
      });
      const withSct = actions.setSctStatus(modified, "CS2005", "passed");
      const withTrack = actions.setProjectTrack(withSct, "theory_completed_prior");
      const withTask = actions.addTask(withTrack, {
        title: "QA Backup Verification Task",
        courseCode: "CS2006P",
        status: "in_progress",
        priority: "high",
      });

      const exportedJson = exportStateAsJson(withTask);
      const imported = importStateFromJson(exportedJson);

      expect(imported.assessmentRecords["cs2005_ga_02"]?.score).toBe(95);
      expect(imported.assessmentRecords["cs2005_ga_02"]?.status).toBe("present");
      expect(imported.sctStatus["CS2005"]).toBe("passed");
      expect(imported.projectState.track).toBe("theory_completed_prior");

      const task = imported.tasks.find((t) => t.title === "QA Backup Verification Task");
      expect(task).toBeDefined();
      expect(task?.status).toBe("in_progress");
      expect(task?.priority).toBe("high");
    });

    it("throws a clear descriptive error on corrupt or malformed JSON import", () => {
      expect(() => {
        importStateFromJson("{ invalid json payload ...");
      }).toThrow();

      expect(() => {
        importStateFromJson("null");
      }).toThrow();

      expect(() => {
        importStateFromJson('"just a string"');
      }).toThrow();
    });
  });

  describe("Command Search Keywords & Registry Coverage", () => {
    it("ensures all 5 registered courses are represented with valid codes and titles", () => {
      const courseKeys = Object.keys(COURSES);
      expect(courseKeys).toEqual(["CS2005", "SE2001", "CS2006", "CS2006P", "MS2001"]);

      expect(COURSES.CS2005.name).toBe("Programming Concepts using Java");
      expect(COURSES.SE2001.name).toBe("System Commands");
      expect(COURSES.CS2006.name).toBe("Application Development II");
      expect(COURSES.CS2006P.name).toBe("Application Development II Project");
      expect(COURSES.MS2001.name).toBe("Business Data Management");
    });

    it("ensures all 4 authoritative reference documents are registered with correct IDs", () => {
      const docIds = REFERENCE_DOCUMENTS.map((d) => d.id);
      expect(docIds).toContain("grading-policy");
      expect(docIds).toContain("mad2-project-viva");
      expect(docIds).toContain("viva-preparation");
      expect(docIds).toContain("trekking-management-app");
    });

    it("verifies canonical event dataset includes drop deadline, quizzes, OPPEs, and end term", () => {
      const types = CANONICAL_EVENTS.map((e) => e.type);
      expect(types).toContain("assignment");
      expect(types).toContain("exam");
      expect(types).toContain("eligibility_close");
      expect(types).toContain("project_milestone");
      expect(types).toContain("project_submission");
      expect(types).toContain("viva");
    });
  });

  describe("Reset Safety & Invariant Protection", () => {
    it("resets state without throwing and reinstates fresh default tasks and null scores", () => {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      };

      const fresh = resetUserState(mockStorage);
      expect(fresh.schemaVersion).toBe(1);
      expect(fresh.tasks.length).toBeGreaterThanOrEqual(4);

      for (const rec of Object.values(fresh.assessmentRecords)) {
        expect(rec.status).toBe("pending");
        expect(rec.score).toBeNull();
      }

      for (const status of Object.values(fresh.sctStatus)) {
        expect(status).toBe("pending");
      }

      expect(fresh.projectState.track).toBeNull();
      expect(fresh.projectState.completedStageIds.length).toBe(0);
    });
  });
});
