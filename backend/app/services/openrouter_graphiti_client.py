import json
import logging
import typing
from typing import Any

import openai
from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel

from graphiti_core.llm_client.openai_generic_client import (
    DEFAULT_MODEL,
    OpenAIGenericClient,
)
from graphiti_core.prompts.models import Message

logger = logging.getLogger(__name__)


class OpenRouterGraphitiClient(OpenAIGenericClient):
    async def _generate_response(
        self,
        messages: list[Message],
        response_model: type[BaseModel] | None = None,
        max_tokens: int = 16384,
        model_size: Any = None,
    ) -> dict[str, typing.Any]:
        openai_messages: list[ChatCompletionMessageParam] = []
        schema_instruction = ""

        if response_model is not None:
            schema = response_model.model_json_schema()
            schema_instruction = (
                "\n\nReturn a single JSON object that matches this schema exactly.\n"
                f"{json.dumps(schema, separators=(',', ':'))}\n"
                "Do not include markdown fences or any explanation."
            )

        for index, message in enumerate(messages):
            content = self._clean_input(message.content)
            if index == 0 and message.role == "system" and schema_instruction:
                content = f"{content}{schema_instruction}"

            if message.role == "user":
                openai_messages.append({"role": "user", "content": content})
            elif message.role == "system":
                openai_messages.append({"role": "system", "content": content})

        try:
            response = await self.client.chat.completions.create(
                model=self.model or DEFAULT_MODEL,
                messages=openai_messages,
                temperature=self.temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            result = response.choices[0].message.content or ""
            return json.loads(result)
        except openai.RateLimitError:
            raise
        except Exception as e:
            logger.error("Error in generating OpenRouter Graphiti response: %s", e)
            raise
