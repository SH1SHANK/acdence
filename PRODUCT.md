# PRODUCT.md — Acdence Product Overview

> **Acdence** is the canonical academic command center for students enrolled in the **IIT Madras BS in Data Science & Applications** programme. It consolidates every critical piece of semester information — deadlines, grades, eligibility rules, project workflows, and reference documents — into a single, fast, offline-capable dashboard.

---

## Who It's For

**Primary user:** A single student enrolled in the IIT Madras BS programme, specifically the **September 2026 Term**, taking the following courses:

| Course Code | Course Name                                 | Credits | Type    |
| :---------- | :------------------------------------------ | :-----: | :------ |
| CS2005      | Programming Concepts using Java             |    4    | Theory  |
| SE2001      | System Commands                             |    3    | Theory  |
| CS2006      | Application Development II                  |    4    | Theory  |
| CS2006P     | Application Development II Project (TMA V2) |    2    | Project |
| MS2001      | Business Data Management                    |    4    | Theory  |

---

## Problem Statement

IIT Madras BS students must simultaneously manage:

1. **Multiple weekly assignments** across 4–5 courses, each with different eligibility rules (best N of M, all required, etc.)
2. **Hard eligibility cutoffs** — missing a single cutoff permanently locks the student out of a final exam or project evaluation
3. **Complex grade formulas** — each course uses a distinct formula (GAA + Quiz + OPPE + End Term with varying weights)
4. **Project milestones** — a 7-stage project workflow with GitHub integration, pre/post-submission validation, and two levels of viva
5. **Reference documents** — 7 authoritative documents covering grading policies, project specs, viva checklists, and git setup
6. **No canonical aggregate view** — the official IITM portal shows information per course in isolation; students must manually cross-reference spreadsheets, PDF documents, and portal pages

**Acdence solves this by being the single source of truth, built directly from the official term documents, and presenting everything in one coherent, fast, private interface.**

---

## Core Value Propositions

### 1. Zero-Confusion Deadline Tracking

- A 7-day rolling `DateStrip` shows every event in the current week at a glance
- `AtAGlanceSection` surfaces the single most important action right now (next deadline, next cutoff, registration window)
- Hard eligibility cutoffs are visually differentiated with rose/red color coding — they can never be missed accidentally

### 2. Live Grade Calculation

- Every assessment score entered by the user triggers an instant recalculation of:
  - GAA (Graded Assignment Average) — applying course-specific best-N policies
  - Eligibility status (quiz eligibility, OPPE eligibility, end-term eligibility)
  - Projected final letter grade (S, A, B, C, D, E, U, I)
- Grade formulas are hardcoded from the authoritative September 2026 grading document

### 3. Complete Project Workflow Management

- The `ProjectHubSheet` covers the entire CS2006P lifecycle:
  - Track selection (prior semester theory vs current term)
  - 7 sequential project stages: Git Tracker → Development → Pre-Submission Validation → Submission → Post-Submission Validation → Plagiarism Screening → Viva L1 → Viva L2
  - TMA V2 requirements checklist (tech stack, core features, deliverables)
  - Viva preparation checklist with 20+ items
  - Live GitHub repository integration (commit count, last push, branch info)
  - L1/L2 score entry and final grade calculation

### 4. Authoritative Reference Document Library

Seven official term documents are embedded and rendered inline as a full markdown document reader:

- September 2026 Course Grading System Guidelines
- MAD-2 Project and Viva Instructions
- Viva Preparation Checklist
- Trekking Management Application V2 specs
- Examination Management Portal V2 specs
- GIT Helper Document for App Dev Project
- TMA V2 Milestones schedule

### 5. Personal Task Manager

- Kanban board (todo / in_progress / done) integrated into the sidebar
- Tasks can be linked to specific course codes
- Pre-seeded with high-priority tasks for the term (SCT registration, Git Tracker setup, BPT prep)
- Priority levels: high / medium / low with visual indicators

### 6. Keyboard-First Command Palette (⌘K)

- Full-text search across courses, documents, tools, and data actions
- Category filters: Courses, Tools, Documents, Data
- Arrow key navigation, Enter to execute, Esc to dismiss
- Surfaced actions: open any course, navigate calendar with filters (cutoffs/exams/project), open documents, trigger backup

### 7. Data Sovereignty — Local-First, No Backend

- All user data (scores, statuses, tasks, project progress) is persisted exclusively in `localStorage`
- No authentication, no server, no telemetry
- Full JSON export/import for backup and device migration via `DataBackupDialog`
- Schema versioned (`schemaVersion: 1`) for forward-compatible migration
- One-click factory reset with confirmation

---

## Key Features

### Dashboard

| Feature                 | Description                                                                   |
| :---------------------- | :---------------------------------------------------------------------------- |
| Live IST Clock          | Real-time clock isolated in its own component to prevent re-renders of parent |
| DateStrip               | 7-day horizontal strip; click any day to open day detail modal                |
| AtAGlanceSection        | Urgency-aware next action, semester progress %, days to next cutoff           |
| CourseGrid              | Card per course showing current grade, eligibility status, SCT badge          |
| ProjectSummaryCard      | Quick project progress: stage, deadline, L1/L2 scores                         |
| AcademicCalendarSection | Full month calendar + date-specific event sidebar                             |

### Sheets (Slide-in Panels)

| Sheet               | Contents                                                                     |
| :------------------ | :--------------------------------------------------------------------------- |
| CourseDetailSheet   | Assessments table, grade formula breakdown, eligibility status, SCT tracking |
| ProjectHubSheet     | Track, stages, requirements, GitHub repo, viva checklist, scores             |
| AgendaCalendarSheet | Chronological event timeline with type/course filters                        |
| DocumentReaderSheet | Rendered markdown viewer for 7 reference documents                           |
| TaskBoardSheet      | Kanban task board with add/edit/delete/status toggle                         |

### Dialogs

| Dialog             | Trigger                         |
| :----------------- | :------------------------------ |
| CommandMenuDialog  | ⌘K or Search button             |
| DataBackupDialog   | More → Backup & Export          |
| ResetConfirmDialog | More → Reset Local State        |
| DayDetailDialog    | Click any day cell in DateStrip |

---

## Academic Event Types

| Type                 | Description                                                          |
| :------------------- | :------------------------------------------------------------------- |
| `assignment`         | Weekly graded assignments (GA / GrPA)                                |
| `eligibility_close`  | Hard cutoff windows — exam eligibility closes                        |
| `exam`               | In-centre or online proctored exams (Quiz 1, Quiz 2, OPPE, End Term) |
| `bpt_release`        | Biweekly Programming Test content release                            |
| `bpt_deadline`       | BPT submission deadline                                              |
| `project_milestone`  | CS2006P milestone checkpoints                                        |
| `project_submission` | Final project submission deadlines                                   |
| `project_validation` | Pre/post-submission validation form windows                          |
| `viva`               | Viva scheduling windows                                              |
| `academic_milestone` | Term registration, content release, course drop windows              |

---

## Data Architecture

### Persisted State (`PersistedUserState`)

```typescript
{
  schemaVersion: number;
  assessmentRecords: Record<string, AssessmentRecord>; // score + attempted per assessment
  sctStatus: Record<CourseCode, SctStatus>;            // pending | passed | failed
  projectState: ProjectUserState;                       // track, stages, requirements, scores, GitHub
  vivaChecklistState: Record<string, boolean>;          // viva prep item completion
  tasks: SemesterTask[];                                // personal task list
  notes?: Record<string, string>;                       // per-entity freetext notes
  githubRepo?: GitHubRepoReference;                     // connected GitHub repo
  updatedAt: string;
}
```

All state is stored under the `localStorage` key `iitm_sep2026_user_state`.

### Canonical Data (Read-Only, Hardcoded)

| Data File                 | Contents                                         |
| :------------------------ | :----------------------------------------------- |
| `src/data/courses.ts`     | 5 courses with grading policy configs            |
| `src/data/assessments.ts` | ~80 assessment definitions across all courses    |
| `src/data/events.ts`      | ~100 academic events for the full term           |
| `src/data/semester.ts`    | 12-week academic calendar with dates             |
| `src/data/project.ts`     | Project stages, tracks, requirements for CS2006P |
| `src/data/viva.ts`        | Viva preparation checklist items                 |

---

## Semester Coverage

**Term:** September 2026  
**Content Start:** 2 October 2026  
**Term End:** 10 January 2027  
**Weeks:** 12 academic weeks  
**Registration Window:** 22–23 September 2026

Key milestone dates:

- **Week 4 end (Nov 1):** OPPE 1 eligibility closes
- **Week 5 (Nov 12–13):** Quiz 1
- **Week 6 (Nov 19):** OPPE 1
- **Week 7 end (Nov 25):** End Term eligibility closes (best 5 of 7)
- **Week 8 end (Nov 29):** OPPE 2 eligibility closes
- **Week 10 end (Dec 13):** GAA calculation closes
- **Nov 17:** CS2006P submission deadline (Track A: prior semester)
- **Dec 10:** CS2006P submission deadline (Track B: current semester)
- **Jan 7–10, 2027:** End Term exams

---

## Technical Stack

| Layer           | Technology                              |
| :-------------- | :-------------------------------------- |
| Framework       | React 19                                |
| Bundler         | Vite 8 (Rolldown) via Vite+ (`vp`)      |
| Language        | TypeScript 6 (strict)                   |
| Styling         | Tailwind CSS v4                         |
| UI Components   | shadcn/ui (Radix primitives)            |
| Icons           | Lucide React                            |
| Font            | Outfit Variable (Google Fonts variable) |
| State           | React `useState` + `localStorage`       |
| Testing         | Vitest 4 (17 test files, 131 tests)     |
| Package Manager | Bun                                     |

---

## Non-Goals

- **No multi-user support** — single student, single device (export/import for migration)
- **No server or backend** — fully static, offline-capable
- **No light mode** — dark mode only by design
- **No notification system** — pull model (user checks the dashboard)
- **No automatic data sync** — manual export/import only
- **Not multi-term** — hardcoded for September 2026; future terms require a new build
