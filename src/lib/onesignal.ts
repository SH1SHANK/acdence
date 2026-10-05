import OneSignal from "react-onesignal";

export const ONESIGNAL_APP_ID: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ONESIGNAL_APP_ID) || "";

export interface PushNotificationState {
  isSupported: boolean;
  isInitialized: boolean;
  permission: "default" | "granted" | "denied" | "unsupported";
  isSubscribed: boolean;
  subscriptionId: string | null;
  isIosNeedsPwa: boolean;
  error: string | null;
}

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;
const stateChangeListeners = new Set<(state: PushNotificationState) => void>();

export function _resetOneSignalForTesting(): void {
  isInitialized = false;
  initPromise = null;
  stateChangeListeners.clear();
}

export function isIOSSafari(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
  return isIOS;
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isOneSignalConfigured(): boolean {
  return Boolean(ONESIGNAL_APP_ID && ONESIGNAL_APP_ID.trim().length > 0);
}

function notifyStateChange(): void {
  const state = getPushNotificationState();
  for (const listener of stateChangeListeners) {
    try {
      listener(state);
    } catch (err) {
      console.error("[OneSignal] Error in state listener:", err);
    }
  }
}

/**
 * Initializes OneSignal Web Push SDK.
 * Idempotent: Subsequent calls return the existing initialization promise.
 */
export async function initOneSignal(customAppId?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  const appId = (customAppId !== undefined ? customAppId : ONESIGNAL_APP_ID).trim();
  if (!appId) {
    return false;
  }

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
      });

      isInitialized = true;

      // Register listeners for permission & subscription changes
      try {
        if (OneSignal.Notifications?.addEventListener) {
          OneSignal.Notifications.addEventListener("permissionChange", () => {
            notifyStateChange();
          });
        }
        if (OneSignal.User?.PushSubscription?.addEventListener) {
          OneSignal.User.PushSubscription.addEventListener("change", () => {
            notifyStateChange();
          });
        }
      } catch (listenerErr) {
        console.warn("[OneSignal] Could not attach change listeners:", listenerErr);
      }

      notifyStateChange();
      return true;
    } catch (err) {
      console.error("[OneSignal] Initialization error:", err);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Associates current OneSignal push subscription with the Supabase User UUID.
 * Ensures the backend can target this user across multiple browsers/devices.
 */
export async function loginToOneSignal(userId: string): Promise<void> {
  if (!isInitialized || !userId) return;
  try {
    await OneSignal.login(userId);
    notifyStateChange();
  } catch (err) {
    console.error("[OneSignal] Failed to login user external ID:", err);
  }
}

/**
 * Unlinks the current device from the OneSignal external user ID.
 */
export async function logoutFromOneSignal(): Promise<void> {
  if (!isInitialized) return;
  try {
    await OneSignal.logout();
    notifyStateChange();
  } catch (err) {
    console.error("[OneSignal] Failed to logout user:", err);
  }
}

/**
 * Triggers the native browser push notification permission prompt.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // If not yet initialized, try initializing
  if (!isInitialized) {
    const success = await initOneSignal();
    if (!success) return false;
  }

  try {
    const granted = await OneSignal.Notifications.requestPermission();
    notifyStateChange();
    return Boolean(granted);
  } catch (err) {
    console.error("[OneSignal] Error requesting notification permission:", err);
    return false;
  }
}

/**
 * Opts the user into push notifications.
 */
export async function optInToPush(): Promise<void> {
  if (!isInitialized) {
    await initOneSignal();
  }
  try {
    await OneSignal.User.PushSubscription.optIn();
    notifyStateChange();
  } catch (err) {
    console.error("[OneSignal] Error opting in to push:", err);
  }
}

/**
 * Opts the user out of push notifications.
 */
export async function optOutOfPush(): Promise<void> {
  if (!isInitialized) return;
  try {
    await OneSignal.User.PushSubscription.optOut();
    notifyStateChange();
  } catch (err) {
    console.error("[OneSignal] Error opting out of push:", err);
  }
}

/**
 * Retrieves the current push notification capability and subscription state.
 */
export function getPushNotificationState(): PushNotificationState {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      isInitialized: false,
      permission: "unsupported",
      isSubscribed: false,
      subscriptionId: null,
      isIosNeedsPwa: false,
      error: null,
    };
  }

  const iosNeedsPwa = isIOSSafari() && !isStandalonePWA();

  let isSupported = false;
  try {
    isSupported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      (OneSignal.Notifications?.isPushSupported ? OneSignal.Notifications.isPushSupported() : true);
  } catch {
    isSupported = false;
  }

  if (!isSupported) {
    return {
      isSupported: false,
      isInitialized,
      permission: "unsupported",
      isSubscribed: false,
      subscriptionId: null,
      isIosNeedsPwa: iosNeedsPwa,
      error: iosNeedsPwa
        ? "On iOS, tap Share -> 'Add to Home Screen' to enable Web Push notifications."
        : "Push notifications are not supported by this browser.",
    };
  }

  let permission: "default" | "granted" | "denied" = "default";
  try {
    const nativePerm =
      OneSignal.Notifications?.permissionNative ||
      (typeof Notification !== "undefined" ? Notification.permission : "default");
    if (nativePerm === "granted" || nativePerm === "denied" || nativePerm === "default") {
      permission = nativePerm;
    }
  } catch {
    permission = "default";
  }

  let isSubscribed = false;
  let subscriptionId: string | null = null;
  try {
    if (isInitialized && OneSignal.User?.PushSubscription) {
      isSubscribed = Boolean(OneSignal.User.PushSubscription.optedIn);
      subscriptionId = OneSignal.User.PushSubscription.id || null;
    }
  } catch {
    isSubscribed = false;
    subscriptionId = null;
  }

  return {
    isSupported: true,
    isInitialized,
    permission,
    isSubscribed,
    subscriptionId,
    isIosNeedsPwa: iosNeedsPwa,
    error: null,
  };
}

/**
 * Subscribes a listener to push state changes (e.g. permission or subscription updates).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToPushStateChanges(
  callback: (state: PushNotificationState) => void,
): () => void {
  stateChangeListeners.add(callback);
  // Emit current state immediately
  try {
    callback(getPushNotificationState());
  } catch (err) {
    console.error("[OneSignal] Error in initial state emission:", err);
  }

  return () => {
    stateChangeListeners.delete(callback);
  };
}
