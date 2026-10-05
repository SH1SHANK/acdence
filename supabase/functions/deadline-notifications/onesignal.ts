// ============================================================================
// ONESIGNAL REST API DISPATCH ENGINE
// ============================================================================

import type { NotificationCandidate, OneSignalPushResult } from "./types.ts";

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

export interface OneSignalConfig {
  appId: string;
  restApiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
}

interface OneSignalApiResponse {
  id?: string;
  errors?: string[] | Record<string, unknown> | string;
  [key: string]: unknown;
}

/**
 * Truncates raw error messages to prevent storing arbitrarily large HTML or stack traces.
 */
function sanitizeErrorMessage(raw: string, maxLength = 500): string {
  const trimmed = raw.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}

/**
 * Dispatches a Web Push notification through the OneSignal REST API v1
 * targeting the recipient user via `include_aliases.external_id = [userId]`.
 * Automatically retries transient upstream failures (429, 5xx, or network abort).
 */
export async function sendOneSignalPush(
  config: OneSignalConfig,
  candidate: NotificationCandidate,
): Promise<OneSignalPushResult> {
  const { appId, restApiKey } = config;

  if (!appId || !restApiKey) {
    return {
      success: false,
      error: "Missing OneSignal credentials (ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY)",
    };
  }

  const payload = {
    app_id: appId,
    target_channel: "push",
    include_aliases: {
      external_id: [candidate.userId],
    },
    headings: {
      en: candidate.title,
    },
    contents: {
      en: candidate.body,
    },
    url: candidate.url,
    web_buttons: candidate.url
      ? [
        {
          id: "open_app",
          text: "Open Acdence",
          url: candidate.url,
        },
      ]
      : undefined,
    data: {
      notification_key: candidate.notificationKey,
      event_id: candidate.eventId,
      rule_code: candidate.ruleCode,
      target_date: candidate.targetDate,
      source: candidate.source,
    },
    priority: 10,
  };

  const timeoutMs = config.timeoutMs ?? 10000;
  const maxRetries = config.maxRetries ?? 0;
  const backoffMs = config.backoffMs ?? 300;

  let lastResult: OneSignalPushResult = {
    success: false,
    transient: true,
    error: "Unknown dispatch error",
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(ONESIGNAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${restApiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const responseText = await response.text();
      let data: OneSignalApiResponse = {};
      try {
        data = JSON.parse(responseText) as OneSignalApiResponse;
      } catch {
        data = { errors: responseText };
      }

      if (!response.ok) {
        const isTransient = response.status === 429 || response.status >= 500;
        const rawErrorMsg = data?.errors && Array.isArray(data.errors)
          ? data.errors.join("; ")
          : typeof data?.errors === "object"
          ? JSON.stringify(data.errors)
          : typeof data?.errors === "string"
          ? data.errors
          : `HTTP ${response.status}: ${response.statusText}`;

        lastResult = {
          success: false,
          transient: isTransient,
          error: sanitizeErrorMessage(rawErrorMsg),
        };

        if (isTransient && attempt < maxRetries) {
          continue;
        }
        return lastResult;
      }

      // OneSignal returns 200 with id if created
      const notificationId = data?.id;
      if (
        notificationId && typeof notificationId === "string" &&
        notificationId.length > 0
      ) {
        return {
          success: true,
          messageId: notificationId,
        };
      }

      // HTTP 200 but id is empty/null -> No active subscriptions for this external_id
      const errors = data?.errors;
      const errorStr = errors
        ? Array.isArray(errors)
          ? errors.join("; ")
          : typeof errors === "object"
          ? JSON.stringify(errors)
          : String(errors)
        : "No active push subscriptions found for user";

      return {
        success: false,
        noSubscribers: true,
        error: sanitizeErrorMessage(errorStr),
      };
    } catch (err: unknown) {
      const isTimeout = (err instanceof Error && err.name === "TimeoutError") ||
        (err instanceof DOMException && err.name === "TimeoutError");
      const message = isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : err instanceof Error
        ? err.message
        : String(err);

      lastResult = {
        success: false,
        transient: true,
        error: sanitizeErrorMessage(`Network or fetch error: ${message}`),
      };

      if (attempt < maxRetries) {
        continue;
      }
      return lastResult;
    }
  }

  return lastResult;
}
