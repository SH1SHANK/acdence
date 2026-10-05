import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PARENT_PAGE_ID,
  createPage,
  createDatabase,
  markdownToBlocks,
  calloutBlock,
} from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== PHASE 1: Base Containers & Reference Hierarchy ===\n");

  // 1. Create Reference child page under PARENT_PAGE_ID
  console.log("1. Creating Reference parent page...");
  const refPage = await createPage(
    { page_id: PARENT_PAGE_ID },
    {
      title: [{ type: "text", text: { content: "Reference Documentation" } }],
    },
    [
      calloutBlock(
        "Official documentation, grading policies, and specifications for IITM BS Degree September 2026 Term.",
        "📚",
      ),
    ],
  );
  console.log(`   Created Reference page: ${refPage.id}`);

  // 2. Read and populate the 4 reference subpages
  const docsDir = path.resolve(__dirname, "../../docs/reference");
  const subpages = [
    {
      title: "Grading Policy (September 2026)",
      file: "sept_2026_grading.txt",
      icon: "📜",
    },
    {
      title: "MAD-2 Project & Viva Instructions",
      file: "mad2_project_instructions.txt",
      icon: "🛠️",
    },
    {
      title: "Viva Preparation Protocol",
      file: "viva_checklist.txt",
      icon: "🎯",
    },
    {
      title: "Trekking Management App V2 Specification",
      file: "trekking_app_v2.txt",
      icon: "🏔️",
    },
  ];

  const refSubpageIds = {};
  for (const doc of subpages) {
    console.log(`2. Creating reference doc: ${doc.title}...`);
    const filePath = path.join(docsDir, doc.file);
    const content = fs.readFileSync(filePath, "utf8");
    const blocks = markdownToBlocks(content);
    console.log(`   Parsed ${blocks.length} blocks for ${doc.title}`);

    const subpage = await createPage(
      { page_id: refPage.id },
      {
        title: [{ type: "text", text: { content: doc.title } }],
      },
      blocks,
    );
    refSubpageIds[doc.file] = subpage.id;
    console.log(`   Created subpage ${doc.title}: ${subpage.id}`);
  }

  // 3. Create the 4 core databases under PARENT_PAGE_ID
  console.log("\n3. Creating 4 core databases...");

  // Database 1: Courses
  console.log('   Creating "Courses" database...');
  const coursesDb = await createDatabase({ page_id: PARENT_PAGE_ID }, "Courses", {
    "Course Code": { title: {} },
    "Course Name": { rich_text: {} },
    Credits: { number: { format: "number" } },
    Type: {
      select: {
        options: [
          { name: "Theory", color: "blue" },
          { name: "Project", color: "purple" },
        ],
      },
    },
    "SCT Required": { checkbox: {} },
    "SCT Status": {
      select: {
        options: [
          { name: "Pending", color: "gray" },
          { name: "Passed", color: "green" },
          { name: "Failed", color: "red" },
          { name: "N/A", color: "default" },
        ],
      },
    },
    "Submission Track": {
      select: {
        options: [
          { name: "Track A (Nov 17 Deadline)", color: "blue" },
          { name: "Track B (Dec 10 Deadline)", color: "orange" },
          { name: "Unset", color: "default" },
        ],
      },
    },
  });
  console.log(`   Created Courses DB: ${coursesDb.id}`);

  // Database 2: Academic Items
  console.log('   Creating "Academic Items" database...');
  const academicItemsDb = await createDatabase({ page_id: PARENT_PAGE_ID }, "Academic Items", {
    "Item Name": { title: {} },
    "Assessment Code": {
      select: {
        options: [
          { name: "A2", color: "blue" },
          { name: "A3", color: "blue" },
          { name: "A4", color: "blue" },
          { name: "A5", color: "blue" },
          { name: "A6", color: "blue" },
          { name: "A7", color: "blue" },
          { name: "A8", color: "blue" },
          { name: "GA1", color: "default" },
          { name: "GA2", color: "default" },
          { name: "GA3", color: "default" },
          { name: "GA4", color: "default" },
          { name: "GA5", color: "default" },
          { name: "GA6", color: "default" },
          { name: "GA7", color: "default" },
          { name: "GA8", color: "default" },
          { name: "GA9", color: "default" },
          { name: "GA10", color: "default" },
          { name: "PA1", color: "blue" },
          { name: "PA2", color: "blue" },
          { name: "BPT1", color: "purple" },
          { name: "BPT2", color: "purple" },
          { name: "BPT3", color: "purple" },
          { name: "BPT4", color: "purple" },
          { name: "QZ1", color: "yellow" },
          { name: "QZ2", color: "yellow" },
          { name: "PE1", color: "orange" },
          { name: "PE2", color: "orange" },
          { name: "OPPE", color: "orange" },
          { name: "REOPPE", color: "orange" },
          { name: "ET", color: "red" },
          { name: "M0_GIT", color: "purple" },
          { name: "SUB_TRACK_A", color: "purple" },
          { name: "SUB_TRACK_B", color: "purple" },
          { name: "VIVA_L1", color: "pink" },
          { name: "VIVA_L2", color: "pink" },
          { name: "CUTOFF_REG", color: "red" },
          { name: "CUTOFF_W4", color: "red" },
          { name: "CUTOFF_W7", color: "red" },
          { name: "CUTOFF_W8", color: "red" },
          { name: "CUTOFF_W10", color: "red" },
          { name: "SCT_W1", color: "brown" },
          { name: "SCT_W2", color: "brown" },
          { name: "SCT_W3", color: "brown" },
          { name: "SCT_W4", color: "brown" },
          { name: "DROP_DEADLINE", color: "red" },
          { name: "TERM_START", color: "green" },
        ],
      },
    },
    "Item Type": {
      select: {
        options: [
          { name: "Weekly Assessment", color: "default" },
          { name: "Programming Assignment", color: "blue" },
          { name: "BPT", color: "purple" },
          { name: "Quiz", color: "yellow" },
          { name: "OPPE", color: "orange" },
          { name: "ReOPPE", color: "orange" },
          { name: "End Term", color: "red" },
          { name: "Eligibility Cutoff", color: "red" },
          { name: "Project Deadline", color: "purple" },
          { name: "Academic Milestone", color: "green" },
        ],
      },
    },
    Week: { number: { format: "number" } },
    Date: { date: {} },
    Status: {
      select: {
        options: [
          { name: "Pending", color: "gray" },
          { name: "Completed", color: "green" },
          { name: "Present", color: "green" },
          { name: "Absent", color: "red" },
          { name: "Exempt", color: "yellow" },
          { name: "Locked", color: "default" },
        ],
      },
    },
    "Raw Score": { number: { format: "number" } },
    "Max Score": { number: { format: "number" } },
    "Hard Cutoff": { checkbox: {} },
    "Counts Toward GAA": { checkbox: {} },
    "Counts Toward ET Eligibility": { checkbox: {} },
    "Counts Toward OPPE1": { checkbox: {} },
    "Counts Toward OPPE2": { checkbox: {} },
    Reference: { rich_text: {} },
  });
  console.log(`   Created Academic Items DB: ${academicItemsDb.id}`);

  // Database 3: Project Tracker
  console.log('   Creating "Project Tracker" database...');
  const projectTrackerDb = await createDatabase({ page_id: PARENT_PAGE_ID }, "Project Tracker", {
    Title: { title: {} },
    "Item Type": {
      select: {
        options: [
          { name: "Stage", color: "purple" },
          { name: "Requirement", color: "blue" },
          { name: "Viva Prep", color: "pink" },
          { name: "Checklist", color: "gray" },
        ],
      },
    },
    "Stage Order": { number: { format: "number" } },
    Status: {
      select: {
        options: [
          { name: "Not Started", color: "default" },
          { name: "In Progress", color: "yellow" },
          { name: "Done / Verified", color: "green" },
          { name: "Blocked", color: "red" },
          { name: "Failed", color: "red" },
        ],
      },
    },
    Score: { number: { format: "number" } },
    "Max Score": { number: { format: "number" } },
    Mandatory: { checkbox: {} },
    "Evidence / Notes": { rich_text: {} },
    "GitHub Reference": { url: {} },
    "Source / Section": { rich_text: {} },
  });
  console.log(`   Created Project Tracker DB: ${projectTrackerDb.id}`);

  // Database 4: Personal Tasks
  console.log('   Creating "Personal Tasks" database...');
  const personalTasksDb = await createDatabase({ page_id: PARENT_PAGE_ID }, "Personal Tasks", {
    Task: { title: {} },
    Status: {
      select: {
        options: [
          { name: "To Do", color: "gray" },
          { name: "In Progress", color: "blue" },
          { name: "Done", color: "green" },
        ],
      },
    },
    Due: { date: {} },
    Priority: {
      select: {
        options: [
          { name: "High", color: "red" },
          { name: "Medium", color: "yellow" },
          { name: "Low", color: "blue" },
        ],
      },
    },
    Notes: { rich_text: {} },
  });
  console.log(`   Created Personal Tasks DB: ${personalTasksDb.id}`);

  const ids = {
    parentPageId: PARENT_PAGE_ID,
    referencePageId: refPage.id,
    referenceSubpageIds: refSubpageIds,
    databases: {
      courses: coursesDb.id,
      academicItems: academicItemsDb.id,
      projectTracker: projectTrackerDb.id,
      personalTasks: personalTasksDb.id,
    },
  };

  const idsFile = path.resolve(__dirname, "ids.json");
  fs.writeFileSync(idsFile, JSON.stringify(ids, null, 2));
  console.log(`\n✅ Phase 1 Complete! Saved IDs to ${idsFile}`);
}

main().catch(console.error);
