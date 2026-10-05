import type { AssessmentRecord, AssessmentDefinition } from "@/types/assessment";
import type { Course, CourseCode } from "@/types/course";
import { getAssessmentsForCourse } from "@/data/assessments";
import { getEventById } from "@/data/events";
import { SEMESTER_CONFIG } from "@/data/semester";
import { formatAcademicDate } from "@/lib/datetime";

export type CourseCardAction = {
  assessment: AssessmentDefinition;
  label: string;
  reason: string;
  dueDate: string;
  overdue: boolean;
} | null;
const dateFor = (a: AssessmentDefinition) =>
  a.eventId
    ? getEventById(a.eventId)?.date
    : a.weekNumber
      ? SEMESTER_CONFIG.weeks[a.weekNumber - 1]?.assignmentDeadline
      : undefined;
const shortName = (a: AssessmentDefinition) =>
  a.name.match(/\b(A\d+|Quiz \d+|OPPE ?\d*|BPT \d+)\b/i)?.[1] ??
  (a.weekNumber && ["weekly_objective", "programming_grpa"].includes(a.type)
    ? `A${a.weekNumber}`
    : a.name.replace(/^Week \d+ /, ""));

export function getNextRequiredInput(
  course: Course,
  records: Record<string, AssessmentRecord>,
  referenceDate: string,
): CourseCardAction {
  const dated = getAssessmentsForCourse(course.code)
    .filter((a) => a.type !== "end_term")
    .map((assessment) => ({ assessment, dueDate: dateFor(assessment) }))
    .filter((x) => typeof x.dueDate === "string") as {
    assessment: AssessmentDefinition;
    dueDate: string;
  }[];
  dated.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const missing = (assessment: AssessmentDefinition) =>
    !records[assessment.id] || records[assessment.id].status === "pending";
  const overdue = dated.find(
    ({ assessment, dueDate }) => dueDate <= referenceDate && missing(assessment),
  );
  if (overdue)
    return {
      ...overdue,
      label: shortName(overdue.assessment),
      reason: `${shortName(overdue.assessment)} score missing`,
      overdue: true,
    };
  const upcoming = dated.find(
    ({ assessment, dueDate }) => dueDate >= referenceDate && missing(assessment),
  );
  return upcoming
    ? {
        ...upcoming,
        label: shortName(upcoming.assessment),
        reason: `Next · ${shortName(upcoming.assessment)}`,
        overdue: false,
      }
    : null;
}

export function getRecentMissingAssessments(
  courseCode: CourseCode,
  records: Record<string, AssessmentRecord>,
  referenceDate: string,
) {
  return (
    getAssessmentsForCourse(courseCode)
      .map((assessment) => ({ assessment, dueDate: dateFor(assessment) }))
      .filter(
        (x) =>
          typeof x.dueDate === "string" &&
          x.dueDate <= referenceDate &&
          (!records[x.assessment.id] || records[x.assessment.id].status === "pending"),
      ) as { assessment: AssessmentDefinition; dueDate: string }[]
  )
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 2);
}
export function getAssessmentLabel(a: AssessmentDefinition) {
  const name =
    a.type === "programming_grpa"
      ? "Graded Programming Assignment"
      : a.type === "weekly_objective"
        ? "Weekly Graded Assessment"
        : a.type === "quiz"
          ? "Quiz"
          : a.type === "oppe"
            ? "OPPE"
            : a.type === "end_term"
              ? "End Term"
              : a.name.replace(/^Week \d+ /, "");
  return `${shortName(a)} · ${name}`;
}

export function formatAssessmentDeadline(date: string) {
  return `Due ${formatAcademicDate(date)}`;
}
