# Testing

## Stack

| Tool | Purpose | Config |
|------|---------|--------|
| Vitest | Unit & integration tests | `vitest.config.ts` |
| React Testing Library | Component tests | via `@testing-library/react` |
| jest-dom | DOM assertions | loaded in `vitest.setup.ts` |
| agent-browser | E2E browser tests | local only, uses `.env.local` creds |

## File Conventions

- Unit tests: `src/**/*.test.ts` or `src/**/*.test.tsx`
- Convex function tests: `convex/**/*.test.ts`
- Test utilities/helpers: `src/__tests__/`

## Commands

```bash
npm test           # Run all tests once
npm run test:watch # Watch mode during development
```

## Writing Tests

### Unit test (plain logic)

```ts
import { describe, it, expect } from "vitest";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### Component test

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("renders text", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Mocking Convex / Clerk

Components using Convex hooks (`useQuery`, `useMutation`) or Clerk hooks (`useUser`) need providers mocked. Use `vi.mock()`:

```ts
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));
```

### LLM Structure Validation

Don't test LLM output content. Validate the structure to identify LLM faults:

```ts
import { z } from "zod";

const QuestionSchema = z.object({
  question: z.string().min(1),
  type: z.enum(["open", "choice"]),
  options: z.array(z.string()).optional(),
});

it("LLM returns valid question structure", () => {
  const result = QuestionSchema.safeParse(llmResponse);
  expect(result.success).toBe(true);
});
```

If validation fails, the error points to the LLM response, not application code.

## CI Pipeline

**File:** `.github/workflows/ci.yml`

Runs on every push to `main` and every PR targeting `main`:

1. Checkout → Node 20 → `npm ci`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`

CI does not run E2E tests (no browser/credentials in CI). E2E tests run locally via agent-browser.

## Limitations

- **Convex tests** require mocking `ctx` — no official test harness
- **E2E in CI** not supported yet — agent-browser needs live servers + credentials
- **LLM tests** can only validate structure, not content (non-deterministic)
- **OAuth flows** (Clerk, GitHub) need real browser redirects — E2E only
