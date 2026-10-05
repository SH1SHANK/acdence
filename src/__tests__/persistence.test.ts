import { describe, it, expect, beforeEach } from "vite-plus/test";
import {
  createInitialUserState,
  loadUserState,
  saveUserState,
  resetUserState,
  exportStateAsJson,
  importStateFromJson,
  CURRENT_SCHEMA_VERSION,
} from "@/lib/persistence";
import { validateStateIntegrity } from "@/lib/validation";

class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("Local Persistence & Invariant Integrity", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it("creates a clean initial state with zero derived metrics", () => {
    const state = createInitialUserState();
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.projectState.track).toBeNull();

    // Invariant checks:
    for (const record of Object.values(state.assessmentRecords)) {
      expect(record.status).toBe("pending");
      expect(record.score).toBeNull();
    }

    const validation = validateStateIntegrity(state);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("persists only raw inputs and never leaks derived metrics (T, GAA, eligibility)", () => {
    const state = createInitialUserState();
    state.assessmentRecords["cs2005_quiz_01"] = {
      assessmentId: "cs2005_quiz_01",
      status: "present",
      score: 85,
    };

    // Try to attach derived properties maliciously to test sanitization
    // @ts-expect-error derived injection test
    state.totalScore = 85;
    // @ts-expect-error derived injection test
    state.letterGrade = "A";

    saveUserState(state, mockStorage);
    const rawStored = mockStorage.getItem("iitm_sep2026_user_state");
    expect(rawStored).not.toBeNull();

    const parsed = JSON.parse(rawStored!);
    expect(parsed.totalScore).toBeUndefined();
    expect(parsed.letterGrade).toBeUndefined();
    expect(parsed.assessmentRecords["cs2005_quiz_01"].score).toBe(85);
  });

  it("safely migrates unversioned legacy state to current schemaVersion", () => {
    const legacyState = {
      assessmentRecords: {
        cs2005_quiz_01: {
          assessmentId: "cs2005_quiz_01",
          status: "present",
          score: 90,
        },
      },
      sctStatus: { CS2005: "passed" },
      projectState: { track: "theory_completed_prior" },
    };
    mockStorage.setItem("iitm_sep2026_user_state", JSON.stringify(legacyState));

    const loaded = loadUserState(mockStorage);
    expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.sctStatus.CS2005).toBe("passed");
    expect(loaded.assessmentRecords["cs2005_quiz_01"].score).toBe(90);
    // Ensures missing fields from initial state are populated
    expect(loaded.assessmentRecords["se2001_quiz_01"]).toBeDefined();
  });

  it("resets state back to clean pending state", () => {
    const state = createInitialUserState();
    state.assessmentRecords["cs2005_quiz_01"] = {
      assessmentId: "cs2005_quiz_01",
      status: "present",
      score: 85,
    };
    saveUserState(state, mockStorage);

    const resetState = resetUserState(mockStorage);
    expect(resetState.assessmentRecords["cs2005_quiz_01"].status).toBe("pending");
    expect(resetState.assessmentRecords["cs2005_quiz_01"].score).toBeNull();
  });

  it("exports and imports valid JSON state", () => {
    const state = createInitialUserState();
    state.sctStatus.CS2005 = "passed";
    state.projectState.track = "theory_registered_current";

    const json = exportStateAsJson(state);
    const imported = importStateFromJson(json);

    expect(imported.sctStatus.CS2005).toBe("passed");
    expect(imported.projectState.track).toBe("theory_registered_current");
    expect(validateStateIntegrity(imported).valid).toBe(true);
  });

  it("persists and restores connected GitHub repository reference", () => {
    const state = createInitialUserState();
    state.githubRepo = {
      url: "https://github.com/student/appdev2-project",
      owner: "student",
      name: "appdev2-project",
      lastSyncedAt: "2026-09-20T10:00:00.000Z",
    };

    saveUserState(state, mockStorage);
    const loaded = loadUserState(mockStorage);

    expect(loaded.githubRepo).toBeDefined();
    expect(loaded.githubRepo?.name).toBe("appdev2-project");
    expect(loaded.githubRepo?.owner).toBe("student");
    expect(loaded.githubRepo?.url).toBe("https://github.com/student/appdev2-project");
  });

  it("safely sanitizes malformed or corrupt githubRepo data to null", () => {
    // 1. Non-object string in storage
    mockStorage.setItem(
      "iitm_sep2026_user_state",
      JSON.stringify({
        schemaVersion: 1,
        githubRepo: "corrupt_string_value",
      }),
    );
    let loaded = loadUserState(mockStorage);
    expect(loaded.githubRepo).toBeNull();

    // 2. Partial/incomplete object missing required fields
    mockStorage.setItem(
      "iitm_sep2026_user_state",
      JSON.stringify({
        schemaVersion: 1,
        githubRepo: { owner: "student" }, // missing name and url
      }),
    );
    loaded = loadUserState(mockStorage);
    expect(loaded.githubRepo).toBeNull();

    // 3. Object with empty whitespace strings
    mockStorage.setItem(
      "iitm_sep2026_user_state",
      JSON.stringify({
        schemaVersion: 1,
        githubRepo: { owner: "   ", name: "repo", url: "https://github.com/..." },
      }),
    );
    loaded = loadUserState(mockStorage);
    expect(loaded.githubRepo).toBeNull();
  });
});
