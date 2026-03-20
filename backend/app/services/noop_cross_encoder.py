import re

from graphiti_core.cross_encoder.client import CrossEncoderClient

_TOKEN_RE = re.compile(r"[A-Za-z0-9_]+")


def _tokenize(text: str) -> set[str]:
    return {token.lower() for token in _TOKEN_RE.findall(text)}


def _score(query: str, passage: str) -> float:
    query_tokens = _tokenize(query)
    passage_tokens = _tokenize(passage)

    if not query_tokens or not passage_tokens:
        return 0.0

    overlap = len(query_tokens & passage_tokens)
    containment = overlap / len(query_tokens)
    coverage = overlap / len(passage_tokens)
    exact_match_bonus = 1.0 if query.strip().lower() in passage.strip().lower() else 0.0

    return exact_match_bonus + (containment * 0.7) + (coverage * 0.3)


class NoOpCrossEncoder(CrossEncoderClient):
    async def rank(self, query: str, passages: list[str]) -> list[tuple[str, float]]:
        ranked = [(passage, _score(query, passage)) for passage in passages]
        ranked.sort(key=lambda item: item[1], reverse=True)
        return ranked
