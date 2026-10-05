import * as React from "react";
import { useAppState } from "@/hooks/useAppState";
import { StudioSidebar, type StudioView } from "@/components/layout/StudioSidebar";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { DateStrip } from "@/components/dashboard/DateStrip";
import { AtAGlanceSection } from "@/components/dashboard/AtAGlanceSection";
import { CourseGrid } from "@/components/dashboard/CourseGrid";
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
import { Button } from "@/components/ui/button";
import type { CourseCode } from "@/types/course";
import { CANONICAL_EVENTS } from "@/data/events";
import { getNextImportantAction } from "@/lib/nextAction";
import { Calendar, Search, BookOpen } from "lucide-react";
import { NotificationPromptBanner } from "@/components/notifications/NotificationPromptBanner";
import { SectionErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  SummaryKPISkeleton,
  PerformanceAnalyticsSkeleton,
  CourseMatrixSkeleton,
  EmailIntelligenceSkeleton,
  ActivityFeedSkeleton,
} from "@/components/skeletons/DashboardSkeletons";

const CourseDetailSheet = React.lazy(() =>
  import("@/components/sheets/CourseDetailSheet").then((m) => ({ default: m.CourseDetailSheet })),
);
const ProjectHubSheet = React.lazy(() =>
  import("@/components/sheets/ProjectHubSheet").then((m) => ({ default: m.ProjectHubSheet })),
);
const AgendaCalendarSheet = React.lazy(() =>
  import("@/components/sheets/AgendaCalendarSheet").then((m) => ({
    default: m.AgendaCalendarSheet,
  })),
);
const DocumentReaderSheet = React.lazy(() =>
  import("@/components/sheets/DocumentReaderSheet").then((m) => ({
    default: m.DocumentReaderSheet,
  })),
);
const TaskBoardSheet = React.lazy(() =>
  import("@/components/sheets/TaskBoardSheet").then((m) => ({ default: m.TaskBoardSheet })),
);
const CommandMenuDialog = React.lazy(() =>
  import("@/components/dialogs/CommandMenuDialog").then((m) => ({ default: m.CommandMenuDialog })),
);
const DataBackupDialog = React.lazy(() =>
  import("@/components/dialogs/DataBackupDialog").then((m) => ({ default: m.DataBackupDialog })),
);
const ResetConfirmDialog = React.lazy(() =>
  import("@/components/dialogs/ResetConfirmDialog").then((m) => ({
    default: m.ResetConfirmDialog,
  })),
);
const CloudSyncDialog = React.lazy(() =>
  import("@/components/dialogs/CloudSyncDialog").then((m) => ({
    default: m.CloudSyncDialog,
  })),
);

const ProjectSummaryCard = React.lazy(() =>
  import("@/components/dashboard/ProjectSummaryCard").then((m) => ({
    default: m.ProjectSummaryCard,
  })),
);
const AcademicCalendarSection = React.lazy(() =>
  import("@/components/dashboard/AcademicCalendarSection").then((m) => ({
    default: m.AcademicCalendarSection,
  })),
);
const EmailIntelligenceSection = React.lazy(() =>
  import("@/components/dashboard/EmailIntelligenceSection").then((m) => ({
    default: m.EmailIntelligenceSection,
  })),
);
const EmailDetailSheet = React.lazy(() =>
  import("@/components/sheets/EmailDetailSheet").then((m) => ({
    default: m.EmailDetailSheet,
  })),
);
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";

const AcademicSummaryKPI = React.lazy(() =>
  import("@/components/dashboard/AcademicSummaryKPI").then((m) => ({
    default: m.AcademicSummaryKPI,
  })),
);
const PerformanceCohortAnalytics = React.lazy(() =>
  import("@/components/dashboard/PerformanceCohortAnalytics").then((m) => ({
    default: m.PerformanceCohortAnalytics,
  })),
);
const CoursePerformanceMatrix = React.lazy(() =>
  import("@/components/dashboard/CoursePerformanceMatrix").then((m) => ({
    default: m.CoursePerformanceMatrix,
  })),
);
const AcademicActivityFeed = React.lazy(() =>
  import("@/components/dashboard/AcademicActivityFeed").then((m) => ({
    default: m.AcademicActivityFeed,
  })),
);

const CoursesView = React.lazy(() =>
  import("@/components/views/CoursesView").then((m) => ({
    default: m.CoursesView,
  })),
);
const ProjectView = React.lazy(() =>
  import("@/components/views/ProjectView").then((m) => ({
    default: m.ProjectView,
  })),
);
const CalendarView = React.lazy(() =>
  import("@/components/views/CalendarView").then((m) => ({
    default: m.CalendarView,
  })),
);
const ReferenceView = React.lazy(() =>
  import("@/components/views/ReferenceView").then((m) => ({
    default: m.ReferenceView,
  })),
);
const EmailsView = React.lazy(() =>
  import("@/components/views/EmailsView").then((m) => ({
    default: m.EmailsView,
  })),
);

function ViewLoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-64 bg-surface-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-44 bg-surface-100 border border-border-default rounded-lg" />
        <div className="h-44 bg-surface-100 border border-border-default rounded-lg" />
        <div className="h-44 bg-surface-100 border border-border-default rounded-lg" />
      </div>
    </div>
  );
}

export default function App() {
  const {
    state,
    tasks,
    todayDate,
    selectedDate,
    setSelectedDate,
    semesterProgress,
    nextCutoff,
    courseGrades,
    projectSummary,
    updateAssessment,
    setSct,
    setTrack,
    toggleStage,
    toggleRequirement,
    setScores,
    toggleViva,
    setGitHub,
    addTask,
    updateTaskStatus,
    deleteTask,
    resetState,
    importState,
    currentUser,
    syncStatus,
    syncError,
    isAuthenticated,
    isOnline,
    lastSyncedAt,
    pendingDirtyCount,
    signInWithOtp,
    verifyOtp,
    signOut,
    triggerManualSync,
    pushState,
    requestPushPermission,
    optInToPush,
    optOutOfPush,
    portalRecords,
    unmatchedPortalGrades,
    portalGradeDetails,
    resetToOfficialGrades,
    academicEvents,
    academicCourses,
    academicAssessments,
    emails,
    importantEmails,
    relevantEmails,
    emailEvents,
    upcomingEmailEvents,
    isEmailLoading,
    emailError,
    refreshEmails,
  } = useAppState();

  const [activeView, setActiveView] = React.useState<StudioView>("dashboard");
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = React.useState(false);
  const [isBackupOpen, setIsBackupOpen] = React.useState(false);
  const [isSyncOpen, setIsSyncOpen] = React.useState(false);
  const [backupInitialTab, setBackupInitialTab] = React.useState<"export" | "import">("export");
  const [selectedCourseCode, setSelectedCourseCode] = React.useState<CourseCode | null>(null);
  const [activeEmailDetail, setActiveEmailDetail] = React.useState<any | null>(null);

  // Secondary Tools Sheet States
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = React.useState(false);
  const [isTasksOpen, setIsTasksOpen] = React.useState(false);
  const [activeDocumentId, setActiveDocumentId] = React.useState<string | null>("grading-policy");
  const [calendarCourseFilter, setCalendarCourseFilter] = React.useState<CourseCode | null>(null);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Derived Next Important Action anchored to real-time today in Asia/Kolkata and Supabase academic events
  const nextAction = React.useMemo(
    () =>
      getNextImportantAction({
        events: academicEvents && academicEvents.length > 0 ? academicEvents : CANONICAL_EVENTS,
        referenceDate: todayDate,
        courseGrades,
        projectSummary,
        isPreSemester: semesterProgress.isPreSemester,
        registrationStartDate: semesterProgress.registrationStartDate,
        registrationEndDate: semesterProgress.registrationEndDate,
      }),
    [academicEvents, todayDate, courseGrades, projectSummary, semesterProgress],
  );

  const pendingTaskCount = tasks.filter((t) => t.status !== "done").length;

  const handleOpenResetDialog = React.useCallback(() => {
    setIsResetDialogOpen(true);
  }, []);

  const handleOpenCalendar = React.useCallback((eventId?: string) => {
    if (eventId) {
      const eventEl = document.getElementById(`calendar-event-${eventId}`);
      if (eventEl) {
        eventEl.scrollIntoView({ behavior: "smooth", block: "center" });
        eventEl.classList.add("ring-2", "ring-primary");
        setTimeout(() => eventEl.classList.remove("ring-2", "ring-primary"), 2000);
        return;
      }
    }
    const el = document.getElementById("academic-calendar");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setCalendarCourseFilter(null);
      setIsCalendarOpen(true);
    }
  }, []);

  const handleOpenDocuments = React.useCallback((docId?: string) => {
    if (docId) setActiveDocumentId(docId);
    else setActiveDocumentId("grading-policy");
    setIsDocumentsOpen(true);
  }, []);

  const handleOpenTasks = React.useCallback(() => {
    setIsTasksOpen(true);
  }, []);

  const handleOpenCommandMenu = React.useCallback(() => {
    setIsCommandMenuOpen(true);
  }, []);

  const handleOpenBackup = React.useCallback((tab?: "export" | "import") => {
    if (tab) setBackupInitialTab(tab);
    setIsBackupOpen(true);
  }, []);

  const handleSelectCourse = React.useCallback((code: CourseCode) => {
    setSelectedCourseCode(code);
  }, []);

  const handleOpenProjectHub = React.useCallback(() => {
    setSelectedCourseCode("CS2006P");
  }, []);

  const handleSelectView = React.useCallback((view: StudioView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-dvh w-full bg-studio text-foreground flex flex-row antialiased selection:bg-brand/20 selection:text-brand">
      {/* 1. Supabase Studio Left Slim Sidebar */}
      <StudioSidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenTasks={handleOpenTasks}
        onOpenCommandMenu={handleOpenCommandMenu}
        onOpenBackup={() => handleOpenBackup("export")}
        onOpenReset={handleOpenResetDialog}
        onOpenSync={() => setIsSyncOpen(true)}
        syncStatus={syncStatus}
        isAuthenticated={isAuthenticated}
        taskCount={pendingTaskCount}
        importantEmailCount={importantEmails.length}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-studio pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* App Header (Identity, Semester Status, Search ⌘K, More Menu) */}
        <AppHeader
          activeView={activeView}
          onSelectView={handleSelectView}
          isPreSemester={semesterProgress.isPreSemester}
          onResetData={handleOpenResetDialog}
          onOpenCalendar={handleOpenCalendar}
          onOpenDocuments={handleOpenDocuments}
          onOpenTasks={handleOpenTasks}
          onOpenCommandMenu={handleOpenCommandMenu}
          onOpenBackup={handleOpenBackup}
          onOpenSync={() => setIsSyncOpen(true)}
          syncStatus={syncStatus}
          isAuthenticated={isAuthenticated}
          pendingDirtyCount={pendingDirtyCount}
          taskCount={pendingTaskCount}
        />

        {/* View Switcher: Render View based on StudioSidebar Selection */}
        {activeView === "dashboard" && (
          <main className="flex-1 w-full max-w-full overflow-x-clip">
            <PageContainer size="default">
              {/* Page Header Fragment */}
              <PageHeader>
                <PageHeaderMeta>
                  <PageHeaderIcon>
                    <Search className="size-5 text-brand" />
                  </PageHeaderIcon>
                  <PageHeaderSummary>
                    <PageHeaderTitle>Academic Command Center</PageHeaderTitle>
                    <PageHeaderDescription>
                      September 2026 Term · IIT Madras BS in Data Science & Applications
                    </PageHeaderDescription>
                  </PageHeaderSummary>
                </PageHeaderMeta>

                <PageHeaderActions>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleSelectView("courses")}
                    className="gap-1.5"
                  >
                    <BookOpen className="size-3.5 text-brand" />
                    <span>View All Courses</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleSelectView("calendar")}
                    className="gap-1.5"
                  >
                    <Calendar className="size-3.5 text-brand" />
                    <span>Calendar Grid</span>
                  </Button>
                </PageHeaderActions>
              </PageHeader>

              {/* Contextual Push Notification Permission Banner */}
              <NotificationPromptBanner
                isAuthenticated={isAuthenticated}
                pushState={pushState}
                onRequestPermission={requestPushPermission}
              />

              {/* Top Horizontal Date Timeline Strip (Temporal Anchor) */}
              <section aria-label="Academic Timeline Strip">
                <DateStrip events={academicEvents} onSelectCourse={handleSelectCourse} />
              </section>

              {/* Unified 3-Zone At-a-Glance Summary (Deterministic Logic Intact) */}
              <section aria-label="At A Glance Summary">
                <AtAGlanceSection
                  progress={semesterProgress}
                  action={nextAction}
                  nextCutoff={nextCutoff}
                  todayDate={todayDate}
                  onNavigateToCourse={handleSelectCourse}
                  onNavigateToProject={handleOpenProjectHub}
                  onNavigateToCalendar={handleOpenCalendar}
                  onNavigateToDocs={handleOpenDocuments}
                />
              </section>

              {/* Academic Summary KPI Row (Real Computed CGPA, Avg %, Peer Delta, Completion) */}
              <section aria-label="Academic Summary KPI Row">
                <SectionErrorBoundary fallbackTitle="Academic Metrics Unavailable">
                  <React.Suspense fallback={<SummaryKPISkeleton />}>
                    <AcademicSummaryKPI
                      courseGrades={courseGrades}
                      assessmentRecords={state.assessmentRecords}
                      assessmentDefinitions={
                        academicAssessments && academicAssessments.length > 0
                          ? academicAssessments
                          : ASSESSMENT_DEFINITIONS
                      }
                      portalGradeDetails={portalGradeDetails}
                      nextCutoff={nextCutoff}
                      onNavigateToCourses={() => handleSelectView("courses")}
                      onNavigateToCalendar={handleOpenCalendar}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>

              {/* Performance vs Cohort Analytics (Your Score vs Peer Mean vs Median) */}
              <section aria-label="Performance vs Cohort Analytics">
                <SectionErrorBoundary fallbackTitle="Cohort Analytics Unavailable">
                  <React.Suspense fallback={<PerformanceAnalyticsSkeleton />}>
                    <PerformanceCohortAnalytics
                      assessmentRecords={state.assessmentRecords}
                      assessmentDefinitions={
                        academicAssessments && academicAssessments.length > 0
                          ? academicAssessments
                          : ASSESSMENT_DEFINITIONS
                      }
                      portalGradeDetails={portalGradeDetails}
                      onSelectCourse={handleSelectCourse}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>

              {/* Theory Courses: Dominant Workspace (4 Core Enrolled Courses) */}
              <section aria-label="Theory Courses">
                <CourseGrid
                  courseGrades={courseGrades}
                  records={state.assessmentRecords}
                  todayDate={todayDate}
                  onUpdateAssessment={updateAssessment}
                  onOpenDetail={handleSelectCourse}
                />
              </section>

              {/* Course Performance & Eligibility Matrix */}
              <section aria-label="Course Performance Matrix">
                <SectionErrorBoundary fallbackTitle="Course Performance Matrix Unavailable">
                  <React.Suspense fallback={<CourseMatrixSkeleton />}>
                    <CoursePerformanceMatrix
                      courseGrades={courseGrades}
                      records={state.assessmentRecords}
                      portalGradeDetails={portalGradeDetails}
                      todayDate={todayDate}
                      onSelectCourse={handleSelectCourse}
                      onOpenProjectHub={handleOpenProjectHub}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>

              {/* Email Intelligence: AI Notices, Deadlines & Summaries */}
              <section id="email-intelligence" aria-label="Email Intelligence">
                <SectionErrorBoundary
                  fallbackTitle="Email Intelligence Unavailable"
                  onReset={refreshEmails}
                >
                  <React.Suspense fallback={<EmailIntelligenceSkeleton />}>
                    <EmailIntelligenceSection
                      emails={emails}
                      importantEmails={importantEmails}
                      relevantEmails={relevantEmails}
                      emailEvents={emailEvents}
                      loading={isEmailLoading}
                      error={emailError}
                      onRefresh={refreshEmails}
                      onSelectEmail={(email) => setActiveEmailDetail(email)}
                      onSelectCourse={handleSelectCourse}
                      onNavigateToEmails={() => handleSelectView("emails")}
                      isAuthenticated={isAuthenticated}
                      onOpenSync={() => setIsSyncOpen(true)}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>

              {/* CS2006P Project Summary: Concise Distinct Visual */}
              <section aria-label="Application Development II Project">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-balance text-base font-semibold font-heading tracking-tight text-foreground">
                      Project Course (1)
                    </h2>
                    <p className="text-pretty text-xs text-foreground-light">
                      Trekking Management App V2 · Specification Checklist, Viva Progression &
                      GitHub Status
                    </p>
                  </div>
                  <SectionErrorBoundary fallbackTitle="Project Hub Summary Unavailable">
                    <React.Suspense
                      fallback={
                        <div className="h-32 rounded-xl border border-border-default bg-surface-100/60 animate-pulse" />
                      }
                    >
                      <ProjectSummaryCard
                        summary={projectSummary}
                        state={state}
                        onOpenProjectHub={handleOpenProjectHub}
                      />
                    </React.Suspense>
                  </SectionErrorBoundary>
                </div>
              </section>

              {/* Recent Academic Activity Stream */}
              <section aria-label="Recent Academic Activity Feed">
                <SectionErrorBoundary fallbackTitle="Academic Activity Feed Unavailable">
                  <React.Suspense fallback={<ActivityFeedSkeleton />}>
                    <AcademicActivityFeed
                      portalRecords={portalRecords}
                      emails={emails}
                      events={academicEvents}
                      todayDate={todayDate}
                      onSelectEmail={(email) => setActiveEmailDetail(email)}
                      onSelectCourse={handleSelectCourse}
                      onNavigateToCalendar={handleOpenCalendar}
                      onNavigateToEmails={() => handleSelectView("emails")}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>

              {/* Full-Width Interactive Academic Calendar Workspace */}
              <section id="academic-calendar" aria-label="Academic Calendar">
                <SectionErrorBoundary fallbackTitle="Academic Calendar Unavailable">
                  <React.Suspense
                    fallback={
                      <div className="h-64 rounded-xl border border-border-default bg-surface-100/60 animate-pulse" />
                    }
                  >
                    <AcademicCalendarSection
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      onSelectCourse={handleSelectCourse}
                      onOpenProjectHub={handleOpenProjectHub}
                      referenceDate={todayDate}
                      events={academicEvents}
                    />
                  </React.Suspense>
                </SectionErrorBoundary>
              </section>
            </PageContainer>
          </main>
        )}

        {activeView === "courses" && (
          <main className="flex-1 w-full">
            <React.Suspense fallback={<ViewLoadingSkeleton />}>
              <CoursesView
                state={state}
                courseGrades={courseGrades}
                courses={academicCourses}
                assessments={academicAssessments}
                onUpdateAssessment={updateAssessment}
                onOpenDetailSheet={handleSelectCourse}
                onOpenDocs={handleOpenDocuments}
                onNavigateToDashboard={() => handleSelectView("dashboard")}
              />
            </React.Suspense>
          </main>
        )}

        {activeView === "project" && (
          <main className="flex-1 w-full">
            <React.Suspense fallback={<ViewLoadingSkeleton />}>
              <ProjectView
                summary={projectSummary}
                state={state}
                onSetTrack={setTrack}
                onToggleStage={toggleStage}
                onToggleRequirement={toggleRequirement}
                onOpenHubSheet={handleOpenProjectHub}
                onOpenDocs={handleOpenDocuments}
                onNavigateToDashboard={() => handleSelectView("dashboard")}
              />
            </React.Suspense>
          </main>
        )}

        {activeView === "calendar" && (
          <main className="flex-1 w-full">
            <React.Suspense fallback={<ViewLoadingSkeleton />}>
              <CalendarView
                selectedDate={selectedDate}
                todayDate={todayDate}
                nextCutoff={nextCutoff}
                events={academicEvents}
                onSelectDate={setSelectedDate}
                onSelectCourse={handleSelectCourse}
                onOpenProjectHub={handleOpenProjectHub}
                onNavigateToDashboard={() => handleSelectView("dashboard")}
              />
            </React.Suspense>
          </main>
        )}

        {activeView === "emails" && (
          <main className="flex-1 w-full">
            <React.Suspense fallback={<ViewLoadingSkeleton />}>
              <EmailsView
                emails={emails}
                importantEmails={importantEmails}
                relevantEmails={relevantEmails}
                emailEvents={emailEvents}
                upcomingEmailEvents={upcomingEmailEvents}
                loading={isEmailLoading}
                error={emailError}
                onRefresh={refreshEmails}
                onSelectCourse={handleSelectCourse}
                onNavigateToDashboard={() => handleSelectView("dashboard")}
                isAuthenticated={isAuthenticated}
                onOpenSync={() => setIsSyncOpen(true)}
              />
            </React.Suspense>
          </main>
        )}

        {activeView === "reference" && (
          <main className="flex-1 w-full">
            <React.Suspense fallback={<ViewLoadingSkeleton />}>
              <ReferenceView
                initialDocumentId={activeDocumentId}
                onNavigateToDashboard={() => handleSelectView("dashboard")}
              />
            </React.Suspense>
          </main>
        )}

        {/* Quiet Supabase Studio footer */}
        <footer className="border-t border-border-default/60 py-5 mt-10 bg-studio/40">
          <div className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-lighter font-mono">
            <div>Acdence · IIT Madras BS in Data Science & Applications</div>
            <div className="flex items-center gap-4">
              <span>Made with ❤️ by sh1shank</span>
              <span className="tabular-nums text-brand flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                Real-Time Asia/Kolkata
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Reset Confirmation Dialog */}
      {isResetDialogOpen && (
        <React.Suspense fallback={null}>
          <ResetConfirmDialog
            open={isResetDialogOpen}
            onOpenChange={setIsResetDialogOpen}
            onConfirm={resetState}
          />
        </React.Suspense>
      )}

      {/* Secondary Tool Sheets & Dialogs (Lazy Loaded & Code-Split) */}
      <React.Suspense fallback={null}>
        {/* Course Detail Interactive Sheet (CS2005, SE2001, CS2006, MS2001) */}
        <CourseDetailSheet
          open={selectedCourseCode !== null && selectedCourseCode !== "CS2006P"}
          onOpenChange={(open) => !open && setSelectedCourseCode(null)}
          courseCode={selectedCourseCode}
          state={state}
          gradeResult={
            selectedCourseCode && selectedCourseCode !== "CS2006P"
              ? courseGrades[selectedCourseCode]
              : null
          }
          portalGrades={portalRecords}
          unmatchedGrades={unmatchedPortalGrades}
          matchedDetails={portalGradeDetails}
          onUpdateAssessment={updateAssessment}
          onSetSct={setSct}
          onResetToOfficial={resetToOfficialGrades}
        />

        {/* CS2006P Project Hub Workspace Sheet */}
        <ProjectHubSheet
          open={selectedCourseCode === "CS2006P"}
          onOpenChange={(open) => !open && setSelectedCourseCode(null)}
          state={state}
          summary={projectSummary}
          onSetTrack={setTrack}
          onToggleStage={toggleStage}
          onToggleRequirement={toggleRequirement}
          onSetScores={setScores}
          onToggleViva={toggleViva}
          onConnectGitHub={setGitHub}
          onDisconnectGitHub={() => setGitHub(null)}
        />

        {/* Academic Calendar Sheet */}
        <AgendaCalendarSheet
          open={isCalendarOpen}
          onOpenChange={setIsCalendarOpen}
          referenceDate={todayDate}
          initialCourse={calendarCourseFilter}
          events={academicEvents}
        />

        {/* Official Reference Document Reader */}
        <DocumentReaderSheet
          open={isDocumentsOpen}
          onOpenChange={setIsDocumentsOpen}
          initialDocumentId={activeDocumentId}
        />

        {/* Task Board Kanban Sheet */}
        <TaskBoardSheet
          open={isTasksOpen}
          onOpenChange={setIsTasksOpen}
          tasks={tasks}
          onAddTask={addTask}
          onUpdateTaskStatus={updateTaskStatus}
          onDeleteTask={deleteTask}
        />

        {/* Global ⌘K Command Palette Dialog */}
        <CommandMenuDialog
          open={isCommandMenuOpen}
          onOpenChange={setIsCommandMenuOpen}
          onOpenCourse={handleSelectCourse}
          onOpenCalendar={handleOpenCalendar}
          onOpenDocuments={handleOpenDocuments}
          onOpenTasks={handleOpenTasks}
          onOpenBackup={handleOpenBackup}
          onOpenReset={handleOpenResetDialog}
          onOpenEmails={() => handleSelectView("emails")}
          emails={emails}
          onSelectEmail={(email) => setActiveEmailDetail(email)}
        />

        {/* State Backup & Restoration Dialog */}
        <DataBackupDialog
          open={isBackupOpen}
          onOpenChange={setIsBackupOpen}
          state={state}
          onImportState={(json) => importState(json)}
          initialTab={backupInitialTab}
        />

        {/* Global Email Detail Sheet for Overview Previews */}
        <EmailDetailSheet
          email={activeEmailDetail}
          open={Boolean(activeEmailDetail)}
          onOpenChange={(open) => {
            if (!open) setActiveEmailDetail(null);
          }}
          onSelectCourse={(code) => handleSelectCourse(code as CourseCode)}
        />

        {/* Cloud Synchronization & Auth Dialog */}
        <CloudSyncDialog
          open={isSyncOpen}
          onOpenChange={setIsSyncOpen}
          currentUser={currentUser}
          syncStatus={syncStatus}
          syncError={syncError}
          lastSyncedAt={lastSyncedAt}
          pendingDirtyCount={pendingDirtyCount}
          isOnline={isOnline}
          pushState={pushState}
          requestPushPermission={requestPushPermission}
          optInToPush={optInToPush}
          optOutOfPush={optOutOfPush}
          signInWithOtp={signInWithOtp}
          verifyOtp={verifyOtp}
          signOut={signOut}
          triggerManualSync={triggerManualSync}
        />
      </React.Suspense>
    </div>
  );
}
