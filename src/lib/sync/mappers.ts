import type {
  PersistedUserState,
  SctStatus,
  SemesterTask,
  GitHubRepoReference,
  ProjectUserState,
} from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type {
  DbAssessmentRecord,
  DbSctStatus,
  DbProjectState,
  DbVivaChecklist,
  DbSemesterTask,
  DbUserSettings,
  RemoteUserData,
} from "./types";
import { CURRENT_SCHEMA_VERSION, createInitialUserState } from "@/lib/persistence";

// =========================================================================
// Record-to-DB Mappers (Frontend State -> Supabase DTOs)
// =========================================================================

export function assessmentRecordToDb(
  record: AssessmentRecord,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbAssessmentRecord, "id"> {
  return {
    user_id: userId,
    assessment_id: record.assessmentId,
    status: record.status,
    score: record.status === "pending" ? null : record.score,
    submission_date: record.submissionDate || null,
    updated_at: updatedAt,
  };
}

export function sctStatusToDb(
  courseCode: CourseCode,
  status: SctStatus,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbSctStatus, "id"> {
  return {
    user_id: userId,
    course_code: courseCode,
    status,
    updated_at: updatedAt,
  };
}

export function projectStateToDb(
  projectState: ProjectUserState,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbProjectState, "id"> {
  return {
    user_id: userId,
    track: projectState.track,
    completed_stage_ids: [...projectState.completedStageIds],
    checked_requirements: [...projectState.checkedRequirements],
    l1_score: projectState.l1Score,
    l2_score: projectState.l2Score,
    submission_url: projectState.submissionUrl || null,
    updated_at: updatedAt,
  };
}

export function vivaItemToDb(
  itemId: string,
  isChecked: boolean,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbVivaChecklist, "id"> {
  return {
    user_id: userId,
    item_id: itemId,
    is_checked: isChecked,
    updated_at: updatedAt,
  };
}

export function semesterTaskToDb(
  task: SemesterTask,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbSemesterTask, "id"> {
  return {
    user_id: userId,
    client_task_id: task.id,
    title: task.title,
    description: task.description || null,
    course_code: task.courseCode || null,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate || null,
    created_at: task.createdAt,
    updated_at: updatedAt,
  };
}

export function userSettingsToDb(
  state: PersistedUserState,
  userId: string,
  updatedAt: string = new Date().toISOString(),
): Omit<DbUserSettings, "created_at"> {
  return {
    id: userId,
    notes: state.notes ? { ...state.notes } : {},
    github_repo_url: state.githubRepo?.url || null,
    github_repo_owner: state.githubRepo?.owner || null,
    github_repo_name: state.githubRepo?.name || null,
    github_last_synced_at: state.githubRepo?.lastSyncedAt || null,
    updated_at: updatedAt,
  };
}

// =========================================================================
// DB-to-Record Mappers (Supabase DTOs -> Frontend State)
// =========================================================================

export function dbToAssessmentRecord(row: DbAssessmentRecord): AssessmentRecord {
  return {
    assessmentId: row.assessment_id,
    status: row.status,
    score: row.score !== null ? Number(row.score) : null,
    submissionDate: row.submission_date || undefined,
  };
}

export function dbToProjectState(row: DbProjectState): ProjectUserState {
  return {
    track: row.track,
    completedStageIds: Array.isArray(row.completed_stage_ids) ? [...row.completed_stage_ids] : [],
    checkedRequirements: Array.isArray(row.checked_requirements)
      ? [...row.checked_requirements]
      : [],
    l1Score: row.l1_score !== null ? Number(row.l1_score) : null,
    l2Score: row.l2_score !== null ? Number(row.l2_score) : null,
    submissionUrl: row.submission_url || undefined,
  };
}

export function dbToSemesterTask(row: DbSemesterTask): SemesterTask {
  return {
    id: row.client_task_id,
    title: row.title,
    description: row.description || undefined,
    courseCode: row.course_code || undefined,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date || undefined,
    createdAt: row.created_at,
  };
}

export function dbToGitHubRepo(row: DbUserSettings): GitHubRepoReference | null {
  if (!row.github_repo_url || !row.github_repo_owner || !row.github_repo_name) {
    return null;
  }
  return {
    url: row.github_repo_url,
    owner: row.github_repo_owner,
    name: row.github_repo_name,
    lastSyncedAt: row.github_last_synced_at || undefined,
  };
}

// =========================================================================
// Full Snapshot Assembler
// =========================================================================

export function remoteDataToUserState(
  remote: RemoteUserData,
  fallbackBaseState?: PersistedUserState,
): PersistedUserState {
  const initial = fallbackBaseState || createInitialUserState();

  // Merge assessments
  const assessmentRecords: Record<string, AssessmentRecord> = { ...initial.assessmentRecords };
  let latestUpdate = initial.updatedAt;

  for (const row of remote.assessments) {
    assessmentRecords[row.assessment_id] = dbToAssessmentRecord(row);
    if (row.updated_at > latestUpdate) latestUpdate = row.updated_at;
  }

  // Merge SCT status
  const sctStatus: Record<CourseCode, SctStatus> = { ...initial.sctStatus };
  for (const row of remote.sct) {
    sctStatus[row.course_code] = row.status;
    if (row.updated_at > latestUpdate) latestUpdate = row.updated_at;
  }

  // Merge project state
  let projectState: ProjectUserState = { ...initial.projectState };
  if (remote.project) {
    projectState = dbToProjectState(remote.project);
    if (remote.project.updated_at > latestUpdate) latestUpdate = remote.project.updated_at;
  }

  // Merge viva checklist
  const vivaChecklistState: Record<string, boolean> = { ...initial.vivaChecklistState };
  for (const row of remote.viva) {
    vivaChecklistState[row.item_id] = row.is_checked;
    if (row.updated_at > latestUpdate) latestUpdate = row.updated_at;
  }

  // Merge tasks
  const tasks: SemesterTask[] =
    remote.tasks.length > 0
      ? remote.tasks.map(dbToSemesterTask).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [...initial.tasks];

  for (const row of remote.tasks) {
    if (row.updated_at > latestUpdate) latestUpdate = row.updated_at;
  }

  // Merge settings / notes / github repo
  let notes = initial.notes ? { ...initial.notes } : {};
  let githubRepo = initial.githubRepo ? { ...initial.githubRepo } : null;

  if (remote.settings) {
    if (remote.settings.notes && typeof remote.settings.notes === "object") {
      notes = { ...remote.settings.notes };
    }
    const remoteGit = dbToGitHubRepo(remote.settings);
    if (remoteGit) {
      // Preserve local token if user had one stored strictly locally
      githubRepo = {
        ...remoteGit,
        token: initial.githubRepo?.token,
      };
    }
    if (remote.settings.updated_at > latestUpdate) latestUpdate = remote.settings.updated_at;
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    assessmentRecords,
    sctStatus,
    projectState,
    vivaChecklistState,
    tasks,
    notes,
    githubRepo,
    updatedAt: latestUpdate,
  };
}
