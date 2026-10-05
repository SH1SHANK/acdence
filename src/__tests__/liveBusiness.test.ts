import { describe, it, expect } from "vite-plus/test";
import {
  getTodayIST,
  formatLiveISTString,
  formatRelativeTime,
  getSurroundingDates,
  parseDateComponents,
} from "@/lib/datetime";
import { getDateSummary } from "@/lib/dateSummary";
import { getNextImportantAction } from "@/lib/nextAction";
import { CANONICAL_EVENTS } from "@/data/events";
import {
  parseGitHubUrl,
  parseReadmeIntelligence,
  getGitHubCache,
  setGitHubCache,
  clearGitHubCache,
  type CachedGitHubData,
} from "@/services/github";

describe("Live Business Features & Architecture (Phase 3B)", () => {
  describe("datetime utilities (Asia/Kolkata)", () => {
    it("formats today date in IST format YYYY-MM-DD", () => {
      const today = getTodayIST();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("formats live IST string with day, date, month, year, time", () => {
      const testDate = new Date("2026-09-19T12:00:00+05:30");
      const formatted = formatLiveISTString(testDate, true);
      expect(formatted).toContain("SEP 2026");
      expect(formatted).toContain("IST");
    });

    it("formats relative time correctly for dates and past/future timestamps", () => {
      expect(formatRelativeTime("2026-09-19", "2026-09-19")).toBe("Due today");
      expect(formatRelativeTime("2026-09-20", "2026-09-19")).toBe("Tomorrow");
      expect(formatRelativeTime("2026-09-22", "2026-09-19")).toBe("3d left");
      expect(formatRelativeTime("2026-09-17", "2026-09-19")).toBe("Overdue by 2d");

      const now = new Date();
      const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
      expect(formatRelativeTime(tenMinsAgo, now)).toBe("10m ago");

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo, now)).toBe("2h ago");
    });

    it("returns consecutive surrounding dates centered around a target date", () => {
      const surrounding = getSurroundingDates("2026-09-19", 2, 2);
      expect(surrounding).toEqual([
        "2026-09-17",
        "2026-09-18",
        "2026-09-19",
        "2026-09-20",
        "2026-09-21",
      ]);
    });

    it("parses date components accurately", () => {
      const parsed = parseDateComponents("2026-09-19");
      expect(parsed.dayOfWeek).toBe("SAT");
      expect(parsed.dayNum).toBe(19);
      expect(parsed.month).toBe("SEP");
      expect(parsed.year).toBe(2026);
      expect(parsed.isWeekend).toBe(true);
    });
  });

  describe("Shared Deadline Day Aggregation (getDateSummary)", () => {
    it("accurately identifies shared deadline day when multiple courses converge on Sunday", () => {
      // October 18, 2026 is Week 3 assignment deadline across courses
      const summary = getDateSummary(CANONICAL_EVENTS, "2026-10-18");
      expect(summary.date).toBe("2026-10-18");
      expect(summary.isSharedDeadline).toBe(true);
      expect(summary.courseCount).toBeGreaterThanOrEqual(2);
      expect(summary.courses).toContain("CS2005");
      expect(summary.courses).toContain("SE2001");
      expect(summary.courses).toContain("CS2006");
      expect(summary.courses).toContain("MS2001");
    });

    it("detects examination dates accurately", () => {
      // Quiz 1 on 2026-11-15
      const summary = getDateSummary(CANONICAL_EVENTS, "2026-11-15");
      expect(summary.hasExam).toBe(true);
    });

    it("detects hard cutoffs on cutoff dates", () => {
      // Term Course Registration Cutoff on 2026-09-23
      const summary = getDateSummary(CANONICAL_EVENTS, "2026-09-23");
      expect(summary.hasHardCutoff).toBe(true);
    });
  });

  describe("Next Important Action Prioritization (getNextImportantAction)", () => {
    it("returns critical Course Registration Preparation during Pre-Semester on Sep 19", () => {
      const action = getNextImportantAction({
        events: CANONICAL_EVENTS,
        referenceDate: "2026-09-19",
        isPreSemester: true,
        registrationStartDate: "2026-09-22",
        registrationEndDate: "2026-09-23",
      });

      expect(action.category).toBe("registration");
      expect(action.urgency).toBe("critical");
      expect(action.title).toContain("Course Registration");
      expect(action.daysRemaining).toBe(3);
    });

    it("prioritizes hard cutoffs occurring within 7 days", () => {
      // 2026-10-20 is 3 days before SCT cutoff (2026-10-23)
      const action = getNextImportantAction({
        events: CANONICAL_EVENTS,
        referenceDate: "2026-10-20",
        isPreSemester: false,
      });

      expect(action.category).toBe("cutoff");
      expect(action.urgency).toBe("critical");
      expect(action.daysRemaining).toBeLessThanOrEqual(7);
    });

    it("prioritizes imminent events within 3 days", () => {
      // 2026-10-31 is 1 day before Quiz 1 eligibility cutoff on 2026-11-01
      const action = getNextImportantAction({
        events: CANONICAL_EVENTS,
        referenceDate: "2026-10-31",
        isPreSemester: false,
      });

      expect(action.urgency).toBe("critical");
      expect(action.targetDate).toBe("2026-11-01");
    });
  });

  describe("GitHub URL Parser & Deterministic README Intelligence", () => {
    it("parses valid GitHub repository formats", () => {
      expect(parseGitHubUrl("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
      expect(parseGitHubUrl("https://github.com/shashankmergu/mad2-project")).toEqual({
        owner: "shashankmergu",
        repo: "mad2-project",
      });
      expect(parseGitHubUrl("https://github.com/shashankmergu/mad2-project.git")).toEqual({
        owner: "shashankmergu",
        repo: "mad2-project",
      });
      expect(parseGitHubUrl("git@github.com:shashankmergu/mad2-project.git")).toEqual({
        owner: "shashankmergu",
        repo: "mad2-project",
      });
      expect(parseGitHubUrl("https://github.com/shashankmergu/mad2-project/tree/main")).toEqual({
        owner: "shashankmergu",
        repo: "mad2-project",
      });
    });

    it("rejects invalid GitHub repository formats", () => {
      expect(parseGitHubUrl("")).toBeNull();
      expect(parseGitHubUrl("not-a-repo")).toBeNull();
      expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
    });

    it("deterministically extracts task checkboxes and sections from README markdown", () => {
      const sampleReadme = `
# Project Tracker

## Frontend
- [x] Set up Vue 3 + Pinia
- [x] Configure Tailwind CSS
- [ ] Implement responsive dashboard

## Backend & API
- [x] Flask REST API setup
* [ ] Celery batch processing worker
* [ ] Redis cache integration

## Documentation
- [ ] Write API documentation
`;
      const intel = parseReadmeIntelligence(sampleReadme);
      expect(intel.totalTasks).toBe(7);
      expect(intel.completedTasks).toBe(3);
      expect(intel.percentage).toBe(43); // 3 / 7 = 42.8% -> 43%
      expect(intel.sections.length).toBe(3);
      expect(intel.sections[0].title).toBe("Frontend");
      expect(intel.sections[0].tasks.length).toBe(3);
      expect(intel.sections[0].tasks[0].completed).toBe(true);
      expect(intel.sections[0].tasks[2].completed).toBe(false);
      expect(intel.sourceNote).toContain("README-derived");
    });

    it("caches and retrieves repository data from local cache", () => {
      const mockData: CachedGitHubData = {
        owner: "testowner",
        repo: "testrepo",
        fullName: "testowner/testrepo",
        defaultBranch: "main",
        htmlUrl: "https://github.com/testowner/testrepo",
        milestones: [],
        cachedAt: new Date().toISOString(),
      };

      setGitHubCache("testowner", "testrepo", mockData);
      const retrieved = getGitHubCache("testowner", "testrepo");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.fullName).toBe("testowner/testrepo");

      clearGitHubCache("testowner", "testrepo");
      expect(getGitHubCache("testowner", "testrepo")).toBeNull();
    });
  });
});
