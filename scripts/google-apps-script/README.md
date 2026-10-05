# Acadrix / Acdence — Institute Email Intelligence Apps Script Bridge (v3.0)

## Overview

This Google Apps Script connects the private Google Workspace Studio staging spreadsheet to the Supabase `email-ingest` Edge Function.

- **Spreadsheet ID**: `1vyqMPBya8NvIWmjOWaCiGABK6gzU5ebXS3-MW1i_66c`
- **Spreadsheet URL**: [Open Spreadsheet](https://docs.google.com/spreadsheets/d/1vyqMPBya8NvIWmjOWaCiGABK6gzU5ebXS3-MW1i_66c/edit?usp=sharing)
- **Target Sheet Tab**: `ACADRIX` / `Emails`
- **Target Edge Function**: `POST https://aocrcrdmwmdtthrwypii.supabase.co/functions/v1/email-ingest`

---

## Architecture & Hardened Guarantees

```text
Gmail (Study Portal Emails)
  ↓
Google Workspace Studio (AI Extraction)
  ↓
Google Spreadsheet (28 Columns + 3 Tracking Columns)
  ↓
Apps Script Bridge (Code.js v3.0)
  ├── 1. Per-Row Sheet State Audit (sync_status, synced_at, sync_error)
  ├── 2. Poison-Pill Bisection & Isolation (REJECTED status)
  ├── 3. Workspace Studio Ready Gate (checks processed_at)
  ├── 4. Exponential Backoff & Jitter (429/5xx retries)
  ├── 5. Execution Budget Cap (4.5 min / 500 rows per run)
  ├── 6. Dual Batching (25 count + <800 KB byte size)
  └── 7. Zero Hardcoded Fallback Secrets (Script Properties only)
  ↓
Supabase Edge Function (email-ingest)
  ├── Constant-time secret authentication (x-sync-secret)
  ├── SHA-256 fingerprint deduplication
  ├── Atomic batch upsert into public.email_messages
  └── Academic event extraction into public.email_events
  ↓
Acdence Dashboard (Inbox, Deadlines, Important Alerts)
```

---

## Key Review Fixes & Improvements

1. **Zero Hardcoded Secrets in Source Code**:
   - `DEFAULT_SECRET` has been completely eliminated from the codebase.
   - Secrets are fetched strictly via `PropertiesService.getScriptProperties().getProperty('EMAIL_INGEST_SECRET')`.
   - If missing, the script throws a descriptive error prompting configuration via **⚡ Acadrix > ⚙️ Configure Credentials**.

2. **Per-Row State Tracking (`sync_status`, `synced_at`, `sync_error`)**:
   - Replaced fragile numeric row watermarks with in-sheet tracking columns.
   - Survives manual row insertion, sorting, filtering, and row deletions.
   - Tracking columns are automatically appended to row 1 on first run.
   - Statuses:
     - `PENDING` / blank: Ready for sync.
     - `SYNCED`: Successfully written to Supabase.
     - `REJECTED`: Permanent client/validation failure (poison pill isolated).
     - `FAILED`: Temporary server error (will retry next run).

3. **Workspace Studio "Ready Gate"**:
   - Rows are only ingested once `processed_at` is populated, preventing partial rows from being synced while Google Workspace Studio is still writing cell values.

4. **Poison-Pill Bisection**:
   - When a batch encounters a 4xx client validation error, the engine automatically bisects the batch down to individual rows.
   - The malformed row is marked `REJECTED` with the exact server error in `sync_error`.
   - All valid sibling rows in the batch are synced normally without blocking the pipeline.

5. **Exponential Backoff & Network Resilience**:
   - Handles transient network drops, 429 rate limits, and 5xx server errors with up to 3 retries with randomized jitter.
   - Does not waste retries on 400/401/403/404 client errors.

6. **Execution Budget & Quota Protection**:
   - Apps Script enforces a 6-minute hard execution timeout.
   - `RUN_BUDGET_MS` (4.5 minutes) and `MAX_ROWS_PER_RUN` (500 rows) ensure clean execution yield, resuming seamlessly on the next 1-minute trigger.

---

## 28 Immutable Workspace Studio Headers + 3 Tracking Headers

| Col #  | Header Name                  | Type / Notes                                                       |
| :----: | :--------------------------- | :----------------------------------------------------------------- |
|   1    | `email_id`                   | Unique Gmail message ID                                            |
|   2    | `thread_id`                  | Gmail conversation thread ID                                       |
|   3    | `received_at`                | Email arrival timestamp (IST)                                      |
|   4    | `sender_name`                | Sender display name                                                |
|   5    | `sender_email`               | Sender email address                                               |
|   6    | `subject`                    | Full email subject line                                            |
|   7    | `classification`             | `OFFICIAL_IMPORTANT`, `OFFICIAL_COURSE`, `STUDENT_COMMUNITY`, etc. |
|   8    | `officiality`                | `OFFICIAL`, `PROBABLY_OFFICIAL`, `UNKNOWN`                         |
|   9    | `importance`                 | `HIGH`, `MEDIUM`, `LOW`                                            |
|   10   | `category`                   | `ACADEMIC`, `EXAM`, `ASSIGNMENT`, `ADMINISTRATIVE`, etc.           |
|   11   | `course_code`                | `CS2005`, `CS2006`, `SE2001`, `MS2001`, `CS2006P`                  |
|   12   | `course_name`                | Course title                                                       |
|   13   | `event_title`                | Primary calendar event title                                       |
|   14   | `event_type`                 | `DEADLINE`, `EXAM`, `SESSION`, `REGISTRATION`, `ANNOUNCEMENT`      |
|   15   | `deadline`                   | Cutoff timestamp (IST)                                             |
|   16   | `start_at`                   | Event start timestamp (IST)                                        |
|   17   | `end_at`                     | Event end timestamp (IST)                                          |
|   18   | `location`                   | Exam venue / Meeting link / Dashboard                              |
|   19   | `required_action`            | Action required from student                                       |
|   20   | `affected_assessment`        | Assessment name (e.g. `GrPA 4`, `BPT 2`)                           |
|   21   | `confidence`                 | Extraction confidence (`HIGH`, `0.950`)                            |
|   22   | `duplicate_status`           | `NEW_EMAIL`, `EXACT_DUPLICATE`, `UPDATE_TO_EXISTING_INFORMATION`   |
|   23   | `dedup_key`                  | Deduplication grouping key                                         |
|   24   | `evidence`                   | Direct quote from the email body                                   |
|   25   | `additional_academic_events` | JSON array of secondary events or `"NONE"`                         |
|   26   | `processing_notes`           | AI extraction notes                                                |
|   27   | `email_body`                 | Raw body text / HTML                                               |
|   28   | `processed_at`               | Timestamp of AI processing (Ready gate marker)                     |
| **29** | `sync_status`                | **Auto-managed**: `SYNCED`, `PENDING`, `REJECTED`, `FAILED`        |
| **30** | `synced_at`                  | **Auto-managed**: Timestamp of sync / rejection (IST)              |
| **31** | `sync_error`                 | **Auto-managed**: Error message if failed or rejected              |

---

## Installation & Setup Instructions

1. Open the [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1vyqMPBya8NvIWmjOWaCiGABK6gzU5ebXS3-MW1i_66c/edit?usp=sharing).
2. Click **Extensions** → **Apps Script**.
3. In the Apps Script editor, open `Code.gs` and replace all content with the code from [`Code.js`](./Code.js).
4. Save the project (`Cmd+S` or `Ctrl+S`).
5. Refresh the Google Spreadsheet in your browser. A new menu **⚡ Acadrix** will appear in the toolbar.
6. Click **⚡ Acadrix** → **⚙️ Configure Credentials**:
   - Enter your `EMAIL_INGEST_SECRET`.
   - Click **OK**.
7. Click **⚡ Acadrix** → **🔍 Test Connection & Health**:
   - Verifies network connectivity and authentication with Supabase.
8. Click **⚡ Acadrix** → **⏰ Install 1-Min Background Trigger**:
   - Enables continuous automatic background synchronization every 1 minute.
9. Click **⚡ Acadrix** → **🔄 Sync New Emails** to run an immediate sync.
