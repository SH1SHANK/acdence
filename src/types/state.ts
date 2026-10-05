import type { AssessmentRecord } from "./assessment";
import type { CourseCode } from "./course";
import type { ProjectTrack, ProjectStageId } from "./project";

export type SctStatus = "pending" | "passed" | "failed";

export interface ProjectUserState {
  track: ProjectTrack | null;
  completedStageIds: ProjectStageId[];
  checkedRequirements: string[];
  l1Score: number | null;
  l2Score: number | null;
  submissionUrl?: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface SemesterTask {
  id: string;
  title: string;
  description?: string;
  courseCode?: CourseCode;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
}

export interface GitHubRepoReference {
  url: string;
  owner: string;
  name: string;
  lastSyncedAt?: string;
  token?: string; // optional personal access token stored strictly locally
}

export interface PersistedUserState {
  schemaVersion: number;
  assessmentRecords: Record<string, AssessmentRecord>;
  sctStatus: Record<CourseCode, SctStatus>;
  projectState: ProjectUserState;
  vivaChecklistState: Record<string, boolean>;
  tasks: SemesterTask[];
  notes?: Record<string, string>;
  githubRepo?: GitHubRepoReference | null;
  updatedAt: string;
}
