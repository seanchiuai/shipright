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
  it("sums to 1.0", () => {
    const sum =
      DEFAULT_WEIGHTS.auth +
      DEFAULT_WEIGHTS.database +
      DEFAULT_WEIGHTS.payments +
      DEFAULT_WEIGHTS.features +
      DEFAULT_WEIGHTS.ui;
    expect(sum).toBeCloseTo(1.0);
  });

  it("has all positive values", () => {
    expect(DEFAULT_WEIGHTS.auth).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.database).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.payments).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.features).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.ui).toBeGreaterThan(0);
  });
});

describe("requirementsSummary", () => {
  it("formats all core fields", () => {
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

  it("includes secondary users", () => {
    const req = makeRequirements({
      primaryUser: { type: "admin", coreNeed: "manage" },
      secondaryUsers: [
        { type: "viewer", coreNeed: "view" },
        { type: "editor", coreNeed: "edit" },
      ],
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("admin, viewer, editor");
  });

  it("shows payment context when hasPayments is true", () => {
    const req = makeRequirements({
      hasPayments: true,
      paymentContext: "Subscription billing",
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("Subscription billing");
  });

  it("shows 'Yes' when hasPayments but no context", () => {
    const req = makeRequirements({ hasPayments: true, paymentContext: null });
    const summary = requirementsSummary(req);
    expect(summary).toContain("Payments: Yes");
  });

  it("shows 'No' when no payments", () => {
    const req = makeRequirements({ hasPayments: false });
    const summary = requirementsSummary(req);
    expect(summary).toContain("Payments: No");
  });

  it("conditionally includes mustHave", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["realtime"], mustNotHave: [] },
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("Must Have: realtime");
  });

  it("conditionally includes mustNotHave", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: [], mustNotHave: ["ads"] },
    });
    const summary = requirementsSummary(req);
    expect(summary).toContain("Must Not Have: ads");
  });

  it("omits mustHave/mustNotHave when empty", () => {
    const req = makeRequirements();
    const summary = requirementsSummary(req);
    expect(summary).not.toContain("Must Have");
    expect(summary).not.toContain("Must Not Have");
  });
});

describe("scoreAuth", () => {
  it("returns 90 when auth is present", () => {
    const req = makeRequirements();
    const auth = { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false };
    expect(scoreAuth(req, auth)).toBe(90);
  });

  it("returns 40 when auth is not present", () => {
    const req = makeRequirements();
    const auth = { present: false, providers: [], hasRoles: false, hasOrgs: false };
    expect(scoreAuth(req, auth)).toBe(40);
  });
});

describe("scoreDatabase", () => {
  it("returns 90 when database is present", () => {
    const req = makeRequirements();
    const db = { present: true, type: "convex", realtime: true };
    expect(scoreDatabase(req, db)).toBe(90);
  });

  it("returns 20 when database is not present", () => {
    const req = makeRequirements();
    const db = { present: false, type: "", realtime: false };
    expect(scoreDatabase(req, db)).toBe(20);
  });
});

describe("scorePayments", () => {
  it("returns 100 when neither needs nor has payments", () => {
    const req = makeRequirements({ hasPayments: false });
    const pay = { present: false };
    expect(scorePayments(req, pay)).toBe(100);
  });

  it("returns 80 when does not need but has payments", () => {
    const req = makeRequirements({ hasPayments: false });
    const pay = { present: true, provider: "stripe", models: ["subscription"] };
    expect(scorePayments(req, pay)).toBe(80);
  });

  it("returns 0 when needs but does not have payments", () => {
    const req = makeRequirements({ hasPayments: true });
    const pay = { present: false };
    expect(scorePayments(req, pay)).toBe(0);
  });

  it("returns 100 when needs and has payments", () => {
    const req = makeRequirements({ hasPayments: true });
    const pay = { present: true, provider: "stripe", models: ["subscription"] };
    expect(scorePayments(req, pay)).toBe(100);
  });
});

describe("scoreFeatures", () => {
  it("returns 80 when no feature keywords match", () => {
    const req = makeRequirements({ keyFeatures: ["dashboard", "settings"] });
    const features = { fileUploads: false, email: false, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(80);
  });

  it("returns 80 when keyFeatures is empty", () => {
    const req = makeRequirements({ keyFeatures: [] });
    const features = { fileUploads: true, email: true, search: true, ai: true };
    expect(scoreFeatures(req, features)).toBe(80);
  });

  it("matches upload keyword to fileUploads", () => {
    const req = makeRequirements({ keyFeatures: ["file upload"] });
    const features = { fileUploads: true, email: false, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches image keyword to fileUploads", () => {
    const req = makeRequirements({ keyFeatures: ["image gallery"] });
    const features = { fileUploads: true, email: false, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches email keyword", () => {
    const req = makeRequirements({ keyFeatures: ["email notifications"] });
    const features = { fileUploads: false, email: true, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches notification keyword to email", () => {
    const req = makeRequirements({ keyFeatures: ["push notification"] });
    const features = { fileUploads: false, email: true, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches search keyword", () => {
    const req = makeRequirements({ keyFeatures: ["search products"] });
    const features = { fileUploads: false, email: false, search: true, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches find keyword to search", () => {
    const req = makeRequirements({ keyFeatures: ["find users"] });
    const features = { fileUploads: false, email: false, search: true, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches ai keyword", () => {
    const req = makeRequirements({ keyFeatures: ["ai assistant"] });
    const features = { fileUploads: false, email: false, search: false, ai: true };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches chat keyword to ai", () => {
    const req = makeRequirements({ keyFeatures: ["chatbot"] });
    const features = { fileUploads: false, email: false, search: false, ai: true };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches llm keyword to ai", () => {
    const req = makeRequirements({ keyFeatures: ["LLM integration"] });
    const features = { fileUploads: false, email: false, search: false, ai: true };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("matches gpt keyword to ai", () => {
    const req = makeRequirements({ keyFeatures: ["GPT chatbot"] });
    const features = { fileUploads: false, email: false, search: false, ai: true };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("is case insensitive", () => {
    const req = makeRequirements({ keyFeatures: ["FILE UPLOAD"] });
    const features = { fileUploads: true, email: false, search: false, ai: false };
    expect(scoreFeatures(req, features)).toBe(100);
  });

  it("calculates partial match score", () => {
    const req = makeRequirements({ keyFeatures: ["file upload", "email alerts"] });
    const features = { fileUploads: true, email: false, search: false, ai: false };
    // checked=2, matches=1 → 50 + (1/2)*50 = 75
    expect(scoreFeatures(req, features)).toBe(75);
  });

  it("returns 50 when all checked features miss", () => {
    const req = makeRequirements({ keyFeatures: ["file upload", "search"] });
    const features = { fileUploads: false, email: false, search: false, ai: false };
    // checked=2, matches=0 → 50 + 0 = 50
    expect(scoreFeatures(req, features)).toBe(50);
  });
});

describe("scoreUI", () => {
  it("returns 80 for shadcn framework (50 base + 30)", () => {
    const req = makeRequirements();
    const ui = { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: false };
    expect(scoreUI(req, ui)).toBe(80);
  });

  it("returns 65 for tailwind framework (50 base + 15)", () => {
    const req = makeRequirements();
    const ui = { framework: "tailwind", hasAdminDashboard: false, hasLandingPage: false };
    expect(scoreUI(req, ui)).toBe(65);
  });

  it("adds 10 for hasLandingPage", () => {
    const req = makeRequirements();
    const ui = { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: true };
    expect(scoreUI(req, ui)).toBe(90);
  });

  it("caps at 100", () => {
    const req = makeRequirements();
    const ui = { framework: "shadcn", hasAdminDashboard: true, hasLandingPage: true };
    // 50 + 30 + 10 = 90, no admin bonus in code → 90
    expect(scoreUI(req, ui)).toBeLessThanOrEqual(100);
  });

  it("returns 50 for unknown framework", () => {
    const req = makeRequirements();
    const ui = { framework: "bootstrap", hasAdminDashboard: false, hasLandingPage: false };
    expect(scoreUI(req, ui)).toBe(50);
  });
});

describe("identifyGaps", () => {
  it("identifies payment gap", () => {
    const req = makeRequirements({ hasPayments: true });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({ payments: { present: false } }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Payment processing");
  });

  it("identifies file upload gap", () => {
    const req = makeRequirements({ keyFeatures: ["file upload"] });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("File uploads");
  });

  it("identifies email gap", () => {
    const req = makeRequirements({ keyFeatures: ["email notifications"] });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Email notifications");
  });

  it("identifies search gap", () => {
    const req = makeRequirements({ keyFeatures: ["search products"] });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Search functionality");
  });

  it("identifies AI gap", () => {
    const req = makeRequirements({ keyFeatures: ["ai chatbot"] });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("AI/Chat features");
  });

  it("identifies realtime constraint gap", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["realtime sync"], mustNotHave: [] },
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "postgres", realtime: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Real-time data sync");
  });

  it("identifies role constraint gap", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["role-based access"], mustNotHave: [] },
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("User roles/permissions");
  });

  it("identifies org constraint gap", () => {
    const req = makeRequirements({
      constraints: { timeline: null, mustHave: ["org management"], mustNotHave: [] },
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: false },
      }),
    });
    expect(identifyGaps(req, tmpl)).toContain("Organizations/teams");
  });

  it("deduplicates gaps", () => {
    const req = makeRequirements({
      keyFeatures: ["file upload", "upload images"],
    });
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: false, email: false, search: false, ai: false },
      }),
    });
    const gaps = identifyGaps(req, tmpl);
    const fileUploadGaps = gaps.filter((g) => g === "File uploads");
    expect(fileUploadGaps.length).toBe(1);
  });

  it("returns empty array when no gaps", () => {
    const req = makeRequirements({ hasPayments: false, keyFeatures: [] });
    const tmpl = makeTemplate();
    expect(identifyGaps(req, tmpl)).toEqual([]);
  });
});

describe("identifyIncluded", () => {
  it("includes auth providers", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk", "google"], hasRoles: false, hasOrgs: false },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included).toContainEqual("Authentication (clerk, google)");
  });

  it("includes roles when present", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: true, hasOrgs: false },
      }),
    });
    expect(identifyIncluded(tmpl)).toContain("Role-based access");
  });

  it("includes orgs when present", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        auth: { present: true, providers: ["clerk"], hasRoles: false, hasOrgs: true },
      }),
    });
    expect(identifyIncluded(tmpl)).toContain("Organizations/teams");
  });

  it("includes database type", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "convex", realtime: false },
      }),
    });
    expect(identifyIncluded(tmpl)).toContainEqual("Database (convex)");
  });

  it("includes realtime sync", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        database: { present: true, type: "convex", realtime: true },
      }),
    });
    expect(identifyIncluded(tmpl)).toContain("Real-time sync");
  });

  it("includes payments with models", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        payments: { present: true, provider: "stripe", models: ["subscription", "one-time"] },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included).toContainEqual("Payments via stripe (subscription, one-time)");
  });

  it("includes admin dashboard", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        ui: { framework: "shadcn", hasAdminDashboard: true, hasLandingPage: false },
      }),
    });
    expect(identifyIncluded(tmpl)).toContain("Admin dashboard");
  });

  it("includes landing page", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        ui: { framework: "shadcn", hasAdminDashboard: false, hasLandingPage: true },
      }),
    });
    expect(identifyIncluded(tmpl)).toContain("Landing page");
  });

  it("includes feature capabilities", () => {
    const tmpl = makeTemplate({
      capabilities: makeCapabilities({
        features: { fileUploads: true, email: true, search: true, ai: true },
      }),
    });
    const included = identifyIncluded(tmpl);
    expect(included).toContain("File uploads");
    expect(included).toContain("Email notifications");
    expect(included).toContain("Search");
    expect(included).toContain("AI integration");
  });
});
