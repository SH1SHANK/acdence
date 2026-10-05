// ============================================================================
// DENO 2.x TEST SUITE: DEADLINE NOTIFICATIONS EDGE FUNCTION
// ============================================================================
// Comprehensive test suite covering all 23 mandated verification scenarios:
// 1. Authorization success/failure
// 2. Missing secret behavior
// 3. Invalid secret behavior
// 4. Deterministic notification keys
// 5. All four notification rules
// 6. IST date boundaries
// 7. Exact threshold boundaries
// 8. Completed tasks excluded
// 9. Duplicate invocation/idempotency
// 10. Concurrent claim behavior
// 11. Stale finalizer behavior
// 12. Maximum attempt handling
// 13. OneSignal success
// 14. OneSignal transient failure
// 15. OneSignal permanent failure
// 16. Malformed upstream response
// 17. Missing OneSignal configuration
// 18. Empty user set
// 19. Empty candidate set
// 20. Multiple users
// 21. Multiple events for one user
// 22. Multiple rules for one event
// 23. Generated canonical event artifact consistency
// ============================================================================

// Ambient typing for environments outside Deno CLI
declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

import {
  ACADEMIC_TIMEZONE,
  evaluateEventRule,
  formatNotificationContent,
  generateNotificationKey,
  getDayDifference,
  getTodayIST,
  matchNotificationRule,
} from "./rules.ts";
import { getUpcomingCanonicalEvents, getUpcomingUserTasks } from "./events.ts";
import { claimDelivery, finalizeDelivery } from "./delivery.ts";
import { type OneSignalConfig, sendOneSignalPush } from "./onesignal.ts";
import { CANONICAL_EDGE_EVENTS } from "./generated_canonical_events.ts";
import { handleNotificationRequest } from "./index.ts";
import type { NotificationCandidate, NotificationEvent } from "./types.ts";

function assertEquals<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(
      msg ||
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assert(condition: unknown, msg = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

const USER_A = "550e8400-e29b-41d4-a716-446655440001";
const USER_B = "550e8400-e29b-41d4-a716-446655440002";
const MOCK_CRON_SECRET = "test_cron_secret_abc123";
const MOCK_SERVICE_ROLE_KEY = "test_service_role_key_xyz789";

// ============================================================================
// 1. AUTHORIZATION SUCCESS & FAILURE
// ============================================================================
Deno.test("1. Auth: rejects invocation when Authorization header is missing (401)", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun: true }),
  });

  const res = await handleNotificationRequest(req, {
    env: {
      get: (k) =>
        k === "SUPABASE_URL"
          ? "https://example.supabase.co"
          : k === "SUPABASE_SERVICE_ROLE_KEY"
          ? MOCK_SERVICE_ROLE_KEY
          : undefined,
    },
  });

  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.ok, false);
  assert(data.error.includes("Missing authorization header"));
});

Deno.test("1b. Auth: accepts invocation with valid Bearer CRON_SECRET", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOCK_CRON_SECRET}`,
    },
    body: JSON.stringify({ dryRun: true, userId: USER_A, targetDate: "2026-10-15" }),
  });

  const mockSupabase = {
    auth: { admin: { listUsers: () => Promise.resolve({ data: { users: [] }, error: null }) } },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            not: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  };

  const res = await handleNotificationRequest(req, {
    env: {
      get: (k) =>
        k === "CRON_SECRET"
          ? MOCK_CRON_SECRET
          : k === "SUPABASE_URL"
          ? "https://example.supabase.co"
          : k === "SUPABASE_SERVICE_ROLE_KEY"
          ? MOCK_SERVICE_ROLE_KEY
          : undefined,
    },
    // deno-lint-ignore no-explicit-any
    supabase: mockSupabase as any,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.ok, true);
});

// ============================================================================
// 2. MISSING SECRET BEHAVIOR
// ============================================================================
Deno.test("2. Secrets: fails closed when essential Supabase URL or key missing (500)", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: { Authorization: "Bearer some_token" },
  });

  const res = await handleNotificationRequest(req, {
    env: { get: () => undefined },
  });

  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.ok, false);
  assertEquals(data.error, "Server configuration error");
});

// ============================================================================
// 3. INVALID SECRET BEHAVIOR
// ============================================================================
Deno.test("3. Auth: rejects invalid token with 401 Unauthorized", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer completely_wrong_secret",
    },
    body: JSON.stringify({ dryRun: true }),
  });

  const res = await handleNotificationRequest(req, {
    env: {
      get: (k) =>
        k === "CRON_SECRET"
          ? MOCK_CRON_SECRET
          : k === "SUPABASE_URL"
          ? "https://example.supabase.co"
          : k === "SUPABASE_SERVICE_ROLE_KEY"
          ? MOCK_SERVICE_ROLE_KEY
          : undefined,
    },
    // deno-lint-ignore no-explicit-any
    supabase: { rpc: () => Promise.resolve({ data: null, error: null }) } as any,
  });

  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.ok, false);
  assert(data.error.includes("Invalid authorization token"));
});

// ============================================================================
// 4. DETERMINISTIC NOTIFICATION KEYS
// ============================================================================
Deno.test("4. Keys: deterministic format guarantees identity and distinguishes task vs academic", () => {
  const academicKey = generateNotificationKey(
    USER_A,
    "academic_event",
    "exam_end_term",
    "DUE_7_DAYS",
    "2026-11-29",
  );
  assertEquals(
    academicKey,
    `${USER_A}:academic:exam_end_term:DUE_7_DAYS:2026-11-29`,
  );

  const taskKey = generateNotificationKey(
    USER_A,
    "semester_task",
    "task_custom_1",
    "DUE_7_DAYS",
    "2026-11-29",
  );
  assertEquals(
    taskKey,
    `${USER_A}:task:task_custom_1:DUE_7_DAYS:2026-11-29`,
  );

  assert(academicKey !== taskKey);
});

// ============================================================================
// 5. ALL FOUR NOTIFICATION RULES
// ============================================================================
Deno.test("5. Rules: matches all four notification rules exactly", () => {
  assertEquals(matchNotificationRule(7), "DUE_7_DAYS");
  assertEquals(matchNotificationRule(3), "DUE_3_DAYS");
  assertEquals(matchNotificationRule(1), "DUE_1_DAY");
  assertEquals(matchNotificationRule(0), "DUE_TODAY");

  const testEvent: NotificationEvent = {
    eventId: "test-ev",
    userId: USER_A,
    title: "Project Milestone",
    targetDate: "2026-10-22",
    source: "academic_event",
    category: "milestone",
  };
  const formatted = formatNotificationContent(testEvent, "DUE_7_DAYS");
  assert(formatted.title.includes("1 Week"));
});

// ============================================================================
// 6. IST DATE BOUNDARIES
// ============================================================================
Deno.test("6. Timezone: Asia/Kolkata date boundary rollover operates at midnight IST", () => {
  assertEquals(ACADEMIC_TIMEZONE, "Asia/Kolkata");
  assertEquals(getDayDifference("2026-10-22", "2026-10-15"), 7);
  // 18:29 UTC on 2026-10-15 is 23:59 IST on 2026-10-15
  const beforeMidnightUTC = new Date("2026-10-15T18:29:59.000Z");
  assertEquals(getTodayIST(beforeMidnightUTC), "2026-10-15");

  // 18:30 UTC on 2026-10-15 is 00:00 IST on 2026-10-16
  const atMidnightUTC = new Date("2026-10-15T18:30:00.000Z");
  assertEquals(getTodayIST(atMidnightUTC), "2026-10-16");
});

// ============================================================================
// 7. EXACT THRESHOLD BOUNDARIES & NEGATIVE EDGE CASES
// ============================================================================
Deno.test("7. Rules: exact thresholds match, intermediate/overdue days return null", () => {
  assertEquals(matchNotificationRule(7), "DUE_7_DAYS");
  assertEquals(matchNotificationRule(6), null);
  assertEquals(matchNotificationRule(5), null);
  assertEquals(matchNotificationRule(4), null);
  assertEquals(matchNotificationRule(3), "DUE_3_DAYS");
  assertEquals(matchNotificationRule(2), null);
  assertEquals(matchNotificationRule(1), "DUE_1_DAY");
  assertEquals(matchNotificationRule(0), "DUE_TODAY");
  assertEquals(matchNotificationRule(-1), null);
  assertEquals(matchNotificationRule(8), null);
});

// ============================================================================
// 8. COMPLETED TASKS EXCLUDED
// ============================================================================
Deno.test("8. Tasks: tasks with status 'done' are excluded from evaluation", async () => {
  const mockTasks = [
    { client_task_id: "t_done", title: "Done Task", due_date: "2026-10-16", status: "done" },
    { client_task_id: "t_pending", title: "Active Task", due_date: "2026-10-16", status: "todo" },
  ];

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            not: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: mockTasks, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  };

  const tasks = await getUpcomingUserTasks(mockSupabase, USER_A, "2026-10-15");
  assertEquals(tasks.length, 1);
  assertEquals(tasks[0].eventId, "t_pending");
});

// ============================================================================
// 9. DUPLICATE INVOCATION / IDEMPOTENCY
// ============================================================================
Deno.test("9. Idempotency: repeated evaluation generates identical keys and skips sent deliveries", async () => {
  const candidate: NotificationCandidate = {
    notificationKey: `${USER_A}:academic:exam_q1:DUE_3_DAYS:2026-10-18`,
    userId: USER_A,
    eventId: "exam_q1",
    ruleCode: "DUE_3_DAYS",
    targetDate: "2026-10-18",
    source: "academic_event",
    title: "Exam in 3 Days",
    body: "Quiz 1 in 3 days",
  };

  // Run 1: new claim
  const mockDbRun1 = {
    rpc: () =>
      Promise.resolve({
        data: [{
          claimed: true,
          delivery_id: "uuid-1",
          attempt: 1,
          current_status: "sending",
          reason: "new_claim",
        }],
        error: null,
      }),
  };
  const claim1 = await claimDelivery(mockDbRun1, candidate);
  assertEquals(claim1.claimed, true);

  // Run 2: already sent
  const mockDbRun2 = {
    rpc: () =>
      Promise.resolve({
        data: [{
          claimed: false,
          delivery_id: "uuid-1",
          attempt: 1,
          current_status: "sent",
          reason: "already_sent",
        }],
        error: null,
      }),
  };
  const claim2 = await claimDelivery(mockDbRun2, candidate);
  assertEquals(claim2.claimed, false);
  assertEquals(claim2.reason, "already_sent");
});

// ============================================================================
// 10. CONCURRENT CLAIM BEHAVIOR
// ============================================================================
Deno.test("10. Concurrency: active lease prevents concurrent worker claim", async () => {
  const candidate: NotificationCandidate = {
    notificationKey: `${USER_A}:academic:exam_q1:DUE_3_DAYS:2026-10-18`,
    userId: USER_A,
    eventId: "exam_q1",
    ruleCode: "DUE_3_DAYS",
    targetDate: "2026-10-18",
    source: "academic_event",
    title: "Exam in 3 Days",
    body: "Quiz 1 in 3 days",
  };

  const mockDbActiveLease = {
    rpc: () =>
      Promise.resolve({
        data: [{
          claimed: false,
          delivery_id: "uuid-1",
          attempt: 1,
          current_status: "sending",
          reason: "active_lease",
        }],
        error: null,
      }),
  };

  const claim = await claimDelivery(mockDbActiveLease, candidate);
  assertEquals(claim.claimed, false);
  assertEquals(claim.reason, "active_lease");
});

// ============================================================================
// 11. STALE FINALIZER BEHAVIOR
// ============================================================================
Deno.test("11. Delivery: stale worker finalization is rejected when expected attempt mismatches", async () => {
  const mockSupabaseStale = {
    rpc: (_fn: string, args?: Record<string, unknown>) => {
      // Simulate database WHERE clause: status = 'sending' AND attempt_count = p_expected_attempt
      // If attempt is outdated (e.g. expected 1, but db is now on attempt 2), 0 rows updated
      const isExpected = args?.p_expected_attempt === 2;
      return Promise.resolve({ data: isExpected, error: null });
    },
  };

  // Stale attempt (worker thought attempt was 1)
  const staleResult = await finalizeDelivery(mockSupabaseStale, "del-123", true, "msg-1", null, 1);
  assertEquals(staleResult, false);

  // Fresh attempt (worker has attempt 2)
  const freshResult = await finalizeDelivery(mockSupabaseStale, "del-123", true, "msg-1", null, 2);
  assertEquals(freshResult, true);
});

// ============================================================================
// 12. MAXIMUM ATTEMPT HANDLING
// ============================================================================
Deno.test("12. Delivery: rejects claim when max attempts reached (attempt_count >= 3)", async () => {
  const candidate: NotificationCandidate = {
    notificationKey: `${USER_A}:academic:exam_q1:DUE_1_DAY:2026-10-16`,
    userId: USER_A,
    eventId: "exam_q1",
    ruleCode: "DUE_1_DAY",
    targetDate: "2026-10-16",
    source: "academic_event",
    title: "Exam Tomorrow",
    body: "Exam is tomorrow",
  };

  const mockDbMaxAttempts = {
    rpc: () =>
      Promise.resolve({
        data: [{
          claimed: false,
          delivery_id: "uuid-1",
          attempt: 3,
          current_status: "failed",
          reason: "max_attempts_exceeded",
        }],
        error: null,
      }),
  };

  const claim = await claimDelivery(mockDbMaxAttempts, candidate);
  assertEquals(claim.claimed, false);
  assertEquals(claim.reason, "max_attempts_exceeded");
});

// ============================================================================
// 13. ONESIGNAL SUCCESS
// ============================================================================
Deno.test("13. OneSignal: successful push returns messageId and success: true", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ id: "onesignal-msg-uuid-999" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const config: OneSignalConfig = { appId: "app-id", restApiKey: "key-123" };
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:e1:DUE_TODAY:2026-10-15`,
      userId: USER_A,
      eventId: "e1",
      ruleCode: "DUE_TODAY",
      targetDate: "2026-10-15",
      source: "academic_event",
      title: "Today",
      body: "Due today",
    };

    const res = await sendOneSignalPush(config, candidate);
    assertEquals(res.success, true);
    assertEquals(res.messageId, "onesignal-msg-uuid-999");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================================
// 14. ONESIGNAL TRANSIENT FAILURE
// ============================================================================
Deno.test("14. OneSignal: classifies 429 and 503 as transient failures", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: ["Rate limit exceeded"] }), {
          status: 429,
          statusText: "Too Many Requests",
        }),
      );

    const config: OneSignalConfig = { appId: "app-id", restApiKey: "key-123" };
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:e1:DUE_TODAY:2026-10-15`,
      userId: USER_A,
      eventId: "e1",
      ruleCode: "DUE_TODAY",
      targetDate: "2026-10-15",
      source: "academic_event",
      title: "Today",
      body: "Due today",
    };

    const res = await sendOneSignalPush(config, candidate);
    assertEquals(res.success, false);
    assertEquals(res.transient, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================================
// 15. ONESIGNAL PERMANENT FAILURE
// ============================================================================
Deno.test("15. OneSignal: classifies 400 Bad Request as permanent failure", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: ["Invalid external user ID"] }), {
          status: 400,
          statusText: "Bad Request",
        }),
      );

    const config: OneSignalConfig = { appId: "app-id", restApiKey: "key-123" };
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:e1:DUE_TODAY:2026-10-15`,
      userId: USER_A,
      eventId: "e1",
      ruleCode: "DUE_TODAY",
      targetDate: "2026-10-15",
      source: "academic_event",
      title: "Today",
      body: "Due today",
    };

    const res = await sendOneSignalPush(config, candidate);
    assertEquals(res.success, false);
    assertEquals(res.transient, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================================
// 16. MALFORMED UPSTREAM RESPONSE
// ============================================================================
Deno.test("16. OneSignal: safely handles non-JSON / HTML error responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response("<html><body>502 Bad Gateway</body></html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      );

    const config: OneSignalConfig = { appId: "app-id", restApiKey: "key-123" };
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:e1:DUE_TODAY:2026-10-15`,
      userId: USER_A,
      eventId: "e1",
      ruleCode: "DUE_TODAY",
      targetDate: "2026-10-15",
      source: "academic_event",
      title: "Today",
      body: "Due today",
    };

    const res = await sendOneSignalPush(config, candidate);
    assertEquals(res.success, false);
    assertEquals(res.transient, true);
    assert(res.error?.includes("502"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================================
// 17. MISSING ONESIGNAL CONFIGURATION
// ============================================================================
Deno.test("17. OneSignal: fails closed when configuration is missing in live mode", async () => {
  const candidate: NotificationCandidate = {
    notificationKey: `${USER_A}:academic:e1:DUE_TODAY:2026-10-15`,
    userId: USER_A,
    eventId: "e1",
    ruleCode: "DUE_TODAY",
    targetDate: "2026-10-15",
    source: "academic_event",
    title: "Today",
    body: "Due today",
  };

  const res = await sendOneSignalPush({ appId: "", restApiKey: "" }, candidate);
  assertEquals(res.success, false);
  assert(res.error?.includes("Missing OneSignal credentials"));
});

// ============================================================================
// 18. EMPTY USER SET
// ============================================================================
Deno.test("18. Orchestration: empty user set returns 200 with 0 evaluated", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOCK_CRON_SECRET}`,
    },
    body: JSON.stringify({ dryRun: true }),
  });

  const mockSupabase = {
    auth: { admin: { listUsers: () => Promise.resolve({ data: { users: [] }, error: null }) } },
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  };

  const res = await handleNotificationRequest(req, {
    env: {
      get: (k) =>
        k === "CRON_SECRET"
          ? MOCK_CRON_SECRET
          : k === "SUPABASE_URL"
          ? "https://example.supabase.co"
          : k === "SUPABASE_SERVICE_ROLE_KEY"
          ? MOCK_SERVICE_ROLE_KEY
          : undefined,
    },
    // deno-lint-ignore no-explicit-any
    supabase: mockSupabase as any,
  });

  assertEquals(res.status, 200);
  const summary = await res.json();
  assertEquals(summary.ok, true);
  assertEquals(summary.usersCount, 0);
  assertEquals(summary.evaluated, 0);
});

// ============================================================================
// 19. EMPTY CANDIDATE SET
// ============================================================================
Deno.test("19. Orchestration: user with no deadlines in horizon produces 0 candidates", async () => {
  const req = new Request("http://localhost/deadline-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOCK_CRON_SECRET}`,
    },
    // Reference date in future when no canonical events occur
    body: JSON.stringify({ dryRun: true, userId: USER_A, targetDate: "2027-06-01" }),
  });

  const mockSupabase = {
    auth: {
      admin: {
        listUsers: () => Promise.resolve({ data: { users: [{ id: USER_A }] }, error: null }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            not: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  };

  const res = await handleNotificationRequest(req, {
    env: {
      get: (k) =>
        k === "CRON_SECRET"
          ? MOCK_CRON_SECRET
          : k === "SUPABASE_URL"
          ? "https://example.supabase.co"
          : k === "SUPABASE_SERVICE_ROLE_KEY"
          ? MOCK_SERVICE_ROLE_KEY
          : undefined,
    },
    // deno-lint-ignore no-explicit-any
    supabase: mockSupabase as any,
  });

  assertEquals(res.status, 200);
  const summary = await res.json();
  assertEquals(summary.ok, true);
  assertEquals(summary.usersCount, 1);
  assertEquals(summary.evaluated, 0);
});

// ============================================================================
// 20. MULTIPLE USERS
// ============================================================================
Deno.test("20. Multi-User: evaluates multiple users independently with separate keys", () => {
  const keyA = generateNotificationKey(
    USER_A,
    "academic_event",
    "ev_1",
    "DUE_3_DAYS",
    "2026-10-18",
  );
  const keyB = generateNotificationKey(
    USER_B,
    "academic_event",
    "ev_1",
    "DUE_3_DAYS",
    "2026-10-18",
  );

  assert(keyA !== keyB);
  assert(keyA.startsWith(USER_A));
  assert(keyB.startsWith(USER_B));
});

// ============================================================================
// 21. MULTIPLE EVENTS FOR ONE USER
// ============================================================================
Deno.test("21. Multi-Event: single user with multiple events generates unique candidate keys", () => {
  const events = getUpcomingCanonicalEvents(USER_A, "2026-10-15");
  assert(events.length > 1);

  const keys = new Set<string>();
  for (const ev of events) {
    const candidate = evaluateEventRule(ev, "2026-10-15");
    if (candidate) {
      assert(!keys.has(candidate.notificationKey));
      keys.add(candidate.notificationKey);
    }
  }
  assert(keys.size > 0);
});

// ============================================================================
// 22. MULTIPLE RULES FOR ONE EVENT
// ============================================================================
Deno.test("22. Multi-Rule: single event transitioning through 7->3->1->0 produces distinct keys", () => {
  const baseEvent: NotificationEvent = {
    eventId: "end_term_exam",
    userId: USER_A,
    title: "End Term Exam",
    targetDate: "2026-11-29",
    source: "academic_event",
    category: "exam",
  };

  const cand7 = evaluateEventRule(baseEvent, "2026-11-22");
  const cand3 = evaluateEventRule(baseEvent, "2026-11-26");
  const cand1 = evaluateEventRule(baseEvent, "2026-11-28");
  const cand0 = evaluateEventRule(baseEvent, "2026-11-29");

  assert(cand7 && cand3 && cand1 && cand0);
  const key7 = cand7.notificationKey;
  const key3 = cand3.notificationKey;
  const key1 = cand1.notificationKey;
  const key0 = cand0.notificationKey;
  assert(key7.includes(":DUE_7_DAYS:"));
  assert(key3.includes(":DUE_3_DAYS:"));
  assert(key1.includes(":DUE_1_DAY:"));
  assert(key0.includes(":DUE_TODAY:"));
  assert(new Set([key7, key3, key1, key0]).size === 4);
});

// ============================================================================
// 23. GENERATED CANONICAL EVENT ARTIFACT CONSISTENCY
// ============================================================================
Deno.test("23. Artifact: CANONICAL_EDGE_EVENTS contains 51 events with valid dates", () => {
  assertEquals(CANONICAL_EDGE_EVENTS.length, 51);
  for (const ev of CANONICAL_EDGE_EVENTS) {
    assert(ev.id.length > 0);
    assert(ev.title.length > 0);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(ev.date));
  }
});
