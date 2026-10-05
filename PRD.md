# PRD.md — Acdence Product Requirements Document

**Product:** Acdence — Academic Command Center  
**Term:** September 2026 (IIT Madras BS in Data Science & Applications)  
**Document Status:** Living document — reflects current implemented state  
**Audience:** Engineering, design, and future maintainers

---

## 1. Overview

Acdence is a single-page, local-first academic dashboard that unifies deadline tracking, live grade calculation, project workflow management, reference document reading, and personal task management for one IIT Madras BS student across a 12-week academic term.

### Goals

1. Reduce cognitive overhead of managing 5 simultaneous courses with different grading rules
2. Eliminate the risk of missing hard eligibility cutoffs through persistent, contextual urgency signals
3. Provide accurate, live grade projections derived from the official grading document
4. Serve as the single source of truth for all term-related academic data
5. Achieve and maintain Lighthouse scores: Performance ≥ 95, Accessibility = 100, SEO = 100

### Non-Goals

- Multi-user, authentication, or server-side data storage
- Cross-term or multi-institution generalisation
- Real-time sync with the IITM portal
- Native mobile app (PWA or hybrid)
- Notification push system

---

## 2. User Personas

### Primary: The Student (Solo User)

| Attribute       | Value                                                                                                                                         |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Programme**   | IIT Madras BS in Data Science & Applications                                                                                                  |
| **Term**        | September 2026                                                                                                                                |
| **Courses**     | CS2005, SE2001, CS2006, CS2006P (project), MS2001                                                                                             |
| **Device**      | Desktop / laptop browser (Chrome, Safari, Firefox)                                                                                            |
| **Context**     | Studying from home or hostel; needs instant answer to "what do I do next?"                                                                    |
| **Pain points** | Scattered deadlines across portal emails/PDFs; no aggregate grade view; complex eligibility rules across courses; project lifecycle is opaque |

---

## 3. Functional Requirements

### 3.1 Dashboard — Core Layout

**REQ-DASH-01** The application MUST display a persistent sticky header containing:

- Brand logo and "Acdence" product name
- Active semester label ("September 2026 Term")
- Live IST clock (seconds-resolution, isolated from parent re-renders)
- Search / Command Palette trigger button (⌘K)
- More menu with: Academic Calendar, Documents, Tasks, Backup & Export, Restore Data, Command Palette, Reset Local State

**REQ-DASH-02** The header MUST provide a keyboard-accessible "More" overflow dropdown (Radix DropdownMenu) with clear groupings: Workspace, Data, Application.

**REQ-DASH-03** The main content area MUST be responsive (mobile-first) and use a 12-column grid for lg+ breakpoints.

---

### 3.2 DateStrip — 7-Day Rolling Week View

**REQ-DS-01** Display 7 consecutive days starting from Monday of the current week.

**REQ-DS-02** Each day cell MUST show:

- Day of week abbreviation (MON, TUE, etc.)
- Day number
- "TODAY" badge on the current day
- Event count summary text (e.g., "2 events", "Nothing scheduled")
- Up to 3 event preview pills (course code or event label, truncated title, time)
- "+N more" indicator when >3 events exist

**REQ-DS-03** The "today" cell MUST be visually distinguished with `ring-1 ring-inset ring-primary/60` and primary-coloured day-of-week text.

**REQ-DS-04** Clicking any day cell MUST open `DayDetailDialog` listing all events for that day.

**REQ-DS-05** Previous/Next week navigation MUST be provided via chevron buttons. A "Today" button MUST reset the view to the current week.

**REQ-DS-06** The strip MUST be horizontally scrollable on narrow viewports (min-width 720 px inner container).

**REQ-DS-07** Hard cutoff events (eligibility close, exam) MUST render with rose-coloured pills. Exams/vilas with amber. Project milestones with cyan. Assignments with border/muted.

---

### 3.3 AtAGlanceSection — Urgency Summary

**REQ-AGA-01** The section MUST compute and display the single most important next action, determined by the following priority order:

1. Active registration window
2. Assignment due today (any course)
3. Hard eligibility cutoff within 7 days
4. Upcoming exam within 14 days
5. Project deadline within 21 days
6. Next weekly assignment

**REQ-AGA-02** The display MUST include:

- A countdown label ("In 3 days:", "Tomorrow:", "Due today!", "N days overdue:")
- Event title
- Date + time (formatted in IST)
- Course code or category label
- A click-to-navigate action (opens relevant course sheet, project hub, or calendar)

**REQ-AGA-03** The section MUST show semester progress as a percentage complete (0–100%) derived from the number of elapsed academic weeks.

**REQ-AGA-04** The next hard cutoff MUST be shown as a separate indicator when it is distinct from the primary urgency action.

**REQ-AGA-05** During the pre-semester registration window (before content start date Oct 2), the section MUST show a "Registration Open" state.

---

### 3.4 CourseGrid — Course Cards

**REQ-CG-01** Display one card per enrolled theory course (CS2005, SE2001, CS2006, MS2001). CS2006P is handled separately in ProjectSummaryCard.

**REQ-CG-02** Each course card MUST show:

- Course code and full name
- Credit count
- Current computed total score (T, 0–100) or "—" if insufficient data
- Letter grade badge (S/A/B/C/D/E/U/I) or "Pending"
- GAA component score
- Eligibility status indicators (quiz eligible, OPPE eligible, end-term eligible)
- SCT status badge (System Compatibility Test: pending / passed / failed)

**REQ-CG-03** Clicking any course card MUST open `CourseDetailSheet` for that course.

**REQ-CG-04** Grade and eligibility values MUST update in real-time as the user enters assessment scores in `CourseDetailSheet`.

---

### 3.5 CourseDetailSheet — Per-Course Grade Tracker

**REQ-CDS-01** Open as a right-side sheet when a course card is clicked.

**REQ-CDS-02** MUST display the following tabs: Assessments, Grade Breakdown, Eligibility.

**REQ-CDS-03** **Assessments tab** MUST list every assessment for the course, grouped by type (Weekly Assignments, Graded Programming Assignments, Quizzes, OPPE, End Term). Each row MUST provide:

- Assessment name and week number
- Score input (numeric, 0 to maxScore)
- "Attempted" checkbox
- Weight description

**REQ-CDS-04** **Grade Breakdown tab** MUST display:

- GAA score with formula description (best N of M, all required)
- Each graded component (Qz, OPPE, F/Midsem, End Term) with weight and computed value
- Total score (T) computed to one decimal place
- Full formula description from the official grading document

**REQ-CDS-05** **Eligibility tab** MUST display per-exam eligibility status (eligible / not eligible / insufficient data) with the specific failing criteria called out.

**REQ-CDS-06** For CS2005 and SE2001, the sheet MUST display an SCT status selector (pending / passed / failed) since these courses require the System Compatibility Test for OPPE access.

---

### 3.6 ProjectHubSheet — CS2006P Project Manager

**REQ-PH-01** Open as a right-side sheet from the ProjectSummaryCard or More menu.

**REQ-PH-02** MUST display the following tabs: Overview, Requirements, Viva, GitHub, Grade.

**REQ-PH-03** **Track selection** MUST be the first step. Two tracks:

- Track A: Theory completed in May 2026 or earlier (submission deadline: Nov 17, 2026; evaluated out of 100)
- Track B: Theory registered in September 2026 (deadline: Dec 10, 2026; evaluated out of 105, capped at 100)

**REQ-PH-04** **Overview tab** MUST show 7 sequential project stages as a visual checklist: 0. Git Tracker Registration (gate for all further stages)

1. Application Development
2. Pre-Submission Validation
3. Submission
4. Post-Submission Validation
5. Plagiarism Screening
6. Viva L1 → Viva L2

**REQ-PH-05** Stages 0 (Git Tracker) MUST be marked as a gate — all subsequent stages are disabled until Stage 0 is checked.

**REQ-PH-06** **Requirements tab** MUST list all TMA V2 requirements, grouped by category: Tech Stack, Core Features, Deliverables, Rules. Each requirement has a checkbox.

**REQ-PH-07** **Viva tab** MUST render the full viva preparation checklist (~20 items) with per-item checkboxes. Items cover dual camera setup, identity verification, environment checks, submission file integrity.

**REQ-PH-08** **GitHub tab** MUST allow the user to:

- Enter a GitHub repository URL
- Fetch live repository metadata (name, owner, default branch, last push, open issues, commit count) via the GitHub REST API
- Display cached results with a "Last synced N ago" indicator
- Clear the cache / disconnect the repo

**REQ-PH-09** **Grade tab** MUST allow L1 score entry and L2 score entry. Display computed final score and letter grade based on the project grading formula.

---

### 3.7 AcademicCalendarSection — Full Month Calendar

**REQ-CAL-01** Render a 7-column month grid (Mon–Sun) showing the full academic term, lazy-loaded.

**REQ-CAL-02** Each day cell MUST show:

- Day number (with today highlighted as a circular bg-primary badge)
- Hard cutoff indicator dot (rose) or exam indicator dot (amber) when applicable
- Event count badge for days with events

**REQ-CAL-03** Clicking a day MUST show events for that day in an adjacent sidebar panel.

**REQ-CAL-04** Adjacent month dates MUST be visible but visually dimmed (opacity-75).

**REQ-CAL-05** Month navigation (previous/next) MUST be provided.

**REQ-CAL-06** The sidebar MUST list selected-day events with: type badge, course code, title, time, and source document reference.

---

### 3.8 AgendaCalendarSheet — Filtered Event Timeline

**REQ-AGENDA-01** Open as a right-side sheet from More menu → Academic Calendar.

**REQ-AGENDA-02** Display all term events in chronological order.

**REQ-AGENDA-03** Filter controls MUST include: All, Cutoffs only, Exams only, Project only.

**REQ-AGENDA-04** Each event entry MUST show: date, time, type badge, course code, title, description.

---

### 3.9 DocumentReaderSheet — Reference Document Viewer

**REQ-DOC-01** Open as a right-side sheet from More menu → Reference Documents.

**REQ-DOC-02** MUST list 7 official reference documents:

1. September 2026 Course Grading System Guidelines
2. MAD-2 Project & Viva Instructions
3. Viva Preparation Checklist
4. Trekking Management Application V2 Specs
5. Examination Management Portal V2 Specs
6. GIT Helper for App Dev Project
7. TMA V2 Milestones Schedule

**REQ-DOC-03** Clicking any document MUST render its full markdown content inline using `marked` (CommonMark).

**REQ-DOC-04** Document content MUST be bundled at build time (no runtime fetch).

---

### 3.10 TaskBoardSheet — Personal Kanban

**REQ-TASK-01** Open as a right-side sheet from More menu → Task Manager or ⌘K.

**REQ-TASK-02** Three columns: Todo, In Progress, Done.

**REQ-TASK-03** Each task card MUST show: title, course code (optional), due date (optional), priority badge (high/medium/low).

**REQ-TASK-04** MUST support: add task, update status (move between columns), delete task.

**REQ-TASK-05** Pre-seeded default tasks MUST be created on first load for the current term. These include: SCT registration, Git Tracker setup, BPT 1 preparation, Redis/Celery local setup.

**REQ-TASK-06** Task count MUST surface in the AppHeader More button as a visual indicator dot when tasks > 0.

---

### 3.11 CommandMenuDialog — ⌘K Spotlight

**REQ-CMD-01** Trigger: ⌘K keyboard shortcut anywhere in the app, or clicking the Search button in the header.

**REQ-CMD-02** MUST support full-text search across all command items.

**REQ-CMD-03** Command categories: Courses, Tools, Documents, Data.

**REQ-CMD-04** Commands MUST include:

- Open any of the 5 courses
- Open Academic Calendar (optionally filtered: cutoffs, exams, project)
- Open each reference document
- Open Task Manager
- Open Backup
- Trigger Reset

**REQ-CMD-05** Keyboard navigation: Arrow Up/Down to move selection, Enter to execute, Escape to close.

**REQ-CMD-06** MUST show category badges and keyboard shortcuts where applicable.

---

### 3.12 Data Backup & Restore

**REQ-BKP-01** `DataBackupDialog` MUST provide two tabs: Export and Import.

**REQ-BKP-02** **Export tab** MUST render the full persisted state as formatted JSON and provide a "Download" button generating a `acdence-backup-YYYY-MM-DD.json` file.

**REQ-BKP-03** **Import tab** MUST accept a JSON file upload. On upload it MUST:

- Validate the JSON schema
- Show a preview of the data
- Offer "Restore" confirmation before overwriting current state

**REQ-BKP-04** Import MUST reject files with incompatible `schemaVersion`.

---

### 3.13 State Reset

**REQ-RESET-01** More menu → Reset Local State MUST open a confirmation dialog (`ResetConfirmDialog`).

**REQ-RESET-02** Confirmation MUST require an explicit second action (click "Reset" button in dialog) before executing.

**REQ-RESET-03** Reset MUST delete all persisted data and reinitialise state to defaults (fresh assessment records, default tasks, empty project state).

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric                          |  Target  | Achieved  |
| :------------------------------ | :------: | :-------: |
| Lighthouse Performance (Mobile) |   ≥ 95   |  **96**   |
| First Contentful Paint          | < 2.0 s  | **1.8 s** |
| Largest Contentful Paint        | < 2.5 s  | **2.5 s** |
| Total Blocking Time             | < 200 ms | **70 ms** |
| Cumulative Layout Shift         |    0     |   **0**   |
| Speed Index                     | < 2.0 s  | **1.8 s** |

**REQ-PERF-01** All routes that are not in the critical render path MUST be code-split using `React.lazy` + `React.Suspense`.

**REQ-PERF-02** The primary font (`outfit-latin-wght-normal.woff2`) MUST be preloaded in `index.html`.

**REQ-PERF-03** A critical CSS/HTML shell MUST be inlined in `<div id="root">` for instant first paint.

**REQ-PERF-04** Production build MUST complete in < 500 ms via Vite+ / Rolldown.

---

### 4.2 Accessibility

| Metric                   | Target | Achieved |
| :----------------------- | :----: | :------: |
| Lighthouse Accessibility |  100   | **100**  |
| WCAG Level               | 2.1 AA |    ✅    |

**REQ-A11Y-01** All interactive elements MUST have accessible names derivable from visible text content.

**REQ-A11Y-02** Minimum contrast ratios MUST be maintained: 4.5:1 for normal text, 3:1 for large text and UI components.

**REQ-A11Y-03** All animations and transitions MUST collapse to < 1 ms when `prefers-reduced-motion: reduce` is active.

**REQ-A11Y-04** Focus states MUST be visually distinct (ring-2, outline-primary).

**REQ-A11Y-05** Decorative elements MUST use `aria-hidden="true"`.

---

### 4.3 SEO

| Metric         | Target | Achieved |
| :------------- | :----: | :------: |
| Lighthouse SEO |  100   | **100**  |

**REQ-SEO-01** `index.html` MUST include a `<meta name="description">` tag.

**REQ-SEO-02** `public/robots.txt` MUST exist and be valid (`User-agent: * / Allow: /`).

**REQ-SEO-03** `<html lang="en">` MUST be set.

**REQ-SEO-04** Page title MUST be descriptive: `Acdence · September 2026`.

---

### 4.4 Browser & Platform Compatibility

**REQ-COMPAT-01** MUST support modern evergreen browsers: Chrome 120+, Safari 17+, Firefox 122+.

**REQ-COMPAT-02** MUST function fully offline after first load (no runtime network requirements for core functionality).

**REQ-COMPAT-03** GitHub integration is the ONLY optional network dependency (gracefully degrades when offline).

---

### 4.5 Data Integrity

**REQ-DATA-01** All canonical academic data (events, assessments, courses, grading formulas) MUST be sourced from official September 2026 IITM documents and validated against those documents.

**REQ-DATA-02** All canonical data records MUST include a `source` field with `documentName`, `documentSection`, `page`, `term`, and `verifiedAt` timestamp.

**REQ-DATA-03** Grade calculations MUST match the formulas specified in the official "Sep 2026 Term: Course Grading System Guidelines" document exactly.

**REQ-DATA-04** Hard eligibility cutoffs MUST be marked with `hardCutoff: true` and `isHardCutoff: true` in the events data.

---

### 4.6 Code Quality

**REQ-QUALITY-01** TypeScript strict mode MUST be enabled at all times.

**REQ-QUALITY-02** Zero lint errors and zero type errors MUST be maintained (`vp check` passes cleanly).

**REQ-QUALITY-03** All 131 unit tests MUST pass on every commit (`vp test`).

**REQ-QUALITY-04** Code formatting MUST follow Oxfmt standards enforced by `vp check --fix`.

---

## 5. Grading Formula Reference

### CS2005 — Programming Concepts using Java

```
GAA = avg(best 6 of 7 GrPAs, weeks 2–8)
Qz  = max(0.20 * max(Q1, Q2), 0.10 * Q1 + 0.20 * Q2)
OPPE = (OPPE1 + OPPE2) / 2  (best of: 0.40*OPPE or 0.30*OPPE if Qz replaces part)
T = 0.30 * GAA + Qz + 0.30 * OPPE + 0.30 * F
Eligibility: best 5 of 7 weekly assessments ≥ 40/100 each
```

### SE2001 — System Commands

```
GAA = avg(best 9 of 10 weekly graded assignments)
BPT = avg(best of BPT1, BPT2, BPT3, BPT4)
T = 0.10 * GAA + 0.40 * BPT + 0.50 * F
Eligibility: best 5 of 8 BPTs ≥ passing threshold
```

### CS2006 — Application Development II

```
GAA = avg(PA1 + PA2) (both required)
T = 0.20 * GAA + 0.80 * F
No SCT required
```

### MS2001 — Business Data Management

```
GAA = avg(first 9 weekly GAs, all required)
T = 0.10 * GAA + 0.90 * F
No SCT required
```

### CS2006P — Application Development II Project

```
Track A (prior theory): Final = L2_score / 100 → letter grade
Track B (current theory): Final = min(L2_score, 100) / 105 → letter grade
L2 eligibility: L1 ≥ 50% of max L1 marks
```

---

## 6. Command Palette Command Registry

| Command                          | Category    | Shortcut |
| :------------------------------- | :---------- | :------: |
| Open CS2005 — Java               | Courses     |    —     |
| Open SE2001 — System Commands    | Courses     |    —     |
| Open CS2006 — App Dev II         | Courses     |    —     |
| Open MS2001 — Business Data Mgmt | Courses     |    —     |
| Academic Calendar                | Tools       |    —     |
| Calendar: Show Cutoffs           | Tools       |    —     |
| Calendar: Show Exams             | Tools       |    —     |
| Calendar: Show Project           | Tools       |    —     |
| Task Manager                     | Tools       |    —     |
| Sep 2026 Grading Guidelines      | Documents   |    —     |
| MAD-2 Project Instructions       | Documents   |    —     |
| Viva Checklist                   | Documents   |    —     |
| TMA V2 Specs                     | Documents   |    —     |
| Exam Portal V2 Specs             | Documents   |    —     |
| GIT Helper                       | Documents   |    —     |
| TMA V2 Milestones                | Documents   |    —     |
| Backup & Export                  | Data        |    —     |
| Reset Local State                | Data        |    —     |
| Command Palette                  | Application |    ⌘K    |

---

## 7. Future Considerations (Out of Scope for September 2026)

The following enhancements are acknowledged but explicitly deferred:

- **Multi-term architecture** — abstract the semester config to support future terms without a rebuild
- **PWA / installable app** — service worker, offline manifest, home screen icon
- **Grade prediction / "what-if" calculator** — simulate future assessment scores to project grade outcomes
- **Calendar subscription export** — generate `.ics` file for all term events importable into Google Calendar / Apple Calendar
- **Collaborative study group notes** — shared notes on courses or events (requires backend)
- **IITM portal scraping integration** — auto-import scores from the student portal (requires authentication + scraper)
- **Accessibility audit recurring schedule** — automated Lighthouse CI on every PR
- **Light mode** — not planned; the product's identity is dark-first
