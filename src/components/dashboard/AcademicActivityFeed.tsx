import * as React from "react";
import type { DbGradeRecord } from "@/types/gradeRecord";
import type { EmailMessage } from "@/types/email";
import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";
import { Badge } from "@/components/ui/badge";
import { Activity, GraduationCap, Mail, Calendar, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AcademicActivityFeedProps {
  portalRecords: DbGradeRecord[];
  emails: EmailMessage[];
  events: AcademicEvent[];
  todayDate: string;
  onSelectEmail?: (email: EmailMessage) => void;
  onSelectCourse?: (code: CourseCode) => void;
  onNavigateToCalendar?: (eventId?: string) => void;
  onNavigateToEmails?: () => void;
}

type ActivityType = "all" | "grade" | "email" | "deadline";

interface UnifiedActivityItem {
  id: string;
  type: "grade" | "email" | "deadline";
  title: string;
  subtitle: string;
  timestamp: string;
  timestampFormatted: string;
  courseCode?: CourseCode;
  importance?: string | null;
  score?: number | null;
  rawItem?: any;
}

export const AcademicActivityFeed: React.FC<AcademicActivityFeedProps> = React.memo(
  function AcademicActivityFeed({
    portalRecords,
    emails,
    events,
    todayDate,
    onSelectEmail,
    onSelectCourse,
    onNavigateToCalendar,
    onNavigateToEmails: _onNavigateToEmails,
  }) {
    const [activeFilter, setActiveFilter] = React.useState<ActivityType>("all");

    // 1. Unify and sort all events chronologically
    const activities = React.useMemo<UnifiedActivityItem[]>(() => {
      const items: UnifiedActivityItem[] = [];

      // 1. Grade updates from portal records
      for (const rec of portalRecords) {
        if (rec.captured_at || rec.updated_at) {
          const time = rec.captured_at || rec.updated_at;
          items.push({
            id: `grade-${rec.external_assignment_id || rec.id || Math.random()}`,
            type: "grade",
            title: rec.title || "Portal Grade Recorded",
            subtitle: `${rec.course_code} · ${rec.assignment_type || "Assignment"} · Score: ${rec.your_score ?? "Pending"}`,
            timestamp: time,
            timestampFormatted: new Date(time).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            courseCode: rec.course_code as CourseCode,
            score: rec.your_score,
            rawItem: rec,
          });
        }
      }

      // 2. Email notices
      for (const email of emails) {
        const time = email.receivedAt || email.processedAt || new Date().toISOString();
        items.push({
          id: `email-${email.id || email.providerMessageId}`,
          type: "email",
          title: email.subject || "Institute Email Notice",
          subtitle: `${email.senderName || "Admin"} · ${email.emailSummary || email.category || "General Notice"}`,
          timestamp: time,
          timestampFormatted: new Date(time).toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          courseCode: email.courseCode as CourseCode,
          importance: email.importance,
          rawItem: email,
        });
      }

      // 3. Upcoming academic calendar events in next 21 days
      for (const event of events) {
        if (event.date >= todayDate) {
          const eventTime = `${event.date}T${event.time || "23:59:00"}`;
          items.push({
            id: `event-${event.id}`,
            type: "deadline",
            title: event.title,
            subtitle: `${event.courseCode ? `${event.courseCode} · ` : ""}${event.description || "Academic Deadline"}`,
            timestamp: eventTime,
            timestampFormatted: new Date(event.date).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              month: "short",
              day: "numeric",
            }),
            courseCode: event.courseCode,
            rawItem: event,
          });
        }
      }

      // Sort by timestamp descending
      return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12);
    }, [portalRecords, emails, events, todayDate]);

    const filteredActivities = React.useMemo(() => {
      if (activeFilter === "all") return activities;
      return activities.filter((a) => a.type === activeFilter);
    }, [activities, activeFilter]);

    return (
      <div className="w-full flex flex-col gap-4 rounded-xl border border-border-default bg-surface-100 p-4 sm:p-5 shadow-xs">
        {/* Header + Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-surface-200 border border-border-default text-brand">
                <Activity className="size-3.5" />
              </span>
              <h2 className="text-balance text-base font-semibold font-heading tracking-tight text-foreground">
                Recent Academic Activity
              </h2>
            </div>
            <p className="text-pretty text-xs text-foreground-light mt-0.5">
              Unified stream of score captures, AI email notices, and academic deadlines
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-surface-200 p-1 rounded-lg border border-border-default">
            {(
              [
                { id: "all", label: "All" },
                { id: "grade", label: "Grades" },
                { id: "email", label: "Emails" },
                { id: "deadline", label: "Deadlines" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer",
                  activeFilter === filter.id
                    ? "bg-surface-100 text-brand font-medium shadow-xs"
                    : "text-foreground-lighter hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Stream List */}
        {filteredActivities.length > 0 ? (
          <div className="flex flex-col divide-y divide-border-default/50">
            {filteredActivities.map((item) => {
              const Icon =
                item.type === "grade" ? GraduationCap : item.type === "email" ? Mail : Calendar;

              const isImportant =
                item.importance === "HIGH" ||
                item.title.toLowerCase().includes("cutoff") ||
                item.title.toLowerCase().includes("quiz");

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === "email" && onSelectEmail) {
                      onSelectEmail(item.rawItem);
                    } else if (item.courseCode && onSelectCourse) {
                      onSelectCourse(item.courseCode);
                    } else if (item.type === "deadline" && onNavigateToCalendar) {
                      onNavigateToCalendar(item.rawItem.id);
                    }
                  }}
                  className={cn(
                    "group py-3 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer",
                    "hover:bg-surface-200/60",
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={cn(
                        "p-2 rounded-lg border shrink-0 mt-0.5",
                        item.type === "grade"
                          ? "bg-brand/10 border-brand/30 text-brand"
                          : item.type === "email"
                            ? isImportant
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                            : "bg-surface-200 border-border-default text-foreground-light",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold font-heading text-foreground group-hover:text-brand transition-colors truncate">
                          {item.title}
                        </span>
                        {item.courseCode && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono bg-surface-200 text-brand border-brand/30 px-1 py-0"
                          >
                            {item.courseCode}
                          </Badge>
                        )}
                        {item.score !== undefined && item.score !== null && (
                          <span className="text-[10px] font-mono font-bold text-brand tabular-nums">
                            {item.score}/100
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground-light line-clamp-1 mt-0.5 text-pretty">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-foreground-lighter">
                    <span className="hidden sm:inline tabular-nums">{item.timestampFormatted}</span>
                    <ArrowRight className="size-3.5 text-foreground-lighter group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-foreground-lighter flex flex-col items-center justify-center gap-2">
            <Clock className="size-5 text-foreground-lighter" />
            <span>No activity recorded for this category yet.</span>
          </div>
        )}
      </div>
    );
  },
);

AcademicActivityFeed.displayName = "AcademicActivityFeed";
