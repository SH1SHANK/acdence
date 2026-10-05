import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  PersistedUserState,
  SctStatus,
  SemesterTask,
  TaskStatus,
  GitHubRepoReference,
} from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { ProjectTrack, ProjectStageId } from "@/types/project";
import {
  loadUserState,
  saveUserState,
  resetUserState,
  importStateFromJson,
} from "@/lib/persistence";
import * as actions from "@/lib/actions";
import {
  selectSemesterProgress,
  selectNextHardCutoff,
  selectCourseGrades,
  selectProjectSummary,
} from "@/lib/selectors";

import { getTodayIST } from "@/lib/datetime";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { usePortalGrades } from "@/hooks/usePortalGrades";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useEmails } from "@/hooks/useEmails";
import type { GradeResolutionResult } from "@/types/gradeRecord";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";

export function useAppState() {
  const [state, setState] = useState<PersistedUserState>(() => loadUserState());
  const todayDate = useMemo(() => getTodayIST(), []);

  // ── Supabase Canonical Academic Data (Terms, Weeks, Courses, Assessments, Events) ──
  const academic = useAcademicData();

  // ── Institute Email Intelligence Ingestion & Realtime State ──
  const emailIntel = useEmails();

  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return dateParam;
      }
    }
    return todayDate;
  });

  const setSelectedDate = useCallback(
    (date: string) => {
      setSelectedDateState(date);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (date === todayDate) {
          url.searchParams.delete("date");
        } else {
          url.searchParams.set("date", date);
        }
        window.history.replaceState({}, "", url.toString());
      }
    },
    [todayDate],
  );

  // Persist locally whenever state changes
  useEffect(() => {
    saveUserState(state);
  }, [state]);

  // Handle remote updates from Realtime / background reconciliation
  const handleApplyRemoteState = useCallback((remoteState: PersistedUserState) => {
    saveUserState(remoteState);
    setState(remoteState);
  }, []);

  // Initialize Sync Engine (User-Level Sync)
  const syncEngine = useSyncEngine({
    localState: state,
    onApplyRemoteState: handleApplyRemoteState,
  });

  // ── Official IITM Portal Grade Synchronization (Single-User Read Path) ──
  const handlePortalGradesResolved = useCallback((result: GradeResolutionResult) => {
    setState((prev) => {
      let hasChanges = false;
      const nextRecords = { ...prev.assessmentRecords };

      for (const [id, officialRec] of Object.entries(result.assessmentRecords)) {
        if (officialRec.status !== "pending" || officialRec.score !== null) {
          const current = prev.assessmentRecords[id];
          if (
            !current ||
            current.status !== officialRec.status ||
            current.score !== officialRec.score
          ) {
            nextRecords[id] = { ...officialRec };
            hasChanges = true;
          }
        }
      }

      if (!hasChanges) return prev;
      return {
        ...prev,
        assessmentRecords: nextRecords,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const portalGrades = usePortalGrades({
    knownDefinitions: academic.assessments.length > 0 ? academic.assessments : undefined,
    onResolved: handlePortalGradesResolved,
  });

  const resetToOfficialGrades = useCallback(
    (courseCode?: CourseCode) => {
      setState((prev) => {
        const nextRecords = { ...prev.assessmentRecords };
        const defsToUse =
          academic.assessments.length > 0 ? academic.assessments : ASSESSMENT_DEFINITIONS;
        for (const def of defsToUse) {
          if (!courseCode || def.courseCode === courseCode) {
            const officialRec = portalGrades.assessmentRecords[def.id];
            if (officialRec) {
              nextRecords[def.id] = { ...officialRec };
            } else {
              nextRecords[def.id] = {
                assessmentId: def.id,
                status: "pending",
                score: null,
              };
            }
          }
        }
        return {
          ...prev,
          assessmentRecords: nextRecords,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [academic.assessments, portalGrades.assessmentRecords],
  );

  // Selectors anchored firmly to real-time today in Asia/Kolkata and Supabase academic data
  const semesterProgress = useMemo(
    () => selectSemesterProgress(todayDate, academic.termConfig),
    [todayDate, academic.termConfig],
  );
  const nextCutoff = useMemo(
    () => selectNextHardCutoff(todayDate, academic.events),
    [todayDate, academic.events],
  );
  const courseGrades = useMemo(() => selectCourseGrades(state), [state]);
  const projectSummary = useMemo(() => selectProjectSummary(state), [state]);

  // Action dispatchers with background cloud synchronization
  const updateAssessment = useCallback(
    (assessmentId: string, updates: Partial<AssessmentRecord>) => {
      setState((prev) => {
        const next = actions.updateAssessmentRecord(prev, assessmentId, updates);
        const record = next.assessmentRecords[assessmentId];
        if (record) {
          syncEngine.syncAssessment(record);
        }
        return next;
      });
    },
    [syncEngine],
  );

  const setSct = useCallback(
    (courseCode: CourseCode, status: SctStatus) => {
      setState((prev) => {
        const next = actions.setSctStatus(prev, courseCode, status);
        syncEngine.syncSct(courseCode, status);
        return next;
      });
    },
    [syncEngine],
  );

  const setTrack = useCallback(
    (track: ProjectTrack | null) => {
      setState((prev) => {
        const next = actions.setProjectTrack(prev, track);
        syncEngine.syncProject(next.projectState);
        return next;
      });
    },
    [syncEngine],
  );

  const toggleStage = useCallback(
    (stageId: ProjectStageId) => {
      setState((prev) => {
        const next = actions.toggleProjectStage(prev, stageId);
        syncEngine.syncProject(next.projectState);
        return next;
      });
    },
    [syncEngine],
  );

  const toggleRequirement = useCallback(
    (requirementId: string) => {
      setState((prev) => {
        const next = actions.toggleProjectRequirement(prev, requirementId);
        syncEngine.syncProject(next.projectState);
        return next;
      });
    },
    [syncEngine],
  );

  const setScores = useCallback(
    (l1Score: number | null, l2Score: number | null) => {
      setState((prev) => {
        const next = actions.setProjectScores(prev, l1Score, l2Score);
        syncEngine.syncProject(next.projectState);
        return next;
      });
    },
    [syncEngine],
  );

  const toggleViva = useCallback(
    (itemId: string) => {
      setState((prev) => {
        const next = actions.toggleVivaItem(prev, itemId);
        const isChecked = Boolean(next.vivaChecklistState[itemId]);
        syncEngine.syncViva(itemId, isChecked);
        return next;
      });
    },
    [syncEngine],
  );

  const addTask = useCallback(
    (task: Omit<SemesterTask, "id" | "createdAt"> & { id?: string }) => {
      setState((prev) => {
        const next = actions.addTask(prev, task);
        const newTask = next.tasks[next.tasks.length - 1];
        if (newTask) {
          syncEngine.syncTask(newTask);
        }
        return next;
      });
    },
    [syncEngine],
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      setState((prev) => {
        const next = actions.updateTaskStatus(prev, taskId, status);
        const task = next.tasks.find((t) => t.id === taskId);
        if (task) {
          syncEngine.syncTask(task);
        }
        return next;
      });
    },
    [syncEngine],
  );

  const updateTask = useCallback(
    (taskId: string, updates: Partial<SemesterTask>) => {
      setState((prev) => {
        const next = actions.updateTask(prev, taskId, updates);
        const task = next.tasks.find((t) => t.id === taskId);
        if (task) {
          syncEngine.syncTask(task);
        }
        return next;
      });
    },
    [syncEngine],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      setState((prev) => {
        const next = actions.deleteTask(prev, taskId);
        syncEngine.syncTaskDelete(taskId);
        return next;
      });
    },
    [syncEngine],
  );

  const setGitHub = useCallback(
    (repo: GitHubRepoReference | null) => {
      setState((prev) => {
        const next = actions.setGitHubRepo(prev, repo);
        syncEngine.syncSettings(next);
        return next;
      });
    },
    [syncEngine],
  );

  const resetSelectedDate = useCallback(() => {
    setSelectedDate(todayDate);
  }, [todayDate, setSelectedDate]);

  const resetState = useCallback(() => {
    const initial = resetUserState();
    setState(initial);
  }, []);

  const importState = useCallback((jsonString: string) => {
    const imported = importStateFromJson(jsonString);
    saveUserState(imported);
    setState(imported);
    return imported;
  }, []);

  return {
    state,
    tasks: state.tasks || [],
    todayDate,
    selectedDate,
    setSelectedDate,
    resetSelectedDate,
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
    updateTask,
    deleteTask,
    resetState,
    importState,
    // Sync Infrastructure Metadata & Auth Actions
    currentUser: syncEngine.currentUser,
    authStatus: syncEngine.authStatus,
    syncStatus: syncEngine.syncStatus,
    syncError: syncEngine.syncError,
    isAuthenticated: syncEngine.isAuthenticated,
    isOnline: syncEngine.isOnline,
    lastSyncedAt: syncEngine.lastSyncedAt,
    pendingDirtyCount: syncEngine.pendingDirtyCount,
    signInWithOtp: syncEngine.signInWithOtp,
    verifyOtp: syncEngine.verifyOtp,
    signOut: syncEngine.signOut,
    triggerManualSync: syncEngine.triggerManualSync,
    // Web Push Notification State & Actions
    pushState: syncEngine.pushState,
    requestPushPermission: syncEngine.requestPushPermission,
    optInToPush: syncEngine.optInToPush,
    optOutOfPush: syncEngine.optOutOfPush,
    // Official Portal Grades Read Integration (Single-User, Unidirectional)
    portalRecords: portalGrades.rawRecords,
    portalResolution: portalGrades.resolution,
    unmatchedPortalGrades: portalGrades.unmatchedGrades,
    portalGradeDetails: portalGrades.matchedGradeDetails,
    portalSyncStatus: portalGrades.status,
    isPortalLoading: portalGrades.isLoading,
    isPortalOffline: portalGrades.isOffline,
    isPortalFromCache: portalGrades.isFromCache,
    portalSyncError: portalGrades.error,
    lastPortalSyncAt: portalGrades.lastFetchedAt,
    refreshPortalGrades: portalGrades.refetch,
    getPortalGradesForCourse: portalGrades.getPortalGradesForCourse,
    getUnmatchedGradesForCourse: portalGrades.getUnmatchedGradesForCourse,
    getMatchedDetailForAssessment: portalGrades.getMatchedDetailForAssessment,
    resetToOfficialGrades,
    // Supabase Canonical Academic Data (Terms, Weeks, Courses, Assessments, Events)
    academicTermId: academic.termId,
    academicTermConfig: academic.termConfig,
    academicWeeks: academic.weeks,
    academicCourses: academic.courses,
    academicAssessments: academic.assessments,
    academicEvents: academic.events,
    isAcademicLoading: academic.isLoading,
    isAcademicFromCache: academic.isFromCache,
    academicError: academic.error,
    lastAcademicFetchAt: academic.lastFetchedAt,
    refreshAcademicData: academic.refetch,
    getAssessmentsForCourse: academic.getAssessmentsForCourse,
    getEventsForCourse: academic.getEventsForCourse,
    getCourse: academic.getCourse,
    getWeekForDate: academic.getWeekForDate,
    // Institute Email Intelligence State & Methods
    emails: emailIntel.emails,
    importantEmails: emailIntel.importantEmails,
    relevantEmails: emailIntel.relevantEmails,
    emailEvents: emailIntel.emailEvents,
    upcomingEmailEvents: emailIntel.upcomingEmailEvents,
    isEmailLoading: emailIntel.loading,
    emailError: emailIntel.error,
    refreshEmails: emailIntel.refresh,
    selectedEmail: emailIntel.selectedEmail,
    setSelectedEmail: emailIntel.setSelectedEmail,
  };
}
