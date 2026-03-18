# MindWeave — Known Bugs & Issues

## 2026-03-17

_No bugs reported yet. Will be updated as testing progresses._

### Potential Issues to Watch
- Graphiti `get_full_graph()` uses `RELATES_TO` relationship type — if Graphiti uses different edge types internally, the query may miss edges
- `react-force-graph-2d` may need explicit width/height instead of `undefined` if container sizing doesn't work
- WebSocket reconnect in dev mode may trigger double connections due to React StrictMode
