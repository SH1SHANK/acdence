import type { AssessmentRecord } from "@/types/assessment";
import type { PersistedUserState } from "@/types/state";
import { ASSESSMENT_DEFINITIONS } from "@/data/assessments";

export interface ValidationReport {
  valid: boolean;
  errors: string[];
}

export function validateAssessmentRecord(
  record: AssessmentRecord,
  maxScore = 100,
): ValidationReport {
  const errors: string[] = [];

  if (!record.assessmentId) {
    errors.push("Missing assessmentId.");
  }

  if (record.status === "pending") {
    if (record.score !== null) {
      errors.push(
        `Assessment ${record.assessmentId} has status 'pending' but non-null score: ${record.score}. Invariant violation: pending assessments must have score === null.`,
      );
    }
  } else if (record.status === "absent") {
    if (record.score !== 0) {
      errors.push(
        `Assessment ${record.assessmentId} has status 'absent' but score !== 0: ${record.score}. Invariant violation: absent assessments must have score === 0.`,
      );
    }
  } else if (record.status === "present") {
    if (record.score === null || typeof record.score !== "number") {
      errors.push(
        `Assessment ${record.assessmentId} has status 'present' but missing numeric score.`,
      );
    } else if (record.score < 0 || record.score > maxScore) {
      errors.push(
        `Assessment ${record.assessmentId} score ${record.score} is out of bounds [0, ${maxScore}].`,
      );
    }
  } else {
    errors.push(`Invalid status '${String(record.status)}'.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStateIntegrity(state: PersistedUserState): ValidationReport {
  const errors: string[] = [];

  const defMap = new Map(ASSESSMENT_DEFINITIONS.map((d) => [d.id, d]));

  for (const [id, record] of Object.entries(state.assessmentRecords)) {
    const def = defMap.get(id);
    if (!def) {
      errors.push(`Record references unknown assessment definition ID: '${id}'.`);
      continue;
    }

    const recReport = validateAssessmentRecord(record, def.maxScore);
    if (!recReport.valid) {
      errors.push(...recReport.errors);
    }
  }

  // Verify project state scores
  if (state.projectState.l1Score !== null) {
    if (state.projectState.l1Score < 0 || state.projectState.l1Score > 40) {
      errors.push(`Project L1 score ${state.projectState.l1Score} is out of bounds [0, 40].`);
    }
  }
  if (state.projectState.l2Score !== null) {
    if (state.projectState.l2Score < 0 || state.projectState.l2Score > 60) {
      errors.push(`Project L2 score ${state.projectState.l2Score} is out of bounds [0, 60].`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
