# Full Pipeline E2E Test

Test the ENTIRE Shipright pipeline end-to-end: landing → sign in → interview → template matching → GitHub repo → scaffolding injection → populated repo. Do NOT stop until a project completes successfully with a fully scaffolded GitHub repo.

## Setup

1. Run `npm run dev` and `npx convex dev` (if not already running)
2. Load skills: `e2e-testing`, `scaffolding-generation`, `daytona-sandbox`, `interview-flow`, `template-matching`, `github-integration`
3. Use `agent-browser` for all browser interactions
4. Use `gh` CLI for all GitHub verification — the same GH account is authenticated locally. Prefer `gh repo view`, `gh api`, and cloning over opening GitHub URLs in the browser.

## Test Flow

### Step 1: Landing + Auth
- Open http://localhost:3000
- Verify landing page loads (hero, CTA)
- Sign in with test credentials: username `seanchiuai`, password `admin`
- Verify redirect to dashboard

### Step 2: New Project → Interview
- Click "New Project" from dashboard
- Enter a test app idea: "A recipe sharing platform where home cooks can upload recipes with photos, rate each other's dishes, and create weekly meal plans"
- Complete the full AI interview conversation (answer all questions naturally)
- When summary appears, verify requirements look correct
- Click "Build My App"

### Step 3: Template Matching + GitHub Repo
- Verify template match appears on dashboard with confidence score
- Verify "What's included" and "What will be built" sections display
- Verify GitHub repo is created (URL appears on dashboard)
- Use `gh repo view <owner/repo>` to confirm the repo exists
- Use `gh api repos/<owner/repo>/commits` to confirm initial commit with template files

### Step 4: Scaffolding Pipeline
- Verify PRD generation starts (pipeline status updates)
- Verify tech stack research completes
- If tech stack choices are presented, select options and submit
- Verify Daytona sandbox spins up
- Verify cc-template files are injected
- Verify Claude Code fills all {{PLACEHOLDER}} templates
- Verify scaffolding is committed and pushed to GitHub repo
- Verify sandbox is destroyed

### Step 5: Verify Final Repo
- Clone the repo locally: `gh repo clone <owner/repo> /tmp/<repo-name>`
- Or use `gh api repos/<owner/repo>/contents/<path>` to check files via API
- Verify these files exist and are populated (not placeholders):
  - `CLAUDE.md` — contains project-specific overview, tech stack, commands
  - `TASKS.md` — contains sprint tasks and backlog from requirements
  - `docs/PRD.md` — contains user stories derived from interview
  - `docs/design.md` — contains UI specs
  - `docs/development-progress.yaml` — contains phase tracking
  - `.claude/skills/` — contains domain-specific skills
  - `prompts/` — contains phase prompt files
- Verify NO file contains raw `{{PLACEHOLDER}}` text (if cloned: `grep -r '{{PLACEHOLDER}}' /tmp/<repo-name>`)

### Step 6: Verify Dashboard State
- Return to Shipright dashboard
- Verify project shows as complete
- Verify GitHub repo link is clickable and correct

## On Failure

- Capture `agent-browser errors` and `agent-browser console`
- Take screenshot: `agent-browser screenshot`
- Check Convex logs: use `convex/logs` MCP tool
- Identify root cause, fix the bug, commit the fix
- Start the test flow over from the beginning

## Success Criteria

ALL of the following must be true:
- User can sign in and start a new project
- Interview completes and produces valid requirements
- Template matching returns a result with confidence score
- GitHub repo is created with template files
- Scaffolding pipeline completes without errors
- All generated files (CLAUDE.md, TASKS.md, PRD.md, design.md, skills/, prompts/) contain real project-specific content, not placeholders
- Dashboard shows completed project with valid GitHub URL

Do NOT stop iterating until all success criteria pass. Fix bugs as you find them.

<promise>FULL PIPELINE TEST PASSED</promise>
