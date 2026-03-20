# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A split-panel web app: left side is a thought-partner chatbot (OpenRouter LLM, currently Qwen3 Coder) that applies mental models (First Principles, MECE, Inversion, Second-Order Thinking, Socratic Method); right side is a real-time knowledge graph built from the conversation using Graphiti + Neo4j, visualized with react-force-graph-2d.

## Build & Run Commands

```bash
# Start everything (frontend :5173, backend :8000, neo4j :7474/:7687)
docker compose up --build

# Backend only (dev) — requires Neo4j running separately
cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend only (dev) — proxies /api and /ws to backend:8000
cd frontend && npm install && npm run dev

# Tests
cd backend && uv run pytest                    # all tests
cd backend && uv run pytest tests/test_chat.py # single file

# Lint
cd backend && uv run ruff check .
cd frontend && npx eslint src/
```

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Python 3.12 + FastAPI + Uvicorn
- **Knowledge Graph:** Graphiti (getzep/graphiti) + Neo4j 5.x community
- **LLM:** OpenRouter (configurable model via `LLM_MODEL` env var, default `qwen/qwen3-coder`)
- **Graph Viz:** react-force-graph-2d
- **Real-time:** WebSockets (FastAPI native, server-push only)
- **Infra:** Docker Compose (3 services: frontend, backend, neo4j)
- **Package Mgmt:** uv (backend), npm (frontend)

## Architecture

### Data Flow: Chat Message → Graph Update

1. Frontend `POST /api/v1/chat` with `{ message, conversation_id }`
2. `chat.py` → `chat_service.process_message()` detects framework, calls OpenRouter LLM
3. `chat.py` ingests both user + assistant messages as Graphiti episodes via `graphiti_service.add_episode()`
4. Graphiti auto-extracts entities/relationships via LLM, stores in Neo4j as `Entity` nodes and `RELATES_TO` edges
5. Both episode results merge into a `GraphDelta` (nodes + edges)
6. Backend broadcasts delta to all WebSocket clients via `ws_manager.broadcast()`
7. HTTP response also includes `graph_delta` as fallback (dual delivery for reliability)
8. Frontend `useGraphData.mergeDelta()` deduplicates and merges into graph state
9. `react-force-graph-2d` auto-reheats simulation on prop change

### Service Singletons

Three singleton services instantiated at module level, imported across the app:
- **`chat_service`** (`services/chat_service.py`) — in-memory conversation history, LLM calls via `openai` client pointed at OpenRouter
- **`graphiti_service`** (`services/graphiti_service.py`) — Graphiti client with explicit `OpenAIGenericClient` + `OpenAIEmbedder` both configured for OpenRouter
- **`ws_manager`** (`main.py`) — ConnectionManager broadcasting graph deltas to all WebSocket clients

### Graceful Degradation

The app is designed to work partially when services are unavailable:
- If Graphiti/Neo4j init fails at startup → warning logged, chat still works, graph stays empty
- If `add_episode()` fails per-message → empty `GraphDelta` returned, chat response still delivered
- Error codes: 503 (missing/invalid API key), 502 (LLM API error), 404 (conversation not found)

### Mental Model Framework Detection

`models/frameworks.py` uses priority-ordered keyword matching to detect which mental model to apply. Socratic is always the base layer. The detected framework name determines which additional system prompt instructions are concatenated in `prompts/system.py` via `build_system_prompt(framework)`.

Priority order: Inversion → Second-Order → MECE → First Principles → Socratic (fallback)

### Frontend Hook Architecture

- **`useChat`** — conversation state, sends messages, receives `graph_delta` from HTTP response and passes to `mergeDelta` callback
- **`useWebSocket`** — connects to `/ws`, exponential backoff reconnect (1s→30s max), receives broadcast graph deltas
- **`useGraphData`** — maintains merged graph state, deduplicates nodes by ID and edges by source-target-label key

Both `useChat` (HTTP response) and `useWebSocket` (broadcast) feed into `useGraphData.mergeDelta()` — dual sources for reliability.

## Key Conventions

- All API routes prefixed with `/api/v1/`; WebSocket at `/ws`
- Pydantic models for all request/response schemas (`models/schemas.py`)
- Environment variables via Pydantic Settings (`core/config.py`), template in `.env.example`
- Each chat message creates a Graphiti episode; entity extraction is automatic
- Framework name included in chat response for frontend badge display
- Vite proxies `/api` → `http://backend:8000` and `/ws` → `ws://backend:8000` (see `vite.config.ts`)

## Common Gotchas

- Neo4j needs APOC plugin — set `NEO4J_PLUGINS=["apoc"]` in docker-compose
- Graphiti requires `await graphiti.build_indices_and_constraints()` on startup (done in `main.py` lifespan)
- Graphiti's LLM client and embedder must be explicitly configured for OpenRouter — default constructor looks for `OPENAI_API_KEY` which doesn't exist
- Vite in Docker needs `server.host: true` and `watch.usePolling: true`
- Use `uvicorn[standard]` not bare `uvicorn` for WebSocket support
- Conversations are stored in-memory only (no persistence across restarts in V1)
- The `openai` Python package is used as the HTTP client (OpenRouter is OpenAI-compatible)
- If OpenRouter doesn't support embedding endpoints, the embedder in `graphiti_service.py` needs to be swapped to a dedicated provider

## Project Tracking

- `progress.md` — development phases and milestones
- `decision.md` — architectural decision log (update when making design choices)
- `docs/ARCHITECTURE.md` — WebSocket protocol, graph delta format, system design
- `docs/FRAMEWORKS.md` — mental model definitions and detection heuristics
