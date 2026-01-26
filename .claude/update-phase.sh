#!/bin/bash

# Shipright Phase Updater
# Usage: ./.claude/update-phase.sh <phase-number>

PHASE=$1
PROGRESS_FILE="docs/development-progress.yaml"

if [ -z "$PHASE" ]; then
  echo "Current phase:"
  echo ""
  grep -A 10 'current_phase:' "$PROGRESS_FILE"
  echo ""
  echo "Usage: ./.claude/update-phase.sh <phase-number>"
  echo ""
  echo "Available phases:"
  echo "  1 - UI + Authentication"
  echo "  2 - Interview Flow"
  echo "  3 - Template Matching"
  echo "  4 - GitHub Repo Creation"
  echo "  5 - Template Customization"
  echo "  6 - Scaffolding Generation"
  echo "  7 - Production Deployment"
  exit 0
fi

# Validate phase number
if [ "$PHASE" -lt 1 ] || [ "$PHASE" -gt 7 ]; then
  echo "Invalid phase number. Use 1-7."
  exit 1
fi

# Define phase details
case $PHASE in
  1)
    PHASE_NAME="UI + Authentication"
    PHASE_DESC="Landing page, Google OAuth, dashboard shell"
    CRITERIA='    - "Landing page is live and styled"
    - "Google OAuth login works"
    - "Dashboard shell renders after login"
    - "User can log out"'
    ;;
  2)
    PHASE_NAME="Interview Flow"
    PHASE_DESC="AI-guided questions, interactive experience"
    CRITERIA='    - "Questions generate dynamically based on user answers"
    - "Users can navigate back/forward through questions"
    - "Interview state persists in Convex"
    - "Interview completes and extracts requirements"'
    ;;
  3)
    PHASE_NAME="Template Matching"
    PHASE_DESC="Requirements extraction, scoring algorithm"
    CRITERIA='    - "Requirements extracted from interview answers"
    - "Template scoring algorithm implemented"
    - "Best template match displayed to user"
    - "User can see why template was chosen"'
    ;;
  4)
    PHASE_NAME="GitHub Repo Creation"
    PHASE_DESC="OAuth connection, repo from template"
    CRITERIA='    - "GitHub OAuth connection works"
    - "User can authorize repo creation"
    - "Repo created from selected template"
    - "Success confirmation shown to user"'
    ;;
  5)
    PHASE_NAME="Template Customization"
    PHASE_DESC="Daytona sandbox + Claude Code execution"
    CRITERIA='    - "Daytona workspace launches with template"
    - "Claude Code executes customization plan"
    - "Changes committed back to user'\''s repo"
    - "User can see customization progress"'
    ;;
  6)
    PHASE_NAME="Scaffolding Generation"
    PHASE_DESC="Generate CLAUDE.md, TASKS.md, PRD.md, skills"
    CRITERIA='    - "CLAUDE.md generated with project context"
    - "TASKS.md created with initial backlog"
    - "PRD.md generated from requirements"
    - "Project-specific skills created if needed"'
    ;;
  7)
    PHASE_NAME="Production Deployment"
    PHASE_DESC="Deploy to Vercel, configure environment"
    CRITERIA='    - "Vercel deployment configured"
    - "Environment variables set"
    - "Production URL live"
    - "User can access deployed app"'
    ;;
esac

# Read current phase info to preserve history
CURRENT_PHASE=$(grep -A 1 "current_phase:" "$PROGRESS_FILE" | grep "phase:" | awk '{print $2}')
COMPLETED_SECTION=$(sed -n '/^completed_phases:/,/^$/p' "$PROGRESS_FILE")

# Update the YAML file
cat > "$PROGRESS_FILE" <<EOF
# Shipright Development Progress Tracker
# This file tracks which phase of development is currently active

current_phase:
  phase: $PHASE
  name: "$PHASE_NAME"
  description: "$PHASE_DESC"
  started: "$(date +%Y-%m-%d)"
  status: "in-progress"
  completion_criteria:
$CRITERIA

# Phase History
completed_phases: []

# All Available Phases
phases:
  1:
    name: "UI + Authentication"
    description: "Landing page, Google OAuth, dashboard shell"
    key_deliverables:
      - "Landing page with hero section"
      - "Google OAuth integration via Convex"
      - "Protected dashboard route"
      - "Logout functionality"

  2:
    name: "Interview Flow"
    description: "AI-guided questions, interactive experience"
    key_deliverables:
      - "Dynamic question generation via Claude API"
      - "Interview navigation (back/forward)"
      - "State persistence in Convex"
      - "Requirements extraction"

  3:
    name: "Template Matching"
    description: "Requirements extraction, scoring algorithm"
    key_deliverables:
      - "Template scoring algorithm"
      - "Template index/catalog"
      - "Match explanation UI"
      - "Template preview"

  4:
    name: "GitHub Repo Creation"
    description: "OAuth connection, repo from template"
    key_deliverables:
      - "GitHub OAuth flow"
      - "Repo creation from template"
      - "User confirmation/authorization"
      - "Success confirmation page"

  5:
    name: "Template Customization"
    description: "Daytona sandbox + Claude Code execution"
    key_deliverables:
      - "Daytona workspace integration"
      - "Claude Code execution in sandbox"
      - "Customization plan generation"
      - "Changes committed to user repo"

  6:
    name: "Scaffolding Generation"
    description: "Generate CLAUDE.md, TASKS.md, PRD.md, skills"
    key_deliverables:
      - "CLAUDE.md generation"
      - "TASKS.md generation"
      - "PRD.md generation"
      - "Project-specific skills"

  7:
    name: "Production Deployment"
    description: "Deploy to Vercel, configure environment"
    key_deliverables:
      - "Vercel deployment setup"
      - "Environment configuration"
      - "Production URL"
      - "Post-deployment verification"
EOF

echo "✓ Updated to Phase $PHASE: $PHASE_NAME"
echo ""
grep -A 10 'current_phase:' "$PROGRESS_FILE"
