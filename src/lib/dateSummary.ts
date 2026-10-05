import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";

const ENROLLED_THEORY_COURSES: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];

export interface SharedDeadlineItem {
  courseCode: CourseCode;
  title: string;
  time: string;
}

export interface DateSummary {
  date: string;
  eventCount: number;
  courseCount: number;
  deadlineCount: number;
  hasHardCutoff: boolean;
  hasExam: boolean;
  isSharedDeadline: boolean;
  courses: CourseCode[];
  events: AcademicEvent[];
  deadlineItems: SharedDeadlineItem[];
}

/**
 * Derives comprehensive summary of academic events for a specific date (YYYY-MM-DD)
 * Pure, deterministic function
 */
export function getDateSummary(events: AcademicEvent[], date: string): DateSummary {
  const normalizedDate = date.slice(0, 10);

  // Find all events occurring on this date
  const dayEvents = events.filter((e) => {
    const eDate = e.date ? e.date.slice(0, 10) : "";
    const eStart = e.start ? e.start.slice(0, 10) : "";
    const eEnd = e.end ? e.end.slice(0, 10) : "";
    return eDate === normalizedDate || eStart === normalizedDate || eEnd === normalizedDate;
  });

  const hasHardCutoff = dayEvents.some((e) =>
    Boolean(e.hardCutoff || (e as { isHardCutoff?: boolean }).isHardCutoff),
  );

  const hasExam = dayEvents.some((e) => {
    return (
      e.type === "exam" ||
      e.type === "viva" ||
      (e as any).subType?.includes("quiz") ||
      (e as any).subType?.includes("oppe") ||
      (e as any).subType?.includes("end_term")
    );
  });

  // Collect deadline items and identify courses
  const courseSet = new Set<CourseCode>();
  const deadlineItems: SharedDeadlineItem[] = [];

  let isWeeklySundayDeadline = false;

  for (const ev of dayEvents) {
    if (ev.courseCode) {
      courseSet.add(ev.courseCode);
    }

    if (ev.id.startsWith("assignment_weekly_") || (ev.type === "assignment" && !ev.courseCode)) {
      isWeeklySundayDeadline = true;
      // Expands across the 4 enrolled theory courses
      for (const c of ENROLLED_THEORY_COURSES) {
        courseSet.add(c);
        deadlineItems.push({
          courseCode: c,
          title: `${c} Weekly Assignment`,
          time: ev.time || "23:59 IST",
        });
      }
    } else if (
      ev.type === "assignment" ||
      ev.type === "bpt_deadline" ||
      ev.type === "project_submission"
    ) {
      if (ev.courseCode) {
        deadlineItems.push({
          courseCode: ev.courseCode,
          title: ev.title,
          time: ev.time || "23:59 IST",
        });
      }
    }
  }

  const courses = Array.from(courseSet);
  const isSharedDeadline = isWeeklySundayDeadline || deadlineItems.length >= 2;

  return {
    date: normalizedDate,
    eventCount: dayEvents.length,
    courseCount: courses.length,
    deadlineCount: deadlineItems.length,
    hasHardCutoff,
    hasExam,
    isSharedDeadline,
    courses,
    events: dayEvents,
    deadlineItems,
  };
}
