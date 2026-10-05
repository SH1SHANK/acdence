/**
 * Canonical Date & Time utilities
 * Configured for Asia/Kolkata (IST) time zone
 */

const TIME_ZONE = "Asia/Kolkata";

export function formatAcademicDate(dateStr: string, includeYear = false): string {
  const date = new Date(`${dateStr.slice(0, 10)}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function formatDaysRemaining(targetDate: string, referenceDate: string): string {
  const target = new Date(`${targetDate.slice(0, 10)}T12:00:00+05:30`);
  const reference = new Date(`${referenceDate.slice(0, 10)}T12:00:00+05:30`);
  const days = Math.round((target.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day remaining";
  if (days > 1) return `${days} days remaining`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata timezone
 */
export function getTodayIST(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Formats date and time in Asia/Kolkata
 */
export function getLiveISTParts(date: Date = new Date()): {
  dayName: string;
  dayNum: string;
  monthName: string;
  year: string;
  timeString: string;
  timeWithSeconds: string;
} {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  })
    .format(date)
    .toUpperCase();

  const dayNum = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    day: "2-digit",
  }).format(date);

  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
  })
    .format(date)
    .toUpperCase();

  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
  }).format(date);

  const timeString = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  const timeWithSeconds = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return {
    dayName,
    dayNum,
    monthName,
    year,
    timeString,
    timeWithSeconds,
  };
}

/**
 * Formats live clock string, e.g. "SAT · 19 SEP 2026 · 12:45:10 AM IST"
 */
export function formatLiveISTString(
  date: Date = new Date(),
  includeSeconds: boolean = true,
): string {
  const parts = getLiveISTParts(date);
  const time = includeSeconds ? parts.timeWithSeconds : parts.timeString;
  return `${parts.dayName} · ${parts.dayNum} ${parts.monthName} ${parts.year} · ${time} IST`;
}

/**
 * Formats relative time from a reference timestamp
 * e.g., "just now", "10m ago", "2h ago", "3d ago", "Due today", "3d left", "Overdue by 2d"
 */
export function formatRelativeTime(
  targetDate: string | Date,
  referenceDate: string | Date = new Date(),
): string {
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;

  // If targetDate is YYYY-MM-DD string without time, treat as end-of-day deadline or date comparison
  const isDateOnly =
    typeof targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim());

  if (isDateOnly) {
    const targetStr = typeof targetDate === "string" ? targetDate.trim() : getTodayIST(target);
    const refStr =
      typeof referenceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate.trim())
        ? referenceDate.trim()
        : getTodayIST(ref);

    if (targetStr === refStr) return "Due today";

    const targetTime = new Date(`${targetStr}T00:00:00+05:30`).getTime();
    const refTime = new Date(`${refStr}T00:00:00+05:30`).getTime();
    const diffDays = Math.round((targetTime - refTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1) return `${diffDays}d left`;
    if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)}d`;
  }

  // Full timestamp comparison
  const diffMs = target.getTime() - ref.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHours = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMs < 0) {
    // Past
    const absSec = Math.abs(diffSec);
    const absMin = Math.abs(diffMin);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);

    if (absSec < 45) return "just now";
    if (absMin < 60) return `${absMin}m ago`;
    if (absHours < 24) return `${absHours}h ago`;
    if (absDays < 30) return `${absDays}d ago`;
    return `${Math.round(absDays / 30)}mo ago`;
  } else {
    // Future
    if (diffSec < 45) return "in a few seconds";
    if (diffMin < 60) return `in ${diffMin}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays}d left`;
  }
}

/**
 * Returns an array of consecutive date strings (YYYY-MM-DD)
 * centered around centerDate.
 * Defaults to center with 3 days before and 4 days after (8 days total)
 */
export function getSurroundingDates(
  centerDateStr: string,
  daysBefore: number = 3,
  daysAfter: number = 4,
): string[] {
  const center = new Date(`${centerDateStr.slice(0, 10)}T12:00:00+05:30`);
  const dates: string[] = [];

  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(center.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(getTodayIST(d));
  }

  return dates;
}

/**
 * Returns parsed date components for UI rendering
 */
export function parseDateComponents(dateStr: string): {
  date: string;
  dayOfWeek: string;
  dayNum: number;
  month: string;
  year: number;
  isWeekend: boolean;
} {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00+05:30`);
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  })
    .format(d)
    .toUpperCase();

  const dayNum = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      day: "numeric",
    }).format(d),
    10,
  );

  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
  })
    .format(d)
    .toUpperCase();

  const year = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
    }).format(d),
    10,
  );

  const isWeekend = dayOfWeek === "SAT" || dayOfWeek === "SUN";

  return {
    date: dateStr.slice(0, 10),
    dayOfWeek,
    dayNum,
    month,
    year,
    isWeekend,
  };
}

/**
 * Formats date and optional time string into readable presentation format:
 * e.g. "Oct 30 · 11:59 PM IST"
 */
export function formatDisplayDateTime(dateStr: string, timeStr?: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00+05:30`);
  const month = d.toLocaleDateString("en-IN", {
    month: "short",
    timeZone: TIME_ZONE,
  });
  const day = d.toLocaleDateString("en-IN", {
    day: "numeric",
    timeZone: TIME_ZONE,
  });

  let timeFormatted = "11:59 PM IST";
  if (timeStr) {
    if (timeStr.includes("23:59") || timeStr.includes("11:59")) {
      timeFormatted = "11:59 PM IST";
    } else if (timeStr.includes("IST")) {
      timeFormatted = timeStr;
    } else {
      timeFormatted = `${timeStr} IST`;
    }
  }

  return `${month} ${day} · ${timeFormatted}`;
}
