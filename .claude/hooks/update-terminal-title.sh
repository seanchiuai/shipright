#!/bin/bash

# Read JSON from stdin
input=$(cat)

# Extract prompt using python for reliable JSON parsing
prompt=$(echo "$input" | python3 -c "
import json
import sys
data = json.load(sys.stdin)
prompt = data.get('prompt', '')
# Get first 40 chars, strip whitespace, replace newlines
title = prompt[:40].strip().replace('\n', ' ')
print(title)
" 2>/dev/null)

# Fallback if python fails
if [ -z "$prompt" ]; then
  prompt="Claude Code"
fi

# Update terminal title
echo -ne "\033]0;CC: $prompt\007" >&2

exit 0
