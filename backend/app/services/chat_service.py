import logging
from datetime import datetime, timezone

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.frameworks import detect_framework
from app.models.schemas import ChatMessage
from app.prompts.system import build_system_prompt

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
        self.conversations: dict[str, list[ChatMessage]] = {}

    def get_conversation(self, conversation_id: str) -> list[ChatMessage]:
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        return self.conversations[conversation_id]

    async def process_message(
        self, conversation_id: str, message: str
    ) -> tuple[str, str]:
        framework = detect_framework(message)
        conversation = self.get_conversation(conversation_id)

        user_msg = ChatMessage(
            role="user",
            content=message,
            timestamp=datetime.now(timezone.utc),
            framework=framework,
        )
        conversation.append(user_msg)

        system_prompt = build_system_prompt(framework)
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(
            {"role": msg.role, "content": msg.content} for msg in conversation
        )

        try:
            response = await self.client.chat.completions.create(
                model=settings.chat_model,
                messages=messages,
                temperature=0.6,
                max_tokens=900,
            )
        except Exception as e:
            logger.error("LLM API call failed: %s", e)
            raise

        reply = response.choices[0].message.content or ""

        assistant_msg = ChatMessage(
            role="assistant",
            content=reply,
            timestamp=datetime.now(timezone.utc),
            framework=framework,
        )
        conversation.append(assistant_msg)

        return reply, framework

    def clear_conversation(self, conversation_id: str) -> None:
        self.conversations.pop(conversation_id, None)


chat_service = ChatService()
