import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import {
  initOneSignal,
  loginToOneSignal,
  logoutFromOneSignal,
  requestNotificationPermission,
  optInToPush,
  optOutOfPush,
  getPushNotificationState,
  subscribeToPushStateChanges,
  isIOSSafari,
  isStandalonePWA,
  _resetOneSignalForTesting,
} from "@/lib/onesignal";

const { mockInit, mockLogin, mockLogout, mockRequestPermission, mockOptIn, mockOptOut } =
  vi.hoisted(() => ({
    mockInit: vi.fn().mockResolvedValue(undefined),
    mockLogin: vi.fn().mockResolvedValue(undefined),
    mockLogout: vi.fn().mockResolvedValue(undefined),
    mockRequestPermission: vi.fn().mockResolvedValue(true),
    mockOptIn: vi.fn().mockResolvedValue(undefined),
    mockOptOut: vi.fn().mockResolvedValue(undefined),
  }));

// Mock react-onesignal
vi.mock("react-onesignal", () => {
  const mockNotifications = {
    isPushSupported: vi.fn(() => true),
    permission: false,
    permissionNative: "default" as NotificationPermission,
    requestPermission: mockRequestPermission,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const mockUser = {
    PushSubscription: {
      id: "mock-subscription-id-12345",
      token: "mock-token",
      optedIn: true,
      optIn: mockOptIn,
      optOut: mockOptOut,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };

  return {
    default: {
      init: mockInit,
      login: mockLogin,
      logout: mockLogout,
      Notifications: mockNotifications,
      User: mockUser,
    },
  };
});

describe("OneSignal Web Push Integration (Phase 4)", () => {
  const originalDescriptorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDescriptorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  beforeEach(() => {
    vi.clearAllMocks();
    _resetOneSignalForTesting();
    const mockWindow = {
      navigator: {
        userAgent: "Node/Test",
        platform: "MacIntel",
        maxTouchPoints: 0,
      },
      Notification: {
        permission: "default" as NotificationPermission,
      },
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
      })),
    };
    const mockNavigator = {
      serviceWorker: {},
      userAgent: "Node/Test",
      platform: "MacIntel",
      maxTouchPoints: 0,
    };

    Object.defineProperty(globalThis, "window", {
      value: mockWindow,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: mockNavigator,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalDescriptorWindow) {
      Object.defineProperty(globalThis, "window", originalDescriptorWindow);
    } else {
      delete (globalThis as any).window;
    }
    if (originalDescriptorNavigator) {
      Object.defineProperty(globalThis, "navigator", originalDescriptorNavigator);
    }
  });

  describe("SDK Initialization & Safe Fallback", () => {
    it("returns false if appId is missing or empty", async () => {
      const result = await initOneSignal("");
      expect(result).toBe(false);
      expect(mockInit).not.toHaveBeenCalled();
    });

    it("initializes OneSignal with correct service worker path and parameters when appId is provided", async () => {
      const result = await initOneSignal("test-app-id-12345");
      expect(result).toBe(true);
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: "test-app-id-12345",
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
        }),
      );
    });

    it("subsequent calls are idempotent and do not re-initialize the SDK", async () => {
      const first = await initOneSignal("test-app-id-12345");
      const second = await initOneSignal("test-app-id-12345");
      expect(first).toBe(true);
      expect(second).toBe(true);
      // Already initialized, OneSignal.init should only have been called once across the tests
      expect(mockInit).toHaveBeenCalledTimes(1);
    });
  });

  describe("User Identity & External ID Binding", () => {
    beforeEach(async () => {
      await initOneSignal("test-app-id-12345");
      vi.clearAllMocks();
    });

    it("binds Supabase user UUID as OneSignal external ID on login", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      await loginToOneSignal(userId);
      expect(mockLogin).toHaveBeenCalledWith(userId);
    });

    it("ignores empty or null userId on login", async () => {
      await loginToOneSignal("");
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("unlinks user from OneSignal on logout", async () => {
      await logoutFromOneSignal();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe("Push Permissions & Subscription Actions", () => {
    beforeEach(async () => {
      await initOneSignal("test-app-id-12345");
      vi.clearAllMocks();
    });

    it("requests push notification permission via OneSignal.Notifications", async () => {
      const granted = await requestNotificationPermission();
      expect(granted).toBe(true);
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it("opts user in to push notifications via OneSignal.User.PushSubscription", async () => {
      await optInToPush();
      expect(mockOptIn).toHaveBeenCalled();
    });

    it("opts user out of push notifications via OneSignal.User.PushSubscription", async () => {
      await optOutOfPush();
      expect(mockOptOut).toHaveBeenCalled();
    });
  });

  describe("Push Notification State & Listener Registration", () => {
    beforeEach(async () => {
      await initOneSignal("test-app-id-12345");
      vi.clearAllMocks();
    });

    it("reports current push notification capability and subscription details", () => {
      const state = getPushNotificationState();
      expect(state.isSupported).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.subscriptionId).toBe("mock-subscription-id-12345");
      expect(state.isSubscribed).toBe(true);
    });

    it("subscribes to push state changes and provides working unsubscribe cleanup", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToPushStateChanges(listener);

      // Should be invoked immediately upon subscription
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isSupported: true,
          subscriptionId: "mock-subscription-id-12345",
        }),
      );

      unsubscribe();
    });
  });

  describe("iOS Safari & PWA Standalone Detection", () => {
    it("detects non-iOS desktop environments as isIOSSafari: false", () => {
      expect(isIOSSafari()).toBe(false);
    });

    it("detects iPhone/iPad user agents correctly", () => {
      Object.defineProperty(window, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          platform: "iPhone",
          maxTouchPoints: 5,
        },
        configurable: true,
      });
      expect(isIOSSafari()).toBe(true);
    });

    it("evaluates standalone PWA mode from window.matchMedia", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isStandalonePWA()).toBe(true);
    });
  });
});
