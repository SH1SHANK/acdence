/**
 * ============================================================================
 * ACADRIX / ACDENCE — INSTITUTE EMAIL INTELLIGENCE APPS SCRIPT BRIDGE (v3.0)
 * ============================================================================
 * Enterprise-grade, resilient Google Apps Script connector between
 * Google Workspace Studio's processed email sheet and Supabase Edge Function.
 *
 * SPREADSHEET ID : 1vyqMPBya8NvIWmjOWaCiGABK6gzU5ebXS3-MW1i_66c
 * TARGET TABS    : "ACADRIX" / "Emails"
 * EDGE FUNCTION  : POST /functions/v1/email-ingest
 *
 * ARCHITECTURAL GUARANTEES & REVIEW HARDENING:
 * 1. ZERO HARDCODED SECRETS: Requires EMAIL_INGEST_SECRET in Script Properties.
 * 2. PER-ROW AUDIT CURSOR: Uses in-sheet tracking columns (sync_status, synced_at,
 *    sync_error). Survives row inserts, deletions, reordering, and sorting.
 * 3. POISON-PILL ISOLATION: 4xx validation failures or corrupted rows are bisected
 *    and marked REJECTED with error notes without halting subsequent rows.
 * 4. WORKSPACE READY GATE: Only processes rows where `processed_at` is populated,
 *    preventing ingestion of partial rows while Workspace Studio is writing.
 * 5. RETRY & EXPONENTIAL BACKOFF: Handles transient 429/5xx errors with jitter.
 * 6. EXECUTION BUDGET: Caps runtime at 4.5 minutes and 500 rows per execution
 *    to prevent hitting Apps Script's 6-minute cutoff.
 * 7. PAYLOAD SIZING: Dual-chunked by count (25 rows) and serialized size (<800 KB).
 * 8. STRICT IST DATES: Canonical Asia/Kolkata ISO-8601 formatting with safe fallbacks.
 * ============================================================================
 */

"use strict";

/**
 * Global Configuration Constants
 */
const CONFIG = Object.freeze({
  // Target tab names tried in order
  SHEET_NAMES: Object.freeze(["ACADRIX", "Emails", "emails", "Sheet1"]),

  // Supabase Project Endpoint
  DEFAULT_SUPABASE_URL: "https://aocrcrdmwmdtthrwypii.supabase.co",

  // Edge Function Target
  FUNCTION_NAME: "email-ingest",

  // Concurrency & Budget Constraints
  LOCK_TIMEOUT_MS: 10000, // 10s script lock timeout
  RUN_BUDGET_MS: 270000, // 4.5 minutes (out of 6 min quota)
  MAX_ROWS_PER_RUN: 500, // Max rows processed in single trigger run
  BATCH_SIZE: 25, // Max records per HTTP request
  MAX_PAYLOAD_BYTES: 800 * 1024, // 800 KB payload size limit

  // HTTP Retry Policy
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,

  // Script Properties Keys
  PROP_SECRET: "EMAIL_INGEST_SECRET",
  PROP_URL: "SUPABASE_URL",
  PROP_SHEET_NAME: "SHEET_NAME",

  // Status Values
  STATUS_SYNCED: "SYNCED",
  STATUS_PENDING: "PENDING",
  STATUS_REJECTED: "REJECTED",
  STATUS_FAILED: "FAILED",

  // Tracking Column Headers (automatically appended if missing)
  SYNC_COLUMNS: Object.freeze({
    STATUS: "sync_status",
    SYNCED_AT: "synced_at",
    ERROR: "sync_error",
  }),

  // Canonical 28 Immutable Workspace Studio Headers
  REQUIRED_HEADERS: Object.freeze([
    "email_id",
    "thread_id",
    "received_at",
    "sender_name",
    "sender_email",
    "subject",
    "classification",
    "officiality",
    "importance",
    "category",
    "course_code",
    "course_name",
    "event_title",
    "event_type",
    "deadline",
    "start_at",
    "end_at",
    "location",
    "required_action",
    "affected_assessment",
    "confidence",
    "duplicate_status",
    "dedup_key",
    "evidence",
    "additional_academic_events",
    "processing_notes",
    "email_summary",
    "email_body",
    "processed_at",
  ]),
});

// ============================================================================
// 1. SPREADSHEET UI MENU & USER ACTIONS
// ============================================================================

/**
 * Installs the "Acadrix" menu when the spreadsheet is opened.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("⚡ Acadrix")
      .addItem("🔄 Sync New Emails", "syncNewEmails")
      .addItem("🎯 Sync Latest Email", "syncLatestEmail")
      .addItem("🔍 Test Connection & Health", "testConnection")
      .addSeparator()
      .addItem("⏰ Install 1-Min Background Trigger", "installSyncTrigger")
      .addItem("🛑 Remove All Triggers", "removeSyncTriggers")
      .addSeparator()
      .addItem("📊 Show Sync Status", "showSyncStatus")
      .addItem("⚙️ Configure Credentials", "configureCredentialsPrompt")
      .addItem("🔄 Reset Rejected Rows to Pending", "resetRejectedRowsPrompt")
      .addToUi();
  } catch (err) {
    console.warn("[onOpen] Could not create UI menu (non-UI execution context): " + err.message);
  }
}

// ============================================================================
// 2. MAIN SYNCHRONIZATION ENGINE
// ============================================================================

/**
 * Main Synchronization Entry Point:
 * Lock-protected, budget-capped, fault-tolerant batch sync using per-row sheet tracking.
 */
function syncNewEmails() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    console.log("[syncNewEmails] Execution skipped: Another sync job is currently in progress.");
    showToast_("Sync in progress in background...", "Acadrix Sync");
    return;
  }

  const startTime = Date.now();

  try {
    // 1. Validate Secret Configuration
    const config = getActiveConfig_();

    // 2. Resolve Sheet & Columns
    const sheet = resolveEmailsSheet_();
    const headerMap = validateAndMapHeaders_(sheet);
    ensureSyncColumns_(sheet, headerMap);

    // 3. Scan pending rows (Fast 3-column scan)
    const pendingRowNumbers = getPendingRowNumbers_(sheet, headerMap);

    if (pendingRowNumbers.length === 0) {
      console.log("[syncNewEmails] No pending email rows to synchronize.");
      showToast_("All emails are up-to-date.", "Acadrix Sync");
      return;
    }

    console.log(
      `[syncNewEmails] Found ${pendingRowNumbers.length} pending row(s). Processing with budget limit...`,
    );
    showToast_(`Syncing ${pendingRowNumbers.length} email(s)...`, "Acadrix Sync");

    // 4. Chunk into batches (respecting count + byte size)
    const batches = buildBatches_(
      sheet,
      headerMap,
      pendingRowNumbers,
      CONFIG.BATCH_SIZE,
      CONFIG.MAX_PAYLOAD_BYTES,
    );

    let totalSynced = 0;
    let totalRejected = 0;
    let totalEventsExtracted = 0;
    let budgetExceeded = false;

    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      // Check execution budget
      const elapsedMs = Date.now() - startTime;
      if (
        elapsedMs >= CONFIG.RUN_BUDGET_MS ||
        totalSynced + totalRejected >= CONFIG.MAX_ROWS_PER_RUN
      ) {
        budgetExceeded = true;
        console.log(
          `[syncNewEmails] Execution budget threshold reached (${(elapsedMs / 1000).toFixed(1)}s elapsed, ${totalSynced + totalRejected} rows processed). Yielding to next trigger.`,
        );
        break;
      }

      const batch = batches[bIndex];
      const batchResult = syncBatchWithPoisonPillProtection_(sheet, headerMap, batch, config);

      totalSynced += batchResult.syncedCount;
      totalRejected += batchResult.rejectedCount;
      totalEventsExtracted += batchResult.eventsExtracted;

      console.log(
        `[syncNewEmails] Batch ${bIndex + 1}/${batches.length}: ` +
          `${batchResult.syncedCount} synced, ${batchResult.rejectedCount} rejected, ` +
          `${batchResult.eventsExtracted} events extracted.`,
      );
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const summaryMsg =
      `Processed: ${totalSynced} synced, ${totalRejected} rejected in ${durationSec}s.` +
      (budgetExceeded ? " (Remaining rows will continue in next run)" : "");

    console.log(`[syncNewEmails] ${summaryMsg}`);
    showToast_(summaryMsg, "Acadrix Sync Complete", 6);
  } catch (error) {
    const errorMsg = `Sync failed: ${error.message}`;
    console.error(`[syncNewEmails] ${errorMsg}`);
    showAlert_("Synchronization Error", errorMsg);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Convenience Action: Synchronizes only the latest row in the spreadsheet.
 */
function syncLatestEmail() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    showToast_("Another sync process is running.", "Acadrix");
    return;
  }

  try {
    const config = getActiveConfig_();
    const sheet = resolveEmailsSheet_();
    const headerMap = validateAndMapHeaders_(sheet);
    ensureSyncColumns_(sheet, headerMap);

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      showAlert_("No Data", "No email rows found in the sheet.");
      return;
    }

    const rowValues = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const parsed = parseRowRecord_(rowValues, headerMap, lastRow);

    if (!parsed.valid) {
      markRowStatus_(sheet, headerMap, lastRow, CONFIG.STATUS_REJECTED, parsed.error);
      showAlert_("Sync Rejected", `Row ${lastRow} is invalid: ${parsed.error}`);
      return;
    }

    const payload = {
      source: "workspace_studio",
      records: [parsed.record],
    };

    const result = postToSupabaseWithRetry_(config, payload);

    if (!result.ok) {
      markRowStatus_(sheet, headerMap, lastRow, CONFIG.STATUS_FAILED, result.message);
      throw new Error(result.message);
    }

    markRowStatus_(sheet, headerMap, lastRow, CONFIG.STATUS_SYNCED, "");

    const successMsg = `Latest email row ${lastRow} (ID: ${parsed.record.emailId}) synchronized successfully.`;
    console.log(`[syncLatestEmail] ${successMsg}`);
    showToast_(successMsg, "Acadrix Sync");
  } catch (error) {
    console.error(`[syncLatestEmail] Failed: ${error.message}`);
    showAlert_("Sync Failed", error.message);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 3. BATCH PROCESSING & POISON-PILL ISOLATION
// ============================================================================

/**
 * Attempts to sync a batch of rows.
 * If a 4xx client validation error occurs, bisects the batch row-by-row
 * so invalid poison-pill rows are marked REJECTED without blocking valid rows.
 */
function syncBatchWithPoisonPillProtection_(sheet, headerMap, batchItems, config) {
  // 1. First attempt full batch
  const validItems = [];
  let preRejectedCount = 0;

  for (const item of batchItems) {
    if (item.valid) {
      validItems.push(item);
    } else {
      markRowStatus_(sheet, headerMap, item.rowNumber, CONFIG.STATUS_REJECTED, item.error);
      preRejectedCount++;
    }
  }

  if (validItems.length === 0) {
    return { syncedCount: 0, rejectedCount: preRejectedCount, eventsExtracted: 0 };
  }

  const payload = {
    source: "workspace_studio",
    records: validItems.map((i) => i.record),
  };

  const response = postToSupabaseWithRetry_(config, payload);

  if (response.ok) {
    // Mark all rows in this batch as SYNCED
    markContiguousRowsStatus_(
      sheet,
      headerMap,
      validItems.map((i) => i.rowNumber),
      CONFIG.STATUS_SYNCED,
      "",
    );
    const eventsExtracted =
      response.body && typeof response.body.eventsExtracted === "number"
        ? response.body.eventsExtracted
        : 0;

    return {
      syncedCount: validItems.length,
      rejectedCount: preRejectedCount,
      eventsExtracted: eventsExtracted,
    };
  }

  // If error is a 4xx client rejection (bad payload/record), bisect row-by-row
  if (response.status >= 400 && response.status < 500) {
    console.warn(
      `[syncBatch] Batch failed with HTTP ${response.status}. Bisecting ${validItems.length} rows individually to isolate poison pill...`,
    );

    let singleSynced = 0;
    let singleRejected = preRejectedCount;
    let singleEvents = 0;

    for (const item of validItems) {
      const singlePayload = {
        source: "workspace_studio",
        records: [item.record],
      };

      const singleResp = postToSupabaseWithRetry_(config, singlePayload);

      if (singleResp.ok) {
        markRowStatus_(sheet, headerMap, item.rowNumber, CONFIG.STATUS_SYNCED, "");
        singleSynced++;
        if (singleResp.body && typeof singleResp.body.eventsExtracted === "number") {
          singleEvents += singleResp.body.eventsExtracted;
        }
      } else {
        const isClientError = singleResp.status >= 400 && singleResp.status < 500;
        const status = isClientError ? CONFIG.STATUS_REJECTED : CONFIG.STATUS_FAILED;
        markRowStatus_(sheet, headerMap, item.rowNumber, status, singleResp.message);
        singleRejected++;
        console.error(
          `[syncBatch] Row ${item.rowNumber} (ID: ${item.record.emailId}) failed: ${singleResp.message}`,
        );
      }
    }

    return {
      syncedCount: singleSynced,
      rejectedCount: singleRejected,
      eventsExtracted: singleEvents,
    };
  }

  // If 5xx server error that exhausted retries, mark rows as FAILED (will retry next run)
  for (const item of validItems) {
    markRowStatus_(sheet, headerMap, item.rowNumber, CONFIG.STATUS_FAILED, response.message);
  }

  throw new Error(`Batch synchronization failed with HTTP ${response.status}: ${response.message}`);
}

// ============================================================================
// 4. HTTP TRANSPORT & SUPABASE EDGE FUNCTION CLIENT
// ============================================================================

/**
 * Transmits a JSON payload to the Supabase email-ingest Edge Function with exponential backoff.
 *
 * @param {{ supabaseUrl: string, secret: string }} config
 * @param {Object} payload - Ingestion payload ({ source, records })
 * @returns {{ ok: boolean, status: number, body: Object|null, message: string }}
 */
function postToSupabaseWithRetry_(config, payload) {
  const url = `${config.supabaseUrl}/functions/v1/${CONFIG.FUNCTION_NAME}`;
  const serializedBody = JSON.stringify(payload);

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-secret": config.secret,
      Accept: "application/json",
      "User-Agent": "Acadrix-AppsScript-Bridge/3.0",
    },
    payload: serializedBody,
    muteHttpExceptions: true,
    followRedirects: true,
  };

  let attempt = 0;
  let delayMs = CONFIG.INITIAL_RETRY_DELAY_MS;

  while (attempt < CONFIG.MAX_RETRIES) {
    attempt++;

    try {
      const response = UrlFetchApp.fetch(url, options);
      const status = response.getResponseCode();
      const text = response.getContentText();

      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (_) {
        body = null;
      }

      // Success (2xx)
      if (status >= 200 && status < 300) {
        if (body && body.ok === false) {
          return {
            ok: false,
            status: status,
            body: body,
            message: body.error || body.message || "Edge function rejected payload.",
          };
        }
        return {
          ok: true,
          status: status,
          body: body,
          message: "Success",
        };
      }

      // Non-retryable Client Errors (400, 401, 403, 404, 422)
      if (status >= 400 && status < 500 && status !== 429) {
        return {
          ok: false,
          status: status,
          body: body,
          message: getServerErrorMessage_(status, body, text),
        };
      }

      // Retryable Statuses (429 Rate Limit, 500, 502, 503, 504)
      console.warn(
        `[postToSupabase] Attempt ${attempt}/${CONFIG.MAX_RETRIES} failed with HTTP ${status}. Retrying in ${delayMs}ms...`,
      );

      if (attempt < CONFIG.MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 500);
        Utilities.sleep(delayMs + jitter);
        delayMs *= 2;
      } else {
        return {
          ok: false,
          status: status,
          body: body,
          message: `Server returned HTTP ${status} after ${CONFIG.MAX_RETRIES} attempts: ${getServerErrorMessage_(status, body, text)}`,
        };
      }
    } catch (networkErr) {
      console.warn(
        `[postToSupabase] Attempt ${attempt}/${CONFIG.MAX_RETRIES} encountered network error: ${networkErr.message}`,
      );

      if (attempt < CONFIG.MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 500);
        Utilities.sleep(delayMs + jitter);
        delayMs *= 2;
      } else {
        return {
          ok: false,
          status: 0,
          body: null,
          message: `Network error after ${CONFIG.MAX_RETRIES} attempts: ${networkErr.message}`,
        };
      }
    }
  }

  return {
    ok: false,
    status: 0,
    body: null,
    message: "Max retries exhausted.",
  };
}

/**
 * Diagnostic Health Check: Tests connectivity, auth, and read capabilities.
 */
function testConnection() {
  try {
    showToast_("Testing Edge Function connectivity...", "Acadrix Diagnostics");

    const config = getActiveConfig_();
    const url = `${config.supabaseUrl}/functions/v1/${CONFIG.FUNCTION_NAME}?limit=1`;

    const options = {
      method: "get",
      headers: {
        "x-sync-secret": config.secret,
        Accept: "application/json",
      },
      muteHttpExceptions: true,
    };

    const startTime = Date.now();
    const response = UrlFetchApp.fetch(url, options);
    const latencyMs = Date.now() - startTime;
    const status = response.getResponseCode();
    const text = response.getContentText();

    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_) {}

    if (status === 200 && (!body || body.ok !== false)) {
      const recordCount = body && Array.isArray(body.records) ? body.records.length : 0;
      const msg = [
        "✅ Edge Function Connected Successfully!",
        "",
        `Endpoint: ${url}`,
        `Status: HTTP ${status}`,
        `Latency: ${latencyMs}ms`,
        `Sample Records Accessible: ${recordCount}`,
      ].join("\n");

      console.log(`[testConnection] ${msg}`);
      showAlert_("Connection Test: SUCCESS", msg);
    } else {
      const errMsg = getServerErrorMessage_(status, body, text);
      const msg = [
        "❌ Connection Test Failed",
        "",
        `Status: HTTP ${status}`,
        `Error: ${errMsg}`,
        "",
        "Please verify that EMAIL_INGEST_SECRET in Script Properties matches Supabase settings.",
      ].join("\n");

      console.error(`[testConnection] ${msg}`);
      showAlert_("Connection Test: FAILED", msg);
    }
  } catch (error) {
    console.error(`[testConnection] Unexpected error: ${error.message}`);
    showAlert_("Connection Error", `Failed to reach Supabase: ${error.message}`);
  }
}

// ============================================================================
// 5. ROW SCANNING, EXTRACTION & NORMALIZATION
// ============================================================================

/**
 * Scans only the essential index columns (email_id, sync_status, processed_at)
 * to quickly discover row numbers that need synchronization.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object.<string, number>} headerMap
 * @returns {number[]} Array of 1-indexed row numbers ready to sync
 */
function getPendingRowNumbers_(sheet, headerMap) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const numDataRows = lastRow - 1;
  const colEmailId = headerMap["email_id"] + 1;
  const colStatus = headerMap[CONFIG.SYNC_COLUMNS.STATUS] + 1;
  const colProcessedAt = headerMap["processed_at"] + 1;

  // Single-column range reads (fast)
  const emailIdValues = sheet.getRange(2, colEmailId, numDataRows, 1).getValues();
  const statusValues = sheet.getRange(2, colStatus, numDataRows, 1).getValues();
  const processedAtValues = sheet.getRange(2, colProcessedAt, numDataRows, 1).getValues();

  const pendingRows = [];

  for (let i = 0; i < numDataRows; i++) {
    const rowNum = i + 2;
    const emailId = String(emailIdValues[i][0] || "").trim();
    const status = String(statusValues[i][0] || "")
      .trim()
      .toUpperCase();
    const processedAt = processedAtValues[i][0];

    // Gate 1: Must have an email_id
    if (!emailId) {
      continue;
    }

    // Gate 2: Skip already SYNCED or permanently REJECTED rows
    if (status === CONFIG.STATUS_SYNCED || status === CONFIG.STATUS_REJECTED) {
      continue;
    }

    // Gate 3: Ready marker - Workspace Studio must have populated processed_at
    const hasProcessedAt =
      processedAt instanceof Date ||
      (typeof processedAt === "string" && processedAt.trim().length > 0);
    if (!hasProcessedAt) {
      // Row is still being populated by Workspace Studio; skip for now
      continue;
    }

    pendingRows.push(rowNum);
  }

  return pendingRows;
}

/**
 * Builds batches of parsed records respecting both count limit (e.g. 25)
 * and serialized payload byte size (<800 KB).
 */
function buildBatches_(sheet, headerMap, pendingRowNumbers, maxCount, maxBytes) {
  if (pendingRowNumbers.length === 0) {
    return [];
  }

  const lastCol = sheet.getLastColumn();
  const batches = [];
  let currentBatch = [];
  let currentBatchBytes = 100; // Base JSON wrapper overhead: {"source":"...","records":[]}

  for (const rowNum of pendingRowNumbers) {
    const rowValues = sheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];
    const parsed = parseRowRecord_(rowValues, headerMap, rowNum);

    const recordSizeEstimate = parsed.valid ? JSON.stringify(parsed.record).length + 2 : 50;

    const wouldExceedSize = currentBatchBytes + recordSizeEstimate > maxBytes;
    const wouldExceedCount = currentBatch.length >= maxCount;

    if (currentBatch.length > 0 && (wouldExceedSize || wouldExceedCount)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchBytes = 100;
    }

    currentBatch.push({
      rowNumber: rowNum,
      valid: parsed.valid,
      record: parsed.record,
      error: parsed.error,
    });

    currentBatchBytes += recordSizeEstimate;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Parses and validates an individual sheet row into structured IngestEmailRecord.
 */
function parseRowRecord_(row, headerMap, rowNumber) {
  const getVal = (headerKey) => {
    const colIndex = headerMap[headerKey.toLowerCase()];
    if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) {
      return null;
    }
    return normalizeCell_(row[colIndex]);
  };

  const emailId = getVal("email_id");
  if (!emailId || String(emailId).trim().length === 0) {
    return {
      valid: false,
      record: null,
      error: `Row ${rowNumber}: 'email_id' is empty.`,
    };
  }

  // Duplicate status coercion
  const rawDup = (getVal("duplicate_status") || "").toUpperCase();
  const dupStatus = rawDup === "NEW" ? "NEW_EMAIL" : rawDup || "NEW_EMAIL";

  // Confidence normalization
  const rawConfidence = getVal("confidence");
  const normalizedConfidence = normalizeConfidence_(rawConfidence);

  // Additional events cleanup
  const rawAddEvts = getVal("additional_academic_events");
  const cleanAddEvts =
    rawAddEvts && rawAddEvts.toUpperCase() !== "NONE" && rawAddEvts.toUpperCase() !== "NULL"
      ? rawAddEvts
      : null;

  // Processing notes cleanup
  const rawNotes = getVal("processing_notes");
  const cleanNotes = rawNotes && rawNotes.toUpperCase() !== "NONE" ? rawNotes : null;

  const record = {
    emailId: String(emailId).trim(),
    threadId: getVal("thread_id"),
    receivedAt: normalizeDateTime_(getVal("received_at")),
    senderName: getVal("sender_name"),
    senderEmail: getVal("sender_email"),
    subject: getVal("subject"),
    classification: getVal("classification") || "POSSIBLY_OFFICIAL",
    officiality: getVal("officiality") || "UNKNOWN",
    importance: getVal("importance") || "MEDIUM",
    category: getVal("category") || "ACADEMIC",
    courseCode: getVal("course_code"),
    courseName: getVal("course_name"),
    eventTitle: getVal("event_title"),
    eventType: getVal("event_type"),
    deadline: normalizeDateTime_(getVal("deadline")),
    startAt: normalizeDateTime_(getVal("start_at")),
    endAt: normalizeDateTime_(getVal("end_at")),
    location: getVal("location"),
    requiredAction: getVal("required_action"),
    affectedAssessment: getVal("affected_assessment"),
    confidence: normalizedConfidence,
    duplicateStatus: dupStatus,
    dedupKey: getVal("dedup_key"),
    evidence: getVal("evidence"),
    additionalAcademicEvents: cleanAddEvts,
    processingNotes: cleanNotes,
    emailSummary: getVal("email_summary"),
    emailBody: getVal("email_body"),
    processedAt: normalizeDateTime_(getVal("processed_at")) || formatIsoIst_(new Date()),
  };

  return {
    valid: true,
    record: record,
    error: null,
  };
}

/**
 * Normalizes general cell values (strings, numbers, dates).
 */
function normalizeCell_(val) {
  if (val === null || val === undefined) {
    return null;
  }
  if (val instanceof Date) {
    return formatIsoIst_(val);
  }
  if (typeof val === "number") {
    return isNaN(val) ? null : String(val);
  }
  if (typeof val === "boolean") {
    return val ? "TRUE" : "FALSE";
  }

  const str = String(val).trim();
  return str === "" ? null : str;
}

/**
 * Converts dates/strings into standard ISO-8601 strings with IST (+05:30) offset.
 * Returns null for unparseable or empty values (prevents 1970 epoch bugs).
 */
function normalizeDateTime_(val) {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : formatIsoIst_(val);
  }

  const str = String(val).trim();
  if (!str || str.toUpperCase() === "NONE" || str.toUpperCase() === "NULL") {
    return null;
  }

  // 1. Direct standard parse
  const directParsed = Date.parse(str);
  if (Number.isFinite(directParsed)) {
    return formatIsoIst_(new Date(directParsed));
  }

  // 2. Handle human-formatted dates e.g. "October 5, 2026 at 3:24 PM IST"
  const formatted = str
    .replace(/\bat\b/gi, "")
    .replace(/\bIST\b/gi, "+05:30")
    .replace(/\s+/g, " ")
    .trim();

  const formattedParsed = Date.parse(formatted);
  if (Number.isFinite(formattedParsed)) {
    return formatIsoIst_(new Date(formattedParsed));
  }

  return null;
}

/**
 * Formats a Date object as ISO-8601 in Asia/Kolkata (IST: +05:30).
 * Output format: YYYY-MM-DDTHH:mm:ss+05:30
 */
function formatIsoIst_(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return Utilities.formatDate(date, "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Normalizes confidence scores to decimal strings e.g. "0.950"
 */
function normalizeConfidence_(val) {
  if (val === null || val === undefined) return "0.900";
  const s = String(val).trim().toUpperCase();
  if (s === "HIGH") return "0.950";
  if (s === "MEDIUM") return "0.750";
  if (s === "LOW") return "0.500";
  const num = parseFloat(s);
  if (Number.isFinite(num)) {
    return num.toFixed(3);
  }
  return "0.900";
}

// ============================================================================
// 6. SHEET, HEADER & TRACKING COLUMN MANAGEMENT
// ============================================================================

/**
 * Discovers the target sheet by checking configured/default names.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function resolveEmailsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("No active spreadsheet found. Please run within a Google Sheet context.");
  }

  const props = PropertiesService.getScriptProperties();
  const customName = props.getProperty(CONFIG.PROP_SHEET_NAME);

  if (customName) {
    const s = spreadsheet.getSheetByName(customName);
    if (s) return s;
  }

  for (const name of CONFIG.SHEET_NAMES) {
    const s = spreadsheet.getSheetByName(name);
    if (s) return s;
  }

  // Fallback to active sheet
  const active = spreadsheet.getActiveSheet();
  if (active) {
    return active;
  }

  throw new Error(
    `Could not find email staging sheet. Looked for tabs: ${CONFIG.SHEET_NAMES.join(", ")}`,
  );
}

/**
 * Builds header-to-column index map and validates mandatory 28 columns.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object.<string, number>}
 */
function validateAndMapHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("Sheet has no columns or headers in row 1.");
  }

  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const headerMap = {};
  const presentHeaders = [];

  for (let c = 0; c < rawHeaders.length; c++) {
    const h = String(rawHeaders[c] || "")
      .trim()
      .toLowerCase();
    if (h) {
      headerMap[h] = c;
      presentHeaders.push(h);
    }
  }

  // Verify mandatory 28 headers
  const missing = [];
  for (const req of CONFIG.REQUIRED_HEADERS) {
    if (headerMap[req.toLowerCase()] === undefined) {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Sheet "${sheet.getName()}" is missing required column headers:\n- ${missing.join("\n- ")}\n\n` +
        `Found headers: ${presentHeaders.join(", ")}`,
    );
  }

  return headerMap;
}

/**
 * Ensures tracking columns (sync_status, synced_at, sync_error) exist in row 1.
 * Dynamically appends them if not already present.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object.<string, number>} headerMap
 */
function ensureSyncColumns_(sheet, headerMap) {
  const requiredSyncCols = [
    CONFIG.SYNC_COLUMNS.STATUS,
    CONFIG.SYNC_COLUMNS.SYNCED_AT,
    CONFIG.SYNC_COLUMNS.ERROR,
  ];

  let nextCol = sheet.getLastColumn() + 1;
  let appended = false;

  for (const colName of requiredSyncCols) {
    if (headerMap[colName.toLowerCase()] === undefined) {
      sheet.getRange(1, nextCol).setValue(colName).setFontWeight("bold");
      headerMap[colName.toLowerCase()] = nextCol - 1;
      nextCol++;
      appended = true;
    }
  }

  if (appended) {
    console.log(
      `[ensureSyncColumns] Appended sync tracking columns to sheet "${sheet.getName()}".`,
    );
  }
}

/**
 * Updates tracking status for a single row.
 */
function markRowStatus_(sheet, headerMap, rowNumber, status, errorMessage) {
  const colStatus = headerMap[CONFIG.SYNC_COLUMNS.STATUS] + 1;
  const colSyncedAt = headerMap[CONFIG.SYNC_COLUMNS.SYNCED_AT] + 1;
  const colError = headerMap[CONFIG.SYNC_COLUMNS.ERROR] + 1;

  const nowIso = formatIsoIst_(new Date());

  sheet.getRange(rowNumber, colStatus).setValue(status);
  sheet.getRange(rowNumber, colSyncedAt).setValue(nowIso);
  sheet.getRange(rowNumber, colError).setValue(errorMessage || "");
}

/**
 * Efficiently batch-updates tracking columns for multiple rows.
 */
function markContiguousRowsStatus_(sheet, headerMap, rowNumbers, status, errorMessage) {
  if (rowNumbers.length === 0) return;

  const colStatus = headerMap[CONFIG.SYNC_COLUMNS.STATUS] + 1;
  const colSyncedAt = headerMap[CONFIG.SYNC_COLUMNS.SYNCED_AT] + 1;
  const colError = headerMap[CONFIG.SYNC_COLUMNS.ERROR] + 1;

  const nowIso = formatIsoIst_(new Date());

  // Check if rows are strictly contiguous
  const isContiguous = rowNumbers.every((r, idx) => idx === 0 || r === rowNumbers[idx - 1] + 1);

  if (isContiguous && colSyncedAt === colStatus + 1 && colError === colStatus + 2) {
    const startRow = rowNumbers[0];
    const numRows = rowNumbers.length;
    const matrix = rowNumbers.map(() => [status, nowIso, errorMessage || ""]);
    sheet.getRange(startRow, colStatus, numRows, 3).setValues(matrix);
  } else {
    for (const rowNum of rowNumbers) {
      sheet.getRange(rowNum, colStatus).setValue(status);
      sheet.getRange(rowNum, colSyncedAt).setValue(nowIso);
      sheet.getRange(rowNum, colError).setValue(errorMessage || "");
    }
  }
}

// ============================================================================
// 7. TRIGGER AUTOMATION MANAGEMENT
// ============================================================================

/**
 * Installs a recurring Time-driven trigger (every 1 minute).
 */
function installSyncTrigger() {
  removeSyncTriggers();

  ScriptApp.newTrigger("syncNewEmails").timeBased().everyMinutes(1).create();

  const msg = "✅ 1-Minute synchronization background trigger installed successfully.";
  console.log(`[installSyncTrigger] ${msg}`);
  showAlert_("Trigger Installed", msg);
}

/**
 * Removes all triggers created for this synchronization script.
 */
function removeSyncTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;

  for (const t of triggers) {
    const fn = t.getHandlerFunction();
    if (fn === "syncNewEmails" || fn === "syncEmailsToSupabase" || fn === "syncLatestEmail") {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  }

  const msg = `Removed ${count} existing synchronization trigger(s).`;
  console.log(`[removeSyncTriggers] ${msg}`);
  showToast_(msg, "Acadrix Triggers");
}

// ============================================================================
// 8. CONFIGURATION & STATE MANAGEMENT
// ============================================================================

/**
 * Retrieves configuration from ScriptProperties.
 * Throws immediately if EMAIL_INGEST_SECRET is missing (Zero fallback secrets!).
 */
function getActiveConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty(CONFIG.PROP_URL) || CONFIG.DEFAULT_SUPABASE_URL;
  const secret = props.getProperty(CONFIG.PROP_SECRET);

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "Missing EMAIL_INGEST_SECRET in Script Properties.\n\n" +
        'Please open the spreadsheet menu: "⚡ Acadrix" > "⚙️ Configure Credentials", ' +
        "or go to Extensions > Apps Script > Project Settings > Script Properties and add EMAIL_INGEST_SECRET.",
    );
  }

  return {
    supabaseUrl: url.replace(/\/+$/, ""),
    secret: secret.trim(),
  };
}

/**
 * Interactive UI prompt to configure EMAIL_INGEST_SECRET.
 */
function configureCredentialsPrompt() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const currentSecret = props.getProperty(CONFIG.PROP_SECRET) || "";
  const maskedSecret = currentSecret
    ? `${currentSecret.slice(0, 8)}...${currentSecret.slice(-4)}`
    : "(Not configured)";

  const respSecret = ui.prompt(
    "⚙️ Configure Ingestion Secret",
    `Enter EMAIL_INGEST_SECRET\n(Current: ${maskedSecret}):`,
    ui.ButtonSet.OK_CANCEL,
  );

  if (respSecret.getSelectedButton() === ui.Button.OK) {
    const newSecret = respSecret.getResponseText().trim();
    if (newSecret) {
      props.setProperty(CONFIG.PROP_SECRET, newSecret);
      showToast_("EMAIL_INGEST_SECRET saved securely.", "Acadrix Config");
      showAlert_("Credentials Saved", "EMAIL_INGEST_SECRET has been saved in Script Properties.");
    }
  }
}

/**
 * Allows user to reset REJECTED or FAILED rows back to PENDING for re-evaluation.
 */
function resetRejectedRowsPrompt() {
  try {
    const sheet = resolveEmailsSheet_();
    const headerMap = validateAndMapHeaders_(sheet);
    ensureSyncColumns_(sheet, headerMap);

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      showAlert_("No Data", "No email rows in sheet.");
      return;
    }

    const colStatus = headerMap[CONFIG.SYNC_COLUMNS.STATUS] + 1;
    const colError = headerMap[CONFIG.SYNC_COLUMNS.ERROR] + 1;
    const numRows = lastRow - 1;

    const statuses = sheet.getRange(2, colStatus, numRows, 1).getValues();
    let resetCount = 0;

    for (let i = 0; i < numRows; i++) {
      const s = String(statuses[i][0] || "")
        .trim()
        .toUpperCase();
      if (s === CONFIG.STATUS_REJECTED || s === CONFIG.STATUS_FAILED) {
        const rowNum = i + 2;
        sheet.getRange(rowNum, colStatus).setValue(CONFIG.STATUS_PENDING);
        sheet.getRange(rowNum, colError).setValue("");
        resetCount++;
      }
    }

    const msg = `Reset ${resetCount} row(s) back to PENDING status.`;
    console.log(`[resetRejectedRowsPrompt] ${msg}`);
    showAlert_("Rows Reset", msg);
  } catch (err) {
    showAlert_("Reset Error", err.message);
  }
}

/**
 * Shows current sync status and counts across all rows.
 */
function showSyncStatus() {
  try {
    const sheet = resolveEmailsSheet_();
    const headerMap = validateAndMapHeaders_(sheet);
    ensureSyncColumns_(sheet, headerMap);

    const lastRow = sheet.getLastRow();
    const totalDataRows = Math.max(0, lastRow - 1);

    let syncedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    if (totalDataRows > 0) {
      const colStatus = headerMap[CONFIG.SYNC_COLUMNS.STATUS] + 1;
      const statusValues = sheet.getRange(2, colStatus, totalDataRows, 1).getValues();

      for (let i = 0; i < totalDataRows; i++) {
        const s = String(statusValues[i][0] || "")
          .trim()
          .toUpperCase();
        if (s === CONFIG.STATUS_SYNCED) syncedCount++;
        else if (s === CONFIG.STATUS_REJECTED) rejectedCount++;
        else if (s === CONFIG.STATUS_FAILED) failedCount++;
        else pendingCount++;
      }
    }

    let configInfo = "(Not configured)";
    try {
      const cfg = getActiveConfig_();
      configInfo = `${cfg.supabaseUrl}/functions/v1/${CONFIG.FUNCTION_NAME}`;
    } catch (_) {
      configInfo = "⚠️ Missing secret in Script Properties";
    }

    const triggers = ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());

    const msg = [
      "📊 Acadrix Synchronization Audit Status",
      "────────────────────────────────────────",
      `Sheet Tab        : ${sheet.getName()}`,
      `Total Email Rows : ${totalDataRows}`,
      `  • Synced       : ${syncedCount}`,
      `  • Pending      : ${pendingCount}`,
      `  • Rejected     : ${rejectedCount}`,
      `  • Failed       : ${failedCount}`,
      "────────────────────────────────────────",
      `Target Endpoint  : ${configInfo}`,
      `Active Triggers  : ${triggers.length > 0 ? triggers.join(", ") : "None (Manual only)"}`,
      "────────────────────────────────────────",
      pendingCount > 0
        ? `⚡ ${pendingCount} row(s) ready to sync.`
        : "✅ All rows are synchronized.",
    ].join("\n");

    showAlert_("Sync Status", msg);
  } catch (err) {
    showAlert_("Status Error", `Could not compute status: ${err.message}`);
  }
}

// ============================================================================
// 9. UTILITIES & HELPERS
// ============================================================================

/**
 * Formats a clean error message from HTTP status and response payload.
 */
function getServerErrorMessage_(status, body, rawText) {
  if (body) {
    if (body.error) {
      return (
        `HTTP ${status}: ${body.error}` + (body.details ? ` (${JSON.stringify(body.details)})` : "")
      );
    }
    if (body.message) {
      return `HTTP ${status}: ${body.message}`;
    }
  }
  return `HTTP ${status}: ${rawText || "Unknown server response"}`;
}

/**
 * Displays a non-blocking toast if in UI context.
 */
function showToast_(message, title, timeoutSec) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, title || "Acadrix", timeoutSec || 4);
  } catch (_) {
    // Non-UI trigger context
  }
}

/**
 * Displays a modal alert dialog if in UI context, or logs to console.
 */
function showAlert_(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (_) {
    console.log(`[${title}] ${message}`);
  }
}
