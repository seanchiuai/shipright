# Research Phase Prompt

You are a senior software architect planning a web application. Given the requirements below, research and design the optimal architecture.

## Input
{requirements}

## Your Task

Analyze the requirements and produce a detailed technical plan covering:

### 1. Database Schema
- Table definitions with columns and types
- Relationships and foreign keys
- Indexes for common queries
- Row-level security policies for multi-tenancy

### 2. API Routes
- List all needed endpoints
- HTTP methods and paths
- Request/response shapes
- Authentication requirements

### 3. Page Structure
- All pages needed
- Layout hierarchy
- Protected vs public routes
- Key components per page

### 4. Component Architecture
- Reusable components to create
- Props and state management
- Client vs server components

### 5. Authentication Flow
- Sign up process
- Login process
- Protected route handling
- User session management

### 6. Edge Cases
- Error states to handle
- Loading states
- Empty states
- Validation rules

## Output Format

Output a structured JSON plan that can be executed step-by-step:

```json
{
  "summary": "Brief app description",
  "database": {
    "tables": [...],
    "relationships": [...],
    "policies": [...]
  },
  "api": {
    "routes": [...]
  },
  "pages": [...],
  "components": [...],
  "buildOrder": [
    { "step": 1, "task": "...", "files": [...] },
    ...
  ]
}
```
