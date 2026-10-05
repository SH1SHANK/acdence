import { describe, it, expect, beforeEach } from "vite-plus/test";
import {
  assessmentRecordToDb,
  dbToAssessmentRecord,
  sctStatusToDb,
  projectStateToDb,
  dbToProjectState,
  vivaItemToDb,
  semesterTaskToDb,
  dbToSemesterTask,
  userSettingsToDb,
  remoteDataToUserState,
} from "@/lib/sync/mappers";
import {
  reconcileAssessmentRecords,
  reconcileSemesterTasks,
  reconcileFullState,
  compareTimestamps,
} from "@/lib/sync/reconciliation";
import { enqueueDirtyRecord, getDirtyQueue, clearDirtyQueue } from "@/lib/sync/repository";
import type { DbAssessmentRecord, DbSemesterTask, RemoteUserData } from "@/lib/sync/types";
import { createInitialUserState } from "@/lib/persistence";
import type { AssessmentRecord } from "@/types/assessment";
import type { SemesterTask, PersistedUserState } from "@/types/state";

describe("Phase 2: Sync Engine & Mapping Layer", () => {
  const TEST_USER_ID = "11111111-2222-3333-4444-555555555555";

  beforeEach(() => {
    clearDirtyQueue();
  });

  describe("Data Mappers (Frontend <-> Supabase DTOs)", () => {
    it("maps AssessmentRecord to DB DTO and back accurately", () => {
      const record: AssessmentRecord = {
        assessmentId: "cs2005_grpa_02",
        status: "present",
        score: 95.5,
        submissionDate: "2026-10-15T10:00:00.000Z",
      };

      const dbDto = assessmentRecordToDb(record, TEST_USER_ID, "2026-10-15T12:00:00.000Z");

      expect(dbDto.user_id).toBe(TEST_USER_ID);
      expect(dbDto.assessment_id).toBe("cs2005_grpa_02");
      expect(dbDto.status).toBe("present");
      expect(dbDto.score).toBe(95.5);
      expect(dbDto.submission_date).toBe("2026-10-15T10:00:00.000Z");
      expect(dbDto.updated_at).toBe("2026-10-15T12:00:00.000Z");

      const roundTrip = dbToAssessmentRecord({
        ...dbDto,
        id: "rec-uuid",
      });

      expect(roundTrip).toEqual(record);
    });

    it("coerces pending assessment score to null in DB mapping", () => {
      const pendingRecord: AssessmentRecord = {
        assessmentId: "cs2005_quiz_01",
        status: "pending",
        score: 80, // dirty score should be coerced to null
      };

      const dbDto = assessmentRecordToDb(pendingRecord, TEST_USER_ID);
      expect(dbDto.score).toBeNull();
      expect(dbDto.status).toBe("pending");
    });

    it("maps SCT status to DB DTO", () => {
      const dbDto = sctStatusToDb("CS2005", "passed", TEST_USER_ID, "2026-10-15T12:00:00.000Z");
      expect(dbDto.user_id).toBe(TEST_USER_ID);
      expect(dbDto.course_code).toBe("CS2005");
      expect(dbDto.status).toBe("passed");
      expect(dbDto.updated_at).toBe("2026-10-15T12:00:00.000Z");
    });

    it("maps ProjectUserState to DB DTO and back", () => {
      const projectState = {
        track: "theory_completed_prior" as const,
        completedStageIds: ["git_tracker" as const, "development" as const],
        checkedRequirements: ["req_vue", "req_celery"],
        l1Score: 85,
        l2Score: 90,
        submissionUrl: "https://github.com/test/repo",
      };

      const dbDto = projectStateToDb(projectState, TEST_USER_ID, "2026-10-15T12:00:00.000Z");
      expect(dbDto.user_id).toBe(TEST_USER_ID);
      expect(dbDto.track).toBe("theory_completed_prior");
      expect(dbDto.completed_stage_ids).toEqual(["git_tracker", "development"]);
      expect(dbDto.checked_requirements).toEqual(["req_vue", "req_celery"]);
      expect(dbDto.l1_score).toBe(85);
      expect(dbDto.l2_score).toBe(90);
      expect(dbDto.submission_url).toBe("https://github.com/test/repo");

      const roundTrip = dbToProjectState({
        ...dbDto,
        id: "proj-uuid",
      });
      expect(roundTrip).toEqual(projectState);
    });

    it("maps Viva checklist item to DB DTO", () => {
      const dbDto = vivaItemToDb("viva_cam_mic", true, TEST_USER_ID, "2026-10-15T12:00:00.000Z");
      expect(dbDto.user_id).toBe(TEST_USER_ID);
      expect(dbDto.item_id).toBe("viva_cam_mic");
      expect(dbDto.is_checked).toBe(true);
    });

    it("maps SemesterTask to DB DTO and preserves client_task_id", () => {
      const task: SemesterTask = {
        id: "task_custom_123",
        title: "Study Chapter 4",
        description: "Review Java Generics",
        courseCode: "CS2005",
        status: "in_progress",
        priority: "high",
        dueDate: "2026-10-25",
        createdAt: "2026-10-15T08:00:00.000Z",
      };

      const dbDto = semesterTaskToDb(task, TEST_USER_ID, "2026-10-15T12:00:00.000Z");
      expect(dbDto.user_id).toBe(TEST_USER_ID);
      expect(dbDto.client_task_id).toBe("task_custom_123");
      expect(dbDto.title).toBe("Study Chapter 4");
      expect(dbDto.status).toBe("in_progress");
      expect(dbDto.priority).toBe("high");

      const roundTrip = dbToSemesterTask({
        ...dbDto,
        id: "server-uuid-999",
      });
      expect(roundTrip).toEqual(task);
    });

    it("maps UserSettings to DB DTO", () => {
      const state: PersistedUserState = {
        ...createInitialUserState(),
        notes: { CS2005: "Important formula notes" },
        githubRepo: {
          url: "https://github.com/user/mad2",
          owner: "user",
          name: "mad2",
          token: "secret_local_token", // strictly local token
        },
      };

      const dbDto = userSettingsToDb(state, TEST_USER_ID, "2026-10-15T12:00:00.000Z");
      expect(dbDto.id).toBe(TEST_USER_ID);
      expect(dbDto.notes).toEqual({ CS2005: "Important formula notes" });
      expect(dbDto.github_repo_url).toBe("https://github.com/user/mad2");
      // Notice: token is NOT included in dbDto
      expect("token" in dbDto).toBe(false);
    });
  });

  describe("Reconciliation & Last-Write-Wins (LWW)", () => {
    it("compares ISO timestamps deterministically", () => {
      expect(
        compareTimestamps("2026-10-15T12:00:00.000Z", "2026-10-15T10:00:00.000Z"),
      ).toBeGreaterThan(0);
      expect(
        compareTimestamps("2026-10-15T10:00:00.000Z", "2026-10-15T12:00:00.000Z"),
      ).toBeLessThan(0);
      expect(compareTimestamps("2026-10-15T12:00:00.000Z", "2026-10-15T12:00:00.000Z")).toBe(0);
    });

    it("remote-newer wins when remote timestamp is newer", () => {
      const localRecords: Record<string, AssessmentRecord> = {
        cs2005_grpa_02: {
          assessmentId: "cs2005_grpa_02",
          status: "present",
          score: 80,
        },
      };

      const remoteRows: DbAssessmentRecord[] = [
        {
          id: "r1",
          user_id: TEST_USER_ID,
          assessment_id: "cs2005_grpa_02",
          status: "present",
          score: 95,
          submission_date: null,
          updated_at: "2026-10-16T12:00:00.000Z", // newer than local
        },
      ];

      const { merged, remoteNewerApplied, localNewerRecords } = reconcileAssessmentRecords(
        localRecords,
        "2026-10-15T12:00:00.000Z", // local is older
        remoteRows,
      );

      expect(remoteNewerApplied).toBe(true);
      expect(merged.cs2005_grpa_02.score).toBe(95);
      expect(localNewerRecords).toHaveLength(0);
    });

    it("local-newer wins when local timestamp is newer", () => {
      const localRecords: Record<string, AssessmentRecord> = {
        cs2005_grpa_02: {
          assessmentId: "cs2005_grpa_02",
          status: "present",
          score: 100, // local edit
        },
      };

      const remoteRows: DbAssessmentRecord[] = [
        {
          id: "r1",
          user_id: TEST_USER_ID,
          assessment_id: "cs2005_grpa_02",
          status: "present",
          score: 85,
          submission_date: null,
          updated_at: "2026-10-14T12:00:00.000Z", // older than local
        },
      ];

      const { merged, remoteNewerApplied, localNewerRecords } = reconcileAssessmentRecords(
        localRecords,
        "2026-10-15T12:00:00.000Z", // local is newer
        remoteRows,
      );

      expect(remoteNewerApplied).toBe(false);
      expect(merged.cs2005_grpa_02.score).toBe(100);
      expect(localNewerRecords).toHaveLength(1);
      expect(localNewerRecords[0].score).toBe(100);
    });

    it("equal timestamps result in a no-op", () => {
      const localRecords: Record<string, AssessmentRecord> = {
        cs2005_grpa_02: {
          assessmentId: "cs2005_grpa_02",
          status: "present",
          score: 90,
        },
      };

      const remoteRows: DbAssessmentRecord[] = [
        {
          id: "r1",
          user_id: TEST_USER_ID,
          assessment_id: "cs2005_grpa_02",
          status: "present",
          score: 90,
          submission_date: null,
          updated_at: "2026-10-15T12:00:00.000Z",
        },
      ];

      const { merged, remoteNewerApplied, localNewerRecords } = reconcileAssessmentRecords(
        localRecords,
        "2026-10-15T12:00:00.000Z",
        remoteRows,
      );

      expect(remoteNewerApplied).toBe(false);
      expect(merged.cs2005_grpa_02.score).toBe(90);
      expect(localNewerRecords).toHaveLength(0);
    });

    it("reconciles tasks with Last-Write-Wins and detects remote additions", () => {
      const localTasks: SemesterTask[] = [
        {
          id: "task_local_1",
          title: "Local Task",
          status: "todo",
          priority: "medium",
          dueDate: "2026-10-30",
          createdAt: "2026-10-15T10:00:00.000Z",
        },
      ];

      const remoteRows: DbSemesterTask[] = [
        {
          id: "r-task-uuid",
          user_id: TEST_USER_ID,
          client_task_id: "task_cloud_added",
          title: "Remote Task",
          description: "Created on mobile",
          course_code: "CS2005",
          status: "done",
          priority: "high",
          due_date: "2026-11-01",
          created_at: "2026-10-15T11:00:00.000Z",
          updated_at: "2026-10-15T11:00:00.000Z",
        },
      ];

      const { merged, remoteNewerApplied, localNewerTasks } = reconcileSemesterTasks(
        localTasks,
        remoteRows,
      );

      expect(remoteNewerApplied).toBe(true);
      expect(merged).toHaveLength(2);
      expect(merged.some((t) => t.id === "task_cloud_added")).toBe(true);
      expect(localNewerTasks).toHaveLength(1);
      expect(localNewerTasks[0].id).toBe("task_local_1");
    });

    it("hydrates a full user state from remote data snapshot via remoteDataToUserState", () => {
      const remoteData: RemoteUserData = {
        settings: {
          id: TEST_USER_ID,
          notes: { CS2005: "Java memory model notes" },
          github_repo_url: "https://github.com/test/repo",
          github_repo_owner: "test",
          github_repo_name: "repo",
          github_last_synced_at: null,
          created_at: "2026-10-15T00:00:00.000Z",
          updated_at: "2026-10-15T12:00:00.000Z",
        },
        assessments: [
          {
            id: "a1",
            user_id: TEST_USER_ID,
            assessment_id: "cs2005_quiz_01",
            status: "present",
            score: 92,
            submission_date: null,
            updated_at: "2026-10-15T12:00:00.000Z",
          },
        ],
        sct: [
          {
            id: "s1",
            user_id: TEST_USER_ID,
            course_code: "CS2005",
            status: "passed",
            updated_at: "2026-10-15T12:00:00.000Z",
          },
        ],
        project: null,
        viva: [],
        tasks: [],
      };

      const hydrated = remoteDataToUserState(remoteData);
      expect(hydrated.assessmentRecords.cs2005_quiz_01.score).toBe(92);
      expect(hydrated.sctStatus.CS2005).toBe("passed");
      expect(hydrated.notes?.CS2005).toBe("Java memory model notes");
      expect(hydrated.githubRepo?.name).toBe("repo");
    });

    it("reconciles full application state cleanly across all entities", () => {
      const local = createInitialUserState();
      local.updatedAt = "2026-10-15T10:00:00.000Z";

      const remoteData: RemoteUserData = {
        settings: {
          id: TEST_USER_ID,
          notes: { SE2001: "Bash pipes tips" },
          github_repo_url: "https://github.com/user/app",
          github_repo_owner: "user",
          github_repo_name: "app",
          github_last_synced_at: null,
          created_at: "2026-10-15T00:00:00.000Z",
          updated_at: "2026-10-15T12:00:00.000Z", // newer
        },
        assessments: [
          {
            id: "a1",
            user_id: TEST_USER_ID,
            assessment_id: "se2001_ga_01",
            status: "present",
            score: 100,
            submission_date: null,
            updated_at: "2026-10-15T12:00:00.000Z", // newer
          },
        ],
        sct: [
          {
            id: "s1",
            user_id: TEST_USER_ID,
            course_code: "CS2005",
            status: "passed",
            updated_at: "2026-10-15T12:00:00.000Z", // newer
          },
        ],
        project: {
          id: "p1",
          user_id: TEST_USER_ID,
          track: "theory_completed_prior",
          completed_stage_ids: ["git_tracker"],
          checked_requirements: ["req_vue"],
          l1_score: 90,
          l2_score: null,
          submission_url: null,
          updated_at: "2026-10-15T12:00:00.000Z", // newer
        },
        viva: [
          {
            id: "v1",
            user_id: TEST_USER_ID,
            item_id: "viva_cam_mic",
            is_checked: true,
            updated_at: "2026-10-15T12:00:00.000Z", // newer
          },
        ],
        tasks: [
          {
            id: "t1",
            user_id: TEST_USER_ID,
            client_task_id: "task_cloud_1",
            title: "Task from Mobile Device",
            description: null,
            course_code: "CS2005",
            status: "todo",
            priority: "high",
            due_date: "2026-10-20",
            created_at: "2026-10-15T11:00:00.000Z",
            updated_at: "2026-10-15T12:00:00.000Z",
          },
        ],
      };

      const result = reconcileFullState(local, remoteData);

      expect(result.hasRemoteChangesApplied).toBe(true);
      expect(result.mergedState.assessmentRecords.se2001_ga_01.score).toBe(100);
      expect(result.mergedState.sctStatus.CS2005).toBe("passed");
      expect(result.mergedState.projectState.track).toBe("theory_completed_prior");
      expect(result.mergedState.vivaChecklistState.viva_cam_mic).toBe(true);
      expect(result.mergedState.tasks.some((t) => t.id === "task_cloud_1")).toBe(true);
      expect(result.mergedState.notes?.SE2001).toBe("Bash pipes tips");
      expect(result.mergedState.updatedAt).toBe("2026-10-15T12:00:00.000Z");
    });
  });

  describe("Offline Dirty Queue Behavior", () => {
    it("enqueues dirty items and deduplicates repeated mutations", () => {
      expect(getDirtyQueue()).toHaveLength(0);

      enqueueDirtyRecord({
        type: "assessment",
        id: "cs2005_grpa_02",
        timestamp: "2026-10-15T10:00:00.000Z",
      });

      expect(getDirtyQueue()).toHaveLength(1);

      // Re-enqueuing the same record updates timestamp and deduplicates
      enqueueDirtyRecord({
        type: "assessment",
        id: "cs2005_grpa_02",
        timestamp: "2026-10-15T10:05:00.000Z",
      });

      const queue = getDirtyQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].timestamp).toBe("2026-10-15T10:05:00.000Z");

      // Enqueueing different record appends to queue
      enqueueDirtyRecord({
        type: "task",
        id: "task_1",
        timestamp: "2026-10-15T10:06:00.000Z",
      });

      expect(getDirtyQueue()).toHaveLength(2);

      clearDirtyQueue();
      expect(getDirtyQueue()).toHaveLength(0);
    });
  });
});
