import type {
  PersistedUserState,
  SctStatus,
  SemesterTask,
  TaskStatus,
  GitHubRepoReference,
} from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { ProjectTrack, ProjectStageId } from "@/types/project";
import { createInitialUserState } from "@/lib/persistence";

/**
 * Pure mutators that return a new PersistedUserState without mutating the original.
 */

export function setGitHubRepo(
  state: PersistedUserState,
  repo: GitHubRepoReference | null,
): PersistedUserState {
  return {
    ...state,
    githubRepo: repo,
    updatedAt: new Date().toISOString(),
  };
}

export function updateAssessmentRecord(
  state: PersistedUserState,
  assessmentId: string,
  updates: Partial<AssessmentRecord>,
): PersistedUserState {
  const existing = state.assessmentRecords[assessmentId] || {
    assessmentId,
    status: "pending",
    score: null,
  };

  const updatedRecord: AssessmentRecord = {
    ...existing,
    ...updates,
  };

  // Enforce pending semantics: score must be null if status is pending
  if (updatedRecord.status === "pending") {
    updatedRecord.score = null;
  }

  return {
    ...state,
    assessmentRecords: {
      ...state.assessmentRecords,
      [assessmentId]: updatedRecord,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setSctStatus(
  state: PersistedUserState,
  courseCode: CourseCode,
  status: SctStatus,
): PersistedUserState {
  return {
    ...state,
    sctStatus: {
      ...state.sctStatus,
      [courseCode]: status,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setProjectTrack(
  state: PersistedUserState,
  track: ProjectTrack | null,
): PersistedUserState {
  return {
    ...state,
    projectState: {
      ...state.projectState,
      track,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function toggleProjectStage(
  state: PersistedUserState,
  stageId: ProjectStageId,
): PersistedUserState {
  const current = state.projectState.completedStageIds;
  const exists = current.includes(stageId);
  const completedStageIds = exists ? current.filter((id) => id !== stageId) : [...current, stageId];

  return {
    ...state,
    projectState: {
      ...state.projectState,
      completedStageIds,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function toggleProjectRequirement(
  state: PersistedUserState,
  requirementId: string,
): PersistedUserState {
  const current = state.projectState.checkedRequirements;
  const exists = current.includes(requirementId);
  const checkedRequirements = exists
    ? current.filter((id) => id !== requirementId)
    : [...current, requirementId];

  return {
    ...state,
    projectState: {
      ...state.projectState,
      checkedRequirements,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setProjectScores(
  state: PersistedUserState,
  l1Score: number | null,
  l2Score: number | null,
): PersistedUserState {
  return {
    ...state,
    projectState: {
      ...state.projectState,
      l1Score,
      l2Score,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function toggleVivaItem(state: PersistedUserState, itemId: string): PersistedUserState {
  const currentVal = !!state.vivaChecklistState[itemId];
  return {
    ...state,
    vivaChecklistState: {
      ...state.vivaChecklistState,
      [itemId]: !currentVal,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function addTask(
  state: PersistedUserState,
  task: Omit<SemesterTask, "id" | "createdAt"> & { id?: string },
): PersistedUserState {
  const newTask: SemesterTask = {
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: task.title,
    description: task.description,
    courseCode: task.courseCode,
    status: task.status || "todo",
    priority: task.priority || "medium",
    dueDate: task.dueDate,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    tasks: [...(state.tasks || []), newTask],
    updatedAt: new Date().toISOString(),
  };
}

export function updateTaskStatus(
  state: PersistedUserState,
  taskId: string,
  status: TaskStatus,
): PersistedUserState {
  const tasks = (state.tasks || []).map((t) => (t.id === taskId ? { ...t, status } : t));

  return {
    ...state,
    tasks,
    updatedAt: new Date().toISOString(),
  };
}

export function updateTask(
  state: PersistedUserState,
  taskId: string,
  updates: Partial<SemesterTask>,
): PersistedUserState {
  const tasks = (state.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t));

  return {
    ...state,
    tasks,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteTask(state: PersistedUserState, taskId: string): PersistedUserState {
  const tasks = (state.tasks || []).filter((t) => t.id !== taskId);

  return {
    ...state,
    tasks,
    updatedAt: new Date().toISOString(),
  };
}

export function resetAllData(): PersistedUserState {
  return createInitialUserState();
}
