import { useState, useEffect, useCallback } from "react";
import type { Course, CourseCode } from "@/types/course";
import type { AcademicWeek } from "@/data/semester";
import type { AssessmentDefinition } from "@/types/assessment";
import type { AcademicEvent } from "@/types/events";
import {
  fetchFullAcademicSnapshot,
  getInitialAcademicSnapshot,
  type CanonicalAcademicSnapshot,
} from "@/lib/sync/academicRepository";
import { DEFAULT_TERM_ID } from "@/lib/sync/gradeRepository";

export interface UseAcademicDataOptions {
  termId?: string;
  autoFetch?: boolean;
}

export function useAcademicData(options?: UseAcademicDataOptions) {
  const termId = options?.termId || DEFAULT_TERM_ID;
  const autoFetch = options?.autoFetch ?? true;

  const [snapshot, setSnapshot] = useState<CanonicalAcademicSnapshot>(() =>
    getInitialAcademicSnapshot(termId),
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<CanonicalAcademicSnapshot> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFullAcademicSnapshot(termId);
      setSnapshot(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load academic data";
      setError(msg);
      return snapshot;
    } finally {
      setIsLoading(false);
    }
  }, [termId, snapshot]);

  useEffect(() => {
    if (autoFetch) {
      void refetch();
    }
  }, [autoFetch, refetch]);

  // Re-hydrate canonical data automatically when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      void refetch();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [refetch]);

  const getAssessmentsForCourse = useCallback(
    (code: CourseCode): AssessmentDefinition[] => {
      return snapshot.assessments.filter((a) => a.courseCode === code);
    },
    [snapshot.assessments],
  );

  const getEventsForCourse = useCallback(
    (code: CourseCode): AcademicEvent[] => {
      return snapshot.events.filter((e) => !e.courseCode || e.courseCode === code);
    },
    [snapshot.events],
  );

  const getCourse = useCallback(
    (code: CourseCode): Course | undefined => {
      return snapshot.courses[code];
    },
    [snapshot.courses],
  );

  const getWeekForDate = useCallback(
    (dateString: string): AcademicWeek | undefined => {
      return snapshot.weeks.find((w) => dateString >= w.startDate && dateString <= w.endDate);
    },
    [snapshot.weeks],
  );

  return {
    termId: snapshot.termId,
    termConfig: snapshot.termConfig,
    weeks: snapshot.weeks,
    courses: snapshot.courses,
    assessments: snapshot.assessments,
    events: snapshot.events,
    isLoading,
    isFromCache: Boolean(snapshot.isFromCache),
    lastFetchedAt: snapshot.fetchedAt,
    error,
    refetch,
    getAssessmentsForCourse,
    getEventsForCourse,
    getCourse,
    getWeekForDate,
  };
}
