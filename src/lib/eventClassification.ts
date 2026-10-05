import type { AcademicEvent } from "@/types/events";

export type EventSeverity = "critical" | "warning" | "normal";

export type EventCategoryLabel =
  | "Hard Cutoff"
  | "Exam"
  | "Viva"
  | "Assignment Due"
  | "Milestone"
  | "Scheduled Event";

/**
 * Single source of truth for semantic event severity.
 * - 'critical': Non-negotiable hard eligibility cutoffs and gating deadlines
 * - 'warning': Major proctored exams, vivas, and significant assessment milestones
 * - 'normal': Standard weekly assignments, releases, and informational milestones
 */
export function getEventSeverity(event: AcademicEvent): EventSeverity {
  if (isHardCutoff(event)) {
    return "critical";
  }
  if (event.type === "exam" || event.type === "viva") {
    return "warning";
  }
  return "normal";
}

/**
 * Returns a concise, semantic domain label describing the event type.
 */
export function getEventCategoryLabel(event: AcademicEvent): EventCategoryLabel {
  if (isHardCutoff(event)) return "Hard Cutoff";
  if (event.type === "exam") return "Exam";
  if (event.type === "viva") return "Viva";
  if (event.type === "assignment" || event.type === "bpt_deadline") return "Assignment Due";
  if (event.type === "project_milestone" || event.type === "academic_milestone") return "Milestone";
  return "Scheduled Event";
}

/**
 * Checks whether an event represents a hard, non-negotiable eligibility cutoff.
 */
export function isHardCutoff(event: AcademicEvent): boolean {
  return Boolean(event.hardCutoff || event.isHardCutoff);
}
