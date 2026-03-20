from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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
    properties: dict[str, str] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    properties: dict[str, str] = Field(default_factory=dict)


class GraphDelta(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class GraphStatus(BaseModel):
    state: Literal["initializing", "ready", "degraded", "disabled"] = "disabled"
    message: str | None = None
    model: str | None = None


class ChatResponse(BaseModel):
    reply: str
    framework: str | None = None
    graph_delta: GraphDelta = Field(default_factory=GraphDelta)
    graph_status: GraphStatus = Field(default_factory=GraphStatus)


class ExportRequest(BaseModel):
    conversation_id: str
    commit_to_github: bool = False


class ExportResponse(BaseModel):
    markdown: str
    github_url: str | None = None
