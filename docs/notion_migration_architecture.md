# Comprehensive Architectural Design & Investigation Report (Revision 2): IITM BS Degree September 2026 Academic Tracker Migration to Notion

**Recipient:** Parent Orchestrator (`2c131394-69c0-4c5c-8bec-d9f364717e31`)  
**Investigator:** Antigravity Senior Review & Database Architecture Agent  
**Target Workspace:** Shashank's Workspace  
**Parent Page:** "IITM BS Degree September 2026" (Page ID: `3e60c9fb-fc81-802b-8df9-f80b9c84b83c`)

---

## 1. Executive Summary & Review Findings

This report delivers a peer-reviewed, mathematically verified, and API-compliant architectural blueprint for migrating the **IITM BS Degree September 2026 Academic Tracker** to Notion.

A rigorous, independent evaluation of the prior investigation was conducted against the authoritative source documents (`docs/reference/sept_2026_grading.txt`, `docs/reference/mad2_project_instructions.txt`, `docs/reference/trekking_app_v2.txt`, `docs/reference/viva_checklist.txt`), the TypeScript codebase implementations (`src/grading/*.ts`, `src/data/*.ts`), Notion API v2025-09-03 documentation fetched via Context7, and the Notion skill package (`intellectronica/agent-skills@notion-api`).

### Summary of Critical Defects Identified in Prior Investigation:

1. **Viva Scoring Scale Distortion:** The prior worker claimed L1 and L2 vivas were scored "0–50 and 0–50". Official guidelines (`mad2_project_instructions.txt` lines 220–231) and `src/data/assessments.ts` prove L1 is out of **40** (weight 40%) and L2 is out of **60** (weight 60%).
2. **Project Stage 7 Unlock Logic Bug:** The prior report unlocked Stage 7 (L2 Viva) whenever Stage 6 score was $\ge 20$. In reality, scoring 20–29 in L1 terminates the project with an **E grade**; Stage 7 is strictly locked unless L1 score is $\ge 30$.
3. **Database Column Formula Fragmentation:** The prior report provided disconnected per-course formulas for CS2005, SE2001, etc., ignoring the fundamental Notion constraint that **a single formula property applies to all rows in a database**. We have synthesized true, unified Formulas 2.0 expressions that branch dynamically on `prop("Course Code")`.
4. **Non-Existent Property Accessors:** Prior formulas referenced `prop("Score")` and `prop("Programming Exam Part")`, which did not match the schemas (`prop("Effective Score")`, `prop("Exam / OPPE Part")`), guaranteeing syntax compilation errors in Notion.
5. **Notion API `status` Property Constraint Omission:** The prior report specified `"type": "status"` across multiple API payloads. The official Notion API documentation (`references/property-types.md` line 110) explicitly states: _"Creating new status properties via API is not supported."_ All API schemas must provision workflow states as `select` properties.
6. **Relational Inconsistency for Viva Scores:** The prior design had a dangling `Score Achieved` field in `CS2006P Pipeline` while formulas dereferenced `Fixed Exams`. We established a clean, unified relational model.
7. **Cardinality Errors:** Corrected `Weekly Assessment Records` from 48 to **46** weekly items (+ 18 fixed exams = 64 total), and `CS2006P Requirements Checklist` from 15 to **16** canonical specifications.

---

## 2. Forensic Analysis & Challenge of Prior Findings

Below is the required **claim $\rightarrow$ evidence cited $\rightarrow$ what the code actually shows $\rightarrow$ corrected finding** breakdown:

### Issue 1: CS2006P Viva Max Score Calibration

- **Claim in Prior Report:** Section 2 (Database 5): _"Score Achieved (number): Used for Stage 6 (L1 Viva score 0–50) and Stage 7 (L2 Viva score 0–50)."_
- **Evidence Cited by Prior Worker:** `docs/reference/mad2_project_instructions.txt`.
- **What the Code & Authoritative Text Actually Show:**
  - `docs/reference/mad2_project_instructions.txt` (lines 220–231):
    ```
    Level 1: Weightage 40%, Pass Score: 20/40 (30/40 for L2 Eligibility)
    Level 2: Weightage 60%, Pass Score: 20/60
    ```
  - `src/data/assessments.ts` (lines 320, 329):
    ```typescript
    id: "cs2006p_viva_l1", maxScore: 40, weightDescription: "40% weight. Thresholds: <20 fail(U), 20-29 pass(E), >=30 L2 eligible."
    id: "cs2006p_viva_l2", maxScore: 60, weightDescription: "60% weight. Thresholds: 0/absent (E), <20 (D), >=20 (Pass, sum L1+L2)."
    ```
- **Corrected Finding:** Level 1 Viva has a maximum score of **40**; Level 2 Viva has a maximum score of **60**. Entering 30 on a 50 scale would represent 60%, but on the canonical 40 scale, 30 represents 75% and unlocks Level 2.

---

### Issue 2: CS2006P Stage 7 Lock Status Logic Gate

- **Claim in Prior Report:** Section 2 (Database 5) defined `Gate Passed` as `prop("Stage Order") == 6, prop("Score Achieved") >= 20`, and unlocked Stage 7 whenever `Prerequisite Stage.Gate Passed == true`.
- **Evidence Cited by Prior Worker:** Sequential prerequisite chaining.
- **What the Code & Authoritative Text Actually Show:**
  - `docs/reference/mad2_project_instructions.txt` (lines 185–194):
    `Step 5c: If you pass Level 1 viva (20 <= marks < 30) -> pass project with E grade but NOT eligible for level 2 exam.`
    `Step 5d: If you pass Level 1 viva (marks >= 30) -> eligible to attend Level 2 viva.`
  - `src/grading/project.ts` (lines 45–69):
    `l1Score >= 20 && l1Score < 30` awards E grade and sets `l2Eligible: false`. Only `l1Score >= 30` sets `l2Eligible: true`.
- **Corrected Finding:** Unlocking Stage 7 at $\ge 20$ causes students with scores of 20–29 to see Stage 7 as "🔓 Unlocked", directly violating IITM policy. Stage 7's `Lock Status` must explicitly verify `prop("Prerequisite Stage").first().prop("Score Achieved") >= 30`.

---

### Issue 3: Inconsistent Property Names in Formula Expressions

- **Claim in Prior Report:** In Section 3.2 D, 3.2 F, and 3.3 B, formulas used `q1Rec.prop("Score")`, `oppeRec.prop("Score")`, `reoppeRec.prop("Score")`, `etRec.prop("Score")`, and `prop("Programming Exam Part")`.
- **Evidence Cited by Prior Worker:** Formula 2.0 code blocks.
- **What the Code & Notion Schema Actually Show:**
  - Database 3 (`Fixed Exams`) defined properties `Raw Score` and `Effective Score`. There is no property named `"Score"`.
  - Database 1 (`Courses`) defined `Exam / OPPE Part`. Referencing `prop("Programming Exam Part")` fails compilation.
- **Corrected Finding:** In Notion Formulas 2.0, referring to non-existent property names causes an immediate `validation_error`. All references must strictly use `prop("Effective Score")` (which factors in attendance) and exact schema identifiers.

---

### Issue 4: Fragile BPT Filtering via Text Matching

- **Claim in Prior Report:** Section 3.2 C filtered BPTs using `prop("Assessment Name").contains("BPT 01")`, `contains("BPT 02")`, and `contains("BPT 03")`.
- **Evidence Cited by Prior Worker:** SE2001 OPPE eligibility rule.
- **What the Code & Schema Actually Show:**
  - `Weekly Assessment Records` already contains structured metadata properties: `Assessment Type` (`select`: `BPT`), `Week Number` (`number`), and `OPPE 1 Gate Component` (`checkbox`).
  - Relying on string matching fails if a user types "BPT 1" without a leading zero, or if the name is edited.
- **Corrected Finding:** Use relational predicate filtering on boolean properties:
  `prop("Weekly Assessments").filter(current.prop("Assessment Type") == "BPT" and current.prop("OPPE 1 Gate Component") and !empty(current.prop("Effective Score")))`.

---

### Issue 5: Omission of Unified Database Formulas for `Courses`

- **Claim in Prior Report:** Section 3 provided isolated formula snippets labeled "3.1 CS2005", "3.2 SE2001", "3.3 CS2006", "3.4 CS2006P".
- **Evidence Cited by Prior Worker:** Notion Formulas 2.0 capability.
- **What the Code & Notion Architecture Actually Show:**
  - A Notion database schema contains **exactly one formula expression per property** across all rows.
  - If a user copies the snippet from 3.1 into the `Total Score T` property, it calculates Java scores for SE2001, CS2006, and MS2001.
- **Corrected Finding:** All per-course formulas must be merged into unified Formulas 2.0 expressions using top-level `ifs(prop("Course Code") == "CS2005", ..., prop("Course Code") == "SE2001", ...)` branches.

---

### Issue 6: Notion API Schema Incompatibility with `"type": "status"`

- **Claim in Prior Report:** Section 2 specified `"status"` property schemas for `Weekly Assessment Records`, `Fixed Exams`, `CS2006P Pipeline`, and `CS2006P Requirements Checklist`.
- **Evidence Cited by Prior Worker:** Notion API v2025-09-03 schema.
- **What the Code & Notion API Documentation Show:**
  - Notion API reference (`/var/folders/.../notion-api/references/property-types.md` line 110):
    `Note: Creating new status properties via API is not supported.`
  - Calling `POST /v1/databases` or `POST /v1/data_sources` with `"type": "status"` returns HTTP 400 `validation_error`.
- **Corrected Finding:** In programmatic provisioning scripts, all status columns must be configured as `select` properties with explicit option lists and color palettes.

---

### Issue 7: Cardinality Discrepancies

- **Claim in Prior Report:** `Weekly Assessment Records` has 48 rows; `CS2006P Requirements Checklist` has 15 rows.
- **Evidence Cited by Prior Worker:** `src/data/assessments.ts` and `src/data/project.ts`.
- **What the Code Actually Shows:**
  - Running `bun -e 'import { ASSESSMENT_DEFINITIONS } ...'` reveals:
    - Weekly Assessments: **46** rows (CS2005: 14, SE2001: 14, CS2006: 9, MS2001: 9).
    - Fixed Exams: **18** rows (CS2005: 5, SE2001: 4, CS2006: 3, MS2001: 3, CS2006P: 3).
    - Total Assessments: **64**.
  - Running `bun -e 'import { TMA_V2_REQUIREMENTS } ...'` reveals: **16** canonical requirements (6 tech stack, 7 core features, 2 deliverables, 1 rules).
- **Corrected Finding:** Update cardinality specifications to exactly 46 weekly assessment records, 18 fixed exam records, and 16 TMA requirements.

---

## 3. Global Entity-Relationship Architecture

```
                               ┌────────────────────────────┐
                               │         Source Log         │
                               │ (7 Official IITM Documents)│
                               └──────────────┬─────────────┘
                                              │ Audit Relations
       ┌──────────────────────────────────────┼──────────────────────────────────────┐
       │                                      │                                      │
       ▼                                      ▼                                      ▼
┌──────────────┐                      ┌───────────────┐                      ┌───────────────┐
│ Hard Cutoffs │◄─────────────────────┤    Courses    ├─────────────────────►│  Fixed Exams  │
│ (15 Freeze & │   Linked Cutoffs     │   (5 Rows)    │   Master Exams       │(18 Exam / SCT │
│  Exam Dates) │                      └───────┬───────┘                      │     Rows)     │
└──────┬───────┘                              │                              └───────┬───────┘
       │                                      │ Master Assessments                   │
       │ Frozen by                            ▼                                      │
       │                              ┌───────────────┐                              │
       ├─────────────────────────────►│    Weekly     │                              │
       │                              │  Assessments  │                              │
       │                              │   (46 Rows)   │                              │
       │                              └───────────────┘                              │
       │                                                                             │
       ▼                                                                             ▼
┌──────────────┐                      ┌───────────────┐                      ┌───────────────┐
│   CS2006P    │◄─────────────────────┤    CS2006P    ├─────────────────────►│   Viva Prep   │
│ Requirements │   Implements         │   Pipeline    │   Gates Viva         │   Checklist   │
│ (16 TMA Reqs)│                      │  (9 Stages)   │                      │  (12 Rules)   │
└──────────────┘                      └───────┬───────┘                      └───────────────┘
                                              │ Linked Viva Exam
                                              └──────────────────────────────────────┘
```

---

## 4. Refined Database Specifications (The 8 Relational Tables)

### Database 1: `Courses` (Parent Registry & Master Gradebook)

- **Container Title:** `Courses` | **Cardinality:** Exactly 5 rows (`CS2005`, `SE2001`, `CS2006`, `MS2001`, `CS2006P`)
- **Properties:**
  1. `Course Code` (`title`): Primary Key (`CS2005`, `SE2001`, `CS2006`, `MS2001`, `CS2006P`).
  2. `Course Name` (`rich_text`): Canonical course name.
  3. `Credits` (`number`): `4`, `3`, `4`, `4`, `2`.
  4. `Type` (`select`): `Theory`, `Project`.
  5. `Requires SCT` (`checkbox`): `true` for CS2005 & SE2001; `false` otherwise.
  6. `SCT Status` (`select`): `Pending` (Gray), `Passed` (Green), `Failed` (Red), `N/A` (Default).
  7. `Submission Track` (`select`): `Track A (Prior Theory - Nov 17 Deadline)`, `Track B (Current Theory - Dec 10 Deadline)`, `Unset`.
  8. `Weekly Assessments` (`relation` $\rightarrow$ `Weekly Assessment Records`, dual property: `Course`).
  9. `Fixed Exams` (`relation` $\rightarrow$ `Fixed Exams`, dual property: `Course`).
  10. `Hard Cutoffs` (`relation` $\rightarrow$ `Hard Cutoffs`, dual property: `Affected Courses`).
  11. `Pipeline Stages` (`relation` $\rightarrow$ `CS2006P Pipeline`, dual property: `Course`).
  12. `Sources` (`relation` $\rightarrow$ `Source Log`, dual property: `Linked Courses`).
  13. _Formulas 2.0 Engine Properties_: `GAA Score`, `BPTA Score`, `Best 5 of 7 Met`, `End Term Eligible`, `Course Grade Eligible`, `Total Score T`, `Letter Grade`, `Diagnostics`.

---

### Database 2: `Weekly Assessment Records` (Normalized Weekly Ledger)

- **Container Title:** `Weekly Assessment Records` | **Cardinality:** Exactly 46 rows
- **Properties:**
  1. `Assessment Name` (`title`): E.g., `CS2005 - Week 02 GrPA (A2)`, `SE2001 - BPT 01`.
  2. `Course` (`relation` $\rightarrow$ `Courses`, single property).
  3. `Course Code` (`formula`): `prop("Course").first().prop("Course Code")`.
  4. `Week Number` (`number`): `1` to `12`.
  5. `Assessment Type` (`select`): `GrPA`, `Weekly Objective`, `BPT`, `Programming Assignment (PA)`.
  6. `Status` (`select`): `Pending` (Gray), `Present` (Green), `Absent` (Red). _(Configured as select for API compatibility)._
  7. `Raw Score` (`number`): `0` to `100`.
  8. `Effective Score` (`formula`):
     ```javascript
     ifs(prop("Status") == "Absent", 0, prop("Status") == "Present", prop("Raw Score"), null);
     ```
  9. `Due Date` (`date`): Timestamp in IST (`23:59:00+05:30`).
  10. `Counts Towards GAA` (`checkbox`): `true` if part of course GAA pool.
  11. `OPPE 1 Gate Component` (`checkbox`): `true` for CS2005 A2, A3, A4; SE2001 BPT1, BPT2, BPT3.
  12. `OPPE 2 Gate Component` (`checkbox`): `true` for CS2005 A5, A6, A7, A8.
  13. `End Term Best 5/7 Pool` (`checkbox`): `true` for W1–W7 graded assessments.
  14. `Passing Threshold Met` (`formula`): `prop("Effective Score") >= 40`.
  15. `Hard Cutoff` (`relation` $\rightarrow$ `Hard Cutoffs`).
  16. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 3: `Fixed Exams` (Proctored & In-Centre Schedule)

- **Container Title:** `Fixed Exams` | **Cardinality:** Exactly 18 rows
- **Properties:**
  1. `Exam Name` (`title`): E.g., `CS2005 Quiz 1 (In-Centre)`, `SE2001 OPPE (Remote)`, `CS2006P Level 1 Viva`.
  2. `Course` (`relation` $\rightarrow$ `Courses`, single property).
  3. `Course Code` (`formula`): `prop("Course").first().prop("Course Code")`.
  4. `Exam Type` (`select`): `Quiz 1`, `Quiz 2`, `OPPE 1`, `OPPE 2`, `Re-OPPE`, `End Term`, `Project Submission`, `Viva L1`, `Viva L2`.
  5. `Exam Mode` (`select`): `In-Centre (TCS)`, `Online Remote Proctored`, `Portal Form`.
  6. `Exam Date / Window` (`date`): IST timestamp or date range.
  7. `Attendance Status` (`select`): `Pending`, `Present`, `Absent`, `Exempt`.
  8. `Raw Score` (`number`): 0–100 (for L1 Viva: 0–40; for L2 Viva: 0–60).
  9. `Max Score` (`number`): `100` for theory exams, `40` for L1 Viva, `60` for L2 Viva.
  10. `Effective Score` (`formula`):
      ```javascript
      ifs(
        prop("Attendance Status") == "Absent",
        0,
        prop("Attendance Status") == "Present",
        prop("Raw Score"),
        null,
      );
      ```
  11. `Proctoring Duration (Mins)` (`number`): Tracked for SE2001 OPPE (Re-OPPE gate requires $\ge 90$ mins).
  12. `Hall Ticket Issued` (`checkbox`).
  13. `Associated Pipeline Stage` (`relation` $\rightarrow$ `CS2006P Pipeline`).
  14. `Prerequisite Cutoff` (`relation` $\rightarrow$ `Hard Cutoffs`).
  15. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 4: `Hard Cutoffs` (Irreversible Academic Temporal Gates)

- **Container Title:** `Hard Cutoffs` | **Cardinality:** Exactly 15 milestone cutoffs
- **Properties:**
  1. `Cutoff Name` (`title`): E.g., `End Term Exam Eligibility Cutoff (Best 5 of First 7 Freeze)`.
  2. `Cutoff Category` (`select`): `Eligibility Freeze`, `Exam Date`, `Project Submission`, `SCT Window`, `Term Registration`, `Course Drop`.
  3. `Target Date & Time` (`date`): IST timestamp.
  4. `Affected Courses` (`relation` $\rightarrow$ `Courses`).
  5. `Affected Assessments` (`relation` $\rightarrow$ `Weekly Assessment Records`).
  6. `Affected Exams` (`relation` $\rightarrow$ `Fixed Exams`).
  7. `Days Remaining` (`formula`): `dateBetween(prop("Target Date & Time"), now(), "days")`.
  8. `Urgency Status` (`formula`):
     ```javascript
     ifs(
       prop("Target Date & Time") < now(),
       "🔴 Passed / Locked",
       dateBetween(prop("Target Date & Time"), now(), "hours") <= 24,
       "🚨 Due TODAY / <24h!",
       dateBetween(prop("Target Date & Time"), now(), "days") <= 3,
       "🔥 Due within 3 days!",
       dateBetween(prop("Target Date & Time"), now(), "days") <= 7,
       "⚠️ Due this week",
       "🟢 Upcoming",
     );
     ```
  9. `Consequence If Missed` (`rich_text`): E.g., _"Permanent disqualification from End Term Hall Ticket."_
  10. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 5: `CS2006P Pipeline` (Sequential Project Gate Engine)

- **Container Title:** `CS2006P Pipeline` | **Cardinality:** Exactly 9 sequential stages (Stages 0–8)
- **Properties:**
  1. `Stage Name` (`title`):
     - `0. Git Tracker Registration (Milestone 0)`
     - `1. Application Development (TMA V2)`
     - `2. Pre-Submission Validation Form`
     - `3. Final Portal Submission`
     - `4. Automated Portal Extraction & Validation`
     - `5. Plagiarism & Originality Screening`
     - `6. Level 1 Viva (IITM Team)`
     - `7. Level 2 Viva (Industry Experts)`
     - `8. Final Grade Awarded & Completed`
  2. `Stage Order` (`number`): `0` to `8`.
  3. `Status` (`select`): `Not Started` (Gray), `In Progress` (Blue), `Passed / Completed` (Green), `Blocked` (Orange), `Failed` (Red).
  4. `Is Strict Gate` (`checkbox`): `true` for stages 0, 1, 3, 4, 5, 6.
  5. `Prerequisite Stage` (`relation` $\rightarrow$ self, single page).
  6. `Linked Exam` (`relation` $\rightarrow$ `Fixed Exams`, links Stage 6 to `Viva L1` and Stage 7 to `Viva L2`).
  7. `Score Achieved` (`formula`):
     ```javascript
     ifs(
       prop("Stage Order") == 6 or prop("Stage Order") == 7,
       lets(
         exam, prop("Linked Exam").first(),
         ifs(empty(exam), null, exam.prop("Effective Score"))
       ),
       null
     )
     ```
  8. `Gate Passed` (`formula`):
     ```javascript
     ifs(
       prop("Stage Order") == 0, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 1, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 2, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 3, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 4, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 5, prop("Status") == "Passed / Completed",
       prop("Stage Order") == 6, !empty(prop("Score Achieved")) and prop("Score Achieved") >= 20,
       prop("Stage Order") == 7, !empty(prop("Score Achieved")) and prop("Score Achieved") >= 20,
       prop("Status") == "Passed / Completed"
     )
     ```
  9. `Lock Status` (`formula`):
     ```javascript
     ifs(
       empty(prop("Prerequisite Stage")),
       "🔓 Unlocked",
       /* Rigorous IITM Rule: Stage 7 requires L1 Viva Score >= 30 (not just >= 20) */
       prop("Stage Order") == 7,
       lets(
         prev,
         prop("Prerequisite Stage").first(),
         score,
         prev.prop("Score Achieved"),
         ifs(
           empty(score),
           "⛔ Awaiting Level 1 Viva Score",
           score < 20,
           "🔴 Blocked — Failed Level 1 (< 20)",
           score < 30,
           "🟠 Terminated with E Grade — Not Eligible for L2 (Score 20–29)",
           "🔓 Unlocked (L1 Score >= 30)",
         ),
       ),
       prop("Prerequisite Stage").first().prop("Gate Passed"),
       "🔓 Unlocked",
       "⛔ Blocked by " + prop("Prerequisite Stage").first().prop("Stage Name"),
     );
     ```
  10. `Requirements` (`relation` $\rightarrow$ `CS2006P Requirements Checklist`).
  11. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 6: `CS2006P Requirements Checklist` (TMA V2 Specification Matrix)

- **Container Title:** `CS2006P Requirements Checklist` | **Cardinality:** Exactly 16 canonical requirements
- **Properties:**
  1. `Requirement Title` (`title`): E.g., `TMA-01: Flask RESTful API Backend`.
  2. `Category` (`select`): `Tech Stack` (6 items), `Core Features` (7 items), `Deliverables` (2 items), `Submission Rules` (1 item).
  3. `Mandatory` (`checkbox`): Default `true`.
  4. `Status` (`select`): `Not Started`, `In Progress`, `Tested & Verified`.
  5. `Evidence / Artifact` (`rich_text`): Git commit hash, API curl command, test file path.
  6. `Pipeline Stage` (`relation` $\rightarrow$ `CS2006P Pipeline`).
  7. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 7: `Viva Prep Checklist` (Dual Camera & 10-Minute Operational Compliance)

- **Container Title:** `Viva Prep Checklist` | **Cardinality:** Exactly 12 operational checklist items
- **Properties:**
  1. `Rule Title` (`title`): E.g., `Dual Camera Setup: Hands, Face, Screen Visible`.
  2. `Category` (`select`): `Hardware Setup`, `10-Minute Runtime Rule`, `Authenticity & Integrity`, `Environment Setup`.
  3. `Strict Disqualification Gate` (`checkbox`): `true` for 10-min startup, dual camera, zero AI plugins, git collaborator, pre-installed venv.
  4. `Penalty If Violating` (`rich_text`): E.g., _"Immediate Level 1 failure (U grade). No rescheduling."_
  5. `Verified & Ready` (`checkbox`).
  6. `Target Viva Level` (`multi_select`): `Level 1`, `Level 2`.
  7. `Verification Script / Command` (`rich_text`): E.g., `python check.py`, `python unzip.py`.
  8. `Source` (`relation` $\rightarrow$ `Source Log`).

---

### Database 8: `Source Log` (Auditability & Document Staleness Engine)

- **Container Title:** `Source Log` | **Cardinality:** Exactly 7 official IITM source documents
- **Properties:**
  1. `Document Title` (`title`): E.g., `Term: Sep 2026 Term: Course Grading System Guidelines`.
  2. `Short Identifier` (`select`): `GRADING_GUIDELINES`, `MAD2_INSTRUCTIONS`, `VIVA_CHECKLIST`, `TMA_V2_SPEC`, `EMP_V2_SPEC`, `GIT_HELPER`, `TMA_MILESTONES`.
  3. `Applicable Term` (`select`): `September 2026`.
  4. `Verified At` (`date`): Timestamp of verification (`2026-09-18`).
  5. `Staleness Status` (`formula`):
     ```javascript
     ifs(
       dateBetween(now(), prop("Verified At"), "days") > 90,
       "⚠️ Stale — Check Portal for Updates",
       "✅ Verified Authoritative",
     );
     ```
  6. `Document Coverage` (`rich_text`): Exact pages and sections.
  7. `Local File Path` (`rich_text`): `docs/reference/sept_2026_grading.txt`, etc.
  8. `Relations`: Reciprocal links to all other 7 databases (`Linked Courses`, `Linked Assessments`, etc.).

---

## 5. Unified Notion Formulas 2.0 Engine (Single Formula Per Property)

The following Formulas 2.0 expressions are designed to be pasted directly into the schema of the `Courses` database. They dynamically branch based on `prop("Course Code")` and handle all edge cases, pending states, and null values gracefully.

### 5.1 Property: `GAA Score` (in `Courses`)

```javascript
ifs(
  prop("Course Code") == "CS2005",
    lets(
      grpas, prop("Weekly Assessments")
        .filter(current.prop("Assessment Type") == "GrPA" and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score"))
        .sort()
        .reverse(),
      ifs(
        grpas.length() < 6, null,
        round(grpas.slice(0, 6).mean() * 100) / 100
      )
    ),
  prop("Course Code") == "SE2001",
    lets(
      gas, prop("Weekly Assessments")
        .filter(current.prop("Assessment Type") == "Weekly Objective" and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score"))
        .sort()
        .reverse(),
      ifs(
        gas.length() < 9, null,
        round(gas.slice(0, 9).mean() * 100) / 100
      )
    ),
  prop("Course Code") == "CS2006",
    lets(
      pas, prop("Weekly Assessments")
        .filter(current.prop("Assessment Type") == "Programming Assignment (PA)" and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score")),
      ifs(
        pas.length() < 2, null,
        round(pas.mean() * 100) / 100
      )
    ),
  prop("Course Code") == "MS2001",
    lets(
      gas, prop("Weekly Assessments")
        .filter(current.prop("Assessment Type") == "Weekly Objective" and current.prop("Week Number") <= 9 and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score")),
      ifs(
        gas.length() < 9, null,
        round(gas.mean() * 100) / 100
      )
    ),
  null
)
```

---

### 5.2 Property: `BPTA Score` (in `Courses`)

```javascript
ifs(
  prop("Course Code") == "SE2001",
    lets(
      bpts, prop("Weekly Assessments")
        .filter(current.prop("Assessment Type") == "BPT" and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score")),
      ifs(
        bpts.length() < 4, null,
        round(bpts.mean() * 100) / 100
      )
    ),
  null
)
```

---

### 5.3 Property: `Best 5 of 7 Met` (in `Courses`)

```javascript
ifs(
  prop("Type") == "Project", true,
  lets(
    wScores, prop("Weekly Assessments")
      .filter(current.prop("End Term Best 5/7 Pool") and !empty(current.prop("Effective Score")))
      .map(current.prop("Effective Score"))
      .sort()
      .reverse(),
    ifs(
      wScores.length() < 5, false,
      wScores.slice(0, 5).mean() >= 40
    )
  )
)
```

---

### 5.4 Property: `End Term Eligible` (in `Courses`)

```javascript
ifs(
  prop("Type") == "Project", true,
  prop("Course Code") == "CS2005",
    lets(
      best5, prop("Best 5 of 7 Met"),
      q1Att, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 1").first().prop("Attendance Status") == "Present",
      q2Att, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 2").first().prop("Attendance Status") == "Present",
      best5 and (q1Att or q2Att)
    ),
  prop("Course Code") == "SE2001",
    lets(
      best5, prop("Best 5 of 7 Met"),
      sctOk, prop("SCT Status") == "Passed",
      bpts, prop("Weekly Assessments")
        .filter(current.prop("OPPE 1 Gate Component") and current.prop("Assessment Type") == "BPT" and !empty(current.prop("Effective Score")))
        .map(current.prop("Effective Score")),
      oppeEligible, sctOk and bpts.length() >= 3 and bpts.mean() >= 40,
      best5 and oppeEligible
    ),
  prop("Course Code") == "CS2006" or prop("Course Code") == "MS2001",
    lets(
      best5, prop("Best 5 of 7 Met"),
      q1Att, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 1").first().prop("Attendance Status") == "Present",
      q2Att, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 2").first().prop("Attendance Status") == "Present",
      best5 and (q1Att or q2Att)
    ),
  false
)
```

---

### 5.5 Property: `Course Grade Eligible` (in `Courses`)

```javascript
ifs(
  prop("Type") == "Project",
    lets(
      l1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Viva L1").first(),
      l1Score, ifs(empty(l1Rec), null, l1Rec.prop("Effective Score")),
      !empty(l1Score) and l1Score >= 20
    ),
  prop("Course Code") == "CS2005",
    lets(
      etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
      etAtt, !empty(etRec) and etRec.prop("Attendance Status") == "Present",
      pe1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
      pe2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 2").first(),
      pe1, ifs(empty(pe1Rec), 0, pe1Rec.prop("Effective Score")),
      pe2, ifs(empty(pe2Rec), 0, pe2Rec.prop("Effective Score")),
      etAtt and (pe1 >= 30 or pe2 >= 30)
    ),
  prop("Course Code") == "SE2001",
    lets(
      etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
      etAtt, !empty(etRec) and etRec.prop("Attendance Status") == "Present",
      oppeRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
      reoppeRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Re-OPPE").first(),
      oppe, ifs(empty(oppeRec), 0, oppeRec.prop("Effective Score")),
      reoppe, ifs(empty(reoppeRec), 0, reoppeRec.prop("Effective Score")),
      etAtt and (max(oppe, reoppe) >= 40)
    ),
  /* CS2006 & MS2001: Just attend End Term */
  lets(
    etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
    !empty(etRec) and etRec.prop("Attendance Status") == "Present"
  )
)
```

---

### 5.6 Property: `Total Score T` (in `Courses`)

```javascript
ifs(
  /* CS2006P Project */
  prop("Type") == "Project",
    lets(
      l1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Viva L1").first(),
      l2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Viva L2").first(),
      l1, ifs(empty(l1Rec), null, l1Rec.prop("Effective Score")),
      l2, ifs(empty(l2Rec), null, l2Rec.prop("Effective Score")),
      track, prop("Submission Track"),
      ifs(
        empty(l1), null,
        l1 < 20, l1,
        l1 < 30, l1,
        empty(l2), null,
        l2 == 0, l1,
        l2 < 20, l1 + l2,
        lets(
          rawSum, l1 + l2,
          ifs(track == "Track B (Current Theory - Dec 10 Deadline)", min(100, rawSum), rawSum)
        )
      )
    ),
  /* CS2005: Java (Verified formula with 0.20*max(Q1,Q2) coefficient) */
  prop("Course Code") == "CS2005",
    lets(
      gaa, prop("GAA Score"),
      etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
      hasEt, !empty(etRec) and (etRec.prop("Attendance Status") == "Present" or etRec.prop("Attendance Status") == "Absent"),
      ifs(
        empty(gaa) or !hasEt, null,
        lets(
          q1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 1").first(),
          q2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 2").first(),
          pe1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
          pe2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 2").first(),
          q1, ifs(empty(q1Rec), 0, q1Rec.prop("Effective Score")),
          q2, ifs(empty(q2Rec), 0, q2Rec.prop("Effective Score")),
          pe1, ifs(empty(pe1Rec), 0, pe1Rec.prop("Effective Score")),
          pe2, ifs(empty(pe2Rec), 0, pe2Rec.prop("Effective Score")),
          f, ifs(empty(etRec), 0, etRec.prop("Effective Score")),
          qzPart, max(0.20 * max(q1, q2), 0.10 * q1 + 0.20 * q2),
          pePart, 0.20 * max(pe1, pe2) + 0.10 * min(pe1, pe2),
          fPart, 0.45 * f,
          min(100, round((0.05 * gaa + qzPart + pePart + fPart) * 100) / 100)
        )
      )
    ),
  /* SE2001: System Commands */
  prop("Course Code") == "SE2001",
    lets(
      gaa, prop("GAA Score"),
      bpta, prop("BPTA Score"),
      etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
      hasEt, !empty(etRec) and (etRec.prop("Attendance Status") == "Present" or etRec.prop("Attendance Status") == "Absent"),
      ifs(
        empty(gaa) or empty(bpta) or !hasEt, null,
        lets(
          q1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 1").first(),
          oppeRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
          reoppeRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Re-OPPE").first(),
          q1, ifs(empty(q1Rec), 0, q1Rec.prop("Effective Score")),
          oppe, ifs(empty(oppeRec), 0, oppeRec.prop("Effective Score")),
          reoppe, ifs(empty(reoppeRec), 0, reoppeRec.prop("Effective Score")),
          effOppe, max(oppe, reoppe),
          f, ifs(empty(etRec), 0, etRec.prop("Effective Score")),
          min(100, round((0.05 * gaa + 0.25 * q1 + 0.30 * effOppe + 0.30 * f + 0.10 * bpta) * 100) / 100)
        )
      )
    ),
  /* CS2006 & MS2001: Application Development II & BDM */
  lets(
    gaa, prop("GAA Score"),
    etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
    hasEt, !empty(etRec) and (etRec.prop("Attendance Status") == "Present" or etRec.prop("Attendance Status") == "Absent"),
    ifs(
      empty(gaa) or !hasEt, null,
      lets(
        q1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 1").first(),
        q2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Quiz 2").first(),
        q1, ifs(empty(q1Rec), 0, q1Rec.prop("Effective Score")),
        q2, ifs(empty(q2Rec), 0, q2Rec.prop("Effective Score")),
        f, ifs(empty(etRec), 0, etRec.prop("Effective Score")),
        branchA, 0.60 * f + 0.25 * max(q1, q2),
        branchB, 0.40 * f + 0.25 * q1 + 0.30 * q2,
        examPart, max(branchA, branchB),
        min(100, round((0.05 * gaa + examPart) * 100) / 100)
      )
    )
  )
)
```

---

### 5.7 Property: `Letter Grade` (in `Courses`)

```javascript
ifs(
  prop("Type") == "Project",
    lets(
      l1Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Viva L1").first(),
      l2Rec, prop("Fixed Exams").filter(current.prop("Exam Type") == "Viva L2").first(),
      l1, ifs(empty(l1Rec), null, l1Rec.prop("Effective Score")),
      l2, ifs(empty(l2Rec), null, l2Rec.prop("Effective Score")),
      track, prop("Submission Track"),
      ifs(
        empty(l1), "Pending",
        l1 < 20, "U",
        l1 < 30, "E",
        empty(l2), "Pending (L2 Eligible)",
        l2 == 0, "E",
        l2 < 20, "D",
        lets(
          rawSum, l1 + l2,
          finalScore, ifs(track == "Track B (Current Theory - Dec 10 Deadline)", min(100, rawSum), rawSum),
          ifs(finalScore >= 90, "S", finalScore >= 80, "A", finalScore >= 70, "B", finalScore >= 60, "C", finalScore >= 50, "D", finalScore >= 40, "E", "U")
        )
      )
    ),
  /* Theory Courses */
  lets(
    t, prop("Total Score T"),
    etRec, prop("Fixed Exams").filter(current.prop("Exam Type") == "End Term").first(),
    etAttended, !empty(etRec) and etRec.prop("Attendance Status") == "Present",
    gradeEligible, prop("Course Grade Eligible"),
    ifs(
      empty(t), "Pending",
      gradeEligible,
        ifs(t >= 90, "S", t >= 80, "A", t >= 70, "B", t >= 60, "C", t >= 50, "D", t >= 40, "E", "U"),
      /* Failed programming requirement but attended End Term */
      etAttended,
        ifs(t >= 40, "I_OP", t >= 35, "I_OP", "U"),
      /* Absent End Term */
      lets(
        peAttempted,
          ifs(
            prop("Course Code") == "CS2005",
              lets(
                p1, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
                p2, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 2").first(),
                (!empty(p1) and p1.prop("Attendance Status") == "Present") or (!empty(p2) and p2.prop("Attendance Status") == "Present")
              ),
            prop("Course Code") == "SE2001",
              lets(
                p1, prop("Fixed Exams").filter(current.prop("Exam Type") == "OPPE 1").first(),
                p2, prop("Fixed Exams").filter(current.prop("Exam Type") == "Re-OPPE").first(),
                (!empty(p1) and p1.prop("Attendance Status") == "Present") or (!empty(p2) and p2.prop("Attendance Status") == "Present")
              ),
            false
          ),
        ifs(peAttempted, "I_BOTH", "U")
      )
    )
  )
)
```

---

### 5.8 Property: `Diagnostics` (in `Courses`)

```javascript
ifs(
  prop("Type") == "Project",
    lets(
      track, prop("Submission Track"),
      ifs(
        track == "Unset", "⚠️ Action Required: Select Track A or Track B in Submission Track",
        "✅ Track selected: " + track
      )
    ),
  lets(
    sctNeeded, prop("Requires SCT"),
    sctOk, prop("SCT Status") == "Passed",
    best5Ok, prop("Best 5 of 7 Met"),
    etEligible, prop("End Term Eligible"),
    gradeEligible, prop("Course Grade Eligible"),
    ifs(
      sctNeeded and !sctOk, "🚨 SCT Incomplete — Cannot appear for OPPE",
      !best5Ok, "⚠️ Best 5/7 Weekly Assessments currently < 40/100",
      !etEligible, "⚠️ End Term Eligibility Criteria Not Met",
      !gradeEligible, "⚠️ At-Risk: Programming Exam threshold not met for course grade",
      "🟢 All Academic Gates Cleared"
    )
  )
)
```

---

## 6. Notion API Technical Architecture & Provisioning Blueprint

### 6.1 Database Container vs. Data Sources Architecture

Notion API version `2025-09-03` introduces a strict container-content boundary:

1. `POST /v1/databases` creates the high-level container block (`database_id`), the initial default table data source (`data_source_id`), and its initial view.
2. `PATCH /v1/data_sources/{data_source_id}` is the mandatory endpoint for updating schemas, adding properties, and configuring relation targets.
3. In relation property definitions:
   - For `2025-09-03`, `relation.data_source_id` references the target data source ID.
   - For pre-`2025-09-03` versions, `relation.database_id` references the target database ID.

### 6.2 Solving Circular Relational Dependencies

Because `Courses`, `Weekly Assessment Records`, `Fixed Exams`, `Hard Cutoffs`, and `CS2006P Pipeline` reference each other in a cyclic web, automated creation must follow a 4-phase execution sequence:

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Base Table Creation                           │
│ POST /v1/databases with title, number, select, date    │
│ Capture database_id and data_sources[0].id for all 8   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 2: Relational Wiring                             │
│ PATCH /v1/data_sources/{id} to inject bidirectional    │
│ relations (Weekly -> Courses, Exams -> Courses, etc.)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 3: Formula Property Injection                    │
│ PATCH /v1/data_sources/{id} to inject Formulas 2.0     │
│ AST expressions referencing relations from Phase 2     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 4: Batch Seed Data Ingestion                     │
│ POST /v1/pages to populate 5 courses, 46 assessments,  │
│ 18 exams, 15 cutoffs, 9 stages, 16 reqs, 12 rules      │
└────────────────────────────────────────────────────────┘
```

### 6.3 Automated Provisioning Script Template (Node.js / Bun)

```javascript
// scripts/provision_notion_tracker.ts
import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_API_KEY!;
const PARENT_PAGE_ID = "3e60c9fb-fc81-802b-8df9-f80b9c84b83c";

const notion = new Client({ auth: NOTION_TOKEN });

async function createBaseDatabase(title: string, properties: Record<string, any>) {
  const response = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { type: "page_id", page_id: PARENT_PAGE_ID },
      title: [{ type: "text", text: { content: title } }],
      initial_data_source: { properties },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Failed to create ${title}: ${JSON.stringify(data)}`);
  return { databaseId: data.id, dataSourceId: data.data_sources[0].id };
}

async function updateDataSourceSchema(dataSourceId: string, properties: Record<string, any>) {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Schema update failed for ${dataSourceId}: ${JSON.stringify(data)}`);
  return data;
}

// Execution orchestrates Phase 1 through Phase 4
```

---

## 7. Workspace Dashboard Layout & View Hierarchy

On the target Notion page `"IITM BS Degree September 2026"` (`3e60c9fb-fc81-802b-8df9-f80b9c84b83c`), the dashboard is organized into 5 primary functional zones:

```
========================================================================================
 🎓 IITM BS DEGREE SEPTEMBER 2026 — ACADEMIC COMMAND CENTER
========================================================================================
 [ Callout (Blue): Academic Term: September 2026 | Active Phase: Week 0 | SCT Active ]

 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 🚨 CRITICAL HARD CUTOFFS & TEMPORAL GATES (Linked View: Hard Cutoffs)              │
 │ View: Gallery / Table | Sort: Target Date Ascending | Filter: Target Date >= now() │
 │ Columns: Cutoff Name, Category, Target Date, Days Remaining, Consequence If Missed│
 └────────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 📊 MASTER COURSE REGISTRY & LIVE GRADES (Linked View: Courses)                     │
 │ View: Gallery Cards or Interactive Gradebook Table                                 │
 │ Columns: Course Code, Course Name, Credits, SCT Status, GAA, Total Score T, Grade  │
 │ Badges: End Term Eligible, Course Grade Eligible, Diagnostics                      │
 └────────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 📅 WEEKLY ASSESSMENT LEDGER (Linked View: Weekly Assessment Records)               │
 │ Tabs: [Current Week] [Best 5/7 Tracker] [All GrPAs] [SE2001 BPT Focus]             │
 │ Group by: Course Code | Sub-group: Week Number | Columns: Name, Status, Raw, Eff   │
 └────────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 🏛️ PROCTORED EXAMS & VIVA TIMELINE (Linked View: Fixed Exams)                       │
 │ Tabs: [Upcoming Exams] [In-Centre Quizzes] [OPPE Clearance] [Viva Schedule]        │
 │ Columns: Exam Name, Mode, Date, Attendance Status, Raw Score, Max Score, Effective │
 └────────────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────┬─────────────────────────────────────────┐
 │ 🛠️ CS2006P PIPELINE & MILESTONES         │ 📋 TMA V2 REQUIREMENTS CHECKLIST        │
 │ (Linked View: CS2006P Pipeline)          │ (Linked View: CS2006P Requirements)     │
 │ Board View (Kanban by Status)            │ Grouped by Category: Tech Stack, Core   │
 │ Shows: Stage Order, Gate Status, Lock    │ Shows: Mandatory, Status, Artifact Path │
 └──────────────────────────────────────────┴─────────────────────────────────────────┘

 ┌──────────────────────────────────────────┬─────────────────────────────────────────┐
 │ 🛡️ VIVA AUDIT & OPERATIONAL RULES        │ 📚 SOURCE AUDITABILITY & STALENESS LOG  │
 │ (Linked View: Viva Prep Checklist)       │ (Linked View: Source Log)               │
 │ Filter: Strict Disqualification Gate     │ Shows: Document Title, Short ID,        │
 │ Table: Rule, Category, Verified, Penalty │ Verified At, Staleness Status           │
 └──────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 8. Remaining Questions & Gaps

1. **Formula Token Representation in API Writes:**
   - While Notion API v2025-09-03 accepts `formula.expression` strings, complex nested expressions containing multi-line `lets()` and relation iteration may encounter parser differences between client strings and Notion's internal AST representation.
   - _Recommendation:_ If the API returns a `validation_error` on complex multi-branch expressions during Phase 3, provision the scalar database schemas and relations via API, and paste the unified Formulas 2.0 blocks into Notion's visual formula editor once.
2. **SE2001 NPPE Practice Exam Entry:**
   - The reference document notes that an NPPE (Non-Proctored Programming Exam) is released for practice between Weeks 1–9 with 0 contribution to $T$.
   - _Recommendation:_ Add an entry in `Weekly Assessment Records` with `Counts Towards GAA = false` so the student can track the deadline without altering grade calculations.
3. **Automated Extraction from IITM Portal:**
   - The proposed Notion database relies on manual score entry or automated webhook updates. To achieve automated synchronization from the IITM dashboard, a scheduled headless worker (e.g. Playwright) would be required to extract portal grades and update Notion via `PATCH /v1/pages`.

---

_Report completed and delivered to Parent Orchestrator._
