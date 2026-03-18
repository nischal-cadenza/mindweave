# MindWeave Architecture

## System Overview

```
┌─────────────┐    HTTP/WS     ┌──────────────┐    Bolt    ┌─────────┐
│   React +   │ ◄────────────► │   FastAPI +   │ ◄────────► │  Neo4j  │
│   Vite      │   :5173→:8000  │   Graphiti    │   :7687    │  5.x    │
│             │                │              │            │         │
│ ForceGraph  │   WebSocket    │   OpenAI     │            │  APOC   │
│ 2D          │ ◄──────────── │   GPT-4o     │            │         │
└─────────────┘   graph delta  └──────────────┘            └─────────┘
```

## Data Flow: Chat Message → Graph Update

1. User sends message via ChatPanel → POST /api/v1/chat
2. Backend detects applicable mental model from keywords
3. Backend calls OpenAI GPT-4o with conversation history + system prompt
4. GPT-4o returns thought-partner response
5. User message ingested as Graphiti episode (source: "user")
6. AI response ingested as Graphiti episode (source: "assistant")
7. Graphiti automatically:
   a. Extracts entities (Person, Concept, Project, Tool, Event)
   b. Extracts relationships (INTERESTED_IN, USES, RELATES_TO, etc.)
   c. Resolves against existing graph (dedup via embedding similarity)
   d. Updates Neo4j with new/modified nodes and edges
8. Backend queries for new graph additions since last update
9. Backend broadcasts GraphDelta via WebSocket to all connected clients
10. Frontend merges delta into graphData state
11. react-force-graph-2d auto-animates new nodes into the visualization

## WebSocket Protocol

### Client → Server
No client-to-server messages in V1. WebSocket is server-push only.

### Server → Client
```json
{
  "type": "graph_delta",
  "data": {
    "nodes": [
      { "id": "entity-123", "label": "Machine Learning", "type": "Concept", "properties": {} }
    ],
    "edges": [
      { "source": "user", "target": "entity-123", "label": "INTERESTED_IN", "properties": {} }
    ]
  }
}
```

## Graph Delta Strategy

After each Graphiti episode ingestion, the backend:
1. Records a timestamp before ingestion
2. Ingests the episode
3. Queries Neo4j for nodes/edges created after the timestamp
4. Packages these as a GraphDelta
5. Broadcasts via WebSocket

This avoids maintaining a separate change log — Neo4j's `created_at` timestamps (set by Graphiti) are the source of truth.

## Mental Model Detection

Keyword-based detection with priority ordering:
1. Check for Inversion keywords first (most specific)
2. Check for Second-Order Thinking
3. Check for MECE
4. Check for First Principles
5. Default to Socratic Method (always active as base layer)

Only one framework is "active" per message, but Socratic questioning is always layered underneath.

## Conversation Storage (V1)

In-memory dict keyed by conversation_id:
```python
conversations: dict[str, list[ChatMessage]] = {}
```

No persistence in V1. Refresh = new conversation. Export to Markdown before clearing.
