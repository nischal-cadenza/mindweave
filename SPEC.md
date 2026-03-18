# MindWeave — Product Specification

## Overview

MindWeave is a thought-partner chatbot application with real-time knowledge graph visualization. The interface is a split-panel layout: the left panel is a conversational AI powered by OpenAI GPT-4o that helps users think through problems using mental models and strategic frameworks; the right panel is a live knowledge graph that automatically constructs itself from the conversation, showing entities, relationships, and how ideas connect.

## Core User Flow

1. User opens the app → sees split panel: empty chat (left) + empty graph (right)
2. User types a message → backend sends it to GPT-4o with system prompt containing mental model instructions
3. GPT-4o responds with a thought-partner reply (asking probing questions, applying frameworks)
4. Simultaneously, both the user message and AI response are ingested as Graphiti episodes
5. Graphiti automatically extracts entities and relationships via LLM
6. Backend broadcasts the graph delta (new nodes + edges) via WebSocket
7. Frontend animates new nodes/edges into the force-directed graph in real-time
8. User can click nodes to see context, hover for details
9. User can export the full conversation as a Markdown file at any time

## Technical Architecture

### Backend (FastAPI + Python 3.12)

#### main.py — Application Entry
- FastAPI app with lifespan handler
- On startup: initialize Graphiti client, connect to Neo4j, build indices
- On shutdown: close Graphiti connection
- CORS middleware allowing frontend origin
- Mount API router and WebSocket endpoint

#### core/config.py — Configuration
```python
class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"
    github_token: str = ""  # Optional, for export
    github_repo: str = ""   # Optional, for export
    model_config = SettingsConfigDict(env_file=".env")
```

#### core/ws_manager.py — WebSocket Manager
```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket)
    def disconnect(self, websocket: WebSocket)
    async def broadcast(self, message: dict)  # Send graph delta to all clients
```

#### api/v1/chat.py — Chat Endpoint
```
POST /api/v1/chat
Request: { "message": str, "conversation_id": str }
Response: { "reply": str, "framework": str | null, "graph_delta": GraphDelta }
```
Flow:
1. Detect applicable mental model from user message
2. Build messages array with system prompt (including active framework instructions)
3. Call OpenAI GPT-4o chat completion
4. Ingest user message as Graphiti episode
5. Ingest AI response as Graphiti episode
6. Query Graphiti for new entities/relationships created
7. Broadcast graph delta via WebSocket
8. Return chat response + framework name + graph delta

#### api/v1/graph.py — Graph State Endpoint
```
GET /api/v1/graph
Response: { "nodes": [GraphNode], "edges": [GraphEdge] }
```
Returns the full current graph state for initial load or reconnection.

#### api/v1/export.py — Export Endpoint
```
POST /api/v1/export
Request: { "conversation_id": str, "commit_to_github": bool }
Response: { "markdown": str, "github_url": str | null }
```
Generates Markdown from conversation history. Optionally commits to GitHub using PyGithub.

#### api/v1/ws.py — WebSocket Endpoint
```
WS /ws
Messages sent to client: { "type": "graph_delta", "data": GraphDelta }
```

#### services/chat_service.py
- Maintains in-memory conversation history per conversation_id (dict of message lists)
- Calls OpenAI with full conversation context + system prompt
- System prompt includes: role as thought partner, active mental model instructions, instruction to ask probing questions

#### services/graphiti_service.py
- Initializes Graphiti client with Neo4j connection
- `add_episode(text, source_description)` — ingests text, returns extracted entities/relationships
- `get_full_graph()` — queries Neo4j for all nodes and edges, returns as GraphNode/GraphEdge lists
- `get_graph_delta(before_timestamp, after_timestamp)` — returns only new additions

#### services/export_service.py
- Formats conversation as Markdown with timestamps, speaker labels, and framework annotations
- Optional GitHub integration: creates/updates file in specified repo using PyGithub

#### models/schemas.py
```python
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    framework: str | None = None

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # Person, Concept, Project, Tool, Event, etc.
    properties: dict = {}

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    properties: dict = {}

class GraphDelta(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
```

#### models/frameworks.py
Mental model definitions with detection keywords and system prompt fragments:

1. **Socratic Method** (default/always-on): Ask clarifying questions, probe assumptions
   - Keywords: any question, "help me think", "what do you think"
   
2. **First Principles**: Decompose to fundamentals, rebuild from scratch
   - Keywords: "I'm stuck", "from scratch", "fundamental", "why does this work"
   
3. **MECE**: Ensure no overlap, no gaps in problem breakdown
   - Keywords: "break this down", "categorize", "organize", "structure"
   
4. **Second-Order Thinking**: Trace consequences of consequences
   - Keywords: "what happens if", "consequences", "ripple effect", "downstream"
   
5. **Inversion / Pre-mortem**: Imagine failure, work backwards
   - Keywords: "what could go wrong", "risks", "failure", "devil's advocate"

#### prompts/system.py
Base system prompt establishing the thought-partner role, plus per-framework instruction blocks that get appended when a framework is detected.

### Frontend (React 18 + TypeScript + Vite + Tailwind)

#### App.tsx — Root Layout
- Split panel: `flex` layout, left 50% chat, right 50% graph
- Resizable divider (CSS resize or a simple drag handle)
- Dark theme by default (graph visualization looks better on dark backgrounds)

#### components/ChatPanel.tsx
- Scrollable message list
- Input area at bottom with send button
- Shows FrameworkBadge when a mental model is active
- Auto-scrolls to latest message
- Loading indicator while waiting for AI response

#### components/GraphCanvas.tsx
- Wraps `ForceGraph2D` from `react-force-graph-2d`
- Props: graphData from useGraphData hook
- Node rendering: colored circles by type (Person=blue, Concept=green, Project=orange, Tool=purple, Event=red)
- Edge rendering: directional arrows with labels
- Interactions: zoom, pan, drag nodes, click node to see details, hover for tooltip
- New nodes animate in (react-force-graph handles this via simulation reheat)

#### components/MessageBubble.tsx
- User messages: right-aligned, accent color
- AI messages: left-aligned, neutral color
- Timestamp below each message
- Framework badge inline if framework was applied

#### components/FrameworkBadge.tsx
- Small pill/badge showing active framework name + icon
- Color-coded per framework

#### components/ExportButton.tsx
- Button in chat header area
- Click → calls export API → downloads .md file
- Optional: checkbox to also commit to GitHub

#### hooks/useChat.ts
```typescript
interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  isLoading: boolean
  activeFramework: string | null
  conversationId: string
}
```

#### hooks/useWebSocket.ts
```typescript
interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: GraphDelta | null
}
```
- Connects to `ws://localhost:8000/ws`
- Auto-reconnect with exponential backoff
- Parses incoming messages as GraphDelta

#### hooks/useGraphData.ts
```typescript
interface UseGraphDataReturn {
  graphData: { nodes: GraphNode[], links: GraphEdge[] }
  resetGraph: () => void
}
```
- Merges incoming deltas into cumulative graph state
- Deduplicates nodes by id
- Provides reset function for new conversations

#### types/index.ts
Shared TypeScript interfaces matching backend Pydantic models.

### Infrastructure

#### docker-compose.yml
Three services:
1. `frontend` — Node 20 Alpine, Vite dev server on port 5173
2. `backend` — Python 3.12 slim, FastAPI on port 8000
3. `neo4j` — Neo4j Community with APOC, ports 7474 (browser) + 7687 (bolt)

Volumes: neo4j_data for persistence
Networks: default bridge network (services reference each other by name)

#### .env.example
```
OPENAI_API_KEY=sk-...
NEO4J_PASSWORD=changeme
GITHUB_TOKEN=ghp_...        # Optional
GITHUB_REPO=user/mindweave  # Optional
```

## Implementation Order (for Claude Code)

Phase 1 — Scaffold + Infrastructure:
1. Create all directories and config files
2. docker-compose.yml with all 3 services
3. Backend Dockerfile + pyproject.toml with all dependencies
4. Frontend Dockerfile + package.json + vite.config.ts + tailwind.config.js
5. .env.example and .gitignore

Phase 2 — Backend Core:
1. config.py + Settings
2. ws_manager.py
3. main.py with lifespan, CORS, router mounts
4. graphiti_service.py — init, add_episode, get_full_graph
5. schemas.py — all Pydantic models
6. frameworks.py — mental model definitions
7. prompts/system.py — system prompt construction

Phase 3 — Backend API:
1. chat.py endpoint (full flow: detect framework → GPT-4o → Graphiti → broadcast)
2. graph.py endpoint
3. export.py endpoint
4. ws.py WebSocket endpoint

Phase 4 — Frontend Core:
1. types/index.ts
2. api/client.ts
3. hooks/useWebSocket.ts
4. hooks/useChat.ts
5. hooks/useGraphData.ts

Phase 5 — Frontend UI:
1. App.tsx — split panel layout
2. MessageBubble.tsx
3. ChatPanel.tsx
4. GraphCanvas.tsx
5. FrameworkBadge.tsx
6. ExportButton.tsx

Phase 6 — Integration + Polish:
1. Test full flow: message → GPT-4o → Graphiti → WebSocket → graph update
2. Add error handling and loading states
3. Add conversation reset functionality
4. Style polish with Tailwind

## Non-Goals (V1)

- Authentication / multi-user
- Persistent conversation storage (in-memory only for V1)
- Mobile-responsive layout
- Custom graph layouts (force-directed only)
- Voice input
- File upload / document analysis
