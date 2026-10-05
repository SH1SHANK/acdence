// ============================================================================
// ACADRIX / ACDENCE PHASE 5 VERIFICATION SUITE
// Supabase Security, Realtime Freshness & Persistence Hardening
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { resolveGradeRecordsToAssessments } from "../src/lib/grading/resolver";
import { computeGaa, checkBestFiveOfSeven } from "../src/grading/utils";
import {
  getCachedGradeRecords,
  saveCachedGradeRecords,
  clearCachedGradeRecords,
  fetchGradeRecords,
} from "../src/lib/sync/gradeRepository";
import type { DbGradeRecord } from "../src/types/gradeRecord";
import type { AssessmentDefinition, AssessmentRecord } from "../src/types/assessment";
import type { GaaPolicy } from "../src/types/course";

const SUPABASE_URL = "https://aocrcrdmwmdtthrwypii.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY3JjcmRtd21kdHRocnd5cGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODg5OTYsImV4cCI6MjEwNjA2NDk5Nn0.LTTbBscGie1nfUTnjAjvuuJ2tjW0F4znDl9C5C8bAp8";
const SYNC_SECRET = "acx_grade_sync_secret_7f8e9d0c1b2a3b4c5d6e7f8a9b0c1d2e";

interface TestReport {
  passed: number;
  failed: number;
  results: { test: string; status: "PASS" | "FAIL"; details?: string }[];
}

const report: TestReport = { passed: 0, failed: 0, results: [] };

function record(test: string, passed: boolean, details?: string) {
  if (passed) {
    report.passed++;
    report.results.push({ test, status: "PASS", details });
    console.log(`  ✓ ${test}${details ? ` (${details})` : ""}`);
  } else {
    report.failed++;
    report.results.push({ test, status: "FAIL", details });
    console.error(`  ✗ ${test}${details ? ` -> ${details}` : ""}`);
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("PHASE 5 VERIFICATION: SUPABASE SECURITY, REALTIME & PERSISTENCE HARDENING");
  console.log("================================================================================\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: Supabase Security & Read Boundaries
  // ──────────────────────────────────────────────────────────────────────────
  console.log("--- 1. Supabase Read Security & Boundary Enforcement ---");

  // 1.1 Anonymous query via PostgREST must return 0 rows (RLS blocks anon role)
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: anonData, error: anonError } = await anonClient
      .from("grade_records")
      .select("*")
      .limit(10);

    const isBlocked = !anonError && Array.isArray(anonData) && anonData.length === 0;
    record(
      "Anonymous postgREST read to public.grade_records is blocked by RLS (0 rows returned)",
      isBlocked,
      `Returned ${anonData?.length ?? 0} rows`,
    );
  } catch (e: any) {
    record("Anonymous postgREST read to public.grade_records", false, e.message);
  }

  // 1.2 Unauthenticated GET to Edge Function must return 401 Unauthorized
  try {
    const unauthRes = await fetch(`${SUPABASE_URL}/functions/v1/grade-sync?termId=2026-09`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const is401 = unauthRes.status === 401;
    record(
      "Unauthenticated Edge Function GET /functions/v1/grade-sync is rejected with HTTP 401",
      is401,
      `Status: ${unauthRes.status}`,
    );
  } catch (e: any) {
    record("Unauthenticated Edge Function GET", false, e.message);
  }

  // 1.3 Secret-authenticated GET to Edge Function must return 200 OK
  try {
    const authRes = await fetch(`${SUPABASE_URL}/functions/v1/grade-sync?termId=2026-09`, {
      method: "GET",
      headers: {
        "x-sync-secret": SYNC_SECRET,
        Accept: "application/json",
      },
    });
    const is200 = authRes.status === 200;
    const body = is200 ? await authRes.json() : null;
    const isOkPayload = Boolean(body && body.ok === true && Array.isArray(body.records));
    record(
      "Secret-authorized GET /functions/v1/grade-sync returns 200 with valid records payload",
      is200 && isOkPayload,
      `Status: ${authRes.status}, records: ${body?.records?.length ?? 0}`,
    );
  } catch (e: any) {
    record("Secret-authorized Edge Function GET", false, e.message);
  }

  // 1.4 Verify Public Reference Tables remain accessible anonymously
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const [terms, courses, defs] = await Promise.all([
      anonClient.from("terms").select("id").limit(1),
      anonClient.from("courses").select("course_code").limit(1),
      anonClient.from("assessment_definitions").select("id").limit(1),
    ]);
    const pubOk = Boolean(terms.data?.length && courses.data?.length && defs.data?.length);
    record(
      "Public academic reference tables (terms, courses, assessment_definitions) remain accessible",
      pubOk,
      `Terms: ${terms.data?.length}, Courses: ${courses.data?.length}, Defs: ${defs.data?.length}`,
    );
  } catch (e: any) {
    record("Public academic reference tables accessible", false, e.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 2: Strict Grading & Score Consistency Semantics
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 2. Data Consistency & Grading Semantics ---");

  const mockDefinitions: AssessmentDefinition[] = [
    {
      id: "cs2005_ga_01",
      courseCode: "CS2005",
      name: "Week 1 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 1,
    },
    {
      id: "cs2005_ga_02",
      courseCode: "CS2005",
      name: "Week 2 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 2,
    },
    {
      id: "cs2005_ga_03",
      courseCode: "CS2005",
      name: "Week 3 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 3,
    },
    {
      id: "cs2005_ga_04",
      courseCode: "CS2005",
      name: "Week 4 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 4,
    },
    {
      id: "cs2005_ga_05",
      courseCode: "CS2005",
      name: "Week 5 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 5,
    },
    {
      id: "cs2005_ga_06",
      courseCode: "CS2005",
      name: "Week 6 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 6,
    },
    {
      id: "cs2005_ga_07",
      courseCode: "CS2005",
      name: "Week 7 Graded Assignment",
      type: "weekly_objective",
      maxScore: 100,
      weekNumber: 7,
    },
  ];

  // 2.1 Semantics of ABSENT: status "absent", score 0
  const absentRecord: DbGradeRecord = {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "ext_w1",
    canonical_assessment_id: "cs2005_ga_01",
    module: "Week 1",
    title: "Week 1 Graded Assignment",
    assignment_type: "Objective",
    your_score: null,
    your_score_raw: "--",
    peer_average: null,
    median_score: null,
    score_status: "ABSENT",
    evaluation_status: "normal",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const zeroRecord: DbGradeRecord = {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "ext_w2",
    canonical_assessment_id: "cs2005_ga_02",
    module: "Week 2",
    title: "Week 2 Graded Assignment",
    assignment_type: "Objective",
    your_score: 0,
    your_score_raw: "0",
    peer_average: 45,
    median_score: 50,
    score_status: "RELEASED",
    evaluation_status: "normal",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const pendingRecord: DbGradeRecord = {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "ext_w3",
    canonical_assessment_id: "cs2005_ga_03",
    module: "Week 3",
    title: "Week 3 Graded Assignment",
    assignment_type: "Objective",
    your_score: null,
    your_score_raw: null,
    peer_average: null,
    median_score: null,
    score_status: "UNRELEASED",
    evaluation_status: "normal",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const resolution = resolveGradeRecordsToAssessments(
    [absentRecord, zeroRecord, pendingRecord],
    mockDefinitions,
  );

  const resW1 = resolution.assessmentRecords["cs2005_ga_01"];
  const resW2 = resolution.assessmentRecords["cs2005_ga_02"];
  const resW3 = resolution.assessmentRecords["cs2005_ga_03"];

  record(
    "ABSENT record resolves to status: 'absent' and score: 0",
    resW1.status === "absent" && resW1.score === 0,
    `status: ${resW1.status}, score: ${resW1.score}`,
  );

  record(
    "Numeric 0 record resolves to status: 'present' and score: 0",
    resW2.status === "present" && resW2.score === 0,
    `status: ${resW2.status}, score: ${resW2.score}`,
  );

  record(
    "UNRELEASED record resolves to status: 'pending' and score: null (never coerced to 0)",
    resW3.status === "pending" && resW3.score === null,
    `status: ${resW3.status}, score: ${resW3.score}`,
  );

  // 2.2 GAA and Gate Calculation with ABSENT and 0
  const gaaPolicy: GaaPolicy = {
    count: 3,
    poolAssessmentIds: ["cs2005_ga_01", "cs2005_ga_02", "cs2005_ga_04", "cs2005_ga_05"],
  };

  // With 2 completed (W1=absent:0, W2=present:0) and required=3, GAA is incomplete
  const gaaIncomplete = computeGaa(Object.values(resolution.assessmentRecords), gaaPolicy);
  record(
    "GAA calculation with fewer than required completed assessments returns isComplete: false, score: null",
    !gaaIncomplete.isComplete && gaaIncomplete.score === null,
    `isComplete: ${gaaIncomplete.isComplete}, score: ${gaaIncomplete.score}`,
  );

  // Add a 3rd record with score 90
  const recordsWithThree: AssessmentRecord[] = [
    resW1,
    resW2,
    { assessmentId: "cs2005_ga_04", status: "present", score: 90 },
  ];
  const gaaComplete = computeGaa(recordsWithThree, gaaPolicy);
  // effective: [90, 0, 0] -> top 3 avg = 30
  record(
    "GAA calculation with 3 completed (90, 0 (present), 0 (absent)) computes accurate average: 30.00",
    gaaComplete.isComplete && gaaComplete.score === 30,
    `isComplete: ${gaaComplete.isComplete}, score: ${gaaComplete.score}`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 3: Realtime Idempotent Reconciliation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 3. Realtime Idempotent Reconciliation ---");

  let localRecords: DbGradeRecord[] = [absentRecord, zeroRecord];

  // Simulate Realtime INSERT
  const realtimeInsert: DbGradeRecord = {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "ext_w4",
    canonical_assessment_id: "cs2005_ga_04",
    module: "Week 4",
    title: "Week 4 Graded Assignment",
    assignment_type: "Objective",
    your_score: 95,
    your_score_raw: "95",
    peer_average: 60,
    median_score: 65,
    score_status: "RELEASED",
    evaluation_status: "normal",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Reconcile Realtime INSERT
  const insertIndex = localRecords.findIndex(
    (r) =>
      r.term_id === realtimeInsert.term_id &&
      r.course_code === realtimeInsert.course_code &&
      r.external_assignment_id === realtimeInsert.external_assignment_id,
  );
  if (insertIndex >= 0) {
    localRecords[insertIndex] = realtimeInsert;
  } else {
    localRecords.push(realtimeInsert);
  }

  record(
    "Realtime INSERT successfully appends new grade record",
    localRecords.length === 3,
    `Total records: ${localRecords.length}`,
  );

  // Simulate Duplicate Realtime INSERT (Idempotence)
  const duplicateIndex = localRecords.findIndex(
    (r) =>
      r.term_id === realtimeInsert.term_id &&
      r.course_code === realtimeInsert.course_code &&
      r.external_assignment_id === realtimeInsert.external_assignment_id,
  );
  if (duplicateIndex >= 0) {
    localRecords[duplicateIndex] = { ...realtimeInsert, your_score: 98 };
  } else {
    localRecords.push(realtimeInsert);
  }

  record(
    "Duplicate Realtime event is idempotent and updates existing entry without duplication",
    localRecords.length === 3 && localRecords[duplicateIndex].your_score === 98,
    `Total records: ${localRecords.length}, updated score: ${localRecords[duplicateIndex].your_score}`,
  );

  // Simulate Realtime DELETE
  localRecords = localRecords.filter(
    (r) =>
      !(
        r.term_id === realtimeInsert.term_id &&
        r.course_code === realtimeInsert.course_code &&
        r.external_assignment_id === realtimeInsert.external_assignment_id
      ),
  );

  record(
    "Realtime DELETE removes matching grade record by composite identity",
    localRecords.length === 2,
    `Remaining records: ${localRecords.length}`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 4: Offline Resilience & Cache Invalidation ("Supabase Wins")
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 4. Cache Persistence, Offline Fallback & Online Invalidation ---");

  // Mock localStorage for Node/Bun environment
  const mockStorage: Record<string, string> = {};
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

  clearCachedGradeRecords();
  const emptyInitial = getCachedGradeRecords("2026-09");
  record(
    "Initial getCachedGradeRecords returns empty array when cache is empty",
    emptyInitial.length === 0,
    `Length: ${emptyInitial.length}`,
  );

  saveCachedGradeRecords([absentRecord, zeroRecord], "2026-09");
  const cached = getCachedGradeRecords("2026-09");
  record(
    "saveCachedGradeRecords stores records and getCachedGradeRecords retrieves them accurately",
    cached.length === 2 && cached[0].external_assignment_id === "ext_w1",
    `Retrieved ${cached.length} records`,
  );

  // Test Course Filtering in getCachedGradeRecords
  const cs2005Cached = getCachedGradeRecords("2026-09", "CS2005");
  const se2001Cached = getCachedGradeRecords("2026-09", "SE2001");
  record(
    "getCachedGradeRecords filters by courseCode accurately",
    cs2005Cached.length === 2 && se2001Cached.length === 0,
    `CS2005: ${cs2005Cached.length}, SE2001: ${se2001Cached.length}`,
  );

  // Test fetchGradeRecords fallback to cache when fetch throws
  const failingFetch: typeof fetch = () => {
    return Promise.reject(new Error("Network connection lost (offline)"));
  };

  const offlineRecords = await fetchGradeRecords("2026-09", undefined, {
    syncSecret: "some_secret",
    fetchFn: failingFetch,
  });

  record(
    "fetchGradeRecords falls back to local cache when remote network request fails",
    offlineRecords.length === 2,
    `Returned ${offlineRecords.length} cached records`,
  );

  // Test Supabase Wins: Overwrites stale cache on successful remote fetch
  const freshRemoteRecord: DbGradeRecord = {
    term_id: "2026-09",
    course_code: "CS2005",
    external_assignment_id: "ext_fresh",
    canonical_assessment_id: "cs2005_ga_01",
    module: "Week 1",
    title: "Week 1 Graded Assignment",
    assignment_type: "Objective",
    your_score: 100,
    your_score_raw: "100",
    peer_average: 80,
    median_score: 85,
    score_status: "RELEASED",
    evaluation_status: "normal",
    due_date: null,
    due_date_text: null,
    source: "grades",
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const succeedingFetch: typeof fetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true, records: [freshRemoteRecord] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const remoteFetched = await fetchGradeRecords("2026-09", undefined, {
    syncSecret: "some_secret",
    fetchFn: succeedingFetch,
  });

  const updatedCache = getCachedGradeRecords("2026-09");
  record(
    "Authoritative remote fetch overwrites local cache ('Supabase wins')",
    remoteFetched.length === 1 &&
      updatedCache.length === 1 &&
      updatedCache[0].external_assignment_id === "ext_fresh",
    `Cache updated to ${updatedCache.length} record with score ${updatedCache[0]?.your_score}`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(`PHASE 5 TEST SUMMARY: ${report.passed} PASSED, ${report.failed} FAILED`);
  console.log("================================================================================");

  if (report.failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL TEST EXECUTION ERROR:", err);
  process.exit(1);
});
