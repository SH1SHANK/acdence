import * as React from "react";
import type { CourseCode } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { AssessmentRecord } from "@/types/assessment";
import type { DbGradeRecord } from "@/types/gradeRecord";
import { COURSES } from "@/data/courses";
import { getAssessmentsForCourse } from "@/data/assessments";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CoursePerformanceMatrixProps {
  courseGrades: Record<CourseCode, GradeCalculationResult | null>;
  records: Record<string, AssessmentRecord>;
  portalGradeDetails?: Record<string, DbGradeRecord>;
  todayDate: string;
  onSelectCourse?: (code: CourseCode) => void;
  onOpenProjectHub?: () => void;
}

const THEORY_CODES: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];

export const CoursePerformanceMatrix: React.FC<CoursePerformanceMatrixProps> = React.memo(
  function CoursePerformanceMatrix({
    courseGrades,
    records,
    portalGradeDetails = {},
    todayDate: _todayDate,
    onSelectCourse,
    onOpenProjectHub: _onOpenProjectHub,
  }) {
    return (
      <div className="w-full flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-surface-200 border border-border-default text-brand">
                <BookOpen className="size-3.5" />
              </span>
              <h2 className="text-balance text-base font-semibold font-heading tracking-tight text-foreground">
                Course Performance & Eligibility Matrix
              </h2>
            </div>
            <p className="text-pretty text-xs text-foreground-light mt-0.5">
              Formulas, GAA progress, and exam eligibility criteria across 4 theory courses
            </p>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {THEORY_CODES.map((code) => {
            const course = COURSES[code];
            const gradeResult = courseGrades[code];
            const gaa = gradeResult?.gaa;
            const definitions = getAssessmentsForCourse(code);

            // Compute exam records
            const quiz1Def = definitions.find((d) => d.id.endsWith("quiz_01"));
            const quiz2Def = definitions.find((d) => d.id.endsWith("quiz_02"));
            const oppe1Def = definitions.find((d) => d.type === "oppe");
            const endTermDef = definitions.find((d) => d.type === "end_term");

            const q1Rec = quiz1Def ? records[quiz1Def.id] : undefined;
            const q2Rec = quiz2Def ? records[quiz2Def.id] : undefined;
            const oppeRec = oppe1Def ? records[oppe1Def.id] : undefined;
            const etRec = endTermDef ? records[endTermDef.id] : undefined;

            // Course-level peer mean delta
            let courseDeltaSum = 0;
            let courseDeltaCount = 0;
            for (const def of definitions) {
              const detail = portalGradeDetails[def.id];
              const rec = records[def.id];
              const score = rec?.score ?? detail?.your_score ?? null;
              if (
                score !== null &&
                detail?.peer_average !== null &&
                detail?.peer_average !== undefined
              ) {
                courseDeltaSum += score - detail.peer_average;
                courseDeltaCount++;
              }
            }
            const courseAvgDelta = courseDeltaCount > 0 ? courseDeltaSum / courseDeltaCount : null;

            // Eligibility Gate Status
            const isGaaEligible =
              gaa?.score !== null && gaa?.score !== undefined ? gaa.score >= 40 : null;

            return (
              <div
                key={code}
                onClick={() => onSelectCourse?.(code)}
                className="group relative p-4 rounded-xl border border-border-default bg-surface-100 hover:border-border-strong hover:bg-surface-200/50 transition-all flex flex-col justify-between gap-3 shadow-xs cursor-pointer"
              >
                {/* Header: Code + Name + Credits + Delta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand">{course.code}</span>
                      <span className="text-[10px] font-mono text-foreground-lighter">
                        {course.credits} Credits
                      </span>
                      {courseAvgDelta !== null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-mono px-1 py-0",
                            courseAvgDelta >= 0
                              ? "bg-brand/10 text-brand border-brand/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                          )}
                        >
                          {courseAvgDelta >= 0
                            ? `+${courseAvgDelta.toFixed(1)}%`
                            : `${courseAvgDelta.toFixed(1)}%`}{" "}
                          vs cohort
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold font-heading text-foreground group-hover:text-brand transition-colors mt-1 truncate">
                      {course.name}
                    </h3>
                  </div>

                  <ArrowRight className="size-4 shrink-0 text-foreground-lighter group-hover:text-brand transition-colors mt-0.5" />
                </div>

                {/* Score Summary Metrics */}
                <div className="grid grid-cols-2 gap-2.5 py-2.5 border-y border-border-default/60">
                  {/* Total Score */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                      Calculated Total (T)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold font-mono text-foreground tabular-nums">
                        {gradeResult?.totalScore !== null && gradeResult?.totalScore !== undefined
                          ? gradeResult.totalScore.toFixed(1)
                          : "—"}
                      </span>
                      {gradeResult?.totalScore !== null &&
                        gradeResult?.totalScore !== undefined && (
                          <span className="text-[10px] font-mono text-foreground-lighter">
                            / 100
                          </span>
                        )}
                    </div>
                  </div>

                  {/* GAA Average */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                      GAA Average
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold font-mono text-foreground tabular-nums">
                        {gaa?.score !== null && gaa?.score !== undefined
                          ? gaa.score.toFixed(1)
                          : "—"}
                      </span>
                      {gaa?.score !== null && gaa?.score !== undefined && (
                        <span className="text-[10px] font-mono text-foreground-lighter">/ 100</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exam Marks Snapshot */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {/* Quiz 1 */}
                  <div className="p-1.5 rounded-md bg-surface-200/60 border border-border-default">
                    <span className="block text-[9px] font-mono text-foreground-lighter">Q1</span>
                    <span className="block text-xs font-bold font-mono text-foreground tabular-nums mt-0.5">
                      {q1Rec?.score !== null && q1Rec?.score !== undefined ? q1Rec.score : "—"}
                    </span>
                  </div>

                  {/* Quiz 2 */}
                  <div className="p-1.5 rounded-md bg-surface-200/60 border border-border-default">
                    <span className="block text-[9px] font-mono text-foreground-lighter">Q2</span>
                    <span className="block text-xs font-bold font-mono text-foreground tabular-nums mt-0.5">
                      {q2Rec?.score !== null && q2Rec?.score !== undefined ? q2Rec.score : "—"}
                    </span>
                  </div>

                  {/* OPPE */}
                  <div className="p-1.5 rounded-md bg-surface-200/60 border border-border-default">
                    <span className="block text-[9px] font-mono text-foreground-lighter">
                      {course.hasSct ? "OPPE" : "PA"}
                    </span>
                    <span className="block text-xs font-bold font-mono text-foreground tabular-nums mt-0.5">
                      {oppeRec?.score !== null && oppeRec?.score !== undefined
                        ? oppeRec.score
                        : "—"}
                    </span>
                  </div>

                  {/* End Term */}
                  <div className="p-1.5 rounded-md bg-surface-200/60 border border-border-default">
                    <span className="block text-[9px] font-mono text-foreground-lighter">
                      End Term
                    </span>
                    <span className="block text-xs font-bold font-mono text-foreground tabular-nums mt-0.5">
                      {etRec?.score !== null && etRec?.score !== undefined ? etRec.score : "—"}
                    </span>
                  </div>
                </div>

                {/* Eligibility Gate Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    {isGaaEligible === true ? (
                      <span className="flex items-center gap-1 text-brand font-medium text-[10px]">
                        <CheckCircle2 className="size-3" />
                        <span>GAA Gate Met (≥40)</span>
                      </span>
                    ) : isGaaEligible === false ? (
                      <span className="flex items-center gap-1 text-amber-400 font-medium text-[10px]">
                        <AlertTriangle className="size-3" />
                        <span>GAA Gate Incomplete</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-foreground-lighter text-[10px]">
                        <Clock className="size-3" />
                        <span>GAA in Progress</span>
                      </span>
                    )}
                  </div>

                  {course.hasSct && (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono bg-surface-200 border-border-default text-foreground-light px-1.5 py-0"
                    >
                      <ShieldCheck className="size-2.5 mr-1 text-brand" />
                      SCT Required
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CoursePerformanceMatrix.displayName = "CoursePerformanceMatrix";
