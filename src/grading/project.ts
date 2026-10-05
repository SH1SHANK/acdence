import type { ProjectTrack, ProjectGradeResult } from "@/types/project";
import type { LetterGrade } from "@/types/grading";
import { PROJECT_TRACKS } from "@/data/project";
import { calculateStandardGrade } from "./utils";

export function evaluateProjectGrade(
  track: ProjectTrack | null,
  l1Score: number | null,
  l2Score: number | null,
): ProjectGradeResult {
  const trackConfig = track ? PROJECT_TRACKS[track] : null;
  const submissionDeadline = trackConfig ? trackConfig.submissionDeadline : null;

  // If L1 not evaluated yet
  if (l1Score === null) {
    return {
      track,
      l1Score: null,
      l2Score: null,
      l2Eligible: false,
      finalScore: null,
      letterGrade: null,
      statusDescription: "Awaiting Level 1 viva evaluation.",
      submissionDeadline,
    };
  }

  // L1 evaluation
  // Step 5b: If student fails Level 1 viva (marks < 20)
  if (l1Score < 20) {
    return {
      track,
      l1Score,
      l2Score: null,
      l2Eligible: false,
      finalScore: l1Score,
      letterGrade: "U" as LetterGrade,
      statusDescription:
        "Failed Level 1 viva (score < 20). Awarded U grade. Redo project next term.",
      submissionDeadline,
    };
  }

  // Step 5c: If you pass Level 1 viva (20 <= marks < 30)
  if (l1Score >= 20 && l1Score < 30) {
    return {
      track,
      l1Score,
      l2Score: null,
      l2Eligible: false,
      finalScore: l1Score,
      letterGrade: "E" as LetterGrade,
      statusDescription:
        "Passed Level 1 viva (20 <= score < 30). Awarded E grade without Level 2 viva.",
      submissionDeadline,
    };
  }

  // Step 5d: If you pass Level 1 viva (marks >= 30) -> Eligible for L2 viva
  // If L2 has not been attempted or graded yet
  if (l2Score === null) {
    return {
      track,
      l1Score,
      l2Score: null,
      l2Eligible: true,
      finalScore: null,
      letterGrade: null,
      statusDescription: "Passed Level 1 with score >= 30. Eligible and awaiting Level 2 viva.",
      submissionDeadline,
    };
  }

  // L2 evaluation
  // Note from doc: If student scores 0 marks or is absent for level 2 viva, awarded E grade.
  if (l2Score === 0) {
    return {
      track,
      l1Score,
      l2Score,
      l2Eligible: true,
      finalScore: l1Score,
      letterGrade: "E" as LetterGrade,
      statusDescription: "Absent or 0 marks in Level 2 viva. Awarded E grade.",
      submissionDeadline,
    };
  }

  // Step 6b: If you fail Level 2 viva (0 < marks < 20)
  if (l2Score > 0 && l2Score < 20) {
    return {
      track,
      l1Score,
      l2Score,
      l2Eligible: true,
      finalScore: l1Score + l2Score,
      letterGrade: "D" as LetterGrade,
      statusDescription: "Attempted Level 2 viva but scored < 20. Awarded D grade.",
      submissionDeadline,
    };
  }

  // Step 6c: If you pass Level 2 viva (marks >= 20)
  // Final score is sum of L1 + L2
  const rawSum = l1Score + l2Score;
  const finalScore = trackConfig?.isCappedAt100 ? Math.min(100, rawSum) : rawSum;
  const letterGrade = calculateStandardGrade(finalScore);

  return {
    track,
    l1Score,
    l2Score,
    l2Eligible: true,
    finalScore,
    letterGrade,
    statusDescription: `Passed Level 2 viva! Final score: ${finalScore}/100. Grade: ${letterGrade}.`,
    submissionDeadline,
  };
}
