import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CourseCode } from "@/types/course";
import {
  Search,
  BookOpen,
  Calendar,
  CheckSquare,
  Layers,
  FolderDown,
  RefreshCw,
  Flame,
  ArrowRight,
  Sparkles,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Mail,
} from "lucide-react";
import type { EmailMessage } from "@/types/email";

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: "Courses" | "Tools" | "Documents" | "Data" | "Emails";
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

interface CommandMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCourse: (code: CourseCode) => void;
  onOpenCalendar: (filter?: "cutoffs" | "exams" | "project") => void;
  onOpenDocuments: (docId?: string) => void;
  onOpenTasks: () => void;
  onOpenBackup: () => void;
  onOpenReset: () => void;
  onOpenEmails?: () => void;
  emails?: EmailMessage[];
  onSelectEmail?: (email: EmailMessage) => void;
}

export const CommandMenuDialog: React.FC<CommandMenuDialogProps> = ({
  open,
  onOpenChange,
  onOpenCourse,
  onOpenCalendar,
  onOpenDocuments,
  onOpenTasks,
  onOpenBackup,
  onOpenReset,
  onOpenEmails,
  emails = [],
  onSelectEmail,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }

  // Build command registry
  const commands: CommandItem[] = useMemo(
    () => [
      // 1. Courses
      {
        id: "course-cs2005",
        title: "CS2005 — Programming Concepts using Java",
        description: "Theory · 4 Credits · Weekly GrPAs, OPPE 1 & 2, SCT Gates",
        category: "Courses",
        icon: GraduationCap,
        action: () => onOpenCourse("CS2005"),
      },
      {
        id: "course-se2001",
        title: "SE2001 — System Commands",
        description: "Theory · 3 Credits · BPT 1-3 OPPE Gate, 90-min Re-OPPE Rule",
        category: "Courses",
        icon: GraduationCap,
        action: () => onOpenCourse("SE2001"),
      },
      {
        id: "course-cs2006",
        title: "CS2006 — Application Development II",
        description: "Theory · 4 Credits · Dual Formula Branches, Quiz Attendance Gate",
        category: "Courses",
        icon: GraduationCap,
        action: () => onOpenCourse("CS2006"),
      },
      {
        id: "course-cs2006p",
        title: "CS2006P — Application Development II Project",
        description: "Project · 2 Credits · Trekking App V2, 8-Stage Stepper, Viva",
        category: "Courses",
        icon: Layers,
        action: () => onOpenCourse("CS2006P"),
      },
      {
        id: "course-ms2001",
        title: "MS2001 — Business Data Management",
        description: "Theory · 4 Credits · First 9 GAs Average, End Term Gate",
        category: "Courses",
        icon: GraduationCap,
        action: () => onOpenCourse("MS2001"),
      },

      // 2. Tools & Views
      {
        id: "tool-emails",
        title: "Institute Email Intelligence — AI Announcements",
        description: "AI-extracted notices, deadlines, and course communications",
        category: "Tools",
        icon: Mail,
        shortcut: "G E",
        action: () => onOpenEmails?.(),
      },
      {
        id: "tool-calendar",
        title: "Academic Calendar — Full Semester Schedule",
        description: "Canonical events, weekly submissions, exam dates",
        category: "Tools",
        icon: Calendar,
        shortcut: "G C",
        action: () => onOpenCalendar(),
      },
      {
        id: "tool-cutoffs",
        title: "Hard Cutoffs View — Irreversible Academic Gates",
        description: "Quiz 1, SE2001 OPPE, End Term & Project deadlines",
        category: "Tools",
        icon: Flame,
        action: () => onOpenCalendar("cutoffs"),
      },
      {
        id: "tool-tasks",
        title: "Semester Tasks — Kanban Action Board",
        description: "To Do, In Progress, Done, personal assignments",
        category: "Tools",
        icon: CheckSquare,
        shortcut: "G T",
        action: () => onOpenTasks(),
      },
      {
        id: "tool-docs",
        title: "Reference Archive — Official Documents",
        description: "Grading policies, MAD-2 viva SOP, Trekking App spec",
        category: "Tools",
        icon: BookOpen,
        shortcut: "G D",
        action: () => onOpenDocuments(),
      },

      // 3. Documents
      {
        id: "doc-grading",
        title: "Doc: Term Grading System Guidelines",
        description: "Verbatim policies, formulas, and SCT SOP for Sept 2026",
        category: "Documents",
        icon: BookOpen,
        action: () => onOpenDocuments("grading-policy"),
      },
      {
        id: "doc-mad2",
        title: "Doc: MAD-2 Project and Viva Instructions",
        description: "Submission tracks (Nov 17 vs Dec 10) & scoring boundaries",
        category: "Documents",
        icon: BookOpen,
        action: () => onOpenDocuments("mad2-project-viva"),
      },
      {
        id: "doc-viva",
        title: "Doc: Viva Preparation Checklist",
        description: "Dual-camera setup, 10-minute runtime, local checksums",
        category: "Documents",
        icon: BookOpen,
        action: () => onOpenDocuments("viva-preparation"),
      },
      {
        id: "doc-trekking",
        title: "Doc: Trekking Management App V2 Specification",
        description: "Flask, Vue, Celery, Redis architecture requirements",
        category: "Documents",
        icon: BookOpen,
        action: () => onOpenDocuments("trekking-management-app"),
      },

      // 4. Data & Backup
      {
        id: "data-backup",
        title: "Backup & Restore — JSON State Export / Import",
        description: "Export full semester state or restore from backup",
        category: "Data",
        icon: FolderDown,
        action: () => onOpenBackup(),
      },
      {
        id: "data-reset",
        title: "Reset Academic Records — Restore Empty Template",
        description: "Clear local assessment marks and start fresh",
        category: "Data",
        icon: RefreshCw,
        action: () => onOpenReset(),
      },
    ],
    [
      onOpenCourse,
      onOpenCalendar,
      onOpenDocuments,
      onOpenTasks,
      onOpenBackup,
      onOpenReset,
      onOpenEmails,
    ],
  );

  // Dynamic Email Commands
  const emailCommands = useMemo<CommandItem[]>(() => {
    if (!emails || emails.length === 0) return [];
    return emails.map((email) => ({
      id: `email-${email.id || email.providerMessageId}`,
      title: email.subject || "Institute Email Notice",
      description: `${email.senderName ? `${email.senderName} · ` : ""}${
        email.emailSummary || email.category || "Notice"
      }${email.courseCode ? ` · ${email.courseCode}` : ""}`,
      category: "Emails" as const,
      icon: Mail,
      action: () => {
        if (onSelectEmail) onSelectEmail(email);
        else onOpenEmails?.();
      },
    }));
  }, [emails, onSelectEmail, onOpenEmails]);

  // Combine static and dynamic commands
  const allCommands = useMemo(() => [...commands, ...emailCommands], [commands, emailCommands]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;
    const q = search.toLowerCase();
    return allCommands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    });
  }, [allCommands, search]);

  // Reset selected index on filter change
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSelectedIndex(0);
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onOpenChange(false);
        selected.action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 overflow-hidden bg-surface-100 border-border-default shadow-2xl text-foreground"
        data-testid="command-menu-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle className="text-balance">Command Palette</DialogTitle>
          <DialogDescription className="text-pretty">
            Quick navigation and shortcuts
          </DialogDescription>
        </DialogHeader>

        {/* Search Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-default bg-surface-200/50">
          <Search className="size-4 text-foreground-muted shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="cmd-listbox"
            aria-activedescendant={
              filteredCommands[selectedIndex]
                ? `cmd-item-${filteredCommands[selectedIndex].id}`
                : undefined
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search commands or courses"
            placeholder="Type a command or search (e.g. Java, cutoffs, viva, backup)..."
            className="flex-1 bg-transparent text-sm placeholder:text-foreground-muted outline-hidden text-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="text-[11px] font-mono text-foreground-muted hover:text-foreground px-1 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
          <Badge
            variant="outline"
            className="text-[10px] font-mono py-0 px-1 border-border-default text-foreground-lighter"
          >
            ESC
          </Badge>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="cmd-listbox"
          role="listbox"
          aria-label="Commands"
          className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1 scrollbar-none"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground-muted flex flex-col items-center gap-3">
              <p className="text-pretty">No matching commands or courses found for "{search}".</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="px-2.5 py-1 text-xs font-mono bg-surface-200 hover:bg-surface-300 text-brand rounded border border-border-default cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onOpenChange(false);
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  data-selected={isSelected}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-brand/10 text-brand border border-brand/20"
                      : "hover:bg-surface-200 text-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-md shrink-0 ${
                        isSelected ? "bg-brand text-black" : "bg-surface-200 text-foreground-light"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate leading-tight">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground-light truncate leading-normal mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] py-0 px-1 border-border-default text-foreground-lighter uppercase"
                    >
                      {item.category}
                    </Badge>
                    {isSelected && <ArrowRight className="size-3.5 text-brand" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-surface-200/50 border-t border-border-default flex items-center justify-between text-[11px] font-mono text-foreground-lighter">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-200 border border-border-default rounded text-[10px] inline-flex items-center justify-center">
                <ArrowUp className="size-2.5" />
              </kbd>
              <kbd className="px-1 py-0.5 bg-surface-200 border border-border-default rounded text-[10px] inline-flex items-center justify-center">
                <ArrowDown className="size-2.5" />
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-200 border border-border-default rounded text-[10px] inline-flex items-center justify-center">
                <CornerDownLeft className="size-2.5" />
              </kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-200 border border-border-default rounded text-[10px]">
                esc
              </kbd>
              <span>Close</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-brand font-medium">
            <Sparkles className="size-3" />
            <span>Command Center</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
