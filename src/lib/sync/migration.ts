import type { PersistedUserState } from "@/types/state";
import { fetchRemoteState, batchUploadFullState } from "./repository";
import { reconcileFullState } from "./reconciliation";
import type { SyncStorageLike } from "./repository";

export const MIGRATION_STORAGE_KEY = "acdence_cloud_migration_v1";

let fallbackMemoryMigrationStorage: Record<string, string> = {};

function resolveMigrationStorage(customStorage?: SyncStorageLike): SyncStorageLike {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => fallbackMemoryMigrationStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      fallbackMemoryMigrationStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete fallbackMemoryMigrationStorage[key];
    },
  };
}

export function isLocalStateMigrated(storage?: SyncStorageLike): boolean {
  try {
    const s = resolveMigrationStorage(storage);
    return s.getItem(MIGRATION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markLocalStateMigrated(storage?: SyncStorageLike): void {
  try {
    const s = resolveMigrationStorage(storage);
    s.setItem(MIGRATION_STORAGE_KEY, "true");
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLocalStateMigrationMarker(storage?: SyncStorageLike): void {
  try {
    const s = resolveMigrationStorage(storage);
    s.removeItem(MIGRATION_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export interface MigrationExecutionResult {
  migrated: boolean;
  type: "initial_upload" | "reconciled";
  mergedState: PersistedUserState;
  hasLocalChangesApplied: boolean;
}

/**
 * Idempotent, safe migration of local state into Supabase.
 * - If cloud state is empty: executes batchUploadFullState of local data.
 * - If cloud state already has rows: executes reconcileFullState using deterministic LWW timestamp rules.
 * - Only sets MIGRATION_STORAGE_KEY after cloud operation succeeds.
 */
export async function executeFirstLoginMigration(
  userId: string,
  localState: PersistedUserState,
  storage?: SyncStorageLike,
): Promise<MigrationExecutionResult> {
  const remoteData = await fetchRemoteState(userId);
  const cloudStateExists =
    remoteData.assessments.length > 0 ||
    remoteData.sct.length > 0 ||
    Boolean(remoteData.project) ||
    remoteData.tasks.length > 0 ||
    remoteData.viva.length > 0 ||
    Boolean(remoteData.settings);

  if (!cloudStateExists) {
    // Fresh cloud account -> Upload existing local state as initial cloud snapshot
    await batchUploadFullState(userId, localState);
    markLocalStateMigrated(storage);
    return {
      migrated: true,
      type: "initial_upload",
      mergedState: localState,
      hasLocalChangesApplied: false,
    };
  }

  // Cloud state exists -> Reconcile using existing deterministic LWW rules
  const reconciliation = reconcileFullState(localState, remoteData);

  // If local has changes that remote was missing, upload them to cloud
  if (reconciliation.hasLocalChangesApplied) {
    await batchUploadFullState(userId, reconciliation.mergedState);
  }

  markLocalStateMigrated(storage);

  return {
    migrated: true,
    type: "reconciled",
    mergedState: reconciliation.mergedState,
    hasLocalChangesApplied: reconciliation.hasRemoteChangesApplied,
  };
}
