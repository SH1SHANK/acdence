import type { Course, CourseCode } from "@/types/course";
import { SEPT_2026_GRADING_METADATA } from "./metadata";

export const COURSES: Record<CourseCode, Course> = {
  CS2005: {
    code: "CS2005",
    name: "Programming Concepts using Java",
    credits: 4,
    type: "theory",
    hasSct: true,
    gaaPolicy: {
      mode: "best_n",
      count: 6,
      poolAssessmentIds: [
        "cs2005_grpa_02",
        "cs2005_grpa_03",
        "cs2005_grpa_04",
        "cs2005_grpa_05",
        "cs2005_grpa_06",
        "cs2005_grpa_07",
        "cs2005_grpa_08",
      ],
      description: "Best 6 out of 7 weekly programming graded assignments (Weeks 2 to 8).",
    },
    source: {
      ...SEPT_2026_GRADING_METADATA,
      documentSection: "10. Programming concepts using Java (CS2005)",
      page: "Pages 11-12",
    },
  },
  SE2001: {
    code: "SE2001",
    name: "System Commands",
    credits: 3,
    type: "theory",
    hasSct: true,
    gaaPolicy: {
      mode: "best_n",
      count: 9,
      poolAssessmentIds: [
        "se2001_ga_01",
        "se2001_ga_02",
        "se2001_ga_03",
        "se2001_ga_04",
        "se2001_ga_05",
        "se2001_ga_06",
        "se2001_ga_07",
        "se2001_ga_08",
        "se2001_ga_09",
        "se2001_ga_10",
      ],
      description: "Best 9 out of 10 weekly graded assignments.",
    },
    source: {
      ...SEPT_2026_GRADING_METADATA,
      documentSection: "11. System commands (SE2001)",
      page: "Pages 12-13",
    },
  },
  CS2006: {
    code: "CS2006",
    name: "Application Development II",
    credits: 4,
    type: "theory",
    hasSct: false,
    gaaPolicy: {
      mode: "all_in_pool",
      count: 2,
      poolAssessmentIds: ["cs2006_pa_01", "cs2006_pa_02"],
      description: "Average of exactly Weeks 1 and 2 programming assignments.",
    },
    source: {
      ...SEPT_2026_GRADING_METADATA,
      documentSection: "12. Application Development - 2 (CS2006)",
      page: "Pages 13-14",
    },
  },
  CS2006P: {
    code: "CS2006P",
    name: "Application Development II Project",
    credits: 2,
    type: "project",
    hasSct: false,
    source: {
      ...SEPT_2026_GRADING_METADATA,
      documentSection: "Project Courses / MAD-2 Project",
      page: "Pages 14, 25",
    },
  },
  MS2001: {
    code: "MS2001",
    name: "Business Data Management",
    credits: 4,
    type: "theory",
    hasSct: false,
    gaaPolicy: {
      mode: "all_in_pool",
      count: 9,
      poolAssessmentIds: [
        "ms2001_ga_01",
        "ms2001_ga_02",
        "ms2001_ga_03",
        "ms2001_ga_04",
        "ms2001_ga_05",
        "ms2001_ga_06",
        "ms2001_ga_07",
        "ms2001_ga_08",
        "ms2001_ga_09",
      ],
      description: "Average of first 9 weekly graded assignments.",
    },
    source: {
      ...SEPT_2026_GRADING_METADATA,
      documentSection: "4. Business Data management (MS2001)",
      page: "Pages 9-10",
    },
  },
};

export function getAllCourses(): Course[] {
  return Object.values(COURSES);
}

export function getCourse(code: CourseCode): Course {
  return COURSES[code];
}
