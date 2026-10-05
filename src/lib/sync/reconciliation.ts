import type { PersistedUserState, SemesterTask } from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { DbAssessmentRecord, DbSctStatus, DbSemesterTask, RemoteUserData } from "./types";
import {
  dbToAssessmentRecord,
  dbToProjectState,
  dbToSemesterTask,
  dbToGitHubRepo,
} from "./mappers";

export interface ReconciliationResult {
  mergedState: PersistedUserState;
  hasLocalChangesApplied: boolean;
  hasRemoteChangesApplied: boolean;
  pendingLocalUploads: {
    assessments: AssessmentRecord[];
    sct: CourseCode[];
    project: boolean;
    viva: string[];
    tasks: SemesterTask[];
    settings: boolean;
  };
}

/**
 * Deterministic timestamp comparison (ISO 8601 strings)
 * Returns > 0 if a is newer, < 0 if b is newer, 0 if equal
 */
export function compareTimestamps(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Reconciles assessment records with remote database rows using Last-Write-Wins.
 */
export function reconcileAssessmentRecords(
  localRecords: Record<string, AssessmentRecord>,
  localUpdatedAt: string,
  remoteRows: DbAssessmentRecord[],
): {
  merged: Record<string, AssessmentRecord>;
  remoteNewerApplied: boolean;
  localNewerRecords: AssessmentRecord[];
} {
  const merged = { ...localRecords };
  let remoteNewerApplied = false;
  const localNewerRecords: AssessmentRecord[] = [];

  const remoteMap = new Map<string, DbAssessmentRecord>();
  for (const row of remoteRows) {
    remoteMap.set(row.assessment_id, row);
  }

  // 1. Process all remote rows
  for (const row of remoteRows) {
    const local = merged[row.assessment_id];
    if (!local) {
      merged[row.assessment_id] = dbToAssessmentRecord(row);
      remoteNewerApplied = true;
    } else {
      // Compare remote.updated_at vs localUpdatedAt
      if (compareTimestamps(row.updated_at, localUpdatedAt) > 0) {
        merged[row.assessment_id] = dbToAssessmentRecord(row);
        remoteNewerApplied = true;
      } else if (compareTimestamps(localUpdatedAt, row.updated_at) > 0) {
        // Local has modifications that remote doesn't have yet
        localNewerRecords.push(local);
      }
    }
  }

  // 2. Identify local assessments that don't exist remotely
  for (const [id, record] of Object.entries(localRecords)) {
    if (!remoteMap.has(id)) {
      localNewerRecords.push(record);
    }
  }

  return { merged, remoteNewerApplied, localNewerRecords };
}

/**
 * Reconciles tasks with remote database rows using Last-Write-Wins.
 */
export function reconcileSemesterTasks(
  localTasks: SemesterTask[],
  remoteRows: DbSemesterTask[],
): {
  merged: SemesterTask[];
  remoteNewerApplied: boolean;
  localNewerTasks: SemesterTask[];
} {
  const taskMap = new Map<string, SemesterTask>();
  const remoteMap = new Map<string, DbSemesterTask>();
  let remoteNewerApplied = false;
  const localNewerTasks: SemesterTask[] = [];

  for (const r of remoteRows) {
    remoteMap.set(r.client_task_id, r);
  }

  for (const t of localTasks) {
    taskMap.set(t.id, t);
  }

  // 1. Inspect remote rows
  for (const r of remoteRows) {
    const local = taskMap.get(r.client_task_id);
    if (!local) {
      taskMap.set(r.client_task_id, dbToSemesterTask(r));
      remoteNewerApplied = true;
    } else {
      // In SemesterTask, if local task has no specific timestamp, compare with createdAt/row
      if (compareTimestamps(r.updated_at, local.createdAt) > 0) {
        taskMap.set(r.client_task_id, dbToSemesterTask(r));
        remoteNewerApplied = true;
      }
    }
  }

  // 2. Tasks present locally but not remotely are pending upload
  for (const t of localTasks) {
    if (!remoteMap.has(t.id)) {
      localNewerTasks.push(t);
    }
  }

  const merged = Array.from(taskMap.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  return { merged, remoteNewerApplied, localNewerTasks };
}

/**
 * Comprehensive reconciliation of full application state against remote Supabase data.
 */
export function reconcileFullState(
  local: PersistedUserState,
  remote: RemoteUserData,
): ReconciliationResult {
  let hasRemoteChangesApplied = false;
  let hasLocalChangesApplied = false;

  const pendingLocalUploads = {
    assessments: [] as AssessmentRecord[],
    sct: [] as CourseCode[],
    project: false,
    viva: [] as string[],
    tasks: [] as SemesterTask[],
    settings: false,
  };

  let maxMergedTimestamp = local.updatedAt;

  // 1. Assessments
  const {
    merged: mergedAssessments,
    remoteNewerApplied: assessmentsRemoteNewer,
    localNewerRecords,
  } = reconcileAssessmentRecords(local.assessmentRecords, local.updatedAt, remote.assessments);

  if (assessmentsRemoteNewer) hasRemoteChangesApplied = true;
  pendingLocalUploads.assessments = localNewerRecords;
  if (localNewerRecords.length > 0) hasLocalChangesApplied = true;

  // 2. SCT Status
  const mergedSct = { ...local.sctStatus };
  const remoteSctMap = new Map<CourseCode, DbSctStatus>();
  for (const s of remote.sct) {
    remoteSctMap.set(s.course_code, s);
    if (compareTimestamps(s.updated_at, local.updatedAt) > 0) {
      mergedSct[s.course_code] = s.status;
      hasRemoteChangesApplied = true;
      if (compareTimestamps(s.updated_at, maxMergedTimestamp) > 0) {
        maxMergedTimestamp = s.updated_at;
      }
    } else if (compareTimestamps(local.updatedAt, s.updated_at) > 0) {
      pendingLocalUploads.sct.push(s.course_code);
      hasLocalChangesApplied = true;
    }
  }

  // 3. Project State
  let mergedProject = { ...local.projectState };
  if (remote.project) {
    if (compareTimestamps(remote.project.updated_at, local.updatedAt) > 0) {
      mergedProject = dbToProjectState(remote.project);
      hasRemoteChangesApplied = true;
      if (compareTimestamps(remote.project.updated_at, maxMergedTimestamp) > 0) {
        maxMergedTimestamp = remote.project.updated_at;
      }
    } else if (compareTimestamps(local.updatedAt, remote.project.updated_at) > 0) {
      pendingLocalUploads.project = true;
      hasLocalChangesApplied = true;
    }
  } else {
    // Remote has no project state row yet
    pendingLocalUploads.project = true;
    hasLocalChangesApplied = true;
  }

  // 4. Viva Checklist
  const mergedViva = { ...local.vivaChecklistState };
  for (const v of remote.viva) {
    if (compareTimestamps(v.updated_at, local.updatedAt) > 0) {
      mergedViva[v.item_id] = v.is_checked;
      hasRemoteChangesApplied = true;
      if (compareTimestamps(v.updated_at, maxMergedTimestamp) > 0) {
        maxMergedTimestamp = v.updated_at;
      }
    } else if (compareTimestamps(local.updatedAt, v.updated_at) > 0) {
      pendingLocalUploads.viva.push(v.item_id);
      hasLocalChangesApplied = true;
    }
  }

  // 5. Semester Tasks
  const {
    merged: mergedTasks,
    remoteNewerApplied: tasksRemoteNewer,
    localNewerTasks,
  } = reconcileSemesterTasks(local.tasks, remote.tasks);

  if (tasksRemoteNewer) hasRemoteChangesApplied = true;
  pendingLocalUploads.tasks = localNewerTasks;
  if (localNewerTasks.length > 0) hasLocalChangesApplied = true;

  // 6. Settings / Notes
  let mergedNotes = local.notes ? { ...local.notes } : {};
  let mergedGithub = local.githubRepo ? { ...local.githubRepo } : null;

  if (remote.settings) {
    if (compareTimestamps(remote.settings.updated_at, local.updatedAt) > 0) {
      if (remote.settings.notes && typeof remote.settings.notes === "object") {
        mergedNotes = { ...remote.settings.notes };
      }
      const git = dbToGitHubRepo(remote.settings);
      if (git) {
        mergedGithub = {
          ...git,
          token: local.githubRepo?.token, // Preserve strictly local token
        };
      }
      hasRemoteChangesApplied = true;
      if (compareTimestamps(remote.settings.updated_at, maxMergedTimestamp) > 0) {
        maxMergedTimestamp = remote.settings.updated_at;
      }
    } else if (compareTimestamps(local.updatedAt, remote.settings.updated_at) > 0) {
      pendingLocalUploads.settings = true;
      hasLocalChangesApplied = true;
    }
  } else {
    pendingLocalUploads.settings = true;
    hasLocalChangesApplied = true;
  }

  const mergedState: PersistedUserState = {
    schemaVersion: local.schemaVersion,
    assessmentRecords: mergedAssessments,
    sctStatus: mergedSct,
    projectState: mergedProject,
    vivaChecklistState: mergedViva,
    tasks: mergedTasks,
    notes: mergedNotes,
    githubRepo: mergedGithub,
    updatedAt: maxMergedTimestamp,
  };

  return {
    mergedState,
    hasLocalChangesApplied,
    hasRemoteChangesApplied,
    pendingLocalUploads,
  };
}
