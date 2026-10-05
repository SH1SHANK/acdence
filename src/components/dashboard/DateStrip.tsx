import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";
import { CANONICAL_EVENTS } from "@/data/events";

const DayDetailDialog = React.lazy(() => import("@/components/dialogs/DayDetailDialog"));
import {
  formatAcademicDate,
  formatDaysRemaining,
  getTodayIST,
  parseDateComponents,
} from "@/lib/datetime";
import { getEventSeverity, getEventCategoryLabel, isHardCutoff } from "@/lib/eventClassification";

interface DateStripProps {
  events?: typeof CANONICAL_EVENTS;
  onSelectCourse?: (courseCode: CourseCode) => void;
}
const DAY = 24 * 60 * 60 * 1000;
const dateValue = (date: string) => new Date(`${date}T12:00:00+05:30`);
const dateString = (date: Date) => date.toISOString().slice(0, 10);
const startOfWeek = (date: string) => {
  const d = dateValue(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return dateString(d);
};
const shift = (date: string, days: number) =>
  dateString(new Date(dateValue(date).getTime() + days * DAY));
const compactTitle = (event: AcademicEvent) =>
  event.title
    .replace(
      /September 2026 Term |End Term Exam \(In-Centre\)|\(In-Centre\)|\(Online Proctored\)/g,
      "",
    )
    .replace(/Week (\d+) /, "A$1 · ")
    .replace(/Graded Programming Assignment/g, "GrPA")
    .trim();

const eventTone = (event: AcademicEvent) => {
  const severity = getEventSeverity(event);
  if (severity === "critical") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (severity === "warning") return "border-warning/30 bg-warning/10 text-warning";
  return "border-border-default bg-surface-200 text-foreground-light";
};

export const DateStrip = React.memo<DateStripProps>(function DateStrip({
  events = CANONICAL_EVENTS,
  onSelectCourse,
}) {
  const today = useMemo(() => getTodayIST(), []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shift(weekStart, i)), [weekStart]);
  const eventsByDay = useMemo(
    () =>
      new Map(
        days.map((day) => [
          day,
          events.filter(
            (event) =>
              event.date === day ||
              (event.start &&
                day >= event.start.slice(0, 10) &&
                day <= (event.end || event.date).slice(0, 10)),
          ),
        ]),
      ),
    [days, events],
  );
  const weekEvents = days.flatMap((day) => eventsByDay.get(day) ?? []);
  const hardCutoffs = weekEvents.filter((event) => isHardCutoff(event)).length;
  const rangeLabel = `${formatAcademicDate(days[0])} – ${formatAcademicDate(days[6], true)}`;
  const weekEventSummary = `${weekEvents.length} ${weekEvents.length === 1 ? "event" : "events"}`;
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];
  const selectedLabel = selectedDay
    ? `${formatAcademicDate(selectedDay)} · ${formatDaysRemaining(selectedDay, today)}`
    : "";
  const eventCountLabel = (count: number) =>
    count === 0 ? "Nothing scheduled" : `${count} ${count === 1 ? "event" : "events"}`;

  return (
    <section
      aria-label="Academic Calendar"
      className="rounded-lg border border-border-default bg-surface-100 p-3 sm:p-4 shadow-xs"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-brand" />
          <div>
            <h2 className="text-balance text-sm font-semibold font-heading text-foreground">
              Academic Calendar
            </h2>
            <p className="text-pretty text-[11px] font-mono text-foreground-lighter">
              {rangeLabel} · {weekEventSummary}
              {hardCutoffs ? ` · ${hardCutoffs} hard cutoff${hardCutoffs === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous week"
            variant="ghost"
            size="icon-xs"
            onClick={() => setWeekStart(shift(weekStart, -7))}
            className="h-8 w-8 touch-manipulation active:scale-95"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="small"
            className="h-8 px-2.5 text-[11px] text-brand font-mono font-medium touch-manipulation active:scale-95"
            onClick={() => setWeekStart(startOfWeek(today))}
          >
            Today
          </Button>
          <Button
            aria-label="Next week"
            variant="ghost"
            size="icon-xs"
            onClick={() => setWeekStart(shift(weekStart, 7))}
            className="h-8 w-8 touch-manipulation active:scale-95"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border-default touch-pan-x overscroll-x-contain scrollbar-thin">
        <div className="grid min-w-[720px] grid-cols-7 divide-x divide-border-default bg-surface-100">
          {days.map((day) => {
            const parts = parseDateComponents(day);
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === today;
            const isSelected = day === selectedDay;
            return (
              <button
                type="button"
                key={day}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => setSelectedDay(day)}
                className={`min-w-0 p-2 text-left transition-colors focus-visible:z-10 sm:p-3 cursor-pointer touch-manipulation ${isSelected ? "bg-surface-200" : "hover:bg-surface-200/50 active:bg-surface-300/40"} ${isToday ? "ring-1 ring-inset ring-brand" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`truncate text-[10px] font-mono font-semibold uppercase ${isToday ? "text-brand" : "text-foreground-lighter"}`}
                  >
                    {parts.dayOfWeek}
                    {isToday && <span className="ml-1 text-[9px]">TODAY</span>}
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${isToday ? "text-brand" : "text-foreground"}`}
                  >
                    {parts.dayNum}
                  </span>
                </div>
                <div className="mt-1 text-[9px] font-mono text-foreground-lighter">
                  {eventCountLabel(dayEvents.length)}
                </div>
                <div className="mt-2 min-h-[86px] flex flex-col gap-1" aria-hidden="true">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`rounded border-l-2 px-1.5 py-1.5 ${eventTone(event)}`}
                    >
                      <div className="truncate text-[9px] font-mono font-semibold uppercase">
                        {event.courseCode || getEventCategoryLabel(event)}
                      </div>
                      <div className="truncate text-[10px] leading-tight">
                        {compactTitle(event)}
                      </div>
                      <div className="truncate text-[9px]">{event.time || "Due"}</div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="pt-0.5 text-[10px] font-mono tabular-nums text-brand">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                  {dayEvents.length === 0 && (
                    <span className="text-[10px] text-foreground-lighter/40" aria-hidden="true">
                      —
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selectedDay !== null && (
        <React.Suspense fallback={null}>
          <DayDetailDialog
            open={selectedDay !== null}
            onOpenChange={(open) => !open && setSelectedDay(null)}
            selectedLabel={selectedLabel}
            selectedEvents={selectedEvents}
            onSelectCourse={onSelectCourse}
            onClose={() => setSelectedDay(null)}
          />
        </React.Suspense>
      )}
    </section>
  );
});
