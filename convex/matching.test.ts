import { describe, it, expect } from "vitest";
import {
  DEFAULT_WEIGHTS,
  requirementsSummary,
  scoreAuth,
  scoreDatabase,
  scorePayments,
  scoreFeatures,
  scoreUI,
  identifyGaps,
  identifyIncluded,
  type Requirements,
  type Template,
} from "./matching";
import { TemplateCapabilities } from "./templates";

// --- Factory helpers ---

function makeRequirements(overrides: Partial<Requirements> = {}): Requirements {
  return {
    appName: "TestApp",
    tagline: "A test app",
    appType: "web",
    problemStatement: "Testing is hard",
    primaryUser: { type: "developer", coreNeed: "testing" },
    secondaryUsers: [],
    coreAction: "write tests",
    hasPayments: false,
    paymentContext: null,
    platform: "web",
    keyFeatures: [],
    constraints: { timeline: null, mustHave: [], mustNotHave: [] },
    devAgentNotes: "",
    ...overrides,
  };
}

function makeCapabilities(
  overrides: Partial<TemplateCapabilities> = {}
): TemplateCapabilities {
  return {
    auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false },
    database: { present: true, type: "convex", realtime: true },
    payments: { present: false },
    ui: { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: false },
    features: { fileUploads: false, email: false, search: false, ai: false },
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    _id: "template_1" as string,
    name: "Test Template",
    description: "A test template",
    sourceUrl: "https://github.com/test/repo",
    stack: ["next.js", "convex"],
    capabilities: makeCapabilities(),
    ...overrides,
  };
}

// --- Tests ---

describe("DEFAULT_WEIGHTS", () => {
  it("sums to 1.0 so weighted scores produce a valid percentage", () => {
    const sum =
      DEFAULT_WEIGHTS.auth +
      DEFAULT_WEIGHTS.database +
      DEFAULT_WEIGHTS.payments +
      DEFAULT_WEIGHTS.features +
      DEFAULT_WEIGHTS.ui;
    expect(sum).toBeCloseTo(1.0);
  });

  it("has all positive values (every category matters)", () => {
    expect(DEFAULT_WEIGHTS.auth).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.database).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.payments).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.features).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.ui).toBeGreaterThan(0);
  });

  it("each weight is less than 1 (no single category dominates entirely)", () => {
    expect(DEFAULT_WEIGHTS.auth).toBeLessThan(1);
    expect(DEFAULT_WEIGHTS.database).toBeLessThan(1);
    expect(DEFAULT_WEIGHTS.payments).toBeLessThan(1);
    expect(DEFAULT_WEIGHTS.features).toBeLessThan(1);
    expect(DEFAULT_WEIGHTS.ui).toBeLessThan(1);
  });
});

describe("requirementsSummary", () => {
  it("includes all user-provided fields so AI gets full context", () => {
    const req = makeRequirements({
      appName: "MyApp",
      appType: "marketplace",
      problemStatement: "No good marketplace",
      primaryUser: { type: "seller", coreNeed: "sell things" },
      coreAction: "list items",
      platform: "web",
      keyFeatures: ["search", "payments"],
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("MyApp");
    expect(summary).toContain("marketplace");
    expect(summary).toContain("No good marketplace");
    expect(summary).toContain("seller");
    expect(summary).toContain("list items");
    expect(summary).toContain("web");
    expect(summary).toContain("search, payments");
  });

  it("lists all user types (primary + secondary) so AI knows the audience", () => {
    const req = makeRequirements({
      primaryUser: { type: "admin", coreNeed: "manage" },
      secondaryUsers: [
        { type: "viewer", coreNeed: "view" },
        { type: "editor", coreNeed: "edit" },
      ],
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("admin");
    expect(summary).toContain("viewer");
    expect(summary).toContain("editor");
  });

  it("shows payment context when payments are needed", () => {
    const req = makeRequirements({
      hasPayments: true,
      paymentContext: "Subscription billing",
    });
    expect(requirementsSummary(req)).toContain("Subscription billing");
  });

  it("indicates payments needed even without context", () => {
    const req = makeRequirements({ hasPayments: true, paymentContext: null });
    const summary = requirementsSummary(req);
    // Should NOT say "No" — must indicate payments are needed
    expect(summary).not.toMatch(/Payments:\s*No/i);
  });

  it("indicates no payments when not needed", () => {
    const req = makeRequirements({ hasPayments: false });
    expect(requirementsSummary(req)).toMatch(/Payments:\s*No/i);
  });

  it("surfaces mustHave constraints so AI doesn't miss hard requirements", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["realtime", "offline"], mustNotHave: [] },
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("realtime");
    expect(summary).toContain("offline");
  });

  it("surfaces mustNotHave constraints", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: [], mustNotHave: ["ads", "tracking"] },
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("ads");
    expect(summary).toContain("tracking");
  });

  it("does not include constraint labels when lists are empty (cleaner prompt)", () => {
    const req = makeRequirements();
    const summary = requirementsSummary(req);
    expect(summary).not.toContain("Must Have");
    expect(summary).not.toContain("Must Not Have");
  });
});

describe("scoreAuth", () => {
  const req = makeRequirements();
  const withAuth = { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false };
  const noAuth = { present: false, providers: [], hasRoles: false, hasOrgs: false };

  it("scores higher when auth is present (most apps need auth)", () => {
    expect(scoreAuth(req, withAuth)).toBeGreaterThan(scoreAuth(req, noAuth));
  });

  it("all scores are within 0-100", () => {
    expect(scoreAuth(req, withAuth)).toBeGreaterThanOrEqual(0);
    expect(scoreAuth(req, withAuth)).toBeLessThanOrEqual(100);
    expect(scoreAuth(req, noAuth)).toBeGreaterThanOrEqual(0);
    expect(scoreAuth(req, noAuth)).toBeLessThanOrEqual(100);
  });

  it("does not penalize extra auth features (providers, roles)", () => {
    const richAuth = { present: true, providers: ["clerk", "google", "github"], hasRoles: true, hasOrgs: true };
    expect(scoreAuth(req, richAuth)).toBeGreaterThanOrEqual(scoreAuth(req, withAuth));
  });
});

describe("scoreDatabase", () => {
  const req = makeRequirements();
  const withDb = { present: true, type: "convex", realtime: true };
  const noDb = { present: false, type: "", realtime: false };

  it("scores higher when database is present (every app needs storage)", () => {
    expect(scoreDatabase(req, withDb)).toBeGreaterThan(scoreDatabase(req, noDb));
  });

  it("all scores are within 0-100", () => {
    expect(scoreDatabase(req, withDb)).toBeGreaterThanOrEqual(0);
    expect(scoreDatabase(req, withDb)).toBeLessThanOrEqual(100);
    expect(scoreDatabase(req, noDb)).toBeGreaterThanOrEqual(0);
    expect(scoreDatabase(req, noDb)).toBeLessThanOrEqual(100);
  });

  it("without database still scores > 0 (template still has other value)", () => {
    expect(scoreDatabase(req, noDb)).toBeGreaterThan(0);
  });
});

describe("scorePayments", () => {
  const needsPay = makeRequirements({ hasPayments: true });
  const noPay = makeRequirements({ hasPayments: false });
  const hasPay = { present: true, provider: "stripe", models: ["subscription"] };
  const noProv = { present: false };

  it("perfect score when needs match (both need + have, or neither)", () => {
    const matchBoth = scorePayments(needsPay, hasPay);
    const matchNeither = scorePayments(noPay, noProv);
    expect(matchBoth).toBe(matchNeither);
    expect(matchBoth).toBeGreaterThanOrEqual(90); // near-perfect match
  });

  it("worst score when app needs payments but template lacks them", () => {
    const missing = scorePayments(needsPay, noProv);
    expect(missing).toBeLessThanOrEqual(10); // critical gap
    // Should be worse than any other combination
    expect(missing).toBeLessThan(scorePayments(noPay, hasPay));
    expect(missing).toBeLessThan(scorePayments(needsPay, hasPay));
    expect(missing).toBeLessThan(scorePayments(noPay, noProv));
  });

  it("extra payments (not needed) is okay but not ideal", () => {
    const extra = scorePayments(noPay, hasPay);
    const perfect = scorePayments(noPay, noProv);
    expect(extra).toBeGreaterThan(50); // still a decent template
    expect(extra).toBeLessThanOrEqual(perfect); // but not as good as exact match
  });
});

describe("scoreFeatures", () => {
  const allFeatures = { fileUploads: true, email: true, search: true, ai: true };
  const noFeatures = { fileUploads: false, email: false, search: false, ai: false };

  it("scores higher when template has the features the app needs", () => {
    const req = makeRequirements({ keyFeatures: ["file upload", "search"] });
    expect(scoreFeatures(req, allFeatures)).toBeGreaterThan(scoreFeatures(req, noFeatures));
  });

  it("recognizes upload/file/image keywords as file upload need", () => {
    for (const keyword of ["file upload", "image gallery", "Upload photos"]) {
      const req = makeRequirements({ keyFeatures: [keyword] });
      const withUploads = { fileUploads: true, email: false, search: false, ai: false };
      const withoutUploads = { fileUploads: false, email: false, search: false, ai: false };
      expect(scoreFeatures(req, withUploads)).toBeGreaterThan(scoreFeatures(req, withoutUploads));
    }
  });

  it("recognizes email/notification keywords as email need", () => {
    for (const keyword of ["email alerts", "push notification"]) {
      const req = makeRequirements({ keyFeatures: [keyword] });
      const withEmail = { fileUploads: false, email: true, search: false, ai: false };
      const withoutEmail = { fileUploads: false, email: false, search: false, ai: false };
      expect(scoreFeatures(req, withEmail)).toBeGreaterThan(scoreFeatures(req, withoutEmail));
    }
  });

  it("recognizes search/find keywords as search need", () => {
    for (const keyword of ["search products", "find users"]) {
      const req = makeRequirements({ keyFeatures: [keyword] });
      const withSearch = { fileUploads: false, email: false, search: true, ai: false };
      const withoutSearch = { fileUploads: false, email: false, search: false, ai: false };
      expect(scoreFeatures(req, withSearch)).toBeGreaterThan(scoreFeatures(req, withoutSearch));
    }
  });

  it("recognizes ai/chat/llm/gpt keywords as AI need", () => {
    for (const keyword of ["ai assistant", "chatbot", "LLM integration", "GPT features"]) {
      const req = makeRequirements({ keyFeatures: [keyword] });
      const withAI = { fileUploads: false, email: false, search: false, ai: true };
      const withoutAI = { fileUploads: false, email: false, search: false, ai: false };
      expect(scoreFeatures(req, withAI)).toBeGreaterThan(scoreFeatures(req, withoutAI));
    }
  });

  it("is case insensitive", () => {
    const lower = makeRequirements({ keyFeatures: ["file upload"] });
    const upper = makeRequirements({ keyFeatures: ["FILE UPLOAD"] });
    const features = { fileUploads: true, email: false, search: false, ai: false };
    expect(scoreFeatures(lower, features)).toBe(scoreFeatures(upper, features));
  });

  it("partial match scores between full match and no match", () => {
    const req = makeRequirements({ keyFeatures: ["file upload", "email alerts"] });
    const oneMatch = { fileUploads: true, email: false, search: false, ai: false };
    const fullMatch = { fileUploads: true, email: true, search: false, ai: false };
    expect(scoreFeatures(req, oneMatch)).toBeGreaterThan(scoreFeatures(req, noFeatures));
    expect(scoreFeatures(req, oneMatch)).toBeLessThan(scoreFeatures(req, fullMatch));
  });

  it("returns a reasonable default when no feature keywords are recognized", () => {
    const req = makeRequirements({ keyFeatures: ["dashboard", "settings page"] });
    const score = scoreFeatures(req, noFeatures);
    // Should not penalize — these features aren't in the keyword map
    expect(score).toBeGreaterThan(50);
  });

  it("returns a reasonable default when keyFeatures is empty", () => {
    const req = makeRequirements({ keyFeatures: [] });
    const score = scoreFeatures(req, allFeatures);
    expect(score).toBeGreaterThan(50);
  });

  it("all scores are within 0-100", () => {
    const cases = [
      { keyFeatures: [] },
      { keyFeatures: ["ai chatbot"] },
      { keyFeatures: ["file upload", "email", "search", "ai chat"] },
      { keyFeatures: ["dashboard"] },
    ];
    for (const kf of cases) {
      const req = makeRequirements(kf);
      for (const features of [allFeatures, noFeatures]) {
        const score = scoreFeatures(req, features);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("scoreUI", () => {
  const req = makeRequirements();

  it("prefers shadcn over tailwind over unknown", () => {
    const shadcn = scoreUI(req, { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: false });
    const tailwind = scoreUI(req, { framework: "tailwind", hasAdminDashboard: false, hasLandingPage: false });
    const unknown = scoreUI(req, { framework: "bootstrap", hasAdminDashboard: false, hasLandingPage: false });
    expect(shadcn).toBeGreaterThan(tailwind);
    expect(tailwind).toBeGreaterThan(unknown);
  });

  it("landing page adds value", () => {
    const withLanding = scoreUI(req, { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: true });
    const withoutLanding = scoreUI(req, { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: false });
    expect(withLanding).toBeGreaterThan(withoutLanding);
  });

  it("never exceeds 100", () => {
    // Max everything
    const score = scoreUI(req, { framework: "shadcn", hasAdminDashboard: true, hasLandingPage: true });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("all scores are within 0-100", () => {
    const frameworks = ["shadcn", "tailwind", "bootstrap", "none", ""];
    for (const framework of frameworks) {
      for (const hasLandingPage of [true, false]) {
        const score = scoreUI(req, { framework, hasAdminDashboard: false, hasLandingPage });
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("identifyGaps", () => {
  it("flags payment gap when app needs payments but template lacks them", () => {
    const req = makeRequirements({ hasPayments: true });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({ payments: { present: false } }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Payment processing");
  });

  it("does NOT flag payment gap when template has payments", () => {
    const req = makeRequirements({ hasPayments: true });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({ payments: { present: true, provider: "stripe" } }),
    });
    expect(identifyGaps(req, tmpl)).not.toContain("Payment processing");
  });

  it("flags feature gaps for each missing capability keyword", () => {
    const gapMap: [string, string][] = [
      ["file upload", "File uploads"],
      ["email notifications", "Email notifications"],
      ["search products", "Search functionality"],
      ["ai chatbot", "AI/Chat features"],
    ];
    for (const [keyword, expectedGap] of gapMap) {
      const req = makeRequirements({ keyFeatures: [keyword] });
      const tmpl = makeTemplate({
        capabilities: makeCapabilities({
          features: { fileUploads: false, email: false, search: false, ai: false },
        }),
      });
      expect(identifyGaps(req, tmpl)).toContain(expectedGap);
    }
  });

  it("does NOT flag feature gap when template has the capability", () => {
    const req = makeRequirements({ keyFeatures: ["file upload"] });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: true, email: false, search: false, ai: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).not.toContain("File uploads");
  });

  it("flags mustHave constraint gaps: realtime, roles, orgs", () => {
    const constraintGaps: [string, Partial<TemplateCapabilities>, string][] = [
      [
        "realtime sync",
        { database: { present: true, type: "postgres", realtime: false } },
        "Real-time data sync",
      ],
      [
        "role-based access",
        { auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false } },
        "User roles/permissions",
      ],
      [
        "org management",
        { auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false } },
        "Organizations/teams",
      ],
    ];
    for (const [mustHave, caps, expectedGap] of constraintGaps) {
      const req = makeRequirements({
        constraints: { timeline: null, mustHave: [mustHave], mustNotHave: [] },
      });
      const tmpl = makeTemplate({ capabilities: makeCapabilities(caps) });
      expect(identifyGaps(req, tmpl)).toContain(expectedGap);
    }
  });

  it("does NOT flag constraint gap when template satisfies it", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["realtime sync"], mustNotHave: [] },
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "convex", realtime: true },
      }),
    });
    expect(identifyGaps(req, tmpl)).not.toContain("Real-time data sync");
  });

  it("deduplicates — multiple features triggering same gap listed only once", () => {
    const req = makeRequirements({
      keyFeatures: ["file upload", "upload images", "image processing"],
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    const gaps = identifyGaps(req, tmpl);
    expect(gaps.filter((g) => g === "File uploads")).toHaveLength(1);
  });

  it("returns empty when template covers everything the app needs", () => {
    const req = makeRequirements({ hasPayments: false, keyFeatures: [] });
    const tmpl = makeTemplate();
    expect(identifyGaps(req, tmpl)).toEqual([]);
  });
});

describe("identifyIncluded", () => {
  it("lists auth with provider names", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk", "google"], hasRoles: false, hasOrgs: false },
      }),
    });
    const included = identifyIncluded(tmpl);
    const authEntry = included.find((s) => s.includes("Authentication"));
    expect(authEntry).toBeDefined();
    expect(authEntry).toContain("clerk");
    expect(authEntry).toContain("google");
  });

  it("lists roles and orgs when auth has them", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: true, hasOrgs: true },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /role/i.test(s))).toBe(true);
    expect(included.some((s) => /org/i.test(s))).toBe(true);
  });

  it("does NOT list roles/orgs when auth lacks them", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /role/i.test(s))).toBe(false);
    expect(included.some((s) => /org/i.test(s))).toBe(false);
  });

  it("lists database type", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "convex", realtime: false },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => s.includes("convex"))).toBe(true);
  });

  it("lists realtime when database has it", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "convex", realtime: true },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /real.?time/i.test(s))).toBe(true);
  });

  it("lists payment provider and models", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        payments: { present: true, provider: "stripe", models: ["subscription", "one-time"] },
      }),
    });
    const included = identifyIncluded(tmpl);
    const payEntry = included.find((s) => /payment/i.test(s) || s.includes("stripe"));
    expect(payEntry).toBeDefined();
    expect(payEntry).toContain("stripe");
    expect(payEntry).toContain("subscription");
  });

  it("does NOT list payments when not present", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({ payments: { present: false } }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /payment/i.test(s) || /stripe/i.test(s))).toBe(false);
  });

  it("lists UI features (dashboard, landing page) when present", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        ui: { framework: "shadcn", hasAdminDashboard: true, hasLandingPage: true },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /dashboard/i.test(s))).toBe(true);
    expect(included.some((s) => /landing/i.test(s))).toBe(true);
  });

  it("lists each feature capability that's enabled", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: true, email: true, search: true, ai: true },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /upload/i.test(s) || /file/i.test(s))).toBe(true);
    expect(included.some((s) => /email/i.test(s))).toBe(true);
    expect(included.some((s) => /search/i.test(s))).toBe(true);
    expect(included.some((s) => /ai/i.test(s))).toBe(true);
  });

  it("does NOT list features that are disabled", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included.some((s) => /upload/i.test(s))).toBe(false);
    expect(included.some((s) => /email/i.test(s))).toBe(false);
    // "Search" could match "search" in other entries, so check specifically
    expect(included.some((s) => s === "Search")).toBe(false);
    expect(included.some((s) => /\bai\b/i.test(s))).toBe(false);
  });
});
