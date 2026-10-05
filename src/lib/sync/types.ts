import type { CourseCode } from "@/types/course";
import type { SctStatus, TaskStatus, TaskPriority } from "@/types/state";
import type { AssessmentStatus } from "@/types/assessment";
import type { ProjectTrack, ProjectStageId } from "@/types/project";

// Database Row Types (Matching Phase 1 PostgreSQL Schema)
export interface DbUserSettings {
  id: string;
  notes: Record<string, string>;
  github_repo_url: string | null;
  github_repo_owner: string | null;
  github_repo_name: string | null;
  github_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAssessmentRecord {
  id: string;
  user_id: string;
  assessment_id: string;
  status: AssessmentStatus;
  score: number | null;
  submission_date: string | null;
  updated_at: string;
}

export interface DbSctStatus {
  id: string;
  user_id: string;
  course_code: CourseCode;
  status: SctStatus;
  updated_at: string;
}

export interface DbProjectState {
  id: string;
  user_id: string;
  track: ProjectTrack | null;
  completed_stage_ids: ProjectStageId[];
  checked_requirements: string[];
  l1_score: number | null;
  l2_score: number | null;
  submission_url: string | null;
  updated_at: string;
}

export interface DbVivaChecklist {
  id: string;
  user_id: string;
  item_id: string;
  is_checked: boolean;
  updated_at: string;
}

export interface DbSemesterTask {
  id: string;
  user_id: string;
  client_task_id: string;
  title: string;
  description: string | null;
  course_code: CourseCode | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Sync Infrastructure Types
export type SyncStatus =
  | "local"
  | "authenticating"
  | "authenticated"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export type AuthErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_FAILED"
  | "NETWORK_OFFLINE"
  | "SYNC_FAILED"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR";

export type DirtyRecordType =
  | "assessment"
  | "sct"
  | "project"
  | "viva"
  | "task"
  | "task_delete"
  | "settings";

export interface DirtyRecord {
  type: DirtyRecordType;
  id: string;
  timestamp: string;
}

export interface RemoteUserData {
  settings: DbUserSettings | null;
  assessments: DbAssessmentRecord[];
  sct: DbSctStatus[];
  project: DbProjectState | null;
  viva: DbVivaChecklist[];
  tasks: DbSemesterTask[];
}
