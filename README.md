# MindWeave

A split-panel web app: **GPT-4o-powered thought-partner chatbot** (left) + **real-time knowledge graph** (right).

The chatbot applies mental models — First Principles, MECE, Inversion, Second-Order Thinking, and Socratic Method — to help you think through problems. Every conversation automatically builds a knowledge graph using Graphiti + Neo4j, visualized live with react-force-graph-2d. Conversations export to Markdown.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Knowledge Graph | Graphiti + Neo4j 5.x |
| LLM | OpenAI GPT-4o |
| Graph Viz | react-force-graph-2d |
| Real-time | WebSockets (FastAPI native) |
| Infra | Docker Compose |

## Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **OpenAI API key** — get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

For local development without Docker, you'll also need:
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+
- Neo4j 5.x

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/mindweave.git
cd mindweave

# 2. Set up environment variables
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

Open `.env` and set your API key:

```
OPENAI_API_KEY=sk-your-key-here
```

```bash
# 3. Start all services
docker compose up --build

# 4. Open the app
# http://localhost:5173
```

That's it. Docker Compose starts the frontend, backend, and Neo4j with all wiring handled automatically.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes** | — | Your OpenAI API key. Get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `NEO4J_PASSWORD` | No | `changeme` | Password for the Neo4j database. You define this yourself |
| `GITHUB_TOKEN` | No | — | GitHub personal access token for the export-to-GitHub feature |
| `GITHUB_REPO` | No | — | Target GitHub repo for exports, format: `user/repo` |

## Local Development (without Docker)

### Start Neo4j

Easiest option — run just Neo4j via Docker:

```bash
docker compose up neo4j
```

Or install Neo4j 5.x locally with the APOC plugin enabled.

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Make sure your `.env` has `NEO4J_URI=bolt://localhost:7687` for local Neo4j.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` and WebSocket at `ws://localhost:8000/ws`.

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 8000 | http://localhost:8000 |
| Neo4j Browser | 7474 | http://localhost:7474 |
| Neo4j Bolt | 7687 | bolt://localhost:7687 |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/chat` | Send message, get response + graph delta |
| GET | `/api/v1/graph` | Fetch full graph state |
| POST | `/api/v1/export` | Export conversation to Markdown |
| WS | `/ws` | Real-time graph updates |
| GET | `/health` | Health check |

## Project Structure

```
mindweave/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, lifespan, WebSocket
│       ├── core/                   # Config, WebSocket manager
│       ├── api/v1/                 # Route handlers (chat, graph, export, ws)
│       ├── services/               # Chat, Graphiti, export business logic
│       ├── models/                 # Pydantic schemas, mental model definitions
│       └── prompts/                # System prompt
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx                 # Split-panel layout
│       ├── components/             # ChatPanel, GraphCanvas, MessageBubble, etc.
│       ├── hooks/                  # useChat, useWebSocket, useGraphData
│       ├── api/                    # API client
│       └── types/                  # TypeScript types
└── docs/                           # Architecture & frameworks docs
```

## Testing & Linting

```bash
# Run backend tests
cd backend && uv run pytest

# Lint backend
cd backend && uv run ruff check .

# Lint frontend
cd frontend && npx eslint src/
```

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Neo4j won't start | Docker not running, or ports 7474/7687 in use | Start Docker, check for port conflicts |
| 503 on chat endpoint | `OPENAI_API_KEY` missing or invalid | Check `.env`, ensure key is valid |
| 502 on chat endpoint | OpenAI API issue | Check key quota/billing at [platform.openai.com](https://platform.openai.com) |
| Graph not updating | Neo4j connection failed | Check Neo4j logs: `docker compose logs neo4j` |
| Frontend can't reach backend | Backend not running or CORS issue | Ensure both services are up, check browser console |
| Neo4j health check failing | Neo4j still starting up | Wait 30-60s on first run (APOC plugin installs on first boot) |
