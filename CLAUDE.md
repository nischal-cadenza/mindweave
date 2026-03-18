# MindWeave — Thought-Partner Chatbot with Live Knowledge Graph

## What This Is

A split-panel web app: left side is a GPT-4o-powered thought-partner chatbot that applies mental models (First Principles, MECE, Inversion, Second-Order Thinking, Socratic Method); right side is a real-time knowledge graph built from the conversation using Graphiti + Neo4j, visualized with react-force-graph-2d. Conversations export to Markdown and commit to GitHub.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Python 3.12 + FastAPI + Uvicorn
- **Knowledge Graph:** Graphiti (getzep/graphiti) + Neo4j 5.x
- **LLM:** OpenAI GPT-4o (chat + entity extraction)
- **Graph Viz:** react-force-graph-2d
- **Real-time:** WebSockets (FastAPI native)
- **Infra:** Docker Compose (3 services: frontend, backend, neo4j)
- **Package Mgmt:** uv (backend), npm (frontend)

## Directory Structure

```
mindweave/
├── CLAUDE.md
├── SPEC.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── app/
│       ├── main.py              # FastAPI app, CORS, lifespan, WebSocket manager
│       ├── core/
│       │   ├── config.py        # Pydantic Settings from env vars
│       │   └── ws_manager.py    # WebSocket connection manager + broadcast
│       ├── api/v1/
│       │   ├── chat.py          # POST /api/v1/chat — send message, get response + graph delta
│       │   ├── graph.py         # GET /api/v1/graph — full graph state
│       │   ├── export.py        # POST /api/v1/export — conversation to markdown
│       │   └── ws.py            # WebSocket /ws — real-time graph updates
│       ├── services/
│       │   ├── chat_service.py      # Orchestrates GPT-4o chat + Graphiti episode ingestion
│       │   ├── graphiti_service.py  # Graphiti client init, add_episode, search, get_graph
│       │   └── export_service.py    # Markdown generation + optional GitHub commit
│       ├── models/
│       │   ├── schemas.py       # Pydantic: ChatMessage, GraphNode, GraphEdge, GraphDelta
│       │   └── frameworks.py    # Mental model definitions + detection logic
│       └── prompts/
│           └── system.py        # System prompt with mental model instructions
│   └── tests/
│       ├── test_chat.py
│       └── test_graph.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Split-panel layout: ChatPanel | GraphCanvas
│       ├── components/
│       │   ├── ChatPanel.tsx        # Message list + input + framework indicator
│       │   ├── GraphCanvas.tsx      # react-force-graph-2d wrapper
│       │   ├── MessageBubble.tsx    # Single chat message
│       │   ├── FrameworkBadge.tsx   # Shows active mental model
│       │   └── ExportButton.tsx     # Trigger markdown export
│       ├── hooks/
│       │   ├── useChat.ts           # Chat state + API calls
│       │   ├── useWebSocket.ts      # WS connection + reconnect logic
│       │   └── useGraphData.ts      # Graph state from WS deltas
│       ├── api/
│       │   └── client.ts            # Axios/fetch wrapper
│       └── types/
│           └── index.ts             # Shared TypeScript types
└── docs/
    ├── ARCHITECTURE.md
    └── FRAMEWORKS.md
```

## Build & Run Commands

```bash
# Start everything
docker compose up --build

# Backend only (dev)
cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend only (dev)
cd frontend && npm install && npm run dev

# Run backend tests
cd backend && uv run pytest

# Lint
cd backend && uv run ruff check .
cd frontend && npx eslint src/
```

## Key Conventions

- All API routes prefixed with `/api/v1/`
- WebSocket endpoint at `/ws`
- Environment variables in `.env` (never committed), `.env.example` as template
- Pydantic models for all request/response schemas
- Type hints everywhere in Python; strict TypeScript in frontend
- Each chat message creates a Graphiti episode; extraction is automatic
- Graph deltas broadcast via WebSocket after each episode ingestion
- Mental model detection runs server-side; framework name included in chat response

## Common Gotchas

- Neo4j needs APOC plugin enabled — set `NEO4J_PLUGINS=["apoc"]` in docker-compose
- Graphiti requires `await graphiti.build_indices_and_constraints()` on startup
- Vite in Docker needs `server.host: true` and `watch.usePolling: true`
- Use `uvicorn[standard]` not bare `uvicorn` for WebSocket support
- react-force-graph-2d auto-reheats simulation on graphData prop change — no manual reheat needed

## For Architecture Decisions or Edge Cases

See `docs/ARCHITECTURE.md` for WebSocket protocol design and graph delta format.
See `docs/FRAMEWORKS.md` for mental model definitions and detection heuristics.
