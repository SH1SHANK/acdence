import React from "react";
import type { CourseCode } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { PersistedUserState, SctStatus } from "@/types/state";
import type { AssessmentRecord } from "@/types/assessment";
import type { DbGradeRecord } from "@/types/gradeRecord";
import { COURSES } from "@/data/courses";
import { getAssessmentsForCourse } from "@/data/assessments";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  Calculator,
  RotateCcw,
  Sparkles,
  Layers,
  Users,
} from "lucide-react";

interface CourseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseCode: CourseCode | null;
  state: PersistedUserState;
  gradeResult: GradeCalculationResult | null;
  portalGrades?: DbGradeRecord[];
  unmatchedGrades?: DbGradeRecord[];
  matchedDetails?: Record<string, DbGradeRecord>;
  onUpdateAssessment: (assessmentId: string, updates: Partial<AssessmentRecord>) => void;
  onSetSct: (courseCode: CourseCode, status: SctStatus) => void;
  onResetToOfficial?: (courseCode: CourseCode) => void;
}

export const CourseDetailSheet: React.FC<CourseDetailSheetProps> = ({
  open,
  onOpenChange,
  courseCode,
  state,
  gradeResult,
  portalGrades: _portalGrades = [],
  unmatchedGrades = [],
  matchedDetails = {},
  onUpdateAssessment,
  onSetSct,
  onResetToOfficial,
}) => {
  if (!courseCode || courseCode === "CS2006P") return null;
  const course = COURSES[courseCode];
  if (!course) return null;

  const assessments = getAssessmentsForCourse(courseCode);
  const sctStatus = state.sctStatus[courseCode] || "pending";

  // Filter unmatched grades specific to this course
  const courseUnmatchedGrades = unmatchedGrades.filter(
    (g) => g.course_code?.toUpperCase().trim() === courseCode.toUpperCase().trim(),
  );

  // Check if any assessment in this course has a What-If user modification differing from official portal data
  const hasWhatIfModifications = assessments.some((assessment) => {
    const current = state.assessmentRecords[assessment.id];
    const official = matchedDetails[assessment.id];
    if (!official) return false;

    const officialScore = typeof official.your_score === "number" ? official.your_score : null;
    const isOfficialAbsent = String(official.score_status || "").toUpperCase() === "ABSENT";
    const officialStatus = isOfficialAbsent
      ? "absent"
      : officialScore !== null
        ? "present"
        : "pending";

    if (!current) return false;
    return current.score !== officialScore || current.status !== officialStatus;
  });

  // Derive scores
  const currentT =
    gradeResult?.totalScore !== undefined && gradeResult?.totalScore !== null
      ? gradeResult.totalScore.toFixed(1)
      : "—";

  const gaaValue =
    gradeResult?.gaa?.score !== undefined && gradeResult?.gaa?.score !== null
      ? gradeResult.gaa.score.toFixed(1)
      : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface-100 border-l border-border-default text-foreground p-0 flex flex-col overflow-hidden"
      >
        {/* Sticky Sheet Header */}
        <SheetHeader className="p-5 sm:p-6 border-b border-border-default bg-surface-100/95 backdrop-blur-sm shrink-0 pr-10">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-base font-bold text-brand">{course.code}</span>
            <Badge
              variant="outline"
              className="text-xs font-mono py-0 px-1.5 border-border-default"
            >
              {course.credits} Credits · Theory
            </Badge>
            {course.hasSct && (
              <Badge
                variant="outline"
                className={`text-xs font-mono py-0 px-1.5 ${
                  sctStatus === "passed"
                    ? "border-success/30 text-success bg-success/10"
                    : sctStatus === "failed"
                      ? "border-destructive/30 text-destructive bg-destructive/10"
                      : "border-warning/30 text-warning bg-warning/10"
                }`}
              >
                SCT: {sctStatus.toUpperCase()}
              </Badge>
            )}
            {hasWhatIfModifications && (
              <Badge
                variant="outline"
                className="text-xs font-mono py-0 px-1.5 border-warning/40 text-warning bg-warning/10 flex items-center gap-1"
              >
                <Sparkles className="size-3" />
                <span>WHAT-IF ACTIVE</span>
              </Badge>
            )}
          </div>

          <SheetTitle className="text-balance text-lg font-bold text-foreground text-left">
            {course.name}
          </SheetTitle>
          <SheetDescription className="text-pretty text-xs text-foreground-light text-left">
            Official IITM portal grade snapshot, interactive score simulator, and exam eligibility
            gates
          </SheetDescription>

          {/* SCT Status Toggle (if course requires SCT) */}
          {course.hasSct && (
            <div className="mt-3 pt-3 border-t border-border-default/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-foreground-light font-mono">
                System Compatibility Test (SCT):
              </span>
              <div className="flex items-center gap-1">
                {(["pending", "passed", "failed"] as SctStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onSetSct(course.code, status)}
                    className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all cursor-pointer ${
                      sctStatus === status
                        ? status === "passed"
                          ? "bg-success/20 text-success border border-success/40 font-semibold"
                          : status === "failed"
                            ? "bg-destructive/10 text-destructive border border-destructive/40 font-semibold"
                            : "bg-warning/20 text-warning border border-warning/40 font-semibold"
                        : "bg-surface-200 text-foreground-lighter hover:text-foreground border border-border-default"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* What-If Simulation Banner */}
          {hasWhatIfModifications && (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-warning shrink-0" />
                <span className="text-foreground">
                  Simulating hypothetical scores. Official IITM grade snapshot remains untouched.
                </span>
              </div>
              {onResetToOfficial && (
                <button
                  type="button"
                  onClick={() => onResetToOfficial(course.code)}
                  className="px-2.5 py-1 rounded text-xs font-mono text-foreground-light hover:text-foreground bg-surface-200 border border-border-default hover:border-border-strong flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset to Official</span>
                </button>
              )}
            </div>
          )}

          {/* 1. Live Factual Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* T Score Metric */}
            <div className="bg-surface-200/50 rounded-lg p-4 border border-border-default">
              <div className="flex items-center justify-between text-xs font-mono text-foreground-lighter uppercase mb-1">
                <span>Current T Score</span>
                <span className="text-[11px] text-foreground-lighter tabular-nums">
                  Passing &ge; 40.0
                </span>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {currentT}
                {currentT !== "—" && (
                  <span className="text-sm font-normal text-foreground-lighter"> / 100</span>
                )}
              </div>
              <p className="text-pretty text-[11px] text-foreground-light mt-1 line-clamp-1">
                {gradeResult?.formulaDescription || "Awaiting essential exam components"}
              </p>
            </div>

            {/* GAA Metric */}
            <div className="bg-surface-200/50 rounded-lg p-4 border border-border-default">
              <div className="flex items-center justify-between text-xs font-mono text-foreground-lighter uppercase mb-1">
                <span>GAA Average</span>
                <span className="text-[11px] text-foreground-lighter tabular-nums">
                  {gradeResult?.gaa
                    ? `${gradeResult.gaa.availableCount} of ${gradeResult.gaa.requiredCount} available`
                    : "Benchmark &ge; 40.0"}
                </span>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {gaaValue}
                {gaaValue !== "—" && (
                  <span className="text-sm font-normal text-foreground-lighter"> / 100</span>
                )}
              </div>
              <p className="text-pretty text-[11px] text-foreground-light mt-1 line-clamp-1">
                {course.gaaPolicy?.description || "Weekly assignment benchmark average"}
              </p>
            </div>
          </div>

          {/* 2. Independent Eligibility Gates Breakdown */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-brand" />
                <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                  Independent Eligibility Gates
                </h3>
              </div>
              <span className="text-[11px] font-mono text-foreground-lighter">
                Strict prerequisites per official document
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {gradeResult?.examEligibility && gradeResult.examEligibility.length > 0 ? (
                gradeResult.examEligibility.map((examResult) => {
                  const examName = formatExamName(examResult.exam);
                  const isEligible = examResult.eligible;

                  return (
                    <div
                      key={examResult.exam}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isEligible
                          ? "border-success/30 bg-success/5"
                          : "border-warning/30 bg-warning/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {examName}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono py-0 px-1.5 flex items-center gap-1 ${
                            isEligible
                              ? "border-success/40 text-success bg-success/10"
                              : "border-warning/40 text-warning bg-warning/10"
                          }`}
                        >
                          {isEligible ? (
                            <Check className="size-3 text-success shrink-0" />
                          ) : (
                            <AlertTriangle className="size-3 text-warning shrink-0" />
                          )}
                          <span>{isEligible ? "Eligible" : "Pending Requirements"}</span>
                        </Badge>
                      </div>

                      {/* Criteria breakdown */}
                      <div className="flex flex-col gap-1 text-xs">
                        {examResult.criteria.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="flex items-center justify-between py-1 px-2 rounded bg-background/50 border border-border/40 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              {c.satisfied ? (
                                <Check className="size-3.5 text-success shrink-0" />
                              ) : (
                                <AlertTriangle className="size-3.5 text-warning shrink-0" />
                              )}
                              <span className="text-foreground font-medium">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono tabular-nums text-foreground-lighter">
                              <span>Req: {c.required}</span>
                              <span
                                className={
                                  c.satisfied ? "text-success font-semibold" : "text-warning"
                                }
                              >
                                Act: {c.actual}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {examResult.reason && (
                        <p className="text-pretty text-[11px] text-foreground-light mt-2 pl-1">
                          {examResult.reason}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-foreground-lighter py-2 text-center bg-surface-200/50 rounded-lg">
                  No exam eligibility data available.
                </div>
              )}
            </div>
          </div>

          {/* 3. Interactive Assessment Score Editor & Cohort Metrics */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-brand" />
                <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                  Formula Assessments & Attendance ({assessments.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-foreground-lighter">
                Live recalculation · What-If isolated
              </span>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-surface-200 border border-border-default p-0.5 h-8">
                <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                  All ({assessments.length})
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-2.5 py-1">
                  Weekly Assignments
                </TabsTrigger>
                <TabsTrigger value="exams" className="text-xs px-2.5 py-1">
                  Quizzes & Exams
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex flex-col gap-2 pt-2">
                {renderAssessmentList(assessments, state, matchedDetails, onUpdateAssessment)}
              </TabsContent>

              <TabsContent value="weekly" className="flex flex-col gap-2 pt-2">
                {renderAssessmentList(
                  assessments.filter(
                    (a) => a.type === "weekly_objective" || a.type === "programming_grpa",
                  ),
                  state,
                  matchedDetails,
                  onUpdateAssessment,
                )}
              </TabsContent>

              <TabsContent value="exams" className="flex flex-col gap-2 pt-2">
                {renderAssessmentList(
                  assessments.filter(
                    (a) =>
                      a.type === "quiz" ||
                      a.type === "oppe" ||
                      a.type === "bpt" ||
                      a.type === "end_term",
                  ),
                  state,
                  matchedDetails,
                  onUpdateAssessment,
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* 4. Additional Portal Grades & Cohort Metrics (Unmatched Items) */}
          {courseUnmatchedGrades.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-brand" />
                  <h3 className="text-xs font-mono uppercase text-foreground-lighter font-semibold">
                    Additional Portal Grades ({courseUnmatchedGrades.length})
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono py-0 px-1.5 border-border-default"
                >
                  Official Portal Snapshot
                </Badge>
              </div>

              <p className="text-[11px] text-foreground-lighter">
                Official assignment grades captured from the IITM Grades portal. Retained for full
                visibility without altering the core 4-exam grading formula.
              </p>

              <div className="flex flex-col gap-2">
                {courseUnmatchedGrades.map((grade) => {
                  const scoreDisplay =
                    grade.your_score !== null
                      ? grade.your_score_raw || String(grade.your_score)
                      : grade.score_status || "UNRELEASED";

                  const isGraded = grade.your_score !== null;

                  return (
                    <div
                      key={grade.external_assignment_id || grade.id}
                      className="p-3 rounded-lg border border-border-default bg-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-foreground">{grade.title}</span>
                          <span className="text-[10px] font-mono text-foreground-lighter px-1.5 py-0.5 rounded bg-surface-200 border border-border-default">
                            {grade.module}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono py-0 px-1.5 ${
                              grade.score_status === "GRADED" ||
                              grade.evaluation_status === "Evaluated"
                                ? "border-success/40 text-success bg-success/10"
                                : "border-border-default text-foreground-lighter"
                            }`}
                          >
                            {grade.score_status || grade.evaluation_status || "Portal"}
                          </Badge>
                        </div>
                        {grade.due_date_text && (
                          <p className="text-[11px] text-foreground-lighter font-mono">
                            Due: {grade.due_date_text}
                          </p>
                        )}
                      </div>

                      {/* Score & Peer Metrics */}
                      <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                        {/* Peer metrics */}
                        <div className="flex items-center gap-2 text-[11px] text-foreground-lighter">
                          {grade.peer_average !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-200 border border-border-default">
                              Peer Avg: {grade.peer_average}%
                            </span>
                          )}
                          {grade.median_score !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-200 border border-border-default">
                              Median: {grade.median_score}
                            </span>
                          )}
                        </div>

                        {/* Your Score */}
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold tabular-nums ${isGraded ? "text-brand" : "text-foreground-lighter"}`}
                          >
                            {scoreDisplay}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Official Grading Formula & Citation Reference */}
          <div className="bg-surface-200/50 rounded-lg p-4 border border-border-default flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-foreground-lighter font-semibold uppercase">
              <BookOpen className="size-3.5 text-brand" />
              <span>Official IITM Document Reference</span>
            </div>
            <div className="p-2.5 rounded bg-surface-100 border border-border-default font-mono text-xs text-foreground overflow-x-auto">
              {getCourseFormulaCode(course.code)}
            </div>
            <div className="text-[11px] text-foreground-lighter font-mono pt-1">
              Source: {course.source.documentName} &bull; {course.source.documentSection} &bull;{" "}
              {course.source.page}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function renderAssessmentList(
  assessments: ReturnType<typeof getAssessmentsForCourse>,
  state: PersistedUserState,
  matchedDetails: Record<string, DbGradeRecord>,
  onUpdateAssessment: (assessmentId: string, updates: Partial<AssessmentRecord>) => void,
) {
  if (assessments.length === 0) {
    return (
      <div className="text-xs text-foreground-lighter py-4 text-center font-mono">
        No assessments in this category.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {assessments.map((assessment) => {
        const record = state.assessmentRecords[assessment.id] || {
          assessmentId: assessment.id,
          status: "pending",
          score: null,
        };

        const officialDetail = matchedDetails[assessment.id];
        const isPresent = record.status === "present";
        const isAbsent = record.status === "absent";

        // Check if user has modified from official
        const isWhatIf = officialDetail
          ? (typeof officialDetail.your_score === "number" &&
              officialDetail.your_score !== record.score) ||
            (officialDetail.your_score === null && record.score !== null)
          : false;

        return (
          <div
            key={assessment.id}
            className="p-3 rounded-lg border border-border-default bg-surface-100 hover:border-border-strong transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            {/* Title and metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="font-medium text-foreground">{assessment.name}</span>
                <span className="text-[10px] font-mono text-foreground-lighter px-1.5 py-0.5 rounded bg-surface-200 border border-border-default">
                  Max {assessment.maxScore}
                </span>
                {officialDetail && (
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono py-0 px-1 border-brand/30 text-brand bg-brand/5"
                  >
                    Portal Synced
                  </Badge>
                )}
                {isWhatIf && (
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono py-0 px-1 border-warning/40 text-warning bg-warning/10"
                  >
                    Simulated
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-foreground-lighter line-clamp-1">
                {assessment.weightDescription}
              </p>

              {/* Peer Statistics if available from official portal */}
              {officialDetail &&
                (officialDetail.peer_average !== null || officialDetail.median_score !== null) && (
                  <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-foreground-lighter">
                    <Users className="size-3 text-foreground-lighter" />
                    {officialDetail.peer_average !== null && (
                      <span>Cohort Avg: {officialDetail.peer_average}%</span>
                    )}
                    {officialDetail.median_score !== null && (
                      <span>&bull; Median: {officialDetail.median_score}</span>
                    )}
                  </div>
                )}
            </div>

            {/* Status Selector & Score Input */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Status Segment */}
              <div
                role="radiogroup"
                aria-label={`Status for ${assessment.name}`}
                className="flex items-center rounded-md border border-border-default p-0.5 bg-surface-200 text-[11px] font-mono"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={record.status === "pending"}
                  onClick={() =>
                    onUpdateAssessment(assessment.id, {
                      status: "pending",
                      score: null,
                    })
                  }
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    record.status === "pending"
                      ? "bg-surface-100 text-foreground font-semibold shadow-xs"
                      : "text-foreground-lighter hover:text-foreground"
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPresent}
                  onClick={() =>
                    onUpdateAssessment(assessment.id, {
                      status: "present",
                      score: record.score !== null ? record.score : 0,
                    })
                  }
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    isPresent
                      ? "bg-brand/20 text-brand font-semibold shadow-xs"
                      : "text-foreground-lighter hover:text-foreground"
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isAbsent}
                  onClick={() =>
                    onUpdateAssessment(assessment.id, {
                      status: "absent",
                      score: 0,
                    })
                  }
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    isAbsent
                      ? "bg-destructive/20 text-destructive font-semibold shadow-xs"
                      : "text-foreground-lighter hover:text-foreground"
                  }`}
                >
                  Absent
                </button>
              </div>

              {/* Numeric Score Input */}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={assessment.maxScore}
                  step={0.5}
                  disabled={!isPresent}
                  placeholder="—"
                  aria-label={`Score for ${assessment.name}`}
                  value={isPresent && record.score !== null ? record.score : ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    const clamped = isNaN(val)
                      ? 0
                      : Math.max(0, Math.min(assessment.maxScore, val));
                    onUpdateAssessment(assessment.id, {
                      status: "present",
                      score: clamped,
                    });
                  }}
                  className="w-16 h-7 text-xs font-mono tabular-nums text-center bg-surface-200 border-border-default focus-visible:border-brand"
                />
                <span className="text-[11px] font-mono text-foreground-lighter">
                  / {assessment.maxScore}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatExamName(exam: string): string {
  switch (exam) {
    case "end_term":
      return "End Term Exam (In-Person TCS Centre)";
    case "oppe_1":
      return "OPPE 1 (Programming Exam 1)";
    case "oppe_2":
      return "OPPE 2 (Programming Exam 2)";
    case "re_oppe":
      return "Re-OPPE (Makeup / Repeat Exam)";
    case "quiz_1":
      return "Quiz 1 (In-Person TCS Centre)";
    case "quiz_2":
      return "Quiz 2 (In-Person TCS Centre)";
    default:
      return exam.replace(/_/g, " ").toUpperCase();
  }
}

function getCourseFormulaCode(code: CourseCode): string {
  switch (code) {
    case "CS2005":
      return "T = 0.05 GAA + 0.20 max(PE1, PE2) + 0.45 F + max(0.20 max(Q1, Q2), 0.10 Q1 + 0.20 Q2) + 0.10 min(PE1, PE2)";
    case "SE2001":
      return "T = 0.05 GAA + 0.25 Qz1 + 0.30 OPPE + 0.30 F + 0.10 BPTA";
    case "CS2006":
    case "MS2001":
      return "T = 0.05 GAA + max(0.60 F + 0.25 max(Q1, Q2), 0.40 F + 0.25 Q1 + 0.30 Q2)";
    default:
      return "See official IITM grading document for exact formula.";
  }
}
