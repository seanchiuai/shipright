---
name: daytona-sandbox
description: Daytona SDK for sandboxed environments and Claude Code execution for template customization
---

# Daytona Sandbox

Used in Phase 5 when templates don't fully cover user requirements.

## When to Use

- Template match confidence is 50-70% (decent but has gaps)
- User requirements include features not in any template
- Need to build custom code on top of template

## When NOT to Use

- Template is a perfect match (>70% confidence)
- User explicitly wants to build themselves
- Requirements are minimal (just scaffold and done)

## Where It Fits

**Phase 5**: After GitHub repo created with template, before scaffolding generation.

## The Flow

1. GitHub repo already created (Phase 4) with template cloned
2. Spin up Daytona sandbox with TypeScript runtime
3. Clone the user's repo into sandbox
4. Run Claude Code with customization prompts
5. Claude Code builds the missing features
6. Commit and push changes back to GitHub
7. **Parse build summary** from Claude Code output
8. Save build summary to Convex (critical for Phase 6 scaffolding)
9. Destroy sandbox

## Build Summary Format

Claude Code outputs a structured summary of what was built:

```
---BUILD_SUMMARY---
Features built:
- Feature 1 description
- Feature 2 description

Files created:
- path/to/file1.ts
- path/to/file2.tsx

Patterns used:
- Pattern 1
- Pattern 2
---END_SUMMARY---
```

This summary tells Phase 6 scaffolding generation exactly what was built.

## Cost Considerations

- Sandboxes cost money per minute of runtime
- Set `autoStopInterval` to prevent runaway costs
- Destroy sandbox immediately after use
- Consider using `ephemeral: true` for auto-cleanup

## Reference Files

- [reference.md](reference.md) - Complete Daytona SDK usage, code examples

## External Documentation

- [Daytona SDK](https://github.com/daytonaio/daytona)
- Use Context7 MCP to fetch current Daytona docs
