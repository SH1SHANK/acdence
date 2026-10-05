import React, { useMemo } from "react";
import { Clock, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SemesterProgress, NextHardCutoffSummary } from "@/lib/selectors";
import type { NextImportantAction } from "@/lib/nextAction";
import type { CourseCode } from "@/types/course";
import { CANONICAL_EVENTS } from "@/data/events";
import { COURSES } from "@/data/courses";
import { formatAcademicDate, formatDaysRemaining, formatDisplayDateTime } from "@/lib/datetime";

interface AtAGlanceSectionProps {
  progress: SemesterProgress;
  action: NextImportantAction;
  nextCutoff: NextHardCutoffSummary;
  todayDate: string;
  onNavigateToCourse?: (code: CourseCode) => void;
  onNavigateToProject?: () => void;
  onNavigateToCalendar?: (eventId?: string) => void;
  onNavigateToDocs?: () => void;
}

function formatCountdown(days: number): string {
  if (days > 1) return `In ${days} days:`;
  if (days === 1) return "Tomorrow:";
  if (days === 0) return "Due today!";
  if (days === -1) return "1 day overdue:";
  return `${Math.abs(days)} days overdue:`;
}

export const AtAGlanceSection = React.memo<AtAGlanceSectionProps>(function AtAGlanceSection({
  progress,
  action,
  nextCutoff,
  todayDate,
  onNavigateToCourse,
  onNavigateToProject,
  onNavigateToCalendar,
  onNavigateToDocs,
}) {
  // =========================================================================
  // Zone 2 Logic: Merge Immediate Priority and Next Hard Cutoff into 1 Anchor
  // =========================================================================
  const isRegistrationPeriod =
    action.category === "registration" || nextCutoff.event?.cutoffType === "term_registration";

  let countdownDays: number;
  let titleText: string;
  let dateTimeText: string;
  let subtitleText: string;
  let isHardCutoff: boolean;
  let handleActionClick: () => void;

  if (isRegistrationPeriod && nextCutoff.event) {
    // Official term registration closes on Sep 23 23:59 IST
    countdownDays = nextCutoff.daysLeft ?? action.daysRemaining;
    titleText = "Course registration closes";
    dateTimeText = formatDisplayDateTime(nextCutoff.event.date, nextCutoff.event.time);
    subtitleText = "Keep course list, documents, and fee payment ready. Window closes irrevocably.";
    isHardCutoff = true;
    handleActionClick = () => onNavigateToDocs?.();
  } else if (
    nextCutoff.event &&
    nextCutoff.daysLeft !== null &&
    (nextCutoff.daysLeft <= action.daysRemaining || nextCutoff.daysLeft <= 7)
  ) {
    // Next hard eligibility gate is imminent or closer than standard action
    countdownDays = nextCutoff.daysLeft;
    titleText = nextCutoff.event.title;
    dateTimeText = formatDisplayDateTime(nextCutoff.event.date, nextCutoff.event.time);
    subtitleText = nextCutoff.event.description;
    isHardCutoff = true;
    handleActionClick = () => {
      if (nextCutoff.event?.courseCode) {
        onNavigateToCourse?.(nextCutoff.event.courseCode);
      } else {
        onNavigateToCalendar?.();
      }
    };
  } else {
    // Standard highest priority academic action
    countdownDays = action.daysRemaining;
    titleText = action.title;
    dateTimeText = formatDisplayDateTime(action.targetDate);
    subtitleText = action.subtitle;
    isHardCutoff = action.category === "cutoff";
    handleActionClick = () => {
      if (action.actionDestination === "registration") {
        onNavigateToDocs?.();
      } else if (action.actionDestination === "project") {
        onNavigateToProject?.();
      } else if (action.actionDestination === "course" && action.targetId) {
        onNavigateToCourse?.(action.targetId as CourseCode);
      } else {
        onNavigateToCalendar?.();
      }
    };
  }

  const countdownText = formatCountdown(countdownDays);
  const dueTodayAssignments = useMemo(() => {
    if (countdownDays !== 0 || action.category !== "assignment") return [];
    const hasAssignmentToday = CANONICAL_EVENTS.some(
      (event) => event.date === todayDate && event.type === "assignment",
    );
    if (!hasAssignmentToday) return [];

    return Object.values(COURSES)
      .filter((course) => course.type === "theory")
      .map((course) => course.name.replace("Programming Concepts using ", ""));
  }, [action.category, countdownDays, todayDate]);

  const nextAlerts = useMemo(() => {
    const excludedIds = new Set<string>();
    if (nextCutoff.event?.id) {
      excludedIds.add(nextCutoff.event.id);
    }
    if (action.id.startsWith("imminent_")) {
      excludedIds.add(action.id.replace("imminent_", ""));
    }
    if (action.id.startsWith("cutoff_")) {
      excludedIds.add(action.id.replace("cutoff_", ""));
    }
    if (isRegistrationPeriod) {
      CANONICAL_EVENTS.forEach((e) => {
        if (e.cutoffType === "term_registration" || e.id.includes("registration")) {
          excludedIds.add(e.id);
        }
      });
    }

    return CANONICAL_EVENTS.filter(
      (event) => event.date >= todayDate && !excludedIds.has(event.id) && event.title !== titleText,
    )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [todayDate, nextCutoff.event, action.id, isRegistrationPeriod, titleText]);

  return (
    <div className="w-full rounded-lg border border-border-default bg-surface-100 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border-default grid grid-cols-1 lg:grid-cols-12 shadow-xs">
      {/* ----------------------------------------------------------------- */}
      {/* Zone 1: SEMESTER (25% Width) — Compact, No repeated dates        */}
      {/* ----------------------------------------------------------------- */}
      <div className="lg:col-span-3 p-3.5 sm:p-5 flex flex-col justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-foreground-lighter font-mono">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5 text-brand" />
              Semester
            </span>
            <span className="font-semibold text-foreground font-mono tabular-nums">
              {progress.isPreSemester ? "0%" : `${progress.percentage}%`}
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-balance text-xl sm:text-2xl font-bold font-heading text-foreground">
              {progress.isPreSemester ? "Pre-Semester" : `Week ${progress.currentWeekNumber} of 12`}
            </div>
            <p className="text-pretty text-xs text-foreground-light mt-0.5 tabular-nums">
              {progress.isPreSemester
                ? "Term starts October 2"
                : `${progress.percentage}% complete`}
            </p>
          </div>
        </div>

        {/* Small, clean progress bar without repeated dates */}
        <div className="flex flex-col gap-1 pt-1">
          <Progress value={progress.isPreSemester ? 0 : progress.percentage} className="h-1.5" />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Zone 2: NEXT IMPORTANT (50% Width) — Dominant Focal Point         */}
      {/* ----------------------------------------------------------------- */}
      <div className="lg:col-span-6 p-3.5 sm:p-5 flex flex-col justify-between gap-3 bg-surface-100">
        {/* Zone Header */}
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider font-mono">
          <span className="flex items-center gap-1.5 text-brand font-semibold shrink-0">
            <Sparkles className="size-3.5 text-brand" />
            Next Important
          </span>
          {isHardCutoff ? (
            <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded border border-destructive/30 text-destructive bg-destructive/10 shrink-0">
              <span className="hidden sm:inline">Hard Cutoff · </span>Irreversible
            </span>
          ) : (
            <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded border border-border-default text-foreground-lighter bg-surface-200 shrink-0">
              Active Priority
            </span>
          )}
        </div>

        {/* Dominant Visual Anchor: countdown, deadline, context, action */}
        <div className="flex flex-col gap-4 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 flex flex-col gap-2">
            <div className="text-balance text-2xl font-bold font-mono text-foreground sm:text-3xl tabular-nums">
              {countdownText}
            </div>
            {dueTodayAssignments.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="text-balance text-base font-semibold text-foreground">
                  Assignments due today
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground-light">
                  {dueTodayAssignments.map((courseName) => (
                    <span key={courseName}>{courseName}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div
                  className="text-balance text-lg font-semibold font-heading text-foreground sm:text-xl"
                  title={titleText}
                >
                  {titleText}
                </div>
                <div className="text-sm font-semibold font-mono text-brand tabular-nums">
                  {dateTimeText}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="small"
            onClick={handleActionClick}
            className="h-8 shrink-0 self-start border-border-strong bg-surface-200 px-3 text-xs text-foreground hover:bg-surface-300 sm:self-end touch-manipulation active:scale-95 transition-all duration-75"
          >
            <span>View more details</span>
            <ArrowRight data-icon="inline-end" className="text-brand size-3.5" />
          </Button>
        </div>

        <p className="max-w-2xl text-pretty text-xs sm:text-sm leading-relaxed text-foreground-light line-clamp-2">
          {isRegistrationPeriod ? "Keep your course list and documents ready." : subtitleText}
        </p>
      </div>

      {/* Zone 3: NEXT ALERTS — continuation of the primary priority */}
      <div className="lg:col-span-3 p-3.5 sm:p-5 flex flex-col justify-between gap-2 bg-surface-100">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5 text-brand font-semibold">
              <Calendar className="size-3.5 text-brand" />
              Next Up
            </span>
            {nextAlerts.length > 0 && (
              <span className="text-[10px] font-mono tabular-nums text-foreground-lighter">
                {nextAlerts.length} upcoming
              </span>
            )}
          </div>
          {nextAlerts.length === 0 ? (
            <p className="text-pretty text-xs text-foreground-lighter">Nothing else is due soon.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {nextAlerts.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() =>
                    event.courseCode
                      ? onNavigateToCourse?.(event.courseCode)
                      : onNavigateToCalendar?.(event.id)
                  }
                  className="group/item flex w-full items-center justify-between gap-2 rounded-md border border-border-default bg-surface-200/50 p-2 sm:p-2.5 text-left transition-colors hover:border-brand/40 hover:bg-surface-200 touch-manipulation active:scale-[0.99]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground group-hover/item:text-brand">
                      {event.title}
                    </span>
                    <span className="block text-[10px] font-mono tabular-nums text-foreground-lighter">
                      {formatAcademicDate(event.date)}
                      {event.courseCode ? ` · ${event.courseCode}` : ""} ·{" "}
                      {formatDaysRemaining(event.date, todayDate)}
                    </span>
                  </span>
                  <ArrowRight className="size-3 shrink-0 text-foreground-lighter group-hover/item:text-brand" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
