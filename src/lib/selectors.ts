import type { PersistedUserState } from "@/types/state";
import type { Course, CourseCode } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { AcademicEvent } from "@/types/events";
import type { ProjectTrack, ProjectStageId } from "@/types/project";
import { COURSES } from "@/data/courses";
import { CANONICAL_EVENTS } from "@/data/events";
import {
  SEMESTER_CONFIG,
  getWeekForDate,
  type SemesterConfig,
  type AcademicWeek,
} from "@/data/semester";
import { PROJECT_STAGES, PROJECT_TRACKS, TMA_V2_REQUIREMENTS } from "@/data/project";
import { calculateCourseGrade } from "@/grading";
import { evaluateProjectGrade } from "@/grading/project";
import { getNextHardCutoff, getUpcomingEvents } from "@/lib/calendar";
import { formatAcademicDate } from "@/lib/datetime";

export interface SemesterProgress {
  term: string;
  year: number;
  currentWeekNumber: number;
  totalWeeks: number;
  percentage: number;
  weekTitle: string;
  isPreSemester: boolean;
  registrationStartDate?: string;
  registrationEndDate?: string;
}

export interface NextHardCutoffSummary {
  event: AcademicEvent | null;
  daysLeft: number | null;
  formattedDate: string | null;
}

export type AttentionType =
  | "eligibility_close"
  | "missing_prerequisite"
  | "assignment_due"
  | "project_critical";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  title: string;
  courseCode?: CourseCode;
  description: string;
  date: string;
  deadlineFormatted: string;
  daysRemaining: number;
  urgency: "critical" | "warning" | "info";
}

export interface ProjectSummary {
  track: ProjectTrack | null;
  trackName: string;
  submissionDeadline: string | null;
  currentStageId: ProjectStageId;
  currentStageName: string;
  nextStepDescription: string;
  completedRequirementsCount: number;
  totalRequirementsCount: number;
  l1Score: number | null;
  l2Score: number | null;
  statusDescription: string;
}

/**
 * Calculates days difference between targetDate and referenceDate (YYYY-MM-DD)
 */
export function getDaysRemaining(targetDate: string, referenceDate: string): number {
  const target = new Date(targetDate.slice(0, 10));
  const ref = new Date(referenceDate.slice(0, 10));
  const diffTime = target.getTime() - ref.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Derives current semester progress based on referenceDate
 */
export function selectSemesterProgress(
  referenceDate: string,
  config: SemesterConfig = SEMESTER_CONFIG,
): SemesterProgress {
  const isPre = referenceDate < config.startDate;
  if (isPre) {
    return {
      term: config.term,
      year: config.year,
      currentWeekNumber: 0,
      totalWeeks: config.totalWeeks,
      percentage: 0,
      weekTitle: "Pre-Semester · Registration Sep 22–23",
      isPreSemester: true,
      registrationStartDate: config.registrationStartDate,
      registrationEndDate: config.registrationEndDate,
    };
  }

  const currentWeek =
    config.weeks.find(
      (w: AcademicWeek) => referenceDate >= w.startDate && referenceDate <= w.endDate,
    ) || getWeekForDate(referenceDate);
  const currentWeekNumber = currentWeek ? currentWeek.weekNumber : 1;
  const totalWeeks = config.totalWeeks;
  const percentage = Math.min(100, Math.round((currentWeekNumber / totalWeeks) * 100));

  return {
    term: config.term,
    year: config.year,
    currentWeekNumber,
    totalWeeks,
    percentage,
    weekTitle: currentWeek ? currentWeek.title : `Week ${currentWeekNumber}`,
    isPreSemester: false,
    registrationStartDate: config.registrationStartDate,
    registrationEndDate: config.registrationEndDate,
  };
}

/**
 * Derives the immediate next hard academic cutoff
 */
export function selectNextHardCutoff(
  referenceDate: string,
  events: AcademicEvent[] = CANONICAL_EVENTS,
): NextHardCutoffSummary {
  const nextCutoff = getNextHardCutoff(events, referenceDate);
  if (!nextCutoff) {
    return { event: null, daysLeft: null, formattedDate: null };
  }

  const daysLeft = getDaysRemaining(nextCutoff.date, referenceDate);
  const formattedDate = formatAcademicDate(nextCutoff.date);

  return {
    event: nextCutoff,
    daysLeft,
    formattedDate,
  };
}

/**
 * Derives live grading and eligibility calculations for all theory courses
 */
export function selectCourseGrades(
  state: PersistedUserState,
): Record<CourseCode, GradeCalculationResult | null> {
  const records = Object.values(state.assessmentRecords);
  const result: Partial<Record<CourseCode, GradeCalculationResult | null>> = {};

  const theoryCourses: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];
  for (const code of theoryCourses) {
    try {
      result[code] = calculateCourseGrade(code, records, {
        sctStatus: state.sctStatus,
      });
    } catch {
      result[code] = null;
    }
  }

  result["CS2006P"] = null; // Project handled separately
  return result as Record<CourseCode, GradeCalculationResult | null>;
}

/**
 * Derives next course-specific event for a given course
 */
export function selectNextCourseEvent(
  courseCode: CourseCode,
  referenceDate: string,
  events: AcademicEvent[] = CANONICAL_EVENTS,
): AcademicEvent | null {
  const courseEvents = events.filter((e) => e.courseCode === courseCode);
  const upcoming = getUpcomingEvents(courseEvents, referenceDate);
  return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Derives prioritized actionable attention items
 */
export function selectAttentionItems(
  state: PersistedUserState,
  referenceDate: string,
  events: AcademicEvent[] = CANONICAL_EVENTS,
  courses: Record<CourseCode, Course> = COURSES,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const upcoming = getUpcomingEvents(events, referenceDate);

  // 1. Critical Hard Cutoffs approaching in the next 21 days
  for (const event of upcoming) {
    const days = getDaysRemaining(event.date, referenceDate);
    // Avoid duplicating SCT windows here, as SCT prerequisites are tracked course-specifically below
    if (event.subType === "sct_window" || event.cutoffType === "sct_window") {
      continue;
    }

    if ((event.hardCutoff || event.isHardCutoff) && days <= 21 && days >= 0) {
      items.push({
        id: `attn_cutoff_${event.id}`,
        type: "eligibility_close",
        title: `ELIGIBILITY CLOSES · ${event.title}`,
        courseCode: event.courseCode,
        description: event.description,
        date: event.date,
        deadlineFormatted: formatAcademicDate(event.date),
        daysRemaining: days,
        urgency: days <= 7 ? "critical" : "warning",
      });
    }
  }

  // 2. Missing Pre-requisites (SCT status pending or failed for courses requiring SCT)
  // Connect directly to the canonical SCT Windows from events
  const upcomingSctWindows = upcoming.filter(
    (e) => e.subType === "sct_window" || e.cutoffType === "sct_window",
  );
  const nextSctWindow = upcomingSctWindows[0];

  for (const course of Object.values(courses)) {
    if (course.hasSct) {
      const sctStatus = state.sctStatus[course.code as CourseCode] || "pending";
      if (sctStatus !== "passed") {
        const isFailed = sctStatus === "failed";

        if (nextSctWindow) {
          const windowClosingDate = nextSctWindow.date;
          const daysToClose = getDaysRemaining(windowClosingDate, referenceDate);
          const windowStartDate = nextSctWindow.start
            ? nextSctWindow.start.slice(0, 10)
            : windowClosingDate;
          const isWindowActive =
            referenceDate >= windowStartDate && referenceDate <= windowClosingDate;

          // Extract Window Name (e.g. "Window 1")
          const windowNumMatch = nextSctWindow.title.match(/Window\s+(\d+)/i);
          const windowLabel = windowNumMatch ? `Window ${windowNumMatch[1]}` : "Upcoming Window";

          // Formatted date: "Oct 30"
          const deadlineFormatted = formatAcademicDate(windowClosingDate);

          items.push({
            id: `attn_sct_${course.code}`,
            type: "missing_prerequisite",
            title: isFailed
              ? `SCT RE-ATTEMPT REQUIRED (${windowLabel}) · ${course.code}`
              : `SCT PENDING (${windowLabel}) · ${course.code}`,
            courseCode: course.code,
            description: isWindowActive
              ? `${nextSctWindow.title} is OPEN NOW (${nextSctWindow.time}). Complete test before 18:00 IST on ${deadlineFormatted} for OPPE slot allocation.`
              : `${nextSctWindow.title} runs ${nextSctWindow.time}. Mandatory system check required for OPPE programming exams.`,
            date: windowClosingDate,
            deadlineFormatted,
            daysRemaining: Math.max(0, daysToClose),
            urgency:
              isWindowActive || daysToClose <= 7
                ? "critical"
                : daysToClose <= 21
                  ? "warning"
                  : "info",
          });
        } else {
          // All scheduled windows have elapsed
          items.push({
            id: `attn_sct_${course.code}`,
            type: "missing_prerequisite",
            title: `SCT CLOSED · ${course.code}`,
            courseCode: course.code,
            description: `All scheduled OPPE System Compatibility Test (SCT) windows have closed. Contact course team for dispensation.`,
            date: referenceDate,
            deadlineFormatted: "Closed",
            daysRemaining: -1,
            urgency: "critical",
          });
        }
      }
    }
  }

  // 3. Regular Assignment Due in the next 7 days
  for (const event of upcoming) {
    if (event.type === "assignment" || event.type === "bpt_deadline") {
      const days = getDaysRemaining(event.date, referenceDate);
      if (days <= 7 && days >= 0) {
        items.push({
          id: `attn_due_${event.id}`,
          type: "assignment_due",
          title: `ASSIGNMENT DUE · ${event.title}`,
          courseCode: event.courseCode,
          description: event.description,
          date: event.date,
          deadlineFormatted: formatAcademicDate(event.date),
          daysRemaining: days,
          urgency: "info",
        });
      }
    }
  }

  // Sort by urgency then days remaining
  const priorityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return items
    .sort((a, b) => {
      const pDiff = priorityOrder[a.urgency] - priorityOrder[b.urgency];
      if (pDiff !== 0) return pDiff;
      return a.daysRemaining - b.daysRemaining;
    })
    .slice(0, 5); // Keep dashboard focused on top 5 items
}

/**
 * Derives chronological list of up-next events
 */
export function selectUpNextEvents(
  referenceDate: string,
  limit = 6,
  events: AcademicEvent[] = CANONICAL_EVENTS,
): AcademicEvent[] {
  return getUpcomingEvents(events, referenceDate).slice(0, limit);
}

/**
 * Derives CS2006P project summary
 */
export function selectProjectSummary(state: PersistedUserState): ProjectSummary {
  const pState = state.projectState;
  const track = pState.track;
  const trackConfig = track ? PROJECT_TRACKS[track] : null;

  // Determine current stage from completedStageIds
  let currentStage = PROJECT_STAGES[0];
  for (const stage of PROJECT_STAGES) {
    if (!pState.completedStageIds.includes(stage.id)) {
      currentStage = stage;
      break;
    }
  }

  const gradeResult = evaluateProjectGrade(track, pState.l1Score, pState.l2Score);

  return {
    track,
    trackName: trackConfig ? trackConfig.name : "Track Not Selected",
    submissionDeadline: trackConfig ? trackConfig.submissionDeadline : null,
    currentStageId: currentStage.id,
    currentStageName: currentStage.name,
    nextStepDescription: currentStage.description,
    completedRequirementsCount: pState.checkedRequirements.length,
    totalRequirementsCount: TMA_V2_REQUIREMENTS.length,
    l1Score: pState.l1Score,
    l2Score: pState.l2Score,
    statusDescription: gradeResult.statusDescription,
  };
}
