export type Requirements = {
  appName: string;
  tagline: string;
  appType: string;
  problemStatement: string;
  primaryUser: { type: string; coreNeed: string };
  secondaryUsers: Array<{ type: string; coreNeed: string }>;
  coreAction: string;
  hasPayments: boolean;
  paymentContext: string | null;
  platform: string;
  keyFeatures: string[];
  constraints: { timeline: string | null; mustHave: string[]; mustNotHave: string[] };
  devAgentNotes: string;
};
