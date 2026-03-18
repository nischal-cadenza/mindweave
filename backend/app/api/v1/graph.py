import logging

from fastapi import APIRouter

from app.models.schemas import GraphDelta
from app.services.graphiti_service import graphiti_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/graph", response_model=GraphDelta)
async def get_graph():
    try:
        return await graphiti_service.get_full_graph()
    except Exception as e:
        logger.error("Failed to get graph: %s", e)
        return GraphDelta()
