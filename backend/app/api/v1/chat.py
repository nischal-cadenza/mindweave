import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from openai import AuthenticationError, OpenAIError

from app.models.schemas import ChatRequest, ChatResponse, GraphDelta
from app.services.chat_service import chat_service
from app.services.graphiti_service import graphiti_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def ingest_graph_turn(
    conversation_id: str,
    user_message: str,
    assistant_reply: str,
) -> None:
    try:
        graph_delta = await graphiti_service.add_conversation_turn(
            user_text=user_message,
            assistant_text=assistant_reply,
            group_id=conversation_id,
        )
    except Exception as e:
        graphiti_service.record_runtime_error(e)
        logger.error("Graphiti ingestion failed: %s", e)
        return

    from app.main import ws_manager

    await ws_manager.broadcast(
        {
            "type": "graph_delta",
            "conversation_id": conversation_id,
            "data": graph_delta.model_dump(),
        }
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    try:
        reply, framework = await chat_service.process_message(
            request.conversation_id, request.message
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="OpenRouter API key not configured or invalid.",
        )
    except OpenAIError as e:
        logger.error("LLM API error: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM API error: {e}")

    combined_delta = GraphDelta()
    graph_status = graphiti_service.get_status()

    if graphiti_service.is_available():
        background_tasks.add_task(
            ingest_graph_turn,
            request.conversation_id,
            request.message,
            reply,
        )
    else:
        graph_status = graphiti_service.get_status()

    return ChatResponse(
        reply=reply,
        framework=framework,
        graph_delta=combined_delta,
        graph_status=graph_status,
    )
