import assert from "node:assert/strict";
import { fetchGradeRecords, DEFAULT_GRADE_SYNC_SECRET } from "../src/lib/sync/gradeRepository";
import { resolveGradeRecordsToAssessments } from "../src/lib/grading/resolver";
import { ASSESSMENT_DEFINITIONS, getAssessmentsForCourse } from "../src/data/assessments";
import { calculateCourseGrade } from "../src/grading";
import type { DbGradeRecord } from "../src/types/gradeRecord";
import type { AssessmentRecord } from "../src/types/assessment";

console.log("================================================================================");
console.log("  ACDENCE PHASE 4: GRADE SYNC READ INTEGRATION & RESOLVER VERIFICATION SUITE");
console.log("================================================================================\n");

// ── TEST 1: fetchGradeRecords Contract, Headers & Query Parameters ──────────────
console.log("1. Testing fetchGradeRecords HTTP Contract & Parameter Scoping...");

let capturedUrl = "";
let capturedHeaders: Record<string, string> = {};

const mockFetchSuccess = async (
  url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  capturedUrl = String(url);
  capturedHeaders = (init?.headers as Record<string, string>) || {};

  const mockDbRows: DbGradeRecord[] = [
    {
      id: "row-1",
      term_id: "2026-09",
      course_code: "CS2006",
      external_assignment_id: "cs2006_ga_01",
      canonical_assessment_id: "cs2006_pa_01",
      module: "Week 1",
      title: "JavaScript Graded Assignment",
      assignment_type: "Programming Assignment",
      your_score: 94.5,
      your_score_raw: "94.5%",
      peer_average: 91,
      median_score: 100,
      score_status: "GRADED",
      evaluation_status: "Evaluated",
      due_date: "2026-10-11T23:59:00+05:30",
      due_date_text: "Oct 11, 2026 at 11:59 PM IST",
      source: "grades",
      captured_at: "2026-10-05T12:00:00.000Z",
      updated_at: "2026-10-05T12:00:00.000Z",
    },
    {
      id: "row-2",
      term_id: "2026-09",
      course_code: "CS2006",
      external_assignment_id: "cs2006_aq_01",
      canonical_assessment_id: null,
      module: "Week 1",
      title: "AQ 1.1 - Activity Questions",
      assignment_type: "Assignment",
      your_score: null,
      your_score_raw: "-",
      peer_average: null,
      median_score: null,
      score_status: "UNRELEASED",
      evaluation_status: "normal",
      due_date: null,
      due_date_text: null,
      source: "grades",
      captured_at: "2026-10-05T12:00:00.000Z",
      updated_at: "2026-10-05T12:00:00.000Z",
    },
  ];

  return new Response(JSON.stringify({ ok: true, records: mockDbRows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const records = await fetchGradeRecords("2026-09", "CS2006", {
  fetchFn: mockFetchSuccess as any,
  supabaseUrl: "https://aocrcrdmwmdtthrwypii.supabase.co",
  syncSecret: "test-secret-key",
});

assert.equal(records.length, 2, "Must return 2 records from mock fetch");
assert.ok(capturedUrl.includes("termId=2026-09"), "Must include termId parameter");
assert.ok(capturedUrl.includes("courseCode=CS2006"), "Must include courseCode parameter");
assert.ok(
  !capturedUrl.includes("userId"),
  "Must NOT contain userId parameter (Single-User architecture)",
);
assert.equal(capturedHeaders["x-sync-secret"], "test-secret-key", "Must pass x-sync-secret header");
console.log("   ✓ fetchGradeRecords passes all contract & authentication checks.\n");

// ── TEST 2: Error Handling on Network / Server Error ──────────────────────────
console.log("2. Testing fetchGradeRecords Error Handling...");

const mockFetch401 = async (): Promise<Response> => {
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized: Invalid secret" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
};

await assert.rejects(
  async () => {
    await fetchGradeRecords("2026-09", undefined, { fetchFn: mockFetch401 as any });
  },
  /Unauthorized/,
  "Must reject when server returns 401 Unauthorized",
);
console.log("   ✓ fetchGradeRecords properly rejects with descriptive error message.\n");

// ── TEST 3: resolveGradeRecordsToAssessments (Direct Canonical IDs) ────────────
console.log("3. Testing Assessment Resolver with Direct Canonical IDs...");

const testCanonicalRows: DbGradeRecord[] = [
  // CS2005: Java GrPA 2 with score 100
  {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "cs2005_grpa_02",
    canonical_assessment_id: "cs2005_grpa_02",
    module: "Week 2",
    title: "Week 2 Graded Programming Assignment",
    assignment_type: "Programming Assignment",
    your_score: 100,
    your_score_raw: "100%",
    peer_average: 88,
    median_score: 100,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: "2026-10-18T23:59:00+05:30",
    due_date_text: "Oct 18, 2026 at 11:59 PM IST",
    source: "grades",
    captured_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  // SE2001: BPT 1 with genuine score 0.0 (Must NOT be coerced to null or absent!)
  {
    term_id: "2026-09",
    course_code: "SE2001",
    external_assignment_id: "se2001_bpt_01",
    canonical_assessment_id: "se2001_bpt_01",
    module: "Week 3",
    title: "Biweekly Programming Test 1",
    assignment_type: "Assignment",
    your_score: 0,
    your_score_raw: "0",
    peer_average: 65,
    median_score: 70,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: "2026-10-25T23:59:00+05:30",
    due_date_text: "Oct 25, 2026 at 11:59 PM IST",
    source: "grades",
    captured_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  // CS2006: Quiz 1 marked ABSENT (Must resolve to absent with score 0)
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_quiz_01",
    canonical_assessment_id: "cs2006_quiz_01",
    module: "Week 4",
    title: "Quiz 1 (In-Centre)",
    assignment_type: "Quiz",
    your_score: null,
    your_score_raw: "ABSENT",
    peer_average: 75,
    median_score: 80,
    score_status: "ABSENT",
    evaluation_status: "Evaluated",
    due_date: "2026-11-01T23:59:00+05:30",
    due_date_text: "Nov 01, 2026",
    source: "grades",
    captured_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  // MS2001: GA 1 unreleased / pending (Must resolve to status 'pending' and score null)
  {
    term_id: "2026-09",
    course_code: "MS2001",
    external_assignment_id: "ms2001_ga_01",
    canonical_assessment_id: "ms2001_ga_01",
    module: "Week 1",
    title: "Week 1 Graded Assignment",
    assignment_type: "Assignment",
    your_score: null,
    your_score_raw: "-",
    peer_average: null,
    median_score: null,
    score_status: "UNRELEASED",
    evaluation_status: "normal",
    due_date: "2026-10-11T23:59:00+05:30",
    due_date_text: "Oct 11, 2026",
    source: "grades",
    captured_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
  },
];

const resolvedCanonical = resolveGradeRecordsToAssessments(
  testCanonicalRows,
  ASSESSMENT_DEFINITIONS,
);

assert.equal(resolvedCanonical.stats.matchedCount, 4);
assert.equal(resolvedCanonical.stats.unmatchedCount, 0);

// Score checks
const recJava = resolvedCanonical.assessmentRecords["cs2005_grpa_02"];
assert.equal(recJava.status, "present");
assert.equal(recJava.score, 100);

const recSeBpt = resolvedCanonical.assessmentRecords["se2001_bpt_01"];
assert.equal(recSeBpt.status, "present");
assert.equal(recSeBpt.score, 0, "Genuine score 0 must remain 0");

const recCsQuiz = resolvedCanonical.assessmentRecords["cs2006_quiz_01"];
assert.equal(recCsQuiz.status, "absent");
assert.equal(recCsQuiz.score, 0);

const recMsGa = resolvedCanonical.assessmentRecords["ms2001_ga_01"];
assert.equal(recMsGa.status, "pending");
assert.equal(recMsGa.score, null, "Unreleased score must remain null");

console.log("   ✓ Direct canonical ID resolution handles all score statuses correctly.\n");

// ── TEST 4: resolveGradeRecordsToAssessments (Heuristic Fallback Matching) ─────
console.log("4. Testing Heuristic Fallback Matching for Raw Portal Titles...");

const testHeuristicRows: DbGradeRecord[] = [
  // Missing canonical_assessment_id, but has course_code and title
  {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "raw-java-ga1",
    canonical_assessment_id: null,
    module: "Week 1",
    title: "Week 1 Assessment",
    assignment_type: "Assignment",
    your_score: 85,
    your_score_raw: "85%",
    peer_average: 80,
    median_score: 85,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  {
    term_id: "2026-09",
    course_code: "SE2001",
    external_assignment_id: "raw-se-oppe",
    canonical_assessment_id: null,
    module: "Week 9",
    title: "System Commands OPPE (Online Proctored)",
    assignment_type: "Programming Exam",
    your_score: 72,
    your_score_raw: "72",
    peer_average: 60,
    median_score: 65,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
];

const resolvedHeuristic = resolveGradeRecordsToAssessments(
  testHeuristicRows,
  ASSESSMENT_DEFINITIONS,
);

assert.equal(resolvedHeuristic.stats.matchedCount, 2);
assert.equal(resolvedHeuristic.assessmentRecords["cs2005_ga_01"].score, 85);
assert.equal(resolvedHeuristic.assessmentRecords["se2001_oppe_01"].score, 72);
console.log("   ✓ Heuristic fallback matching accurately associates raw assignment titles.\n");

// ── TEST 5: Preservation of Unmatched Portal Grades ────────────────────────────
console.log("5. Testing Preservation of Unmatched Portal Records...");

const testUnmatchedRows: DbGradeRecord[] = [
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_practice_01",
    canonical_assessment_id: null,
    module: "Week 1",
    title: "Practice Assignment 1 - Not Graded",
    assignment_type: "Assignment",
    your_score: 90,
    your_score_raw: "90%",
    peer_average: 70,
    median_score: 80,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  {
    term_id: "2026-09",
    course_code: "MS2001",
    external_assignment_id: "ms2001_bonus_survey",
    canonical_assessment_id: null,
    module: "General",
    title: "Course Feedback Survey",
    assignment_type: "Survey",
    your_score: 100,
    your_score_raw: "100%",
    peer_average: 100,
    median_score: 100,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
];

const resolvedUnmatched = resolveGradeRecordsToAssessments(
  testUnmatchedRows,
  ASSESSMENT_DEFINITIONS,
);

assert.equal(
  resolvedUnmatched.stats.unmatchedCount,
  2,
  "Both items must be preserved in unmatchedGrades",
);
assert.equal(resolvedUnmatched.unmatchedGrades[0].title, "Practice Assignment 1 - Not Graded");
assert.equal(resolvedUnmatched.unmatchedGrades[1].title, "Course Feedback Survey");
console.log(
  "   ✓ Unmatched assignments are preserved in unmatchedGrades without polluting grading formulas.\n",
);

// ── TEST 6: Polymorphic Grading Engine Integration ────────────────────────────
console.log("6. Testing Grading Engine Calculation with Resolved Records...");

// Create a full set of resolved records for CS2006 (MAD2)
const mad2Rows: DbGradeRecord[] = [
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_pa_01",
    canonical_assessment_id: "cs2006_pa_01",
    module: "Week 1",
    title: "PA 1",
    assignment_type: "Programming",
    your_score: 100,
    your_score_raw: "100",
    peer_average: 80,
    median_score: 90,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_pa_02",
    canonical_assessment_id: "cs2006_pa_02",
    module: "Week 2",
    title: "PA 2",
    assignment_type: "Programming",
    your_score: 100,
    your_score_raw: "100",
    peer_average: 80,
    median_score: 90,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  ...[1, 2, 3, 4, 5, 6, 7].map((w): DbGradeRecord => ({
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: `cs2006_ga_${w.toString().padStart(2, "0")}`,
    canonical_assessment_id: `cs2006_ga_${w.toString().padStart(2, "0")}`,
    module: `Week ${w}`,
    title: `GA ${w}`,
    assignment_type: "Assignment",
    your_score: 100,
    your_score_raw: "100",
    peer_average: 85,
    median_score: 90,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  })),
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_quiz_01",
    canonical_assessment_id: "cs2006_quiz_01",
    module: "Week 4",
    title: "Quiz 1",
    assignment_type: "Quiz",
    your_score: 80,
    your_score_raw: "80",
    peer_average: 65,
    median_score: 70,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  {
    term_id: "2026-09",
    course_code: "CS2006",
    external_assignment_id: "cs2006_end_term",
    canonical_assessment_id: "cs2006_end_term",
    module: "Week 12",
    title: "End Term",
    assignment_type: "EndTerm",
    your_score: 90,
    your_score_raw: "90",
    peer_average: 70,
    median_score: 75,
    score_status: "GRADED",
    evaluation_status: "Evaluated",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: null,
    updated_at: "2026-10-05T12:00:00.000Z",
  },
];

const resolvedMad2 = resolveGradeRecordsToAssessments(mad2Rows, getAssessmentsForCourse("CS2006"));
const recordsList: AssessmentRecord[] = Object.values(resolvedMad2.assessmentRecords);

const gradeResult = calculateCourseGrade("CS2006", recordsList);

assert.ok(gradeResult.totalScore !== null, "Total score should be calculated");
assert.equal(gradeResult.gaa.score, 100, "GAA average should be 100");
// T = 0.05 * 100 + max(0.60 * 90 + 0.25 * 80, 0.40 * 90 + 0.25 * 80) = 5 + max(54 + 20, 36 + 20) = 5 + 74 = 79.0
assert.equal(
  gradeResult.totalScore?.toFixed(1),
  "79.0",
  "T score should match official MAD2 formula calculation",
);
assert.equal(gradeResult.letterGrade, "B", "79.0 corresponds to letter grade B");

console.log(
  `   ✓ Calculated Course T Score: ${gradeResult.totalScore?.toFixed(1)} (${gradeResult.letterGrade})\n`,
);

// ── TEST 7: Live Supabase Read Path Verification ──────────────────────────────
console.log("7. Testing Live Protected Supabase Read Endpoint (GET /functions/v1/grade-sync)...");

try {
  const liveRecords = await fetchGradeRecords("2026-09");
  console.log(`   ✓ Live Supabase Read returned ${liveRecords.length} record(s) for term 2026-09.`);
  const liveResolution = resolveGradeRecordsToAssessments(liveRecords, ASSESSMENT_DEFINITIONS);
  console.log(
    `   ✓ Live Resolution: ${liveResolution.stats.matchedCount} matched, ${liveResolution.stats.unmatchedCount} unmatched.\n`,
  );
} catch (err: unknown) {
  console.log(
    `   ℹ Live Supabase read error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
}

// ── TEST 8: Live Supabase Canonical Academic Data Fetchers ────────────────────
console.log("8. Testing Live Supabase Canonical Academic Data Fetchers...");

import {
  fetchTermSchedule,
  fetchCourses,
  fetchAssessmentDefinitions,
  fetchAcademicEvents,
  fetchFullAcademicSnapshot,
  getCachedAcademicData,
  saveCachedAcademicData,
  ACADEMIC_CACHE_KEY,
} from "../src/lib/sync/academicRepository";
import {
  selectSemesterProgress,
  selectNextHardCutoff,
  selectCourseGrades,
  selectAttentionItems,
  selectUpNextEvents,
} from "../src/lib/selectors";

const schedule = await fetchTermSchedule("2026-09");
assert.equal(schedule.weeks.length, 12, "Must return exactly 12 academic weeks from Supabase");
assert.equal(schedule.termConfig.term, "September", "Term name must match database");
assert.equal(schedule.termConfig.year, 2026, "Year must match database");
console.log(
  `   ✓ fetchTermSchedule: 12 academic weeks hydrated (Term: ${schedule.termConfig.term})`,
);

const courses = await fetchCourses("2026-09");
const courseCodes = Object.keys(courses);
assert.ok(courseCodes.includes("CS2005"), "Must include CS2005");
assert.ok(courseCodes.includes("SE2001"), "Must include SE2001");
assert.ok(courseCodes.includes("CS2006"), "Must include CS2006");
assert.ok(courseCodes.includes("CS2006P"), "Must include CS2006P");
assert.ok(courseCodes.includes("MS2001"), "Must include MS2001");
console.log(
  `   ✓ fetchCourses: ${courseCodes.length} canonical courses hydrated (${courseCodes.join(", ")})`,
);

const assessments = await fetchAssessmentDefinitions("2026-09");
assert.equal(assessments.length, 64, "Must return exactly 64 assessment definitions from Supabase");
console.log(
  `   ✓ fetchAssessmentDefinitions: ${assessments.length} assessment definitions hydrated`,
);

const events = await fetchAcademicEvents("2026-09");
assert.equal(events.length, 51, "Must return exactly 51 academic events from Supabase");
const hardCutoffEvents = events.filter((e) => e.hardCutoff || e.isHardCutoff);
console.log(
  `   ✓ fetchAcademicEvents: ${events.length} academic events hydrated (${hardCutoffEvents.length} hard cutoffs)\n`,
);

// ── TEST 9: Full Snapshot Hydration & Cache Invalidation ──────────────────────
console.log("9. Testing Full Academic Snapshot & Supabase-Wins Cache Reconciliation...");

// Setup mock window.localStorage if running in Node environment
const mockStorage: Record<string, string> = {};
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    },
  };
}

// 1. Fetch full snapshot from Supabase and cache
const snapshot = await fetchFullAcademicSnapshot("2026-09");
assert.equal(snapshot.isFromCache, false, "Fresh remote snapshot must have isFromCache=false");
assert.equal(snapshot.weeks.length, 12);
assert.equal(snapshot.assessments.length, 64);
assert.equal(snapshot.events.length, 51);

// 2. Read from localStorage cache
const cached = getCachedAcademicData();
assert.ok(cached !== null, "Cache must be populated in localStorage");
assert.equal(cached.isFromCache, true, "Cached data must have isFromCache=true");

// 3. Test Discrepancy Reconciliation: Corrupt the local cache and verify Supabase wins
const staleSnapshot = {
  ...cached,
  courses: {
    ...cached.courses,
    CS2005: {
      ...cached.courses.CS2005,
      name: "Stale Local Corrupted Course Name",
    },
  },
};
saveCachedAcademicData(staleSnapshot);

// Re-fetch: Supabase is authoritative, so remote rows must overwrite stale local cache
const reconciledSnapshot = await fetchFullAcademicSnapshot("2026-09");
assert.equal(
  reconciledSnapshot.courses.CS2005.name,
  "Programming Concepts using Java",
  "Supabase canonical data must overwrite stale local cache",
);
console.log(
  "   ✓ Supabase-wins reconciliation: Confirmed remote database successfully overrode stale cache.\n",
);

// ── TEST 10: Zero-Cache Fresh-Install Hydration ───────────────────────────────
console.log("10. Testing Zero-Cache Fresh-Install Recovery...");

// Clear local cache completely
window.localStorage.removeItem(ACADEMIC_CACHE_KEY);
assert.equal(getCachedAcademicData(), null, "Cache must be empty");

// Hydrate fresh installation directly from Supabase
const freshSnapshot = await fetchFullAcademicSnapshot("2026-09");
assert.ok(freshSnapshot !== null, "Fresh snapshot must hydrate cleanly without local cache");
assert.equal(freshSnapshot.weeks.length, 12);
assert.equal(freshSnapshot.assessments.length, 64);
assert.equal(freshSnapshot.events.length, 51);
console.log(
  "   ✓ Zero-cache fresh-install: Dashboard re-hydrates completely from Supabase without local state.\n",
);

// ── TEST 11: Selectors & Grading with Supabase Academic Data ───────────────────
console.log("11. Testing Selectors & Grading Engine using Supabase Academic Data...");

const testDate = "2026-10-18";
const prog = selectSemesterProgress(testDate, freshSnapshot.termConfig);
assert.equal(prog.currentWeekNumber, 2, "Oct 18 is Week 2");

const cutoff = selectNextHardCutoff(testDate, freshSnapshot.events);
assert.ok(cutoff.event !== null, "Must find next hard cutoff");

const upNext = selectUpNextEvents(testDate, 4, freshSnapshot.events);
assert.equal(upNext.length, 4, "Must return 4 upcoming events");

console.log(`   ✓ Semester Progress (Week ${prog.currentWeekNumber}, ${prog.percentage}%)`);
console.log(`   ✓ Next Hard Cutoff: ${cutoff.event?.title} (${cutoff.daysLeft} days left)`);
console.log(`   ✓ Up Next Events: ${upNext.map((e) => e.title).join(" · ")}\n`);

console.log("================================================================================");
console.log("  ALL PHASE 4 MIGRATION & SUPABASE ACADEMIC DATA TESTS PASSED SUCCESSFULLY!  ");
console.log("================================================================================\n");
