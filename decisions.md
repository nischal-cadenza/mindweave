# MindWeave — Architectural Decisions

## 2026-03-17

### 1. Graphiti initialization uses default OpenAI client
Graphiti auto-creates its own OpenAI client from the `OPENAI_API_KEY` env var. We don't pass a custom LLM client — simpler setup, same API key for chat and entity extraction.

### 2. Graph delta from both HTTP and WebSocket
The chat API response includes `graph_delta` as a field, AND the same delta is broadcast via WebSocket. The frontend merges from both sources with deduplication. This ensures the graph updates even if WebSocket is temporarily disconnected.

### 3. In-memory conversations (no persistence)
V1 uses a simple dict keyed by conversation_id. No database, no session storage. Refresh = new conversation. Export to Markdown before clearing.

### 4. Framework detection is keyword-based with priority
Inversion > Second-Order > MECE > First Principles > Socratic (default). First match wins. Simple and predictable — no ML needed for V1.

### 5. Neo4j query for full graph uses Entity/RELATES_TO
`get_full_graph()` queries `MATCH (n:Entity)` for nodes and `MATCH (s:Entity)-[r:RELATES_TO]->(t:Entity)` for edges. This matches Graphiti's internal schema.

### 6. WebSocket is server-push only
No client-to-server messages in V1. WS is used solely for broadcasting graph deltas to all connected clients.

### 7. Frontend uses fetch (not axios)
Despite axios being in package.json, the API client uses native fetch for zero-dependency simplicity. Axios can be removed from deps in a future cleanup.
