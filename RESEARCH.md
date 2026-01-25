# Research — Shipright

## 2026-01-14 — Gemini CLI vs Codex CLI (open-source)

Sources:
- https://github.com/google-gemini/gemini-cli
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/README.md
- https://github.com/microsoft/Codex-CLI
- https://raw.githubusercontent.com/microsoft/Codex-CLI/main/README.md

Gemini CLI (google-gemini/gemini-cli)
Pros:
- Open source, Apache-2.0 license
- Free tier via Google login: 60 req/min, 1,000 req/day
- Gemini 2.5 Pro, 1M token context window
- Built-in tools: Google Search grounding, file ops, shell commands, web fetching
- MCP support for custom integrations
- Custom context files (GEMINI.md), conversation checkpointing
- GitHub Action integration for PR/issue automation

Cons:
- Auth requires Google login or Gemini API key
- Node.js 20+ requirement
- README only mentions Gemini models (no multi-provider support called out)

Codex CLI (microsoft/Codex-CLI)
Pros:
- Open source, MIT license
- Cross-shell NL -> command suggestions (PowerShell, zsh, bash)
- Multi-turn mode with local context file support
- Python 3.7+ tooling, simple footprint

Cons:
- Stated as demo repo for Microsoft Build 2022, not intended as product
- Uses GPT-3 Codex engines (code-davinci-002/code-cushman-001), old API era
- Requires OpenAI API key + org id + engine id
- Scope is NL -> shell translation; no tool system/MCP or codebase ops noted

Implication for Shipright backend work
- If we later need a CLI agent, Gemini CLI is more modern + tool-capable
- Codex CLI is narrower, older, likely more maintenance burden

## 2026-01-14 — Large-task planning/execution patterns (agent frameworks)

Sources:
- https://raw.githubusercontent.com/geekan/MetaGPT/master/README.md
- https://raw.githubusercontent.com/joaomdmoura/crewAI/main/README.md
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/tasks.mdx
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/planning.mdx
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/flows.mdx
- https://raw.githubusercontent.com/langchain-ai/langgraph/main/README.md
- https://raw.githubusercontent.com/princeton-nlp/SWE-agent/main/README.md
- https://raw.githubusercontent.com/gpt-engineer-org/gpt-engineer/main/README.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/README.md
- https://ai.google.dev/gemini-api/docs/gemini-3
- https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/confirmation-mode.mdx

MetaGPT
- Inputs a one-line requirement and outputs structured artifacts: user stories, requirements, data structures, APIs, docs.
- Uses role-based SOPs (PM/architect/PM/engineer) to partition outputs.
Implication: Phase 3 should emit multiple explicit artifacts, not one blob.

CrewAI
- Tasks have explicit attributes: description, expected_output, tools, context (depends-on), output_file, human_input.
- Supports sequential vs hierarchical execution (manager coordinating tasks).
Implication: Plan should encode dependencies, expected outputs, tool constraints, and human review gates.

CrewAI Planning + Flows
- Planning can prepend step-by-step plans to each task before execution.
- Flows provide event-driven workflows with state management and conditional control flow.
Implication: Orchestrator should be a state machine with event log + ability to replan per chunk.

LangGraph
- Orchestration framework for long-running, stateful agents.
Implication: Phase 4 needs explicit state + resumability, not a single-run script.

SWE-agent
- LLM uses tools to autonomously fix real GitHub issues.
Implication: Task units should be issue-sized with verifiable tests.

gpt-engineer
- Natural language spec -> AI writes/executes code, then iterates on improvements.
Implication: Spec quality + iteration loop matters; plan should encode test/verify gates.

Gemini CLI
- Supports model selection and structured JSON output for scripting.
Implication: If used as engine, plan files should be machine-readable and parseable.

OpenHands Confirmation Mode
- Confirmation mode gates risky actions; analyzers can require human approval.
Implication: Add safety gates in build phase for high-risk steps (deletes, rewrites).

Gemini 3 models
- Docs reference `gemini-3-pro-preview` and `gemini-3-flash-preview`.
Implication: MVP can target preview models, but availability must be validated in CLI/API.

## 2026-01-14 — Chunk sizing rules (research + proposal)

Sources:
- https://raw.githubusercontent.com/princeton-nlp/SWE-agent/main/README.md
- https://raw.githubusercontent.com/geekan/MetaGPT/master/README.md
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/tasks.mdx
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/planning.mdx
- https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/en/concepts/flows.mdx
- https://raw.githubusercontent.com/langchain-ai/langgraph/main/README.md
- https://raw.githubusercontent.com/gpt-engineer-org/gpt-engineer/main/README.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/README.md

What the sources imply:
- SWE-agent targets GitHub issues; implies issue-sized tasks with verifiable changes.
- MetaGPT outputs user stories, APIs, data structures; implies decomposition into discrete artifacts.
- CrewAI tasks specify description, expected_output, tools, context, output_file; implies one deliverable per task with dependencies.
- CrewAI planning/flows add step-by-step plans and event-driven state; implies smaller tasks for replan/resume.
- LangGraph is for long-running, stateful agents; implies checkpointed, resumable chunks.
- gpt-engineer iterates on improvements; implies each iteration should be scoped.
- Gemini CLI supports JSON output; implies machine-readable, self-contained chunk specs.

Shipright chunk sizing proposal (derived):
- One chunk = one deliverable artifact (schema change OR API endpoint OR CLI command OR UI route).
- Hard caps: <=5 files touched, <=1 new dependency, <=2 commands, <=1 test suite.
- Soft cap: <=300 LOC changed; split if exceeded.
- Each chunk must include expected_output + tests + output_files + rollback note.
- Sequential only (no parallel chunks).

## 2026-01-14 — Package manager options (assume Node/TS CLI)

Sources:
- https://pnpm.io/
- https://docs.npmjs.com/
- https://yarnpkg.com/

pnpm
- Fast installs + disk dedupe via content-addressable store.
- Strict node_modules layout catches undeclared deps (good for AI codegen).
- Strong workspace support for multi-package CLI + templates.

npm
- Default for Node; max compatibility with tooling and native deps.
- No extra install step; works everywhere (CI, dev, agents).
- Simpler mental model; fewer edge cases than PnP.

yarn (Berry, node-modules linker)
- Mature workspace tooling and constraints.
- Can avoid PnP while keeping Yarn ergonomics.
- Slightly heavier config burden vs npm/pnpm.

Implication for Shipright
- If we go Node/TS, pnpm is best default for speed + workspace hygiene; npm is the safe fallback if tooling friction shows up.
