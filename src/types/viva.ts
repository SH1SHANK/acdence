import type { SourceMetadata } from "./metadata";

export type VivaCategory = "hardware_setup" | "rules_environment" | "preparation_execution";

export interface VivaChecklistItem {
  id: string;
  category: VivaCategory;
  title: string;
  description: string;
  isStrictGate: boolean;
  source: SourceMetadata;
}

export interface VivaEnvironmentRule {
  id: string;
  rule: string;
  penalty: string;
  source: SourceMetadata;
}
