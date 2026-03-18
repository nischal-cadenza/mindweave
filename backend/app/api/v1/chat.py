import logging

from fastapi import APIRouter, HTTPException
from openai import AuthenticationError, OpenAIError

from app.models.schemas import ChatRequest, ChatResponse, GraphDelta
from app.services.chat_service import chat_service
from app.services.graphiti_service import graphiti_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        reply, framework = await chat_service.process_message(
            request.conversation_id, request.message
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured or invalid.",
        )
    except OpenAIError as e:
        logger.error("OpenAI API error: %s", e)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    combined_delta = GraphDelta()

    # Ingest both messages as Graphiti episodes
    try:
        user_delta = await graphiti_service.add_episode(
            text=request.message,
            source_description="user",
            group_id=request.conversation_id,
        )
        assistant_delta = await graphiti_service.add_episode(
            text=reply,
            source_description="assistant",
            group_id=request.conversation_id,
        )

        # Merge deltas
        combined_delta = user_delta.model_copy()
        combined_delta.nodes.extend(assistant_delta.nodes)
        combined_delta.edges.extend(assistant_delta.edges)

        # Broadcast via WebSocket
        from app.main import ws_manager

        await ws_manager.broadcast(
            {"type": "graph_delta", "data": combined_delta.model_dump()}
        )
    except Exception as e:
        logger.error("Graphiti ingestion failed: %s", e)

    return ChatResponse(
        reply=reply,
        framework=framework,
        graph_delta=combined_delta,
    )
