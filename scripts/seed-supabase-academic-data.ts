import { createClient } from "@supabase/supabase-js";
import { SEMESTER_CONFIG } from "../src/data/semester.ts";
import { COURSES } from "../src/data/courses.ts";
import { ASSESSMENT_DEFINITIONS } from "../src/data/assessments.ts";
import { CANONICAL_EVENTS } from "../src/data/events.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://aocrcrdmwmdtthrwypii.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY3JjcmRtd21kdHRocnd5cGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODg5OTYsImV4cCI6MjEwNjA2NDk5Nn0.LTTbBscGie1nfUTnjAjvuuJ2tjW0F4znDl9C5C8bAp8";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TERM_ID = "2026-09";

export async function seedAcademicData() {
  console.log(`[seed] Seeding canonical academic data for term ${TERM_ID}...`);

  // 1. Seed Term
  const termRow = {
    id: TERM_ID,
    term_name: SEMESTER_CONFIG.term,
    year: SEMESTER_CONFIG.year,
    registration_start_date: SEMESTER_CONFIG.registrationStartDate,
    registration_end_date: SEMESTER_CONFIG.registrationEndDate,
    content_start_date: SEMESTER_CONFIG.contentStartDate,
    start_date: SEMESTER_CONFIG.startDate,
    end_date: SEMESTER_CONFIG.endDate,
    total_weeks: SEMESTER_CONFIG.totalWeeks,
    updated_at: new Date().toISOString(),
  };

  const { error: termErr } = await supabase.from("terms").upsert(termRow, { onConflict: "id" });
  if (termErr) throw new Error(`Terms seed failed: ${termErr.message}`);
  console.log("  ✓ Seeded term: 2026-09");

  // 2. Seed Academic Weeks (12 weeks)
  const weekRows = SEMESTER_CONFIG.weeks.map((w) => ({
    term_id: TERM_ID,
    week_number: w.weekNumber,
    title: w.title,
    content_release_date: w.contentReleaseDate,
    assignment_deadline: w.assignmentDeadline,
    start_date: w.startDate,
    end_date: w.endDate,
    notes: w.notes || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: weeksErr } = await supabase
    .from("academic_weeks")
    .upsert(weekRows, { onConflict: "term_id,week_number" });
  if (weeksErr) throw new Error(`Academic weeks seed failed: ${weeksErr.message}`);
  console.log(`  ✓ Seeded ${weekRows.length} academic weeks`);

  // 3. Seed Courses (5 courses)
  const courseRows = Object.values(COURSES).map((c) => ({
    term_id: TERM_ID,
    course_code: c.code,
    name: c.name,
    credits: c.credits,
    course_type: c.type,
    has_sct: Boolean(c.hasSct),
    gaa_policy: c.gaaPolicy || null,
    source: c.source || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: coursesErr } = await supabase
    .from("courses")
    .upsert(courseRows, { onConflict: "term_id,course_code" });
  if (coursesErr) throw new Error(`Courses seed failed: ${coursesErr.message}`);
  console.log(`  ✓ Seeded ${courseRows.length} courses`);

  // 4. Seed Assessment Definitions (45 definitions)
  const assessmentRows = ASSESSMENT_DEFINITIONS.map((a) => ({
    term_id: TERM_ID,
    id: a.id,
    course_code: a.courseCode,
    name: a.name,
    assessment_type: a.type,
    max_score: a.maxScore,
    week_number: a.weekNumber || null,
    event_id: a.eventId || null,
    weight_description: a.weightDescription || null,
    source: a.source || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: assessErr } = await supabase
    .from("assessment_definitions")
    .upsert(assessmentRows, { onConflict: "term_id,id" });
  if (assessErr) throw new Error(`Assessment definitions seed failed: ${assessErr.message}`);
  console.log(`  ✓ Seeded ${assessmentRows.length} assessment definitions`);

  // 5. Seed Academic Events & Deadlines (34 events)
  const eventRows = CANONICAL_EVENTS.map((e) => ({
    term_id: TERM_ID,
    id: e.id,
    course_code: e.courseCode || null,
    title: e.title,
    event_type: e.type,
    sub_type: e.subType || null,
    start_time: e.start || null,
    end_time: e.end || null,
    event_date: e.date,
    time_str: e.time || null,
    importance: e.importance || "medium",
    is_hard_cutoff: Boolean(e.hardCutoff || e.isHardCutoff),
    cutoff_type: e.cutoffType || null,
    description: e.description || null,
    source: e.source || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: eventsErr } = await supabase
    .from("academic_events")
    .upsert(eventRows, { onConflict: "term_id,id" });
  if (eventsErr) throw new Error(`Academic events seed failed: ${eventsErr.message}`);
  console.log(`  ✓ Seeded ${eventRows.length} academic events & deadlines`);

  console.log(`[seed] Idempotent seed completed successfully for term ${TERM_ID}.\n`);
}

// Run if called directly
if (import.meta.main || process.argv[1]?.endsWith("seed-supabase-academic-data.ts")) {
  seedAcademicData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] Error:", err);
      process.exit(1);
    });
}
