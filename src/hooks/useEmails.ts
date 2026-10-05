// ============================================================================
// ACADRIX / ACDENCE — USE EMAILS HOOK
// Reactive Supabase-first email intelligence state with Realtime subscriptions
// ============================================================================

import * as React from "react";
import { getSupabase } from "@/lib/supabase";
import {
  fetchEmailMessages,
  fetchEmailEvents,
  getCachedEmails,
  getCachedEmailEvents,
  mapDbEmailToDomain,
  mapDbEventToDomain,
} from "@/lib/sync/emailRepository";
import type { EmailMessage, EmailEvent, DbEmailMessage, DbEmailEvent } from "@/types/email";
import type { User } from "@supabase/supabase-js";
export interface UseEmailsReturn {
  emails: EmailMessage[];
  importantEmails: EmailMessage[];
  relevantEmails: EmailMessage[];
  emailEvents: EmailEvent[];
  upcomingEmailEvents: EmailEvent[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  selectedEmail: EmailMessage | null;
  setSelectedEmail: (email: EmailMessage | null) => void;
  refresh: () => Promise<void>;
  currentUser: User | null;
}

export function useEmails(): UseEmailsReturn {
  const [emails, setEmails] = React.useState<EmailMessage[]>(() => getCachedEmails());
  const [emailEvents, setEmailEvents] = React.useState<EmailEvent[]>(() => getCachedEmailEvents());
  const [loading, setLoading] = React.useState<boolean>(emails.length === 0);
  const [error, setError] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [selectedEmail, setSelectedEmail] = React.useState<EmailMessage | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const loadData = React.useCallback(async () => {
    try {
      setError(null);
      const [remoteEmails, remoteEvents] = await Promise.all([
        fetchEmailMessages(),
        fetchEmailEvents(),
      ]);
      setEmails(remoteEmails);
      setEmailEvents(remoteEvents);
    } catch (err: unknown) {
      console.warn("[useEmails] Failed to fetch remote emails:", err);
      const message = err instanceof Error ? err.message : "Failed to load emails";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Online / Offline recovery
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadData]);
  // Supabase Auth session & lifecycle listener: re-fetch immediately on login or token refresh
  React.useEffect(() => {
    const supabase = getSupabase();

    // Discover initial session user
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user || null;
      setCurrentUser(user);
      if (user) {
        void loadData();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void loadData();
      } else if (event === "SIGNED_OUT") {
        void loadData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadData]);

  // Supabase Realtime Subscription for email_messages & email_events
  // Re-subscribes whenever the authenticated user state changes
  React.useEffect(() => {
    const supabase = getSupabase();
    const channelName = `acdence-emails-realtime-${currentUser?.id || "anon"}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as DbEmailMessage;
            const newEmail = mapDbEmailToDomain(newRow);
            setEmails((prev) => {
              const exists = prev.some(
                (e) => e.id === newEmail.id || e.providerMessageId === newEmail.providerMessageId,
              );
              if (exists) {
                return prev.map((e) =>
                  e.providerMessageId === newEmail.providerMessageId ? newEmail : e,
                );
              }
              return [newEmail, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as DbEmailMessage;
            const updatedEmail = mapDbEmailToDomain(updatedRow);
            setEmails((prev) =>
              prev.map((e) =>
                e.id === updatedEmail.id || e.providerMessageId === updatedEmail.providerMessageId
                  ? { ...e, ...updatedEmail }
                  : e,
              ),
            );
            setSelectedEmail((curr) =>
              curr &&
              (curr.id === updatedEmail.id ||
                curr.providerMessageId === updatedEmail.providerMessageId)
                ? { ...curr, ...updatedEmail }
                : curr,
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string; provider_message_id?: string };
            setEmails((prev) =>
              prev.filter(
                (e) => e.id !== oldRow.id && e.providerMessageId !== oldRow.provider_message_id,
              ),
            );
            setSelectedEmail((curr) =>
              curr &&
              (curr.id === oldRow.id || curr.providerMessageId === oldRow.provider_message_id)
                ? null
                : curr,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_events",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as DbEmailEvent;
            const newEvent = mapDbEventToDomain(newRow);
            setEmailEvents((prev) => {
              const exists = prev.some((ev) => ev.id === newEvent.id);
              if (exists) return prev.map((ev) => (ev.id === newEvent.id ? newEvent : ev));
              return [...prev, newEvent];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as DbEmailEvent;
            const updatedEvent = mapDbEventToDomain(updatedRow);
            setEmailEvents((prev) =>
              prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)),
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setEmailEvents((prev) => prev.filter((ev) => ev.id !== oldRow.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Channel active
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Derived: Important Emails (Sorted by earliest deadline first, then newest received)
  const importantEmails = React.useMemo(() => {
    return emails
      .filter((e) => e.classification === "OFFICIAL_IMPORTANT" || e.importance === "HIGH")
      .sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;

        const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
        const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [emails]);

  // Derived: Relevant Emails (OFFICIAL_IMPORTANT or OFFICIAL_RELEVANT)
  const relevantEmails = React.useMemo(() => {
    return emails.filter(
      (e) => e.classification === "OFFICIAL_IMPORTANT" || e.classification === "OFFICIAL_RELEVANT",
    );
  }, [emails]);

  // Derived: Upcoming Email-Derived Events
  const upcomingEmailEvents = React.useMemo(() => {
    const now = new Date().getTime();
    return emailEvents
      .filter((e) => {
        const dTime = e.deadline ? new Date(e.deadline).getTime() : null;
        const sTime = e.startAt ? new Date(e.startAt).getTime() : null;
        return (dTime !== null && dTime >= now) || (sTime !== null && sTime >= now);
      })
      .sort((a, b) => {
        const timeA =
          (a.deadline ? new Date(a.deadline).getTime() : null) ??
          (a.startAt ? new Date(a.startAt).getTime() : Infinity);
        const timeB =
          (b.deadline ? new Date(b.deadline).getTime() : null) ??
          (b.startAt ? new Date(b.startAt).getTime() : Infinity);
        return timeA - timeB;
      });
  }, [emailEvents]);

  return {
    emails,
    importantEmails,
    relevantEmails,
    emailEvents,
    upcomingEmailEvents,
    loading,
    error,
    isOnline,
    selectedEmail,
    setSelectedEmail,
    refresh: loadData,
    currentUser,
  };
}
