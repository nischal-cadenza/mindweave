import logging

from fastapi import APIRouter, Query

from app.models.schemas import GraphDelta, GraphStatus
from app.services.graphiti_service import graphiti_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/graph", response_model=GraphDelta)
async def get_graph(conversation_id: str | None = Query(default=None)):
    try:
        return await graphiti_service.get_full_graph(group_id=conversation_id)
    except RuntimeError as e:
        logger.warning("Graph requested while unavailable: %s", e)
        return GraphDelta()
    except Exception as e:
        logger.error("Failed to get graph: %s", e)
        return GraphDelta()


@router.get("/graph/status", response_model=GraphStatus)
async def get_graph_status():
    return graphiti_service.get_status()
