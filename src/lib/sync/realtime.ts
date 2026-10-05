import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  DbAssessmentRecord,
  DbSctStatus,
  DbProjectState,
  DbVivaChecklist,
  DbSemesterTask,
  DbUserSettings,
} from "./types";
import { dbToAssessmentRecord, dbToProjectState, dbToSemesterTask } from "./mappers";
import type { AssessmentRecord } from "@/types/assessment";
import type { CourseCode } from "@/types/course";
import type { SctStatus, ProjectUserState, SemesterTask } from "@/types/state";

export interface RealtimeSyncCallbacks {
  onAssessmentChange?: (record: AssessmentRecord) => void;
  onSctChange?: (courseCode: CourseCode, status: SctStatus) => void;
  onProjectChange?: (projectState: ProjectUserState) => void;
  onVivaChange?: (itemId: string, isChecked: boolean) => void;
  onTaskUpsert?: (task: SemesterTask) => void;
  onTaskDelete?: (clientTaskId: string) => void;
  onSettingsChange?: (settings: DbUserSettings) => void;
}

let activeChannel: RealtimeChannel | null = null;

export function subscribeToUserChanges(
  userId: string,
  callbacks: RealtimeSyncCallbacks,
): () => void {
  const supabase = getSupabase();

  // If already subscribed, tear down old channel first to avoid duplicates
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channelName = `realtime_user_${userId}_${Date.now()}`;

  activeChannel = supabase
    .channel(channelName)
    // 1. Assessment Records
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "assessment_records",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbAssessmentRecord;
          if (row && row.assessment_id) {
            callbacks.onAssessmentChange?.(dbToAssessmentRecord(row));
          }
        }
      },
    )
    // 2. SCT Status
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sct_status",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbSctStatus;
          if (row && row.course_code) {
            callbacks.onSctChange?.(row.course_code, row.status);
          }
        }
      },
    )
    // 3. Project State
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_state",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbProjectState;
          if (row) {
            callbacks.onProjectChange?.(dbToProjectState(row));
          }
        }
      },
    )
    // 4. Viva Checklist
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "viva_checklist",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbVivaChecklist;
          if (row && row.item_id) {
            callbacks.onVivaChange?.(row.item_id, row.is_checked);
          }
        }
      },
    )
    // 5. Semester Tasks
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "semester_tasks",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbSemesterTask;
          if (row && row.client_task_id) {
            callbacks.onTaskUpsert?.(dbToSemesterTask(row));
          }
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as Partial<DbSemesterTask>;
          if (row && row.client_task_id) {
            callbacks.onTaskDelete?.(row.client_task_id);
          }
        }
      },
    )
    // 6. User Settings
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_settings",
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbUserSettings;
          if (row) {
            callbacks.onSettingsChange?.(row);
          }
        }
      },
    )
    .subscribe();

  // Return unsubscribe callback
  return () => {
    if (activeChannel) {
      void supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
