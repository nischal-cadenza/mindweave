import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import ExportRequest, ExportResponse
from app.services.chat_service import chat_service
from app.services.export_service import commit_to_github, format_conversation_markdown

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/export", response_model=ExportResponse)
async def export_conversation(request: ExportRequest):
    conversation = chat_service.conversations.get(request.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    markdown = format_conversation_markdown(conversation, request.conversation_id)

    github_url = None
    if request.commit_to_github:
        github_url = await commit_to_github(markdown, request.conversation_id)

    return ExportResponse(markdown=markdown, github_url=github_url)
