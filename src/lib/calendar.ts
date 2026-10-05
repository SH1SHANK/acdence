import type { AcademicEvent, EventType } from "@/types/events";
import type { CourseCode } from "@/types/course";

/**
 * Normalizes date comparison string (handles YYYY-MM-DD or full ISO datetime)
 */
function normalizeDate(d: string): string {
  return d.length > 10 ? d.slice(0, 10) : d;
}

/**
 * Checks if a date string is strictly in the past relative to referenceDate
 */
export function isPast(dateString: string, referenceDate: string): boolean {
  return normalizeDate(dateString) < normalizeDate(referenceDate);
}

/**
 * Checks if a date string is today or in the future relative to referenceDate
 */
export function isUpcoming(dateString: string, referenceDate: string): boolean {
  return normalizeDate(dateString) >= normalizeDate(referenceDate);
}

/**
 * Returns all upcoming events (today or later) sorted chronologically
 */
export function getUpcomingEvents(events: AcademicEvent[], referenceDate: string): AcademicEvent[] {
  const normRef = normalizeDate(referenceDate);
  return events
    .filter((e) => normalizeDate(e.date) >= normRef)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/**
 * Returns events occurring strictly within [startDate, endDate] inclusive
 */
export function getEventsBetween(
  events: AcademicEvent[],
  startDate: string,
  endDate: string,
): AcademicEvent[] {
  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);
  return events
    .filter((e) => {
      const d = normalizeDate(e.date);
      return d >= normStart && d <= normEnd;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/**
 * Returns the immediate next upcoming event (or null if none remaining)
 */
export function getNextEvent(
  events: AcademicEvent[],
  referenceDate: string,
  filter?: (e: AcademicEvent) => boolean,
): AcademicEvent | null {
  const upcoming = getUpcomingEvents(events, referenceDate);
  const filtered = filter ? upcoming.filter(filter) : upcoming;
  return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Returns the immediate next hard cutoff (or null if none remaining)
 */
export function getNextHardCutoff(
  events: AcademicEvent[],
  referenceDate: string,
  courseCode?: CourseCode,
): AcademicEvent | null {
  return getNextEvent(events, referenceDate, (e) => {
    const isHard = e.hardCutoff || e.isHardCutoff;
    if (!isHard) return false;
    if (courseCode && e.courseCode && e.courseCode !== courseCode) return false;
    return true;
  });
}

/**
 * Filters events by course code (includes semester-wide events where courseCode is undefined)
 */
export function getEventsForCourse(
  events: AcademicEvent[],
  courseCode: CourseCode,
): AcademicEvent[] {
  return events
    .filter((e) => !e.courseCode || e.courseCode === courseCode)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/**
 * Filters events by exact EventType
 */
export function getEventsByType(events: AcademicEvent[], type: EventType): AcademicEvent[] {
  return events
    .filter((e) => e.type === type)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
