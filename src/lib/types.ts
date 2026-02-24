// --- Supporting types for expanded requirements ---

export type UserPersona = {
  type: string;
  coreNeed: string;
  accessLevel?: string;
  onboardingPath?: string;
};

export type Workflow = {
  name: string;
  actor: string;
  steps: string[];
  priority: "must-have" | "nice-to-have";
};

export type Feature = {
  name: string;
  description: string;
  priority: "must-have" | "nice-to-have";
  relatedWorkflow?: string;
};

export type ContentType = {
  name: string;
  createdBy: string;
  visibility: "public" | "private" | "restricted";
  fields?: string[];
};

export type MonetizationModel = {
  type: "subscription" | "per-transaction" | "freemium" | "one-time" | "free" | "other";
  description: string;
  tiers?: string[];
};

export type DesignPreferences = {
  style: string;
  inspirationApps?: string[];
  colorPreference?: string;
  notes?: string;
};

export type Integration = {
  name: string;
  purpose: string;
  priority: "must-have" | "nice-to-have";
};

/**
 * Extracted requirements from interview.
 * NOTE: Keep in sync with convex/matching.ts:Requirements
 */
export type Requirements = {
  appName: string;
  tagline: string;
  appType: string;
  problemStatement: string;
  // Expanded user personas
  primaryUser: UserPersona;
  secondaryUsers: UserPersona[];
  coreAction: string;
  // Backward-compat payment fields
  hasPayments: boolean;
  paymentContext: string | null;
  platform: string;
  // Expanded from string[] to Feature[]
  keyFeatures: Feature[];
  constraints: {
    timeline: string | null;
    mustHave: string[];
    mustNotHave: string[];
    mvpScope?: string;
    futureFeatures?: string[];
  };
  devAgentNotes: string;
  // New expanded fields
  workflows?: Workflow[];
  contentTypes?: ContentType[];
  monetization?: MonetizationModel;
  designPreferences?: DesignPreferences;
  integrations?: Integration[];
};

// --- Blueprint types ---

export type BlueprintStatus = "generating" | "ready" | "failed";

export type Blueprint = {
  _id: string;
  projectId: string;
  status: BlueprintStatus;
  generationError?: string;
  executiveSummary?: string;
  userPersonas?: string;
  featureBreakdown?: string;
  userFlows?: string;
  dataModel?: string;
  techStackRecommendations?: string;
  monetizationStrategy?: string;
  mvpScope?: string;
  architectureOverview?: string;
  designDirection?: string;
  markdownExport?: string;
};
