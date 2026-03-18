# MindWeave — Known Bugs & Issues

## 2026-03-17

### Fixed: 500 Internal Server Error on every chat message
- **Root cause:** No error handling around OpenAI API call — missing API key caused unhandled `AuthenticationError`. Graphiti init failure on startup also crashed the app if Neo4j was unavailable.
- **Fix:** Added try/except in `chat.py` (returns 503/502), `chat_service.py` (logs error), and `main.py` (graceful degradation). Initialized `combined_delta` before Graphiti try block to prevent `NameError`.

### Potential Issues to Watch
- Graphiti `get_full_graph()` uses `RELATES_TO` relationship type — if Graphiti uses different edge types internally, the query may miss edges
- `react-force-graph-2d` may need explicit width/height instead of `undefined` if container sizing doesn't work
- WebSocket reconnect in dev mode may trigger double connections due to React StrictMode
