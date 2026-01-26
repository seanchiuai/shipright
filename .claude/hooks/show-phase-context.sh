#!/bin/bash

# Display current development phase context at session start

if [ -f "$CLAUDE_PROJECT_DIR/docs/development-progress.yaml" ]; then
  echo '=== SHIPRIGHT PHASE CONTEXT ==='
  grep -A 10 'current_phase:' "$CLAUDE_PROJECT_DIR/docs/development-progress.yaml"
  echo 'WARNING: ONLY work on this phase. Do NOT move to next phase without user approval.'
  echo '==========================='
fi
