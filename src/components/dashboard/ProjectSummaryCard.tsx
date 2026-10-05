import React, { useMemo } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, GitBranch, GitCommit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProjectSummary } from "@/lib/selectors";
import type { PersistedUserState } from "@/types/state";
import { getGitHubCache } from "@/services/github";
import { formatAcademicDate, formatRelativeTime } from "@/lib/datetime";

interface Props {
  summary: ProjectSummary;
  state: PersistedUserState;
  onOpenProjectHub?: () => void;
}

export const ProjectSummaryCard = React.memo<Props>(function ProjectSummaryCard({
  summary,
  state,
  onOpenProjectHub,
}) {
  const repo = state.githubRepo;
  const cached = useMemo(() => (repo ? getGitHubCache(repo.owner, repo.name) : null), [repo]);
  const percent = summary.totalRequirementsCount
    ? Math.round((summary.completedRequirementsCount / summary.totalRequirementsCount) * 100)
    : 0;
  const deadline = summary.submissionDeadline
    ? formatAcademicDate(summary.submissionDeadline, true)
    : "Choose a track";

  return (
    <article
      data-testid="project-summary-card"
      className="rounded-lg border border-border-default bg-surface-100 p-4 sm:p-5 shadow-xs transition-colors hover:border-border-strong"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold text-brand">
            CS2006P · 2 credits · Project
          </div>
          <h3 className="text-balance mt-1 text-lg font-semibold font-heading leading-tight text-foreground sm:text-xl">
            Application Development II Project
          </h3>
          <p className="text-pretty mt-1 text-xs text-foreground-light">
            Trekking Management App V2
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="text-left lg:text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
              Submission deadline
            </div>
            <div className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-foreground">
              {deadline}
            </div>
            <div className="mt-0.5 text-[11px] text-foreground-light">{summary.trackName}</div>
          </div>
          <Button size="small" variant="primary" onClick={onOpenProjectHub} className="gap-1.5">
            <span>Open project hub</span>
            <ArrowRight data-icon="inline-end" className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border-default bg-surface-200/50 px-3 py-2.5">
        {repo ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <GitBranch className="size-3.5 shrink-0 text-brand" />
              <span className="font-mono font-semibold text-foreground">
                {repo.owner}/{repo.name}
              </span>
              {cached?.latestCommit && (
                <span className="hidden min-w-0 items-center gap-1.5 text-foreground-light sm:flex">
                  <GitCommit className="size-3 shrink-0 text-foreground-lighter" />
                  <span className="font-mono text-brand">{cached.latestCommit.shortSha}</span>
                  <span className="truncate">{cached.latestCommit.message}</span>
                  <span className="shrink-0 text-[10px] font-mono text-foreground-lighter">
                    {formatRelativeTime(cached.latestCommit.authorDate)}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 pl-5 sm:pl-0">
              {cached?.readmeIntelligence && (
                <span className="text-[11px] font-mono text-foreground-light">
                  README {cached.readmeIntelligence.completedTasks}/
                  {cached.readmeIntelligence.totalTasks}
                </span>
              )}
              <a
                href={`https://github.com/${repo.owner}/${repo.name}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-brand hover:underline font-mono"
              >
                GitHub <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenProjectHub}
            className="flex w-full items-center justify-between gap-3 text-left text-xs text-foreground-light hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <GitBranch className="size-3.5 text-brand" />
              Connect a public GitHub repository to track commits and README milestones.
            </span>
            <span className="shrink-0 text-[11px] text-brand font-medium">
              Connect repo <ExternalLink className="ml-1 inline size-3" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <div className="rounded-md border border-brand/20 bg-brand/5 p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-brand font-semibold">
              Next step
            </div>
            <span className="size-1.5 rounded-full bg-brand" />
          </div>
          <div className="text-balance mt-1 text-sm font-semibold font-heading text-foreground">
            {summary.currentStageName}
          </div>
          <p className="text-pretty mt-1.5 text-xs leading-relaxed text-foreground-light">
            {summary.nextStepDescription}
          </p>
          <Button
            variant="link"
            size="tiny"
            className="mt-2 h-auto p-0 text-xs text-brand hover:underline"
            onClick={onOpenProjectHub}
          >
            Continue in project hub <ArrowRight data-icon="inline-end" className="size-3 ml-1" />
          </Button>
        </div>
        <div className="rounded-md border border-border-default bg-surface-200/40 p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
              Functional checklist
            </div>
            <span className="font-mono text-xs tabular-nums text-foreground-light">{percent}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {summary.completedRequirementsCount}
            </span>
            <span className="text-xs text-foreground-lighter font-mono tabular-nums">
              of {summary.totalRequirementsCount} complete
            </span>
          </div>
          <Progress value={percent} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-md border border-border-default bg-surface-200/40 p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
            Viva progress
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <VivaScore label="Level 1" score={summary.l1Score} />
            <VivaScore label="Level 2" score={summary.l2Score} />
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-foreground-light">
            <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-brand" />
            <span className="tabular-nums font-mono text-[10px]">
              L1 ≥ 20 to pass · L1 ≥ 30 unlocks L2
            </span>
          </div>
        </div>
      </div>
    </article>
  );
});

function VivaScore({ label, score }: { label: string; score: number | null }) {
  if (score === null) {
    return (
      <div>
        <div className="text-xs font-mono text-foreground-lighter">{label}</div>
        <div className="mt-0.5 font-mono text-sm text-foreground-lighter tabular-nums">—</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-mono text-foreground-lighter">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
        {score}
        <span className="ml-1 text-[10px] font-normal text-foreground-lighter">/ 100</span>
      </div>
      <Badge variant="brand" className="mt-1 text-[9px] font-mono py-0 px-1">
        Recorded
      </Badge>
    </div>
  );
}
