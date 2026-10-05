// ============================================================================
// NOTIFICATION ENGINE DATA TYPES & INTERFACES
// ============================================================================

export type NotificationRuleCode =
  | "DUE_7_DAYS"
  | "DUE_3_DAYS"
  | "DUE_1_DAY"
  | "DUE_TODAY";

export type NotificationSource = "academic_event" | "semester_task";

export type NotificationCategory =
  | "exam"
  | "assignment"
  | "cutoff"
  | "task"
  | "milestone";

export interface NotificationEvent {
  eventId: string;
  userId: string;
  title: string;
  courseCode?: string;
  targetDate: string; // YYYY-MM-DD (Asia/Kolkata timezone)
  source: NotificationSource;
  category: NotificationCategory;
  isHardCutoff?: boolean;
  description?: string;
  url?: string;
}

export interface NotificationCandidate {
  notificationKey: string;
  userId: string;
  eventId: string;
  ruleCode: NotificationRuleCode;
  targetDate: string;
  source: NotificationSource;
  title: string;
  body: string;
  url?: string;
}

export interface ClaimResult {
  claimed: boolean;
  deliveryId: string;
  attempt: number;
  currentStatus: string;
  reason: string;
}

export interface OneSignalPushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  noSubscribers?: boolean;
  transient?: boolean;
}

export interface EvaluationItemResult {
  key: string;
  userId: string;
  eventId: string;
  ruleCode: NotificationRuleCode;
  targetDate: string;
  status: "sent" | "skipped" | "failed" | "preview";
  reason?: string;
  providerMessageId?: string;
}

export interface EvaluationSummary {
  ok: boolean;
  academicDate: string;
  timezone: string;
  usersCount: number;
  evaluated: number;
  claimed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: EvaluationItemResult[];
}
