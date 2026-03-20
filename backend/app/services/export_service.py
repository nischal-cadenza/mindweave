import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.models.frameworks import FRAMEWORK_LABELS
from app.models.schemas import ChatMessage

logger = logging.getLogger(__name__)


def format_conversation_markdown(
    messages: list[ChatMessage], conversation_id: str
) -> str:
    lines = [
        "# MindWeave Conversation",
        f"**Conversation ID:** {conversation_id}",
        f"**Exported:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "---",
        "",
    ]

    for msg in messages:
        timestamp = msg.timestamp.strftime("%H:%M:%S")
        speaker = "**You**" if msg.role == "user" else "**MindWeave**"
        framework_tag = ""
        if msg.framework and msg.framework != "socratic":
            label = FRAMEWORK_LABELS.get(msg.framework, msg.framework)
            framework_tag = f" _[{label}]_"

        lines.append(f"### {speaker} — {timestamp}{framework_tag}")
        lines.append("")
        lines.append(msg.content)
        lines.append("")

    return "\n".join(lines)


async def commit_to_github(markdown: str, conversation_id: str) -> str | None:
    if not settings.github_token or not settings.github_repo:
        return None

    try:
        from github import Github

        g = Github(settings.github_token)
        repo = g.get_repo(settings.github_repo)
        filename = f"conversations/{conversation_id}.md"

        try:
            existing = repo.get_contents(filename)
            repo.update_file(
                filename,
                f"Update conversation {conversation_id}",
                markdown,
                existing.sha,
            )
        except Exception:
            repo.create_file(
                filename,
                f"Add conversation {conversation_id}",
                markdown,
            )

        return f"https://github.com/{settings.github_repo}/blob/main/{filename}"
    except Exception as e:
        logger.error("GitHub commit failed: %s", e)
        return None
