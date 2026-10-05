import * as React from "react";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord, AssessmentDefinition } from "@/types/assessment";
import type { GradeCalculationResult } from "@/types/grading";
import type { NextHardCutoffSummary } from "@/lib/selectors";
import type { DbGradeRecord } from "@/types/gradeRecord";
import { COURSES } from "@/data/courses";
import {
  GraduationCap,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AcademicSummaryKPIProps {
  courseGrades: Record<CourseCode, GradeCalculationResult | null>;
  assessmentRecords: Record<string, AssessmentRecord>;
  assessmentDefinitions: AssessmentDefinition[];
  portalGradeDetails?: Record<string, DbGradeRecord>;
  nextCutoff: NextHardCutoffSummary;
  onNavigateToCalendar?: () => void;
  onNavigateToCourses?: () => void;
}

const GRADE_POINTS: Record<string, number> = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 4,
  U: 0,
};

function scoreToGradePoint(score: number): { grade: string; point: number } {
  if (score >= 90) return { grade: "S", point: 10 };
  if (score >= 80) return { grade: "A", point: 9 };
  if (score >= 70) return { grade: "B", point: 8 };
  if (score >= 60) return { grade: "C", point: 7 };
  if (score >= 50) return { grade: "D", point: 6 };
  if (score >= 40) return { grade: "E", point: 4 };
  return { grade: "U", point: 0 };
}

export const AcademicSummaryKPI: React.FC<AcademicSummaryKPIProps> = React.memo(
  function AcademicSummaryKPI({
    courseGrades,
    assessmentRecords,
    assessmentDefinitions,
    portalGradeDetails = {},
    nextCutoff,
    onNavigateToCalendar,
    onNavigateToCourses,
  }) {
    // 1. Calculate Estimated / Projected CGPA based on credits
    const { projectedGpa, completedCoursesCount } = React.useMemo(() => {
      let totalWeightedPoints = 0;
      let evaluatedCredits = 0;
      let completedCount = 0;

      const theoryCodes: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];

      for (const code of theoryCodes) {
        const course = COURSES[code];
        const gradeResult = courseGrades[code];
        const credits = course?.credits || 4;

        if (gradeResult) {
          if (gradeResult.letterGrade && GRADE_POINTS[gradeResult.letterGrade] !== undefined) {
            const point = GRADE_POINTS[gradeResult.letterGrade];
            totalWeightedPoints += point * credits;
            evaluatedCredits += credits;
            completedCount++;
          } else if (gradeResult.totalScore !== null) {
            const { point } = scoreToGradePoint(gradeResult.totalScore);
            totalWeightedPoints += point * credits;
            evaluatedCredits += credits;
            completedCount++;
          } else if (gradeResult.gaa?.score !== null) {
            // GAA as interim indicator
            const { point } = scoreToGradePoint(gradeResult.gaa.score);
            totalWeightedPoints += point * credits;
            evaluatedCredits += credits;
          }
        }
      }

      const gpa = evaluatedCredits > 0 ? totalWeightedPoints / evaluatedCredits : null;

      return {
        projectedGpa: gpa,
        completedCoursesCount: completedCount,
      };
    }, [courseGrades]);

    // 2. Calculate Real Mean Score % across all graded assessments
    const { averageScore, presentCount, totalAssessmentsCount, absentCount } = React.useMemo(() => {
      let scoreSum = 0;
      let present = 0;
      let absent = 0;

      for (const def of assessmentDefinitions) {
        const record = assessmentRecords[def.id];
        if (record?.status === "absent") {
          absent++;
        } else if (record?.status === "present" && record.score !== null) {
          scoreSum += (record.score / (def.maxScore || 100)) * 100;
          present++;
        }
      }

      const avg = present > 0 ? scoreSum / present : null;

      return {
        averageScore: avg,
        presentCount: present,
        totalAssessmentsCount: assessmentDefinitions.length,
        absentCount: absent,
      };
    }, [assessmentDefinitions, assessmentRecords]);

    // 3. Calculate Peer Cohort Delta from Supabase portal grade records
    const { peerDelta, peerComparisonCount } = React.useMemo(() => {
      let deltaSum = 0;
      let count = 0;

      for (const [id, detail] of Object.entries(portalGradeDetails)) {
        if (detail.peer_average !== null && detail.peer_average !== undefined) {
          const userRec = assessmentRecords[id];
          const userScore =
            userRec?.score ?? (detail.your_score !== null ? detail.your_score : null);

          if (userScore !== null && userScore !== undefined) {
            deltaSum += userScore - detail.peer_average;
            count++;
          }
        }
      }

      const avgDelta = count > 0 ? deltaSum / count : null;

      return {
        peerDelta: avgDelta,
        peerComparisonCount: count,
      };
    }, [portalGradeDetails, assessmentRecords]);

    const completionPercentage =
      totalAssessmentsCount > 0 ? Math.round((presentCount / totalAssessmentsCount) * 100) : 0;

    return (
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* KPI 1: Credit-Weighted Grade Average (10.0 Scale) */}
        <div
          onClick={onNavigateToCourses}
          className="group relative p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100 hover:border-border-strong hover:bg-surface-200/60 transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-foreground-lighter">
              Weighted Avg
            </span>
            <span className="p-1 rounded-md bg-surface-200 border border-border-default text-brand">
              <GraduationCap className="size-3.5" />
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
                {projectedGpa !== null ? projectedGpa.toFixed(2) : "—"}
              </span>
              {projectedGpa !== null && (
                <span className="text-xs font-mono text-foreground-lighter">/ 10.0</span>
              )}
            </div>
            <span className="text-[10px] text-foreground-lighter font-mono truncate">
              {completedCoursesCount > 0
                ? `${completedCoursesCount} courses graded`
                : "Credit-weighted · 4 Theory Courses"}
            </span>
          </div>
        </div>

        {/* KPI 2: Overall Mean Score */}
        <div
          onClick={onNavigateToCourses}
          className="group relative p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100 hover:border-border-strong hover:bg-surface-200/60 transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-foreground-lighter">
              Average Score
            </span>
            <span className="p-1 rounded-md bg-surface-200 border border-border-default text-sky-400">
              <Percent className="size-3.5" />
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
                {averageScore !== null ? `${averageScore.toFixed(1)}%` : "—"}
              </span>
            </div>
            <span className="text-[10px] text-foreground-lighter font-mono truncate">
              {presentCount > 0 ? `Across ${presentCount} graded items` : "Awaiting first score"}
            </span>
          </div>
        </div>

        {/* KPI 3: Cohort Peer Delta */}
        <div className="p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-foreground-lighter">
              Peer Cohort Δ
            </span>
            <span
              className={cn(
                "p-1 rounded-md border",
                peerDelta !== null && peerDelta >= 0
                  ? "bg-brand/10 border-brand/30 text-brand"
                  : peerDelta !== null
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : "bg-surface-200 border-border-default text-foreground-lighter",
              )}
            >
              <TrendingUp className="size-3.5" />
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {peerDelta !== null ? (
                <>
                  <span
                    className={cn(
                      "text-xl sm:text-2xl font-bold font-mono tabular-nums flex items-center",
                      peerDelta >= 0 ? "text-brand" : "text-rose-400",
                    )}
                  >
                    {peerDelta >= 0 ? (
                      <ArrowUpRight className="size-5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="size-5 shrink-0" />
                    )}
                    {peerDelta >= 0 ? `+${peerDelta.toFixed(1)}%` : `${peerDelta.toFixed(1)}%`}
                  </span>
                </>
              ) : (
                <span className="text-xl sm:text-2xl font-bold font-mono text-foreground-lighter">
                  —
                </span>
              )}
            </div>
            <span className="text-[10px] text-foreground-lighter font-mono truncate">
              {peerComparisonCount > 0
                ? `vs ${peerComparisonCount} portal benchmarks`
                : "Portal benchmarks pending"}
            </span>
          </div>
        </div>

        {/* KPI 4: Assessments Completed vs Pending */}
        <div className="p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-foreground-lighter">
              Assessments
            </span>
            <span className="p-1 rounded-md bg-surface-200 border border-border-default text-emerald-400">
              <CheckCircle2 className="size-3.5" />
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
                {presentCount}
                <span className="text-xs text-foreground-lighter font-normal font-mono ml-1">
                  / {totalAssessmentsCount}
                </span>
              </span>
              <span className="text-xs font-mono font-semibold text-brand tabular-nums">
                {completionPercentage}%
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-surface-300 overflow-hidden flex">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
              {absentCount > 0 && (
                <div
                  className="h-full bg-rose-500/60 transition-all duration-300"
                  style={{ width: `${(absentCount / totalAssessmentsCount) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {/* KPI 5: Next Critical Gate Countdown */}
        <div
          onClick={onNavigateToCalendar}
          className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100 hover:border-border-strong hover:bg-surface-200/60 transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-foreground-lighter flex items-center gap-1">
              <Sparkles className="size-3 text-amber-400" />
              Next Deadline
            </span>
            <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="size-3.5" />
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="text-sm sm:text-base font-bold font-mono text-foreground truncate">
              {nextCutoff.daysLeft !== null
                ? nextCutoff.daysLeft === 0
                  ? "Due Today!"
                  : nextCutoff.daysLeft === 1
                    ? "Tomorrow"
                    : `In ${nextCutoff.daysLeft} days`
                : "No active cutoff"}
            </div>
            <span className="text-[10px] text-brand font-mono truncate">
              {nextCutoff.event ? nextCutoff.event.title : "Term in progress"}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

AcademicSummaryKPI.displayName = "AcademicSummaryKPI";
