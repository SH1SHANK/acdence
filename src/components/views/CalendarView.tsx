import React from "react";
import { LayoutDashboard, CalendarDays, AlertTriangle, CalendarCheck } from "lucide-react";
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
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
} from "@/components/fragments/MetricCard";
import { Button } from "@/components/ui/button";
import type { CourseCode } from "@/types/course";
import type { AcademicEvent } from "@/types/events";
import type { NextHardCutoffSummary } from "@/lib/selectors";

const AcademicCalendarSection = React.lazy(() =>
  import("@/components/dashboard/AcademicCalendarSection").then((m) => ({
    default: m.AcademicCalendarSection,
  })),
);

export interface CalendarViewProps {
  selectedDate: string;
  todayDate: string;
  nextCutoff: NextHardCutoffSummary;
  events?: AcademicEvent[];
  onSelectDate: (date: string) => void;
  onSelectCourse: (code: CourseCode) => void;
  onOpenProjectHub: () => void;
  onNavigateToDashboard?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = React.memo(function CalendarView({
  selectedDate,
  todayDate,
  nextCutoff,
  events,
  onSelectDate,
  onSelectCourse,
  onOpenProjectHub,
  onNavigateToDashboard,
}) {
  return (
    <PageContainer size="default">
      {/* 1. Page Header */}
      <PageHeader>
        <PageHeaderMeta>
          <PageHeaderIcon>
            <CalendarDays className="size-5 text-brand" />
          </PageHeaderIcon>
          <PageHeaderSummary>
            <PageHeaderTitle>Academic Calendar</PageHeaderTitle>
            <PageHeaderDescription>
              September 2026 Term · Canonical Deadlines, Exam Gates & Window Cutoffs
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
          <div className="flex items-center gap-2 text-xs font-mono text-foreground-lighter bg-surface-200 border border-border-default px-3 py-1.5 rounded-md">
            <span>Reference Date:</span>
            <span className="font-semibold text-brand">{todayDate}</span>
          </div>
        </PageHeaderActions>
      </PageHeader>

      {/* 2. Calendar Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>Next Hard Cutoff</MetricCardLabel>
            <AlertTriangle className="size-3.5 text-warning" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-xl">
              {nextCutoff.event ? nextCutoff.event.title : "None Pending"}
            </MetricCardValue>
            <MetricCardDifferential
              variant={
                nextCutoff.daysLeft !== null && nextCutoff.daysLeft <= 3 ? "negative" : "neutral"
              }
              value={nextCutoff.daysLeft !== null ? `${nextCutoff.daysLeft} days left` : "—"}
            />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>In-Person Quizzes</MetricCardLabel>
            <CalendarCheck className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-xl">Quiz 1 & Quiz 2</MetricCardValue>
            <MetricCardDifferential variant="neutral" value="Nov 1 & Nov 22" />
          </MetricCardContent>
        </MetricCard>

        <MetricCard>
          <MetricCardHeader>
            <MetricCardLabel>End Term Examination</MetricCardLabel>
            <CalendarCheck className="size-3.5 text-brand" />
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-xl">Dec 13, 2026</MetricCardValue>
            <MetricCardDifferential variant="positive" value="Term Finale" />
          </MetricCardContent>
        </MetricCard>
      </div>

      {/* 3. Full-Width Interactive Academic Calendar */}
      <div className="w-full">
        <React.Suspense fallback={null}>
          <AcademicCalendarSection
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onSelectCourse={onSelectCourse}
            onOpenProjectHub={onOpenProjectHub}
            referenceDate={todayDate}
            events={events}
          />
        </React.Suspense>
      </div>
    </PageContainer>
  );
});
