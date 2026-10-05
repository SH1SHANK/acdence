import { getSupabase } from "@/lib/supabase";
import type { Course, CourseCode, GaaPolicy } from "@/types/course";
import type { AcademicWeek, SemesterConfig } from "@/data/semester";
import type { AssessmentDefinition, AssessmentType } from "@/types/assessment";
import type { AcademicEvent, EventImportance, EventType, HardCutoffType } from "@/types/events";
import type { SourceMetadata } from "@/types/metadata";
import { DEFAULT_TERM_ID } from "./gradeRepository";

// Static fallback seed data if offline on first cold boot
import { SEMESTER_CONFIG } from "@/data/semester";
import { COURSES } from "@/data/courses";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";
import { CANONICAL_EVENTS } from "@/data/events";

export const ACADEMIC_CACHE_KEY = "acdence_academic_data_cache_v1";

export interface CanonicalAcademicSnapshot {
  termId: string;
  termConfig: SemesterConfig;
  weeks: AcademicWeek[];
  courses: Record<CourseCode, Course>;
  assessments: AssessmentDefinition[];
  events: AcademicEvent[];
  fetchedAt: string;
  isFromCache?: boolean;
}

/**
 * Reads the cached academic data snapshot from localStorage.
 */
export function getCachedAcademicData(): CanonicalAcademicSnapshot | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(ACADEMIC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.termConfig && parsed.courses) {
      return { ...parsed, isFromCache: true };
    }
  } catch {
    // Ignore JSON parse errors on cache
  }
  return null;
}

/**
 * Saves the canonical academic data snapshot into localStorage cache.
 */
export function saveCachedAcademicData(snapshot: CanonicalAcademicSnapshot): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ACADEMIC_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota warnings
  }
}

/**
 * Fallback initial academic snapshot constructed from repository seed data.
 */
export function getInitialAcademicSnapshot(
  termId: string = DEFAULT_TERM_ID,
): CanonicalAcademicSnapshot {
  const cached = getCachedAcademicData();
  if (cached && cached.termId === termId) {
    return cached;
  }

  return {
    termId,
    termConfig: SEMESTER_CONFIG,
    weeks: SEMESTER_CONFIG.weeks,
    courses: COURSES,
    assessments: ASSESSMENT_DEFINITIONS,
    events: CANONICAL_EVENTS,
    fetchedAt: new Date().toISOString(),
    isFromCache: true,
  };
}

// =========================================================================
// Supabase Canonical Academic Data Fetchers
// =========================================================================

/**
 * Fetches the canonical term and weekly schedule from Supabase.
 */
export async function fetchTermSchedule(termId: string = DEFAULT_TERM_ID): Promise<{
  termConfig: SemesterConfig;
  weeks: AcademicWeek[];
}> {
  const supabase = getSupabase();

  const [termRes, weeksRes] = await Promise.all([
    supabase.from("terms").select("*").eq("id", termId).maybeSingle(),
    supabase
      .from("academic_weeks")
      .select("*")
      .eq("term_id", termId)
      .order("week_number", { ascending: true }),
  ]);

  if (termRes.error) throw new Error(`Failed to fetch term: ${termRes.error.message}`);
  if (weeksRes.error) throw new Error(`Failed to fetch weeks: ${weeksRes.error.message}`);

  const weeks: AcademicWeek[] = (weeksRes.data || []).map((row: any) => ({
    weekNumber: Number(row.week_number),
    title: String(row.title),
    contentReleaseDate: String(row.content_release_date),
    assignmentDeadline: String(row.assignment_deadline),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    notes: row.notes || undefined,
  }));

  const termRow = termRes.data;
  const termConfig: SemesterConfig = termRow
    ? {
        term: String(termRow.term_name),
        year: Number(termRow.year),
        registrationStartDate: String(termRow.registration_start_date),
        registrationEndDate: String(termRow.registration_end_date),
        contentStartDate: String(termRow.content_start_date),
        startDate: String(termRow.start_date),
        endDate: String(termRow.end_date),
        totalWeeks: Number(termRow.total_weeks || weeks.length || 12),
        weeks: weeks.length > 0 ? weeks : SEMESTER_CONFIG.weeks,
      }
    : SEMESTER_CONFIG;

  return { termConfig, weeks: weeks.length > 0 ? weeks : SEMESTER_CONFIG.weeks };
}

/**
 * Fetches canonical courses from Supabase.
 */
export async function fetchCourses(
  termId: string = DEFAULT_TERM_ID,
): Promise<Record<CourseCode, Course>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("courses").select("*").eq("term_id", termId);

  if (error) throw new Error(`Failed to fetch courses: ${error.message}`);

  if (!data || data.length === 0) {
    return COURSES;
  }

  const result: Partial<Record<CourseCode, Course>> = {};

  for (const row of data as any[]) {
    const code = String(row.course_code) as CourseCode;
    result[code] = {
      code,
      name: String(row.name),
      credits: Number(row.credits),
      type: row.course_type === "project" ? "project" : "theory",
      hasSct: Boolean(row.has_sct),
      gaaPolicy: (row.gaa_policy as GaaPolicy) || undefined,
      source: (row.source as SourceMetadata) || {
        documentName: "Grading-Pattern-Document-Sept-2026.pdf",
        documentSection: row.name,
        page: "Official Document",
      },
    };
  }

  return { ...COURSES, ...result } as Record<CourseCode, Course>;
}

/**
 * Fetches canonical assessment definitions from Supabase.
 */
export async function fetchAssessmentDefinitions(
  termId: string = DEFAULT_TERM_ID,
  courseCode?: string,
): Promise<AssessmentDefinition[]> {
  const supabase = getSupabase();
  let query = supabase.from("assessment_definitions").select("*").eq("term_id", termId);

  if (courseCode) {
    query = query.eq("course_code", courseCode);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch assessment definitions: ${error.message}`);

  if (!data || data.length === 0) {
    return courseCode
      ? ASSESSMENT_DEFINITIONS.filter((a) => a.courseCode === courseCode)
      : ASSESSMENT_DEFINITIONS;
  }

  return (data as any[]).map((row) => ({
    id: String(row.id),
    courseCode: String(row.course_code) as CourseCode,
    name: String(row.name),
    type: String(row.assessment_type) as AssessmentType,
    maxScore: Number(row.max_score),
    weekNumber: row.week_number ? Number(row.week_number) : undefined,
    eventId: row.event_id ? String(row.event_id) : undefined,
    weightDescription: row.weight_description ? String(row.weight_description) : undefined,
    source: (row.source as SourceMetadata) || {
      documentName: "Grading-Pattern-Document-Sept-2026.pdf",
      documentSection: row.name,
      page: "Official Document",
    },
  }));
}

/**
 * Fetches canonical academic events and deadlines from Supabase.
 */
export async function fetchAcademicEvents(
  termId: string = DEFAULT_TERM_ID,
  courseCode?: string,
): Promise<AcademicEvent[]> {
  const supabase = getSupabase();
  let query = supabase.from("academic_events").select("*").eq("term_id", termId);

  if (courseCode) {
    query = query.eq("course_code", courseCode);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch academic events: ${error.message}`);

  if (!data || data.length === 0) {
    return courseCode
      ? CANONICAL_EVENTS.filter((e) => !e.courseCode || e.courseCode === courseCode)
      : CANONICAL_EVENTS;
  }

  return (data as any[]).map((row) => ({
    id: String(row.id),
    courseCode: row.course_code ? (String(row.course_code) as CourseCode) : undefined,
    title: String(row.title),
    type: String(row.event_type) as EventType,
    subType: row.sub_type ? String(row.sub_type) : undefined,
    start: row.start_time ? String(row.start_time) : String(row.event_date),
    end: row.end_time ? String(row.end_time) : undefined,
    date: String(row.event_date),
    time: row.time_str ? String(row.time_str) : undefined,
    importance: (row.importance as EventImportance) || "medium",
    hardCutoff: Boolean(row.is_hard_cutoff),
    isHardCutoff: Boolean(row.is_hard_cutoff),
    cutoffType: (row.cutoff_type as HardCutoffType) || undefined,
    description: row.description ? String(row.description) : "",
    source: (row.source as SourceMetadata) || {
      documentName: "Grading-Pattern-Document-Sept-2026.pdf",
      documentSection: row.title,
      page: "Official Document",
    },
  }));
}

/**
 * Fetches the entire canonical academic snapshot for the term from Supabase.
 * Updates local storage cache upon success.
 *
 * Flow:
 * 1. Fetch from Supabase (Terms, Weeks, Courses, Assessments, Events)
 * 2. If successful: Supabase wins -> updates local cache -> returns confirmed snapshot.
 * 3. If offline/error: returns local cache if present, else initial seed data.
 */
export async function fetchFullAcademicSnapshot(
  termId: string = DEFAULT_TERM_ID,
): Promise<CanonicalAcademicSnapshot> {
  try {
    const [schedule, courses, assessments, events] = await Promise.all([
      fetchTermSchedule(termId),
      fetchCourses(termId),
      fetchAssessmentDefinitions(termId),
      fetchAcademicEvents(termId),
    ]);

    const snapshot: CanonicalAcademicSnapshot = {
      termId,
      termConfig: schedule.termConfig,
      weeks: schedule.weeks,
      courses,
      assessments,
      events,
      fetchedAt: new Date().toISOString(),
      isFromCache: false,
    };

    // Update local cache with canonical database snapshot
    saveCachedAcademicData(snapshot);

    return snapshot;
  } catch (err: unknown) {
    console.warn(
      `[academicRepository] Remote fetch failed, falling back to cache:`,
      err instanceof Error ? err.message : String(err),
    );

    const cached = getCachedAcademicData();
    if (cached && cached.termId === termId) {
      return { ...cached, isFromCache: true };
    }

    return getInitialAcademicSnapshot(termId);
  }
}
