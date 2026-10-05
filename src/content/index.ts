import type { CourseCode } from "@/types/course";

export type DocumentCategory = "grading" | "project" | "viva" | "reference";

export interface DocumentDefinition {
  id: string;
  title: string;
  description: string;
  file: string; // Path relative to repository root
  category: DocumentCategory;
  relatedCourses: CourseCode[];
  sourceFile: string;
  lastVerified: string;
}

export const REFERENCE_DOCUMENTS: DocumentDefinition[] = [
  {
    id: "grading-policy",
    title: "September 2026 Term: Course Grading System Guidelines",
    description:
      "Official grading policies, formulas, SCT SOP, OPPE eligibility rules, exam dates, and attendance gates.",
    file: "src/content/reference/grading-policy.md",
    category: "grading",
    relatedCourses: ["CS2005", "SE2001", "CS2006", "CS2006P", "MS2001"],
    sourceFile: "Google Document Sept 17 2026.pdf",
    lastVerified: "2026-09-18",
  },
  {
    id: "mad2-project-viva",
    title: "MAD - 2 Project and Viva Instructions (T32026)",
    description:
      "Official project operational pipeline, repeatable validation form, submission tracks, scoring boundaries, and viva progression.",
    file: "src/content/reference/mad2-project-viva.md",
    category: "project",
    relatedCourses: ["CS2006P"],
    sourceFile: "screencapture-appdev2_project_document_sep26.pdf",
    lastVerified: "2026-09-18",
  },
  {
    id: "viva-preparation",
    title: "Viva Preparation Checklist Before Viva Starts",
    description:
      "Mandatory dual-camera setup, strict 10-minute runtime rule, local checksum scripts, and environment guidelines.",
    file: "src/content/reference/viva-preparation.md",
    category: "viva",
    relatedCourses: ["CS2006P"],
    sourceFile: "screencapture-viva_preparation_checklist.pdf",
    lastVerified: "2026-09-18",
  },
  {
    id: "trekking-management-app",
    title: "Trekking Management Application - V2",
    description:
      "Official problem statement, permitted tech stack (Flask, Vue, SQLite, Redis, Celery), roles, and business invariants.",
    file: "src/content/reference/trekking-management-app.md",
    category: "project",
    relatedCourses: ["CS2006P"],
    sourceFile: "Trekking Management Application V2.pdf",
    lastVerified: "2026-09-19",
  },
  {
    id: "examination-management-portal",
    title: "Examination Management Portal - V2",
    description:
      "Official problem statement 1, permitted tech stack (Flask, Vue, SQLite, Redis, Celery), roles (Admin, Examiner, Student), and rubric workflows.",
    file: "src/content/reference/examination-management-portal.md",
    category: "project",
    relatedCourses: ["CS2006P"],
    sourceFile: "appdev2_project_statement_sep26.pdf",
    lastVerified: "2026-09-19",
  },
  {
    id: "git-helper-appdev",
    title: "GIT Helper Document for App Dev Project",
    description:
      "Step-by-step private GitHub repository setup, naming conventions, collaborator permissions, and official registration form links.",
    file: "src/content/reference/git-helper-appdev.md",
    category: "reference",
    relatedCourses: ["CS2006P"],
    sourceFile: "git_helper_document_sep26.pdf",
    lastVerified: "2026-09-19",
  },
  {
    id: "tma-v2-milestones",
    title: "Milestones for Trekking Management Application — V2",
    description:
      "Official 10-milestone development breakdown, time estimates, percentage splits, and unique git commit message standards.",
    file: "src/content/reference/tma-v2-milestones.md",
    category: "reference",
    relatedCourses: ["CS2006P"],
    sourceFile: "milestones_tma_v2_sep26.pdf",
    lastVerified: "2026-09-19",
  },
];

export function getAllDocuments(): DocumentDefinition[] {
  return [...REFERENCE_DOCUMENTS];
}

export function getDocumentById(id: string): DocumentDefinition | undefined {
  return REFERENCE_DOCUMENTS.find((doc) => doc.id === id);
}

export function getDocumentsForCourse(courseCode: CourseCode): DocumentDefinition[] {
  return REFERENCE_DOCUMENTS.filter((doc) => doc.relatedCourses.includes(courseCode));
}

export function getDocumentsByCategory(category: DocumentCategory): DocumentDefinition[] {
  return REFERENCE_DOCUMENTS.filter((doc) => doc.category === category);
}
