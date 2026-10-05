import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SyncStatus } from "@/lib/sync/types";
import type { User } from "@supabase/supabase-js";
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type PushNotificationState, isOneSignalConfigured } from "@/lib/onesignal";

interface CloudSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  pendingDirtyCount: number;
  isOnline: boolean;
  pushState?: PushNotificationState;
  requestPushPermission?: () => Promise<boolean>;
  optInToPush?: () => Promise<void>;
  optOutOfPush?: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  triggerManualSync: () => Promise<void>;
}

export const CloudSyncDialog: React.FC<CloudSyncDialogProps> = React.memo(function CloudSyncDialog({
  open,
  onOpenChange,
  currentUser,
  syncStatus,
  syncError,
  lastSyncedAt,
  pendingDirtyCount,
  isOnline,
  pushState,
  requestPushPermission,
  optInToPush,
  optOutOfPush,
  signInWithOtp,
  verifyOtp,
  signOut,
  triggerManualSync,
}) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset inputs when user authenticates
  useEffect(() => {
    if (currentUser) {
      setStep("email");
      setToken("");
      setShowCodeInput(false);
      setLocalError(null);
    }
  }, [currentUser]);
  // Adjust state when dialog opens/closes
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setLocalError(null);
    } else if (!currentUser) {
      setStep("email");
      setToken("");
      setShowCodeInput(false);
      setLocalError(null);
    }
  }

  const [isPushSubmitting, setIsPushSubmitting] = useState(false);
  const [pushActionMsg, setPushActionMsg] = useState<string | null>(null);

  const handleTogglePush = async () => {
    if (!pushState) return;
    setIsPushSubmitting(true);
    setPushActionMsg(null);
    try {
      if (pushState.permission !== "granted") {
        if (requestPushPermission) {
          const granted = await requestPushPermission();
          if (granted) {
            setPushActionMsg("Push notifications enabled for this device!");
          } else {
            setPushActionMsg("Permission was not granted.");
          }
        }
      } else if (pushState.isSubscribed) {
        if (optOutOfPush) {
          await optOutOfPush();
          setPushActionMsg("Push notifications paused on this device.");
        }
      } else {
        if (optInToPush) {
          await optInToPush();
          setPushActionMsg("Push notifications resumed.");
        }
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      setPushActionMsg("Failed to update push status.");
    } finally {
      setIsPushSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    const res = await signInWithOtp(trimmedEmail);
    setIsSubmitting(false);

    if (res.success) {
      setStep("code");
      setShowCodeInput(false);
    } else {
      setLocalError(res.error || "Failed to send sign-in link. Please try again.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = token.trim();
    if (!trimmedToken || trimmedToken.length < 6) {
      setLocalError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    const res = await verifyOtp(email.trim(), trimmedToken);
    setIsSubmitting(false);

    if (!res.success) {
      setLocalError(res.error || "Invalid or expired code. Please try again.");
    } else {
      onOpenChange(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    await signOut();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : "Never";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-surface-100 border-border-default text-foreground font-sans p-6 shadow-2xl"
        aria-describedby="cloud-sync-description"
      >
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Cloud className="size-4.5" />
            </div>
            <DialogTitle className="text-base font-bold font-heading">
              {currentUser ? "Cloud Synchronization" : "Sign In to Sync"}
            </DialogTitle>
          </div>
          <DialogDescription
            id="cloud-sync-description"
            className="text-xs text-foreground-light pt-1"
          >
            {currentUser
              ? "Your academic records are safely synchronized across your devices via Supabase."
              : "Sign in with your email to sync your academic progress across your desktop and mobile devices."}
          </DialogDescription>
        </DialogHeader>

        {/* =====================================================================
              AUTHENTICATED STATE
              ===================================================================== */}
        {currentUser ? (
          <div className="flex flex-col gap-4 mt-2">
            {/* Account Card */}
            <div className="rounded-lg border border-border-default bg-surface-200/50 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="size-4 text-foreground-lighter shrink-0" />
                  <span className="text-xs font-mono font-medium truncate text-foreground">
                    {currentUser.email}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0 border-brand/40 text-brand"
                >
                  Active
                </Badge>
              </div>

              <div className="h-px w-full bg-border-default/60" />

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-lighter">Status:</span>
                <div className="flex items-center gap-1.5">
                  {syncStatus === "synced" && (
                    <>
                      <CloudCheck className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Synced</span>
                    </>
                  )}
                  {syncStatus === "syncing" && (
                    <>
                      <RefreshCw className="size-3.5 text-brand animate-spin" />
                      <span className="text-brand font-medium">Synchronizing...</span>
                    </>
                  )}
                  {syncStatus === "offline" && (
                    <>
                      <CloudOff className="size-3.5 text-amber-500" />
                      <span className="text-amber-500 font-medium">Offline</span>
                    </>
                  )}
                  {syncStatus === "error" && (
                    <>
                      <AlertCircle className="size-3.5 text-destructive" />
                      <span className="text-destructive font-medium">Sync Error</span>
                    </>
                  )}
                  {syncStatus === "local" && <span className="text-foreground-lighter">Local</span>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-lighter">Last Synced:</span>
                <span className="font-mono text-foreground-light text-[11px]">
                  {formattedLastSync}
                </span>
              </div>

              {pendingDirtyCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-500">Pending Uploads:</span>
                  <span className="font-mono text-amber-500 text-[11px] font-semibold">
                    {pendingDirtyCount} {pendingDirtyCount === 1 ? "item" : "items"}
                  </span>
                </div>
              )}
            </div>

            {/* Sync Error Banner if any */}
            {syncError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="flex-1">{syncError}</span>
              </div>
            )}

            {/* Web Push Notifications Card (OneSignal) */}
            <div className="rounded-lg border border-border-default bg-surface-200/50 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                    {pushState?.permission === "granted" && pushState?.isSubscribed ? (
                      <BellRing className="size-3.5" />
                    ) : pushState?.permission === "denied" ? (
                      <BellOff className="size-3.5 text-destructive" />
                    ) : (
                      <Bell className="size-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Web Push Notifications
                    </h4>
                    <p className="text-[11px] text-foreground-lighter">
                      OPPE cutoffs &amp; weekly deadline alerts
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {pushState?.permission === "granted" && pushState?.isSubscribed ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  >
                    Active
                  </Badge>
                ) : pushState?.permission === "denied" ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-destructive/10 text-destructive border-destructive/20"
                  >
                    Blocked
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20"
                  >
                    Disabled
                  </Badge>
                )}
              </div>

              {/* iOS PWA advisory if applicable */}
              {pushState?.isIosNeedsPwa && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                  <Smartphone className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    iOS Web Push: Tap <strong>Share</strong> in Safari and select{" "}
                    <strong>&quot;Add to Home Screen&quot;</strong> to receive notifications.
                  </span>
                </div>
              )}

              {/* Push Action Feedback message if any */}
              {pushActionMsg && (
                <p className="text-[11px] text-brand font-medium">{pushActionMsg}</p>
              )}

              {/* Action Button & Help text */}
              <div className="flex items-center justify-between pt-1">
                {pushState?.permission === "denied" ? (
                  <p className="text-[11px] text-foreground-lighter">
                    Unblock notifications in your browser site permissions to receive alerts.
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-foreground-lighter">
                      {pushState?.permission === "granted" && pushState?.isSubscribed
                        ? "Linked to your user ID."
                        : isOneSignalConfigured()
                          ? "Enable browser push on this device."
                          : "Configure VITE_ONESIGNAL_APP_ID."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTogglePush}
                      disabled={isPushSubmitting || !isOneSignalConfigured()}
                      className="text-xs h-7 px-2.5 cursor-pointer border-border-default hover:bg-surface-300"
                    >
                      {isPushSubmitting ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : pushState?.permission !== "granted" ? (
                        "Enable Push"
                      ) : pushState?.isSubscribed ? (
                        "Pause Push"
                      ) : (
                        "Resume Push"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-border-default cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => triggerManualSync()}
                disabled={isSubmitting || !isOnline || syncStatus === "syncing"}
                className="gap-1.5 text-xs cursor-pointer bg-brand hover:bg-brand/90 text-brand-foreground"
              >
                <RefreshCw
                  className={`size-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
                />
                <span>Sync Now</span>
              </Button>
            </div>

            <p className="text-[11px] text-foreground-lighter text-center">
              Signing out keeps your academic data safe on this browser in local mode.
            </p>
          </div>
        ) : (
          /* =====================================================================
               UNAUTHENTICATED STATE (EMAIL OTP / MAGIC LINK)
               ===================================================================== */
          <div className="flex flex-col gap-4 mt-2">
            {/* Step 1: Email Input */}
            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="cloud-sync-email"
                    className="text-xs font-medium text-foreground-light flex items-center gap-1.5"
                  >
                    <Mail className="size-3.5 text-foreground-lighter" />
                    <span>Email Address</span>
                  </label>
                  <Input
                    id="cloud-sync-email"
                    type="email"
                    placeholder="student@study.iitm.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoFocus
                    className="bg-surface-200/60 border-border-default text-xs h-9"
                  />
                </div>

                {localError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 flex items-start gap-2 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{localError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full gap-1.5 text-xs font-medium cursor-pointer bg-brand hover:bg-brand/90 text-brand-foreground h-9"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Sending Sign-In Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Magic Link / Sign-In Code</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-foreground-lighter leading-relaxed">
                  We will send a passwordless magic sign-in link to your inbox. You can sign in
                  instantly with one click. No password required.
                </p>
              </form>
            ) : (
              /* Step 2: Magic Link Waiting & Optional 6-Digit OTP */
              <div className="flex flex-col gap-3.5">
                {/* Magic Link Sent Card */}
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="size-7 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 mt-0.5">
                      <Mail className="size-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground">
                        Magic link sent!
                      </span>
                      <span className="text-xs text-foreground-lighter truncate font-mono">
                        {email}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground-light leading-relaxed">
                    Check your inbox and click the <strong>Log In</strong> button in the email to
                    sign in automatically on this device.
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-brand/15 text-[11px] text-brand">
                    <RefreshCw className="size-3 animate-spin shrink-0" />
                    <span>Waiting for email confirmation...</span>
                  </div>
                </div>

                {localError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 flex items-start gap-2 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{localError}</span>
                  </div>
                )}

                {/* Secondary Option: 6-Digit OTP Code */}
                <div className="rounded-lg border border-border-default bg-surface-200/40 p-3 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCodeInput((prev) => !prev)}
                    className="flex items-center justify-between text-xs text-foreground-light hover:text-foreground font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="size-3.5 text-foreground-lighter" />
                      <span>Have a 6-digit code instead?</span>
                    </div>
                    {showCodeInput ? (
                      <ChevronUp className="size-3.5 text-foreground-lighter" />
                    ) : (
                      <ChevronDown className="size-3.5 text-foreground-lighter" />
                    )}
                  </button>

                  {showCodeInput && (
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-2.5 pt-1">
                      <p className="text-[11px] text-foreground-lighter">
                        If your email contains a 6-digit verification code, enter it below:
                      </p>
                      <Input
                        id="cloud-sync-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                        disabled={isSubmitting}
                        autoFocus
                        className="bg-surface-100 border-border-default text-center font-mono text-base tracking-widest h-9"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmitting || token.trim().length < 6}
                        className="w-full gap-1.5 text-xs font-medium cursor-pointer bg-brand hover:bg-brand/90 text-brand-foreground h-8"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="size-3 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>Verify Code</span>
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setLocalError(null);
                      setShowCodeInput(false);
                    }}
                    className="text-foreground-lighter hover:text-foreground underline cursor-pointer"
                  >
                    Use different email
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSendOtp}
                    className="text-brand hover:underline cursor-pointer"
                  >
                    Resend link
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
