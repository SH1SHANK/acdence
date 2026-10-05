// ============================================================================
// NOTIFICATION RULES & DETERMINISTIC EVALUATION ENGINE
// ============================================================================

import type { NotificationCandidate, NotificationEvent, NotificationRuleCode } from "./types.ts";

export const ACADEMIC_TIMEZONE = "Asia/Kolkata";

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata timezone.
 */
export function getTodayIST(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Calculates calendar day difference between target date and reference date
 * anchored at 12:00:00+05:30 in Asia/Kolkata to eliminate daylight/offset anomalies.
 * Returns > 0 if target is in the future, 0 if same day, < 0 if overdue.
 */
export function getDayDifference(
  targetDateStr: string,
  referenceDateStr: string,
): number {
  if (!targetDateStr || !referenceDateStr) return NaN;
  const targetSlice = targetDateStr.slice(0, 10);
  const refSlice = referenceDateStr.slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(targetSlice) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(refSlice)
  ) {
    return NaN;
  }
  const target = new Date(`${targetSlice}T12:00:00+05:30`);
  const reference = new Date(`${refSlice}T12:00:00+05:30`);
  return Math.round(
    (target.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000),
  );
}

/**
 * Matches calendar day difference against configured notification rules.
 * Rules:
 *   7 days -> DUE_7_DAYS
 *   3 days -> DUE_3_DAYS
 *   1 day  -> DUE_1_DAY
 *   0 days -> DUE_TODAY
 */
export function matchNotificationRule(
  dayDiff: number,
): NotificationRuleCode | null {
  switch (dayDiff) {
    case 7:
      return "DUE_7_DAYS";
    case 3:
      return "DUE_3_DAYS";
    case 1:
      return "DUE_1_DAY";
    case 0:
      return "DUE_TODAY";
    default:
      return null;
  }
}

/**
 * Generates an immutable, deterministic notification key.
 * Format: `<userId>:<source>:<eventId>:<ruleCode>:<targetDate>`
 * Guaranteed unique per user, event, rule, and date.
 */
export function generateNotificationKey(
  userId: string,
  source: string,
  eventId: string,
  ruleCode: NotificationRuleCode,
  targetDate: string,
): string {
  const sourcePrefix = source === "semester_task" ? "task" : "academic";
  return `${userId}:${sourcePrefix}:${eventId}:${ruleCode}:${targetDate}`;
}

/**
 * Formats deterministic title and body content for the notification.
 * Strictly adheres to Phase 5 concise, non-sensitive formatting guidelines.
 */
export function formatNotificationContent(
  event: NotificationEvent,
  ruleCode: NotificationRuleCode,
): { title: string; body: string } {
  const coursePrefix = event.courseCode ? `${event.courseCode} — ` : "";
  const eventTitle = event.title.trim();

  if (event.source === "semester_task") {
    switch (ruleCode) {
      case "DUE_7_DAYS":
        return {
          title: "Task Due in 1 Week",
          body: `${coursePrefix}${eventTitle} is due in 7 days.`,
        };
      case "DUE_3_DAYS":
        return {
          title: "Task Due in 3 Days",
          body: `${coursePrefix}${eventTitle} is due in 3 days.`,
        };
      case "DUE_1_DAY":
        return {
          title: "Task Due Tomorrow",
          body: `${coursePrefix}${eventTitle} is due tomorrow.`,
        };
      case "DUE_TODAY":
        return {
          title: "Task Due Today",
          body: `${coursePrefix}${eventTitle} is due today!`,
        };
    }
  }

  // Canonical Academic Events
  if (event.category === "cutoff" || event.isHardCutoff) {
    switch (ruleCode) {
      case "DUE_7_DAYS":
        return {
          title: "Cutoff in 7 Days",
          body: `${coursePrefix}${eventTitle} closes in 1 week.`,
        };
      case "DUE_3_DAYS":
        return {
          title: "Cutoff Closes in 3 Days",
          body: `⚠️ ${coursePrefix}${eventTitle} closes in 3 days. Complete required assignments.`,
        };
      case "DUE_1_DAY":
        return {
          title: "Cutoff Closes Tomorrow",
          body: `🚨 Tomorrow: ${coursePrefix}${eventTitle} closes at 23:59 IST.`,
        };
      case "DUE_TODAY":
        return {
          title: "Cutoff Closes Today",
          body: `🔥 FINAL WARNING: ${coursePrefix}${eventTitle} closes TONIGHT at 23:59 IST!`,
        };
    }
  }

  if (event.category === "exam") {
    switch (ruleCode) {
      case "DUE_7_DAYS":
        return {
          title: "Exam in 1 Week",
          body:
            `📅 1 Week until ${coursePrefix}${eventTitle}. Download hall ticket & review syllabus.`,
        };
      case "DUE_3_DAYS":
        return {
          title: "Exam in 3 Days",
          body: `🎯 3 Days until ${coursePrefix}${eventTitle}. Confirm centre reporting time.`,
        };
      case "DUE_1_DAY":
        return {
          title: "Exam Tomorrow",
          body: `🎯 Tomorrow: ${coursePrefix}${eventTitle}. Check centre and reporting time.`,
        };
      case "DUE_TODAY":
        return {
          title: "Exam Today",
          body: `🎯 ${coursePrefix}${eventTitle} is today!`,
        };
    }
  }

  // Default: Assignments & Milestones
  switch (ruleCode) {
    case "DUE_7_DAYS":
      return {
        title: "Assignment Due in 1 Week",
        body: `${coursePrefix}${eventTitle} is due in 7 days.`,
      };
    case "DUE_3_DAYS":
      return {
        title: "Assignment Due in 3 Days",
        body: `${coursePrefix}${eventTitle} is due in 3 days.`,
      };
    case "DUE_1_DAY":
      return {
        title: "Assignment Due Tomorrow",
        body: `📝 ${coursePrefix}${eventTitle} is due tomorrow at 23:59 IST.`,
      };
    case "DUE_TODAY":
      return {
        title: "Due Today",
        body: `⚠️ ${coursePrefix}${eventTitle} is due today at 23:59 IST.`,
      };
  }
}

/**
 * Evaluates an event against the reference date.
 * Returns a NotificationCandidate if a rule matches, or null otherwise.
 */
export function evaluateEventRule(
  event: NotificationEvent,
  referenceDateStr: string,
): NotificationCandidate | null {
  if (
    !event.targetDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(event.targetDate.slice(0, 10))
  ) {
    return null;
  }

  const targetDateOnly = event.targetDate.slice(0, 10);
  const dayDiff = getDayDifference(targetDateOnly, referenceDateStr);
  const ruleCode = matchNotificationRule(dayDiff);

  if (!ruleCode) return null;

  const key = generateNotificationKey(
    event.userId,
    event.source,
    event.eventId,
    ruleCode,
    targetDateOnly,
  );

  const { title, body } = formatNotificationContent(event, ruleCode);

  return {
    notificationKey: key,
    userId: event.userId,
    eventId: event.eventId,
    ruleCode,
    targetDate: targetDateOnly,
    source: event.source,
    title,
    body,
    url: event.url,
  };
}
