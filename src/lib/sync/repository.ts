import { getSupabase } from "@/lib/supabase";
import type { PersistedUserState, SctStatus, SemesterTask, ProjectUserState } from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type {
  RemoteUserData,
  DbAssessmentRecord,
  DbSctStatus,
  DbProjectState,
  DbVivaChecklist,
  DbSemesterTask,
  DbUserSettings,
  DirtyRecord,
} from "./types";
import {
  assessmentRecordToDb,
  sctStatusToDb,
  projectStateToDb,
  vivaItemToDb,
  semesterTaskToDb,
  userSettingsToDb,
} from "./mappers";

const DIRTY_QUEUE_KEY = "acdence_pending_sync_queue";

// =========================================================================
// Offline Dirty Queue (LocalStorage Persistence with Memory Fallback)
// =========================================================================

export type SyncStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let fallbackMemoryQueueStorage: Record<string, string> = {};

function resolveSyncStorage(customStorage?: SyncStorageLike): SyncStorageLike {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => fallbackMemoryQueueStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      fallbackMemoryQueueStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete fallbackMemoryQueueStorage[key];
    },
  };
}

export function getDirtyQueue(customStorage?: SyncStorageLike): DirtyRecord[] {
  try {
    const storage = resolveSyncStorage(customStorage);
    const raw = storage.getItem(DIRTY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDirtyQueue(queue: DirtyRecord[], customStorage?: SyncStorageLike): void {
  try {
    const storage = resolveSyncStorage(customStorage);
    storage.setItem(DIRTY_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors
  }
}

export function enqueueDirtyRecord(record: DirtyRecord, customStorage?: SyncStorageLike): void {
  const current = getDirtyQueue(customStorage);
  // Filter out any existing item with the same type and ID to deduplicate
  const filtered = current.filter((item) => !(item.type === record.type && item.id === record.id));
  filtered.push(record);
  saveDirtyQueue(filtered, customStorage);
}

export function clearDirtyQueue(customStorage?: SyncStorageLike): void {
  try {
    const storage = resolveSyncStorage(customStorage);
    storage.removeItem(DIRTY_QUEUE_KEY);
  } catch {
    // Ignore errors
  }
}

// =========================================================================
// Remote Database Querying
// =========================================================================

export async function fetchRemoteState(userId: string): Promise<RemoteUserData> {
  const supabase = getSupabase();

  const [assessmentsRes, sctRes, projectRes, vivaRes, tasksRes, settingsRes] = await Promise.all([
    supabase.from("assessment_records").select("*").eq("user_id", userId),
    supabase.from("sct_status").select("*").eq("user_id", userId),
    supabase.from("project_state").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("viva_checklist").select("*").eq("user_id", userId),
    supabase.from("semester_tasks").select("*").eq("user_id", userId),
    supabase.from("user_settings").select("*").eq("id", userId).maybeSingle(),
  ]);

  if (assessmentsRes.error) throw assessmentsRes.error;
  if (sctRes.error) throw sctRes.error;
  if (projectRes.error) throw projectRes.error;
  if (vivaRes.error) throw vivaRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (settingsRes.error) throw settingsRes.error;

  return {
    assessments: (assessmentsRes.data || []) as DbAssessmentRecord[],
    sct: (sctRes.data || []) as DbSctStatus[],
    project: (projectRes.data as DbProjectState | null) || null,
    viva: (vivaRes.data || []) as DbVivaChecklist[],
    tasks: (tasksRes.data || []) as DbSemesterTask[],
    settings: (settingsRes.data as DbUserSettings | null) || null,
  };
}

// =========================================================================
// Record-Level Upserts (Single-Entity Writes)
// =========================================================================

export async function upsertAssessmentRecord(
  userId: string,
  record: AssessmentRecord,
): Promise<void> {
  const supabase = getSupabase();
  const payload = assessmentRecordToDb(record, userId);

  const { error } = await supabase
    .from("assessment_records")
    .upsert(payload, { onConflict: "user_id,assessment_id" });

  if (error) throw error;
}

export async function upsertSctStatus(
  userId: string,
  courseCode: CourseCode,
  status: SctStatus,
): Promise<void> {
  const supabase = getSupabase();
  const payload = sctStatusToDb(courseCode, status, userId);

  const { error } = await supabase
    .from("sct_status")
    .upsert(payload, { onConflict: "user_id,course_code" });

  if (error) throw error;
}

export async function upsertProjectState(userId: string, state: ProjectUserState): Promise<void> {
  const supabase = getSupabase();
  const payload = projectStateToDb(state, userId);

  const { error } = await supabase.from("project_state").upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}

export async function upsertVivaItem(
  userId: string,
  itemId: string,
  isChecked: boolean,
): Promise<void> {
  const supabase = getSupabase();
  const payload = vivaItemToDb(itemId, isChecked, userId);

  const { error } = await supabase
    .from("viva_checklist")
    .upsert(payload, { onConflict: "user_id,item_id" });

  if (error) throw error;
}

export async function upsertSemesterTask(userId: string, task: SemesterTask): Promise<void> {
  const supabase = getSupabase();
  const payload = semesterTaskToDb(task, userId);

  const { error } = await supabase
    .from("semester_tasks")
    .upsert(payload, { onConflict: "user_id,client_task_id" });

  if (error) throw error;
}

export async function deleteSemesterTaskRemote(
  userId: string,
  clientTaskId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("semester_tasks")
    .delete()
    .eq("user_id", userId)
    .eq("client_task_id", clientTaskId);

  if (error) throw error;
}

export async function upsertUserSettings(userId: string, state: PersistedUserState): Promise<void> {
  const supabase = getSupabase();
  const payload = userSettingsToDb(state, userId);

  const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

// =========================================================================
// Batch Upload (Initial Migration or Bulk Sync)
// =========================================================================

export async function batchUploadFullState(
  userId: string,
  state: PersistedUserState,
): Promise<void> {
  const supabase = getSupabase();
  const timestamp = state.updatedAt || new Date().toISOString();

  // 1. Settings
  const settingsPayload = userSettingsToDb(state, userId, timestamp);

  // 2. Assessments
  const assessmentPayloads = Object.values(state.assessmentRecords).map((rec) =>
    assessmentRecordToDb(rec, userId, timestamp),
  );

  // 3. SCT
  const sctPayloads = (Object.entries(state.sctStatus) as Array<[CourseCode, SctStatus]>).map(
    ([code, status]) => sctStatusToDb(code, status, userId, timestamp),
  );

  // 4. Project
  const projectPayload = projectStateToDb(state.projectState, userId, timestamp);

  // 5. Viva
  const vivaPayloads = Object.entries(state.vivaChecklistState).map(([id, isChecked]) =>
    vivaItemToDb(id, isChecked, userId, timestamp),
  );

  // 6. Tasks
  const taskPayloads = state.tasks.map((t) => semesterTaskToDb(t, userId, timestamp));

  // Execute in parallel batches
  await Promise.all([
    supabase.from("user_settings").upsert(settingsPayload, { onConflict: "id" }),
    assessmentPayloads.length > 0
      ? supabase
          .from("assessment_records")
          .upsert(assessmentPayloads, { onConflict: "user_id,assessment_id" })
      : Promise.resolve(),
    sctPayloads.length > 0
      ? supabase.from("sct_status").upsert(sctPayloads, { onConflict: "user_id,course_code" })
      : Promise.resolve(),
    supabase.from("project_state").upsert(projectPayload, { onConflict: "user_id" }),
    vivaPayloads.length > 0
      ? supabase.from("viva_checklist").upsert(vivaPayloads, { onConflict: "user_id,item_id" })
      : Promise.resolve(),
    taskPayloads.length > 0
      ? supabase
          .from("semester_tasks")
          .upsert(taskPayloads, { onConflict: "user_id,client_task_id" })
      : Promise.resolve(),
  ]);
}

// =========================================================================
// Flush Offline Dirty Queue
// =========================================================================

export async function flushDirtyQueue(
  userId: string,
  currentState: PersistedUserState,
  customStorage?: SyncStorageLike,
): Promise<{ success: boolean; remainingQueue: DirtyRecord[] }> {
  const queue = getDirtyQueue(customStorage);
  if (queue.length === 0) return { success: true, remainingQueue: [] };

  const remaining: DirtyRecord[] = [];

  for (const item of queue) {
    try {
      switch (item.type) {
        case "assessment": {
          const rec = currentState.assessmentRecords[item.id];
          if (rec) await upsertAssessmentRecord(userId, rec);
          break;
        }
        case "sct": {
          const status = currentState.sctStatus[item.id as CourseCode];
          if (status) await upsertSctStatus(userId, item.id as CourseCode, status);
          break;
        }
        case "project": {
          await upsertProjectState(userId, currentState.projectState);
          break;
        }
        case "viva": {
          const isChecked = Boolean(currentState.vivaChecklistState[item.id]);
          await upsertVivaItem(userId, item.id, isChecked);
          break;
        }
        case "task": {
          const task = currentState.tasks.find((t) => t.id === item.id);
          if (task) await upsertSemesterTask(userId, task);
          break;
        }
        case "task_delete": {
          await deleteSemesterTaskRemote(userId, item.id);
          break;
        }
        case "settings": {
          await upsertUserSettings(userId, currentState);
          break;
        }
      }
    } catch {
      remaining.push(item);
    }
  }

  saveDirtyQueue(remaining, customStorage);
  return { success: remaining.length === 0, remainingQueue: remaining };
}
