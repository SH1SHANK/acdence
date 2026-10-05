// @ts-nocheck
/**
 * ============================================================================
 * CANONICAL ACADEMIC EVENTS ARTIFACT GENERATOR
 * ============================================================================
 * Reads canonical academic events from src/data/events.ts and generates a
 * self-contained, runtime-neutral TypeScript artifact for the Supabase
 * deadline-notifications Edge Function.
 *
 * Source of Truth: src/data/events.ts
 * Output Target: supabase/functions/deadline-notifications/generated_canonical_events.ts
 *
 * Usage:
 *   bun scripts/generate_edge_canonical_events.ts
 * ============================================================================
 */

import { CANONICAL_EVENTS } from "../src/data/events.ts";
import type { AcademicEvent } from "../src/types/events.ts";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export interface CleanCanonicalEvent {
  id: string;
  title: string;
  type: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  courseCode?: string;
  importance?: string;
  isHardCutoff?: boolean;
  description?: string;
}

export function transformCanonicalEvents(): CleanCanonicalEvent[] {
  return CANONICAL_EVENTS.map((event: AcademicEvent) => {
    const clean: CleanCanonicalEvent = {
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
    };
    if (event.courseCode) clean.courseCode = event.courseCode;
    if (event.importance) clean.importance = event.importance;
    if (event.isHardCutoff || event.hardCutoff) clean.isHardCutoff = true;
    if (event.description) clean.description = event.description;
    return clean;
  });
}

export function generateArtifactContent(events: CleanCanonicalEvent[]): string {
  return `// ============================================================================
// CANONICAL ACADEMIC EVENTS ARTIFACT FOR SUPABASE EDGE FUNCTIONS
// AUTO-GENERATED FROM src/data/events.ts. DO NOT EDIT DIRECTLY.
// Generator: scripts/generate_edge_canonical_events.ts
// Source Count: ${events.length} events
// ============================================================================

export interface CanonicalEdgeEvent {
  id: string;
  title: string;
  type: string;
  date: string; // YYYY-MM-DD (Asia/Kolkata timezone)
  courseCode?: string;
  importance?: string;
  isHardCutoff?: boolean;
  description?: string;
}

export const CANONICAL_EDGE_EVENTS: CanonicalEdgeEvent[] = ${JSON.stringify(events, null, 2)};
`;
}

export function runGenerator(): void {
  const cleanEvents = transformCanonicalEvents();
  const content = generateArtifactContent(cleanEvents);

  const targetDir = path.resolve(process.cwd(), "supabase/functions/deadline-notifications");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, "generated_canonical_events.ts");
  fs.writeFileSync(targetFile, content, "utf-8");

  console.log(
    `[generate_edge_canonical_events] Successfully wrote ${cleanEvents.length} canonical events to ${targetFile}`,
  );
}

// Execute if run as script
if (import.meta.url === `file://${process.argv[1]}`) {
  runGenerator();
}
