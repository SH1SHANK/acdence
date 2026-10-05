import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X, RefreshCw } from "lucide-react";
import type { PushNotificationState } from "@/lib/onesignal";

interface NotificationPromptBannerProps {
  isAuthenticated: boolean;
  pushState?: PushNotificationState;
  onRequestPermission: () => Promise<boolean>;
}

const DISMISS_KEY = "acdence_push_prompt_dismissed_v1";

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = React.memo(
  function NotificationPromptBanner({ isAuthenticated, pushState, onRequestPermission }) {
    const [dismissed, setDismissed] = useState<boolean>(() => {
      if (typeof window === "undefined") return true;
      try {
        return Boolean(localStorage.getItem(DISMISS_KEY));
      } catch {
        return false;
      }
    });

    const [isRequesting, setIsRequesting] = useState(false);

    // Sync with pushState changes: if permission is granted or denied, don't show
    const shouldShow =
      isAuthenticated &&
      !dismissed &&
      Boolean(pushState?.isSupported) &&
      pushState?.permission === "default";

    if (!shouldShow) return null;

    const handleEnable = async () => {
      setIsRequesting(true);
      try {
        await onRequestPermission();
      } finally {
        setIsRequesting(false);
      }
    };

    const handleDismiss = () => {
      setDismissed(true);
      try {
        localStorage.setItem(DISMISS_KEY, "true");
      } catch {
        // ignore storage errors
      }
    };

    return (
      <div
        role="region"
        aria-label="Push notifications banner"
        className="w-full bg-brand/10 border border-brand/20 rounded-lg p-3 sm:py-2.5 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-foreground transition-all duration-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-md bg-brand text-brand-foreground flex items-center justify-center shrink-0">
            <Bell className="size-3.5" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Enable Web Push Alerts:</span>{" "}
            <span className="text-foreground-light">
              Receive timely notifications for OPPE cutoffs, assignment deadlines, and exam dates.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={handleEnable}
            disabled={isRequesting}
            className="text-xs h-7 px-3 bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer"
          >
            {isRequesting ? <RefreshCw className="size-3 animate-spin mr-1.5" /> : null}
            Enable Notifications
          </Button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="p-1 rounded text-foreground-lighter hover:text-foreground hover:bg-surface-200 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  },
);
