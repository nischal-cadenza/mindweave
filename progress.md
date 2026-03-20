# MindWeave — Progress

## 2026-03-17 — Initial Implementation

### Completed
- **Phase 1:** Project scaffold — Dockerfiles, pyproject.toml, package.json, Vite/Tailwind/TS config
- **Phase 2:** Backend core — config, WS manager, Pydantic schemas, framework detection, system prompts, Graphiti service, chat service, export service, FastAPI app with lifespan
- **Phase 3:** Backend API — POST /api/v1/chat, GET /api/v1/graph, POST /api/v1/export, WS /ws
- **Phase 4:** Frontend core — TypeScript types, API client (fetch), useWebSocket (auto-reconnect), useChat (conversation state), useGraphData (delta merging)
- **Phase 5:** Frontend UI — ChatPanel, GraphCanvas (react-force-graph-2d), MessageBubble, FrameworkBadge, ExportButton, split-panel App layout
- **Phase 6:** Integration polish — graph delta from HTTP response fallback, New Chat reset, connection indicator, loading animation

### Phase 7: Error Handling (500 fix)
- Added error handling around OpenAI calls in chat endpoint (503 for auth, 502 for other errors)
- Made Graphiti initialization graceful — app starts even if Neo4j is unavailable
- Fixed potential `NameError` on `combined_delta` when Graphiti ingestion fails

### Phase 8: README & Documentation
- Created comprehensive `README.md` with quick start, env var table, local dev instructions, API endpoints, project structure, troubleshooting

### Phase 9: Switch LLM to OpenRouter (Qwen3 Coder)
- Replaced GPT-4o/OpenAI with OpenRouter's `qwen/qwen3-coder` (free tier)
- Renamed `openai_api_key` → `openrouter_api_key` in config
- Added `openrouter_base_url` and `llm_model` settings for flexibility
- Updated error messages from "OpenAI" to "OpenRouter"/"LLM"
- Updated `.env.example` and `.env` with new env var name
- `openai` Python package retained as the HTTP client (OpenRouter is OpenAI-compatible)

### Phase 10: Fix Knowledge Graph — Graphiti LLM + Embedder for OpenRouter
- Configured Graphiti's LLM client (`OpenAIGenericClient`) and embedder (`OpenAIEmbedder`) to use OpenRouter credentials
- Previously Graphiti used default OpenAI client which required `OPENAI_API_KEY` — now uses `openrouter_api_key`, `openrouter_base_url`, and `llm_model` from settings
- Updated `graphiti_service.py` init to accept and wire up LLM/embedder configs
- Updated `main.py` lifespan to pass OpenRouter credentials to Graphiti init

### Phase 11: Fix Embedder — Replace OpenAIEmbedder with Hash-Based No-Op
- OpenRouter does not support `/v1/embeddings` — every `add_episode()` failed at embedding time, caught silently, returning empty `GraphDelta`
- Created `backend/app/services/noop_embedder.py` — SHA-256 hash-based deterministic vectors (dim 1024)
- Replaced `OpenAIEmbedder` with `NoOpEmbedder` in `graphiti_service.py`
- Exact-match dedup preserved (identical strings → identical vectors); only semantic similarity degraded (acceptable for V1)
- No new dependencies, API keys, or env vars required

### Next Steps
- Test full flow with `docker compose up --build`
- Verify graph populates after sending a chat message
- Test export to Markdown download
- If semantic dedup becomes important, swap `NoOpEmbedder` for a dedicated embedding provider (Gemini free tier, Voyage AI, or OpenAI key)
