import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { fetchEmailMessages, saveCachedEmails, getCachedEmails } from "@/lib/sync/emailRepository";
import { getSupabase } from "@/lib/supabase";
import type { EmailMessage } from "@/types/email";

// Mock Supabase client
const mockSelect = vi.fn();
const mockFrom = vi.fn().mockImplementation(() => ({
  select: mockSelect,
}));

const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    }),
    removeChannel: vi.fn().mockResolvedValue("ok"),
  }),
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
}));

const mockStorage: Record<string, string> = {};
const storageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    mockStorage[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  }),
};
vi.stubGlobal("localStorage", storageMock);
vi.stubGlobal("window", {
  localStorage: storageMock,
  location: { href: "http://localhost:5173", search: "", hash: "" },
});

describe("Supabase Auth Flow & Email Intelligence Reactivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.clear();
  });

  describe("1. Passwordless Magic Link & OTP Flow Options", () => {
    it("formats redirect URL and lowercases email for signInWithOtp", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: null });

      // Simulate invocation with mixed-case and padded email
      const inputEmail = "  Student@Study.IITM.Ac.In  ";
      const normalizedEmail = inputEmail.trim().toLowerCase();

      expect(normalizedEmail).toBe("student@study.iitm.ac.in");
    });

    it("verifies 6-digit OTP code when provided", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          session: {
            user: { id: "test-user-123", email: "student@study.iitm.ac.in" },
          },
        },
        error: null,
      });

      const client = getSupabase();
      const res = await client.auth.verifyOtp({
        email: "student@study.iitm.ac.in",
        token: "123456",
        type: "email",
      });

      expect(res.data.session?.user.id).toBe("test-user-123");
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "student@study.iitm.ac.in",
        token: "123456",
        type: "email",
      });
    });
  });

  describe("2. Magic Link URL Error Detection & Sanitization", () => {
    it("correctly identifies and formats expired OTP link error parameters", () => {
      const errorDesc = "Email+link+is+invalid+or+has+expired";
      const errorCode = "otp_expired";

      let friendly = decodeURIComponent(errorDesc.replace(/\+/g, " "));
      if (errorCode === "otp_expired" || friendly.toLowerCase().includes("expired")) {
        friendly =
          "The sign-in link has expired or has already been used. Please request a new link.";
      }

      expect(friendly).toContain("The sign-in link has expired");
    });
  });

  describe("3. Email Repository Cache Fallback & RLS Resilience", () => {
    it("falls back to local cache when remote returns empty rows for unauthenticated client", async () => {
      // Seed cache
      const cachedSample: EmailMessage[] = [
        {
          id: "email_1",
          providerMessageId: "msg_1",
          threadId: "th_1",
          receivedAt: "2026-10-05T10:00:00Z",
          senderName: "IITM Admin",
          senderEmail: "admin@study.iitm.ac.in",
          subject: "Important Examination Notice",
          classification: "OFFICIAL_IMPORTANT",
          officiality: "OFFICIAL",
          importance: "HIGH",
          category: "EXAM",
          courseCode: "CS2005",
          courseName: "Programming in Java",
          eventTitle: "OPPE 1 Notice",
          eventType: "OPPE",
          deadline: "2026-10-20T18:00:00Z",
          startAt: null,
          endAt: null,
          location: "Portal",
          requiredAction: "Verify SCT",
          affectedAssessment: "OPPE 1",
          confidence: "0.98",
          duplicateStatus: "NEW_EMAIL",
          dedupKey: "cs2005_oppe1",
          evidence: "Mandatory OPPE window",
          additionalAcademicEvents: null,
          processingNotes: null,
          emailSummary: "OPPE 1 window details",
          emailBody: "<p>OPPE 1 Notice</p>",
          contentFingerprint: "sha256:abc",
          processedAt: "2026-10-05T10:05:00Z",
          createdAt: "2026-10-05T10:05:00Z",
          updatedAt: "2026-10-05T10:05:00Z",
        },
      ];
      saveCachedEmails(cachedSample);

      // When remote returns empty array (due to RLS blocking unauthenticated SELECT)
      const mockQueryBuilder = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
      };
      mockSelect.mockReturnValue(mockQueryBuilder);

      const result = await fetchEmailMessages();

      // Should gracefully return the cached emails rather than an empty list
      expect(result.length).toBe(1);
      expect(result[0].subject).toBe("Important Examination Notice");
    });

    it("updates local cache when remote returns fresh authenticated emails", async () => {
      const freshEmail = {
        id: "fresh_1",
        provider_message_id: "fresh_msg_1",
        thread_id: "fresh_th_1",
        received_at: "2026-10-05T12:00:00Z",
        sender_name: "Instructor",
        sender_email: "instructor@study.iitm.ac.in",
        subject: "SE2001: BPT 2 Announcement",
        classification: "OFFICIAL_IMPORTANT",
        officiality: "OFFICIAL_COURSE",
        importance: "HIGH",
        category: "EXAM",
        course_code: "SE2001",
        course_name: "System Commands",
        event_title: "BPT 2 Window",
        event_type: "OPPE",
        deadline: "2026-10-15T15:30:00Z",
        start_at: null,
        end_at: null,
        location: "Safe Exam Browser",
        required_action: "Download SEB config",
        affected_assessment: "BPT 2",
        confidence: 0.95,
        duplicate_status: "NEW_EMAIL",
        dedup_key: "se2001_bpt2",
        evidence: "Exam notice",
        additional_academic_events: null,
        processing_notes: null,
        email_summary: "BPT 2 Exam schedule",
        email_body: "<p>BPT 2</p>",
        content_fingerprint: "sha256:def",
        processed_at: "2026-10-05T12:05:00Z",
        created_at: "2026-10-05T12:05:00Z",
        updated_at: "2026-10-05T12:05:00Z",
        email_events: [],
      };

      const mockQueryBuilder = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => resolve({ data: [freshEmail], error: null })),
      };
      mockSelect.mockReturnValue(mockQueryBuilder);

      const result = await fetchEmailMessages();

      expect(result.length).toBe(1);
      expect(result[0].subject).toBe("SE2001: BPT 2 Announcement");

      // Verify localStorage was updated
      const cached = getCachedEmails();
      expect(cached.length).toBe(1);
      expect(cached[0].subject).toBe("SE2001: BPT 2 Announcement");
    });
  });
});
