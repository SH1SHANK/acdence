import * as React from "react";
import type { EmailMessage } from "@/types/email";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  FileText,
  BookOpen,
  Info,
  ShieldCheck,
  Tag,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { sanitizeEmailContent } from "@/lib/sync/emailRepository";

export interface EmailDetailSheetProps {
  email: EmailMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCourse?: (courseCode: string) => void;
}

export const EmailDetailSheet: React.FC<EmailDetailSheetProps> = React.memo(
  ({ email, open, onOpenChange, onSelectCourse }) => {
    const [copied, setCopied] = React.useState(false);
    const [isBodyExpanded, setIsBodyExpanded] = React.useState(false);

    if (!email) return null;

    const formattedReceived = email.receivedAt
      ? new Date(email.receivedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " IST"
      : "Unknown";

    const formattedDeadline = email.deadline
      ? new Date(email.deadline).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " IST"
      : null;

    const formattedStart = email.startAt
      ? new Date(email.startAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " IST"
      : null;

    const formattedEnd = email.endAt
      ? new Date(email.endAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " IST"
      : null;

    const sanitizedBody = sanitizeEmailContent(email.emailBody);

    const handleCopyBody = () => {
      if (email.emailBody) {
        navigator.clipboard.writeText(email.emailBody);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto bg-studio border-l border-border-studio p-0 flex flex-col gap-0 text-foreground"
        >
          {/* 1. Header Area: Subject, Sender, Timestamp, Priority Badges */}
          <div className="p-5 sm:p-6 border-b border-border-default flex flex-col gap-3 bg-surface-100/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-md bg-surface-200 border border-border-default text-brand shrink-0">
                  <Mail className="size-4" />
                </span>
                <span className="text-xs font-mono text-foreground-lighter truncate">
                  ID: {email.providerMessageId.slice(0, 16)}...
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono tracking-wider bg-surface-200 text-foreground-light border-border-default shrink-0"
              >
                Institute Notice
              </Badge>
            </div>

            <div>
              <SheetTitle className="text-base sm:text-lg font-semibold font-heading tracking-tight text-foreground leading-snug">
                {email.subject || "No Subject"}
              </SheetTitle>
              <SheetDescription className="text-xs text-foreground-light mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span>
                  From: <strong className="text-foreground">{email.senderName || "Unknown"}</strong>{" "}
                  {email.senderEmail && (
                    <span className="text-foreground-lighter font-mono text-[11px]">
                      &lt;{email.senderEmail}&gt;
                    </span>
                  )}
                </span>
                <span>•</span>
                <span className="font-mono tabular-nums text-foreground-lighter">
                  {formattedReceived}
                </span>
              </SheetDescription>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {email.importance && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-medium ${
                    email.importance === "HIGH"
                      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                      : email.importance === "MEDIUM"
                        ? "border-sky-500/40 text-sky-400 bg-sky-500/10"
                        : "border-border-default text-foreground-lighter bg-surface-200"
                  }`}
                >
                  {email.importance} PRIORITY
                </Badge>
              )}

              {email.classification && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-medium border-border-default text-foreground-light bg-surface-200"
                >
                  {email.classification.replace(/_/g, " ")}
                </Badge>
              )}

              {email.officiality && email.officiality !== "UNKNOWN" && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-medium border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
                >
                  <ShieldCheck className="size-3" />
                  {email.officiality}
                </Badge>
              )}

              {email.category && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-border-default text-foreground-lighter bg-surface-100 flex items-center gap-1"
                >
                  <Tag className="size-2.5" />
                  {email.category}
                </Badge>
              )}

              {email.duplicateStatus && email.duplicateStatus !== "NEW_EMAIL" && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    email.duplicateStatus === "UPDATE_TO_EXISTING_INFORMATION"
                      ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10"
                      : "border-amber-500/30 text-amber-400/80 bg-surface-200"
                  }`}
                >
                  {email.duplicateStatus.replace(/_/g, " ")}
                </Badge>
              )}

              {email.confidence && (
                <span className="text-[10px] font-mono text-foreground-lighter ml-auto tabular-nums">
                  Confidence: {Math.round(parseFloat(email.confidence) * 100) || email.confidence}%
                </span>
              )}
            </div>
          </div>

          {/* 2. Main Content Canvas */}
          <div className="p-5 sm:p-6 flex flex-col gap-5 flex-1">
            {/* Summary Box (Primary Presentation) */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold font-heading uppercase tracking-wider text-brand">
                <Sparkles className="size-3.5 text-brand" />
                <span>Executive Summary</span>
              </div>
              <div className="p-3.5 sm:p-4 rounded-xl border border-brand/30 bg-surface-100/90 leading-relaxed text-xs sm:text-sm text-foreground">
                {email.emailSummary ? (
                  <p className="text-pretty">{email.emailSummary}</p>
                ) : (
                  <p className="text-foreground-lighter italic">
                    {email.evidence
                      ? email.evidence
                      : "No concise summary was generated for this email. See original email body below."}
                  </p>
                )}
              </div>
            </section>

            {/* Academic Information & Extracted Action/Time Card */}
            {(email.eventTitle ||
              email.deadline ||
              email.courseCode ||
              email.requiredAction ||
              email.startAt) && (
              <section className="rounded-xl border border-border-default bg-surface-100 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border-default pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-brand" />
                    <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-foreground">
                      Academic Context & Schedule
                    </h3>
                  </div>
                  {email.courseCode && (
                    <button
                      type="button"
                      onClick={() => onSelectCourse?.(email.courseCode as string)}
                      className="text-xs font-mono font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="size-3" />
                      {email.courseCode} {email.courseName ? `· ${email.courseName}` : ""}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {email.eventTitle && (
                    <div className="sm:col-span-2">
                      <span className="text-foreground-lighter block text-[10px] uppercase font-mono">
                        Event Title
                      </span>
                      <span className="font-semibold text-foreground text-sm mt-0.5 block">
                        {email.eventTitle}
                      </span>
                    </div>
                  )}

                  {formattedDeadline && (
                    <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">
                      <span className="text-amber-400 font-mono text-[10px] uppercase block font-semibold flex items-center gap-1">
                        <Clock className="size-3" /> Deadline
                      </span>
                      <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">
                        {formattedDeadline}
                      </span>
                    </div>
                  )}

                  {formattedStart && (
                    <div className="bg-sky-500/10 p-2.5 rounded-lg border border-sky-500/30">
                      <span className="text-sky-400 font-mono text-[10px] uppercase block font-semibold flex items-center gap-1">
                        <Clock className="size-3" /> Event Start
                      </span>
                      <span className="font-medium text-foreground text-xs mt-0.5 block tabular-nums">
                        {formattedStart}
                      </span>
                    </div>
                  )}

                  {formattedEnd && (
                    <div className="bg-surface-200/50 p-2.5 rounded-lg border border-border-default">
                      <span className="text-foreground-lighter font-mono text-[10px] uppercase block font-semibold flex items-center gap-1">
                        <Clock className="size-3" /> Event End
                      </span>
                      <span className="font-medium text-foreground text-xs mt-0.5 block tabular-nums">
                        {formattedEnd}
                      </span>
                    </div>
                  )}

                  {email.location && (
                    <div>
                      <span className="text-foreground-lighter block text-[10px] uppercase font-mono flex items-center gap-1">
                        <MapPin className="size-3" /> Location / Venue
                      </span>
                      <span className="text-foreground font-medium mt-0.5 block">
                        {email.location}
                      </span>
                    </div>
                  )}

                  {email.affectedAssessment && (
                    <div>
                      <span className="text-foreground-lighter block text-[10px] uppercase font-mono">
                        Affected Assessment
                      </span>
                      <span className="text-foreground font-mono font-medium mt-0.5 block">
                        {email.affectedAssessment}
                      </span>
                    </div>
                  )}

                  {email.requiredAction && (
                    <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                      <span className="text-amber-400 font-mono text-[10px] uppercase font-semibold flex items-center gap-1.5">
                        <AlertCircle className="size-3.5 shrink-0" /> Required Action
                      </span>
                      <span className="text-foreground font-medium mt-1 block leading-relaxed">
                        {email.requiredAction}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Evidence Quote */}
            {email.evidence && (
              <section className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter flex items-center gap-1">
                  <Info className="size-3 text-brand" /> Supporting Evidence Excerpt
                </span>
                <blockquote className="text-xs italic text-foreground-light bg-surface-100 border-l-2 border-brand p-3 rounded-r-md leading-relaxed">
                  &ldquo;{email.evidence}&rdquo;
                </blockquote>
              </section>
            )}

            {/* Additional Linked Academic Events */}
            {email.events && email.events.length > 1 && (
              <section className="flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                  All Linked Academic Events ({email.events.length})
                </span>
                <div className="flex flex-col gap-2">
                  {email.events.map((evt, idx) => (
                    <div
                      key={evt.id || idx}
                      className="p-3 rounded-md bg-surface-100 border border-border-default text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{evt.title}</span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {evt.eventType}
                        </Badge>
                      </div>
                      {evt.deadline && (
                        <span className="text-amber-400 font-mono text-[11px] tabular-nums">
                          Deadline:{" "}
                          {new Date(evt.deadline).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          IST
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Processing Notes */}
            {email.processingNotes && (
              <section className="text-xs text-foreground-lighter bg-surface-200/50 p-2.5 rounded-md border border-border-default">
                <span className="font-mono text-[10px] uppercase block text-foreground-light">
                  Processing Notes
                </span>
                <p className="mt-0.5">{email.processingNotes}</p>
              </section>
            )}

            {/* 7. Original Email Content (Secondary / Collapsible) */}
            <section className="flex flex-col gap-2 pt-2 border-t border-border-default">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsBodyExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-semibold font-heading uppercase tracking-wider text-foreground-light hover:text-foreground transition-colors"
                >
                  <FileText className="size-3.5" />
                  <span>Original Email Body</span>
                  {isBodyExpanded ? (
                    <ChevronUp className="size-3.5 text-foreground-lighter" />
                  ) : (
                    <ChevronDown className="size-3.5 text-foreground-lighter" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="text-xs font-mono text-foreground-lighter hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {isBodyExpanded && (
                <div className="mt-1">
                  {sanitizedBody ? (
                    <div className="p-3.5 rounded-lg bg-surface-100 border border-border-default font-mono text-xs text-foreground-light whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-text">
                      {sanitizedBody}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-surface-100 border border-border-default text-xs text-foreground-lighter italic">
                      No raw body text captured for this message.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    );
  },
);

EmailDetailSheet.displayName = "EmailDetailSheet";
