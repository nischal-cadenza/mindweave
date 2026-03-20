# Architectural Decisions

## 2026-03-17: Error handling strategy for external services

**Decision:** Use HTTP 503 for missing/invalid OpenAI API key, 502 for other OpenAI errors. Graphiti init failure logs a warning and degrades gracefully rather than preventing app startup.

**Rationale:** The app should be resilient to missing credentials and unavailable services. Chat (core feature) should work even without Neo4j/Graphiti (graph feature). Clear HTTP status codes help the frontend display appropriate error messages.

## 2026-03-19: Switch LLM provider from OpenAI to OpenRouter

**Decision:** Replace hardcoded GPT-4o with OpenRouter's `qwen/qwen3-coder` (free tier). Keep the `openai` Python package as the HTTP client since OpenRouter exposes an OpenAI-compatible API. Made model name configurable via `LLM_MODEL` env var.

**Rationale:** Free tier availability with Qwen3 Coder reduces cost to zero. Using OpenRouter as a gateway also enables easy model switching in the future by changing a single env var. No code changes needed to swap models.

## 2026-03-19: Configure Graphiti LLM client and embedder for OpenRouter

**Decision:** Pass `OpenAIGenericClient` (with `LLMConfig`) and `OpenAIEmbedder` (with `OpenAIEmbedderConfig`) to the `Graphiti()` constructor, both pointed at OpenRouter's base URL using the same API key and model as the chat service.

**Rationale:** After the OpenRouter migration, Graphiti's default constructor uses the standard OpenAI client which requires `OPENAI_API_KEY`. Since we no longer have that env var, Graphiti failed silently at init, causing the knowledge graph to never populate. By explicitly configuring both the LLM client (for entity extraction) and embedder (for vector search), Graphiti can use OpenRouter just like the chat service. If OpenRouter doesn't support embedding endpoints, only the embedder needs to be swapped to a dedicated provider.

## 2026-03-20: Replace OpenAIEmbedder with hash-based NoOpEmbedder

**Decision:** Remove `OpenAIEmbedder` and replace it with a custom `NoOpEmbedder` that produces deterministic vectors via SHA-256 hashing instead of calling any embeddings API.

**Rationale:** OpenRouter does not expose a `/v1/embeddings` endpoint. Every `add_episode()` call failed at embedding time, was caught silently in `chat.py`, and returned an empty `GraphDelta` — explaining why the knowledge graph never populated despite chat working fine. Graphiti's entity extraction is LLM-driven (works via OpenRouter), but embeddings are only used for vector similarity dedup and retrieval. A hash-based embedder preserves exact-match dedup (identical strings produce identical vectors) while only degrading semantic similarity search, which is acceptable for V1. This avoids adding new API keys, dependencies, or env vars.
