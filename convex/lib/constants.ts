export const PROJECT_STATUS = {
  INTERVIEW: "interview",
  MATCHING: "matching",
  MATCHED: "matched",
  BUILDING: "building",
  SCAFFOLDING: "scaffolding",
  COMPLETE: "complete",
  REPO_FAILED: "repo_failed",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const INTERVIEW_PHASE = {
  SEED: "seed",
  CONVERSATION: "conversation",
  SUMMARY: "summary",
} as const;

export type InterviewPhase = (typeof INTERVIEW_PHASE)[keyof typeof INTERVIEW_PHASE];

export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];
