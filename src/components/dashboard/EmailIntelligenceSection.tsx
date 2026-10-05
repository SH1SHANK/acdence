import * as React from "react";
import type { EmailMessage, EmailEvent } from "@/types/email";
import type { CourseCode } from "@/types/course";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  FileCheck,
  GraduationCap,
  Bell,
  Sparkles,
  Tag,
} from "lucide-react";

export interface EmailIntelligenceSectionProps {
  emails: EmailMessage[];
  importantEmails: EmailMessage[];
  relevantEmails: EmailMessage[];
  emailEvents: EmailEvent[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  onSelectEmail?: (email: EmailMessage) => void;
  onSelectCourse?: (code: CourseCode) => void;
  onNavigateToEmails?: () => void;
  isAuthenticated?: boolean;
  onOpenSync?: () => void;
}

export const EmailIntelligenceSection: React.FC<EmailIntelligenceSectionProps> = React.memo(
  ({
    emails,
    importantEmails,
    relevantEmails,
    emailEvents: _emailEvents,
    loading = false,
    error = null,
    onRefresh,
    onSelectEmail,
    onSelectCourse: _onSelectCourse,
    onNavigateToEmails,
    isAuthenticated = false,
    onOpenSync,
  }) => {
    // 1. Calculate Real Category Counts (Zero Invented Numbers!)
    const categoryStats = React.useMemo(() => {
      let importantCount = 0;
      let deadlineCount = 0;
      let assignmentCount = 0;
      let examCount = 0;
      let actionCount = 0;
      let announcementCount = 0;

      for (const email of emails) {
        const isImportant =
          email.classification === "OFFICIAL_IMPORTANT" || email.importance === "HIGH";
        if (isImportant) importantCount++;

        const hasDeadline = Boolean(email.deadline);
        if (hasDeadline) deadlineCount++;

        const cat = (email.category || "").toUpperCase();
        const evt = (email.eventType || "").toUpperCase();

        if (cat === "ASSIGNMENT" || evt === "ASSIGNMENT") {
          assignmentCount++;
        }

        if (
          cat === "EXAM" ||
          cat === "EXAM_ADVISORY" ||
          evt === "EXAM" ||
          evt === "OPPE" ||
          evt === "QUIZ"
        ) {
          examCount++;
        }

        if (
          cat === "ACTION_REQUIRED" ||
          Boolean(email.requiredAction && email.requiredAction.trim().length > 0)
        ) {
          actionCount++;
        }

        if (
          cat === "ANNOUNCEMENT" ||
          cat === "COURSE_ANNOUNCEMENT" ||
          cat === "SESSION" ||
          cat === "ACADEMIC"
        ) {
          announcementCount++;
        }
      }

      return [
        {
          id: "important",
          label: "Important",
          count: importantCount,
          icon: AlertCircle,
          colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        },
        {
          id: "deadlines",
          label: "Deadlines",
          count: deadlineCount,
          icon: Calendar,
          colorClass: "text-brand bg-brand/10 border-brand/30",
        },
        {
          id: "assignments",
          label: "Assignments",
          count: assignmentCount,
          icon: FileCheck,
          colorClass: "text-sky-400 bg-sky-500/10 border-sky-500/30",
        },
        {
          id: "exams",
          label: "Exams",
          count: examCount,
          icon: GraduationCap,
          colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        },
        {
          id: "actions",
          label: "Action Required",
          count: actionCount,
          icon: AlertCircle,
          colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        },
        {
          id: "announcements",
          label: "Announcements",
          count: announcementCount,
          icon: Bell,
          colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        },
      ];
    }, [emails]);

    // 2. Select up to 3-4 top urgent/important/relevant email previews
    const previewEmails = React.useMemo(() => {
      const seen = new Set<string>();
      const combined: EmailMessage[] = [];

      for (const e of importantEmails) {
        const key = e.id || e.providerMessageId;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(e);
        }
        if (combined.length >= 3) break;
      }

      if (combined.length < 3) {
        for (const e of relevantEmails) {
          const key = e.id || e.providerMessageId;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(e);
          }
          if (combined.length >= 3) break;
        }
      }

      if (combined.length < 3) {
        for (const e of emails) {
          const key = e.id || e.providerMessageId;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(e);
          }
          if (combined.length >= 3) break;
        }
      }

      return combined;
    }, [emails, importantEmails, relevantEmails]);

    return (
      <div className="flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-surface-200 border border-border-default text-brand">
                <Sparkles className="size-3.5" />
              </span>
              <h2 className="text-balance text-base font-semibold font-heading tracking-tight text-foreground">
                Email Intelligence
              </h2>
            </div>
            <p className="text-pretty text-xs text-foreground-light mt-0.5">
              AI-extracted notices & deadlines from Google Workspace Studio
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onRefresh && (
              <Button
                variant="outline"
                size="small"
                onClick={() => void onRefresh()}
                disabled={loading}
                className="gap-1.5 text-xs text-foreground hover:bg-surface-200"
                aria-label="Refresh Emails"
              >
                <span>Refresh</span>
              </Button>
            )}
            {onNavigateToEmails && (
              <Button
                variant="outline"
                size="small"
                onClick={onNavigateToEmails}
                className="gap-1.5 text-xs text-foreground hover:bg-surface-200"
              >
                <span>View All Emails</span>
                <ArrowRight className="size-3.5 text-brand" />
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert if ingestion/sync failed */}
        {error && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center justify-between gap-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="tiny"
                onClick={() => void onRefresh()}
                className="shrink-0 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/20"
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Category Summary Row: Horizontally scrollable on mobile */}
        <div className="flex overflow-x-auto gap-2.5 pb-1 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 scrollbar-none">
          {categoryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                onClick={onNavigateToEmails}
                className="p-3 rounded-xl border border-border-default bg-surface-100 hover:bg-surface-200/80 transition-colors flex flex-col justify-between gap-1.5 shrink-0 min-w-[130px] sm:min-w-0 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-mono text-foreground-lighter truncate">
                    {stat.label}
                  </span>
                  <span className={`p-1 rounded-md border ${stat.colorClass}`}>
                    <Icon className="size-3" />
                  </span>
                </div>
                <span className="text-xl font-bold font-mono text-foreground tabular-nums">
                  {stat.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recent Previews using AI Summary as Primary Presentation */}
        {previewEmails.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {previewEmails.map((email) => {
              const formattedDeadline = email.deadline
                ? new Date(email.deadline).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }) + " IST"
                : null;

              const isImportant =
                email.classification === "OFFICIAL_IMPORTANT" || email.importance === "HIGH";

              const displaySummary =
                email.emailSummary ||
                email.evidence ||
                (email.emailBody
                  ? email.emailBody
                      .replace(/<[^>]+>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 160) + "..."
                  : "No summary available.");

              return (
                <article
                  key={email.id || email.providerMessageId}
                  onClick={() => onSelectEmail?.(email)}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isImportant
                      ? "bg-surface-100 hover:bg-surface-200 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-surface-100 hover:bg-surface-200 border-border-default hover:border-border-studio"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    {/* Top Row: Sender + Importance */}
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {email.senderName || "Institute Admin"}
                      </span>
                      {email.importance && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1 py-0 ${
                            email.importance === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/40 font-semibold"
                              : email.importance === "MEDIUM"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                : "bg-surface-200 text-foreground-lighter border-border-default"
                          }`}
                        >
                          {email.importance}
                        </Badge>
                      )}
                    </div>

                    {/* Subject Line */}
                    <h3 className="text-xs sm:text-sm font-semibold font-heading text-foreground group-hover:text-brand transition-colors line-clamp-1 leading-snug">
                      {email.subject || "Academic Notice"}
                    </h3>

                    {/* Primary AI Summary Preview */}
                    <p className="text-xs text-foreground-light leading-relaxed line-clamp-2 text-pretty">
                      {displaySummary}
                    </p>
                  </div>

                  {/* Bottom Meta Badges: Course, Category, Deadline */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border-default/50 text-[10px] font-mono">
                    {email.courseCode && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono bg-surface-200 text-brand border-brand/30 px-1 py-0"
                      >
                        <BookOpen className="size-2.5 mr-1" />
                        {email.courseCode}
                      </Badge>
                    )}

                    {email.category && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono bg-surface-200 text-foreground-light border-border-default px-1 py-0 flex items-center gap-0.5"
                      >
                        <Tag className="size-2 text-foreground-lighter" />
                        {email.category}
                      </Badge>
                    )}

                    {formattedDeadline && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border-amber-500/30 px-1 py-0 flex items-center gap-0.5 ml-auto tabular-nums"
                      >
                        <Clock className="size-2" />
                        <span>Due {formattedDeadline}</span>
                      </Badge>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-border-default bg-surface-100/60 text-center flex flex-col items-center justify-center gap-2.5 text-xs text-foreground-lighter">
            <Mail className="size-5 text-foreground-lighter" />
            <span>
              {!isAuthenticated
                ? "Institute email notices and deadlines are secured. Sign in to sync your updates."
                : "No incoming email notices recorded yet."}
            </span>
            {!isAuthenticated && onOpenSync && (
              <Button
                variant="outline"
                size="small"
                onClick={onOpenSync}
                className="gap-1.5 text-xs text-brand hover:bg-surface-200 border-brand/30 cursor-pointer mt-0.5"
              >
                <Mail className="size-3.5" />
                <span>Sign In to Sync</span>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmailIntelligenceSection.displayName = "EmailIntelligenceSection";
