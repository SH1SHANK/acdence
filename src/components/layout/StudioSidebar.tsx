import * as React from "react";
import {
  LayoutDashboard,
  BookOpen,
  FolderGit2,
  CalendarDays,
  FileText,
  ListTodo,
  Search,
  Database,
  RotateCcw,
  Cloud,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/lib/sync/types";

export type StudioView = "dashboard" | "courses" | "project" | "calendar" | "emails" | "reference";

export interface StudioSidebarProps {
  activeView: StudioView;
  onSelectView: (view: StudioView) => void;
  onOpenTasks: () => void;
  onOpenCommandMenu: () => void;
  onOpenBackup: () => void;
  onOpenReset: () => void;
  onOpenSync?: () => void;
  syncStatus?: SyncStatus;
  isAuthenticated?: boolean;
  taskCount?: number;
  importantEmailCount?: number;
}

interface NavItem {
  id: StudioView | "tasks";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isView: boolean;
  badge?: number;
  section?: "workspace" | "tools";
}

const SIDEBAR_STORAGE_KEY = "acdence_sidebar_expanded";

export const StudioSidebar: React.FC<StudioSidebarProps> = React.memo(function StudioSidebar({
  activeView,
  onSelectView,
  onOpenTasks,
  onOpenCommandMenu,
  onOpenBackup,
  onOpenReset,
  onOpenSync,
  syncStatus = "local",
  isAuthenticated = false,
  taskCount = 0,
  importantEmailCount = 0,
}) {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved === "true";
    }
    return false;
  });

  const toggleSidebar = React.useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const workspaceNavItems: NavItem[] = React.useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        isView: true,
        section: "workspace",
      },
      {
        id: "courses",
        label: "Theory Courses",
        icon: BookOpen,
        isView: true,
        section: "workspace",
      },
      {
        id: "project",
        label: "CS2006P Project",
        icon: FolderGit2,
        isView: true,
        section: "workspace",
      },
      {
        id: "calendar",
        label: "Academic Calendar",
        icon: CalendarDays,
        isView: true,
        section: "workspace",
      },
      {
        id: "emails",
        label: "Institute Emails",
        icon: Mail,
        isView: true,
        badge: importantEmailCount,
        section: "workspace",
      },
      {
        id: "reference",
        label: "Reference Docs",
        icon: FileText,
        isView: true,
        section: "workspace",
      },
    ],
    [importantEmailCount],
  );

  const toolNavItems: NavItem[] = React.useMemo(
    () => [
      {
        id: "tasks",
        label: "Task Board",
        icon: ListTodo,
        isView: false,
        badge: taskCount,
        section: "tools",
      },
    ],
    [taskCount],
  );

  const allNavItems = React.useMemo(
    () => [...workspaceNavItems, ...toolNavItems],
    [workspaceNavItems, toolNavItems],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        aria-label="Studio Sidebar Navigation"
        className={cn(
          "hidden md:flex flex-col justify-between shrink-0 h-dvh sticky top-0 bg-studio border-r border-border-studio py-3.5 z-40 select-none transition-all duration-200 ease-in-out",
          isExpanded ? "w-60 px-3" : "w-14 items-center px-2",
        )}
      >
        {/* Top: Logo + Grouped Navigation */}
        <div className="flex flex-col gap-4 w-full">
          {/* Logo / Header Branding */}
          <div
            className={cn(
              "flex items-center w-full",
              isExpanded ? "justify-between px-1" : "justify-center",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectView("dashboard")}
              aria-label="Acdence Academic Command Center"
              className={cn(
                "group rounded-lg flex items-center transition-all focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                isExpanded
                  ? "gap-2.5 p-1 -ml-1 text-left"
                  : "size-8 bg-surface-200 border border-border-default justify-center text-brand font-bold text-sm hover:border-brand/40 hover:bg-surface-300",
              )}
            >
              <div className="size-8 rounded-lg bg-surface-200 border border-border-default flex items-center justify-center text-brand font-bold text-sm group-hover:border-brand/40 group-hover:bg-surface-300 transition-colors shrink-0">
                <span className="font-heading text-brand">A</span>
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold font-heading text-foreground leading-none">
                    Acdence
                  </span>
                  <span className="text-[10px] text-foreground-lighter font-mono mt-1 leading-none truncate">
                    Sep 2026 Term
                  </span>
                </div>
              )}
            </button>

            {isExpanded && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                className="size-7 rounded-md text-foreground-lighter hover:text-foreground hover:bg-surface-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </div>

          {/* Navigation Workspace Section */}
          <nav aria-label="Workspace Navigation" className="flex flex-col gap-1 w-full">
            {isExpanded && (
              <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                Workspace
              </div>
            )}
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isView && activeView === item.id;

              const buttonContent = (
                <button
                  type="button"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelectView(item.id as StudioView)}
                  className={cn(
                    "relative rounded-md flex items-center transition-all cursor-pointer",
                    "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                    isExpanded
                      ? "w-full px-2.5 py-2 gap-3 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200"
                      : "size-9 justify-center text-foreground-light hover:text-foreground hover:bg-surface-200",
                    isActive &&
                      (isExpanded
                        ? "text-brand bg-surface-200 border border-border-default font-medium shadow-xs"
                        : "text-brand bg-surface-200 border border-border-default font-medium shadow-xs"),
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive && "text-brand")} />
                  {isExpanded && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {item.badge !== undefined &&
                    item.badge > 0 &&
                    (isExpanded ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-brand/10 border border-brand/30 text-brand font-mono text-[10px] font-semibold tabular-nums">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 size-2 rounded-full bg-brand ring-2 ring-studio" />
                    ))}
                </button>
              );

              if (isExpanded) {
                return <div key={item.id}>{buttonContent}</div>;
              }

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1.5 text-brand font-mono text-[10px]">
                        ({item.badge})
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Tools Group */}
            {isExpanded && (
              <div className="px-2 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                Tools
              </div>
            )}
            {toolNavItems.map((item) => {
              const Icon = item.icon;

              const buttonContent = (
                <button
                  type="button"
                  aria-label={item.label}
                  onClick={onOpenTasks}
                  className={cn(
                    "relative rounded-md flex items-center transition-all cursor-pointer",
                    "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                    isExpanded
                      ? "w-full px-2.5 py-2 gap-3 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200"
                      : "size-9 justify-center text-foreground-light hover:text-foreground hover:bg-surface-200",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {isExpanded && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {item.badge !== undefined &&
                    item.badge > 0 &&
                    (isExpanded ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-surface-300 border border-border-default text-foreground-light font-mono text-[10px] tabular-nums">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 size-2 rounded-full bg-brand ring-2 ring-studio" />
                    ))}
                </button>
              );

              if (isExpanded) {
                return <div key={item.id}>{buttonContent}</div>;
              }

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1.5 text-brand font-mono text-[10px]">
                        ({item.badge})
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Actions */}
        <div className="flex flex-col gap-1.5 w-full">
          {/* Command Menu ⌘K */}
          {isExpanded ? (
            <button
              type="button"
              onClick={onOpenCommandMenu}
              className="w-full px-2.5 py-2 rounded-md flex items-center justify-between text-xs text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="size-4" />
                <span>Search</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-200 border border-border-default font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Open Command Menu (⌘K)"
                  onClick={onOpenCommandMenu}
                  className="size-9 rounded-md flex items-center justify-center text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all focus-visible:outline-2 focus-visible:outline-brand cursor-pointer"
                >
                  <Search className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Command Menu</span>
                <kbd className="ml-1.5 px-1 py-0.5 rounded bg-surface-200 border border-border-default font-mono text-[10px]">
                  ⌘K
                </kbd>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Cloud Synchronization */}
          {isExpanded ? (
            <button
              type="button"
              onClick={onOpenSync}
              className="w-full px-2.5 py-2 rounded-md flex items-center justify-between text-xs text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="size-4" />
                <span>{isAuthenticated ? "Cloud Sync" : "Sign In to Sync"}</span>
              </div>
              <span
                className={cn(
                  "size-2 rounded-full",
                  syncStatus === "synced"
                    ? "bg-emerald-500"
                    : syncStatus === "syncing"
                      ? "bg-brand animate-pulse"
                      : syncStatus === "offline"
                        ? "bg-amber-500"
                        : "bg-foreground-lighter",
                )}
              />
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Cloud Synchronization"
                  onClick={onOpenSync}
                  className="size-9 rounded-md flex items-center justify-center text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all focus-visible:outline-2 focus-visible:outline-brand relative cursor-pointer"
                >
                  <Cloud className="size-4" />
                  {isAuthenticated && (
                    <span
                      className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${
                        syncStatus === "synced"
                          ? "bg-emerald-500"
                          : syncStatus === "syncing"
                            ? "bg-brand animate-pulse"
                            : syncStatus === "offline"
                              ? "bg-amber-500"
                              : "bg-foreground-lighter"
                      }`}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>{isAuthenticated ? `Cloud Sync: ${syncStatus}` : "Sign In to Sync"}</span>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Backup & Export */}
          {isExpanded ? (
            <button
              type="button"
              onClick={onOpenBackup}
              className="w-full px-2.5 py-2 rounded-md flex items-center gap-2.5 text-xs text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all cursor-pointer"
            >
              <Database className="size-4" />
              <span>Backup & Export</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Data Backup & Export"
                  onClick={onOpenBackup}
                  className="size-9 rounded-md flex items-center justify-center text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all focus-visible:outline-2 focus-visible:outline-brand cursor-pointer"
                >
                  <Database className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Data Backup & Sync</span>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Reset Application Data */}
          {isExpanded ? (
            <button
              type="button"
              onClick={onOpenReset}
              className="w-full px-2.5 py-2 rounded-md flex items-center gap-2.5 text-xs text-foreground-lighter hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
            >
              <RotateCcw className="size-4 text-destructive/80" />
              <span className="text-destructive/80">Reset Local State</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Reset State"
                  onClick={onOpenReset}
                  className="size-9 rounded-md flex items-center justify-center text-foreground-lighter hover:text-destructive hover:bg-destructive/10 transition-all focus-visible:outline-2 focus-visible:outline-destructive cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Reset State</span>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Collapsed Mode Expand Toggle Button */}
          {!isExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Expand sidebar"
                  onClick={toggleSidebar}
                  className="size-9 mt-1 rounded-md flex items-center justify-center text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-all cursor-pointer"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Expand Sidebar</span>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Live Status indicator */}
          <div className="pt-2 flex items-center justify-center">
            <span
              className="size-1.5 rounded-full bg-brand animate-pulse"
              title="Real-time IST Active"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-studio/95 backdrop-blur-md border-t border-border-studio flex items-center justify-around z-40 px-1 select-none"
      >
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isView && activeView === item.id;

          return (
            <button
              key={`mobile-${item.id}`}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (item.id === "tasks") {
                  onOpenTasks();
                } else {
                  onSelectView(item.id as StudioView);
                }
              }}
              className={cn(
                "relative min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md transition-all active:scale-95 duration-75 touch-manipulation cursor-pointer",
                "text-foreground-lighter hover:text-foreground",
                isActive && "text-brand font-medium",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn("size-5", isActive ? "text-brand" : "text-foreground-lighter")}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-brand ring-2 ring-studio" />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono leading-none tracking-tight",
                  isActive ? "text-brand font-bold" : "text-foreground-lighter",
                )}
              >
                {item.id === "dashboard"
                  ? "Home"
                  : item.id === "courses"
                    ? "Courses"
                    : item.id === "project"
                      ? "Project"
                      : item.id === "calendar"
                        ? "Calendar"
                        : item.id === "emails"
                          ? "Emails"
                          : item.id === "reference"
                            ? "Docs"
                            : "Tasks"}
              </span>
            </button>
          );
        })}
      </nav>
    </TooltipProvider>
  );
});
