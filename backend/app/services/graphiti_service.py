import logging
from datetime import datetime, timezone
from typing import Literal

from graphiti_core import Graphiti
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.nodes import EpisodeType

from app.models.schemas import GraphDelta, GraphEdge, GraphNode, GraphStatus
from app.services.noop_cross_encoder import NoOpCrossEncoder
from app.services.noop_embedder import NoOpEmbedder
from app.services.openrouter_graphiti_client import OpenRouterGraphitiClient

logger = logging.getLogger(__name__)


class GraphitiService:
    def __init__(self) -> None:
        self.client: Graphiti | None = None
        self.model: str | None = None
        self._status = GraphStatus(
            state="disabled",
            message="Knowledge graph is not initialized yet.",
        )

    def _clean_message(self, message: str) -> str:
        return " ".join(message.split())[:280]

    def _set_status(
        self,
        state: Literal["initializing", "ready", "degraded", "disabled"],
        message: str | None = None,
    ) -> None:
        self._status = GraphStatus(
            state=state,
            message=self._clean_message(message) if message else None,
            model=self.model,
        )

    def get_status(self) -> GraphStatus:
        return self._status.model_copy()

    def is_available(self) -> bool:
        return self.client is not None

    def record_runtime_error(self, error: Exception) -> None:
        state = "degraded" if self.client else "disabled"
        self._set_status(state, str(error))

    async def init(
        self,
        uri: str,
        user: str,
        password: str,
        api_key: str,
        base_url: str,
        model: str,
    ) -> None:
        self.model = model
        self._set_status(
            "initializing",
            "Connecting to Neo4j and starting the graph extraction pipeline.",
        )

        llm_config = LLMConfig(
            api_key=api_key,
            model=model,
            small_model=model,
            base_url=base_url,
        )
        llm_client = OpenRouterGraphitiClient(config=llm_config)
        embedder = NoOpEmbedder()
        cross_encoder = NoOpCrossEncoder()

        try:
            self.client = Graphiti(
                uri=uri,
                user=user,
                password=password,
                llm_client=llm_client,
                embedder=embedder,
                cross_encoder=cross_encoder,
            )
            await self.client.build_indices_and_constraints()
        except Exception as e:
            if self.client:
                await self.client.close()
            self.client = None
            self._set_status("disabled", str(e))
            raise

        self._set_status("ready")
        logger.info("Graphiti initialized and indices built")

    async def add_episode(
        self,
        text: str,
        source_description: str,
        group_id: str,
    ) -> GraphDelta:
        if not self.client:
            raise RuntimeError("Graphiti not initialized")

        result = await self.client.add_episode(
            name=f"episode_{datetime.now(timezone.utc).isoformat()}",
            episode_body=text,
            source=EpisodeType.text,
            source_description=source_description,
            reference_time=datetime.now(timezone.utc),
            group_id=group_id,
        )

        self._set_status("ready")

        nodes = [
            GraphNode(
                id=str(node.uuid),
                label=node.name,
                type=node.labels[0] if getattr(node, "labels", None) else "Concept",
                properties={"summary": node.summary} if hasattr(node, "summary") and node.summary else {},
            )
            for node in result.nodes
        ]

        edges = [
            GraphEdge(
                source=str(edge.source_node_uuid),
                target=str(edge.target_node_uuid),
                label=edge.fact if hasattr(edge, "fact") else edge.name,
                properties={},
            )
            for edge in result.edges
        ]

        return GraphDelta(nodes=nodes, edges=edges)

    async def add_conversation_turn(
        self,
        user_text: str,
        assistant_text: str,
        group_id: str,
    ) -> GraphDelta:
        turn_text = f"User: {user_text}\nAssistant: {assistant_text}"
        return await self.add_episode(
            text=turn_text,
            source_description="conversation_turn",
            group_id=group_id,
        )

    async def get_full_graph(self, group_id: str | None = None) -> GraphDelta:
        if not self.client:
            raise RuntimeError("Graphiti not initialized")

        driver = self.client.driver

        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        records, _, _ = await driver.execute_query(
            "MATCH (n:Entity) "
            "WHERE $group_id IS NULL OR n.group_id = $group_id "
            "RETURN n.uuid AS id, n.name AS name, n.summary AS summary, labels(n) AS labels",
            group_id=group_id,
        )
        for record in records:
            node_labels = [
                label
                for label in record["labels"]
                if label != "Entity" and label != "__Entity__"
            ]
            node_type = node_labels[0] if node_labels else "Concept"
            nodes.append(
                GraphNode(
                    id=record["id"],
                    label=record["name"] or "",
                    type=node_type,
                    properties={"summary": record["summary"]} if record["summary"] else {},
                )
            )

        records, _, _ = await driver.execute_query(
            "MATCH (s:Entity)-[r:RELATES_TO]->(t:Entity) "
            "WHERE $group_id IS NULL OR r.group_id = $group_id "
            "RETURN r.uuid AS id, s.uuid AS source, t.uuid AS target, r.fact AS fact, r.name AS name",
            group_id=group_id,
        )
        for record in records:
            edges.append(
                GraphEdge(
                    source=record["source"],
                    target=record["target"],
                    label=record["fact"] or record["name"] or "RELATES_TO",
                    properties={},
                )
            )

        return GraphDelta(nodes=nodes, edges=edges)

    async def close(self) -> None:
        if self.client:
            await self.client.close()
            self.client = None
            self._set_status("disabled", "Knowledge graph is offline.")
            logger.info("Graphiti connection closed")


graphiti_service = GraphitiService()
