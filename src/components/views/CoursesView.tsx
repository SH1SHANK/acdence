import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  ExternalLink,
  Calculator,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
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
import { Input } from "@/components/ui/input";
import { COURSES } from "@/data/courses";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";
import type { CourseCode } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { PersistedUserState } from "@/types/state";
import type { AssessmentRecord, AssessmentDefinition } from "@/types/assessment";
import type { Course } from "@/types/course";

export interface CoursesViewProps {
  state: PersistedUserState;
  courseGrades: Record<CourseCode, GradeCalculationResult | null>;
  courses?: Record<CourseCode, Course>;
  assessments?: AssessmentDefinition[];
  onUpdateAssessment: (assessmentId: string, updates: Partial<AssessmentRecord>) => void;
  onOpenDetailSheet: (courseCode: CourseCode) => void;
  onOpenDocs: (docId?: string) => void;
  onNavigateToDashboard?: () => void;
}

const THEORY_COURSES: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];

export const CoursesView: React.FC<CoursesViewProps> = React.memo(function CoursesView({
  state,
  courseGrades,
  courses = COURSES,
  assessments = ASSESSMENT_DEFINITIONS,
  onUpdateAssessment,
  onOpenDetailSheet,
  onOpenDocs,
  onNavigateToDashboard,
}) {
  const allCourses = courses && Object.keys(courses).length > 0 ? courses : COURSES;
  const allAssessments =
    assessments && assessments.length > 0 ? assessments : ASSESSMENT_DEFINITIONS;
  const [activeCourseTab, setActiveCourseTab] = React.useState<CourseCode>("CS2005");

  // Summary statistics across theory courses
  const courseResults = Object.values(courseGrades).filter(
    (g): g is GradeCalculationResult => g !== null && g.courseCode !== "CS2006P",
  );
  const averageProjectedScore =
    courseResults.length > 0
      ? (
          courseResults.reduce((acc, curr) => acc + (curr.totalScore ?? 0), 0) /
          courseResults.length
        ).toFixed(1)
      : "—";

  const allCourseGradeEligible =
    courseResults.length > 0 && courseResults.every((g) => g.courseGradeEligibility.eligible);

  return (
    <PageContainer size="default">
      {/* 1. Page Header */}
      <PageHeader>
        <PageHeaderMeta>
          <PageHeaderIcon>
            <BookOpen className="size-5 text-brand" />
          </PageHeaderIcon>
          <PageHeaderSummary>
            <PageHeaderTitle>Theory Courses</PageHeaderTitle>
            <PageHeaderDescription>
              September 2026 Term · 4 Core Enrolled Courses with live grading calculators &
              eligibility rules
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
            onClick={() => onOpenDocs("grading-policy")}
            className="gap-1.5"
          >
            <GraduationCap className="size-3.5 text-brand" />
            <span>Grading Policy</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* 2. Top Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Enrolled Courses</MetricCardLabel>
            <Award className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>4 Theory</MetricCardValue>
            <MetricCardDifferential variant="positive" value="15 Credits" />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Average Projection</MetricCardLabel>
            <Calculator className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{averageProjectedScore}%</MetricCardValue>
            <MetricCardDifferential variant="neutral" value="Deterministic" />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Grade Eligibility</MetricCardLabel>
            {allCourseGradeEligible ? (
              <CheckCircle2 className="size-3.5 text-brand" />
            ) : (
              <AlertCircle className="size-3.5 text-warning" />
            )}
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>
              {allCourseGradeEligible ? "Satisfied" : "Pending Gates"}
            </MetricCardValue>
            <MetricCardDifferential
              variant={allCourseGradeEligible ? "positive" : "neutral"}
              value="4 / 4 Courses"
            />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Term Final Exam</MetricCardLabel>
            <CheckCircle2 className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>Dec 13, 2026</MetricCardValue>
            <MetricCardDifferential variant="positive" value="In-Centre" />
          </MetricCardContent>
        </MetricCard>
      </div>

      {/* 3. Interactive Tabs for Each Theory Course */}
      <Tabs
        value={activeCourseTab}
        onValueChange={(val) => setActiveCourseTab(val as CourseCode)}
        className="w-full flex flex-col gap-6"
      >
        <div className="border-b border-border-default pb-0 overflow-x-auto scrollbar-none">
          <TabsList
            variant="line"
            className="h-10 w-full sm:w-auto flex-nowrap min-w-max touch-pan-x"
          >
            {THEORY_COURSES.map((code) => {
              const course = allCourses[code] || COURSES[code];
              const grade = courseGrades[code];
              return (
                <TabsTrigger
                  key={code}
                  value={code}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground text-foreground-light font-mono text-xs px-4 touch-manipulation"
                >
                  <span className="font-bold">{code}</span>
                  <span className="hidden sm:inline text-foreground-muted ml-1">
                    · {course.credits}cr
                  </span>
                  {grade && grade.totalScore !== null && (
                    <Badge variant="outline" className="ml-2 font-mono text-[10px] py-0 px-1.5 h-4">
                      {Math.round(grade.totalScore)}%
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {THEORY_COURSES.map((code) => {
          const course = allCourses[code] || COURSES[code];
          const grade = courseGrades[code];
          const courseAssessments = allAssessments.filter((def) => def.courseCode === code);

          return (
            <TabsContent key={code} value={code} className="flex flex-col gap-8 outline-hidden">
              {/* Course Meta Banner */}
              <PageSection>
                <PageSectionMeta>
                  <PageSectionSummary>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded">
                        {code}
                      </span>
                      <PageSectionTitle>{course.name}</PageSectionTitle>
                    </div>
                    <PageSectionDescription>
                      {course.gaaPolicy?.description ?? "Regular weekly assessments"} ·{" "}
                      {course.credits} Credits · Document: {course.source.documentSection}
                    </PageSectionDescription>
                  </PageSectionSummary>

                  <PageSectionAside>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => onOpenDetailSheet(code)}
                      className="gap-1.5"
                    >
                      <span>Full Grading Breakdown</span>
                      <ExternalLink className="size-3.5 text-brand" />
                    </Button>
                  </PageSectionAside>
                </PageSectionMeta>

                {/* Score Projection Status */}
                {grade && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-surface-100 border border-border-default text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-foreground-lighter block">CURRENT TOTAL SCORE</span>
                      <span className="text-xl font-bold text-foreground">
                        {grade.totalScore !== null
                          ? `${grade.totalScore.toFixed(1)} / 100`
                          : "Calculating..."}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-lighter block">GAA SCORE</span>
                      <span className="text-foreground font-semibold">
                        {grade.gaa.score !== null
                          ? `${grade.gaa.score.toFixed(1)} / 100`
                          : "Pending"}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-lighter block">COURSE GRADE STATUS</span>
                      <span
                        className={
                          grade.courseGradeEligibility.eligible
                            ? "text-brand font-semibold"
                            : "text-warning font-semibold"
                        }
                      >
                        {grade.courseGradeEligibility.eligible ? "ELIGIBLE" : "PENDING GATES"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Assessment Table */}
                <PageSectionContent>
                  <div className="rounded-lg border border-border-default overflow-x-auto bg-surface-100 touch-pan-x scrollbar-thin">
                    <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Assessment</TableHead>
                          <TableHead className="w-[18%]">Type</TableHead>
                          <TableHead className="w-[14%]">Max Score</TableHead>
                          <TableHead className="w-[14%]">Your Score</TableHead>
                          <TableHead className="w-[14%] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseAssessments.map((assessment) => {
                          const record = state.assessmentRecords[assessment.id];
                          const score = record?.score ?? null;

                          return (
                            <TableRow key={assessment.id}>
                              <TableCell className="font-medium text-foreground">
                                <div className="flex flex-col">
                                  <span>{assessment.name}</span>
                                  {assessment.weightDescription && (
                                    <span className="text-[11px] text-foreground-lighter font-normal">
                                      {assessment.weightDescription}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    assessment.type === "quiz" || assessment.type === "end_term"
                                      ? "warning"
                                      : assessment.type === "programming_grpa"
                                        ? "brand"
                                        : "secondary"
                                  }
                                  className="text-[10px] uppercase font-mono"
                                >
                                  {assessment.type.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs tabular-nums text-foreground-light">
                                {assessment.maxScore}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 w-24">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={assessment.maxScore}
                                    value={score ?? ""}
                                    placeholder="—"
                                    aria-label={`Score for ${assessment.name}`}
                                    onChange={(e) => {
                                      const val = e.target.value.trim();
                                      if (val === "") {
                                        onUpdateAssessment(assessment.id, {
                                          assessmentId: assessment.id,
                                          status: "pending",
                                          score: null,
                                        });
                                        return;
                                      }
                                      const num = Number(val);
                                      if (!Number.isFinite(num)) return;
                                      const clamped = Math.min(
                                        assessment.maxScore,
                                        Math.max(0, num),
                                      );
                                      onUpdateAssessment(assessment.id, {
                                        assessmentId: assessment.id,
                                        status: "present",
                                        score: clamped,
                                      });
                                    }}
                                    className="h-7 text-xs font-mono tabular-nums bg-surface-200 border-border-default focus-visible:border-brand"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {score !== null ? (
                                  <Badge variant="brand" className="font-mono text-[10px]">
                                    Recorded
                                  </Badge>
                                ) : (
                                  <span className="text-foreground-muted text-xs font-mono">—</span>
                                )}
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
          );
        })}
      </Tabs>
    </PageContainer>
  );
});
