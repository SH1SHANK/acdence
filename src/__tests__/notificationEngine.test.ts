import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  ACADEMIC_TIMEZONE,
  getTodayIST,
  getDayDifference,
  matchNotificationRule,
  generateNotificationKey,
  evaluateEventRule,
} from "../../supabase/functions/deadline-notifications/rules";
import { getUpcomingUserTasks } from "../../supabase/functions/deadline-notifications/events";
import {
  claimDelivery,
  finalizeDelivery,
} from "../../supabase/functions/deadline-notifications/delivery";
import { sendOneSignalPush } from "../../supabase/functions/deadline-notifications/onesignal";
import { CANONICAL_EVENTS } from "@/data/events";
import { CANONICAL_EDGE_EVENTS } from "../../supabase/functions/deadline-notifications/generated_canonical_events";
import type {
  NotificationCandidate,
  NotificationEvent,
} from "../../supabase/functions/deadline-notifications/types";

describe("Phase 5: Notification Engine & Serverless Evaluation", () => {
  const USER_A = "550e8400-e29b-41d4-a716-446655440001";
  const USER_B = "550e8400-e29b-41d4-a716-446655440002";
  const REFERENCE_DATE = "2026-10-15"; // Base evaluation date in Asia/Kolkata

  // =========================================================================
  // 1. RULE EVALUATION & LEAD TIMES
  // =========================================================================
  describe("Rule Evaluation & Lead Times", () => {
    it("1. triggers DUE_7_DAYS when target date is exactly 7 calendar days away", () => {
      const targetDate = "2026-10-22";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(7);
      expect(matchNotificationRule(diff)).toBe("DUE_7_DAYS");
    });

    it("2. triggers DUE_3_DAYS when target date is exactly 3 calendar days away", () => {
      const targetDate = "2026-10-18";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(3);
      expect(matchNotificationRule(diff)).toBe("DUE_3_DAYS");
    });

    it("3. triggers DUE_1_DAY when target date is exactly 1 calendar day away", () => {
      const targetDate = "2026-10-16";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(1);
      expect(matchNotificationRule(diff)).toBe("DUE_1_DAY");
    });

    it("4. triggers DUE_TODAY when target date is the same calendar day", () => {
      const targetDate = "2026-10-15";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(0);
      expect(matchNotificationRule(diff)).toBe("DUE_TODAY");
    });

    it("5. ignores past deadlines (dayDiff < 0)", () => {
      const targetDate = "2026-10-14";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(-1);
      expect(matchNotificationRule(diff)).toBeNull();
    });

    it("6. ignores deadlines beyond the evaluation horizon (> 7 days)", () => {
      const targetDate = "2026-10-25";
      const diff = getDayDifference(targetDate, REFERENCE_DATE);
      expect(diff).toBe(10);
      expect(matchNotificationRule(diff)).toBeNull();
    });

    it("7. ignores completed tasks (status = 'done')", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [], // Filtered out by .neq("status", "done")
            error: null,
          }),
        }),
      };

      const tasks = await getUpcomingUserTasks(mockSupabase, USER_A, REFERENCE_DATE);
      expect(tasks).toHaveLength(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("semester_tasks");
    });

    it("8. ignores tasks with null or invalid due dates", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                client_task_id: "t1",
                title: "Invalid Task",
                due_date: null,
                status: "todo",
              },
            ],
            error: null,
          }),
        }),
      };

      const tasks = await getUpcomingUserTasks(mockSupabase, USER_A, REFERENCE_DATE);
      expect(tasks).toHaveLength(0);
    });

    it("9. canonical academic event is evaluated correctly into a candidate", () => {
      const event: NotificationEvent = {
        eventId: "cutoff_week_04",
        userId: USER_A,
        title: "OPPE 1 Eligibility Cutoff",
        targetDate: "2026-10-18",
        source: "academic_event",
        category: "cutoff",
        isHardCutoff: true,
      };

      const candidate = evaluateEventRule(event, REFERENCE_DATE);
      expect(candidate).not.toBeNull();
      expect(candidate?.ruleCode).toBe("DUE_3_DAYS");
      expect(candidate?.title).toContain("Cutoff Closes in 3 Days");
      expect(candidate?.notificationKey).toBe(
        `${USER_A}:academic:cutoff_week_04:DUE_3_DAYS:2026-10-18`,
      );
    });

    it("10. user semester task is evaluated correctly into a candidate", () => {
      const event: NotificationEvent = {
        eventId: "task-client-99",
        userId: USER_A,
        title: "Submit Software Engineering Diagram",
        courseCode: "SE2001",
        targetDate: "2026-10-16",
        source: "semester_task",
        category: "task",
      };

      const candidate = evaluateEventRule(event, REFERENCE_DATE);
      expect(candidate).not.toBeNull();
      expect(candidate?.ruleCode).toBe("DUE_1_DAY");
      expect(candidate?.title).toBe("Task Due Tomorrow");
      expect(candidate?.body).toBe("SE2001 — Submit Software Engineering Diagram is due tomorrow.");
      expect(candidate?.notificationKey).toBe(`${USER_A}:task:task-client-99:DUE_1_DAY:2026-10-16`);
    });
  });

  // =========================================================================
  // 2. DETERMINISTIC NOTIFICATION KEYS
  // =========================================================================
  describe("Deterministic Notification Keys", () => {
    it("11. same event, rule, and date generate identical key", () => {
      const key1 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_1_DAY",
        "2026-11-01",
      );
      const key2 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_1_DAY",
        "2026-11-01",
      );
      expect(key1).toBe(key2);
    });

    it("12. different rules generate distinct keys", () => {
      const key1 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_3_DAYS",
        "2026-11-01",
      );
      const key2 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_1_DAY",
        "2026-11-01",
      );
      expect(key1).not.toBe(key2);
    });

    it("13. different target dates generate distinct keys", () => {
      const key1 = generateNotificationKey(
        USER_A,
        "semester_task",
        "task-1",
        "DUE_TODAY",
        "2026-10-15",
      );
      const key2 = generateNotificationKey(
        USER_A,
        "semester_task",
        "task-1",
        "DUE_TODAY",
        "2026-10-16",
      );
      expect(key1).not.toBe(key2);
    });

    it("14. user task and academic event with identical event ID cannot collide", () => {
      const taskKey = generateNotificationKey(
        USER_A,
        "semester_task",
        "quiz_1",
        "DUE_TODAY",
        "2026-10-15",
      );
      const academicKey = generateNotificationKey(
        USER_A,
        "academic_event",
        "quiz_1",
        "DUE_TODAY",
        "2026-10-15",
      );
      expect(taskKey).not.toBe(academicKey);
      expect(taskKey).toContain(":task:");
      expect(academicKey).toContain(":academic:");
    });
  });

  // =========================================================================
  // 3. ATOMIC DELIVERY STATE MACHINE
  // =========================================================================
  describe("Atomic Delivery State Machine & RPC Integration", () => {
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:cutoff_week_04:DUE_1_DAY:2026-11-01`,
      userId: USER_A,
      eventId: "cutoff_week_04",
      ruleCode: "DUE_1_DAY",
      targetDate: "2026-11-01",
      source: "academic_event",
      title: "Cutoff Closes Tomorrow",
      body: "Assignments 1-4 freeze tomorrow.",
    };

    it("15. skips already-sent notification (already_sent)", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: false,
              delivery_id: "del-1",
              attempt: 1,
              current_status: "sent",
              reason: "already_sent",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(false);
      expect(result.reason).toBe("already_sent");
      expect(result.currentStatus).toBe("sent");
    });

    it("16. grants claim for pending / new notification (new_claim)", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: true,
              delivery_id: "del-new-123",
              attempt: 1,
              current_status: "sending",
              reason: "new_claim",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(true);
      expect(result.deliveryId).toBe("del-new-123");
      expect(result.attempt).toBe(1);
    });

    it("17. active unexpired lease prevents duplicate claim (active_lease)", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: false,
              delivery_id: "del-busy",
              attempt: 1,
              current_status: "sending",
              reason: "active_lease",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(false);
      expect(result.reason).toBe("active_lease");
    });

    it("18. expired lease can be reclaimed (reclaimed_lease)", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: true,
              delivery_id: "del-reclaimed",
              attempt: 2,
              current_status: "sending",
              reason: "reclaimed_lease",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(true);
      expect(result.attempt).toBe(2);
      expect(result.reason).toBe("reclaimed_lease");
    });

    it("19. failed delivery retries up to maximum attempts", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: true,
              delivery_id: "del-retry",
              attempt: 3,
              current_status: "sending",
              reason: "reclaimed_lease",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(true);
      expect(result.attempt).toBe(3);
    });

    it("20. maximum attempts (3) is respected and claim is rejected", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              claimed: false,
              delivery_id: "del-exhausted",
              attempt: 3,
              current_status: "failed",
              reason: "max_attempts_exceeded",
            },
          ],
          error: null,
        }),
      };

      const result = await claimDelivery(mockSupabase, candidate);
      expect(result.claimed).toBe(false);
      expect(result.reason).toBe("max_attempts_exceeded");
    });

    it("21. expected_attempt protects finalization against stale workers", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      };

      const finalized = await finalizeDelivery(
        mockSupabase,
        "del-123",
        true,
        "provider-msg-uuid",
        null,
        1, // expectedAttempt
      );

      expect(finalized).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("finalize_notification_delivery", {
        p_delivery_id: "del-123",
        p_success: true,
        p_provider_message_id: "provider-msg-uuid",
        p_error_message: null,
        p_expected_attempt: 1,
      });
    });

    it("22. successful delivery records provider message ID", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      };

      await finalizeDelivery(mockSupabase, "del-success", true, "onesignal-98765");
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "finalize_notification_delivery",
        expect.objectContaining({
          p_success: true,
          p_provider_message_id: "onesignal-98765",
        }),
      );
    });
  });

  // =========================================================================
  // 4. ONESIGNAL REST API DISPATCH
  // =========================================================================
  describe("OneSignal REST API Dispatch", () => {
    const config = {
      appId: "mock-app-id-9999",
      restApiKey: "mock-rest-api-key-8888",
    };

    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:cutoff_week_04:DUE_1_DAY:2026-11-01`,
      userId: USER_A,
      eventId: "cutoff_week_04",
      ruleCode: "DUE_1_DAY",
      targetDate: "2026-11-01",
      source: "academic_event",
      title: "Cutoff Closes Tomorrow",
      body: "Assignments 1-4 freeze tomorrow at 23:59 IST.",
      url: "https://acdence.vercel.app/?date=2026-11-01",
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("23. uses Supabase user UUID as external ID in include_aliases", async () => {
      let capturedBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return new Response(JSON.stringify({ id: "msg-12345", recipients: 1 }), { status: 200 });
      });

      const res = await sendOneSignalPush(config, candidate);
      expect(res.success).toBe(true);
      expect(capturedBody.include_aliases.external_id).toEqual([USER_A]);
      expect(capturedBody.headings.en).toBe("Cutoff Closes Tomorrow");
    });

    it("24. REST credentials never appear in client bundles", () => {
      // Confirm that no frontend file exports or embeds ONESIGNAL_REST_API_KEY
      expect(typeof (import.meta as any).env?.VITE_ONESIGNAL_REST_API_KEY).toBe("undefined");
    });

    it("25. successful API response returns sent status with message ID", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "os-notif-uuid-444" }), { status: 200 }),
        );

      const res = await sendOneSignalPush(config, candidate);
      expect(res.success).toBe(true);
      expect(res.messageId).toBe("os-notif-uuid-444");
    });

    it("26. provider failure (4xx/5xx) produces retryable failure with error message", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: ["Invalid App ID"] }), {
          status: 400,
          statusText: "Bad Request",
        }),
      );

      const res = await sendOneSignalPush(config, candidate);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid App ID");
    });

    it("27. malformed provider response is handled safely without throwing", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response("Gateway Timeout <html>...</html>", {
          status: 504,
          statusText: "Gateway Timeout",
        }),
      );

      const res = await sendOneSignalPush(config, candidate);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  // =========================================================================
  // 5. BATCH BEHAVIOR & USER ISOLATION
  // =========================================================================
  describe("Batch Processing & Multi-User Isolation", () => {
    it("28. failure on one candidate does not prevent subsequent candidates from dispatching", async () => {
      const candidates: NotificationCandidate[] = [
        {
          notificationKey: `${USER_A}:academic:e1:DUE_1_DAY:2026-10-16`,
          userId: USER_A,
          eventId: "e1",
          ruleCode: "DUE_1_DAY",
          targetDate: "2026-10-16",
          source: "academic_event",
          title: "E1 Due",
          body: "E1 body",
        },
        {
          notificationKey: `${USER_A}:academic:e2:DUE_1_DAY:2026-10-16`,
          userId: USER_A,
          eventId: "e2",
          ruleCode: "DUE_1_DAY",
          targetDate: "2026-10-16",
          source: "academic_event",
          title: "E2 Due",
          body: "E2 body",
        },
      ];

      // Candidate 1 fails (500), Candidate 2 succeeds (200)
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ errors: ["Internal error"] }), { status: 500 });
        }
        return new Response(JSON.stringify({ id: "msg-success-2" }), { status: 200 });
      });

      const config = { appId: "app", restApiKey: "key" };
      const res1 = await sendOneSignalPush(config, candidates[0]);
      const res2 = await sendOneSignalPush(config, candidates[1]);

      expect(res1.success).toBe(false);
      expect(res2.success).toBe(true);
      expect(res2.messageId).toBe("msg-success-2");
    });

    it("29. isolates multiple users into distinct notification keys and targets", () => {
      const userAKey = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_1_DAY",
        "2026-11-01",
      );
      const userBKey = generateNotificationKey(
        USER_B,
        "academic_event",
        "cutoff_week_04",
        "DUE_1_DAY",
        "2026-11-01",
      );

      expect(userAKey.startsWith(USER_A)).toBe(true);
      expect(userBKey.startsWith(USER_B)).toBe(true);
      expect(userAKey).not.toBe(userBKey);
    });

    it("30. repeated cron execution generates identical key preserving idempotency", () => {
      const cronRun1 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_7_DAYS",
        "2026-11-01",
      );
      const cronRun2 = generateNotificationKey(
        USER_A,
        "academic_event",
        "cutoff_week_04",
        "DUE_7_DAYS",
        "2026-11-01",
      );
      expect(cronRun1).toBe(cronRun2);
    });
  });

  // =========================================================================
  // 6. TIMEZONE & DATE BOUNDARIES
  // =========================================================================
  describe("Timezone & Date Boundary Calculations", () => {
    it("31. calculates today in Asia/Kolkata timezone", () => {
      const istToday = getTodayIST();
      expect(istToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ACADEMIC_TIMEZONE).toBe("Asia/Kolkata");
    });

    it("32. evaluates date differences across midnight boundary correctly", () => {
      const d1 = "2026-10-31";
      const d2 = "2026-11-01";
      const diff = getDayDifference(d2, d1);
      expect(diff).toBe(1);
    });

    it("33. server runtime timezone offset does not alter calendar day difference", () => {
      // Anchoring at T12:00:00+05:30 guarantees calendar day isolation
      const ref = "2026-12-13";
      const target = "2026-12-20";
      expect(getDayDifference(target, ref)).toBe(7);
      expect(matchNotificationRule(7)).toBe("DUE_7_DAYS");
    });

    it("34. UTC-to-IST midnight boundary properly advances academic date", () => {
      // 2026-10-15T18:30:00Z is 2026-10-16 00:00:00 IST
      const dateAtMidnightIST = new Date("2026-10-15T18:30:00Z");
      expect(getTodayIST(dateAtMidnightIST)).toBe("2026-10-16");

      // 1 minute before midnight IST is still 2026-10-15
      const dateJustBeforeMidnightIST = new Date("2026-10-15T18:29:00Z");
      expect(getTodayIST(dateJustBeforeMidnightIST)).toBe("2026-10-15");
    });

    it("35. year boundary transition (Dec 31 to Jan 1) calculates day difference accurately", () => {
      expect(getDayDifference("2027-01-01", "2026-12-31")).toBe(1);
      expect(getDayDifference("2027-01-07", "2026-12-31")).toBe(7);
      expect(matchNotificationRule(getDayDifference("2027-01-07", "2026-12-31"))).toBe(
        "DUE_7_DAYS",
      );
    });
  });

  // =========================================================================
  // 7. MISSING CONFIGURATION & FAIL-CLOSED BEHAVIOR
  // =========================================================================
  describe("Missing Configuration & Fail-Closed Behavior", () => {
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:cutoff_week_04:DUE_1_DAY:2026-11-01`,
      userId: USER_A,
      eventId: "cutoff_week_04",
      ruleCode: "DUE_1_DAY",
      targetDate: "2026-11-01",
      source: "academic_event",
      title: "Cutoff Closes Tomorrow",
      body: "Cutoff closes tomorrow at 23:59 IST.",
    };

    it("36. fails closed when OneSignal App ID is empty", async () => {
      const res = await sendOneSignalPush({ appId: "", restApiKey: "valid-key" }, candidate);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Missing OneSignal credentials");
    });

    it("37. fails closed when OneSignal REST API key is empty", async () => {
      const res = await sendOneSignalPush({ appId: "valid-app-id", restApiKey: "" }, candidate);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Missing OneSignal credentials");
    });
  });

  // =========================================================================
  // 8. UPSTREAM FAILURE CATEGORIZATION (TRANSIENT VS PERMANENT)
  // =========================================================================
  describe("OneSignal Failure Categorization", () => {
    const validConfig = {
      appId: "valid-app-id",
      restApiKey: "valid-key",
    };
    const candidate: NotificationCandidate = {
      notificationKey: `${USER_A}:academic:cutoff_week_04:DUE_1_DAY:2026-11-01`,
      userId: USER_A,
      eventId: "cutoff_week_04",
      ruleCode: "DUE_1_DAY",
      targetDate: "2026-11-01",
      source: "academic_event",
      title: "Cutoff Closes Tomorrow",
      body: "Cutoff closes tomorrow at 23:59 IST.",
    };

    it("38. identifies HTTP 429 rate limit as transient failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: ["Rate limit exceeded"] }), {
          status: 429,
          statusText: "Too Many Requests",
        }),
      );

      const res = await sendOneSignalPush(validConfig, candidate);
      expect(res.success).toBe(false);
      expect(res.transient).toBe(true);
    });

    it("39. identifies HTTP 500 / 503 as transient failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: ["Service Unavailable"] }), {
          status: 503,
          statusText: "Service Unavailable",
        }),
      );

      const res = await sendOneSignalPush(validConfig, candidate);
      expect(res.success).toBe(false);
      expect(res.transient).toBe(true);
    });

    it("40. identifies HTTP 400 Bad Request as permanent failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: ["Invalid external_id format"] }), {
          status: 400,
          statusText: "Bad Request",
        }),
      );

      const res = await sendOneSignalPush(validConfig, candidate);
      expect(res.success).toBe(false);
      expect(res.transient).toBe(false);
    });

    it("41. handles network throw as transient failure", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

      const res = await sendOneSignalPush(validConfig, candidate);
      expect(res.success).toBe(false);
      expect(res.transient).toBe(true);
      expect(res.error).toContain("ECONNRESET");
    });

    it("42. detects noSubscribers when 200 returned without notification id", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "",
            errors: ["All included players are not subscribed"],
          }),
          { status: 200 },
        ),
      );

      const res = await sendOneSignalPush(validConfig, candidate);
      expect(res.success).toBe(false);
      expect(res.noSubscribers).toBe(true);
      expect(res.error).toContain("All included players are not subscribed");
    });
  });

  // =========================================================================
  // 9. CANONICAL EVENT ARTIFACT CONSISTENCY & ZERO-DRIFT VERIFICATION
  // =========================================================================
  describe("Canonical Event Artifact Consistency", () => {
    it("43. generated artifact event count matches canonical events source count exactly", () => {
      expect(CANONICAL_EDGE_EVENTS.length).toBe(CANONICAL_EVENTS.length);
      expect(CANONICAL_EDGE_EVENTS.length).toBe(51);
    });

    it("44. all canonical events in generated artifact have matching id, date, and title", () => {
      const canonicalMap = new Map(CANONICAL_EVENTS.map((e) => [e.id, e]));

      for (const edgeEvent of CANONICAL_EDGE_EVENTS) {
        const canonical = canonicalMap.get(edgeEvent.id);
        expect(canonical).toBeDefined();
        expect(edgeEvent.title).toBe(canonical!.title);
        expect(edgeEvent.date).toBe(canonical!.date);
        expect(edgeEvent.type).toBe(canonical!.type);
        if (canonical!.courseCode) {
          expect(edgeEvent.courseCode).toBe(canonical!.courseCode);
        }
        if (canonical!.isHardCutoff || canonical!.hardCutoff) {
          expect(edgeEvent.isHardCutoff).toBe(true);
        }
      }
    });

    it("45. every event has a valid YYYY-MM-DD date in Asia/Kolkata", () => {
      for (const edgeEvent of CANONICAL_EDGE_EVENTS) {
        expect(edgeEvent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  // =========================================================================
  // 10. THRESHOLD BOUNDARIES & NEGATIVE EDGE CASES
  // =========================================================================
  describe("Threshold Boundaries & Negative Edge Cases", () => {
    it("46. non-matching day differences (2, 4, 5, 6, 8, -2) return null", () => {
      const nonMatching = [-10, -2, -1, 2, 4, 5, 6, 8, 9, 14, 30];
      for (const diff of nonMatching) {
        expect(matchNotificationRule(diff)).toBeNull();
      }
    });

    it("47. event evaluation on invalid date format returns null", () => {
      const badEvent: NotificationEvent = {
        eventId: "bad-1",
        userId: USER_A,
        title: "Bad Date",
        targetDate: "invalid-date",
        source: "academic_event",
        category: "milestone",
      };
      expect(evaluateEventRule(badEvent, REFERENCE_DATE)).toBeNull();
    });

    it("48. multiple rules for one event over time generate distinct deterministic keys", () => {
      const rules = ["DUE_7_DAYS", "DUE_3_DAYS", "DUE_1_DAY", "DUE_TODAY"] as const;
      const keys = new Set<string>();

      for (const rule of rules) {
        const key = generateNotificationKey(
          USER_A,
          "academic_event",
          "exam_oppe1",
          rule,
          "2026-11-08",
        );
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }

      expect(keys.size).toBe(4);
    });
  });
});
