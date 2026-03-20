import pytest

from app.services.noop_cross_encoder import NoOpCrossEncoder


@pytest.mark.asyncio
async def test_noop_cross_encoder_prefers_higher_token_overlap() -> None:
    encoder = NoOpCrossEncoder()

    ranked = await encoder.rank(
        "mindweave graph neo4j",
        [
            "This passage is about scheduling and calendars.",
            "MindWeave uses a graph stored in Neo4j for relationships.",
            "MindWeave has a chat interface.",
        ],
    )

    assert ranked[0][0] == "MindWeave uses a graph stored in Neo4j for relationships."
    assert ranked[0][1] > ranked[-1][1]
