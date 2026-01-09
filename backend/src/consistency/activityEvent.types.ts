export const ActivityEventType = {
  CHECKIN: "CHECKIN",
  TASK_STARTED: "TASK_STARTED",
  TASK_COMPLETED: "TASK_COMPLETED",
  BADGE_MINTED: "BADGE_MINTED",
  PROOF_ADDED: "PROOF_ADDED",
  VALIDATION_APPROVED: "VALIDATION_APPROVED",
  VALIDATION_REJECTED: "VALIDATION_REJECTED",
} as const;

export type ActivityEventType = (typeof ActivityEventType)[keyof typeof ActivityEventType];
