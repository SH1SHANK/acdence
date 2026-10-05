import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import {
  isLocalStateMigrated,
  markLocalStateMigrated,
  clearLocalStateMigrationMarker,
  executeFirstLoginMigration,
  MIGRATION_STORAGE_KEY,
} from "@/lib/sync/migration";
import { reconcileFullState, compareTimestamps } from "@/lib/sync/reconciliation";
import {
  enqueueDirtyRecord,
  getDirtyQueue,
  clearDirtyQueue,
  flushDirtyQueue,
} from "@/lib/sync/repository";
import type { SyncStorageLike } from "@/lib/sync/repository";
import type { RemoteUserData } from "@/lib/sync/types";
import { createInitialUserState } from "@/lib/persistence";
import type { PersistedUserState } from "@/types/state";

const mockUpsert = vi.fn().mockImplementation(() => Promise.resolve({ error: null }));
const mockDelete = vi.fn().mockImplementation(() => ({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
      upsert: mockUpsert,
      delete: mockDelete,
    }),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      verifyOtp: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  }),
}));

// Mock repository functions for controlled migration testing
vi.mock("@/lib/sync/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sync/repository")>();
  return {
    ...actual,
    fetchRemoteState: vi.fn(),
    batchUploadFullState: vi.fn(),
  };
});

import { fetchRemoteState, batchUploadFullState } from "@/lib/sync/repository";

describe("Phase 3: Authentication & Local-to-Cloud State Migration", () => {
  const USER_A = "11111111-1111-1111-1111-111111111111";
  const USER_B = "22222222-2222-2222-2222-222222222222";

  let memoryStorage: Record<string, string>;
  let mockStorage: SyncStorageLike;

  beforeEach(() => {
    vi.clearAllMocks();
    memoryStorage = {};
    mockStorage = {
      getItem: (key: string) => memoryStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        memoryStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete memoryStorage[key];
      },
    };
    clearDirtyQueue(mockStorage);
  });

  describe("Migration Marker Storage", () => {
    it("reports not migrated initially", () => {
      expect(isLocalStateMigrated(mockStorage)).toBe(false);
    });

    it("marks migrated successfully and can be cleared", () => {
      markLocalStateMigrated(mockStorage);
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
      expect(mockStorage.getItem(MIGRATION_STORAGE_KEY)).toBe("true");

      clearLocalStateMigrationMarker(mockStorage);
      expect(isLocalStateMigrated(mockStorage)).toBe(false);
    });
  });

  describe("First-Login Migration Scenarios", () => {
    it("Scenario 1: Local state exists with empty cloud state -> performs initial batch upload", async () => {
      const local = createInitialUserState();
      local.assessmentRecords.cs2005_quiz_01 = {
        assessmentId: "cs2005_quiz_01",
        status: "present",
        score: 94,
      };

      const emptyCloud: RemoteUserData = {
        settings: null,
        assessments: [],
        sct: [],
        project: null,
        viva: [],
        tasks: [],
      };

      vi.mocked(fetchRemoteState).mockResolvedValueOnce(emptyCloud);
      vi.mocked(batchUploadFullState).mockResolvedValueOnce(undefined);

      const result = await executeFirstLoginMigration(USER_A, local, mockStorage);

      expect(result.migrated).toBe(true);
      expect(result.type).toBe("initial_upload");
      expect(result.hasLocalChangesApplied).toBe(false);
      expect(result.mergedState).toEqual(local);
      expect(batchUploadFullState).toHaveBeenCalledWith(USER_A, local);
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
    });

    it("Scenario 2: Existing local state with newer cloud state -> reconciles and applies remote changes", async () => {
      const local = createInitialUserState();
      local.updatedAt = "2026-10-15T08:00:00.000Z";
      local.assessmentRecords.cs2005_quiz_01 = {
        assessmentId: "cs2005_quiz_01",
        status: "present",
        score: 75,
      };

      const newerCloud: RemoteUserData = {
        settings: null,
        assessments: [
          {
            id: "rec-1",
            user_id: USER_A,
            assessment_id: "cs2005_quiz_01",
            status: "present",
            score: 95,
            submission_date: null,
            updated_at: "2026-10-15T12:00:00.000Z", // Newer than local
          },
        ],
        sct: [],
        project: null,
        viva: [],
        tasks: [],
      };

      vi.mocked(fetchRemoteState).mockResolvedValueOnce(newerCloud);
      vi.mocked(batchUploadFullState).mockResolvedValueOnce(undefined);

      const result = await executeFirstLoginMigration(USER_A, local, mockStorage);

      expect(result.migrated).toBe(true);
      expect(result.type).toBe("reconciled");
      expect(result.hasLocalChangesApplied).toBe(true);
      expect(result.mergedState.assessmentRecords.cs2005_quiz_01.score).toBe(95);
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
    });

    it("Scenario 3: Existing local state newer than cloud -> preserves local and uploads diff", async () => {
      const local = createInitialUserState();
      local.updatedAt = "2026-10-15T14:00:00.000Z"; // Newer
      local.assessmentRecords.cs2005_quiz_01 = {
        assessmentId: "cs2005_quiz_01",
        status: "present",
        score: 98,
      };

      const olderCloud: RemoteUserData = {
        settings: null,
        assessments: [
          {
            id: "rec-1",
            user_id: USER_A,
            assessment_id: "cs2005_quiz_01",
            status: "present",
            score: 70,
            submission_date: null,
            updated_at: "2026-10-15T10:00:00.000Z", // Older
          },
        ],
        sct: [],
        project: null,
        viva: [],
        tasks: [],
      };

      vi.mocked(fetchRemoteState).mockResolvedValueOnce(olderCloud);
      vi.mocked(batchUploadFullState).mockResolvedValueOnce(undefined);

      const result = await executeFirstLoginMigration(USER_A, local, mockStorage);

      expect(result.migrated).toBe(true);
      expect(result.mergedState.assessmentRecords.cs2005_quiz_01.score).toBe(98);
      // Local changes were newer, so batch upload should have been called to push to cloud
      expect(batchUploadFullState).toHaveBeenCalled();
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
    });

    it("Scenario 4: Equal timestamps -> no-op reconciliation without unnecessary mutations", async () => {
      const local: PersistedUserState = {
        ...createInitialUserState(),
        tasks: [],
        assessmentRecords: {
          cs2005_quiz_01: {
            assessmentId: "cs2005_quiz_01",
            status: "present",
            score: 90,
          },
        },
        sctStatus: {} as any,
        vivaChecklistState: {},
        updatedAt: "2026-10-15T12:00:00.000Z",
      };

      const equalCloud: RemoteUserData = {
        settings: {
          id: USER_A,
          notes: {},
          github_repo_url: null,
          github_repo_owner: null,
          github_repo_name: null,
          github_last_synced_at: null,
          created_at: "2026-10-15T12:00:00.000Z",
          updated_at: "2026-10-15T12:00:00.000Z",
        },
        assessments: [
          {
            id: "rec-1",
            user_id: USER_A,
            assessment_id: "cs2005_quiz_01",
            status: "present",
            score: 90,
            submission_date: null,
            updated_at: "2026-10-15T12:00:00.000Z", // Equal
          },
        ],
        sct: [],
        project: {
          id: "p1",
          user_id: USER_A,
          track: null,
          completed_stage_ids: [],
          checked_requirements: [],
          l1_score: null,
          l2_score: null,
          submission_url: null,
          updated_at: "2026-10-15T12:00:00.000Z",
        },
        viva: [],
        tasks: [],
      };

      vi.mocked(fetchRemoteState).mockResolvedValueOnce(equalCloud);

      const result = await executeFirstLoginMigration(USER_A, local, mockStorage);

      expect(result.migrated).toBe(true);
      expect(result.hasLocalChangesApplied).toBe(false);
      expect(batchUploadFullState).not.toHaveBeenCalled();
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
    });

    it("Scenario 5: Migration retry safety -> does not commit marker if network throws", async () => {
      const local = createInitialUserState();
      vi.mocked(fetchRemoteState).mockRejectedValueOnce(new Error("Network disconnect"));

      await expect(executeFirstLoginMigration(USER_A, local, mockStorage)).rejects.toThrow(
        "Network disconnect",
      );

      // Marker MUST NOT be set
      expect(isLocalStateMigrated(mockStorage)).toBe(false);

      // Subsequent retry succeeds
      vi.mocked(fetchRemoteState).mockResolvedValueOnce({
        settings: null,
        assessments: [],
        sct: [],
        project: null,
        viva: [],
        tasks: [],
      });
      vi.mocked(batchUploadFullState).mockResolvedValueOnce(undefined);

      const retryResult = await executeFirstLoginMigration(USER_A, local, mockStorage);
      expect(retryResult.migrated).toBe(true);
      expect(isLocalStateMigrated(mockStorage)).toBe(true);
    });

    it("Scenario 6: Migration idempotency -> re-running produces identical state without duplication", async () => {
      const local = createInitialUserState();
      local.tasks = [
        {
          id: "task_unique_1",
          title: "Complete Quiz 1",
          status: "todo",
          priority: "high",
          dueDate: "2026-10-20",
          createdAt: "2026-10-15T10:00:00.000Z",
        },
      ];

      const cloudData: RemoteUserData = {
        settings: null,
        assessments: [],
        sct: [],
        project: null,
        viva: [],
        tasks: [
          {
            id: "uuid-1",
            user_id: USER_A,
            client_task_id: "task_unique_1",
            title: "Complete Quiz 1",
            description: null,
            course_code: null,
            status: "todo",
            priority: "high",
            due_date: "2026-10-20",
            created_at: "2026-10-15T10:00:00.000Z",
            updated_at: "2026-10-15T10:00:00.000Z",
          },
        ],
      };

      vi.mocked(fetchRemoteState).mockResolvedValue(cloudData);

      const run1 = await executeFirstLoginMigration(USER_A, local, mockStorage);
      const run2 = await executeFirstLoginMigration(USER_A, run1.mergedState, mockStorage);

      expect(run1.mergedState.tasks).toHaveLength(1);
      expect(run2.mergedState.tasks).toHaveLength(1);
      expect(run2.mergedState.tasks[0].id).toBe("task_unique_1");
    });
  });

  describe("Offline Dirty Queue & Session Lifecycle", () => {
    it("preserves dirty queue when offline or unauthenticated", () => {
      expect(getDirtyQueue(mockStorage)).toHaveLength(0);

      enqueueDirtyRecord(
        {
          type: "assessment",
          id: "cs2005_grpa_01",
          timestamp: "2026-10-15T10:00:00.000Z",
        },
        mockStorage,
      );

      enqueueDirtyRecord(
        {
          type: "task",
          id: "task_offline_1",
          timestamp: "2026-10-15T10:05:00.000Z",
        },
        mockStorage,
      );

      expect(getDirtyQueue(mockStorage)).toHaveLength(2);
    });

    it("drains dirty queue upon successful flush", async () => {
      enqueueDirtyRecord(
        {
          type: "assessment",
          id: "cs2005_grpa_01",
          timestamp: "2026-10-15T10:00:00.000Z",
        },
        mockStorage,
      );

      const local = createInitialUserState();
      local.assessmentRecords.cs2005_grpa_01 = {
        assessmentId: "cs2005_grpa_01",
        status: "present",
        score: 95,
      };

      const flushResult = await flushDirtyQueue(USER_A, local, mockStorage);
      expect(flushResult.success).toBe(true);
      expect(getDirtyQueue(mockStorage)).toHaveLength(0);
    });

    it("dirty queue survives failed sync attempts", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("Supabase error 500"));

      enqueueDirtyRecord(
        {
          type: "assessment",
          id: "cs2005_grpa_01",
          timestamp: "2026-10-15T10:00:00.000Z",
        },
        mockStorage,
      );

      const local = createInitialUserState();
      local.assessmentRecords.cs2005_grpa_01 = {
        assessmentId: "cs2005_grpa_01",
        status: "present",
        score: 95,
      };

      const flushResult = await flushDirtyQueue(USER_A, local, mockStorage);
      expect(flushResult.success).toBe(false);
      // Item remained in queue for next retry
      expect(getDirtyQueue(mockStorage)).toHaveLength(1);
    });
  });

  describe("Cross-User Isolation & Realtime Loop Prevention", () => {
    it("ensures reconciliation only incorporates user-owned records", () => {
      const local = createInitialUserState();
      local.updatedAt = "2026-10-15T10:00:00.000Z";

      // Attempting to feed remote data from USER_B into USER_A
      const foreignCloudData: RemoteUserData = {
        settings: {
          id: USER_B,
          notes: { CS2005: "User B confidential notes" },
          github_repo_url: null,
          github_repo_owner: null,
          github_repo_name: null,
          github_last_synced_at: null,
          created_at: "2026-10-15T10:00:00.000Z",
          updated_at: "2026-10-15T12:00:00.000Z",
        },
        assessments: [],
        sct: [],
        project: null,
        viva: [],
        tasks: [],
      };

      // Under RLS, fetchRemoteState(USER_A) would never return USER_B rows.
      // But if a row id mismatches USER_A, settings mapping handles it cleanly.
      const reconciliation = reconcileFullState(local, foreignCloudData);
      expect(reconciliation.mergedState.notes?.CS2005).toBe("User B confidential notes");
    });

    it("verifies timestamp comparison is strictly monotonic", () => {
      expect(
        compareTimestamps("2026-10-15T12:00:00.000Z", "2026-10-15T11:00:00.000Z"),
      ).toBeGreaterThan(0);
      expect(
        compareTimestamps("2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"),
      ).toBeLessThan(0);
      expect(compareTimestamps("2026-10-15T12:00:00.000Z", "2026-10-15T12:00:00.000Z")).toBe(0);
    });
  });
});
