import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { ProjectSummary } from "@/lib/selectors";
import { getDaysRemaining } from "@/lib/selectors";
import { getNextHardCutoff, getUpcomingEvents } from "@/lib/calendar";

export interface NextImportantAction {
  id: string;
  title: string;
  subtitle: string;
  courseCode?: CourseCode;
  targetDate: string;
  daysRemaining: number;
  urgency: "critical" | "warning" | "info";
  category:
    | "registration"
    | "cutoff"
    | "assignment"
    | "exam"
    | "project"
    | "prerequisite"
    | "general";
  actionLabel: string;
  actionDestination: "course" | "project" | "calendar" | "registration";
  targetId?: string;
}

interface GetNextActionParams {
  events: AcademicEvent[];
  referenceDate: string;
  courseGrades?: Record<CourseCode, GradeCalculationResult | null>;
  projectSummary?: ProjectSummary;
  isPreSemester?: boolean;
  registrationStartDate?: string;
  registrationEndDate?: string;
}

/**
 * Pure derived selector answering "WHAT MATTERS RIGHT NOW?"
 * Strictly deterministic priority derivation.
 */
export function getNextImportantAction(params: GetNextActionParams): NextImportantAction {
  const {
    events,
    referenceDate,
    projectSummary,
    isPreSemester = false,
    registrationStartDate = "2026-09-22",
    registrationEndDate = "2026-09-23",
  } = params;

  // TIER 0: Pre-Semester Course Registration Window (CRITICAL)
  if (isPreSemester || referenceDate <= registrationEndDate) {
    const daysToStart = getDaysRemaining(registrationStartDate, referenceDate);
    const daysToEnd = getDaysRemaining(registrationEndDate, referenceDate);

    if (daysToStart > 0) {
      return {
        id: "action_term_registration_prep",
        title: "September 2026 Term Course Registration",
        subtitle: `Course Registration opens in ${daysToStart} day${daysToStart === 1 ? "" : "s"} (Sep 22–23). Prepare course list, required documents, and fee payment arrangements.`,
        targetDate: registrationStartDate,
        daysRemaining: daysToStart,
        urgency: "critical",
        category: "registration",
        actionLabel: "View Registration Guide",
        actionDestination: "registration",
      };
    } else if (daysToEnd >= 0) {
      return {
        id: "action_term_registration_active",
        title: "Course Registration Window Closes Tomorrow",
        subtitle: `Registration is active today! Complete your course selection, document uploads, and fee payments before cutoff.`,
        targetDate: registrationEndDate,
        daysRemaining: daysToEnd,
        urgency: "critical",
        category: "registration",
        actionLabel: "Complete Registration",
        actionDestination: "registration",
      };
    }
  }

  // TIER 1: Hard Eligibility Cutoff within 7 days
  const nextCutoff = getNextHardCutoff(events, referenceDate);
  if (nextCutoff) {
    const daysLeft = getDaysRemaining(nextCutoff.date, referenceDate);
    if (daysLeft <= 7 && daysLeft >= 0) {
      return {
        id: `cutoff_${nextCutoff.id}`,
        title: `Hard Cutoff: ${nextCutoff.title}`,
        subtitle: `${nextCutoff.description}. Strict non-negotiable deadline.`,
        courseCode: nextCutoff.courseCode,
        targetDate: nextCutoff.date,
        daysRemaining: daysLeft,
        urgency: "critical",
        category: "cutoff",
        actionLabel: nextCutoff.courseCode ? `View ${nextCutoff.courseCode}` : "View in Calendar",
        actionDestination: nextCutoff.courseCode ? "course" : "calendar",
        targetId: nextCutoff.courseCode,
      };
    }
  }

  // TIER 2 & 3: Imminent academic events within next 3 days
  const upcoming = getUpcomingEvents(events, referenceDate).slice(0, 5);
  const imminent = upcoming.find((e) => {
    const days = getDaysRemaining(e.date, referenceDate);
    return days >= 0 && days <= 3;
  });

  if (imminent) {
    const days = getDaysRemaining(imminent.date, referenceDate);
    const isExam =
      imminent.type === "exam" ||
      imminent.type === "viva" ||
      Boolean((imminent as any).subType?.includes("quiz")) ||
      Boolean((imminent as any).subType?.includes("oppe"));
    const urgency = isExam || days <= 1 ? "critical" : "warning";

    return {
      id: `imminent_${imminent.id}`,
      title: `${imminent.courseCode ? imminent.courseCode + ": " : ""}${imminent.title}`,
      subtitle: imminent.description,
      courseCode: imminent.courseCode,
      targetDate: imminent.date,
      daysRemaining: days,
      urgency,
      category: isExam ? "exam" : "assignment",
      actionLabel: imminent.courseCode ? `Open ${imminent.courseCode}` : "View Event",
      actionDestination: imminent.courseCode ? "course" : "calendar",
      targetId: imminent.courseCode,
    };
  }

  // TIER 4: Project Critical Milestone (Track selection or submission)
  if (projectSummary) {
    if (!projectSummary.track) {
      return {
        id: "project_choose_track",
        title: "CS2006P MAD-2 Project: Select Submission Track",
        subtitle:
          "Choose between Prior Theory (capped at 75) or Current Theory (eligible for 100). Determines submission window.",
        courseCode: "CS2006P",
        targetDate: "2026-10-04",
        daysRemaining: getDaysRemaining("2026-10-04", referenceDate),
        urgency: "warning",
        category: "project",
        actionLabel: "Choose Track",
        actionDestination: "project",
        targetId: "CS2006P",
      };
    }

    if (projectSummary.submissionDeadline) {
      const daysToSub = getDaysRemaining(projectSummary.submissionDeadline, referenceDate);
      if (daysToSub >= 0 && daysToSub <= 14) {
        return {
          id: "project_submission_window",
          title: "CS2006P: Project Submission Deadline Approaching",
          subtitle: `Deadline: ${projectSummary.submissionDeadline}. Current progress: ${projectSummary.completedRequirementsCount}/${projectSummary.totalRequirementsCount} TMA V2 requirements complete.`,
          courseCode: "CS2006P",
          targetDate: projectSummary.submissionDeadline,
          daysRemaining: daysToSub,
          urgency: daysToSub <= 5 ? "critical" : "warning",
          category: "project",
          actionLabel: "Open Project Hub",
          actionDestination: "project",
          targetId: "CS2006P",
        };
      }
    }
  }

  // TIER 5 & 6: Next Upcoming Academic Event
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const days = getDaysRemaining(next.date, referenceDate);
    return {
      id: `upcoming_${next.id}`,
      title: `${next.courseCode ? next.courseCode + ": " : ""}${next.title}`,
      subtitle: next.description,
      courseCode: next.courseCode,
      targetDate: next.date,
      daysRemaining: days,
      urgency: "info",
      category: "general",
      actionLabel: next.courseCode ? `View ${next.courseCode}` : "View in Calendar",
      actionDestination: next.courseCode ? "course" : "calendar",
      targetId: next.courseCode,
    };
  }

  // Default fallback
  return {
    id: "term_overview",
    title: "IITM September 2026 Academic Term",
    subtitle: "All course metrics and canonical timelines are actively tracked.",
    targetDate: referenceDate,
    daysRemaining: 0,
    urgency: "info",
    category: "general",
    actionLabel: "View Academic Calendar",
    actionDestination: "calendar",
  };
}
