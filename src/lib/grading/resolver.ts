import type { AssessmentDefinition, AssessmentRecord, AssessmentStatus } from "@/types/assessment";
import type { DbGradeRecord, GradeResolutionResult } from "@/types/gradeRecord";

/**
 * Normalizes title and module strings for fuzzy matching.
 */
function normalizeText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .trim();
}

/**
 * Heuristic fallback resolver when canonical_assessment_id is not present or unmatched.
 */
function heuristicMatchDefinition(
  record: DbGradeRecord,
  knownDefinitions: AssessmentDefinition[],
): AssessmentDefinition | undefined {
  const courseCode = String(record.course_code || "")
    .toUpperCase()
    .trim();
  const defsForCourse = knownDefinitions.filter((d) => d.courseCode.toUpperCase() === courseCode);
  if (defsForCourse.length === 0) return undefined;

  const normTitle = normalizeText(record.title);
  const normModule = normalizeText(record.module);

  // Extract week number from module or title if present
  const weekMatch =
    normModule.match(/week\s*(\d+)/) ||
    normTitle.match(/week\s*(\d+)/) ||
    normTitle.match(/w\s*(\d+)/);
  const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : undefined;

  // Explicitly ignore non-graded practice, activity questions, and surveys
  const isExplicitlyNotGraded =
    normTitle.includes("not graded") ||
    normTitle.includes("practice") ||
    normTitle.includes("survey") ||
    normTitle.includes("feedback") ||
    normTitle.includes("activity question") ||
    normTitle.includes("aq ") ||
    /^aq\s*\d+/.test(normTitle);

  if (isExplicitlyNotGraded) {
    return undefined;
  }

  // 1. Quizzes & Exams
  if (normTitle.includes("quiz 1") || normTitle.includes("quiz_1") || normTitle.includes("quiz1")) {
    return defsForCourse.find(
      (d) => d.type === "quiz" && (d.id.includes("quiz_01") || d.id.includes("quiz_1")),
    );
  }
  if (normTitle.includes("quiz 2") || normTitle.includes("quiz_2") || normTitle.includes("quiz2")) {
    return defsForCourse.find(
      (d) => d.type === "quiz" && (d.id.includes("quiz_02") || d.id.includes("quiz_2")),
    );
  }
  if (normTitle.includes("re oppe") || normTitle.includes("reoppe")) {
    return defsForCourse.find((d) => d.type === "reoppe" || d.id.includes("reoppe"));
  }
  if (
    normTitle.includes("oppe 1") ||
    normTitle.includes("oppe_1") ||
    (normTitle.includes("oppe") && courseCode === "SE2001")
  ) {
    return defsForCourse.find(
      (d) =>
        d.type === "oppe" &&
        (d.id.includes("oppe_01") || d.id.includes("oppe_1") || d.id.includes("oppe")),
    );
  }
  if (normTitle.includes("oppe 2") || normTitle.includes("oppe_2")) {
    return defsForCourse.find(
      (d) => d.type === "oppe" && (d.id.includes("oppe_02") || d.id.includes("oppe_2")),
    );
  }
  if (
    normTitle.includes("end term") ||
    normTitle.includes("endterm") ||
    normTitle.includes("final exam")
  ) {
    return defsForCourse.find((d) => d.type === "end_term" || d.id.includes("end_term"));
  }

  // 2. Biweekly Programming Tests (BPTs for SE2001)
  if (courseCode === "SE2001" && (normTitle.includes("bpt") || normTitle.includes("biweekly"))) {
    if (normTitle.includes("1") || weekNum === 3)
      return defsForCourse.find((d) => d.id === "se2001_bpt_01");
    if (normTitle.includes("2") || weekNum === 5)
      return defsForCourse.find((d) => d.id === "se2001_bpt_02");
    if (normTitle.includes("3") || weekNum === 7)
      return defsForCourse.find((d) => d.id === "se2001_bpt_03");
    if (normTitle.includes("4") || weekNum === 10)
      return defsForCourse.find((d) => d.id === "se2001_bpt_04");
  }

  // 3. Programming Assignments (GrPAs for CS2005 / PAs for CS2006)
  const isProgramming =
    record.assignment_type?.toLowerCase().includes("programming") ||
    normTitle.includes("grpa") ||
    normTitle.includes("programming") ||
    /\bpa\s*\d+/i.test(normTitle);

  if (courseCode === "CS2005" && isProgramming && weekNum) {
    return defsForCourse.find((d) => d.type === "programming_grpa" && d.weekNumber === weekNum);
  }

  if (courseCode === "CS2006" && isProgramming && (weekNum === 1 || weekNum === 2)) {
    return defsForCourse.find((d) => d.id === `cs2006_pa_0${weekNum}`);
  }

  // 4. Weekly Graded Assessments (Objective / GA)
  if (weekNum) {
    const weeklyDef = defsForCourse.find(
      (d) => d.type === "weekly_objective" && d.weekNumber === weekNum,
    );
    if (weeklyDef) return weeklyDef;
  }

  return undefined;
}

/**
 * Resolves raw portal DbGradeRecord items into canonical AssessmentRecords.
 *
 * Scoring and Invariant Rules:
 * 1. Read-Only Pure Function: Never mutates inputs.
 * 2. Strict Score Semantics:
 *    - `your_score !== null` (including real 0.0) -> `status: "present"`, `score: your_score`
 *    - `your_score === null && score_status === "ABSENT"` -> `status: "absent"`, `score: 0`
 *    - `your_score === null` -> `status: "pending"`, `score: null`
 *    - NEVER coerce null to 0!
 * 3. Unmatched Preservation:
 *    - Unmatched records are placed in `unmatchedGrades` without altering grading formulas.
 *
 * @param gradeRecords Array of DbGradeRecord from Supabase public.grade_records
 * @param knownDefinitions Array of AssessmentDefinition registered in Acdence
 * @returns GradeResolutionResult
 */
export function resolveGradeRecordsToAssessments(
  gradeRecords: DbGradeRecord[],
  knownDefinitions: AssessmentDefinition[],
): GradeResolutionResult {
  const assessmentRecords: Record<string, AssessmentRecord> = {};
  const matchedGradeDetails: Record<string, DbGradeRecord> = {};
  const unmatchedGrades: DbGradeRecord[] = [];

  // Initialize all known definitions with default pending records
  for (const def of knownDefinitions) {
    assessmentRecords[def.id] = {
      assessmentId: def.id,
      status: "pending",
      score: null,
    };
  }

  const defsById = new Map<string, AssessmentDefinition>();
  for (const def of knownDefinitions) {
    defsById.set(def.id.toLowerCase().trim(), def);
  }

  for (const record of gradeRecords) {
    if (!record) continue;

    let matchedDef: AssessmentDefinition | undefined;

    // 1. Direct canonical assessment ID matching
    if (record.canonical_assessment_id) {
      const canonicalKey = record.canonical_assessment_id.toLowerCase().trim();
      matchedDef = defsById.get(canonicalKey);
    }

    // 2. Fallback heuristic matching
    if (!matchedDef) {
      matchedDef = heuristicMatchDefinition(record, knownDefinitions);
    }

    // 3. Process matched vs unmatched
    if (matchedDef) {
      let status: AssessmentStatus = "pending";
      let resolvedScore: number | null = null;

      const isAbsentStatus = String(record.score_status || "").toUpperCase() === "ABSENT";

      if (isAbsentStatus) {
        status = "absent";
        resolvedScore = 0;
      } else if (typeof record.your_score === "number" && Number.isFinite(record.your_score)) {
        status = "present";
        resolvedScore = record.your_score;
      } else {
        status = "pending";
        resolvedScore = null;
      }

      const submissionDate = record.captured_at || record.due_date || undefined;

      assessmentRecords[matchedDef.id] = {
        assessmentId: matchedDef.id,
        status,
        score: resolvedScore,
        submissionDate,
      };

      matchedGradeDetails[matchedDef.id] = record;
    } else {
      unmatchedGrades.push(record);
    }
  }

  return {
    assessmentRecords,
    unmatchedGrades,
    matchedGradeDetails,
    stats: {
      totalRecords: gradeRecords.length,
      matchedCount: Object.keys(matchedGradeDetails).length,
      unmatchedCount: unmatchedGrades.length,
    },
  };
}
