import type {
  PersistedUserState,
  SctStatus,
  SemesterTask,
  GitHubRepoReference,
} from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";
import { VIVA_CHECKLIST } from "@/data/viva";

export const STORAGE_KEY = "iitm_sep2026_user_state";
export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_TASKS: SemesterTask[] = [
  {
    id: "task_sct_registration",
    title: "Complete OPPE System Compatibility Test (SCT) Window 1",
    description:
      "Mandatory precondition for taking CS2005 & SE2001 programming exams. Window 1 closes Oct 30.",
    courseCode: "CS2005",
    status: "todo",
    priority: "high",
    dueDate: "2026-10-30",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "task_git_tracker_repo",
    title: "Register CS2006P GitHub Repo on Git Tracker",
    description: "Add AppDev team as collaborators before milestone deadline.",
    courseCode: "CS2006P",
    status: "todo",
    priority: "high",
    dueDate: "2026-10-25",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "task_bpt1_prep",
    title: "Prepare & Submit SE2001 BPT 1",
    description: "Biweekly programming test required for OPPE eligibility calculation.",
    courseCode: "SE2001",
    status: "todo",
    priority: "medium",
    dueDate: "2026-10-23",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "task_setup_redis_celery",
    title: "Install Redis & Celery locally for TMA V2",
    description: "Verify local worker and scheduled beat jobs run without errors.",
    courseCode: "CS2006P",
    status: "todo",
    priority: "medium",
    dueDate: "2026-11-01",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
];

export function createInitialUserState(): PersistedUserState {
  const assessmentRecords: Record<string, AssessmentRecord> = {};
  for (const def of ASSESSMENT_DEFINITIONS) {
    assessmentRecords[def.id] = {
      assessmentId: def.id,
      status: "pending",
      score: null,
    };
  }

  const sctStatus: Record<CourseCode, SctStatus> = {
    CS2005: "pending",
    SE2001: "pending",
    CS2006: "pending",
    CS2006P: "pending",
    MS2001: "pending",
  };

  const vivaChecklistState: Record<string, boolean> = {};
  for (const item of VIVA_CHECKLIST) {
    vivaChecklistState[item.id] = false;
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    assessmentRecords,
    sctStatus,
    projectState: {
      track: null, // explicit user state, no auto-defaulting
      completedStageIds: [],
      checkedRequirements: [],
      l1Score: null,
      l2Score: null,
    },
    vivaChecklistState,
    tasks: [...DEFAULT_TASKS],
    notes: {},
    githubRepo: null,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeGithubRepo(repo: unknown): GitHubRepoReference | null {
  if (
    !repo ||
    typeof repo !== "object" ||
    !("owner" in repo) ||
    !("name" in repo) ||
    !("url" in repo)
  ) {
    return null;
  }
  const r = repo as Record<string, unknown>;
  if (
    typeof r.owner !== "string" ||
    !r.owner.trim() ||
    typeof r.name !== "string" ||
    !r.name.trim() ||
    typeof r.url !== "string" ||
    !r.url.trim()
  ) {
    return null;
  }
  return {
    owner: r.owner.trim(),
    name: r.name.trim(),
    url: r.url.trim(),
    lastSyncedAt: typeof r.lastSyncedAt === "string" ? r.lastSyncedAt : undefined,
    token: typeof r.token === "string" ? r.token : undefined,
  };
}

export function isValidAssessmentRecord(r: unknown): r is AssessmentRecord {
  if (!r || typeof r !== "object") return false;
  const rec = r as Record<string, unknown>;
  const validStatuses: readonly string[] = ["pending", "present", "absent"];
  return (
    typeof rec.assessmentId === "string" &&
    (rec.score === null || typeof rec.score === "number") &&
    typeof rec.status === "string" &&
    validStatuses.includes(rec.status)
  );
}

export function sanitizeAssessmentRecords(raw: unknown): Record<string, AssessmentRecord> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, AssessmentRecord> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (isValidAssessmentRecord(val)) {
      result[key] = val;
    }
  }
  return result;
}

export function sanitizeSctStatus(raw: unknown): Record<CourseCode, SctStatus> {
  const initial = createInitialUserState().sctStatus;
  if (!raw || typeof raw !== "object") return initial;
  const validSct: readonly string[] = ["pending", "passed", "failed"];
  const result: Record<CourseCode, SctStatus> = { ...initial };
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (key in result && typeof val === "string" && validSct.includes(val)) {
      result[key as CourseCode] = val as SctStatus;
    }
  }
  return result;
}

function migrateState(rawState: Record<string, unknown>): PersistedUserState {
  const initial = createInitialUserState();
  const rawAssessments = sanitizeAssessmentRecords(rawState.assessmentRecords);
  const rawSct = sanitizeSctStatus(rawState.sctStatus);
  const rawProject = (rawState.projectState || {}) as Record<string, unknown>;
  const rawViva = (rawState.vivaChecklistState || {}) as Record<string, boolean>;
  const rawTasks = Array.isArray(rawState.tasks)
    ? (rawState.tasks as SemesterTask[])
    : initial.tasks;
  const rawGithub = sanitizeGithubRepo(rawState.githubRepo);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    assessmentRecords: {
      ...initial.assessmentRecords,
      ...rawAssessments,
    },
    sctStatus: {
      ...initial.sctStatus,
      ...rawSct,
    },
    projectState: {
      ...initial.projectState,
      ...rawProject,
    },
    vivaChecklistState: {
      ...initial.vivaChecklistState,
      ...rawViva,
    },
    tasks: rawTasks,
    notes: (rawState.notes as Record<string, string>) || {},
    githubRepo: rawGithub,
    updatedAt:
      typeof rawState.updatedAt === "string" ? rawState.updatedAt : new Date().toISOString(),
  };
}

export function loadUserState(
  customStorage?: Pick<Storage, "getItem" | "setItem">,
): PersistedUserState {
  const storage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);

  if (!storage) {
    return createInitialUserState();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialUserState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return createInitialUserState();
    }
    return migrateState(parsed);
  } catch (e) {
    console.error("Failed to load user state from localStorage:", e);
    return createInitialUserState();
  }
}

export function saveUserState(
  state: PersistedUserState,
  customStorage?: Pick<Storage, "getItem" | "setItem">,
): boolean {
  const storage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);

  if (!storage) return false;

  try {
    // Sanitize state to ensure no derived metrics leak into storage
    const sanitized: PersistedUserState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      assessmentRecords: {},
      sctStatus: state.sctStatus,
      projectState: {
        track: state.projectState.track,
        completedStageIds: [...state.projectState.completedStageIds],
        checkedRequirements: [...state.projectState.checkedRequirements],
        l1Score: state.projectState.l1Score,
        l2Score: state.projectState.l2Score,
        submissionUrl: state.projectState.submissionUrl,
      },
      vivaChecklistState: { ...state.vivaChecklistState },
      tasks: Array.isArray(state.tasks) ? state.tasks.map((t) => ({ ...t })) : [],
      notes: state.notes ? { ...state.notes } : {},
      githubRepo: sanitizeGithubRepo(state.githubRepo),
      updatedAt: new Date().toISOString(),
    };

    // Only copy valid raw record fields
    for (const [id, record] of Object.entries(state.assessmentRecords)) {
      sanitized.assessmentRecords[id] = {
        assessmentId: record.assessmentId,
        status: record.status,
        score: record.status === "pending" ? null : record.score,
        submissionDate: record.submissionDate,
      };
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (e) {
    console.error("Failed to save user state to localStorage:", e);
    return false;
  }
}

export function resetUserState(
  customStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): PersistedUserState {
  const storage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);

  if (storage && typeof storage.removeItem === "function") {
    storage.removeItem(STORAGE_KEY);
  }

  const initial = createInitialUserState();
  if (storage) {
    saveUserState(initial, storage);
  }
  return initial;
}

export function exportStateAsJson(state: PersistedUserState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(jsonString: string): PersistedUserState {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON format for user state import.");
  }
  return migrateState(parsed);
}
