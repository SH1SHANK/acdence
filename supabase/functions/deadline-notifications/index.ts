// ============================================================================
// SUPABASE EDGE FUNCTION: DEADLINE NOTIFICATIONS
// ============================================================================
// Evaluates canonical academic deadlines and user-created tasks.
// Claims atomic leases using claim_notification_delivery RPC and dispatches
// push notifications via OneSignal REST API v1.
//
// Triggered by:
//   - pg_cron (recurring 15-minute schedule) via pg_net
//   - Manual testing / staging invocations with Authorization: Bearer <CRON_SECRET>
// ============================================================================

// Ambient typing for environments outside Deno CLI
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ACADEMIC_TIMEZONE, evaluateEventRule, getTodayIST } from "./rules.ts";
import { getUpcomingCanonicalEvents, getUpcomingUserTasks } from "./events.ts";
import { claimDelivery, finalizeDelivery } from "./delivery.ts";
import { type OneSignalConfig, sendOneSignalPush } from "./onesignal.ts";
import type {
  EvaluationItemResult,
  EvaluationSummary,
  NotificationCandidate,
  NotificationEvent,
} from "./types.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export interface RequestBody {
  dryRun?: boolean;
  userId?: string;
  targetDate?: string;
  source?: string;
  triggered_at?: string;
}

export interface HandlerDependencies {
  env?: { get: (key: string) => string | undefined };
  supabase?: SupabaseClient;
  sendPush?: (
    config: OneSignalConfig,
    candidate: NotificationCandidate,
  ) => Promise<import("./types.ts").OneSignalPushResult>;
}

export async function handleNotificationRequest(
  req: Request,
  deps?: HandlerDependencies,
): Promise<Response> {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const envGetter = deps?.env ?? Deno.env;

  console.log(
    `[deadline-notifications] Notification evaluation triggered at ${new Date().toISOString()}`,
  );

  try {
    // 2. Initialize Supabase Admin Client
    const supabaseUrl = envGetter.get("SUPABASE_URL") || "";
    const serviceRoleKey = envGetter.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!deps?.supabase && (!supabaseUrl || !serviceRoleKey)) {
      console.error(
        "[deadline-notifications] Missing essential Supabase configuration",
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase: SupabaseClient = deps?.supabase ||
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

    // 3. Validate Server-to-Server Authorization
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized: Missing authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const expectedCronSecret = envGetter.get("CRON_SECRET") || "";

    // Require token to match either CRON_SECRET or service_role key
    const isAuthorized = (expectedCronSecret && token === expectedCronSecret) ||
      (serviceRoleKey && token === serviceRoleKey);

    if (!isAuthorized) {
      console.warn("[deadline-notifications] Unauthorized invocation attempt");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized: Invalid authorization token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Parse Request Options
    let reqBody: RequestBody = {};
    if (req.method === "POST") {
      try {
        reqBody = (await req.json()) as RequestBody;
      } catch {
        reqBody = {};
      }
    }

    const dryRun = Boolean(reqBody.dryRun);
    const targetUserId = reqBody.userId ? String(reqBody.userId).trim() : null;
    const academicDate = reqBody.targetDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(reqBody.targetDate.slice(0, 10))
      ? reqBody.targetDate.slice(0, 10)
      : getTodayIST();

    console.log(
      `[deadline-notifications] Mode: ${
        dryRun ? "DRY_RUN" : "LIVE"
      }, Date: ${academicDate} (${ACADEMIC_TIMEZONE}), TargetUser: ${targetUserId || "ALL"}`,
    );

    // 5. OneSignal Server Configuration (Edge Function Secrets / Environment Variables)
    const oneSignalAppId = envGetter.get("ONESIGNAL_APP_ID") || "";
    const oneSignalRestApiKey = envGetter.get("ONESIGNAL_REST_API_KEY") || "";

    const oneSignalConfig: OneSignalConfig = {
      appId: oneSignalAppId,
      restApiKey: oneSignalRestApiKey,
    };

    if (!dryRun && (!oneSignalAppId || !oneSignalRestApiKey)) {
      console.error(
        "[deadline-notifications] Push provider configuration is incomplete",
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Push provider configuration is incomplete",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 6. Discover Users to Evaluate
    const userIds: string[] = [];
    if (targetUserId) {
      userIds.push(targetUserId);
    } else {
      // Discover active users from auth.users via admin API
      const { data: userData, error: userError } = await supabase.auth.admin
        .listUsers({
          page: 1,
          perPage: 100,
        });

      if (userError) {
        console.warn(
          "[deadline-notifications] Could not list auth users, falling back to user_settings:",
          userError.message,
        );
        const { data: settingsRows } = await supabase.from("user_settings")
          .select("id");
        if (settingsRows) {
          for (const row of settingsRows) {
            if (row.id) userIds.push(row.id);
          }
        }
      } else if (userData?.users && userData.users.length > 0) {
        for (const u of userData.users) {
          if (u.id) userIds.push(u.id);
        }
      } else {
        // Auth list returned 0 users, check user_settings
        const { data: settingsRows } = await supabase.from("user_settings")
          .select("id");
        if (settingsRows) {
          for (const row of settingsRows) {
            if (row.id) userIds.push(row.id);
          }
        }
      }
    }

    console.log(
      `[deadline-notifications] Found ${userIds.length} user(s) to evaluate`,
    );

    // 7. Evaluate Notification Candidates Across Users
    const allCandidates: NotificationCandidate[] = [];

    // Parallelize user tasks fetching across all discovered users
    const userTasksList = await Promise.all(
      userIds.map((uid) => getUpcomingUserTasks(supabase, uid, academicDate)),
    );

    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      // A. Canonical Academic Events in 0..7 days window
      const canonicalEvents = getUpcomingCanonicalEvents(uid, academicDate);

      // B. User-created Tasks in 0..7 days window
      const userTasks = userTasksList[i] || [];

      const combinedEvents: NotificationEvent[] = [
        ...canonicalEvents,
        ...userTasks,
      ];

      for (const ev of combinedEvents) {
        const candidate = evaluateEventRule(ev, academicDate);
        if (candidate) {
          allCandidates.push(candidate);
        }
      }
    }

    console.log(
      `[deadline-notifications] Discovered ${allCandidates.length} notification candidate(s)`,
    );

    // 8. Process Delivery Pipeline with Atomic Claims & Expected-Attempt Finalization
    let claimedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: EvaluationItemResult[] = [];
    const pushDispatcher = deps?.sendPush || sendOneSignalPush;

    for (const candidate of allCandidates) {
      if (dryRun) {
        skippedCount++;
        details.push({
          key: candidate.notificationKey,
          userId: candidate.userId,
          eventId: candidate.eventId,
          ruleCode: candidate.ruleCode,
          targetDate: candidate.targetDate,
          status: "preview",
          reason: "Dry run preview mode",
        });
        continue;
      }

      // Atomic Claim via Database RPC (5-minute lease, max 3 attempts)
      const claim = await claimDelivery(supabase, candidate);

      if (!claim.claimed) {
        skippedCount++;
        details.push({
          key: candidate.notificationKey,
          userId: candidate.userId,
          eventId: candidate.eventId,
          ruleCode: candidate.ruleCode,
          targetDate: candidate.targetDate,
          status: "skipped",
          reason: claim.reason || claim.currentStatus,
        });
        continue;
      }

      claimedCount++;

      // Dispatch to OneSignal REST API v1
      const pushRes = await pushDispatcher(oneSignalConfig, candidate);

      if (pushRes.success) {
        sentCount++;
        await finalizeDelivery(
          supabase,
          claim.deliveryId,
          true,
          pushRes.messageId,
          null,
          claim.attempt,
        );

        details.push({
          key: candidate.notificationKey,
          userId: candidate.userId,
          eventId: candidate.eventId,
          ruleCode: candidate.ruleCode,
          targetDate: candidate.targetDate,
          status: "sent",
          providerMessageId: pushRes.messageId,
        });
      } else {
        failedCount++;
        const errorMessage = pushRes.error || "Push dispatch failure";

        await finalizeDelivery(
          supabase,
          claim.deliveryId,
          false,
          null,
          errorMessage,
          claim.attempt,
        );

        details.push({
          key: candidate.notificationKey,
          userId: candidate.userId,
          eventId: candidate.eventId,
          ruleCode: candidate.ruleCode,
          targetDate: candidate.targetDate,
          status: "failed",
          reason: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[deadline-notifications] Completed in ${durationMs}ms: ${allCandidates.length} evaluated, ${claimedCount} claimed, ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed`,
    );

    const summary: EvaluationSummary = {
      ok: true,
      academicDate,
      timezone: ACADEMIC_TIMEZONE,
      usersCount: userIds.length,
      evaluated: allCandidates.length,
      claimed: claimedCount,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      details,
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error(
      "[deadline-notifications] Fatal execution error:",
      error instanceof Error ? error.message : "Internal error",
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error during notification evaluation",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Start HTTP Server
Deno.serve((req: Request) => handleNotificationRequest(req));
