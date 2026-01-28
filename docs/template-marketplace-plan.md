# Template Marketplace Plan

> Future vision for Shipright's template system. This document outlines the evolution from fixed-category matching to a scalable marketplace model.

## Current State (Phase 3)

```
5 fixed dimensions → Score all templates → Pick highest
```

- 10 curated templates
- Hardcoded categories: auth, database, payments, features, ui
- AI determines category weights
- Works for MVP, doesn't scale

## Vision

A marketplace with 100+ templates covering specific use cases:

| Category | Examples |
|----------|----------|
| AI/Voice | OpenAI Realtime Voice, ElevenLabs TTS, Whisper STT |
| AI/Chat | Claude Chat, GPT-4 Assistant, RAG Pipeline |
| AI/Image | DALL-E Generator, Stable Diffusion, Image Analysis |
| Maps | Google Maps, Mapbox, OpenStreetMap |
| Payments | Stripe Connect, LemonSqueezy, Paddle |
| Video | Twilio Video, Daily.co, LiveKit |
| Auth | Auth.js, Clerk, Supabase Auth, Firebase Auth |
| Database | Supabase, PlanetScale, Neon, Turso |
| Realtime | Ably, Pusher, PartyKit, Convex |

---

## New Architecture

### Two-Stage Matching

```
User describes app
        │
        ▼
┌─────────────────────────────────┐
│  STAGE 1: Tag Filtering         │
│  (Fast, deterministic)          │
│                                 │
│  Extract tags from description  │
│  Filter templates by tag match  │
│  Return top 20 candidates       │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  STAGE 2: AI Ranking            │
│  (Smart, contextual)            │
│                                 │
│  AI sees 20 candidates + user   │
│  requirements in full context   │
│  Returns ranked top 5 with      │
│  explanations                   │
└─────────────────────────────────┘
        │
        ▼
   Present top 3 to user
```

### Why Two Stages?

| Stage | Speed | Intelligence | Cost |
|-------|-------|--------------|------|
| Tag filter | ~50ms | Low (keyword match) | Free |
| AI ranking | ~2s | High (contextual) | ~$0.01 |

- **500 templates?** Tag filter reduces to 20 candidates instantly
- **AI only sees relevant templates** - better decisions, lower cost
- **Deterministic first stage** - reproducible results

---

## Data Model

### Template Schema v2

```typescript
type TemplateV2 = {
  // Identity
  slug: string;              // "openai-realtime-voice"
  name: string;              // "OpenAI Realtime Voice Chat"
  description: string;       // Full description for AI ranking
  sourceUrl: string;         // GitHub URL

  // Matching (NEW)
  tags: string[];            // Hierarchical: ["ai", "ai:openai", "ai:voice"]
  integrations: string[];    // ["openai", "vercel"]
  useCases: string[];        // ["voice assistant", "customer support"]

  // Metadata (NEW)
  complexity: "starter" | "intermediate" | "advanced";
  maintained: boolean;       // Is source repo active?
  lastVerified: string;      // ISO date of last check

  // Legacy (keep for basic filtering)
  stack: string[];
  capabilities: {
    auth: { present: boolean; providers: string[]; };
    database: { present: boolean; type: string; realtime: boolean; };
    payments: { present: boolean; provider?: string; };
    ui: { framework: string; };
    features: { fileUploads: boolean; email: boolean; search: boolean; ai: boolean; };
  };
};
```

### Tag Taxonomy

Hierarchical tags for precise matching:

```
ai
├── ai:openai
│   ├── ai:openai:gpt4
│   ├── ai:openai:realtime
│   └── ai:openai:whisper
├── ai:anthropic
│   └── ai:anthropic:claude
├── ai:voice
│   ├── ai:voice:stt (speech-to-text)
│   └── ai:voice:tts (text-to-speech)
└── ai:image

maps
├── maps:google
├── maps:mapbox
└── maps:osm

payments
├── payments:stripe
│   ├── payments:stripe:checkout
│   ├── payments:stripe:connect
│   └── payments:stripe:subscriptions
├── payments:lemonsqueezy
└── payments:paddle

realtime
├── realtime:websocket
├── realtime:sse
└── realtime:webrtc
```

### Database Schema

```typescript
// convex/schema.ts additions

templates: defineTable({
  // Existing
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  sourceUrl: v.string(),
  stack: v.array(v.string()),
  capabilities: v.any(),

  // New for marketplace
  tags: v.array(v.string()),
  integrations: v.array(v.string()),
  useCases: v.array(v.string()),
  complexity: v.string(),
  maintained: v.boolean(),
  lastVerified: v.string(),

  // Marketplace metadata
  author: v.optional(v.string()),      // "official" | "community" | username
  downloads: v.optional(v.number()),   // Popularity tracking
  rating: v.optional(v.number()),      // 1-5 stars
})
  .index("by_slug", ["slug"])
  .index("by_tag", ["tags"])           // For tag filtering
  .index("by_integration", ["integrations"])
  .searchIndex("search", {             // Full-text search
    searchField: "description",
    filterFields: ["tags", "complexity"]
  }),
```

---

## Matching Algorithm v2

### Stage 1: Tag Extraction & Filtering

```typescript
// convex/matching.ts

async function extractTags(description: string): Promise<string[]> {
  // AI extracts relevant tags from user description
  const { object } = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: z.object({
      tags: z.array(z.string()),
      reasoning: z.string(),
    }),
    prompt: `Extract technology tags from this app description.

Available tags: ${TAG_TAXONOMY.join(", ")}

Description: "${description}"

Return tags that match what the user needs.`,
  });

  return object.tags;
}

async function filterByTags(tags: string[]): Promise<Template[]> {
  // Score templates by tag overlap
  const allTemplates = await ctx.runQuery(api.templates.list);

  return allTemplates
    .map(t => ({
      template: t,
      tagScore: calculateTagOverlap(tags, t.tags),
    }))
    .filter(t => t.tagScore > 0.3)  // At least 30% overlap
    .sort((a, b) => b.tagScore - a.tagScore)
    .slice(0, 20)  // Top 20 candidates
    .map(t => t.template);
}

function calculateTagOverlap(userTags: string[], templateTags: string[]): number {
  // Hierarchical matching: "ai:openai" matches "ai"
  let matches = 0;
  for (const userTag of userTags) {
    for (const tmplTag of templateTags) {
      if (tmplTag.startsWith(userTag) || userTag.startsWith(tmplTag)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(userTags.length, 1);
}
```

### Stage 2: AI Ranking

```typescript
async function rankCandidates(
  candidates: Template[],
  requirements: Requirements
): Promise<RankedTemplate[]> {
  const { object } = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: z.object({
      rankings: z.array(z.object({
        slug: z.string(),
        score: z.number().min(0).max(100),
        reasoning: z.string(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
      })),
    }),
    prompt: `Rank these templates for the user's app idea.

## User's App
Name: ${requirements.appName}
Description: ${requirements.problemStatement}
Key needs: ${requirements.features.map(f => f.name).join(", ")}

## Candidate Templates
${candidates.map(t => `
### ${t.name} (${t.slug})
${t.description}
Tags: ${t.tags.join(", ")}
Integrations: ${t.integrations.join(", ")}
`).join("\n")}

Rank the top 5 templates. Consider:
- How well does it match the user's specific use case?
- Does it include the integrations they need?
- Is the complexity appropriate?
- What would they need to add vs. remove?`,
  });

  return object.rankings;
}
```

---

## Migration Path

### Phase 3.5: Prepare for Marketplace

1. Add new fields to schema (optional, backwards compatible)
2. Update `templates.json` with tags for existing 10 templates
3. Keep current matching as fallback

### Phase 8: Marketplace MVP

1. Build tag extraction
2. Implement two-stage matching
3. Add 20 more specialized templates
4. UI for browsing templates by category

### Phase 9: Community Templates

1. Template submission flow
2. Verification/approval process
3. Rating and download tracking
4. Author attribution

---

## Template Sources

### Official Templates (Verified)

| Provider | Templates |
|----------|-----------|
| Vercel | AI Chatbot, Commerce, Next.js starters |
| Convex | SaaS Starter, Chat App |
| Clerk | Auth templates |
| Stripe | Subscription templates |
| OpenAI | Realtime Voice, Assistants |

### Community Templates (Curated)

- Must have active GitHub repo
- Must pass automated checks (builds, no secrets)
- Manual review for quality

---

## Open Questions

1. **Template versioning** - What happens when source repo updates?
2. **Customization tracking** - How to know if Daytona customization worked?
3. **Template dependencies** - Some templates need specific env vars, how to handle?
4. **Pricing** - Free tier vs. premium templates?

---

## Next Steps

1. [ ] Add tags to existing 10 templates in `data/templates.json`
2. [ ] Create `data/tags-taxonomy.json` with full tag hierarchy
3. [ ] Prototype tag extraction with AI
4. [ ] Test two-stage matching on sample descriptions
5. [ ] Design marketplace browse UI
