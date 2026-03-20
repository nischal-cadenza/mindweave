import pytest

from app.api.v1 import graph as graph_api
from app.models.schemas import GraphDelta, GraphStatus


@pytest.mark.asyncio
async def test_get_graph_passes_conversation_id(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = GraphDelta()

    async def fake_get_full_graph(group_id: str | None = None) -> GraphDelta:
        assert group_id == "conv-123"
        return expected

    monkeypatch.setattr(graph_api.graphiti_service, "get_full_graph", fake_get_full_graph)

    result = await graph_api.get_graph(conversation_id="conv-123")

    assert result == expected


@pytest.mark.asyncio
async def test_get_graph_returns_empty_when_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_get_full_graph(group_id: str | None = None) -> GraphDelta:
        raise RuntimeError("Graphiti not initialized")

    monkeypatch.setattr(graph_api.graphiti_service, "get_full_graph", fake_get_full_graph)

    result = await graph_api.get_graph(conversation_id="conv-123")

    assert result == GraphDelta()


@pytest.mark.asyncio
async def test_get_graph_status_returns_service_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    status = GraphStatus(
        state="degraded",
        message="Graph sync failed",
        model="openai/gpt-4.1-mini",
    )

    monkeypatch.setattr(graph_api.graphiti_service, "get_status", lambda: status)

    assert await graph_api.get_graph_status() == status
