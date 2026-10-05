import React, { useState, useMemo } from "react";
import type { CourseCode } from "@/types/course";
import type { AcademicEvent } from "@/types/events";
import { CANONICAL_EVENTS } from "@/data/events";
import { isHardCutoff, getEventSeverity } from "@/lib/eventClassification";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, AlertTriangle, Search, Filter, Flame } from "lucide-react";

interface AgendaCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceDate?: string;
  initialCourse?: CourseCode | null;
  events?: AcademicEvent[];
}

const COURSE_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Courses" },
  { id: "CS2005", label: "CS2005" },
  { id: "SE2001", label: "SE2001" },
  { id: "CS2006", label: "CS2006" },
  { id: "CS2006P", label: "CS2006P" },
  { id: "MS2001", label: "MS2001" },
  { id: "general", label: "General / Term" },
];

const VIEW_FILTERS = [
  { id: "all", label: "All Events" },
  { id: "cutoffs", label: "Hard Cutoffs" },
  { id: "exams", label: "Quizzes & Exams" },
  { id: "project", label: "Project & Viva" },
];

function getEventColor(event: AcademicEvent) {
  const severity = getEventSeverity(event);
  if (severity === "critical") {
    return "border-destructive/40 text-destructive bg-destructive/10";
  }
  if (severity === "warning") {
    return "border-warning/40 text-warning bg-warning/10";
  }
  return "border-border-default text-foreground-lighter bg-surface-200";
}

function formatRelativeDays(eventDateStr: string, refDateStr: string): string {
  const eventDate = new Date(eventDateStr);
  const refDate = new Date(refDateStr);
  const diffTime = eventDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}

function formatMonthHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export const AgendaCalendarSheet: React.FC<AgendaCalendarSheetProps> = ({
  open,
  onOpenChange,
  referenceDate = "2026-10-18",
  initialCourse = null,
  events = CANONICAL_EVENTS,
}) => {
  const allEvents = useMemo(
    () => (events && events.length > 0 ? events : CANONICAL_EVENTS),
    [events],
  );
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || "all");
  const [prevInitialCourse, setPrevInitialCourse] = useState(initialCourse);
  if (initialCourse !== prevInitialCourse) {
    setPrevInitialCourse(initialCourse);
    if (initialCourse) {
      setSelectedCourse(initialCourse);
    }
  }
  const [selectedView, setSelectedView] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter & Sort events
  const filteredEvents = useMemo(() => {
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

        // View filter
        if (selectedView === "cutoffs") {
          if (!isHardCutoff(event) && event.type !== "eligibility_close") {
            return false;
          }
        } else if (selectedView === "exams") {
          if (event.type !== "exam") {
            return false;
          }
        } else if (selectedView === "project") {
          if (
            event.courseCode !== "CS2006P" &&
            !["project_milestone", "project_submission", "project_validation", "viva"].includes(
              event.type,
            )
          ) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const titleMatch = event.title.toLowerCase().includes(query);
          const descMatch = event.description?.toLowerCase().includes(query);
          const codeMatch = event.courseCode?.toLowerCase().includes(query);
          if (!titleMatch && !descMatch && !codeMatch) return false;
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, selectedCourse, selectedView, searchQuery]);

  // Group events by Month
  const groupedByMonth = useMemo(() => {
    const groups: { [month: string]: AcademicEvent[] } = {};
    filteredEvents.forEach((ev) => {
      const month = formatMonthHeader(ev.date);
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(ev);
    });
    return groups;
  }, [filteredEvents]);

  const totalHardCutoffs = useMemo(
    () => allEvents.filter((e) => isHardCutoff(e)).length,
    [allEvents],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface-100 border-l border-border-default text-foreground p-0 flex flex-col overflow-hidden"
        data-testid="agenda-calendar-sheet"
      >
        {/* Sticky Header */}
        <SheetHeader className="p-5 sm:p-6 border-b border-border-default bg-surface-100/95 backdrop-blur-sm shrink-0 pr-10">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-brand font-mono text-sm font-semibold">
              <CalendarIcon className="size-4 text-brand" />
              <span>ACADEMIC CALENDAR</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono py-0 px-1.5 border-destructive/30 text-destructive bg-destructive/10 flex items-center gap-1"
            >
              <Flame className="size-3" />
              <span className="tabular-nums">{totalHardCutoffs} Hard Cutoffs</span>
            </Badge>
          </div>
          <SheetTitle className="text-balance text-xl sm:text-2xl font-semibold text-foreground">
            Canonical Semester Schedule
          </SheetTitle>
          <SheetDescription className="text-pretty text-xs sm:text-sm text-foreground-light">
            Official deadlines, weekly submissions, exam dates, and irreversible eligibility gates
            for September 2026.
          </SheetDescription>
        </SheetHeader>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-border-default bg-surface-200/50 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <Input
                aria-label="Search canonical events"
                placeholder="Search canonical events, assessments, dates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-surface-100 border-border-default text-sm h-9"
              />
            </div>

            {/* View Pill Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {VIEW_FILTERS.map((vf) => (
                <button
                  type="button"
                  key={vf.id}
                  onClick={() => setSelectedView(vf.id)}
                  aria-pressed={selectedView === vf.id}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    selectedView === vf.id
                      ? "bg-brand text-black font-semibold"
                      : "bg-surface-100 hover:bg-surface-200 text-foreground-light border border-border-default"
                  }`}
                >
                  {vf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Course Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-foreground-light font-medium flex items-center gap-1 mr-1">
              <Filter className="size-3" /> Course:
            </span>
            {COURSE_FILTERS.map((cf) => (
              <button
                type="button"
                key={cf.id}
                onClick={() => setSelectedCourse(cf.id)}
                aria-pressed={selectedCourse === cf.id}
                className={`text-xs font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
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

        {/* Scrollable Events List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
          {Object.keys(groupedByMonth).length === 0 ? (
            <div className="py-16 text-center text-foreground-muted text-sm">
              No canonical events match your current filter settings.
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([month, events]) => (
              <div key={month} className="flex flex-col gap-3">
                {/* Month Group Header */}
                <div className="sticky top-0 z-10 bg-surface-100/95 backdrop-blur-sm py-1.5 px-2 border-b border-border-default flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold uppercase text-foreground-light">
                    {month}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-foreground-lighter">
                    {events.length} {events.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Event Cards */}
                <div className="flex flex-col gap-2.5">
                  {events.map((ev) => {
                    const relative = formatRelativeDays(ev.date, referenceDate);
                    const isPast = ev.date < referenceDate;
                    const isToday = ev.date === referenceDate;
                    const isHard = isHardCutoff(ev);

                    return (
                      <div
                        key={ev.id}
                        className={`rounded-lg border p-3.5 sm:p-4 transition-all ${
                          isHard
                            ? "bg-destructive/10 border-destructive/30 hover:border-destructive/50"
                            : "bg-surface-100 hover:bg-surface-200 border-border-default"
                        } ${isPast ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Date Block */}
                          <div
                            className={`flex flex-col items-center justify-center rounded border px-2.5 py-1.5 shrink-0 min-w-[58px] ${
                              isHard
                                ? "bg-destructive/10 border-destructive/40 text-destructive"
                                : "bg-surface-200 border-border-default text-foreground-lighter"
                            }`}
                          >
                            <span className="text-[10px] font-mono uppercase">
                              {new Date(ev.date).toLocaleDateString("en-US", {
                                weekday: "short",
                              })}
                            </span>
                            <span className="font-mono text-base sm:text-lg font-bold text-foreground leading-none my-0.5 tabular-nums">
                              {new Date(ev.date).getDate()}
                            </span>
                            <span className="text-[9px] font-mono tabular-nums opacity-80">
                              {ev.time?.replace(" IST", "") || "23:59"}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ev.courseCode ? (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[11px] py-0 px-1.5 border-border-default font-semibold text-brand"
                                >
                                  {ev.courseCode}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] py-0 px-1.5 border-border-default text-foreground-lighter"
                                >
                                  Term Event
                                </Badge>
                              )}

                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono py-0 px-1.5 capitalize ${getEventColor(
                                  ev,
                                )}`}
                              >
                                {ev.type.replace("_", " ")}
                              </Badge>

                              {isHard && (
                                <Badge className="text-[10px] font-mono py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/40 flex items-center gap-1">
                                  <AlertTriangle className="size-2.5" />
                                  Hard Cutoff
                                </Badge>
                              )}

                              <span
                                className={`ml-auto font-mono text-[11px] font-medium tabular-nums ${
                                  isToday ? "text-brand font-bold" : "text-foreground-lighter"
                                }`}
                              >
                                {relative}
                              </span>
                            </div>

                            <h4 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                              {ev.title}
                            </h4>

                            {ev.description && (
                              <p className="text-pretty text-xs text-foreground-light leading-relaxed">
                                {ev.description}
                              </p>
                            )}

                            {ev.source?.documentName && (
                              <div className="pt-1 flex items-center gap-1 text-[11px] font-mono text-foreground-lighter">
                                <span>Source:</span>
                                <span>{ev.source.documentName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
