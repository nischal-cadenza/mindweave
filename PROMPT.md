# MindWeave — Claude Code CLI Prompt

## How to Use This

### Step 1: Create the GitHub repo
```bash
gh repo create mindweave --public --clone
cd mindweave
```

### Step 2: Copy the scaffold files into the repo
Copy these files from this package into your `mindweave/` directory:
- `CLAUDE.md`
- `SPEC.md`
- `docker-compose.yml`
- `.env.example`
- `.gitignore`

### Step 3: Create your .env
```bash
cp .env.example .env
# Edit .env and add your real OPENAI_API_KEY
```

### Step 4: Initial commit
```bash
git add -A
git commit -m "chore: initial scaffold with CLAUDE.md, SPEC.md, docker-compose"
git push origin main
```

### Step 5: Launch Claude Code CLI and paste this prompt

---

## THE PROMPT (copy everything below this line into Claude Code CLI)

```
Read CLAUDE.md and SPEC.md in this repo. These are your instructions and full specification.

Implement the MindWeave project exactly as described in SPEC.md, following the implementation order specified (Phase 1 through Phase 6). After completing each phase, make a git commit with a descriptive message before moving to the next phase.

Key requirements:
- Backend: Python 3.12 + FastAPI + Graphiti (graphiti-core) + OpenAI. Use `uv` for package management.
- Frontend: React 18 + TypeScript + Vite + TailwindCSS + react-force-graph-2d. Use npm.
- Infrastructure: docker-compose.yml is already provided. Create the Dockerfiles.
- Real-time: WebSocket connection from React to FastAPI for graph delta broadcasts.
- Each chat message must be ingested as a Graphiti episode. Graphiti handles entity/relationship extraction automatically.
- The graph visualization must update in real-time as new entities are extracted.
- Mental model detection must happen server-side based on keyword matching in the user's message.
- Export must generate clean Markdown with timestamps and framework annotations.

For the backend Dockerfile, use python:3.12-slim and install uv. For the frontend Dockerfile, use node:20-alpine.

For the Vite config, set server.host to true and server.watch.usePolling to true for Docker compatibility. Proxy /api to the backend service and /ws as a WebSocket proxy.

For Graphiti initialization, use the lifespan context manager in FastAPI. Call build_indices_and_constraints() on startup.

For the graph visualization, use ForceGraph2D with:
- Nodes colored by type (Person=blue, Concept=green, Project=orange, Tool=purple, Event=red)
- Directional arrows on edges
- Node labels visible
- Dark background (#0f172a)
- cooldownTicks=100 for smooth animation

For the system prompt, make the AI behave as a thought partner that:
- Defaults to Socratic questioning
- Detects when to apply specific frameworks (First Principles, MECE, Second-Order Thinking, Inversion)
- Never just answers — always asks at least one probing follow-up question
- Keeps responses concise (2-3 paragraphs max)

Start building now. Work through each phase, commit after each one. If you encounter an issue, fix it and continue.
```

---

## Alternative: Two-Session Approach (if the single prompt is too much)

### Session 1 — Backend
```
Read CLAUDE.md and SPEC.md. Implement Phases 1-3 (scaffold, backend core, backend API). Commit after each phase. Focus on getting the FastAPI server running with Graphiti integration and all endpoints working.
```

### Session 2 — Frontend
```
Read CLAUDE.md and SPEC.md. The backend is complete. Implement Phases 4-6 (frontend core, frontend UI, integration). Commit after each phase. Make sure the WebSocket connection works and the graph updates in real-time.
```
