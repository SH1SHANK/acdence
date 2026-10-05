import type { SourceMetadata } from "./metadata";

export type CourseCode = "CS2005" | "SE2001" | "CS2006" | "CS2006P" | "MS2001";

export type CourseType = "theory" | "project";

export type GaaPolicyMode = "best_n" | "all_in_pool";

export interface GaaPolicy {
  mode: GaaPolicyMode;
  count: number;
  poolAssessmentIds: string[];
  description: string;
}

export interface Course {
  code: CourseCode;
  name: string;
  credits: number;
  type: CourseType;
  hasSct: boolean;
  gaaPolicy?: GaaPolicy;
  source: SourceMetadata;
}
