"""Hash-based no-op embedder for Graphiti.

OpenRouter doesn't support /v1/embeddings. This embedder uses SHA-256 hashing
to produce deterministic vectors, allowing Graphiti's entity extraction pipeline
to complete without a real embedding service. Exact-match dedup still works
(identical strings → identical vectors); only semantic similarity is degraded.
"""

import hashlib
import struct
from collections.abc import Iterable

from graphiti_core.embedder.client import EMBEDDING_DIM, EmbedderClient


def _hash_to_vector(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Convert text to a deterministic vector via SHA-256 cycling."""
    digest = hashlib.sha256(text.encode()).digest()
    # Cycle the 32-byte hash to fill `dim` floats
    floats: list[float] = []
    for i in range(dim):
        offset = (i * 4) % len(digest)
        # Grab 4 bytes (wrapping) and convert to a float in [-1, 1]
        raw = digest[offset : offset + 4]
        if len(raw) < 4:
            raw = raw + digest[: 4 - len(raw)]
        (value,) = struct.unpack(">I", raw)
        floats.append((value / 0xFFFFFFFF) * 2 - 1)
    return floats


class NoOpEmbedder(EmbedderClient):
    async def create(
        self, input_data: str | list[str] | Iterable[int] | Iterable[Iterable[int]]
    ) -> list[float]:
        if isinstance(input_data, str):
            return _hash_to_vector(input_data)
        # For list of strings, embed the first one
        items = list(input_data)
        if items and isinstance(items[0], str):
            return _hash_to_vector(items[0])
        # Fallback: convert token IDs to string and hash
        return _hash_to_vector(str(items))

    async def create_batch(self, input_data_list: list[str]) -> list[list[float]]:
        return [_hash_to_vector(text) for text in input_data_list]
