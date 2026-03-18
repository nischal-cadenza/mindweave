from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    framework: str | None = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: str


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    properties: dict = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    properties: dict = {}


class GraphDelta(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class ChatResponse(BaseModel):
    reply: str
    framework: str | None = None
    graph_delta: GraphDelta = GraphDelta()


class ExportRequest(BaseModel):
    conversation_id: str
    commit_to_github: bool = False


class ExportResponse(BaseModel):
    markdown: str
    github_url: str | None = None
