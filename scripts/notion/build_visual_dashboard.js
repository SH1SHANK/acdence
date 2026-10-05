import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PARENT_PAGE_ID, NOTION_TOKEN, sleep } from "./common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function notionApi(endpoint, method = "GET", body = null) {
  await sleep(350);
  const res = await fetch(`https://api.notion.com/v1/${endpoint.replace(/^\//, "")}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2026-03-11",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[Notion ${res.status}] ${JSON.stringify(data)}`);
  }
  return data;
}

async function createLinkedContainer(dataSourceId, viewConfig) {
  const payload = {
    create_database: {
      parent: {
        type: "page_id",
        page_id: PARENT_PAGE_ID,
      },
    },
    data_source_id: dataSourceId,
    name: viewConfig.name,
    type: viewConfig.type,
  };
  if (viewConfig.filter) payload.filter = viewConfig.filter;
  if (viewConfig.sorts) payload.sorts = viewConfig.sorts;
  if (viewConfig.configuration) payload.configuration = viewConfig.configuration;

  const res = await notionApi("/views", "POST", payload);
  return {
    viewId: res.id,
    containerDbId: res.parent.database_id,
  };
}

async function addViewToContainer(containerDbId, dataSourceId, viewConfig) {
  const payload = {
    database_id: containerDbId,
    data_source_id: dataSourceId,
    name: viewConfig.name,
    type: viewConfig.type,
  };
  if (viewConfig.filter) payload.filter = viewConfig.filter;
  if (viewConfig.sorts) payload.sorts = viewConfig.sorts;
  if (viewConfig.configuration) payload.configuration = viewConfig.configuration;

  const res = await notionApi("/views", "POST", payload);
  return res.id;
}

async function appendBlocks(children) {
  return notionApi(`/blocks/${PARENT_PAGE_ID}/children`, "PATCH", {
    children,
  });
}

function headingBlock(text, level = 2) {
  const type = level === 1 ? "heading_1" : level === 2 ? "heading_2" : "heading_3";
  return {
    object: "block",
    type,
    [type]: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function calloutBlock(text, emoji = "📌") {
  return {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji },
      rich_text: [{ type: "text", text: { content: text } }],
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
  console.log("=== REDESIGNING NOTION OPERATIONAL DASHBOARD ===\n");

  const ids = JSON.parse(fs.readFileSync(path.resolve(__dirname, "ids.json"), "utf8"));

  // 1. Fetch data_source_ids for all 4 databases
  console.log("1. Resolving Data Source IDs for all 4 databases...");
  const dataSources = {};
  for (const [key, dbId] of Object.entries(ids.databases)) {
    const db = await notionApi(`/databases/${dbId}`);
    dataSources[key] = db.data_sources[0].id;
    console.log(`   ${key}: DB ${dbId} -> Data Source ${dataSources[key]}`);
  }

  // 2. Clear out any stray test blocks on parent page
  const parentBlocks = await notionApi(`/blocks/${PARENT_PAGE_ID}/children`);
  const strayBlocks = parentBlocks.results.filter((b) => b.type !== "child_page");
  if (strayBlocks.length > 0) {
    console.log(`2. Cleaning ${strayBlocks.length} stray blocks...`);
    for (const b of strayBlocks) {
      await notionApi(`/blocks/${b.id}`, "DELETE");
      await sleep(150);
    }
  }

  // 3. Section 1: Hero Header
  console.log("\n3. Building Section 1: Hero / Current Term Header...");
  await appendBlocks([
    calloutBlock(
      "🎓 IITM BS DEGREE — SEPTEMBER 2026 ACADEMIC COMMAND CENTER\n" +
        "• Current Phase: Term Kickoff & SCT Registration (Term Starts: Oct 2, 2026)\n" +
        "• Enrolled Courses: 5 (17 Credits) — CS2005 (4), SE2001 (3), CS2006 (4), CS2006P (2), MS2001 (4)\n" +
        "• Nearest Critical Cutoffs: Course Drop Window (Oct 18, 2026) | OPPE SCT Window 1 (Oct 30, 2026)",
      "⚡",
    ),
    calloutBlock(
      "QUICK JUMP:  ⚡ Next Up  |  ⏰ Upcoming  |  📊 Course Cards  |  🗓️ Calendar  |  🗺️ Roadmap  |  🛠️ CS2006P  |  ✅ Tasks  |  📁 Data Hub",
      "🧭",
    ),
    dividerBlock(),
  ]);

  // 4. Section 2: Priority Center: Next Up (Linked Academic Items)
  console.log("\n4. Building Section 2: Priority Center: Next Up...");
  await appendBlocks([headingBlock("⚡ Priority Center: Next Up", 2)]);

  const priorityContainer = await createLinkedContainer(dataSources.academicItems, {
    name: "Next Up",
    type: "table",
    filter: {
      and: [
        { property: "Status", select: { does_not_equal: "Completed" } },
        { property: "Status", select: { does_not_equal: "Present" } },
      ],
    },
    sorts: [{ property: "Date", direction: "ascending" }],
  });
  console.log(`   Created Priority Center container: ${priorityContainer.containerDbId}`);

  await addViewToContainer(priorityContainer.containerDbId, dataSources.academicItems, {
    name: "Critical Cutoffs",
    type: "table",
    filter: {
      and: [
        { property: "Hard Cutoff", checkbox: { equals: true } },
        { property: "Status", select: { does_not_equal: "Completed" } },
      ],
    },
    sorts: [{ property: "Date", direction: "ascending" }],
  });

  await addViewToContainer(priorityContainer.containerDbId, dataSources.academicItems, {
    name: "This Week",
    type: "table",
    sorts: [{ property: "Date", direction: "ascending" }],
  });

  await addViewToContainer(priorityContainer.containerDbId, dataSources.academicItems, {
    name: "Pending Scores & Work",
    type: "table",
    filter: { property: "Status", select: { equals: "Pending" } },
    sorts: [{ property: "Date", direction: "ascending" }],
  });

  await appendBlocks([dividerBlock()]);

  // 5. Section 3: Upcoming Deadlines (Next 14 Days)
  console.log("\n5. Building Section 3: Upcoming Deadlines...");
  await appendBlocks([headingBlock("⏰ Upcoming Deadlines (Next 14 Days)", 2)]);

  const upcomingContainer = await createLinkedContainer(dataSources.academicItems, {
    name: "Next 14 Days",
    type: "table",
    sorts: [{ property: "Date", direction: "ascending" }],
  });

  await addViewToContainer(upcomingContainer.containerDbId, dataSources.academicItems, {
    name: "By Assessment Type",
    type: "board",
  });

  await appendBlocks([dividerBlock()]);

  // 6. Section 4: Master Course Gradebook (Gallery Cards)
  console.log("\n6. Building Section 4: Master Course Gradebook...");
  await appendBlocks([headingBlock("📊 Master Course Gradebook", 2)]);

  const courseCardProps = [
    { property_id: "title", visible: true },
    { property_id: "zn%3E%5D", visible: true }, // Course Name
    { property_id: "QbmO", visible: true }, // Credits
    { property_id: "l%40R%3C", visible: true }, // Diagnostics
    { property_id: "NOM%5D", visible: true }, // GAA Summary
    { property_id: "yZT~", visible: true }, // ET Eligibility
    { property_id: "L%7DCQ", visible: true }, // OPPE1 Eligibility
    { property_id: "Iog%60", visible: true }, // OPPE2 Eligibility
    { property_id: "%5Cmff", visible: true }, // Course Grade Gate
    { property_id: "%3FkhI", visible: true }, // Next Action
  ];

  const coursesContainer = await createLinkedContainer(dataSources.courses, {
    name: "Course Cards",
    type: "gallery",
    configuration: {
      type: "gallery",
      properties: courseCardProps,
    },
  });
  console.log(`   Created Course Cards container: ${coursesContainer.containerDbId}`);

  await addViewToContainer(coursesContainer.containerDbId, dataSources.courses, {
    name: "Detailed Gradebook",
    type: "table",
  });

  await addViewToContainer(coursesContainer.containerDbId, dataSources.courses, {
    name: "Diagnostics & Gating Alerts",
    type: "table",
  });

  await appendBlocks([dividerBlock()]);

  // 7. Section 5: Academic Calendar
  console.log("\n7. Building Section 5: Academic Calendar...");
  await appendBlocks([headingBlock("🗓️ Semester Academic Calendar", 2)]);

  const calendarContainer = await createLinkedContainer(dataSources.academicItems, {
    name: "Full Term Calendar",
    type: "calendar",
  });
  console.log(`   Created Academic Calendar container: ${calendarContainer.containerDbId}`);

  await addViewToContainer(calendarContainer.containerDbId, dataSources.academicItems, {
    name: "Exams & OPPEs",
    type: "calendar",
    filter: {
      or: [
        { property: "Item Type", select: { equals: "Quiz" } },
        { property: "Item Type", select: { equals: "OPPE" } },
        { property: "Item Type", select: { equals: "ReOPPE" } },
        { property: "Item Type", select: { equals: "End Term" } },
      ],
    },
  });

  await addViewToContainer(calendarContainer.containerDbId, dataSources.academicItems, {
    name: "Hard Cutoffs",
    type: "calendar",
    filter: { property: "Hard Cutoff", checkbox: { equals: true } },
  });

  await addViewToContainer(calendarContainer.containerDbId, dataSources.academicItems, {
    name: "Project Milestones",
    type: "calendar",
    filter: { property: "Item Type", select: { equals: "Project Deadline" } },
  });

  await appendBlocks([dividerBlock()]);

  // 8. Section 6: Semester Roadmap / Term Timeline
  console.log("\n8. Building Section 6: Semester Roadmap...");
  await appendBlocks([headingBlock("🗺️ Semester Roadmap (Timeline)", 2)]);

  const roadmapContainer = await createLinkedContainer(dataSources.academicItems, {
    name: "Term Timeline",
    type: "timeline",
  });
  console.log(`   Created Roadmap container: ${roadmapContainer.containerDbId}`);

  await addViewToContainer(roadmapContainer.containerDbId, dataSources.academicItems, {
    name: "Major Milestones & Exams",
    type: "timeline",
    filter: { property: "Hard Cutoff", checkbox: { equals: true } },
  });

  await appendBlocks([dividerBlock()]);

  // 9. Section 7: CS2006P Project Command Center
  console.log("\n9. Building Section 7: CS2006P Project Tracker...");
  await appendBlocks([headingBlock("🛠️ CS2006P Project Tracker (Trekking App V2 & Viva Hub)", 2)]);

  const projectContainer = await createLinkedContainer(dataSources.projectTracker, {
    name: "Project Pipeline",
    type: "board",
  });
  console.log(`   Created Project Pipeline container: ${projectContainer.containerDbId}`);

  await addViewToContainer(projectContainer.containerDbId, dataSources.projectTracker, {
    name: "9 Stages Roadmap",
    type: "table",
    filter: { property: "Item Type", select: { equals: "Stage" } },
    sorts: [{ property: "Stage Order", direction: "ascending" }],
  });

  await addViewToContainer(projectContainer.containerDbId, dataSources.projectTracker, {
    name: "TMA V2 Requirements Matrix",
    type: "table",
    filter: { property: "Item Type", select: { equals: "Requirement" } },
  });

  await addViewToContainer(projectContainer.containerDbId, dataSources.projectTracker, {
    name: "Viva Prep Protocol",
    type: "table",
    filter: { property: "Item Type", select: { equals: "Viva Prep" } },
  });

  await addViewToContainer(projectContainer.containerDbId, dataSources.projectTracker, {
    name: "All Project Items",
    type: "table",
  });

  await appendBlocks([dividerBlock()]);

  // 10. Section 8: Personal Study & Task Ledger
  console.log("\n10. Building Section 8: Personal Tasks...");
  await appendBlocks([headingBlock("✅ Personal Study & Task Ledger", 2)]);

  const taskContainer = await createLinkedContainer(dataSources.personalTasks, {
    name: "Today & Upcoming",
    type: "table",
    sorts: [{ property: "Due", direction: "ascending" }],
  });
  console.log(`   Created Personal Tasks container: ${taskContainer.containerDbId}`);

  await addViewToContainer(taskContainer.containerDbId, dataSources.personalTasks, {
    name: "Kanban Board",
    type: "board",
  });

  await addViewToContainer(taskContainer.containerDbId, dataSources.personalTasks, {
    name: "By Priority",
    type: "table",
    sorts: [{ property: "Priority", direction: "ascending" }],
  });

  await appendBlocks([dividerBlock()]);

  // 11. Section 9: Reference & Backend Repository Hub
  console.log("\n11. Building Section 9: Reference & Backend Repository...");
  await appendBlocks([
    headingBlock("📁 Data Sources & Reference Hub", 2),
    calloutBlock(
      "Permanent home of the 4 canonical databases (Courses, Academic Items, Project Tracker, Personal Tasks) " +
        "and official reference documentation (Grading Policy, MAD-2 Project, Viva Checklist, Trekking App V2 Spec).\n" +
        "Click below to access raw data or source texts directly:",
      "📦",
    ),
  ]);

  console.log("\n✅ VISUAL DASHBOARD BUILT SUCCESSFULLY!");
}

main().catch(console.error);
