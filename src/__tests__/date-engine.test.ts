import { describe, it, expect } from "vite-plus/test";
import { getDaysRemaining } from "@/lib/selectors";
import { formatAcademicDate, formatRelativeTime, getTodayIST } from "@/lib/datetime";

describe("Date & Deadline Engine", () => {
  describe("getDaysRemaining", () => {
    it("returns 0 for the exact same date", () => {
      expect(getDaysRemaining("2026-10-15", "2026-10-15")).toBe(0);
    });

    it("returns positive numbers for future dates", () => {
      expect(getDaysRemaining("2026-10-20", "2026-10-15")).toBe(5);
      expect(getDaysRemaining("2026-11-01", "2026-10-31")).toBe(1);
    });

    it("returns negative numbers for past dates (overdue)", () => {
      expect(getDaysRemaining("2026-10-10", "2026-10-15")).toBe(-5);
      expect(getDaysRemaining("2026-10-31", "2026-11-01")).toBe(-1);
    });

    it("handles month and year boundaries correctly", () => {
      // Crossing from Dec 2026 into Jan 2027
      expect(getDaysRemaining("2027-01-10", "2026-12-31")).toBe(10);
      expect(getDaysRemaining("2026-12-31", "2027-01-10")).toBe(-10);
    });
  });

  describe("formatAcademicDate", () => {
    it("formats ISO dates into readable academic format in Asia/Kolkata", () => {
      expect(formatAcademicDate("2026-10-02")).toBe("October 2");
      expect(formatAcademicDate("2026-11-17", true)).toBe("November 17, 2026");
      expect(formatAcademicDate("2027-01-10", true)).toBe("January 10, 2027");
    });
  });

  describe("formatRelativeTime", () => {
    it("handles Due today, N days left, and overdue statuses", () => {
      expect(formatRelativeTime("2026-10-15", "2026-10-15")).toBe("Due today");
      expect(formatRelativeTime("2026-10-18", "2026-10-15")).toBe("3d left");
      expect(formatRelativeTime("2026-10-13", "2026-10-15")).toBe("Overdue by 2d");
    });
  });

  describe("getTodayIST", () => {
    it("returns a valid YYYY-MM-DD string", () => {
      const today = getTodayIST();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
