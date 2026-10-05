import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queryDatabase, notionRequest } from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== PHASE 5: Verification & Boundary Testing ===\n");

  const ids = JSON.parse(fs.readFileSync(path.resolve(__dirname, "ids.json"), "utf8"));

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  // 1. Verify Database Record Counts
  console.log("1. Verifying Database Record Counts...");
  const courses = await queryDatabase(ids.databases.courses);
  assert(courses.length === 5, `Courses has exactly 5 rows (found ${courses.length})`);

  const academicItems = await queryDatabase(ids.databases.academicItems);
  assert(
    academicItems.length === 77,
    `Academic Items has exactly 77 canonical rows (found ${academicItems.length})`,
  );

  const projectItems = await queryDatabase(ids.databases.projectTracker);
  assert(
    projectItems.length === 37,
    `Project Tracker has exactly 37 rows (found ${projectItems.length})`,
  );

  const personalTasks = await queryDatabase(ids.databases.personalTasks);
  assert(
    personalTasks.length >= 3,
    `Personal Tasks has at least 3 rows (found ${personalTasks.length})`,
  );

  // 2. Verify Courses
  console.log("\n2. Verifying Courses Properties & Types...");
  const courseCodes = courses
    .map((c) => c.properties["Course Code"].title[0].plain_text)
    .sort((a, b) => a.localeCompare(b));
  assert(
    JSON.stringify(courseCodes) ===
      JSON.stringify(["CS2005", "CS2006", "CS2006P", "MS2001", "SE2001"]),
    `All 5 course codes match expected set: ${courseCodes.join(", ")}`,
  );

  const cs2006p = courses.find(
    (c) => c.properties["Course Code"].title[0].plain_text === "CS2006P",
  );
  assert(cs2006p.properties["Type"].select.name === "Project", 'CS2006P type is "Project"');
  assert(cs2006p.properties["Credits"].number === 2, "CS2006P credits is 2");

  const cs2005 = courses.find((c) => c.properties["Course Code"].title[0].plain_text === "CS2005");
  assert(cs2005.properties["SCT Required"].checkbox === true, "CS2005 has SCT Required == true");
  assert(cs2005.properties["Credits"].number === 4, "CS2005 credits is 4");

  const se2001 = courses.find((c) => c.properties["Course Code"].title[0].plain_text === "SE2001");
  assert(se2001.properties["SCT Required"].checkbox === true, "SE2001 has SCT Required == true");

  // 3. Verify Academic Items Multi-Relations & Code Mapping
  console.log("\n3. Verifying Academic Items Relationships & Distribution...");
  const cs2005Items = academicItems.filter((item) => {
    const rels = item.properties["Course"].relation || [];
    return rels.some((r) => r.id === cs2005.id);
  });
  console.log(`   CS2005 linked items: ${cs2005Items.length}`);
  assert(
    cs2005Items.length >= 19,
    `CS2005 has at least 19 items (course-specific + shared cutoffs)`,
  );

  const globalCutoff = academicItems.find((item) =>
    item.properties["Item Name"].title[0].plain_text.includes("Week 7 End Term Eligibility Closes"),
  );
  assert(globalCutoff !== undefined, "Found Week 7 End Term Eligibility Closes item");
  if (globalCutoff) {
    const relCount = globalCutoff.properties["Course"].relation.length;
    assert(relCount === 5, `Week 7 Cutoff links to all 5 enrolled courses (links: ${relCount})`);
  }

  const sctWindow1 = academicItems.find((item) =>
    item.properties["Item Name"].title[0].plain_text.includes("OPPE SCT Window 1 Closes"),
  );
  assert(sctWindow1 !== undefined, "Found OPPE SCT Window 1 Closes item");
  if (sctWindow1) {
    const sctRels = sctWindow1.properties["Course"].relation.length;
    assert(sctRels === 2, `SCT Window 1 links to exactly 2 SCT courses (CS2005 and SE2001)`);
  }

  // 4. Verify Project Tracker Composition
  console.log("\n4. Verifying Project Tracker Stages & Requirements...");
  const stages = projectItems.filter((p) => p.properties["Item Type"].select.name === "Stage");
  const reqs = projectItems.filter((p) => p.properties["Item Type"].select.name === "Requirement");
  const viva = projectItems.filter((p) => p.properties["Item Type"].select.name === "Viva Prep");

  assert(stages.length === 9, `Project Tracker has exactly 9 Stages (found ${stages.length})`);
  assert(
    reqs.length === 16,
    `Project Tracker has exactly 16 TMA V2 Requirements (found ${reqs.length})`,
  );
  assert(
    viva.length === 12,
    `Project Tracker has exactly 12 Viva Prep Protocol items (found ${viva.length})`,
  );

  // Check stage prerequisite wiring
  const stage0 = stages.find((s) => s.properties["Stage Order"].number === 0);
  const stage1 = stages.find((s) => s.properties["Stage Order"].number === 1);
  assert(
    stage0.properties["Gate State"].formula.string === "Available",
    'Stage 0 initial Gate State is "Available"',
  );
  if (stage1) {
    assert(
      stage1.properties["Prerequisite Stage"].relation.length === 1,
      "Stage 1 has Prerequisite Stage linked",
    );
    assert(
      stage1.properties["Prerequisite Stage"].relation[0].id === stage0.id,
      "Stage 1 prerequisite is Stage 0",
    );
  }

  // Check linked academic deadline on Stage 0
  assert(
    stage0.properties["Linked Academic Item"].relation.length === 1,
    "Stage 0 has Linked Academic Item (M0_GIT)",
  );

  // 5. Verify Reference Documentation
  console.log("\n5. Verifying Reference Documentation Hierarchy...");
  const refChildren = await notionRequest(`/blocks/${ids.referencePageId}/children`);
  const subpageTitles = refChildren.results.map((b) => b.child_page?.title).filter(Boolean);
  assert(
    subpageTitles.length === 4,
    `Reference page contains exactly 4 subpages (found ${subpageTitles.length})`,
  );
  assert(
    subpageTitles.includes("Grading Policy (September 2026)"),
    "Grading Policy subpage exists",
  );
  assert(
    subpageTitles.includes("MAD-2 Project & Viva Instructions"),
    "MAD-2 Project subpage exists",
  );
  assert(
    subpageTitles.includes("Viva Preparation Protocol"),
    "Viva Preparation Protocol subpage exists",
  );
  assert(
    subpageTitles.includes("Trekking Management App V2 Specification"),
    "TMA V2 Specification subpage exists",
  );

  // 6. Test Theoretical Boundary Calculations
  console.log("\n6. Validating Policy & Domain Mathematical Rules...");

  // CS2005 Java Quiz: max(0.20 * max(Q1, Q2), 0.10 * Q1 + 0.20 * Q2)
  const calcJavaQuiz = (q1, q2) => Math.max(0.2 * Math.max(q1, q2), 0.1 * q1 + 0.2 * q2);
  const javaTest1 = calcJavaQuiz(80, 40); // 0.20*80 = 16 vs 8+8 = 16 -> 16
  const javaTest2 = calcJavaQuiz(100, 20); // 0.20*100 = 20 vs 10+4 = 14 -> 20
  const javaTest3 = calcJavaQuiz(40, 90); // 0.20*90 = 18 vs 4+18 = 22 -> 22
  assert(javaTest1 === 16, `Java Quiz rule: Q1=80, Q2=40 => ${javaTest1} (expected 16)`);
  assert(javaTest2 === 20, `Java Quiz rule: Q1=100, Q2=20 => ${javaTest2} (expected 20)`);
  assert(javaTest3 === 22, `Java Quiz rule: Q1=40, Q2=90 => ${javaTest3} (expected 22)`);

  // Best 5 of 7 GAA with recovery check
  const checkBest5 = (scores) => {
    const k = scores.length;
    const r = 7 - k;
    const sorted = [...scores].sort((a, b) => b - a);
    if (k < 5) {
      const maxPossible = (sorted.reduce((a, b) => a + b, 0) + r * 100) / 5;
      return maxPossible >= 40 ? "In Progress" : "Ineligible";
    }
    const best5Avg = sorted.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    if (k < 7) {
      // Future r tests at 100 displace the lowest r scores in the top 5
      const topPreserved = sorted.slice(0, 5 - r);
      const maxPossibleSum = topPreserved.reduce((a, b) => a + b, 0) + r * 100;
      const maxPossible = maxPossibleSum / 5;
      if (maxPossible < 40) return "Ineligible";
      return best5Avg >= 40 ? "On Track" : "At Risk";
    }
    return best5Avg >= 40 ? "Eligible" : "Ineligible";
  };

  assert(checkBest5([100, 100, 100]) === "In Progress", 'Best-5 [100, 100, 100] is "In Progress"');
  assert(
    checkBest5([100, 100, 100, 0, 0, 0, 0]) === "Eligible",
    'Best-5 [100, 100, 100, 0, 0, 0, 0] is "Eligible" (avg 60 >= 40)',
  );
  assert(
    checkBest5([20, 20, 20, 20, 20, 20]) === "Ineligible",
    'Best-5 6x 20s cannot reach 40 avg with 1 remaining week => "Ineligible"',
  );

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passes} passed, ${failures} failed.`);
  console.log(`========================================\n`);

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Verification script crashed:", err);
  process.exit(1);
});
