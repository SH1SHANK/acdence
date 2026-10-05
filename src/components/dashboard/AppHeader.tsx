import * as React from "react";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  BookOpen,
  FolderGit2,
  FileText,
  CheckSquare,
  Search,
  FolderDown,
  FolderUp,
  RotateCcw,
  MoreHorizontal,
  Command,
  Check,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Mail,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveClock } from "@/components/dashboard/LiveClock";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/lib/sync/types";
import type { StudioView } from "@/components/layout/StudioSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AppHeaderProps {
  activeView?: StudioView;
  onSelectView?: (view: StudioView) => void;
  isPreSemester?: boolean;
  onResetData: () => void;
  onOpenCalendar?: () => void;
  onOpenDocuments?: () => void;
  onOpenTasks?: () => void;
  onOpenCommandMenu?: () => void;
  onOpenBackup?: (tab?: "export" | "import") => void;
  onOpenSync?: () => void;
  syncStatus?: SyncStatus;
  isAuthenticated?: boolean;
  pendingDirtyCount?: number;
  taskCount?: number;
}

export const AppHeader = React.memo<AppHeaderProps>(function AppHeader({
  activeView = "dashboard",
  onSelectView,
  isPreSemester = false,
  onResetData,
  onOpenCalendar,
  onOpenDocuments,
  onOpenTasks,
  onOpenCommandMenu,
  onOpenBackup,
  onOpenSync,
  syncStatus = "local",
  isAuthenticated = false,
  pendingDirtyCount = 0,
  taskCount = 0,
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const handleMobileSelect = (view: StudioView) => {
    setIsMobileNavOpen(false);
    onSelectView?.(view);
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 w-full border-b border-border-studio bg-studio/95 backdrop-blur-md transition-colors"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-14 sm:h-15 flex items-center justify-between gap-4">
        {/* =========================================================================
            ZONE 1 (LEFT): Brand / Application Identity + Mobile Drawer Trigger
            Understated, premium lockup: compact monogram + product name + subtle descriptor
            ========================================================================= */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          {/* Mobile Navigation Drawer Sheet */}
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="md:hidden size-8 rounded-md bg-surface-200 border border-border-default flex items-center justify-center text-foreground-lighter hover:text-foreground cursor-pointer shrink-0"
                aria-label="Open Navigation Menu"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 bg-studio border-r border-border-studio p-4 flex flex-col justify-between"
            >
              <div className="flex flex-col gap-5">
                {/* Brand header */}
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-surface-200 border border-border-default flex items-center justify-center text-brand font-bold text-sm">
                    <span className="font-heading text-brand">A</span>
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-bold font-heading text-foreground leading-none">
                      Acdence
                    </SheetTitle>
                    <SheetDescription className="text-[10px] text-foreground-lighter font-mono mt-1 leading-none">
                      September 2026 Term
                    </SheetDescription>
                  </div>
                </div>

                {/* Nav List */}
                <nav className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter px-2 py-1">
                    Workspace
                  </span>
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { id: "courses", label: "Theory Courses", icon: BookOpen },
                    { id: "project", label: "CS2006P Project", icon: FolderGit2 },
                    { id: "calendar", label: "Academic Calendar", icon: CalendarDays },
                    { id: "emails", label: "Institute Emails", icon: Mail },
                    { id: "reference", label: "Reference Docs", icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMobileSelect(item.id as StudioView)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left",
                          isActive
                            ? "bg-surface-200 text-brand font-semibold border border-border-default"
                            : "text-foreground-light hover:text-foreground hover:bg-surface-200/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            isActive ? "text-brand" : "text-foreground-lighter",
                          )}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter px-2 pt-3 pb-1">
                    Tools & Data
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      onOpenTasks?.();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-foreground-light hover:text-foreground hover:bg-surface-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <CheckSquare className="size-4 text-foreground-lighter" />
                      <span>Task Board</span>
                    </div>
                    {taskCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                        {taskCount}
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      onOpenSync?.();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-foreground-light hover:text-foreground hover:bg-surface-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="size-4 text-foreground-lighter" />
                      <span>Cloud Sync</span>
                    </div>
                    <span className="text-[10px] font-mono text-brand capitalize">
                      {syncStatus}
                    </span>
                  </button>
                </nav>
              </div>

              <div className="pt-4 border-t border-border-default flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onOpenCommandMenu?.();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-foreground-lighter hover:text-foreground hover:bg-surface-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="size-4" />
                    <span>Command Palette</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-200 text-[10px] font-mono">
                    ⌘K
                  </kbd>
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <button
            type="button"
            onClick={() => onSelectView?.("dashboard")}
            className="group flex items-center gap-2.5 outline-hidden focus-visible:ring-2 focus-visible:ring-brand rounded-md text-left cursor-pointer"
            title="Acdence · IIT Madras BS Degree (Return to Dashboard)"
          >
            <div
              aria-hidden="true"
              className="size-8 rounded-md bg-surface-200 border border-border-default text-brand flex items-center justify-center font-bold text-xs select-none shadow-xs group-hover:border-brand/40 group-hover:bg-surface-300 transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-brand"
              >
                <path d="M4 20h16M12 4L4 20M12 4l8 16M7 14h10" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm sm:text-base font-bold font-heading text-foreground leading-none">
                Acdence
              </span>
              <span className="hidden sm:inline-block text-[10px] text-foreground-lighter font-normal mt-1 leading-none">
                Academic Command Center
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            ZONE 2 (CENTER): Semester / Temporal Context
            Structured context using pure typography & hierarchy rather than generic pills
            ========================================================================= */}
        <div
          className="flex flex-col items-center justify-center text-center px-2 py-0.5 select-none"
          aria-label={`Active Semester: September 2026 Term, ${isPreSemester ? "Pre-semester" : "In Session"}`}
        >
          <div className="text-xs sm:text-sm font-semibold font-heading text-foreground leading-tight">
            <span className="hidden sm:inline">September 2026 Term</span>
            <span className="sm:hidden">Sep 2026 Term</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-foreground-light mt-0.5 leading-tight">
            {isPreSemester ? "Pre-semester" : "Term in Session"}
          </div>
        </div>

        {/* =========================================================================
            ZONE 3 (RIGHT): Global Utility Actions & Isolated Continuous Clock
            Live clock + compact Command/Search affordance + deliberate More menu
            ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Continuous Live Clock in Asia/Kolkata (IST) — Isolated to avoid parent re-renders */}
          <LiveClock className="mr-1 hidden sm:block font-mono text-xs text-foreground-light" />

          {/* Quick Search & Command Palette Trigger (⌘K) */}
          <Button
            variant="outline"
            size="small"
            onClick={onOpenCommandMenu}
            className="h-8 px-2.5 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200 border-border-default bg-surface-100 flex items-center gap-2 cursor-pointer transition-all active:scale-95 duration-75 touch-manipulation shadow-none rounded-md"
            aria-label="Search courses, deadlines, documents, and system commands (⌘K)"
            title="Search & Command Palette (⌘K)"
            data-testid="nav-command-btn"
          >
            <Search className="size-3.5 text-foreground-lighter shrink-0" />
            <span className="hidden md:inline font-normal">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-surface-200 border border-border-default rounded text-foreground-lighter">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </Button>

          {/* Cloud Synchronization Trigger */}
          <Button
            variant="outline"
            size="small"
            onClick={onOpenSync}
            className="h-8 px-2.5 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200 border-border-default bg-surface-100 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 duration-75 touch-manipulation shadow-none rounded-md"
            aria-label="Cloud Synchronization & Account"
            title={isAuthenticated ? `Cloud Sync: ${syncStatus}` : "Sign in to sync your data"}
            data-testid="nav-sync-btn"
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="size-3.5 text-brand animate-spin" />
            ) : syncStatus === "synced" ? (
              <CloudCheck className="size-3.5 text-emerald-500" />
            ) : syncStatus === "offline" ? (
              <CloudOff className="size-3.5 text-amber-500" />
            ) : (
              <Cloud className="size-3.5 text-foreground-lighter" />
            )}
            <span className="hidden lg:inline font-normal">
              {isAuthenticated ? (syncStatus === "synced" ? "Synced" : "Sync") : "Sign In"}
            </span>
            {pendingDirtyCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-3.5 font-mono text-amber-500"
              >
                {pendingDirtyCount}
              </Badge>
            )}
          </Button>

          {/* Deliberate Overflow / More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="small"
                className="h-8 px-2.5 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200 border-border-default bg-surface-100 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 duration-75 touch-manipulation shadow-none rounded-md relative"
                aria-label="More workspace tools and actions"
                title="Workspace Tools & Options"
                data-testid="nav-more-menu-btn"
              >
                <MoreHorizontal className="size-4 text-foreground-lighter shrink-0" />
                <span className="hidden sm:inline font-normal">More</span>
                {taskCount > 0 && (
                  <span
                    className="size-2 rounded-full bg-brand ring-2 ring-studio absolute -top-0.5 -right-0.5 sm:static sm:ring-0"
                    title={`${taskCount} active tasks`}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 font-sans p-1.5 shadow-2xl bg-surface-100 border-border-default"
            >
              {/* Primary Views Group */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-foreground-lighter text-[11px] font-mono uppercase tracking-wider">
                  Navigate Workspace
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("dashboard")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <LayoutDashboard className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">Dashboard</span>
                  {activeView === "dashboard" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("courses")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <BookOpen className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">Theory Courses</span>
                  {activeView === "courses" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("project")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <FolderGit2 className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">CS2006P Project</span>
                  {activeView === "project" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("calendar")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <CalendarDays className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">Academic Calendar</span>
                  {activeView === "calendar" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("emails")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <Mail className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">Institute Emails</span>
                  {activeView === "emails" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSelectView?.("reference")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                >
                  <FileText className="size-4 text-brand shrink-0" />
                  <span className="flex-1 font-medium">Reference Documents</span>
                  {activeView === "reference" && (
                    <Check className="size-3.5 text-brand stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-border-default" />

              {/* Workspace Tools Group */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-foreground-lighter text-[11px] font-mono uppercase tracking-wider">
                  Quick Panels
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={onOpenCalendar}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-calendar-btn"
                >
                  <Calendar className="size-4 text-brand shrink-0" />
                  <span className="flex-1">Academic Calendar</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={onOpenDocuments}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-docs-btn"
                >
                  <BookOpen className="size-4 text-brand shrink-0" />
                  <span className="flex-1">Reference Documents</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={onOpenTasks}
                  className="cursor-pointer gap-2.5 py-2 justify-between hover:bg-surface-200"
                  data-testid="menu-tasks-btn"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="size-4 text-brand shrink-0" />
                    <span>Task Manager</span>
                  </div>
                  {taskCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-mono tabular-nums"
                    >
                      {taskCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-border-default" />

              {/* Data Group */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-foreground-lighter text-[11px] font-mono uppercase tracking-wider">
                  Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={onOpenSync}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-cloud-sync-btn"
                >
                  <Cloud className="size-4 text-brand shrink-0" />
                  <span className="flex-1">
                    {isAuthenticated ? "Cloud Sync & Account" : "Sign In to Sync"}
                  </span>
                  {isAuthenticated && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-brand/40 text-brand"
                    >
                      {syncStatus}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onOpenBackup?.("export")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-backup-btn"
                >
                  <FolderDown className="size-4 text-foreground-lighter shrink-0" />
                  <span className="flex-1">Backup & Export Data</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onOpenBackup?.("import")}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-restore-btn"
                >
                  <FolderUp className="size-4 text-foreground-lighter shrink-0" />
                  <span className="flex-1">Restore Data</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-border-default" />

              {/* Application Group */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-foreground-lighter text-[11px] font-mono uppercase tracking-wider">
                  Application
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={onOpenCommandMenu}
                  className="cursor-pointer gap-2.5 py-2 hover:bg-surface-200"
                  data-testid="menu-command-btn"
                >
                  <Command className="size-4 text-foreground-lighter shrink-0" />
                  <span className="flex-1">Command Palette</span>
                  <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={onResetData}
                  className="cursor-pointer gap-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  data-testid="menu-reset-btn"
                >
                  <RotateCcw className="size-4 text-destructive shrink-0" />
                  <span className="flex-1">Reset Local State</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});
