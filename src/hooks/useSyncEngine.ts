import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User, EmailOtpType } from "@supabase/supabase-js";
import type { PersistedUserState, SctStatus, SemesterTask, ProjectUserState } from "@/types/state";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { SyncStatus } from "@/lib/sync/types";
import {
  fetchRemoteState,
  upsertAssessmentRecord,
  upsertSctStatus,
  upsertProjectState,
  upsertVivaItem,
  upsertSemesterTask,
  deleteSemesterTaskRemote,
  upsertUserSettings,
  enqueueDirtyRecord,
  flushDirtyQueue,
  getDirtyQueue,
} from "@/lib/sync/repository";
import { reconcileFullState } from "@/lib/sync/reconciliation";
import { subscribeToUserChanges } from "@/lib/sync/realtime";
import { executeFirstLoginMigration } from "@/lib/sync/migration";
import {
  initOneSignal,
  loginToOneSignal,
  logoutFromOneSignal,
  getPushNotificationState,
  subscribeToPushStateChanges,
  requestNotificationPermission,
  optInToPush,
  optOutOfPush,
  type PushNotificationState,
} from "@/lib/onesignal";

export interface SyncEngineOptions {
  localState: PersistedUserState;
  onApplyRemoteState: (updatedState: PersistedUserState) => void;
}

export type AuthStatus = "unauthenticated" | "authenticating" | "authenticated";

export function useSyncEngine({ localState, onApplyRemoteState }: SyncEngineOptions) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unauthenticated");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingDirtyCount, setPendingDirtyCount] = useState<number>(() => getDirtyQueue().length);
  const [pushState, setPushState] = useState<PushNotificationState>(() =>
    getPushNotificationState(),
  );

  const localStateRef = useRef(localState);
  const onApplyRemoteStateRef = useRef(onApplyRemoteState);

  useEffect(() => {
    localStateRef.current = localState;
    onApplyRemoteStateRef.current = onApplyRemoteState;
  });

  // Initialize OneSignal Web SDK and listen for permission / subscription changes
  useEffect(() => {
    void initOneSignal();
    const unsubscribe = subscribeToPushStateChanges((newState) => {
      setPushState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Associate Supabase user UUID with OneSignal push subscription
  useEffect(() => {
    if (currentUser) {
      void loginToOneSignal(currentUser.id);
    }
  }, [currentUser]);

  const refreshDirtyCount = useCallback(() => {
    setPendingDirtyCount(getDirtyQueue().length);
  }, []);

  // 1. Reconcile with Cloud (Two-Way LWW Reconciliation)
  const reconcileWithCloud = useCallback(
    async (user: User) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        return;
      }

      try {
        setSyncStatus("syncing");
        setSyncError(null);

        // 1. Fetch remote snapshot
        const remoteData = await fetchRemoteState(user.id);

        // 2. Reconcile against current local state via LWW
        const { mergedState, hasRemoteChangesApplied, pendingLocalUploads } = reconcileFullState(
          localStateRef.current,
          remoteData,
        );

        // 3. Apply remote updates to local state if any
        if (hasRemoteChangesApplied) {
          onApplyRemoteStateRef.current(mergedState);
        }

        // 4. Upload any local changes that remote was missing
        const uploadPromises: Promise<void>[] = [];

        for (const rec of pendingLocalUploads.assessments) {
          uploadPromises.push(upsertAssessmentRecord(user.id, rec));
        }
        for (const code of pendingLocalUploads.sct) {
          uploadPromises.push(upsertSctStatus(user.id, code, mergedState.sctStatus[code]));
        }
        if (pendingLocalUploads.project) {
          uploadPromises.push(upsertProjectState(user.id, mergedState.projectState));
        }
        for (const itemId of pendingLocalUploads.viva) {
          uploadPromises.push(
            upsertVivaItem(user.id, itemId, Boolean(mergedState.vivaChecklistState[itemId])),
          );
        }
        for (const task of pendingLocalUploads.tasks) {
          uploadPromises.push(upsertSemesterTask(user.id, task));
        }
        if (pendingLocalUploads.settings) {
          uploadPromises.push(upsertUserSettings(user.id, mergedState));
        }

        await Promise.all(uploadPromises);

        // 5. Flush any queued offline modifications
        await flushDirtyQueue(user.id, mergedState);
        refreshDirtyCount();

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        setSyncStatus("synced");
      } catch (err: unknown) {
        console.error("Cloud reconciliation error:", err);
        const message = err instanceof Error ? err.message : "Sync failed";
        setSyncError(message);
        setSyncStatus("error");
      }
    },
    [refreshDirtyCount],
  );

  // 2. Perform First-Login Migration and Cloud Sync
  const performMigrationAndSync = useCallback(
    async (user: User) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        return;
      }

      try {
        setSyncStatus("syncing");
        setSyncError(null);

        // Execute safe first-login migration
        const migrationResult = await executeFirstLoginMigration(user.id, localStateRef.current);
        if (migrationResult.hasLocalChangesApplied) {
          onApplyRemoteStateRef.current(migrationResult.mergedState);
        }

        // Flush any pending dirty items
        await flushDirtyQueue(user.id, migrationResult.mergedState);
        refreshDirtyCount();

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        setSyncStatus("synced");
      } catch (err: unknown) {
        console.error("Migration and sync error:", err);
        const message = err instanceof Error ? err.message : "Migration failed";
        setSyncError(message);
        setSyncStatus("error");
      }
    },
    [refreshDirtyCount],
  );

  // 3. Monitor Supabase Auth Session
  useEffect(() => {
    const supabase = getSupabase();

    // 3a. Handle incoming magic link URL errors or token_hash params
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);

      const errorDesc =
        searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error");
      const errorCode = searchParams.get("error_code") || hashParams.get("error_code");

      if (errorDesc) {
        let friendly = decodeURIComponent(errorDesc.replace(/\+/g, " "));
        if (errorCode === "otp_expired" || friendly.toLowerCase().includes("expired")) {
          friendly =
            "The sign-in link has expired or has already been used. Please request a new link.";
        }
        setSyncError(friendly);
        setAuthStatus("unauthenticated");

        // Scrub auth error parameters from the browser address bar
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("error");
        cleanUrl.searchParams.delete("error_code");
        cleanUrl.searchParams.delete("error_description");
        cleanUrl.hash = "";
        window.history.replaceState({}, document.title, cleanUrl.toString());
      }

      // Direct token_hash verification fallback if provided in URL
      const tokenHash = searchParams.get("token_hash");
      const otpType = (searchParams.get("type") as EmailOtpType) || "email";
      if (tokenHash) {
        setAuthStatus("authenticating");
        void supabase.auth
          .verifyOtp({ token_hash: tokenHash, type: otpType })
          .then(({ data, error }) => {
            if (error) {
              setSyncError(error.message);
              setAuthStatus("unauthenticated");
            } else if (data.session?.user) {
              setCurrentUser(data.session.user);
              setAuthStatus("authenticated");
              void performMigrationAndSync(data.session.user);
            }
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("token_hash");
            cleanUrl.searchParams.delete("type");
            window.history.replaceState({}, document.title, cleanUrl.toString());
          });
      }
    }

    // Check initial session
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setAuthStatus("unauthenticated");
          setSyncStatus("local");
          return;
        }
        const sessionUser = data.session?.user || null;
        setCurrentUser(sessionUser);
        if (sessionUser) {
          setAuthStatus("authenticated");
          void performMigrationAndSync(sessionUser);
        } else {
          setAuthStatus("unauthenticated");
          setSyncStatus("local");
        }
      })
      .catch(() => {
        setAuthStatus("unauthenticated");
        setSyncStatus("local");
      });

    // Listen to session lifecycle events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);

      if (event === "SIGNED_IN" && user) {
        setAuthStatus("authenticated");
        setSyncError(null);
        void performMigrationAndSync(user);

        // Clean URL params if PKCE code or implicit hash fragments are present
        if (typeof window !== "undefined") {
          const hasCode = new URLSearchParams(window.location.search).has("code");
          const hasTokenInHash = window.location.hash.includes("access_token");
          if (hasCode || hasTokenInHash) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("code");
            cleanUrl.hash = "";
            window.history.replaceState({}, document.title, cleanUrl.toString());
          }
        }
      } else if (event === "SIGNED_OUT" || !user) {
        setAuthStatus("unauthenticated");
        setSyncStatus("local");
        setSyncError(null);
      } else if (event === "TOKEN_REFRESHED" && user) {
        setAuthStatus("authenticated");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [performMigrationAndSync]);

  // 4. Track Network Online / Offline Status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser) {
        void reconcileWithCloud(currentUser);
      } else {
        setSyncStatus("local");
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser, reconcileWithCloud]);

  // 5. Trigger reconciliation on Page Focus / Visibility Change
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void reconcileWithCloud(currentUser);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [currentUser, isOnline, reconcileWithCloud]);

  // 6. Supabase Realtime Subscription for Active Sessions
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    const unsubscribe = subscribeToUserChanges(currentUser.id, {
      onAssessmentChange: (record) => {
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          assessmentRecords: {
            ...localStateRef.current.assessmentRecords,
            [record.assessmentId]: record,
          },
          updatedAt: new Date().toISOString(),
        });
      },
      onSctChange: (courseCode, status) => {
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          sctStatus: {
            ...localStateRef.current.sctStatus,
            [courseCode]: status,
          },
          updatedAt: new Date().toISOString(),
        });
      },
      onProjectChange: (projectState) => {
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          projectState,
          updatedAt: new Date().toISOString(),
        });
      },
      onVivaChange: (itemId, isChecked) => {
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          vivaChecklistState: {
            ...localStateRef.current.vivaChecklistState,
            [itemId]: isChecked,
          },
          updatedAt: new Date().toISOString(),
        });
      },
      onTaskUpsert: (task) => {
        const existing = localStateRef.current.tasks;
        const exists = existing.some((t) => t.id === task.id);
        const tasks = exists
          ? existing.map((t) => (t.id === task.id ? task : t))
          : [...existing, task];
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          tasks,
          updatedAt: new Date().toISOString(),
        });
      },
      onTaskDelete: (clientTaskId) => {
        onApplyRemoteStateRef.current({
          ...localStateRef.current,
          tasks: localStateRef.current.tasks.filter((t) => t.id !== clientTaskId),
          updatedAt: new Date().toISOString(),
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isOnline]);

  // =========================================================================
  // Non-Blocking Record-Level Sync Helpers
  // =========================================================================

  const syncAssessment = useCallback(
    (record: AssessmentRecord) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "assessment",
          id: record.assessmentId,
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertAssessmentRecord(currentUser.id, record)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "assessment",
            id: record.assessmentId,
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncSct = useCallback(
    (courseCode: CourseCode, status: SctStatus) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "sct",
          id: courseCode,
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertSctStatus(currentUser.id, courseCode, status)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "sct",
            id: courseCode,
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncProject = useCallback(
    (projectState: ProjectUserState) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "project",
          id: "project_state",
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertProjectState(currentUser.id, projectState)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "project",
            id: "project_state",
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncViva = useCallback(
    (itemId: string, isChecked: boolean) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "viva",
          id: itemId,
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertVivaItem(currentUser.id, itemId, isChecked)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "viva",
            id: itemId,
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncTask = useCallback(
    (task: SemesterTask) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "task",
          id: task.id,
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertSemesterTask(currentUser.id, task)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "task",
            id: task.id,
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncTaskDelete = useCallback(
    (taskId: string) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "task_delete",
          id: taskId,
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      deleteSemesterTaskRemote(currentUser.id, taskId)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "task_delete",
            id: taskId,
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  const syncSettings = useCallback(
    (state: PersistedUserState) => {
      if (!currentUser || !isOnline) {
        enqueueDirtyRecord({
          type: "settings",
          id: "user_settings",
          timestamp: new Date().toISOString(),
        });
        refreshDirtyCount();
        return;
      }
      setSyncStatus("syncing");
      upsertUserSettings(currentUser.id, state)
        .then(() => {
          setSyncStatus("synced");
          refreshDirtyCount();
        })
        .catch(() => {
          enqueueDirtyRecord({
            type: "settings",
            id: "user_settings",
            timestamp: new Date().toISOString(),
          });
          refreshDirtyCount();
          setSyncStatus("error");
        });
    },
    [currentUser, isOnline, refreshDirtyCount],
  );

  // =========================================================================
  // Auth Operations
  // =========================================================================

  const signInWithOtp = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      setAuthStatus("authenticating");
      setSyncError(null);
      try {
        const supabase = getSupabase();
        const trimmedEmail = email.trim().toLowerCase();
        const redirectUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}`
            : undefined;

        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: true,
          },
        });

        if (error) {
          setAuthStatus("unauthenticated");
          setSyncError(error.message);
          return { success: false, error: error.message };
        }

        setAuthStatus("unauthenticated"); // Remains unauthenticated until magic link / OTP verified
        return { success: true };
      } catch (err: unknown) {
        setAuthStatus("unauthenticated");
        const message = err instanceof Error ? err.message : "Failed to send sign-in link";
        setSyncError(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
      setAuthStatus("authenticating");
      setSyncError(null);
      try {
        const supabase = getSupabase();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedToken = token.trim();

        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedToken,
          type: "email",
        });

        if (error || !data.session?.user) {
          setAuthStatus("unauthenticated");
          const message = error?.message || "Invalid or expired verification code";
          setSyncError(message);
          return { success: false, error: message };
        }

        setCurrentUser(data.session.user);
        setAuthStatus("authenticated");
        await performMigrationAndSync(data.session.user);
        return { success: true };
      } catch (err: unknown) {
        setAuthStatus("unauthenticated");
        const message = err instanceof Error ? err.message : "Verification failed";
        setSyncError(message);
        return { success: false, error: message };
      }
    },
    [performMigrationAndSync],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      await logoutFromOneSignal();
    } catch (err) {
      console.warn("Sign-out warning:", err);
    } finally {
      setCurrentUser(null);
      setAuthStatus("unauthenticated");
      setSyncStatus("local");
      setSyncError(null);
    }
  }, []);

  const triggerManualSync = useCallback(async () => {
    if (currentUser) {
      await reconcileWithCloud(currentUser);
    }
  }, [currentUser, reconcileWithCloud]);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    return await requestNotificationPermission();
  }, []);

  const handleOptInToPush = useCallback(async (): Promise<void> => {
    await optInToPush();
  }, []);

  const handleOptOutOfPush = useCallback(async (): Promise<void> => {
    await optOutOfPush();
  }, []);

  return {
    currentUser,
    authStatus,
    isAuthenticated: Boolean(currentUser),
    syncStatus,
    syncError,
    lastSyncedAt,
    isOnline,
    pendingDirtyCount,
    pushState,
    requestPushPermission,
    optInToPush: handleOptInToPush,
    optOutOfPush: handleOptOutOfPush,
    signInWithOtp,
    verifyOtp,
    signOut,
    triggerManualSync,
    syncAssessment,
    syncSct,
    syncProject,
    syncViva,
    syncTask,
    syncTaskDelete,
    syncSettings,
  };
}
