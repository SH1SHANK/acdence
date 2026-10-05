import { useState, useEffect, useCallback, useMemo } from "react";
import type { CourseCode } from "@/types/course";
import type { DbGradeRecord, GradeResolutionResult, PortalSyncStatus } from "@/types/gradeRecord";
import type { AssessmentDefinition } from "@/types/assessment";
import {
  fetchGradeRecords,
  getCachedGradeRecords,
  saveCachedGradeRecords,
  DEFAULT_TERM_ID,
} from "@/lib/sync/gradeRepository";
import { resolveGradeRecordsToAssessments } from "@/lib/grading/resolver";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";
import { getSupabase } from "@/lib/supabase";

export interface UsePortalGradesOptions {
  termId?: string;
  autoFetch?: boolean;
  knownDefinitions?: AssessmentDefinition[];
  onResolved?: (result: GradeResolutionResult) => void;
}

export function usePortalGrades(options?: UsePortalGradesOptions) {
  const termId = options?.termId || DEFAULT_TERM_ID;
  const autoFetch = options?.autoFetch ?? true;
  const knownDefinitions = options?.knownDefinitions || ASSESSMENT_DEFINITIONS;
  const onResolved = options?.onResolved;

  // Initialize from cache if available on cold boot
  const [rawRecords, setRawRecords] = useState<DbGradeRecord[]>(() =>
    getCachedGradeRecords(termId),
  );
  const [isFromCache, setIsFromCache] = useState<boolean>(() => {
    const cached = getCachedGradeRecords(termId);
    return cached.length > 0;
  });
  const [status, setStatus] = useState<PortalSyncStatus>(() =>
    getCachedGradeRecords(termId).length > 0 ? "synced" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // Compute resolved state whenever rawRecords or knownDefinitions changes
  const resolution: GradeResolutionResult = useMemo(() => {
    return resolveGradeRecordsToAssessments(rawRecords, knownDefinitions);
  }, [rawRecords, knownDefinitions]);

  // Authoritative remote fetch
  const refetch = useCallback(
    async (courseCode?: string): Promise<GradeResolutionResult> => {
      try {
        setStatus("loading");
        setError(null);

        const records = await fetchGradeRecords(termId, courseCode);
        setRawRecords(records);
        setIsFromCache(false);

        const result = resolveGradeRecordsToAssessments(records, knownDefinitions);
        const now = new Date().toISOString();
        setLastFetchedAt(now);
        setStatus("synced");

        if (onResolved) {
          onResolved(result);
        }

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch portal grades";
        setError(msg);

        // Fallback to cache if available
        const cached = getCachedGradeRecords(termId, courseCode);
        if (cached.length > 0) {
          setRawRecords(cached);
          setIsFromCache(true);
          setStatus("offline");
          const cachedResult = resolveGradeRecordsToAssessments(cached, knownDefinitions);
          if (onResolved) {
            onResolved(cachedResult);
          }
          return cachedResult;
        }

        setStatus("error");
        return resolveGradeRecordsToAssessments([], knownDefinitions);
      }
    },
    [termId, knownDefinitions, onResolved],
  );

  // Initial load
  useEffect(() => {
    if (autoFetch) {
      void refetch();
    }
  }, [autoFetch, refetch]);

  // Realtime subscription for portal grade updates
  useEffect(() => {
    const supabase = getSupabase();
    const channelName = `portal-grades-realtime-${termId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grade_records",
          filter: `term_id=eq.${termId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newRec = payload.new as DbGradeRecord;
            if (!newRec || !newRec.external_assignment_id) return;

            setRawRecords((prev) => {
              const index = prev.findIndex(
                (r) =>
                  (r.id && newRec.id && r.id === newRec.id) ||
                  (r.term_id === newRec.term_id &&
                    r.course_code === newRec.course_code &&
                    r.external_assignment_id === newRec.external_assignment_id),
              );

              let updated: DbGradeRecord[];
              if (index >= 0) {
                updated = [...prev];
                updated[index] = { ...prev[index], ...newRec };
              } else {
                updated = [...prev, newRec];
              }
              saveCachedGradeRecords(updated, termId);
              return updated;
            });
            setIsFromCache(false);
            setLastFetchedAt(new Date().toISOString());
            setStatus("synced");
          } else if (payload.eventType === "DELETE") {
            const oldRec = payload.old as Partial<DbGradeRecord>;
            if (!oldRec) return;

            setRawRecords((prev) => {
              const updated = prev.filter((r) => {
                if (oldRec.id && r.id === oldRec.id) return false;
                if (
                  oldRec.term_id &&
                  oldRec.course_code &&
                  oldRec.external_assignment_id &&
                  r.term_id === oldRec.term_id &&
                  r.course_code === oldRec.course_code &&
                  r.external_assignment_id === oldRec.external_assignment_id
                ) {
                  return false;
                }
                return true;
              });
              saveCachedGradeRecords(updated, termId);
              return updated;
            });
            setLastFetchedAt(new Date().toISOString());
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [termId]);

  // Online / offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      void refetch();
    };
    const handleOffline = () => {
      setStatus((prev) => (prev === "synced" ? "offline" : prev));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [refetch]);

  // Auth state change listener: re-fetch immediately on login or session restoration
  useEffect(() => {
    const supabase = getSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void refetch();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refetch]);

  // Synchronize downstream whenever resolution updates (e.g. from Realtime)
  useEffect(() => {
    if (onResolved && rawRecords.length > 0) {
      onResolved(resolution);
    }
  }, [resolution, onResolved, rawRecords.length]);

  // Helpers for individual courses
  const getPortalGradesForCourse = useCallback(
    (courseCode: CourseCode): DbGradeRecord[] => {
      const target = courseCode.toUpperCase().trim();
      return rawRecords.filter((r) => r.course_code.toUpperCase().trim() === target);
    },
    [rawRecords],
  );

  const getUnmatchedGradesForCourse = useCallback(
    (courseCode: CourseCode): DbGradeRecord[] => {
      const target = courseCode.toUpperCase().trim();
      return resolution.unmatchedGrades.filter(
        (r) => r.course_code.toUpperCase().trim() === target,
      );
    },
    [resolution.unmatchedGrades],
  );

  const getMatchedDetailForAssessment = useCallback(
    (assessmentId: string): DbGradeRecord | undefined => {
      return resolution.matchedGradeDetails[assessmentId];
    },
    [resolution.matchedGradeDetails],
  );

  return {
    rawRecords,
    resolution,
    assessmentRecords: resolution.assessmentRecords,
    unmatchedGrades: resolution.unmatchedGrades,
    matchedGradeDetails: resolution.matchedGradeDetails,
    stats: resolution.stats,
    status,
    isLoading: status === "loading",
    isOffline: status === "offline",
    isFromCache,
    error,
    lastFetchedAt,
    refetch,
    getPortalGradesForCourse,
    getUnmatchedGradesForCourse,
    getMatchedDetailForAssessment,
  };
}
