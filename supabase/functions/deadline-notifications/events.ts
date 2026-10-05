// ============================================================================
// CANONICAL EVENTS & USER TASKS DISCOVERY
// ============================================================================

import { CANONICAL_EDGE_EVENTS, type CanonicalEdgeEvent } from "./generated_canonical_events.ts";
import type { NotificationCategory, NotificationEvent } from "./types.ts";
import { getDayDifference, getTodayIST } from "./rules.ts";

export interface TasksQueryClient {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
}

interface SemesterTaskRow {
  client_task_id: string;
  title: string;
  description?: string | null;
  course_code?: string | null;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
}

/**
 * Classifies an academic event into a notification category.
 */
function classifyAcademicCategory(
  event: CanonicalEdgeEvent,
): NotificationCategory {
  if (
    event.isHardCutoff || event.type === "eligibility_close" ||
    event.id.startsWith("cutoff_")
  ) {
    return "cutoff";
  }
  const typeLower = event.type.toLowerCase();
  const idLower = event.id.toLowerCase();
  if (
    typeLower.includes("exam") ||
    typeLower.includes("quiz") ||
    typeLower.includes("oppe") ||
    idLower.includes("quiz") ||
    idLower.includes("oppe") ||
    idLower.includes("end_term")
  ) {
    return "exam";
  }
  if (
    typeLower.includes("assignment") ||
    typeLower.includes("grpa") ||
    idLower.includes("grpa") ||
    idLower.includes("assignment")
  ) {
    return "assignment";
  }
  return "milestone";
}

/**
 * Discovers upcoming canonical academic events within the evaluation horizon [0..7 days]
 * for a specific user.
 */
export function getUpcomingCanonicalEvents(
  userId: string,
  todayDateStr: string,
): NotificationEvent[] {
  const result: NotificationEvent[] = [];

  for (const event of CANONICAL_EDGE_EVENTS) {
    if (!event.date) continue;
    const dayDiff = getDayDifference(event.date, todayDateStr);
    // Only process events within the 0 to 7 day evaluation window
    if (isNaN(dayDiff) || dayDiff < 0 || dayDiff > 7) continue;

    const category = classifyAcademicCategory(event);
    const deepLinkUrl = `https://acdence.vercel.app/?date=${event.date}${
      event.courseCode ? `&course=${event.courseCode}` : ""
    }`;

    result.push({
      eventId: event.id,
      userId,
      title: event.title,
      courseCode: event.courseCode,
      targetDate: event.date,
      source: "academic_event",
      category,
      isHardCutoff: event.isHardCutoff,
      description: event.description,
      url: deepLinkUrl,
    });
  }

  return result;
}

/**
 * Queries user-created semester tasks within the [0..7 days] horizon from the database.
 * Filters out completed tasks (`status = done`) and uses the existing due_date index.
 */
export async function getUpcomingUserTasks(
  supabase: TasksQueryClient,
  userId: string,
  todayDateStr: string,
  horizonDays = 7,
): Promise<NotificationEvent[]> {
  const todayOnly = todayDateStr.slice(0, 10);
  const today = new Date(`${todayOnly}T12:00:00+05:30`);
  const maxDateObj = new Date(
    today.getTime() + horizonDays * 24 * 60 * 60 * 1000,
  );
  const maxDateStr = getTodayIST(maxDateObj);

  const { data, error } = await supabase
    .from("semester_tasks")
    .select(
      "client_task_id, title, description, course_code, due_date, status, priority",
    )
    .eq("user_id", userId)
    .neq("status", "done")
    .not("due_date", "is", null)
    .gte("due_date", todayOnly)
    .lte("due_date", maxDateStr);

  if (error) {
    console.error(
      `[events] Error querying semester tasks for user ${userId}:`,
      error,
    );
    return [];
  }

  if (!data || !Array.isArray(data)) return [];

  const result: NotificationEvent[] = [];
  const rows = data as SemesterTaskRow[];
  for (const task of rows) {
    if (!task.due_date || task.status === "done") continue;
    const taskDateStr = String(task.due_date).slice(0, 10);
    const dayDiff = getDayDifference(taskDateStr, todayOnly);
    if (isNaN(dayDiff) || dayDiff < 0 || dayDiff > horizonDays) continue;

    result.push({
      eventId: task.client_task_id,
      userId,
      title: task.title,
      courseCode: task.course_code || undefined,
      targetDate: taskDateStr,
      source: "semester_task",
      category: "task",
      description: task.description || undefined,
      url: "https://acdence.vercel.app/",
    });
  }

  return result;
}
