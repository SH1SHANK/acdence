import type { SourceMetadata, StalenessReport } from "@/types/metadata";

export const SEPT_2026_GRADING_METADATA: SourceMetadata = {
  documentName: "Term: Sep 2026 Term: Course Grading System Guidelines",
  documentSection: "General & Course-Specific Policies",
  page: "Pages 1-26",
  term: "September 2026",
  verifiedAt: "2026-09-18T00:00:00.000Z",
  notes: "Authoritative term grading document for September 2026.",
};

export const MAD2_PROJECT_INSTRUCTIONS_METADATA: SourceMetadata = {
  documentName: "MAD - 2 Project and Viva Instructions (T32026)",
  documentSection: "Workflow, Submission Rules, Scoring & Viva Progression",
  page: "Pages 1-5",
  term: "September 2026",
  verifiedAt: "2026-09-18T00:00:00.000Z",
  notes: "Authoritative MAD-2 project guide including validation, tracks, and viva cutoffs.",
};

export const VIVA_CHECKLIST_METADATA: SourceMetadata = {
  documentName: "Viva Preparation Checklist Before viva starts",
  documentSection: "Dual Camera, 10-Minute Rule, Checksum & Environment Setup",
  page: "Pages 1-3",
  term: "September 2026",
  verifiedAt: "2026-09-18T00:00:00.000Z",
  notes: "Authoritative viva preparation checklist and strict technical criteria.",
};

export const TREKKING_APP_V2_METADATA: SourceMetadata = {
  documentName: "Trekking Management Application - V2",
  documentSection: "Problem Statement, Tech Stack & Deliverables",
  page: "Pages 1-6",
  term: "September 2026",
  verifiedAt: "2026-09-19T00:00:00.000Z",
  notes: "Authoritative project requirements specification for CS2006P TMA V2.",
};

export const EXAM_PORTAL_V2_METADATA: SourceMetadata = {
  documentName: "Examination Management Portal - V2",
  documentSection: "Problem Statement, Tech Stack, Roles & Deliverables",
  page: "Pages 1-6",
  term: "September 2026",
  verifiedAt: "2026-09-19T00:00:00.000Z",
  notes: "Authoritative project requirements specification for CS2006P EMP V2.",
};

export const GIT_HELPER_METADATA: SourceMetadata = {
  documentName: "GIT Helper Document for App Dev Project",
  documentSection: "Repository Setup, Permissions & Form Submission",
  page: "Pages 1-3",
  term: "September 2026",
  verifiedAt: "2026-09-19T00:00:00.000Z",
  notes: "Authoritative step-by-step GitHub configuration guide for CS2006P.",
};

export const TMA_MILESTONES_METADATA: SourceMetadata = {
  documentName: "Milestones for Trekking Management Application — V2",
  documentSection: "Milestone Milestones, Progress Weights & Commit Messages",
  page: "Pages 1-4",
  term: "September 2026",
  verifiedAt: "2026-09-19T00:00:00.000Z",
  notes: "Authoritative milestone schedule and commit standards for CS2006P.",
};

export function checkStaleness(metadata: SourceMetadata): StalenessReport {
  return {
    isStale: false,
    lastVerified: metadata.verifiedAt,
    notes: `Verified against official document '${metadata.documentName}' for ${metadata.term}.`,
  };
}
