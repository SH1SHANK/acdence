import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
} from "lucide-react";
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
import {
  PageSection,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
  PageSectionDescription,
  PageSectionAside,
  PageSectionContent,
} from "@/components/fragments/PageSection";
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
} from "@/components/fragments/MetricCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { PROJECT_STAGES, PROJECT_TRACKS, TMA_V2_REQUIREMENTS } from "@/data/project";
import type { ProjectSummary } from "@/lib/selectors";
import type { PersistedUserState } from "@/types/state";
import type { ProjectTrack, ProjectStageId } from "@/types/project";

export interface ProjectViewProps {
  summary: ProjectSummary;
  state: PersistedUserState;
  onSetTrack: (track: ProjectTrack) => void;
  onToggleStage: (stageId: ProjectStageId) => void;
  onToggleRequirement: (requirementId: string) => void;
  onOpenHubSheet: () => void;
  onOpenDocs: (docId?: string) => void;
  onNavigateToDashboard?: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = React.memo(function ProjectView({
  summary,
  state,
  onSetTrack,
  onToggleStage,
  onToggleRequirement,
  onOpenHubSheet,
  onOpenDocs,
  onNavigateToDashboard,
}) {
  const currentTrackConfig = state.projectState.track
    ? PROJECT_TRACKS[state.projectState.track]
    : null;

  const totalRequirements = TMA_V2_REQUIREMENTS.length;
  const completedRequirementsCount = state.projectState.checkedRequirements.length;
  const reqPercentage = Math.round((completedRequirementsCount / totalRequirements) * 100);

  const completedStagesCount = state.projectState.completedStageIds.length;
  const stagePercentage = Math.round((completedStagesCount / PROJECT_STAGES.length) * 100);

  return (
    <PageContainer size="default">
      {/* 1. Page Header */}
      <PageHeader>
        <PageHeaderMeta>
          <PageHeaderIcon>
            <FolderGit2 className="size-5 text-brand" />
          </PageHeaderIcon>
          <PageHeaderSummary>
            <PageHeaderTitle>CS2006P Project Hub</PageHeaderTitle>
            <PageHeaderDescription>
              Trekking Management App V2 · 2 Credits · Multi-Stage Progression, Verification & Viva
              Gate
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>

        <PageHeaderActions>
          {onNavigateToDashboard && (
            <Button
              variant="outline"
              size="small"
              onClick={onNavigateToDashboard}
              className="gap-1.5"
            >
              <LayoutDashboard className="size-3.5 text-brand" />
              <span>Dashboard</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="small"
            onClick={() => onOpenDocs("trekking-management-app")}
            className="gap-1.5"
          >
            <ExternalLink className="size-3.5 text-brand" />
            <span>TMA V2 Specification</span>
          </Button>
          <Button variant="default" size="small" onClick={onOpenHubSheet} className="gap-1.5">
            <span>Full Project Workspace</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Active Track</MetricCardLabel>
            <Clock className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-xl">
              {state.projectState.track === "theory_registered_current"
                ? "Sept 2026 Term"
                : "Prior Term"}
            </MetricCardValue>
            <MetricCardDifferential
              variant="neutral"
              value={currentTrackConfig ? currentTrackConfig.submissionDeadline : "Select Track"}
            />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Stages Progression</MetricCardLabel>
            <CheckCircle2 className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>
              {completedStagesCount} / {PROJECT_STAGES.length}
            </MetricCardValue>
            <MetricCardDifferential variant="positive" value={`${stagePercentage}%`} />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Requirements Met</MetricCardLabel>
            <ShieldCheck className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>
              {completedRequirementsCount} / {totalRequirements}
            </MetricCardValue>
            <MetricCardDifferential variant="positive" value={`${reqPercentage}%`} />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Viva Level 1 & 2</MetricCardLabel>
            <Award className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>
              {summary.l1Score !== null ? `${summary.l1Score} marks` : "Pending L1"}
            </MetricCardValue>
            <MetricCardDifferential
              variant={summary.l1Score !== null && summary.l1Score >= 20 ? "positive" : "neutral"}
              value={
                summary.l1Score !== null && summary.l1Score >= 30 ? "L2 Unlocked" : "Threshold 20"
              }
            />
          </MetricCardContent>
        </MetricCard>
      </div>

      {/* 3. Main Project Tabs */}
      <Tabs defaultValue="stages" className="w-full flex flex-col gap-6">
        <div className="border-b border-border-default pb-0 overflow-x-auto scrollbar-none">
          <TabsList
            variant="line"
            className="h-10 w-full sm:w-auto flex-nowrap min-w-max touch-pan-x"
          >
            <TabsTrigger
              value="stages"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground text-foreground-light font-mono text-xs px-4 touch-manipulation"
            >
              Progression Stages ({completedStagesCount}/{PROJECT_STAGES.length})
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground text-foreground-light font-mono text-xs px-4 touch-manipulation"
            >
              Specification Checklist ({completedRequirementsCount}/{totalRequirements})
            </TabsTrigger>
            <TabsTrigger
              value="track"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground text-foreground-light font-mono text-xs px-4 touch-manipulation"
            >
              Track Configuration
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Stages Progression */}
        <TabsContent value="stages" className="flex flex-col gap-6 outline-hidden">
          <PageSection>
            <PageSectionMeta>
              <PageSectionSummary>
                <PageSectionTitle>Milestone Pipeline</PageSectionTitle>
                <PageSectionDescription>
                  8 chronological project stages from Git Tracker registration through Level 2 Viva.
                </PageSectionDescription>
              </PageSectionSummary>

              <PageSectionAside>
                <div className="w-36">
                  <Progress value={stagePercentage} />
                </div>
              </PageSectionAside>
            </PageSectionMeta>

            <PageSectionContent>
              <div className="rounded-lg border border-border-default overflow-hidden bg-surface-100 divide-y divide-border-default">
                {PROJECT_STAGES.map((stage) => {
                  const isDone = state.projectState.completedStageIds.includes(stage.id);

                  return (
                    <div
                      key={stage.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-surface-200/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <Checkbox
                          id={`stage-${stage.id}`}
                          checked={isDone}
                          onCheckedChange={() => onToggleStage(stage.id)}
                          aria-label={`Toggle stage: ${stage.name}`}
                          className="mt-0.5 size-5"
                        />
                        <div className="flex flex-col gap-0.5">
                          <label
                            htmlFor={`stage-${stage.id}`}
                            className={`text-sm font-medium cursor-pointer ${
                              isDone ? "text-foreground line-through opacity-75" : "text-foreground"
                            }`}
                          >
                            {stage.name}
                          </label>
                          <span className="text-xs text-foreground-lighter leading-relaxed">
                            {stage.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {stage.isGateForNext && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Required Gate
                          </Badge>
                        )}
                        <Badge
                          variant={isDone ? "brand" : "secondary"}
                          className="text-[10px] font-mono"
                        >
                          {isDone ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PageSectionContent>
          </PageSection>
        </TabsContent>

        {/* Tab 2: Requirements Checklist */}
        <TabsContent value="requirements" className="flex flex-col gap-6 outline-hidden">
          <PageSection>
            <PageSectionMeta>
              <PageSectionSummary>
                <PageSectionTitle>TMA V2 Feature Specification</PageSectionTitle>
                <PageSectionDescription>
                  Full requirements list for Flask, Vue.js, Celery, Redis, and RBAC authentication.
                </PageSectionDescription>
              </PageSectionSummary>
            </PageSectionMeta>

            <PageSectionContent>
              <div className="rounded-lg border border-border-default overflow-x-auto bg-surface-100 touch-pan-x scrollbar-thin">
                <Table className="min-w-[550px] sm:min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[8%]">Status</TableHead>
                      <TableHead className="w-[18%]">Category</TableHead>
                      <TableHead className="w-[30%]">Requirement</TableHead>
                      <TableHead className="w-[44%]">Specification Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TMA_V2_REQUIREMENTS.map((req) => {
                      const isChecked = state.projectState.checkedRequirements.includes(req.id);

                      return (
                        <TableRow
                          key={req.id}
                          className="cursor-pointer hover:bg-surface-200/50 transition-colors"
                          tabIndex={0}
                          role="row"
                          aria-label={`Requirement: ${req.title}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onToggleRequirement(req.id);
                            }
                          }}
                          onClick={() => onToggleRequirement(req.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              id={`req-${req.id}`}
                              checked={isChecked}
                              onCheckedChange={() => onToggleRequirement(req.id)}
                              aria-label={`Toggle requirement: ${req.title}`}
                              className="size-4"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                              {req.category.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{req.title}</TableCell>
                          <TableCell className="text-xs text-foreground-light">
                            {req.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </PageSectionContent>
          </PageSection>
        </TabsContent>

        {/* Tab 3: Track Configuration */}
        <TabsContent value="track" className="flex flex-col gap-6 outline-hidden">
          <PageSection>
            <PageSectionMeta>
              <PageSectionSummary>
                <PageSectionTitle>Evaluation Track Selection</PageSectionTitle>
                <PageSectionDescription>
                  Your registration status determines your submission deadline and scoring base.
                </PageSectionDescription>
              </PageSectionSummary>
            </PageSectionMeta>

            <PageSectionContent>
              <div
                role="radiogroup"
                aria-label="Project Track"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {(Object.keys(PROJECT_TRACKS) as ProjectTrack[]).map(
                  (trackKey, currentIndex, tracks) => {
                    const track = PROJECT_TRACKS[trackKey];
                    const isSelected = state.projectState.track === trackKey;

                    return (
                      <button
                        type="button"
                        key={trackKey}
                        role="radio"
                        tabIndex={state.projectState.track === null ? 0 : isSelected ? 0 : -1}
                        aria-checked={isSelected}
                        onClick={() => onSetTrack(trackKey)}
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
                        className={`text-left p-5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          isSelected
                            ? "border-brand bg-surface-200/90 shadow-xs"
                            : "border-border-default bg-surface-100 hover:border-border-strong"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-heading font-semibold text-foreground text-sm">
                              {track.name}
                            </span>
                            {isSelected && <Badge variant="brand">Active Track</Badge>}
                          </div>
                          <p className="text-xs text-foreground-light leading-relaxed">
                            {track.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-border-default/60">
                          <span className="text-foreground-lighter">SUBMISSION DEADLINE</span>
                          <span className="font-bold text-foreground tabular-nums">
                            {track.submissionDeadline}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </PageSectionContent>
          </PageSection>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
});
