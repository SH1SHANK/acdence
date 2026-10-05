import React, { useState } from "react";
import type { CourseCode, Course } from "@/types/course";
import type { GradeCalculationResult } from "@/types/grading";
import type { AssessmentRecord } from "@/types/assessment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import {
  getNextRequiredInput,
  getRecentMissingAssessments,
  getAssessmentLabel,
  formatAssessmentDeadline,
} from "@/lib/courseCardState";
import { getAssessmentsForCourse } from "@/data/assessments";

interface Props {
  course: Course;
  gradeResult: GradeCalculationResult | null;
  records: Record<string, AssessmentRecord>;
  todayDate: string;
  onUpdateAssessment: (id: string, updates: Partial<AssessmentRecord>) => void;
  onOpenDetail?: (courseCode: CourseCode) => void;
}

export const CourseCard = React.memo<Props>(function CourseCard({
  course,
  gradeResult,
  records,
  todayDate,
  onUpdateAssessment,
  onOpenDetail,
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const action = getNextRequiredInput(course, records, todayDate);
  const gaa = gradeResult?.gaa;
  const save = (id: string, value: string) => {
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 100) return;
    onUpdateAssessment(id, { assessmentId: id, status: "present", score });
    setEditing(null);
  };
  const edit = (id: string) => {
    setEditing(id);
    setRecentOpen(false);
  };
  return (
    <article className="group rounded-lg border border-border-default bg-surface-100 p-4 transition-colors hover:border-border-strong sm:p-5 shadow-xs">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => onOpenDetail?.(course.code)}
      >
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold text-brand">{course.code}</div>
          <h3 className="text-balance mt-1 text-base font-semibold font-heading leading-tight text-foreground group-hover:text-brand sm:text-lg transition-colors">
            {course.name}
          </h3>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-foreground-lighter group-hover:text-brand transition-colors" />
      </button>
      <div className="my-3 grid grid-cols-2 gap-4 border-y border-border-default py-3">
        <Metric
          label="Current Total Score"
          value={gradeResult?.totalScore == null ? null : gradeResult.totalScore.toFixed(1)}
          note={gradeResult?.totalScore == null ? "Add scores to calculate" : "/ 100"}
          prominent
        />
        <Metric
          label="GAA Average"
          value={gaa?.score == null ? null : gaa.score.toFixed(1)}
          note={
            gaa?.isComplete
              ? `Best ${gaa.requiredCount} of ${gaa.availableCount}`
              : gaa?.availableCount
                ? `Awaiting ${Math.max(gaa.requiredCount - gaa.availableCount, 0)} scores`
                : "No scores yet"
          }
        />
      </div>
      <div
        className="mt-3 grid min-h-0 grid-cols-3 content-start gap-2"
        aria-label="Exam and quiz scores"
      >
        {getExamAssessments(course).map(({ label, assessment }) => (
          <ExamMark key={assessment.id} label={label} record={records[assessment.id]} />
        ))}
      </div>
      <div
        className={`mt-3 border-t border-border-default pt-3 ${action?.overdue ? "border-l-2 border-l-warning pl-3" : ""}`}
      >
        {action ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
                {action.overdue ? "Score missing" : "Next assessment"}
              </div>
              <div className="truncate text-xs font-medium text-foreground">
                {getAssessmentLabel(action.assessment)}{" "}
                <span className="ml-1 text-foreground-light font-mono">
                  {formatAssessmentDeadline(action.dueDate)}
                </span>
              </div>
            </div>
            {editing === action.assessment.id ? (
              <ScoreInput
                onSave={(v) => save(action.assessment.id, v)}
                onCancel={() => setEditing(null)}
              />
            ) : action.overdue ? (
              <Button size="small" variant="outline" onClick={() => edit(action.assessment.id)}>
                Enter marks
              </Button>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-foreground-lighter font-mono">No action required</span>
        )}
        <div className="mt-2.5 flex items-center justify-between">
          <button
            type="button"
            aria-expanded={recentOpen}
            aria-controls={`course-recent-missing-${course.code}`}
            className="text-[11px] font-mono text-foreground-light hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setRecentOpen(!recentOpen)}
          >
            {recentOpen ? "Hide recent" : "Add recent score"}
          </button>
          <button
            type="button"
            className="text-[11px] font-mono text-foreground-light hover:text-brand transition-colors cursor-pointer"
            onClick={() => onOpenDetail?.(course.code)}
          >
            View details
          </button>
        </div>
        {recentOpen && (
          <div
            id={`course-recent-missing-${course.code}`}
            className="mt-2 flex flex-col gap-1 rounded-md bg-surface-200/60 p-2 border border-border-default"
          >
            {getRecentMissingAssessments(course.code, records, todayDate).map(
              ({ assessment, dueDate }) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-foreground-light">
                    {getAssessmentLabel(assessment)}{" "}
                    <span className="ml-1 text-foreground-lighter font-mono">
                      {formatAssessmentDeadline(dueDate)}
                    </span>
                  </span>
                  {editing === assessment.id ? (
                    <ScoreInput
                      onSave={(v) => save(assessment.id, v)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <Button size="tiny" variant="ghost" onClick={() => edit(assessment.id)}>
                      Enter marks
                    </Button>
                  )}
                </div>
              ),
            )}
            <button
              type="button"
              className="pt-1 text-[11px] font-mono text-brand text-left hover:underline"
              onClick={() => onOpenDetail?.(course.code)}
            >
              View all assessments
            </button>
          </div>
        )}
      </div>
    </article>
  );
});

function Metric({
  label,
  value,
  note,
  prominent,
}: {
  label: string;
  value: string | null;
  note: string;
  prominent?: boolean;
}) {
  const hasValue = value !== null;
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
        {label}
      </div>
      <div
        className={
          hasValue
            ? `${prominent ? "text-2xl" : "text-lg"} mt-0.5 font-bold font-mono tabular-nums text-foreground`
            : "mt-0.5 text-base font-normal font-mono text-foreground-lighter tabular-nums"
        }
      >
        {hasValue ? value : "—"}{" "}
        {hasValue && prominent && (
          <span className="text-[11px] font-normal text-foreground-lighter">/ 100</span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-foreground-lighter">
        {hasValue ? note : "No scores yet"}
      </div>
    </div>
  );
}

function ScoreInput({ onSave, onCancel }: { onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        inputMode="decimal"
        aria-label="Score"
        className="h-7 w-16 text-center font-mono tabular-nums bg-surface-200 border-border-default focus-visible:border-brand"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          if (e.key === "Escape") onCancel();
        }}
        placeholder="score"
      />
      <Button
        size="tiny"
        variant="ghost"
        onClick={() => onSave(value)}
        className="h-7 px-1.5 text-brand hover:text-foreground hover:bg-brand/20 touch-manipulation cursor-pointer"
        aria-label="Save score"
      >
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function getExamAssessments(course: Course) {
  const definitions = getAssessmentsForCourse(course.code);
  return [
    { label: "End Term", assessment: definitions.find((a) => a.type === "end_term") },
    { label: "OPPE", assessment: definitions.find((a) => a.type === "oppe") },
    ...(course.code === "CS2005"
      ? [{ label: "OPPE 2", assessment: definitions.find((a) => a.id === "cs2005_oppe_02") }]
      : []),
    { label: "Quiz 1", assessment: definitions.find((a) => a.id.endsWith("quiz_01")) },
    { label: "Quiz 2", assessment: definitions.find((a) => a.id.endsWith("quiz_02")) },
  ].filter((x): x is { label: string; assessment: NonNullable<typeof x.assessment> } =>
    Boolean(x.assessment),
  );
}

function ExamMark({ label, record }: { label: string; record?: AssessmentRecord }) {
  const isAbsent = record?.status === "absent";
  const score = record?.status === "present" && record.score !== null ? record.score : null;
  const hasScoreOrStatus = isAbsent || score !== null;

  if (!hasScoreOrStatus) {
    return (
      <div className="px-1 py-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-xs text-foreground-lighter tabular-nums">—</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-default bg-surface-200/50 px-2.5 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-lighter">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 font-mono tabular-nums">
        <span className="text-sm font-semibold text-foreground">{score ?? "—"}</span>
        <span className="text-[10px] text-foreground-lighter">/ 100</span>
      </div>
      <div className="text-[10px] text-foreground-lighter">{isAbsent ? "Absent" : "Recorded"}</div>
    </div>
  );
}
