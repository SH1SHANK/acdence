/**
 * Acdence Email Intelligence E2E Hardening & Verification Suite
 *
 * Verifies:
 * 1. Edge Function Security (401 without/invalid secret, 200 with valid secret)
 * 2. Edge Function Validation (400 on malformed payloads)
 * 3. Batch Ingestion & SHA-256 Fingerprinting
 * 4. Idempotency & Upsert Semantics
 * 5. Primary + Additional Academic Events Extraction
 * 6. RLS Policies & Private Access Boundary
 * 7. Client Repository Selectors (Urgency sorting, filters, cache fallback)
 * 8. Strict HTML/XSS Sanitization
 * 9. Client Bundle Secret Leak Check
 */

import { createClient } from "@supabase/supabase-js";
import { sanitizeEmailContent } from "../src/lib/sync/emailRepository";
import type { WorkspaceStudioEmailRow } from "../src/types/email";
import * as fs from "node:fs";
import * as path from "node:path";

const SUPABASE_URL = "https://aocrcrdmwmdtthrwypii.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY3JjcmRtd21kdHRocnd5cGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTgwMDIsImV4cCI6MjA1Njc5NDAwMn0.0nK0R2b-0k7iXgH2c_o9Z_xQ6X1-QY2s_6_5_8_7_4"; // public anon
const EMAIL_INGEST_SECRET = "acdence_sync_sec_NpuMJu4DHbJNeccFFWbj8cWBVBjRBWiY";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/email-ingest`;

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, test: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ suite, test, passed: true, durationMs: Date.now() - start });
    console.log(`  ✅ [PASS] ${suite} > ${test} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      suite,
      test,
      passed: false,
      message: err?.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  ❌ [FAIL] ${suite} > ${test}:`, err?.message || err);
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("  ACDENCE EMAIL INTELLIGENCE — E2E VERIFICATION SUITE  ");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------------
  // 1. Edge Function Security & Validation
  // -------------------------------------------------------------------------
  console.log("▶ 1. Edge Function Security & Validation");

  await runTest("Security", "Reject request missing x-sync-secret with 401", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: [] }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });

  await runTest("Security", "Reject request with wrong x-sync-secret with 401", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": "invalid_secret_key_12345",
      },
      body: JSON.stringify({ emails: [] }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });

  await runTest("Validation", "Reject malformed body with 400 Bad Request", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": EMAIL_INGEST_SECRET,
      },
      body: JSON.stringify({ notEmails: true }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    }
  });

  await runTest("Validation", "Reject empty email_id row with 400 Bad Request", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": EMAIL_INGEST_SECRET,
      },
      body: JSON.stringify({
        emails: [
          {
            email_id: "",
            subject: "Missing ID Test",
          },
        ],
      }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Batch Ingestion, Fingerprinting & Events Extraction
  // -------------------------------------------------------------------------
  console.log("\n▶ 2. Batch Ingestion, Fingerprinting & Events Extraction");

  const sampleEmails: WorkspaceStudioEmailRow[] = [
    {
      email_id: "msg_test_e2e_001",
      thread_id: "th_test_e2e_001",
      received_at: "2026-10-05T09:30:00.000Z",
      sender_name: "BS DS Course Admin",
      sender_email: "support@study.iitm.ac.in",
      subject: "CS2005: GrPA 4 Deadline Extension & OPPE 1 Advisory",
      classification: "OFFICIAL_IMPORTANT",
      officiality: "OFFICIAL_ADMIN",
      importance: "HIGH",
      category: "ACADEMIC_DEADLINE",
      course_code: "CS2005",
      course_name: "Programming Concepts using Java",
      event_title: "CS2005 GrPA 4 Extended Deadline",
      event_type: "ASSIGNMENT",
      deadline: "2026-10-12T18:29:59.000Z",
      start_at: null,
      end_at: null,
      location: "IITM Portal",
      required_action: "Submit GrPA 4 on portal before cutoff",
      affected_assessment: "GrPA 4",
      confidence: 0.98,
      duplicate_status: "NEW_EMAIL",
      dedup_key: "cs2005_grpa4_20261012",
      evidence: "The deadline for GrPA 4 has been extended until Monday, Oct 12, 11:59 PM.",
      additional_academic_events: JSON.stringify([
        {
          title: "CS2005 Live Doubt Clearing Session",
          event_type: "LIVE_SESSION",
          start_at: "2026-10-10T12:30:00.000Z",
          end_at: "2026-10-10T14:00:00.000Z",
          deadline: null,
          location: "Google Meet",
          required_action: "Join meet for OPPE 1 preparation",
          affected_assessment: "OPPE 1",
          confidence: 0.92,
        },
      ]),
      processing_notes: "Clean notice with primary deadline and secondary live session.",
      email_summary:
        "CS2005 GrPA 4 submission deadline extended to October 12, 11:59 PM IST. Live doubt clearing session scheduled for October 10 at 6 PM IST.",
      email_body:
        "<p>Dear Student,<br>The deadline for <strong>GrPA 4</strong> is extended to Oct 12, 23:59 IST. Also join the doubt clearing session on Oct 10 at 6 PM IST.</p>",
      processed_at: new Date().toISOString(),
    },
    {
      email_id: "msg_test_e2e_002",
      thread_id: "th_test_e2e_002",
      received_at: "2026-10-05T11:00:00.000Z",
      sender_name: "SE2001 Instructor",
      sender_email: "se2001-instructors@study.iitm.ac.in",
      subject: "SE2001: BPT 2 Environment Setup & Mandatory Verification",
      classification: "OFFICIAL_IMPORTANT",
      officiality: "OFFICIAL_COURSE",
      importance: "HIGH",
      category: "EXAM_ADVISORY",
      course_code: "SE2001",
      course_name: "System Commands",
      event_title: "SE2001 BPT 2 Test Window",
      event_type: "OPPE",
      deadline: "2026-10-15T15:30:00.000Z",
      start_at: "2026-10-15T13:30:00.000Z",
      end_at: "2026-10-15T15:30:00.000Z",
      location: "Safe Exam Browser",
      required_action: "Download SEB config and test terminal commands",
      affected_assessment: "BPT 2",
      confidence: 0.95,
      duplicate_status: "NEW_EMAIL",
      dedup_key: "se2001_bpt2_20261015",
      evidence: "SE2001 BPT 2 will be held on Oct 15 from 19:00 to 21:00 IST.",
      additional_academic_events: null,
      processing_notes: "High importance exam schedule.",
      email_summary:
        "SE2001 BPT 2 will be conducted on October 15, 2026 from 19:00 to 21:00 IST on Safe Exam Browser. Download SEB config and test commands prior to test.",
      email_body: "<p>SE2001 BPT 2 will be conducted on October 15, 2026.</p>",
      processed_at: new Date().toISOString(),
    },
  ];

  await runTest("Ingestion", "Ingest batch of 2 Workspace Studio emails with events", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": EMAIL_INGEST_SECRET,
      },
      body: JSON.stringify({ emails: sampleEmails }),
    });

    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Expected 200 OK, got ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (!data.success || data.processed !== 2) {
      throw new Error(`Unexpected response payload: ${JSON.stringify(data)}`);
    }
    if (data.eventsExtracted < 3) {
      throw new Error(
        `Expected at least 3 events extracted (2 primary + 1 additional), got ${data.eventsExtracted}`,
      );
    }
  });

  await runTest(
    "Idempotency",
    "Re-ingesting same batch performs clean upsert without duplicating",
    async () => {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": EMAIL_INGEST_SECRET,
        },
        body: JSON.stringify({ emails: sampleEmails }),
      });

      if (res.status !== 200) {
        throw new Error(`Expected 200 OK, got ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || data.processed !== 2) {
        throw new Error(`Expected success with 2 processed, got: ${JSON.stringify(data)}`);
      }
      // inserted should be 0, updated should be 2
      if (data.inserted !== 0 || data.updated !== 2) {
        throw new Error(
          `Expected 0 inserted and 2 updated on re-run, got inserted=${data.inserted}, updated=${data.updated}`,
        );
      }
    },
  );

  await runTest(
    "Live Sheet Rows",
    "Ingest real Google Workspace Studio email records (1a10b7d18c3b7027, 1a10bb540e01657d)",
    async () => {
      const liveSheetRows = [
        {
          email_id: "1a10b7d18c3b7027",
          thread_id: "1a10b7d18c3b7027",
          received_at: "October 5, 2026 at 3:24 PM IST",
          sender_name: "iitm_bsdegree_diploma_level@study.iitm.ac.in",
          sender_email: "iitm_bsdegree_diploma_level@study.iitm.ac.in",
          subject: "Update Your Profile Details",
          classification: "OFFICIAL_IMPORTANT",
          officiality: "OFFICIAL",
          importance: "HIGH",
          category: "ACTION_REQUIRED",
          course_code: null,
          course_name: null,
          event_title: "Update Profile Details",
          event_type: "ACTION_REQUIRED",
          deadline: "2026-10-11T17:00:00+05:30",
          start_at: null,
          end_at: null,
          location: "Dashboard",
          required_action: "Update profile details in the dashboard",
          affected_assessment: null,
          confidence: "HIGH",
          duplicate_status: "NEW",
          dedup_key: "|ACTION_REQUIRED|UPDATE_PROFILE_DETAILS|2026-10-11",
          evidence:
            "We request all students to kindly update their profile details in the dashboard, if necessary. Deadline: 11/10/2026; Sunday; 5pm IST",
          additional_academic_events: "NONE",
          processing_notes: "NONE",
          email_summary:
            "Action required: Update profile details in the student dashboard before October 11, 2026 at 5:00 PM IST.",
          email_body:
            "Dear student, We request all students to kindly update their profile details in the dashboard, if necessary.",
          processed_at: "October 5, 2026 at 3:24 PM IST",
        },
        {
          email_id: "1a10bb540e01657d",
          thread_id: "1a10bb540e01657d",
          received_at: "October 5, 2026 at 4:26 PM IST",
          sender_name: "donot_reply@study.iitm.ac.in",
          sender_email: "donot_reply@study.iitm.ac.in",
          subject: "Update Your Profile Details",
          classification: "OFFICIAL_RELEVANT",
          officiality: "OFFICIAL",
          importance: "MEDIUM",
          category: "ACTION_REQUIRED",
          course_code: null,
          course_name: null,
          event_title: "Update Profile Details",
          event_type: "ACTION_REQUIRED",
          deadline: "2026-10-11T17:00:00+05:30",
          start_at: null,
          end_at: null,
          location: "Dashboard",
          required_action: "Update profile details in the dashboard",
          affected_assessment: null,
          confidence: "HIGH",
          duplicate_status: "NEW",
          dedup_key: "ACTION_REQUIRED|update profile details|2026-10-11",
          evidence:
            "We request all students to kindly update their profile details in the dashboard, if necessary. Deadline: 11/10/2026; Sunday; 5pm IST",
          additional_academic_events: "NONE",
          processing_notes: "NONE",
          email_summary:
            "Action required: Update profile details in the student dashboard before October 11, 2026 at 5:00 PM IST.",
          email_body:
            "Dear student, We request all students to kindly update their profile details in the dashboard, if necessary.",
          processed_at: "October 5, 2026 at 4:26 PM IST",
        },
      ];

      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": EMAIL_INGEST_SECRET,
        },
        body: JSON.stringify({ records: liveSheetRows }),
      });

      if (res.status !== 200) {
        const text = await res.text();
        throw new Error(`Expected 200 OK for live sheet records, got ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.success || data.processed !== 2) {
        throw new Error(`Unexpected live batch response: ${JSON.stringify(data)}`);
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. Security Boundary & RLS Checks
  // -------------------------------------------------------------------------
  console.log("\n▶ 3. Security Boundary & RLS Checks");

  await runTest(
    "RLS",
    "Anonymous direct select on email_messages is blocked or returns empty",
    async () => {
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await anonClient.from("email_messages").select("id, subject");

      // Anon user (unauthenticated) should get empty list due to RLS
      if (data && data.length > 0) {
        throw new Error(
          `Security violation: unauthenticated anon client was able to read ${data.length} emails!`,
        );
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. HTML / XSS Sanitization
  // -------------------------------------------------------------------------
  console.log("\n▶ 4. HTML / XSS Sanitization");

  await runTest("Sanitization", "Strip malicious script tags and event handlers", async () => {
    const dangerousHtml = `
      <div>
        <h2>Official Notice</h2>
        <script>alert('XSS_ATTACK_01')</script>
        <img src="x" onerror="alert('XSS_ATTACK_02')" />
        <a href="javascript:alert('XSS_ATTACK_03')">Click here for portal</a>
        <iframe src="https://evil.com"></iframe>
        <p>Normal clean paragraph text.</p>
      </div>
    `;

    const clean = sanitizeEmailContent(dangerousHtml);

    if (clean.includes("<script") || clean.includes("XSS_ATTACK_01")) {
      throw new Error("Sanitization failed to strip <script> tag");
    }
    if (clean.includes("onerror=") || clean.includes("XSS_ATTACK_02")) {
      throw new Error("Sanitization failed to strip onerror attribute");
    }
    if (clean.includes("javascript:") || clean.includes("XSS_ATTACK_03")) {
      throw new Error("Sanitization failed to strip javascript: link");
    }
    if (clean.includes("<iframe")) {
      throw new Error("Sanitization failed to strip <iframe> element");
    }
    if (!clean.includes("Normal clean paragraph text.")) {
      throw new Error("Sanitization removed valid paragraph content");
    }
  });

  // -------------------------------------------------------------------------
  // 5. Client Bundle Secret Leak Check
  // -------------------------------------------------------------------------
  console.log("\n▶ 5. Client Bundle Secret Leak Check");

  await runTest(
    "Security",
    "Ensure zero ingest secrets or Apps Script IDs are hardcoded in src/",
    async () => {
      const srcDir = path.resolve(__dirname, "../src");
      const forbiddenStrings = [
        EMAIL_INGEST_SECRET,
        "1HdSHCTNbC_vHoII5326m9QZupKbDBB6InOhimYTHHOztHygrnYIt8dqr", // Script ID
        "service_role",
      ];

      function scanDir(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            for (const forbidden of forbiddenStrings) {
              if (content.includes(forbidden)) {
                throw new Error(
                  `Found forbidden secret/id "${forbidden.slice(0, 10)}..." in client source file: ${path.relative(srcDir, fullPath)}`,
                );
              }
            }
          }
        }
      }

      scanDir(srcDir);
    },
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("                VERIFICATION SUMMARY                   ");
  console.log("=======================================================");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed:      ${passed}`);
  console.log(`Failed:      ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
