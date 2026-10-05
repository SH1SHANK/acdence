import * as React from "react";
import type { EmailMessage, EmailEvent } from "@/types/email";
import type { CourseCode } from "@/types/course";
import { PageContainer } from "@/components/fragments/PageContainer";
import {
  PageHeader,
  PageHeaderMeta,
  PageHeaderIcon,
  PageHeaderSummary,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/fragments/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  RefreshCw,
  Sparkles,
  Inbox,
  ChevronRight,
  ShieldCheck,
  Tag,
  Cloud,
} from "lucide-react";
import { EmailDetailSheet } from "@/components/sheets/EmailDetailSheet";

export interface EmailsViewProps {
  emails: EmailMessage[];
  importantEmails: EmailMessage[];
  relevantEmails: EmailMessage[];
  emailEvents: EmailEvent[];
  upcomingEmailEvents: EmailEvent[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  onSelectCourse?: (code: CourseCode) => void;
  onNavigateToDashboard?: () => void;
  isAuthenticated?: boolean;
  onOpenSync?: () => void;
}

type EmailTab = "important" | "relevant" | "deadlines" | "all";

export const EmailsView: React.FC<EmailsViewProps> = React.memo(
  ({
    emails,
    importantEmails,
    relevantEmails,
    emailEvents: _emailEvents,
    upcomingEmailEvents,
    loading = false,
    error = null,
    onRefresh,
    onSelectCourse,
    onNavigateToDashboard,
    isAuthenticated = false,
    onOpenSync,
  }) => {
    const [activeTab, setActiveTab] = React.useState<EmailTab>("important");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCourse, setSelectedCourse] = React.useState<string>("ALL");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
    const [hideDuplicates, setHideDuplicates] = React.useState(false);
    const [activeEmail, setActiveEmail] = React.useState<EmailMessage | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleRefresh = async () => {
      if (!onRefresh) return;
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    };

    // Filter emails based on active tab and search/filter controls
    const filteredEmails = React.useMemo(() => {
      let baseList: EmailMessage[] = [];
      if (activeTab === "important") {
        baseList = importantEmails;
      } else if (activeTab === "relevant") {
        baseList = relevantEmails;
      } else if (activeTab === "deadlines") {
        baseList = emails.filter((e) => Boolean(e.deadline || e.eventTitle));
      } else {
        baseList = emails;
      }

      return baseList.filter((email) => {
        // Search filter matching: subject, sender, summary, course, event title, body
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchSubject = email.subject?.toLowerCase().includes(q);
          const matchSender =
            email.senderName?.toLowerCase().includes(q) ||
            email.senderEmail?.toLowerCase().includes(q);
          const matchSummary = email.emailSummary?.toLowerCase().includes(q);
          const matchBody = email.emailBody?.toLowerCase().includes(q);
          const matchEvent = email.eventTitle?.toLowerCase().includes(q);
          const matchCourse = email.courseCode?.toLowerCase().includes(q);
          const matchEvidence = email.evidence?.toLowerCase().includes(q);

          if (
            !matchSubject &&
            !matchSender &&
            !matchSummary &&
            !matchBody &&
            !matchEvent &&
            !matchCourse &&
            !matchEvidence
          ) {
            return false;
          }
        }

        // Course filter
        if (selectedCourse !== "ALL") {
          if (email.courseCode?.toUpperCase() !== selectedCourse.toUpperCase()) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== "ALL") {
          if (email.category?.toUpperCase() !== selectedCategory.toUpperCase()) {
            return false;
          }
        }

        // Duplicate filter
        if (hideDuplicates) {
          if (
            email.duplicateStatus === "EXACT_DUPLICATE" ||
            email.duplicateStatus === "LIKELY_DUPLICATE"
          ) {
            return false;
          }
        }

        return true;
      });
    }, [
      activeTab,
      emails,
      importantEmails,
      relevantEmails,
      searchQuery,
      selectedCourse,
      selectedCategory,
      hideDuplicates,
    ]);

    const categories = React.useMemo(() => {
      const set = new Set<string>();
      emails.forEach((e) => {
        if (e.category) set.add(e.category);
      });
      return Array.from(set).sort();
    }, [emails]);

    return (
      <PageContainer size="default">
        {/* Page Header */}
        <PageHeader>
          <PageHeaderMeta>
            <PageHeaderIcon>
              <Mail className="size-5 text-brand" />
            </PageHeaderIcon>
            <PageHeaderSummary>
              <PageHeaderTitle>Institute Email Intelligence</PageHeaderTitle>
              <PageHeaderDescription>
                Google Workspace Studio · AI-extracted academic notices, course announcements &
                deadlines
              </PageHeaderDescription>
            </PageHeaderSummary>
          </PageHeaderMeta>

          <PageHeaderActions>
            <Button
              variant="outline"
              size="small"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 text-brand ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            {onNavigateToDashboard && (
              <Button
                variant="outline"
                size="small"
                onClick={onNavigateToDashboard}
                className="gap-1.5"
              >
                <span>Command Center</span>
              </Button>
            )}
          </PageHeaderActions>
        </PageHeader>

        {/* Quick Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 rounded-lg border border-border-default bg-surface-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-foreground-lighter block">
                Total Ingested
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-foreground mt-0.5 block tabular-nums">
                {emails.length}
              </span>
            </div>
            <span className="p-1.5 sm:p-2 rounded-md bg-surface-200 text-foreground-light">
              <Inbox className="size-4" />
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-amber-400/90 block">Important</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-0.5 block tabular-nums">
                {importantEmails.length}
              </span>
            </div>
            <span className="p-1.5 sm:p-2 rounded-md bg-amber-500/10 text-amber-400">
              <AlertCircle className="size-4" />
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-lg border border-border-default bg-surface-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-foreground-lighter block">
                Active Deadlines
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-brand mt-0.5 block tabular-nums">
                {upcomingEmailEvents.length}
              </span>
            </div>
            <span className="p-1.5 sm:p-2 rounded-md bg-surface-200 text-brand">
              <Calendar className="size-4" />
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-lg border border-border-default bg-surface-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-foreground-lighter block">Relevant</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-sky-400 mt-0.5 block tabular-nums">
                {relevantEmails.length}
              </span>
            </div>
            <span className="p-1.5 sm:p-2 rounded-md bg-surface-200 text-sky-400">
              <Sparkles className="size-4" />
            </span>
          </div>
        </div>

        {/* Primary Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Button
              variant={activeTab === "important" ? "default" : "ghost"}
              size="small"
              onClick={() => setActiveTab("important")}
              className={`gap-1.5 shrink-0 ${
                activeTab === "important"
                  ? "bg-surface-200 text-amber-400 border border-amber-500/30"
                  : ""
              }`}
            >
              <AlertCircle className="size-3.5 text-amber-400" />
              <span>Important</span>
              <Badge variant="outline" className="text-[10px] ml-1 bg-surface-300 font-mono px-1">
                {importantEmails.length}
              </Badge>
            </Button>

            <Button
              variant={activeTab === "relevant" ? "default" : "ghost"}
              size="small"
              onClick={() => setActiveTab("relevant")}
              className={`gap-1.5 shrink-0 ${
                activeTab === "relevant"
                  ? "bg-surface-200 text-brand border border-border-default"
                  : ""
              }`}
            >
              <Sparkles className="size-3.5 text-brand" />
              <span>Relevant</span>
              <Badge variant="outline" className="text-[10px] ml-1 bg-surface-300 font-mono px-1">
                {relevantEmails.length}
              </Badge>
            </Button>

            <Button
              variant={activeTab === "deadlines" ? "default" : "ghost"}
              size="small"
              onClick={() => setActiveTab("deadlines")}
              className={`gap-1.5 shrink-0 ${
                activeTab === "deadlines"
                  ? "bg-surface-200 text-foreground border border-border-default"
                  : ""
              }`}
            >
              <Calendar className="size-3.5 text-foreground-light" />
              <span>Deadlines</span>
              <Badge variant="outline" className="text-[10px] ml-1 bg-surface-300 font-mono px-1">
                {upcomingEmailEvents.length}
              </Badge>
            </Button>

            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="small"
              onClick={() => setActiveTab("all")}
              className={`gap-1.5 shrink-0 ${
                activeTab === "all"
                  ? "bg-surface-200 text-foreground border border-border-default"
                  : ""
              }`}
            >
              <Inbox className="size-3.5 text-foreground-light" />
              <span>All Emails</span>
              <Badge variant="outline" className="text-[10px] ml-1 bg-surface-300 font-mono px-1">
                {emails.length}
              </Badge>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground-lighter pointer-events-none" />
            <Input
              type="text"
              placeholder="Search sender, subject, summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-surface-100 border-border-default focus-visible:ring-brand"
            />
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-foreground-lighter flex items-center gap-1 font-mono text-[11px]">
            <Filter className="size-3" /> Filters:
          </span>

          {/* Course filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {["ALL", "CS2005", "CS2006", "SE2001", "MS2001", "CS2006P"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCourse(code)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border shrink-0 ${
                  selectedCourse === code
                    ? "bg-surface-200 border-brand/40 text-brand font-medium"
                    : "bg-surface-100 border-border-default text-foreground-lighter hover:text-foreground hover:bg-surface-200"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 rounded bg-surface-100 border border-border-default text-foreground font-mono text-[11px] focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* Duplicate toggle */}
          <label className="flex items-center gap-1.5 ml-auto cursor-pointer select-none text-foreground-lighter hover:text-foreground">
            <input
              type="checkbox"
              checked={hideDuplicates}
              onChange={(e) => setHideDuplicates(e.target.checked)}
              className="rounded border-border-default size-3.5 accent-brand"
            />
            <span className="text-[11px] font-mono">Hide Duplicates</span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email Cards List: Redesigned around Email Summary as Primary Presentation */}
        {filteredEmails.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredEmails.map((email) => {
              const formattedReceived = email.receivedAt
                ? new Date(email.receivedAt).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : null;

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

              const isDuplicate =
                email.duplicateStatus === "EXACT_DUPLICATE" ||
                email.duplicateStatus === "LIKELY_DUPLICATE" ||
                email.duplicateStatus === "POSSIBLE_DUPLICATE";

              const displaySummary =
                email.emailSummary ||
                email.evidence ||
                (email.emailBody
                  ? email.emailBody
                      .replace(/<[^>]+>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 200) + "..."
                  : null);

              return (
                <article
                  key={email.id || email.providerMessageId}
                  onClick={() => setActiveEmail(email)}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isImportant
                      ? "bg-surface-100 hover:bg-surface-200 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-surface-100 hover:bg-surface-200 border-border-default hover:border-border-studio"
                  } ${isDuplicate ? "opacity-75" : ""}`}
                >
                  {/* Top row: Sender, Officiality, Importance, and Timestamp */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {email.senderName || "Unknown Sender"}
                      </span>
                      {email.senderEmail && (
                        <span className="text-foreground-lighter font-mono text-[11px] truncate hidden md:inline">
                          &lt;{email.senderEmail}&gt;
                        </span>
                      )}
                      {email.officiality && email.officiality !== "UNKNOWN" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-1 py-0 hidden sm:inline-flex items-center gap-0.5"
                        >
                          <ShieldCheck className="size-2.5" />
                          {email.officiality}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-foreground-lighter font-mono text-[11px]">
                      {email.importance && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1.5 py-0 ${
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
                      {formattedReceived && (
                        <span className="tabular-nums">{formattedReceived}</span>
                      )}
                      <ChevronRight className="size-3.5 text-foreground-lighter group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Subject Line */}
                  <h3 className="text-sm font-semibold font-heading text-foreground group-hover:text-brand transition-colors line-clamp-1">
                    {email.subject || "No Subject"}
                  </h3>

                  {/* PRIMARY PRESENTATION: Gemini-Generated Email Summary */}
                  {displaySummary && (
                    <div className="text-xs text-foreground-light leading-relaxed line-clamp-3 bg-surface-200/40 p-2.5 rounded-lg border border-border-default/60">
                      <p className="text-pretty">{displaySummary}</p>
                    </div>
                  )}

                  {/* Required Action Callout (if active) */}
                  {email.requiredAction && (
                    <div className="text-xs text-amber-400 font-medium line-clamp-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>Action: {email.requiredAction}</span>
                    </div>
                  )}

                  {/* Bottom row: Course, Category, Deadline, and Deduplication Meta */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                    {email.courseCode && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-surface-200 text-brand border-brand/30 px-1.5 py-0"
                      >
                        <BookOpen className="size-2.5 mr-1" />
                        {email.courseCode}
                      </Badge>
                    )}

                    {email.category && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-surface-200 text-foreground-light border-border-default px-1.5 py-0 flex items-center gap-1"
                      >
                        <Tag className="size-2.5 text-foreground-lighter" />
                        {email.category}
                      </Badge>
                    )}

                    {formattedDeadline && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5 py-0 flex items-center gap-1 tabular-nums"
                      >
                        <Clock className="size-2.5" />
                        <span>Due {formattedDeadline}</span>
                      </Badge>
                    )}

                    {email.duplicateStatus && email.duplicateStatus !== "NEW_EMAIL" && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono px-1.5 py-0 ${
                          email.duplicateStatus === "UPDATE_TO_EXISTING_INFORMATION"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : "bg-surface-200 text-amber-400/80 border-border-default"
                        }`}
                      >
                        {email.duplicateStatus.replace(/_/g, " ")}
                      </Badge>
                    )}

                    {email.confidence && (
                      <span className="text-[10px] font-mono text-foreground-lighter ml-auto tabular-nums hidden sm:inline">
                        AI Confidence:{" "}
                        {Math.round(parseFloat(email.confidence) * 100) || email.confidence}%
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : !isAuthenticated && emails.length === 0 ? (
          <div className="p-12 rounded-lg border border-border-default bg-surface-100 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-3 rounded-full bg-brand/10 text-brand border border-brand/20">
              <Cloud className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Sign In to View Academic Emails
              </h3>
              <p className="text-xs text-foreground-lighter mt-1 max-w-sm">
                Official institute notices, deadline extensions, and exam advisories are protected.
                Sign in with your email to load and synchronize your communications.
              </p>
            </div>
            {onOpenSync && (
              <Button
                variant="default"
                size="small"
                onClick={onOpenSync}
                className="gap-1.5 text-xs bg-brand hover:bg-brand/90 text-brand-foreground font-medium cursor-pointer mt-1"
              >
                <Mail className="size-3.5" />
                <span>Sign In to Sync Emails</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-12 rounded-lg border border-border-default bg-surface-100 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-3 rounded-full bg-surface-200 text-foreground-lighter">
              <Mail className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">No Emails Found</h3>
              <p className="text-xs text-foreground-lighter mt-1 max-w-sm">
                {searchQuery || selectedCourse !== "ALL" || selectedCategory !== "ALL"
                  ? "No email messages match your active search and filter criteria."
                  : activeTab === "important"
                    ? "No high-priority or official important email notices recorded yet."
                    : activeTab === "deadlines"
                      ? "No email-derived deadlines found in the mailbox."
                      : "No email records ingested from Google Workspace Studio yet."}
              </p>
            </div>
            {(searchQuery || selectedCourse !== "ALL" || selectedCategory !== "ALL") && (
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCourse("ALL");
                  setSelectedCategory("ALL");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Email Detail Sheet Surface */}
        <EmailDetailSheet
          email={activeEmail}
          open={Boolean(activeEmail)}
          onOpenChange={(open) => {
            if (!open) setActiveEmail(null);
          }}
          onSelectCourse={(code) => {
            if (onSelectCourse) {
              onSelectCourse(code as CourseCode);
            }
          }}
        />
      </PageContainer>
    );
  },
);

EmailsView.displayName = "EmailsView";
