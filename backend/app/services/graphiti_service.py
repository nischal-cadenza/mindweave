import logging
from datetime import datetime, timezone

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType

from app.models.schemas import GraphDelta, GraphEdge, GraphNode

logger = logging.getLogger(__name__)


class GraphitiService:
    def __init__(self) -> None:
        self.client: Graphiti | None = None

    async def init(self, uri: str, user: str, password: str) -> None:
        self.client = Graphiti(uri=uri, user=user, password=password)
        await self.client.build_indices_and_constraints()
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

        nodes = [
            GraphNode(
                id=str(node.uuid),
                label=node.name,
                type=getattr(node, "label", "Concept") if hasattr(node, "label") else "Concept",
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

    async def get_full_graph(self) -> GraphDelta:
        if not self.client:
            raise RuntimeError("Graphiti not initialized")

        driver = self.client.driver

        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        records, _, _ = await driver.execute_query(
            "MATCH (n:Entity) RETURN n.uuid AS id, n.name AS name, n.summary AS summary, labels(n) AS labels"
        )
        for record in records:
            node_labels = [l for l in record["labels"] if l != "Entity" and l != "__Entity__"]
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
            "RETURN r.uuid AS id, s.uuid AS source, t.uuid AS target, r.fact AS fact, r.name AS name"
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
            logger.info("Graphiti connection closed")


graphiti_service = GraphitiService()
