import type { ProjectStage, ProjectRequirement, ProjectTrack } from "@/types/project";
import { MAD2_PROJECT_INSTRUCTIONS_METADATA, TREKKING_APP_V2_METADATA } from "./metadata";

export interface ProjectTrackConfig {
  track: ProjectTrack;
  name: string;
  submissionDeadline: string;
  evaluationBase: number;
  isCappedAt100: boolean;
  description: string;
}

export const PROJECT_TRACKS: Record<ProjectTrack, ProjectTrackConfig> = {
  theory_completed_prior: {
    track: "theory_completed_prior",
    name: "Theory Completed in May 2026 or Earlier",
    submissionDeadline: "2026-11-17",
    evaluationBase: 100,
    isCappedAt100: false,
    description: "Deadline: Nov 17, 2026. Evaluated out of 100.",
  },
  theory_registered_current: {
    track: "theory_registered_current",
    name: "Theory Registered in September 2026",
    submissionDeadline: "2026-12-10",
    evaluationBase: 105,
    isCappedAt100: true,
    description: "Deadline: Dec 10, 2026. Evaluated out of 105 marks and capped at 100.",
  },
};

export const PROJECT_STAGES: ProjectStage[] = [
  {
    id: "git_tracker",
    name: "0. Git Tracker Registration (Milestone 0)",
    description:
      "Register repository on Git Tracker and add AppDev team as collaborators. Mandatory precondition.",
    order: 0,
    isGateForNext: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "development",
    name: "1. Application Development",
    description: "Implement TMA V2 using Flask, Vue.js, SQLite, Redis, Celery, and Bootstrap.",
    order: 1,
    isGateForNext: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "validation_presubmission",
    name: "2. Pre-Submission Validation Form",
    description:
      "Validate submission archive via the portal Google Form (repeatable as many times as needed).",
    order: 2,
    isGateForNext: false,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "submission",
    name: "3. Final Portal Submission",
    description: "Upload single ZIP file + Project Report (<= 5 pages) + Video link (5-10 min).",
    order: 3,
    isGateForNext: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "validation_postsubmission",
    name: "4. Automated Portal Extraction & Validation",
    description:
      "Automated check for valid ZIP, project root folder, and existence of Python file (.py). Gates viva.",
    order: 4,
    isGateForNext: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "plagiarism_screening",
    name: "5. Plagiarism & Originality Screening",
    description: "Automated similarity check across submissions + Git commit history verification.",
    order: 5,
    isGateForNext: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "viva_l1",
    name: "6. Level 1 Viva (IITM Viva Team)",
    description:
      "Run app within 10 minutes, answer authenticity & basic questions. Score >= 20 to pass (E); >= 30 for L2.",
    order: 6,
    isGateForNext: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "viva_l2",
    name: "7. Level 2 Viva (Industry Experts)",
    description:
      "Code modifications, architectural depth, and feature evaluation. Score >= 20 to pass with sum (L1 + L2).",
    order: 7,
    isGateForNext: false,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
];

export const TMA_V2_REQUIREMENTS: ProjectRequirement[] = [
  // Tech Stack Specifications
  {
    id: "tma_req_flask",
    category: "tech_stack",
    title: "Flask RESTful API",
    description: "Backend must be developed in Python using Flask for API endpoints.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_vue",
    category: "tech_stack",
    title: "VueJS Frontend",
    description:
      "Frontend must use VueJS for UI components. Jinja2 entry point allowed only when using CDN.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_bootstrap",
    category: "tech_stack",
    title: "Bootstrap Styling",
    description:
      "Bootstrap for HTML generation and responsive styling. No other CSS framework allowed.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_sqlite",
    category: "tech_stack",
    title: "SQLite Database",
    description:
      "SQLite database created programmatically via code/ORM models. No manual DB Browser creation.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_redis_cache",
    category: "tech_stack",
    title: "Redis Caching",
    description: "Redis caching for frequently accessed treks with cache expiry strategy.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_celery_batch",
    category: "tech_stack",
    title: "Redis & Celery Batch Jobs",
    description: "Scheduled and async background tasks powered by Celery workers and Redis broker.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },

  // Roles & Functionalities
  {
    id: "tma_req_admin_precreated",
    category: "core_features",
    title: "Programmatic Single Admin",
    description:
      "Exactly one Admin pre-existing and created programmatically. No Admin registration.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_rbac",
    category: "core_features",
    title: "Role-Based Access Control",
    description:
      "Unified user model with role differentiation (Admin, Trek Staff, Trekker) using session/JWT.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_staff_management",
    category: "core_features",
    title: "Staff Management & Assignment",
    description: "Admin adds staff, assigns staff to treks; staff can only manage assigned treks.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_trek_booking_logic",
    category: "core_features",
    title: "Trek Booking & Capacity Invariants",
    description:
      "Prevent overbooking beyond available slots. Bookings permitted only when trek status is Open. Prevent duplicate bookings.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_daily_reminders",
    category: "core_features",
    title: "Scheduled Daily Reminders",
    description:
      "Daily reminder batch job for upcoming treks sent via email, SMS, or Google Chat webhook.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_monthly_report",
    category: "core_features",
    title: "Monthly Activity Report",
    description:
      "Scheduled monthly report generated on 1st of every month for Admin (HTML/PDF format).",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_async_csv_export",
    category: "core_features",
    title: "Async CSV Booking Export",
    description: "User-triggered async Celery export of trekking history with completion alert.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },

  // Deliverables & Submission Standards
  {
    id: "tma_req_report",
    category: "deliverables",
    title: "Project Report (<= 5 pages)",
    description:
      "PDF report with approach, AI/LLM declaration, ER diagram, API endpoints, and video link.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_video",
    category: "deliverables",
    title: "Presentation Video (5-10 minutes)",
    description:
      "Drive link with open view access containing 30s intro, 30s approach, 90s features, and demo.",
    mandatory: true,
    source: TREKKING_APP_V2_METADATA,
  },
  {
    id: "tma_req_zip_structure",
    category: "rules",
    title: "Single ZIP File Root Structure",
    description:
      "Project folder inside root of ZIP containing app.py/main.py. No extraneous root files.",
    mandatory: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
];
