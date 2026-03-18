# Architectural Decisions

## 2026-03-17: Error handling strategy for external services

**Decision:** Use HTTP 503 for missing/invalid OpenAI API key, 502 for other OpenAI errors. Graphiti init failure logs a warning and degrades gracefully rather than preventing app startup.

**Rationale:** The app should be resilient to missing credentials and unavailable services. Chat (core feature) should work even without Neo4j/Graphiti (graph feature). Clear HTTP status codes help the frontend display appropriate error messages.
