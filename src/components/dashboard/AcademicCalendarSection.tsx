import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  Flame,
  Grid,
  List,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";
import { CANONICAL_EVENTS } from "@/data/events";
import { formatAcademicDate, getTodayIST } from "@/lib/datetime";
import { isHardCutoff, getEventSeverity } from "@/lib/eventClassification";

interface AcademicCalendarSectionProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelectCourse?: (courseCode: CourseCode) => void;
  onOpenProjectHub?: () => void;
  referenceDate?: string;
  events?: AcademicEvent[];
}

type CalendarViewMode = "month" | "agenda" | "cutoffs";

const COURSE_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Courses" },
  { id: "CS2005", label: "CS2005" },
  { id: "SE2001", label: "SE2001" },
  { id: "CS2006", label: "CS2006" },
  { id: "CS2006P", label: "CS2006P" },
  { id: "MS2001", label: "MS2001" },
  { id: "general", label: "Term Events" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All Types" },
  { id: "cutoffs", label: "Hard Cutoffs" },
  { id: "exams", label: "Exams & Quizzes" },
  { id: "assignments", label: "Assignments" },
  { id: "sct", label: "SCT Windows" },
  { id: "project", label: "Project" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthGridDay {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: AcademicEvent[];
  hasHardCutoff: boolean;
  hasExam: boolean;
  hasAssignment: boolean;
  hasProject: boolean;
  hasSct: boolean;
}

function getEventBadgeColor(event: AcademicEvent) {
  const severity = getEventSeverity(event);
  if (severity === "critical") {
    return "border-destructive/40 text-destructive bg-destructive/10";
  }
  if (severity === "warning") {
    return "border-warning/40 text-warning bg-warning/10";
  }
  return "border-border-default text-foreground-lighter bg-surface-200";
}

function eventOccursOnDate(event: AcademicEvent, dateStr: string): boolean {
  if (event.date === dateStr) return true;
  if (event.start) {
    const startDate = event.start.slice(0, 10);
    const endDate = event.end ? event.end.slice(0, 10) : event.date;
    if (dateStr >= startDate && dateStr <= endDate) {
      return true;
    }
  }
  return false;
}

export const AcademicCalendarSection = React.memo<AcademicCalendarSectionProps>(
  function AcademicCalendarSection({
    selectedDate,
    onSelectDate,
    onSelectCourse,
    onOpenProjectHub,
    referenceDate,
    events = CANONICAL_EVENTS,
  }) {
    const todayIST = useMemo(() => referenceDate || getTodayIST(), [referenceDate]);
    const allEvents = useMemo(
      () => (events && events.length > 0 ? events : CANONICAL_EVENTS),
      [events],
    );

    // Active View Mode
    const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

    // Current Month for Month Grid View (default to selectedDate month or today's month)
    const [currentYear, setCurrentYear] = useState<number>(() => {
      const parts = (selectedDate || todayIST).split("-");
      return parseInt(parts[0], 10) || 2026;
    });
    const [currentMonth, setCurrentMonth] = useState<number>(() => {
      const parts = (selectedDate || todayIST).split("-");
      return parseInt(parts[1], 10) || 9;
    });

    // Filter States for Agenda / Month views
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Hard Cutoff Count
    const totalHardCutoffs = useMemo(
      () => allEvents.filter((e) => e.hardCutoff || e.isHardCutoff).length,
      [allEvents],
    );

    // Navigate to previous month (constrained to term bounds: Sep 2026 - Jan 2027)
    const handlePrevMonth = () => {
      if (currentYear === 2026 && currentMonth === 9) return;
      if (currentMonth === 1) {
        setCurrentYear(2026);
        setCurrentMonth(12);
      } else {
        setCurrentMonth((prev) => prev - 1);
      }
    };

    // Navigate to next month
    const handleNextMonth = () => {
      if (currentYear === 2027 && currentMonth === 1) return;
      if (currentMonth === 12) {
        setCurrentYear(2027);
        setCurrentMonth(1);
      } else {
        setCurrentMonth((prev) => prev + 1);
      }
    };

    // Jump directly to a term month
    // Jump to Today
    const handleJumpToToday = () => {
      const parts = todayIST.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      setCurrentYear(y);
      setCurrentMonth(m);
      onSelectDate(todayIST);
    };

    // Generate Month Grid Matrix (Monday to Sunday)
    const monthDays = useMemo<MonthGridDay[]>(() => {
      const firstDay = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const startDayOfWeek = (firstDay.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
      const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
      const prevMonthDays = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();

      const days: MonthGridDay[] = [];

      // 1. Previous Month Padding
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthDays - i;
        const m = currentMonth === 1 ? 12 : currentMonth - 1;
        const y = currentMonth === 1 ? currentYear - 1 : currentYear;
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayEvents = allEvents.filter((e) => eventOccursOnDate(e, dateStr));
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isToday: dateStr === todayIST,
          events: dayEvents,
          hasHardCutoff: dayEvents.some((e) => isHardCutoff(e)),
          hasExam: dayEvents.some((e) => e.type === "exam" || e.type === "viva"),
          hasAssignment: dayEvents.some(
            (e) => e.type === "assignment" || e.type === "bpt_deadline",
          ),
          hasProject: dayEvents.some(
            (e) => e.courseCode === "CS2006P" || e.type.startsWith("project_"),
          ),
          hasSct: dayEvents.some(
            (e) => e.subType === "sct_window" || e.cutoffType === "sct_window",
          ),
        });
      }

      // 2. Current Month Days
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayEvents = allEvents.filter((e) => eventOccursOnDate(e, dateStr));
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: true,
          isToday: dateStr === todayIST,
          events: dayEvents,
          hasHardCutoff: dayEvents.some((e) => isHardCutoff(e)),
          hasExam: dayEvents.some((e) => e.type === "exam" || e.type === "viva"),
          hasAssignment: dayEvents.some(
            (e) => e.type === "assignment" || e.type === "bpt_deadline",
          ),
          hasProject: dayEvents.some(
            (e) => e.courseCode === "CS2006P" || e.type.startsWith("project_"),
          ),
          hasSct: dayEvents.some(
            (e) => e.subType === "sct_window" || e.cutoffType === "sct_window",
          ),
        });
      }

      // 3. Next Month Padding (to reach a clean 35 or 42 grid)
      const totalCells = days.length <= 35 ? 35 : 42;
      const remaining = totalCells - days.length;
      for (let d = 1; d <= remaining; d++) {
        const m = currentMonth === 12 ? 1 : currentMonth + 1;
        const y = currentMonth === 12 ? currentYear + 1 : currentYear;
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayEvents = allEvents.filter((e) => eventOccursOnDate(e, dateStr));
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isToday: dateStr === todayIST,
          events: dayEvents,
          hasHardCutoff: dayEvents.some((e) => isHardCutoff(e)),
          hasExam: dayEvents.some((e) => e.type === "exam" || e.type === "viva"),
          hasAssignment: dayEvents.some(
            (e) => e.type === "assignment" || e.type === "bpt_deadline",
          ),
          hasProject: dayEvents.some(
            (e) => e.courseCode === "CS2006P" || e.type.startsWith("project_"),
          ),
          hasSct: dayEvents.some(
            (e) => e.subType === "sct_window" || e.cutoffType === "sct_window",
          ),
        });
      }

      return days;
    }, [allEvents, currentYear, currentMonth, todayIST]);

    // Events on the currently selected date
    const selectedDayEvents = useMemo(() => {
      return allEvents.filter((e) => eventOccursOnDate(e, selectedDate));
    }, [allEvents, selectedDate]);

    // Filtered Events for Agenda Stream
    const filteredAgendaEvents = useMemo(() => {
      return allEvents
        .filter((event) => {
          // Course filter
          if (selectedCourse !== "all") {
            if (selectedCourse === "general") {
              if (event.courseCode) return false;
            } else if (event.courseCode !== selectedCourse) {
              return false;
            }
          }

          // Type filter
          if (selectedType === "cutoffs") {
            if (!isHardCutoff(event) && event.type !== "eligibility_close") return false;
          } else if (selectedType === "exams") {
            if (event.type !== "exam" && event.type !== "viva") return false;
          } else if (selectedType === "assignments") {
            if (event.type !== "assignment" && event.type !== "bpt_deadline") return false;
          } else if (selectedType === "sct") {
            if (event.subType !== "sct_window" && event.cutoffType !== "sct_window") return false;
          } else if (selectedType === "project") {
            if (event.courseCode !== "CS2006P" && !event.type.startsWith("project_")) return false;
          }

          // Search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const titleMatch = event.title.toLowerCase().includes(q);
            const descMatch = event.description?.toLowerCase().includes(q);
            const codeMatch = event.courseCode?.toLowerCase().includes(q);
            if (!titleMatch && !descMatch && !codeMatch) return false;
          }

          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    }, [allEvents, selectedCourse, selectedType, searchQuery]);

    // Group agenda events by month
    const agendaGroupedByMonth = useMemo(() => {
      const groups: Record<string, AcademicEvent[]> = {};
      filteredAgendaEvents.forEach((ev) => {
        const d = new Date(ev.date);
        const monthKey = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(ev);
      });
      return groups;
    }, [filteredAgendaEvents]);

    // Hard Cutoffs List for Cutoffs View
    const hardCutoffsList = useMemo(() => {
      return allEvents.filter((e) => isHardCutoff(e)).sort((a, b) => a.date.localeCompare(b.date));
    }, [allEvents]);

    // Format month name for title
    const currentMonthLabel = useMemo(() => {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }, [currentYear, currentMonth]);

    // Selected Date formatted header
    const formattedSelectedDate = useMemo(() => {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }, [selectedDate]);

    return (
      <div className="w-full bg-surface-100 border border-border-default rounded-lg p-4 sm:p-5 flex flex-col gap-4">
        {/* 1. Header Bar with View Switchers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase text-brand">
                <CalendarIcon className="size-4 text-brand" />
                <span>Academic Calendar</span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono py-0 px-1.5 border-destructive/40 text-destructive bg-destructive/10 flex items-center gap-1"
              >
                <Flame className="size-3" />
                <span className="tabular-nums">{totalHardCutoffs} Hard Cutoffs</span>
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-mono py-0 px-1.5 border-border-default text-foreground-lighter"
              >
                September 2026 – January 2027
              </Badge>
            </div>
            <h2 className="text-balance text-lg sm:text-xl font-bold text-foreground">
              Canonical Semester Schedule & Timeline
            </h2>
            <p className="text-pretty text-xs text-foreground-light">
              Term schedule, SCT windows, weekly submissions, and exam gates.
            </p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-lg border border-border-default self-start md:self-auto w-full sm:w-auto overflow-x-auto scrollbar-none flex-nowrap touch-pan-x">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              aria-pressed={viewMode === "month"}
              className={`text-xs font-mono px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all active:scale-95 duration-75 touch-manipulation cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === "month"
                  ? "bg-brand text-black font-semibold shadow-xs"
                  : "text-foreground-lighter hover:text-foreground"
              }`}
            >
              <Grid className="size-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              aria-pressed={viewMode === "agenda"}
              className={`text-xs font-mono px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all active:scale-95 duration-75 touch-manipulation cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === "agenda"
                  ? "bg-brand text-black font-semibold shadow-xs"
                  : "text-foreground-lighter hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              <span>Agenda Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cutoffs")}
              aria-pressed={viewMode === "cutoffs"}
              className={`text-xs font-mono px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all active:scale-95 duration-75 touch-manipulation cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === "cutoffs"
                  ? "bg-brand text-black font-semibold shadow-xs"
                  : "text-foreground-lighter hover:text-foreground"
              }`}
            >
              <ShieldAlert
                className={`size-3.5 ${viewMode === "cutoffs" ? "text-black" : "text-destructive"}`}
              />
              <span>Hard Cutoffs</span>
            </button>
          </div>
        </div>

        {/* VIEW MODE 1: Interactive Month Grid */}
        {viewMode === "month" && (
          <div className="flex flex-col gap-4">
            {/* Month Navigation & Month Chips */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-200/50 p-3 rounded-lg border border-border-default">
              {/* Prev / Current Month / Next */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                  disabled={currentYear === 2026 && currentMonth === 9}
                  className="size-8 p-0 cursor-pointer bg-surface-100 border-border-default"
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="text-sm font-bold font-mono text-foreground px-2 min-w-[130px] text-center">
                  {currentMonthLabel}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  disabled={currentYear === 2027 && currentMonth === 1}
                  className="size-8 p-0 cursor-pointer bg-surface-100 border-border-default"
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleJumpToToday}
                className="h-7 text-xs text-brand hover:text-brand font-mono gap-1 cursor-pointer"
                title="Jump to Today"
              >
                Today
              </Button>
            </div>

            {/* 2-Column Responsive Layout: Grid on Left (7 cols), Selected Day Detail on Right (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: 7-Day Month Grid (7 cols on lg, 8 cols on xl) */}
              <div className="lg:col-span-7 xl:col-span-8 bg-surface-100 rounded-lg border border-border-default p-2.5 sm:p-4 overflow-x-auto min-w-0">
                <div className="min-w-[320px]">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {WEEKDAYS.map((wd) => (
                      <div
                        key={wd}
                        className="text-center font-mono text-[11px] font-semibold py-1 uppercase text-foreground-lighter"
                      >
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Day Cells Matrix */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {monthDays.map((day) => {
                      const isCurrent = day.isCurrentMonth;
                      const isSelected = day.dateStr === selectedDate;
                      const isToday = day.isToday;
                      const hasEvents = day.events.length > 0;

                      return (
                        <button
                          type="button"
                          key={day.dateStr}
                          aria-pressed={isSelected}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => {
                            onSelectDate(day.dateStr);
                            // If clicking a date from adjacent month, jump to that month
                            const parts = day.dateStr.split("-");
                            const y = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10);
                            if (y !== currentYear || m !== currentMonth) {
                              setCurrentYear(y);
                              setCurrentMonth(m);
                            }
                          }}
                          className={`min-h-[52px] sm:min-h-[76px] p-1 sm:p-2 rounded-lg border text-left flex flex-col justify-between transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                            isSelected
                              ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand"
                              : isToday
                                ? "border-brand/60 bg-brand/5 hover:border-brand"
                                : isCurrent
                                  ? "border-border-default bg-surface-100 hover:bg-surface-200 hover:border-border-strong"
                                  : "border-border-default/40 bg-surface-200/40 opacity-75 hover:opacity-100"
                          }`}
                          title={`${formatAcademicDate(day.dateStr, true)}${day.events.length ? ` · ${day.events.length} event(s)` : ""}`}
                          aria-label={`${formatAcademicDate(day.dateStr, true)}${day.events.length ? `, ${day.events.length} event${day.events.length === 1 ? "" : "s"}` : ", Nothing scheduled"}`}
                        >
                          {/* Day Number + Badges */}
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-xs sm:text-sm font-mono tabular-nums leading-none ${
                                isToday
                                  ? "size-5 sm:size-6 rounded-full bg-brand text-black font-bold flex items-center justify-center text-[11px] sm:text-xs"
                                  : isSelected
                                    ? "text-brand font-bold"
                                    : isCurrent
                                      ? "text-foreground font-medium"
                                      : "text-foreground-muted"
                              }`}
                            >
                              {day.dayNum}
                            </span>

                            {/* Top Indicator Dot */}
                            {day.hasHardCutoff ? (
                              <span
                                className="size-2 rounded-full bg-destructive"
                                title="Hard Eligibility Cutoff"
                              />
                            ) : day.hasExam ? (
                              <span
                                className="size-1.5 rounded-full bg-warning"
                                title="Exam / Quiz"
                              />
                            ) : day.hasSct || hasEvents ? (
                              <span
                                className="size-1.5 rounded-full bg-foreground-muted"
                                title="Event scheduled"
                              />
                            ) : null}
                          </div>

                          {/* Event Snippet Chips (Desktop) */}
                          <div className="flex flex-col gap-0.5 mt-1 overflow-hidden w-full hidden sm:block">
                            {day.events.slice(0, 2).map((ev) => {
                              const isHard = isHardCutoff(ev);
                              return (
                                <div
                                  key={ev.id}
                                  className={`text-[9px] font-mono truncate px-1 py-0.5 rounded border ${
                                    isHard
                                      ? "border-destructive/40 text-destructive bg-destructive/10 font-semibold"
                                      : ev.type === "exam" || ev.type === "viva"
                                        ? "border-warning/40 text-warning bg-warning/10"
                                        : "border-border-default text-foreground-lighter bg-surface-200"
                                  }`}
                                >
                                  {ev.courseCode ? `${ev.courseCode}: ` : ""}
                                  {ev.title.replace(/September 2026 Term |OPPE /g, "")}
                                </div>
                              );
                            })}
                            {day.events.length > 2 && (
                              <span className="text-[8px] font-mono tabular-nums text-foreground-lighter pl-0.5">
                                +{day.events.length - 2} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Color Legend Bar */}
                  <div className="mt-4 pt-3 border-t border-border-default flex flex-wrap items-center gap-3 text-[11px] font-mono text-foreground-lighter">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-destructive" />
                      <span>Hard Cutoff (Irreversible)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-warning" />
                      <span>Exam / Quiz</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-foreground-muted" />
                      <span>Other scheduled events</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Selected Date Inspector Pane (5 cols on lg, 4 cols on xl) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-surface-100 rounded-lg border border-border-default p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {/* Date Inspector Header */}
                  <div className="pb-3 border-b border-border-default">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono uppercase text-brand font-semibold flex items-center gap-1">
                        <CalendarIcon className="size-3.5" />
                        <span>Inspecting Date</span>
                      </span>
                      {selectedDate === todayIST && (
                        <Badge
                          variant="outline"
                          className="border-brand/30 text-brand bg-brand/10 text-[10px] font-mono py-0 px-1.5"
                        >
                          TODAY
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-balance text-base sm:text-lg font-bold text-foreground">
                      {formattedSelectedDate}
                    </h3>
                    <div className="text-xs text-foreground-lighter font-mono tabular-nums mt-0.5">
                      {selectedDayEvents.length === 0
                        ? "No events scheduled"
                        : `${selectedDayEvents.length} canonical event${
                            selectedDayEvents.length === 1 ? "" : "s"
                          } on this date`}
                    </div>
                  </div>

                  {/* Day's Event List */}
                  {selectedDayEvents.length === 0 ? (
                    <div className="py-5 text-center flex flex-col gap-2">
                      <div className="size-8 rounded-full bg-surface-200 border border-border-default flex items-center justify-center mx-auto text-foreground-lighter">
                        <CalendarIcon className="size-4" />
                      </div>
                      <p className="text-pretty text-xs text-foreground-light">
                        No assignments, quizzes, or cutoffs scheduled for this date.
                      </p>
                      <p className="text-pretty text-[11px] text-foreground-lighter font-mono">
                        Click any day in the month grid to inspect its agenda.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                      {selectedDayEvents.map((ev) => {
                        const isHard = isHardCutoff(ev);
                        return (
                          <div
                            key={ev.id}
                            id={`calendar-event-${ev.id}`}
                            className={`p-3.5 rounded-lg border flex flex-col gap-2 transition-colors ${
                              isHard
                                ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
                                : "border-border-default bg-surface-100 hover:border-border-strong"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ev.courseCode && (
                                <button
                                  type="button"
                                  onClick={() => onSelectCourse?.(ev.courseCode as CourseCode)}
                                  className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30 hover:underline cursor-pointer"
                                  title={`Open ${ev.courseCode} details`}
                                >
                                  {ev.courseCode}
                                </button>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-mono py-0 px-1.5 uppercase ${getEventBadgeColor(
                                  ev,
                                )}`}
                              >
                                {ev.type.replace("_", " ")}
                              </Badge>
                              {isHard && (
                                <Badge className="text-[9px] font-mono py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/40 flex items-center gap-1">
                                  <AlertTriangle className="size-2.5" />
                                  <span>Hard Cutoff</span>
                                </Badge>
                              )}
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-foreground leading-snug">
                                {ev.title}
                              </h4>
                              {ev.description && (
                                <p className="text-pretty text-xs text-foreground-light leading-relaxed mt-1">
                                  {ev.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-foreground-lighter pt-1 border-t border-border-default">
                              <span>Time: {ev.time || "23:59 IST"}</span>
                              {ev.source?.documentName && (
                                <span
                                  className="truncate max-w-[140px]"
                                  title={ev.source.documentName}
                                >
                                  {ev.source.documentName}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-foreground-lighter">
                    Date:{" "}
                    <strong className="text-foreground">
                      {formatAcademicDate(selectedDate, true)}
                    </strong>
                  </span>
                  {onOpenProjectHub &&
                    selectedDayEvents.some((e) => e.courseCode === "CS2006P") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenProjectHub}
                        className="text-xs font-mono h-7 gap-1 text-brand cursor-pointer"
                      >
                        <span>Open Project Hub</span>
                        <ExternalLink className="size-3" />
                      </Button>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: Agenda Stream View */}
        {viewMode === "agenda" && (
          <div className="flex flex-col gap-4">
            {/* Agenda Filters */}
            <div className="p-3 bg-surface-200/50 rounded-lg border border-border-default flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                  <Input
                    aria-label="Search events"
                    placeholder="Search events, courses, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-surface-100 border-border-default text-xs h-8"
                  />
                </div>

                {/* Type Filters */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {TYPE_FILTERS.map((tf) => (
                    <button
                      type="button"
                      key={tf.id}
                      onClick={() => setSelectedType(tf.id)}
                      aria-pressed={selectedType === tf.id}
                      className={`text-xs font-medium px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                        selectedType === tf.id
                          ? "bg-brand text-black font-semibold"
                          : "bg-surface-100 hover:bg-surface-200 text-foreground-light border border-border-default"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] text-foreground-light font-mono flex items-center gap-1 mr-1">
                  <Filter className="size-3" /> Course:
                </span>
                {COURSE_FILTERS.map((cf) => (
                  <button
                    type="button"
                    key={cf.id}
                    onClick={() => setSelectedCourse(cf.id)}
                    aria-pressed={selectedCourse === cf.id}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCourse === cf.id
                        ? "bg-brand text-black font-semibold"
                        : "bg-surface-100 hover:bg-surface-200 text-foreground-light border border-border-default"
                    }`}
                  >
                    {cf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped Events */}
            <div className="flex flex-col gap-5">
              {Object.keys(agendaGroupedByMonth).length === 0 ? (
                <div className="py-12 text-center text-foreground-lighter text-xs font-mono">
                  No canonical events match your filter criteria.
                </div>
              ) : (
                Object.entries(agendaGroupedByMonth).map(([month, events]) => (
                  <div key={month} className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-border-default">
                      <h3 className="font-mono text-xs font-bold uppercase text-foreground-light">
                        {month}
                      </h3>
                      <span className="text-[11px] font-mono tabular-nums text-foreground-lighter">
                        {events.length} event{events.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {events.map((ev) => {
                        const isHard = isHardCutoff(ev);
                        const isPast = ev.date < todayIST;
                        const isToday = ev.date === todayIST;

                        return (
                          <div
                            key={ev.id}
                            className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                              isHard
                                ? "bg-destructive/5 border-destructive/40 hover:border-destructive/60"
                                : "bg-surface-100 border-border-default hover:border-border-strong"
                            } ${isPast ? "opacity-75" : ""}`}
                          >
                            {/* Date block */}
                            <div
                              className={`flex flex-col items-center justify-center rounded border px-2 py-1 shrink-0 min-w-[50px] ${
                                isHard
                                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                                  : "bg-surface-200 border-border-default text-foreground-lighter"
                              }`}
                            >
                              <span className="text-[9px] font-mono uppercase">
                                {new Date(ev.date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                })}
                              </span>
                              <span className="font-mono text-base font-bold text-foreground leading-none my-0.5 tabular-nums">
                                {new Date(ev.date).getDate()}
                              </span>
                              <span className="text-[8px] font-mono tabular-nums">
                                {ev.time ? ev.time.slice(0, 5) : "23:59"}
                              </span>
                            </div>

                            {/* Event content */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {ev.courseCode && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectCourse?.(ev.courseCode as CourseCode)}
                                    className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30 hover:underline cursor-pointer"
                                  >
                                    {ev.courseCode}
                                  </button>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono py-0 px-1.5 capitalize ${getEventBadgeColor(
                                    ev,
                                  )}`}
                                >
                                  {ev.type.replace("_", " ")}
                                </Badge>
                                {isHard && (
                                  <Badge className="text-[9px] font-mono py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/40 flex items-center gap-1">
                                    <AlertTriangle className="size-2.5" />
                                    <span>Cutoff</span>
                                  </Badge>
                                )}
                                {isToday && (
                                  <Badge className="text-[9px] font-mono py-0 px-1.5 bg-brand/10 text-brand border border-brand/30">
                                    Today
                                  </Badge>
                                )}
                              </div>

                              <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                                {ev.title}
                              </h4>
                              {ev.description && (
                                <p className="text-pretty text-[11px] text-foreground-light line-clamp-2 leading-relaxed">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW MODE 3: Hard Cutoffs Focused Gate View */}
        {viewMode === "cutoffs" && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
              <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-destructive">
                  Irreversible Academic Gates:
                </strong>{" "}
                These cutoffs cannot be postponed, re-attempted without an official window, or
                waived. Missing any cutoff directly impairs exam eligibility or course completion.
              </div>
            </div>

            <div className="divide-y divide-border-default border border-border-default rounded-xl overflow-hidden bg-surface-100">
              {hardCutoffsList.map((cutoff, idx) => {
                const isPast = cutoff.date < todayIST;
                const isToday = cutoff.date === todayIST;

                return (
                  <div
                    key={cutoff.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                      isPast ? "bg-surface-200/40 opacity-70" : "hover:bg-surface-200"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground-lighter">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        {cutoff.courseCode ? (
                          <button
                            type="button"
                            onClick={() => onSelectCourse?.(cutoff.courseCode as CourseCode)}
                            className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30 hover:underline cursor-pointer"
                          >
                            {cutoff.courseCode}
                          </button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-border-default text-foreground-lighter"
                          >
                            Term Gate
                          </Badge>
                        )}
                        <Badge className="text-[10px] font-mono py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/40 flex items-center gap-1">
                          <AlertTriangle className="size-2.5" />
                          <span>Irreversible</span>
                        </Badge>
                        {isToday && (
                          <Badge className="text-[10px] font-mono py-0 px-1.5 bg-brand/10 text-brand border border-brand/30">
                            Active Today
                          </Badge>
                        )}
                        {isPast && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-foreground-lighter border-border-default"
                          >
                            Passed
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-foreground">{cutoff.title}</h4>
                      <p className="text-pretty text-xs text-foreground-light leading-relaxed">
                        {cutoff.description}
                      </p>
                    </div>

                    <div className="text-left md:text-right shrink-0 font-mono flex flex-col gap-0.5 tabular-nums">
                      <div className="text-xs font-bold text-foreground">{cutoff.date}</div>
                      <div className="text-[11px] text-foreground-lighter">
                        {cutoff.time || "23:59 IST"}
                      </div>
                      {cutoff.source?.documentName && (
                        <div className="text-[10px] text-foreground-lighter">
                          {cutoff.source.documentName}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  },
);
