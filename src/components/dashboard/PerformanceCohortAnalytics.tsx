import * as React from "react";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord, AssessmentDefinition } from "@/types/assessment";
import type { DbGradeRecord } from "@/types/gradeRecord";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Table as TableIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PerformanceCohortAnalyticsProps {
  assessmentRecords: Record<string, AssessmentRecord>;
  assessmentDefinitions: AssessmentDefinition[];
  portalGradeDetails?: Record<string, DbGradeRecord>;
  onSelectCourse?: (code: CourseCode) => void;
}

type CategoryFilter = "all" | "gaa" | "quiz" | "oppe" | "end_term";

interface ChartDataPoint {
  id: string;
  name: string;
  shortName: string;
  courseCode: CourseCode;
  type: string;
  maxScore: number;
  yourScore: number | null;
  peerAverage: number | null;
  medianScore: number | null;
  delta: number | null;
  hasScore: boolean;
  hasPeerData: boolean;
}

export const PerformanceCohortAnalytics: React.FC<PerformanceCohortAnalyticsProps> = React.memo(
  function PerformanceCohortAnalytics({
    assessmentRecords,
    assessmentDefinitions,
    portalGradeDetails = {},
    onSelectCourse,
  }) {
    const [selectedCourse, setSelectedCourse] = React.useState<CourseCode | "all">("all");
    const [selectedCategory, setSelectedCategory] = React.useState<CategoryFilter>("all");
    const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");
    const [hoveredPoint, setHoveredPoint] = React.useState<ChartDataPoint | null>(null);

    // 1. Prepare and filter data points
    const dataPoints = React.useMemo<ChartDataPoint[]>(() => {
      const points: ChartDataPoint[] = [];

      for (const def of assessmentDefinitions) {
        // Course filter
        if (selectedCourse !== "all" && def.courseCode !== selectedCourse) continue;

        // Category filter
        if (selectedCategory === "gaa") {
          if (def.type !== "weekly_objective" && def.type !== "programming_grpa") continue;
        } else if (selectedCategory === "quiz") {
          if (def.type !== "quiz") continue;
        } else if (selectedCategory === "oppe") {
          if (def.type !== "oppe" && def.type !== "reoppe") continue;
        } else if (selectedCategory === "end_term") {
          if (def.type !== "end_term") continue;
        }

        const rec = assessmentRecords[def.id];
        const portalDetail = portalGradeDetails[def.id];

        const yourScore =
          rec?.status === "present" && rec.score !== null
            ? rec.score
            : (portalDetail?.your_score ?? null);

        const peerAverage = portalDetail?.peer_average ?? null;
        const medianScore = portalDetail?.median_score ?? null;

        const delta =
          yourScore !== null && peerAverage !== null
            ? Math.round((yourScore - peerAverage) * 10) / 10
            : null;

        // Create short label (e.g. "W1 GrPA", "Q1", "OPPE 1")
        let shortName = def.name;
        if (def.name.includes("Week") && def.name.includes("Graded Programming")) {
          const match = def.name.match(/Week\s+(\d+)/i);
          shortName = match ? `W${match[1]} GrPA` : def.name;
        } else if (def.name.includes("Week") && def.name.includes("Assessment")) {
          const match = def.name.match(/Week\s+(\d+)/i);
          shortName = match ? `W${match[1]} GA` : def.name;
        } else if (def.name.includes("Quiz 1")) {
          shortName = "Quiz 1";
        } else if (def.name.includes("Quiz 2")) {
          shortName = "Quiz 2";
        } else if (def.name.includes("OPPE 1") || def.name.includes("Exam 1")) {
          shortName = "OPPE 1";
        } else if (def.name.includes("OPPE 2") || def.name.includes("Exam 2")) {
          shortName = "OPPE 2";
        } else if (def.name.includes("End Term")) {
          shortName = "End Term";
        }

        points.push({
          id: def.id,
          name: def.name,
          shortName,
          courseCode: def.courseCode,
          type: def.type,
          maxScore: def.maxScore || 100,
          yourScore,
          peerAverage,
          medianScore,
          delta,
          hasScore: yourScore !== null,
          hasPeerData: peerAverage !== null || medianScore !== null,
        });
      }

      return points;
    }, [
      assessmentDefinitions,
      assessmentRecords,
      portalGradeDetails,
      selectedCourse,
      selectedCategory,
    ]);

    // 2. Summary stats for the active filtered subset
    const summary = React.useMemo(() => {
      let yourScoreSum = 0;
      let yourCount = 0;
      let peerSum = 0;
      let peerCount = 0;
      let medianSum = 0;
      let medianCount = 0;
      let deltaSum = 0;
      let deltaCount = 0;

      for (const p of dataPoints) {
        if (p.yourScore !== null) {
          yourScoreSum += p.yourScore;
          yourCount++;
        }
        if (p.peerAverage !== null) {
          peerSum += p.peerAverage;
          peerCount++;
        }
        if (p.medianScore !== null) {
          medianSum += p.medianScore;
          medianCount++;
        }
        if (p.delta !== null) {
          deltaSum += p.delta;
          deltaCount++;
        }
      }

      return {
        yourAvg: yourCount > 0 ? yourScoreSum / yourCount : null,
        peerAvg: peerCount > 0 ? peerSum / peerCount : null,
        medianAvg: medianCount > 0 ? medianSum / medianCount : null,
        netDelta: deltaCount > 0 ? deltaSum / deltaCount : null,
        deltaCount,
      };
    }, [dataPoints]);

    // Limit to items with scores or peer data for the chart view, or first 16 items
    const chartPoints = React.useMemo(() => {
      const withData = dataPoints.filter((p) => p.hasScore || p.hasPeerData);
      if (withData.length > 0) return withData;
      return dataPoints.slice(0, 10);
    }, [dataPoints]);

    return (
      <div className="w-full flex flex-col gap-4 rounded-xl border border-border-default bg-surface-100 p-4 sm:p-5 shadow-xs">
        {/* Section Header + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-surface-200 border border-border-default text-brand">
                <TrendingUp className="size-3.5" />
              </span>
              <h2 className="text-balance text-base font-semibold font-heading tracking-tight text-foreground">
                Performance vs Cohort
              </h2>
            </div>
            <p className="text-pretty text-xs text-foreground-light mt-0.5">
              Compare your academic trajectory against IITM cohort peer mean and median
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-surface-200 p-1 rounded-lg border border-border-default">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              aria-label="Chart view"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer",
                viewMode === "chart"
                  ? "bg-surface-100 text-brand font-medium shadow-xs"
                  : "text-foreground-lighter hover:text-foreground",
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-surface-100 text-brand font-medium shadow-xs"
                  : "text-foreground-lighter hover:text-foreground",
              )}
            >
              <TableIcon className="size-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border-default/60">
          {/* Course Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter mr-1 hidden sm:inline">
              Course:
            </span>
            {(["all", "CS2005", "SE2001", "CS2006", "MS2001"] as const).map((course) => (
              <button
                key={course}
                type="button"
                onClick={() => setSelectedCourse(course)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer",
                  selectedCourse === course
                    ? "bg-brand/15 text-brand border border-brand/30 font-semibold"
                    : "text-foreground-lighter hover:text-foreground hover:bg-surface-200 border border-transparent",
                )}
              >
                {course === "all" ? "All Courses" : course}
              </button>
            ))}
          </div>

          {/* Category Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter mr-1 hidden sm:inline">
              Type:
            </span>
            {(
              [
                { id: "all", label: "All Types" },
                { id: "gaa", label: "GAA" },
                { id: "quiz", label: "Quizzes" },
                { id: "oppe", label: "OPPEs" },
                { id: "end_term", label: "End Term" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer",
                  selectedCategory === cat.id
                    ? "bg-surface-300 text-foreground border border-border-strong font-medium"
                    : "text-foreground-lighter hover:text-foreground hover:bg-surface-200 border border-transparent",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Your Mean */}
          <div className="p-2.5 rounded-lg border border-border-default bg-surface-200/50 flex flex-col justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter truncate">
                Your Average
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tabular-nums">
              {summary.yourAvg !== null ? `${summary.yourAvg.toFixed(1)}%` : "—"}
            </div>
          </div>

          {/* Peer Mean */}
          <div className="p-2.5 rounded-lg border border-border-default bg-surface-200/50 flex flex-col justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter truncate">
                Peer Cohort Mean
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tabular-nums">
              {summary.peerAvg !== null ? `${summary.peerAvg.toFixed(1)}%` : "—"}
            </div>
          </div>

          {/* Median Score */}
          <div className="p-2.5 rounded-lg border border-border-default bg-surface-200/50 flex flex-col justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter truncate">
                Cohort Median
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tabular-nums">
              {summary.medianAvg !== null ? `${summary.medianAvg.toFixed(1)}%` : "—"}
            </div>
          </div>

          {/* Net Delta */}
          <div className="p-2.5 rounded-lg border border-border-default bg-surface-200/50 flex flex-col justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter truncate">
                Net Differential
              </span>
            </div>
            <div
              className={cn(
                "text-lg font-bold font-mono tabular-nums flex items-center gap-0.5",
                summary.netDelta !== null && summary.netDelta >= 0
                  ? "text-brand"
                  : summary.netDelta !== null
                    ? "text-rose-400"
                    : "text-foreground-lighter",
              )}
            >
              {summary.netDelta !== null ? (
                <>
                  {summary.netDelta >= 0 ? (
                    <ArrowUpRight className="size-4 shrink-0" />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0" />
                  )}
                  {summary.netDelta >= 0
                    ? `+${summary.netDelta.toFixed(1)}%`
                    : `${summary.netDelta.toFixed(1)}%`}
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area: Chart or Table */}
        {viewMode === "chart" ? (
          <div className="flex flex-col gap-3">
            {/* SVG Clustered Column Chart */}
            <div className="relative w-full overflow-x-auto pb-2 scrollbar-none">
              <div className="min-w-[600px] h-56 flex flex-col justify-end pt-6 px-2">
                {/* Y-Axis Grid Guidelines */}
                <div className="absolute inset-x-0 top-6 bottom-12 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full border-b border-dashed border-border-strong flex justify-end pr-2 text-[9px] font-mono">
                    100%
                  </div>
                  <div className="w-full border-b border-dashed border-border-strong flex justify-end pr-2 text-[9px] font-mono">
                    75%
                  </div>
                  <div className="w-full border-b border-dashed border-border-strong flex justify-end pr-2 text-[9px] font-mono">
                    50%
                  </div>
                  <div className="w-full border-b border-dashed border-border-strong flex justify-end pr-2 text-[9px] font-mono">
                    25%
                  </div>
                </div>

                {/* Bars Container */}
                <div className="relative z-10 flex items-end justify-between gap-3 h-40 border-b border-border-default pb-0.5">
                  {chartPoints.map((point) => {
                    const yourHeight =
                      point.yourScore !== null ? Math.max(4, (point.yourScore / 100) * 100) : 0;
                    const peerHeight =
                      point.peerAverage !== null ? Math.max(4, (point.peerAverage / 100) * 100) : 0;
                    const medianHeight =
                      point.medianScore !== null ? Math.max(4, (point.medianScore / 100) * 100) : 0;

                    const isHovered = hoveredPoint?.id === point.id;

                    return (
                      <div
                        key={point.id}
                        onMouseEnter={() => setHoveredPoint(point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className={cn(
                          "group/bar flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer transition-opacity",
                          hoveredPoint && !isHovered ? "opacity-50" : "opacity-100",
                        )}
                      >
                        {/* Clustered Columns */}
                        <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-full">
                          {/* 1. Your Score Bar */}
                          <div
                            className={cn(
                              "w-3 rounded-t transition-all duration-300 relative",
                              point.yourScore !== null
                                ? "bg-brand hover:brightness-110 shadow-xs"
                                : "bg-surface-300/40 h-1",
                            )}
                            style={{ height: `${yourHeight}%` }}
                          />

                          {/* 2. Peer Average Bar */}
                          <div
                            className={cn(
                              "w-3 rounded-t transition-all duration-300 relative",
                              point.peerAverage !== null
                                ? "bg-sky-400 hover:brightness-110 shadow-xs"
                                : "bg-surface-300/40 h-1",
                            )}
                            style={{ height: `${peerHeight}%` }}
                          />

                          {/* 3. Median Score Bar */}
                          <div
                            className={cn(
                              "w-3 rounded-t transition-all duration-300 relative",
                              point.medianScore !== null
                                ? "bg-amber-400 hover:brightness-110 shadow-xs"
                                : "bg-surface-300/40 h-1",
                            )}
                            style={{ height: `${medianHeight}%` }}
                          />
                        </div>

                        {/* X-Axis Label */}
                        <div className="mt-2 text-center truncate w-full">
                          <span className="block text-[10px] font-mono text-foreground-lighter group-hover/bar:text-brand transition-colors truncate">
                            {point.shortName}
                          </span>
                          <span className="block text-[8px] font-mono text-foreground-lighter/60 uppercase">
                            {point.courseCode}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div className="p-3 rounded-lg border border-border-default bg-surface-200/90 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold font-heading text-foreground">
                      {hoveredPoint.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono bg-surface-100 text-brand border-brand/30 px-1 py-0"
                    >
                      {hoveredPoint.courseCode}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-foreground-lighter font-mono mt-0.5">
                    Maximum Marks: {hoveredPoint.maxScore}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-brand" />
                    <span className="text-foreground-lighter">You:</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {hoveredPoint.yourScore !== null ? `${hoveredPoint.yourScore}` : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-400" />
                    <span className="text-foreground-lighter">Peer Mean:</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {hoveredPoint.peerAverage !== null ? `${hoveredPoint.peerAverage}` : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="text-foreground-lighter">Median:</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {hoveredPoint.medianScore !== null ? `${hoveredPoint.medianScore}` : "—"}
                    </span>
                  </div>

                  {hoveredPoint.delta !== null && (
                    <div
                      className={cn(
                        "font-bold tabular-nums flex items-center px-1.5 py-0.5 rounded",
                        hoveredPoint.delta >= 0
                          ? "bg-brand/10 text-brand border border-brand/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30",
                      )}
                    >
                      {hoveredPoint.delta >= 0
                        ? `+${hoveredPoint.delta}%`
                        : `${hoveredPoint.delta}%`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-foreground-lighter pt-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-brand" />
                <span>Your Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-sky-400" />
                <span>Peer Average (Mean)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-400" />
                <span>Cohort Median</span>
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-default text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                  <th className="py-2.5 px-3">Assessment</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3 text-right">Your Score</th>
                  <th className="py-2.5 px-3 text-right">Peer Mean</th>
                  <th className="py-2.5 px-3 text-right">Median</th>
                  <th className="py-2.5 px-3 text-right">Δ vs Cohort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50 font-mono">
                {dataPoints.map((point) => (
                  <tr key={point.id} className="hover:bg-surface-200/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-medium text-foreground">{point.name}</div>
                      <div className="text-[10px] text-foreground-lighter">{point.type}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onSelectCourse?.(point.courseCode)}
                        className="text-brand hover:underline cursor-pointer"
                      >
                        {point.courseCode}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {point.yourScore !== null ? (
                        <span className="font-bold text-foreground">{point.yourScore}</span>
                      ) : (
                        <span className="text-foreground-lighter">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-sky-400">
                      {point.peerAverage !== null ? point.peerAverage : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-amber-400">
                      {point.medianScore !== null ? point.medianScore : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {point.delta !== null ? (
                        <span
                          className={cn(
                            "font-semibold",
                            point.delta >= 0 ? "text-brand" : "text-rose-400",
                          )}
                        >
                          {point.delta >= 0 ? `+${point.delta}%` : `${point.delta}%`}
                        </span>
                      ) : (
                        <span className="text-foreground-lighter">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
);

PerformanceCohortAnalytics.displayName = "PerformanceCohortAnalytics";
