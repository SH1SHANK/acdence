import { SEPT_2026_GRADING_METADATA } from "./metadata";
import { CANONICAL_EVENTS } from "./events";

export interface AcademicWeek {
  weekNumber: number;
  title: string;
  contentReleaseDate: string;
  assignmentDeadline: string;
  startDate: string;
  endDate: string; // assignment deadline or week ending
  notes?: string;
}

export interface SemesterConfig {
  term: string;
  year: number;
  registrationStartDate: string;
  registrationEndDate: string;
  contentStartDate: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  weeks: AcademicWeek[];
}

export const SEMESTER_CONFIG: SemesterConfig = {
  term: "September",
  year: 2026,
  registrationStartDate: "2026-09-22",
  registrationEndDate: "2026-09-23",
  contentStartDate: "2026-10-02",
  startDate: "2026-10-02",
  endDate: "2027-01-10",
  totalWeeks: 12,
  weeks: [
    {
      weekNumber: 1,
      title: "Week 1",
      contentReleaseDate: "2026-10-02",
      assignmentDeadline: "2026-10-11",
      startDate: "2026-10-02",
      endDate: "2026-10-11",
      notes: "Content releases Friday Oct 2; Deadline Sunday Oct 11",
    },
    {
      weekNumber: 2,
      title: "Week 2",
      contentReleaseDate: "2026-10-09",
      assignmentDeadline: "2026-10-18",
      startDate: "2026-10-12",
      endDate: "2026-10-18",
      notes: "Course drop window closes Oct 18",
    },
    {
      weekNumber: 3,
      title: "Week 3",
      contentReleaseDate: "2026-10-16",
      assignmentDeadline: "2026-10-25",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
    },
    {
      weekNumber: 4,
      title: "Week 4",
      contentReleaseDate: "2026-10-23",
      assignmentDeadline: "2026-11-01",
      startDate: "2026-10-26",
      endDate: "2026-11-01",
      notes: "OPPE 1 eligibility closes (W1-W4 assignments)",
    },
    {
      weekNumber: 5,
      title: "Week 5",
      contentReleaseDate: "2026-10-30",
      assignmentDeadline: "2026-11-11",
      startDate: "2026-11-02",
      endDate: "2026-11-11",
      notes: "Adjusted Wednesday deadline before Quiz 1",
    },
    {
      weekNumber: 6,
      title: "Week 6",
      contentReleaseDate: "2026-11-06",
      assignmentDeadline: "2026-11-18",
      startDate: "2026-11-12",
      endDate: "2026-11-18",
      notes: "Adjusted Wednesday deadline before OPPE 1",
    },
    {
      weekNumber: 7,
      title: "Week 7",
      contentReleaseDate: "2026-11-13",
      assignmentDeadline: "2026-11-25",
      startDate: "2026-11-19",
      endDate: "2026-11-25",
      notes: "End Term eligibility closes (Best 5 of 7)",
    },
    {
      weekNumber: 8,
      title: "Week 8",
      contentReleaseDate: "2026-11-20",
      assignmentDeadline: "2026-11-29",
      startDate: "2026-11-26",
      endDate: "2026-11-29",
      notes: "OPPE 2 eligibility closes",
    },
    {
      weekNumber: 9,
      title: "Week 9",
      contentReleaseDate: "2026-11-27",
      assignmentDeadline: "2026-12-06",
      startDate: "2026-11-30",
      endDate: "2026-12-06",
    },
    {
      weekNumber: 10,
      title: "Week 10",
      contentReleaseDate: "2026-12-04",
      assignmentDeadline: "2026-12-13",
      startDate: "2026-12-07",
      endDate: "2026-12-13",
      notes: "GAA calculation closes",
    },
    {
      weekNumber: 11,
      title: "Week 11",
      contentReleaseDate: "2026-12-11",
      assignmentDeadline: "2026-12-23",
      startDate: "2026-12-14",
      endDate: "2026-12-20",
    },
    {
      weekNumber: 12,
      title: "Week 12",
      contentReleaseDate: "2026-12-11",
      assignmentDeadline: "2026-12-23",
      startDate: "2026-12-21",
      endDate: "2026-12-23",
      notes: "Combined final Wednesday deadline with W11 (both content released Dec 11)",
    },
  ],
};

export function isPreSemester(dateString: string): boolean {
  return dateString < SEMESTER_CONFIG.contentStartDate;
}

export function getWeekForDate(dateString: string): AcademicWeek | undefined {
  return SEMESTER_CONFIG.weeks.find((w) => dateString >= w.startDate && dateString <= w.endDate);
}

export function getSemesterEvents() {
  return CANONICAL_EVENTS;
}

export const SEMESTER_SOURCE = SEPT_2026_GRADING_METADATA;
