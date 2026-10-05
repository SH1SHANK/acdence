import React, { useState, useEffect } from "react";
import type { PersistedUserState, GitHubRepoReference } from "@/types/state";
import type { ProjectTrack, ProjectStageId } from "@/types/project";
import type { ProjectSummary } from "@/lib/selectors";
import { PROJECT_STAGES, PROJECT_TRACKS, TMA_V2_REQUIREMENTS } from "@/data/project";
import { VIVA_CHECKLIST } from "@/data/viva";
import { evaluateProjectGrade } from "@/grading/project";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Calendar,
  Layers,
  CheckSquare,
  Award,
  GitBranch,
  GitCommit,
  ExternalLink,
  RefreshCw,
  Trash2,
  Undo2,
  AlertCircle,
  FileCode,
  Milestone,
} from "lucide-react";
import {
  parseGitHubUrl,
  fetchGitHubRepoDetails,
  getGitHubCache,
  clearGitHubCache,
  type CachedGitHubData,
} from "@/services/github";
import { formatAcademicDate, formatRelativeTime } from "@/lib/datetime";

interface ProjectHubSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PersistedUserState;
  summary: ProjectSummary;
  onSetTrack: (track: ProjectTrack | null) => void;
  onToggleStage: (stageId: ProjectStageId) => void;
  onToggleRequirement: (requirementId: string) => void;
  onSetScores: (l1Score: number | null, l2Score: number | null) => void;
  onToggleViva: (itemId: string) => void;
  onConnectGitHub?: (repo: GitHubRepoReference) => void;
  onDisconnectGitHub?: () => void;
}

export const ProjectHubSheet: React.FC<ProjectHubSheetProps> = React.memo(
  ({
    open,
    onOpenChange,
    state,
    summary,
    onSetTrack,
    onToggleStage,
    onToggleRequirement,
    onSetScores,
    onToggleViva,
    onConnectGitHub,
    onDisconnectGitHub,
  }) => {
    const pState = state.projectState;
    const gradeResult = evaluateProjectGrade(pState.track, pState.l1Score, pState.l2Score);

    const reqCompletionPct = Math.round(
      (summary.completedRequirementsCount / summary.totalRequirementsCount) * 100,
    );

    // GitHub state
    const githubRepo = state.githubRepo;
    const [repoUrlInput, setRepoUrlInput] = useState("");
    const [repoTokenInput, setRepoTokenInput] = useState("");
    const [ghError, setGhError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [remoteGh, setRemoteGh] = useState<CachedGitHubData | null>(null);
    const cachedGh =
      remoteGh || (githubRepo ? getGitHubCache(githubRepo.owner, githubRepo.name) : null);
    const [undoDisconnectTimer, setUndoDisconnectTimer] = useState<number | null>(null);
    const [pendingDisconnectedRepo, setPendingDisconnectedRepo] =
      useState<GitHubRepoReference | null>(null);

    // Auto-fetch if not cached whenever githubRepo changes
    useEffect(() => {
      if (!githubRepo) return;

      const cached = getGitHubCache(githubRepo.owner, githubRepo.name);
      if (cached) return;

      let active = true;
      queueMicrotask(() => {
        if (active) setIsSyncing(true);
      });
      fetchGitHubRepoDetails(githubRepo.owner, githubRepo.name, githubRepo.token)
        .then((details) => {
          if (active) {
            setRemoteGh(details);
            setIsSyncing(false);
          }
        })
        .catch((err: any) => {
          if (active) {
            setGhError(err.message || "Failed to sync repository.");
            setIsSyncing(false);
          }
        });

      return () => {
        active = false;
      };
    }, [githubRepo]);

    const handleConnectRepo = async (e: React.FormEvent) => {
      e.preventDefault();
      setGhError(null);

      const parsed = parseGitHubUrl(repoUrlInput);
      if (!parsed) {
        setGhError("Please enter a valid GitHub URL or 'owner/repo' format (e.g. facebook/react).");
        return;
      }

      setIsSyncing(true);
      try {
        const details = await fetchGitHubRepoDetails(parsed.owner, parsed.repo, repoTokenInput);
        setRemoteGh(details);

        const ref: GitHubRepoReference = {
          url: details.htmlUrl,
          owner: details.owner,
          name: details.repo,
          token: repoTokenInput ? repoTokenInput.trim() : undefined,
          lastSyncedAt: details.cachedAt,
        };

        onConnectGitHub?.(ref);
        setRepoUrlInput("");
        setRepoTokenInput("");
      } catch (err: any) {
        setGhError(err.message || "Failed to connect to GitHub repository.");
      } finally {
        setIsSyncing(false);
      }
    };

    const handleSync = async () => {
      if (!githubRepo) return;
      setIsSyncing(true);
      setGhError(null);
      try {
        const details = await fetchGitHubRepoDetails(
          githubRepo.owner,
          githubRepo.name,
          githubRepo.token,
        );
        setRemoteGh(details);
      } catch (err: any) {
        setGhError(err.message || "Failed to sync GitHub data.");
      } finally {
        setIsSyncing(false);
      }
    };

    const handleDisconnectWithUndo = () => {
      if (!githubRepo) return;
      const current = { ...githubRepo };
      setPendingDisconnectedRepo(current);
      onDisconnectGitHub?.();

      // 5-second undo timer
      const timer = window.setTimeout(() => {
        setPendingDisconnectedRepo(null);
        clearGitHubCache(current.owner, current.name);
      }, 5000);
      setUndoDisconnectTimer(timer);
    };

    const handleUndoDisconnect = () => {
      if (undoDisconnectTimer) {
        clearTimeout(undoDisconnectTimer);
        setUndoDisconnectTimer(null);
      }
      if (pendingDisconnectedRepo) {
        onConnectGitHub?.(pendingDisconnectedRepo);
        setPendingDisconnectedRepo(null);
      }
    };

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface-100 border-l border-border-default text-foreground p-0 flex flex-col overflow-hidden"
        >
          {/* Sticky Sheet Header */}
          <SheetHeader className="p-5 sm:p-6 border-b border-border-default bg-surface-100/95 backdrop-blur-sm shrink-0 pr-10">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-base font-bold text-brand">CS2006P</span>
              <Badge
                variant="outline"
                className="text-xs font-mono py-0 px-1.5 border-border-default"
              >
                2 Credits · Project
              </Badge>
              <Badge variant="brand" className="text-xs font-mono py-0 px-1.5">
                {summary.trackName}
              </Badge>
              {githubRepo && (
                <Badge variant="brand" className="text-xs font-mono py-0 px-1.5">
                  GitHub Connected
                </Badge>
              )}
            </div>

            <SheetTitle className="text-lg font-bold font-heading text-foreground text-left text-balance">
              Application Development II Project Workspace
            </SheetTitle>
            <SheetDescription className="text-xs text-foreground-light text-left text-pretty">
              Trekking Management Application V2 · Submission Track, 8-Stage Pipeline, Specification
              Checklist, Viva & GitHub Intelligence
            </SheetDescription>
          </SheetHeader>

          {/* Undo Disconnect Toast Notification */}
          {pendingDisconnectedRepo && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-warning/15 border border-warning/40 flex items-center justify-between text-xs text-warning">
              <span>Repository disconnected. Cache will be deleted in 5 seconds.</span>
              <Button
                variant="outline"
                size="small"
                onClick={handleUndoDisconnect}
                className="h-7 text-xs bg-warning/20 border-warning/40 hover:bg-warning/20 text-warning flex items-center gap-1"
              >
                <Undo2 className="size-3" data-icon="inline-start" />
                <span>Undo Disconnect</span>
              </Button>
            </div>
          )}

          {/* Scrollable Tabs Body */}
          <Tabs defaultValue="pipeline" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-3 border-b border-border-default bg-surface-200/40">
              <TabsList className="bg-surface-200 border border-border-default p-0.5 h-8">
                <TabsTrigger
                  value="pipeline"
                  className="text-xs px-3 py-1 flex items-center gap-1.5"
                >
                  <Layers className="size-3.5 text-brand" />
                  <span>Workspace & Pipeline</span>
                </TabsTrigger>
                <TabsTrigger value="tma" className="text-xs px-3 py-1 flex items-center gap-1.5">
                  <CheckSquare className="size-3.5 text-brand" />
                  <span>TMA Checklist & Viva</span>
                </TabsTrigger>
                <TabsTrigger value="github" className="text-xs px-3 py-1 flex items-center gap-1.5">
                  <GitBranch className="size-3.5 text-brand" />
                  <span>GitHub & Intelligence</span>
                  {githubRepo && <span className="size-1.5 rounded-full bg-brand" />}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* TAB 1: WORKSPACE & PIPELINE */}
              <TabsContent value="pipeline" className="flex flex-col gap-6 m-0">
                {/* 1. Track Selection Panel */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-brand" />
                      <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                        Submission Track & Deadlines
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-foreground-lighter">
                      Determines submission deadline & base marks
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Project Track Selection"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {(Object.keys(PROJECT_TRACKS) as ProjectTrack[]).map(
                      (tKey, currentIndex, tracks) => {
                        const trackCfg = PROJECT_TRACKS[tKey];
                        const isSelected = pState.track === tKey;

                        return (
                          <button
                            type="button"
                            key={tKey}
                            role="radio"
                            tabIndex={pState.track === null ? 0 : isSelected ? 0 : -1}
                            aria-checked={isSelected}
                            onClick={() => onSetTrack(tKey)}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                                e.preventDefault();
                                const nextTrack = tracks[(currentIndex + 1) % tracks.length];
                                onSetTrack(nextTrack);
                                const btns =
                                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                                    'button[role="radio"]',
                                  );
                                btns?.[(currentIndex + 1) % tracks.length]?.focus();
                              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                                e.preventDefault();
                                const prevTrack =
                                  tracks[(currentIndex - 1 + tracks.length) % tracks.length];
                                onSetTrack(prevTrack);
                                const btns =
                                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                                    'button[role="radio"]',
                                  );
                                btns?.[(currentIndex - 1 + tracks.length) % tracks.length]?.focus();
                              }
                            }}
                            className={`text-left p-4 rounded-lg border cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                              isSelected
                                ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand/40"
                                : "border-border-default bg-surface-200/50 hover:border-border-strong"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-semibold text-xs text-foreground">
                                {trackCfg.name}
                              </span>
                              {isSelected && (
                                <span className="size-4 rounded-full bg-brand text-black flex items-center justify-center">
                                  <Check className="size-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-foreground font-medium mb-1">
                              Deadline:{" "}
                              <strong className="text-brand">{trackCfg.submissionDeadline}</strong>
                            </div>
                            <p className="text-[11px] text-foreground-lighter leading-relaxed text-pretty">
                              {trackCfg.description}
                            </p>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* 2. Interactive 8-Stage Milestone Pipeline */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-brand" />
                      <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                        8-Stage Milestone Pipeline
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-brand font-medium">
                      Current: {summary.currentStageName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {PROJECT_STAGES.map((stage) => {
                      const isCompleted = pState.completedStageIds.includes(stage.id);
                      const isCurrent = summary.currentStageId === stage.id && !isCompleted;

                      return (
                        <label
                          key={stage.id}
                          htmlFor={`hub-stage-${stage.id}`}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 text-xs select-none ${
                            isCompleted
                              ? "border-brand/30 bg-brand/5 hover:border-brand/50"
                              : isCurrent
                                ? "border-brand/60 bg-brand/10 ring-1 ring-brand/30"
                                : "border-border-default bg-surface-100 hover:border-border-strong"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div>
                              <Checkbox
                                id={`hub-stage-${stage.id}`}
                                checked={isCompleted}
                                onCheckedChange={() => onToggleStage(stage.id)}
                                aria-label={`Toggle stage: ${stage.name}`}
                                className="mt-0.5"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    isCompleted ? "text-brand" : "text-foreground"
                                  }`}
                                >
                                  {stage.name}
                                </span>
                                {stage.isGateForNext && (
                                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                    Gate
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-foreground-lighter mt-0.5 leading-relaxed">
                                {stage.description}
                              </p>
                            </div>
                          </div>

                          <span className="font-mono text-[11px] text-foreground-lighter shrink-0">
                            Stage {stage.order}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Viva Preparation & Evaluation Calculator */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-brand" />
                      <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                        Viva Score Calculator & Grade Progression
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-foreground-lighter">
                      Official Rubric Boundaries
                    </span>
                  </div>

                  <div className="p-4 rounded-lg border border-border-default bg-surface-200/50 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-mono text-foreground-lighter">
                          Level 1 Viva Score (0 - 100)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          aria-label="Level 1 Viva Score"
                          placeholder="Pending evaluation"
                          value={pState.l1Score !== null ? pState.l1Score : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                            onSetScores(isNaN(val as number) ? null : val, pState.l2Score);
                          }}
                          className="bg-surface-100 border-border-default text-xs font-mono"
                        />
                        <span className="text-[10px] text-foreground-lighter font-mono">
                          Rule: &lt;20: U | 20-29: E (No L2) | &ge;30: Eligible for L2
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-mono text-foreground-lighter">
                          Level 2 Viva Score (0 - 100)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          aria-label="Level 2 Viva Score"
                          disabled={pState.l1Score === null || pState.l1Score < 30}
                          placeholder={
                            pState.l1Score === null || pState.l1Score < 30
                              ? "L1 &ge; 30 required"
                              : "Enter L2 score"
                          }
                          value={pState.l2Score !== null ? pState.l2Score : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                            onSetScores(pState.l1Score, isNaN(val as number) ? null : val);
                          }}
                          className="bg-surface-100 border-border-default text-xs font-mono"
                        />
                        <span className="text-[10px] text-foreground-lighter font-mono">
                          Rule: 0: E | 1-19: D | &ge;20: L1 + L2
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-100 border border-border-default flex items-center justify-between text-xs">
                      <div>
                        <span className="text-foreground-lighter">Calculated Grade: </span>
                        <strong className="text-base font-bold font-mono text-brand ml-1">
                          {gradeResult.letterGrade || "PENDING"}
                        </strong>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-foreground-lighter">
                        Total:{" "}
                        {gradeResult.finalScore !== null ? `${gradeResult.finalScore}/100` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: TMA CHECKLIST & VIVA */}
              <TabsContent value="tma" className="flex flex-col gap-6 m-0">
                {/* Specification Requirements Checklist */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="size-4 text-brand" />
                      <h3 className="text-xs font-mono uppercase text-foreground-light font-semibold">
                        TMA V2 Specification Checklist
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-foreground-lighter tabular-nums font-semibold">
                      {summary.completedRequirementsCount} / {summary.totalRequirementsCount} (
                      {reqCompletionPct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <Progress value={reqCompletionPct} className="h-1.5" />

                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="bg-surface-200 border border-border-default p-0.5 h-8">
                      <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                        All ({TMA_V2_REQUIREMENTS.length})
                      </TabsTrigger>
                      <TabsTrigger value="tech_stack" className="text-xs px-2.5 py-1">
                        Tech Stack
                      </TabsTrigger>
                      <TabsTrigger value="core_features" className="text-xs px-2.5 py-1">
                        Core Features
                      </TabsTrigger>
                      <TabsTrigger value="deliverables" className="text-xs px-2.5 py-1">
                        Deliverables & Rules
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="flex flex-col gap-2 pt-2">
                      {renderRequirementList(
                        TMA_V2_REQUIREMENTS,
                        pState.checkedRequirements,
                        onToggleRequirement,
                      )}
                    </TabsContent>

                    <TabsContent value="tech_stack" className="flex flex-col gap-2 pt-2">
                      {renderRequirementList(
                        TMA_V2_REQUIREMENTS.filter((r) => r.category === "tech_stack"),
                        pState.checkedRequirements,
                        onToggleRequirement,
                      )}
                    </TabsContent>

                    <TabsContent value="core_features" className="flex flex-col gap-2 pt-2">
                      {renderRequirementList(
                        TMA_V2_REQUIREMENTS.filter((r) => r.category === "core_features"),
                        pState.checkedRequirements,
                        onToggleRequirement,
                      )}
                    </TabsContent>

                    <TabsContent value="deliverables" className="flex flex-col gap-2 pt-2">
                      {renderRequirementList(
                        TMA_V2_REQUIREMENTS.filter(
                          (r) => r.category === "deliverables" || r.category === "rules",
                        ),
                        pState.checkedRequirements,
                        onToggleRequirement,
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Level 1 & Level 2 Viva Checklists */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-brand" />
                      <h3 className="text-xs font-mono uppercase text-foreground-light font-semibold">
                        Viva Readiness Checklists
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-foreground-lighter">
                      Level 1 & Level 2 Viva Standard SOPs
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {VIVA_CHECKLIST.map((item) => {
                      const isChecked = Boolean(state.vivaChecklistState?.[item.id]);

                      return (
                        <label
                          key={item.id}
                          htmlFor={`viva-item-${item.id}`}
                          className="p-2.5 rounded-lg border border-border-default bg-surface-100 hover:border-border-strong transition-colors flex items-start gap-2.5 cursor-pointer text-xs select-none"
                        >
                          <Checkbox
                            id={`viva-item-${item.id}`}
                            checked={isChecked}
                            aria-label={`Toggle viva item: ${item.title}`}
                            onCheckedChange={() => onToggleViva(item.id)}
                            className="mt-0.5"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  isChecked
                                    ? "line-through text-foreground-muted"
                                    : "text-foreground"
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.isStrictGate && (
                                <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                  Strict SOP
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-foreground-light mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: GITHUB & INTELLIGENCE */}
              <TabsContent value="github" className="flex flex-col gap-6 m-0">
                {/* Not Connected: Setup Form */}
                {!githubRepo ? (
                  <div className="p-5 rounded-lg border border-border-default bg-surface-100 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-brand/10 text-brand shrink-0 mt-0.5">
                        <GitBranch className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Connect GitHub Repository
                        </h4>
                        <p className="text-xs text-foreground-light mt-0.5 text-pretty">
                          Link your GitHub repository for CS2006P to surface the latest commits,
                          active GitHub milestones, and extract task checklists deterministically
                          from your README.md.
                        </p>
                      </div>
                    </div>

                    {/* Official Git Tracker Notice Card */}
                    <div className="p-3.5 rounded-lg border border-warning/30 bg-warning/5 flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-warning font-mono flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" />
                          Official Milestone 0: Git Tracker
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-warning/30 text-warning"
                        >
                          Compulsory
                        </Badge>
                      </div>
                      <p className="text-foreground-light leading-relaxed">
                        Per official policy, your repo{" "}
                        <strong className="text-foreground">must be Private</strong>. Provide a
                        GitHub Personal Access Token (PAT) below to connect your private repo.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="font-mono text-[11px] bg-surface-200 text-foreground-light px-2 py-0.5 rounded border border-border-default">
                          Collaborator:{" "}
                          <strong className="text-brand select-all">MADII-cs2006</strong>
                        </span>
                        <a
                          href="https://forms.gle/FnuQS7VX26zNqiNt7"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline"
                        >
                          MAD-2 Tracker Form <ExternalLink className="size-3" />
                        </a>
                        <a
                          href="https://youtu.be/fUY1MtqCoRU"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground-lighter hover:text-foreground"
                        >
                          Collaborator Guide <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>

                    <form onSubmit={handleConnectRepo} className="flex flex-col gap-3 pt-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-mono text-foreground-light">
                          Repository URL or Owner/Repo
                        </label>
                        <Input
                          type="text"
                          placeholder="https://github.com/username/mad2-trekking-app or username/mad2-trekking-app"
                          value={repoUrlInput}
                          onChange={(e) => setRepoUrlInput(e.target.value)}
                          className="bg-surface-100 border-border-default text-xs font-mono"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono text-foreground-light">
                            Personal Access Token (Optional)
                          </label>
                          <span className="text-[10px] font-mono text-foreground-muted">
                            Stored strictly locally
                          </span>
                        </div>
                        <Input
                          type="password"
                          placeholder="ghp_... (optional, increases rate limit & enables private repos)"
                          value={repoTokenInput}
                          onChange={(e) => setRepoTokenInput(e.target.value)}
                          className="bg-surface-100 border-border-default text-xs font-mono"
                        />
                      </div>

                      {ghError && (
                        <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                          <AlertCircle className="size-4 shrink-0 text-destructive" />
                          <span>{ghError}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isSyncing}
                        className="w-full text-xs font-medium h-9"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin" data-icon="inline-start" />
                            <span>Connecting & Syncing Repository...</span>
                          </>
                        ) : (
                          <>
                            <GitBranch className="size-3.5" data-icon="inline-start" />
                            <span>Connect Repository</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  /* Connected View */
                  <div className="flex flex-col gap-5">
                    {/* Repo Header & Controls */}
                    <div className="p-4 rounded-lg border border-border-default bg-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="size-4 text-brand" />
                          <h4 className="text-sm font-bold font-mono text-foreground">
                            {githubRepo.owner}/{githubRepo.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-success border-success/40 bg-success/10"
                          >
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-foreground-lighter mt-1">
                          <span>Branch: {cachedGh?.defaultBranch || "main"}</span>
                          <span>·</span>
                          <span>
                            Synced:{" "}
                            {cachedGh?.cachedAt
                              ? formatRelativeTime(cachedGh.cachedAt)
                              : "just now"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSync}
                          disabled={isSyncing}
                          className="h-8 text-xs bg-surface-100 border-border-default flex items-center gap-1.5"
                          title="Resync repository data"
                        >
                          <RefreshCw
                            className={`size-3 ${isSyncing ? "animate-spin text-brand" : ""}`}
                            data-icon="inline-start"
                          />
                          <span>Sync Now</span>
                        </Button>

                        <a
                          href={`https://github.com/${githubRepo.owner}/${githubRepo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border-default bg-surface-100 hover:bg-surface-200 text-xs text-foreground-light hover:text-foreground transition-colors"
                        >
                          <span>View</span>
                          <ExternalLink className="size-3" />
                        </a>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDisconnectWithUndo}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 flex items-center gap-1"
                          title="Disconnect repository (with 5s undo)"
                        >
                          <Trash2 className="size-3.5" data-icon="inline-start" />
                          <span>Disconnect</span>
                        </Button>
                      </div>
                    </div>

                    {ghError && (
                      <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0 text-destructive" />
                        <span>{ghError}</span>
                      </div>
                    )}

                    {/* Latest Commit Card */}
                    {cachedGh?.latestCommit ? (
                      <div className="p-4 rounded-lg border border-border-default bg-surface-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-foreground-lighter uppercase">
                          <span className="flex items-center gap-1.5">
                            <GitCommit className="size-3.5 text-brand" />
                            Latest Commit
                          </span>
                          <span>{formatRelativeTime(cachedGh.latestCommit.authorDate)}</span>
                        </div>

                        <div className="text-xs font-semibold text-foreground">
                          {cachedGh.latestCommit.message}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                          <span className="text-foreground-lighter">
                            by{" "}
                            <strong className="text-foreground">
                              {cachedGh.latestCommit.authorName}
                            </strong>
                          </span>
                          <a
                            href={cachedGh.latestCommit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline flex items-center gap-1"
                          >
                            <span>{cachedGh.latestCommit.shortSha}</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {/* GitHub Milestones */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Milestone className="size-4 text-brand" />
                          <h4 className="text-xs font-mono uppercase text-foreground-light font-semibold">
                            GitHub Milestones ({cachedGh?.milestones.length || 0})
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-foreground-lighter">
                          Queried from GitHub API
                        </span>
                      </div>

                      {cachedGh?.milestones && cachedGh.milestones.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {cachedGh.milestones.map((m) => (
                            <div
                              key={m.id}
                              className="p-3 rounded-lg border border-border-default bg-surface-100 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                  <span>{m.title}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-mono ${
                                      m.state === "open"
                                        ? "border-success/40 text-success"
                                        : "border-border-default text-foreground-lighter"
                                    }`}
                                  >
                                    {m.state}
                                  </Badge>
                                </div>
                                {m.description && (
                                  <p className="text-[11px] text-foreground-light mt-0.5 line-clamp-1">
                                    {m.description}
                                  </p>
                                )}
                              </div>

                              <div className="text-right font-mono tabular-nums text-[10px] text-foreground-lighter shrink-0">
                                <div>
                                  {m.closedIssues} closed / {m.openIssues + m.closedIssues} total
                                </div>
                                {m.dueOn && <div>Due: {formatAcademicDate(m.dueOn, true)}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-surface-200 border border-dashed border-border-default text-xs text-foreground-lighter text-center">
                          No official milestones defined in this GitHub repository.
                        </div>
                      )}
                    </div>

                    {/* README-Derived Intelligence Checklist */}
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <FileCode className="size-4 text-brand" />
                          <h4 className="text-xs font-mono uppercase text-foreground-light font-semibold">
                            README Intelligence Task Tracker
                          </h4>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-warning/30 text-warning bg-warning/10 self-start sm:self-auto"
                        >
                          README-derived intelligence
                        </Badge>
                      </div>

                      {cachedGh?.readmeIntelligence ? (
                        <div className="flex flex-col gap-3">
                          <div className="p-3 rounded-lg bg-surface-100 border border-border-default">
                            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                              <span className="text-foreground-light">
                                Extracted Checkbox Tasks:
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                {cachedGh.readmeIntelligence.completedTasks} /{" "}
                                {cachedGh.readmeIntelligence.totalTasks} (
                                {cachedGh.readmeIntelligence.percentage}%)
                              </span>
                            </div>
                            <Progress
                              value={cachedGh.readmeIntelligence.percentage}
                              className="h-1.5"
                            />
                            <p className="text-[10px] font-mono text-foreground-muted mt-2">
                              {cachedGh.readmeIntelligence.sourceNote}
                            </p>
                          </div>

                          {/* Sections */}
                          {cachedGh.readmeIntelligence.sections.map((section, sIdx) => (
                            <div key={sIdx} className="flex flex-col gap-1.5">
                              <h5 className="text-xs font-mono font-semibold text-foreground-light">
                                {section.title}
                              </h5>
                              <div className="flex flex-col gap-1">
                                {section.tasks.map((task, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className="p-2 rounded-md bg-surface-100 border border-border-default flex items-start gap-2 text-xs"
                                  >
                                    <span
                                      className={`size-4 rounded flex items-center justify-center border mt-0.5 shrink-0 ${
                                        task.completed
                                          ? "bg-brand/20 border-brand text-brand"
                                          : "border-border-default text-transparent"
                                      }`}
                                    >
                                      {task.completed && <Check className="size-2.5 text-brand" />}
                                    </span>
                                    <span
                                      className={`${
                                        task.completed
                                          ? "line-through text-foreground-muted"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {task.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-surface-200 border border-dashed border-border-default text-xs text-foreground-lighter text-center">
                          No task checkboxes (`- [x]` / `- [ ]`) detected in repository README.md.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  },
);

ProjectHubSheet.displayName = "ProjectHubSheet";

function renderRequirementList(
  requirements: typeof TMA_V2_REQUIREMENTS,
  checkedRequirements: string[],
  onToggleRequirement: (id: string) => void,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {requirements.map((req) => {
        const isChecked = checkedRequirements.includes(req.id);

        return (
          <label
            key={req.id}
            htmlFor={`tma-req-${req.id}`}
            className="p-2.5 rounded-lg border border-border-default bg-surface-100 hover:border-border-strong transition-colors flex items-start gap-2.5 cursor-pointer text-xs select-none"
          >
            <Checkbox
              id={`tma-req-${req.id}`}
              checked={isChecked}
              aria-label={`Toggle requirement: ${req.title}`}
              onCheckedChange={() => onToggleRequirement(req.id)}
              className="mt-0.5"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${
                    isChecked ? "line-through text-foreground-muted" : "text-foreground"
                  }`}
                >
                  {req.title}
                </span>
                {req.mandatory && (
                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-200 text-foreground-light">
                    Mandatory
                  </span>
                )}
              </div>
              <p className="text-[11px] text-foreground-light mt-0.5 leading-relaxed text-pretty">
                {req.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
