import { describe, it, expect } from "vite-plus/test";
import { createInitialUserState, loadUserState, saveUserState } from "@/lib/persistence";
import * as actions from "@/lib/actions";
import { CANONICAL_EVENTS, getHardCutoffs } from "@/data/events";
import { REFERENCE_DOCUMENTS } from "@/content";
import { marked } from "marked";
import gradingPolicyRaw from "@/content/reference/grading-policy.md?raw";
import mad2ProjectVivaRaw from "@/content/reference/mad2-project-viva.md?raw";
import vivaPrepRaw from "@/content/reference/viva-preparation.md?raw";
import trekkingAppRaw from "@/content/reference/trekking-management-app.md?raw";

describe("Secondary Tools Data & Domain Engines (Phase 3C)", () => {
  describe("Task Board Pure Mutators & State Persistence", () => {
    it("initializes with default tasks and correct task structure", () => {
      const state = createInitialUserState();
      expect(state.tasks).toBeDefined();
      expect(Array.isArray(state.tasks)).toBe(true);
      expect(state.tasks.length).toBeGreaterThanOrEqual(4);

      const sctTask = state.tasks.find((t) => t.id === "task_sct_registration");
      expect(sctTask).toBeDefined();
      expect(sctTask?.status).toBe("todo");
      expect(sctTask?.priority).toBe("high");
      expect(sctTask?.courseCode).toBe("CS2005");
    });

    it("adds a new task without mutating original state", () => {
      const initial = createInitialUserState();
      const initialCount = initial.tasks.length;

      const updated = actions.addTask(initial, {
        title: "Test Task for Project Viva",
        courseCode: "CS2006P",
        status: "todo",
        priority: "high",
        dueDate: "2026-11-20",
      });

      expect(updated.tasks.length).toBe(initialCount + 1);
      expect(initial.tasks.length).toBe(initialCount); // Pure immutability

      const added = updated.tasks.find((t) => t.title === "Test Task for Project Viva");
      expect(added).toBeDefined();
      expect(added?.status).toBe("todo");
      expect(added?.priority).toBe("high");
      expect(added?.courseCode).toBe("CS2006P");
      expect(added?.id).toBeDefined();
      expect(added?.createdAt).toBeDefined();
    });

    it("updates task status through Kanban progression: todo -> in_progress -> done", () => {
      const initial = createInitialUserState();
      const taskId = initial.tasks[0].id;

      // Step 1: Start task
      const inProgress = actions.updateTaskStatus(initial, taskId, "in_progress");
      expect(inProgress.tasks.find((t) => t.id === taskId)?.status).toBe("in_progress");

      // Step 2: Complete task
      const done = actions.updateTaskStatus(inProgress, taskId, "done");
      expect(done.tasks.find((t) => t.id === taskId)?.status).toBe("done");

      // Step 3: Reopen task
      const reopened = actions.updateTaskStatus(done, taskId, "todo");
      expect(reopened.tasks.find((t) => t.id === taskId)?.status).toBe("todo");
    });

    it("updates task properties and deletes a task", () => {
      const initial = createInitialUserState();
      const taskId = initial.tasks[0].id;

      const edited = actions.updateTask(initial, taskId, {
        title: "Updated Title for Task",
        priority: "low",
      });
      const found = edited.tasks.find((t) => t.id === taskId);
      expect(found?.title).toBe("Updated Title for Task");
      expect(found?.priority).toBe("low");

      const deleted = actions.deleteTask(edited, taskId);
      expect(deleted.tasks.find((t) => t.id === taskId)).toBeUndefined();
      expect(deleted.tasks.length).toBe(initial.tasks.length - 1);
    });

    it("persists tasks through mock localStorage round-trip", () => {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      };

      const initial = createInitialUserState();
      const updated = actions.addTask(initial, {
        title: "Persisted Task",
        courseCode: "MS2001",
        status: "in_progress",
        priority: "medium",
      });

      saveUserState(updated, mockStorage);
      const loaded = loadUserState(mockStorage);

      expect(loaded.tasks.length).toBe(updated.tasks.length);
      const persisted = loaded.tasks.find((t) => t.title === "Persisted Task");
      expect(persisted).toBeDefined();
      expect(persisted?.status).toBe("in_progress");
      expect(persisted?.courseCode).toBe("MS2001");
    });
  });

  describe("Agenda Calendar Events & Query Invariants", () => {
    it("contains complete canonical events dataset", () => {
      expect(CANONICAL_EVENTS.length).toBeGreaterThan(20);
    });

    it("accurately identifies all hard eligibility cutoffs", () => {
      const hardCutoffs = getHardCutoffs();
      expect(hardCutoffs.length).toBeGreaterThanOrEqual(4);

      const q1Cutoff = hardCutoffs.find((e) => e.id === "cutoff_week_04");
      expect(q1Cutoff).toBeDefined();
      expect(q1Cutoff?.hardCutoff).toBe(true);

      const se2001OppeCutoff = hardCutoffs.find((e) => e.id === "cutoff_se2001_oppe");
      expect(se2001OppeCutoff).toBeDefined();
      expect(se2001OppeCutoff?.courseCode).toBe("SE2001");

      const endTermCutoff = hardCutoffs.find((e) => e.id === "cutoff_week_07");
      expect(endTermCutoff).toBeDefined();
    });

    it("properly attributes source metadata to every canonical event", () => {
      for (const event of CANONICAL_EVENTS) {
        expect(event.source).toBeDefined();
        expect(event.source.documentName).toBeDefined();
        expect(event.source.term).toBe("September 2026");
      }
    });
  });

  describe("Markdown Document Content & Reader Integration", () => {
    it("registers all 7 reference documents in the manifest", () => {
      expect(REFERENCE_DOCUMENTS.length).toBe(7);
      const docIds = REFERENCE_DOCUMENTS.map((d) => d.id);
      expect(docIds).toContain("grading-policy");
      expect(docIds).toContain("mad2-project-viva");
      expect(docIds).toContain("viva-preparation");
      expect(docIds).toContain("trekking-management-app");
      expect(docIds).toContain("examination-management-portal");
      expect(docIds).toContain("git-helper-appdev");
      expect(docIds).toContain("tma-v2-milestones");
    });

    it("verifies all raw markdown strings are non-empty and correctly imported", () => {
      expect(gradingPolicyRaw.length).toBeGreaterThan(1000);
      expect(mad2ProjectVivaRaw.length).toBeGreaterThan(1000);
      expect(vivaPrepRaw.length).toBeGreaterThan(500);
      expect(trekkingAppRaw.length).toBeGreaterThan(1000);
    });

    it("parses raw markdown documents into valid HTML via marked", () => {
      const gradingHtml = marked.parse(gradingPolicyRaw) as string;
      expect(gradingHtml).toContain("System Compatibility Test");
      expect(gradingHtml).toContain("CS2005");

      const mad2Html = marked.parse(mad2ProjectVivaRaw) as string;
      expect(mad2Html).toContain("Level 1 Viva");
      expect(mad2Html).toContain("Level 2 Viva");

      const vivaHtml = marked.parse(vivaPrepRaw) as string;
      expect(vivaHtml).toContain("10-minute");

      const trekkingHtml = marked.parse(trekkingAppRaw) as string;
      expect(trekkingHtml).toContain("Flask");
      expect(trekkingHtml).toContain("Celery");
    });
  });
});
