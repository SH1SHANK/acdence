// ============================================================================
// ATOMIC DELIVERY CLAIM & FINALIZATION RPC CLIENT
// ============================================================================

import type { ClaimResult, NotificationCandidate } from "./types.ts";

export interface DeliveryRpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) =>
    | PromiseLike<{ data: unknown; error: { message: string } | null }>
    | Promise<{ data: unknown; error: { message: string } | null }>;
}

interface ClaimRow {
  claimed: boolean;
  delivery_id: string;
  attempt: number;
  current_status: string;
  reason: string;
}

/**
 * Claims a notification delivery atomically via PostgreSQL FOR UPDATE row lock.
 * Enforces 5-minute lease and maximum 3 attempts.
 */
export async function claimDelivery(
  supabase: DeliveryRpcClient,
  candidate: NotificationCandidate,
  leaseDurationSeconds = 300,
  maxAttempts = 3,
): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("claim_notification_delivery", {
    p_user_id: candidate.userId,
    p_notification_key: candidate.notificationKey,
    p_event_id: candidate.eventId,
    p_rule_code: candidate.ruleCode,
    p_target_date: candidate.targetDate,
    p_lease_duration_seconds: leaseDurationSeconds,
    p_max_attempts: maxAttempts,
  });

  if (error) {
    console.error(
      `[delivery] claim RPC error for key ${candidate.notificationKey}:`,
      error,
    );
    return {
      claimed: false,
      deliveryId: "",
      attempt: 0,
      currentStatus: "error",
      reason: error.message || "Unknown error",
    };
  }

  // Data returned is an array of rows or single object
  const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | null;
  if (!row) {
    return {
      claimed: false,
      deliveryId: "",
      attempt: 0,
      currentStatus: "unknown",
      reason: "empty_claim_response",
    };
  }

  return {
    claimed: Boolean(row.claimed),
    deliveryId: row.delivery_id,
    attempt: Number(row.attempt),
    currentStatus: row.current_status,
    reason: row.reason,
  };
}

/**
 * Finalizes notification delivery status atomically.
 * Updates status to 'sent' or 'failed' and verifies expected_attempt to guard against stale workers.
 */
export async function finalizeDelivery(
  supabase: DeliveryRpcClient,
  deliveryId: string,
  success: boolean,
  providerMessageId?: string | null,
  errorMessage?: string | null,
  expectedAttempt?: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("finalize_notification_delivery", {
    p_delivery_id: deliveryId,
    p_success: success,
    p_provider_message_id: providerMessageId || null,
    p_error_message: errorMessage || null,
    p_expected_attempt: expectedAttempt !== undefined ? expectedAttempt : null,
  });

  if (error) {
    console.error(
      `[delivery] finalize RPC error for delivery ${deliveryId}:`,
      error,
    );
    return false;
  }

  return Boolean(data);
}
