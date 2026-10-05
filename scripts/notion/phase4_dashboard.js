import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PARENT_PAGE_ID,
  appendBlockChildren,
  calloutBlock,
  headingBlock,
  bulletBlock,
} from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function linkBlock(text, url) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: text,
            link: { url },
          },
        },
      ],
    },
  };
}

function dividerBlock() {
  return {
    object: "block",
    type: "divider",
    divider: {},
  };
}

async function main() {
  console.log("=== PHASE 4: Master Dashboard Assembly ===\n");

  const ids = JSON.parse(fs.readFileSync(path.resolve(__dirname, "ids.json"), "utf8"));

  const courseUrl = `https://notion.so/${ids.databases.courses.replace(/-/g, "")}`;
  const academicItemsUrl = `https://notion.so/${ids.databases.academicItems.replace(/-/g, "")}`;
  const projectTrackerUrl = `https://notion.so/${ids.databases.projectTracker.replace(/-/g, "")}`;
  const personalTasksUrl = `https://notion.so/${ids.databases.personalTasks.replace(/-/g, "")}`;
  const referenceUrl = `https://notion.so/${ids.referencePageId.replace(/-/g, "")}`;

  const dashboardBlocks = [
    // Top Banner Callout
    calloutBlock(
      "🎓 IITM BS DEGREE SEPTEMBER 2026 — ACADEMIC COMMAND CENTER\n" +
        "• Active Window: Term Kickoff & SCT Registration (Term Starts: Oct 2, 2026)\n" +
        "• 4 Core Unified Databases: Courses (5), Academic Items (77), Project Tracker (37), Personal Tasks\n" +
        "• Authoritative Policies Enforced: Best-5-of-7 GAA, SCT Gates, Java 0.20 Quiz Coefficient, Two-Track CS2006P",
      "⚡",
    ),

    dividerBlock(),

    // Section 1: Urgent Alerts & Next Hard Cutoffs
    headingBlock("🚨 Immediate Action & Hard Cutoffs", 2),
    calloutBlock(
      "NEXT CRITICAL CUTOFFS:\n" +
        "1. 2026-10-18: Course Drop Window Closes & CS2005 A2 / SE2001 GA2 / CS2006 PA2 Submissions\n" +
        "2. 2026-10-23: SE2001 BPT 1 Graded Window Opens\n" +
        "3. 2026-10-25: CS2006P Stage 0 Git Tracker Registration (M0) Deadline\n" +
        "4. 2026-10-30: OPPE System Compatibility Test (SCT) Window 1 Closes",
      "⏰",
    ),

    dividerBlock(),

    // Section 2: Master Course Gradebook
    headingBlock("📊 Master Course Gradebook", 2),
    calloutBlock(
      "Direct link to your enrolled courses, credit weights, GAA summaries, eligibility gates, and T-score tracking.\n" +
        "Click below to open the Course Gradebook:",
      "📚",
    ),
    linkBlock("👉 Open Courses Database (5 Enrolled Subjects)", courseUrl),
    bulletBlock("CS2005 · Programming Concepts using Java (4 Credits) — Theory, SCT Required"),
    bulletBlock("SE2001 · System Commands (3 Credits) — Theory, SCT Required"),
    bulletBlock("CS2006 · Application Development II (4 Credits) — Theory"),
    bulletBlock(
      "CS2006P · Application Development II - Project (2 Credits) — Project (MAD-2 Trekking App)",
    ),
    bulletBlock("MS2001 · Business Data Management (4 Credits) — Theory"),

    dividerBlock(),

    // Section 3: Academic Action Center
    headingBlock("📅 Academic Action Center (Master Assessment Schedule)", 2),
    calloutBlock(
      "The single canonical source of truth for all 77 official IITM assessments, quizzes, OPPEs, cutoffs, and end-term exams.\n" +
        "No duplicate dates: all course timelines and stage deadlines reference this database.",
      "🗓️",
    ),
    linkBlock("👉 Open Academic Items Ledger (All 77 Canonical Items)", academicItemsUrl),
    bulletBlock('📌 Filter by "Status == Pending" for remaining homework and exam deliverables.'),
    bulletBlock(
      '📌 Filter by "Hard Cutoff == true" for irreversible proctored exam and submission cutoffs.',
    ),
    bulletBlock(
      '📌 Filter by "Counts Toward ET Eligibility == true" for Week 1–7 assessments required for End Term gating.',
    ),

    dividerBlock(),

    // Section 4: CS2006P Project Tracker
    headingBlock("🛠️ CS2006P Project Tracker (Trekking App V2 & Viva Hub)", 2),
    calloutBlock(
      "End-to-end execution hub for the MAD-2 Trekking Management Application V2.\n" +
        "Includes 9 sequential stages with gatekeeper formulas, 16 TMA V2 specification requirements, and 12 Viva compliance checklist items.",
      "🚀",
    ),
    linkBlock(
      "👉 Open Project Tracker Hub (37 Stages, Requirements & Viva Rules)",
      projectTrackerUrl,
    ),
    bulletBlock(
      "Stage Pipeline: Sequential flow from Stage 0 (Git) through Dev, Submission, L1 Viva, to L2 Viva.",
    ),
    bulletBlock(
      "Gate State Engine: Enforces L1 < 20 (U fail), 20–29 (Terminal E grade, no L2), and >= 30 (L2 unlock).",
    ),
    bulletBlock(
      "TMA Requirements: 16 core architectural and functional specifications mapped to Section numbers.",
    ),
    bulletBlock(
      "Viva Prep Protocol: 12 pre-viva hardware, environment, checksum, and live demonstration requirements.",
    ),

    dividerBlock(),

    // Section 5: Personal Study & Task Ledger
    headingBlock("✅ Personal Study & Task Ledger", 2),
    calloutBlock(
      "Independent workspace for personal study goals, revision tasks, and self-directed prep.\n" +
        "Dates here represent your personal study targets and do not modify official academic deadlines.",
      "📝",
    ),
    linkBlock("👉 Open Personal Tasks Database", personalTasksUrl),

    dividerBlock(),

    // Section 6: Official Reference Documents
    headingBlock("📚 Official Reference Documentation", 2),
    calloutBlock(
      "Permanent local repository of IITM September 2026 grading guidelines, project manuals, and checklists.",
      "📖",
    ),
    linkBlock("👉 Open Reference Documentation Folder", referenceUrl),
    bulletBlock("📜 Grading Policy (September 2026) — Comprehensive rules for all BS courses"),
    bulletBlock("🛠️ MAD-2 Project & Viva Instructions — Official CS2006P submission rules"),
    bulletBlock(
      "🎯 Viva Preparation Protocol — Mandatory hardware, environment, and conduct checklist",
    ),
    bulletBlock(
      "🏔️ Trekking Management App V2 Specification — Full technical and functional requirements",
    ),

    dividerBlock(),

    calloutBlock(
      '💡 Tip: In the Notion desktop or mobile app, use "Add view" on any linked database block to create custom Board (Kanban), Calendar, or Gallery layouts suited to your workflow.',
      "💡",
    ),
  ];

  console.log(
    `Appending ${dashboardBlocks.length} master dashboard blocks to parent page ${PARENT_PAGE_ID}...`,
  );
  await appendBlockChildren(PARENT_PAGE_ID, dashboardBlocks);

  console.log("\n✅ Phase 4 Complete! Master Dashboard assembled successfully.");
}

main().catch(console.error);
