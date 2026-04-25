from __future__ import annotations

import json
import re
from typing import Any

from backend.agents._env import env_str

# Populated after each successful `claude_messages_json` call (best-effort).
LAST_MESSAGE_USAGE: dict[str, Any] = {}


def strip_json_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\n", "", text)
        text = re.sub(r"\n```\s*$", "", text)
    return text.strip()


def parse_json_loose(text: str) -> Any:
    return json.loads(strip_json_fence(text))


async def claude_messages_json(
    *,
    system: str,
    user: str,
    max_tokens: int = 8192,
) -> Any:
    """Call Anthropic Messages API; return parsed JSON from assistant text."""
    api_key = env_str("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY missing")

    try:
        from anthropic import AsyncAnthropic
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("anthropic package not installed") from exc

    model = env_str("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    LAST_MESSAGE_USAGE.clear()
    usage_obj = getattr(message, "usage", None)
    if usage_obj is not None:
        LAST_MESSAGE_USAGE["input"] = getattr(usage_obj, "input_tokens", None)
        LAST_MESSAGE_USAGE["output"] = getattr(usage_obj, "output_tokens", None)
    parts: list[str] = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    text = "\n".join(parts).strip()
    return parse_json_loose(text)


async def claude_text(
    *,
    system: str,
    user: str,
    max_tokens: int = 4096,
) -> str:
    """Return plain text from Claude (not JSON). Empty string if no API key or on failure."""
    api_key = env_str("ANTHROPIC_API_KEY")
    if not api_key:
        return ""

    try:
        from anthropic import AsyncAnthropic
    except ImportError:  # pragma: no cover
        return ""

    try:
        model = env_str("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        client = AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        LAST_MESSAGE_USAGE.clear()
        usage_obj = getattr(message, "usage", None)
        if usage_obj is not None:
            LAST_MESSAGE_USAGE["input"] = getattr(usage_obj, "input_tokens", None)
            LAST_MESSAGE_USAGE["output"] = getattr(usage_obj, "output_tokens", None)
        parts: list[str] = []
        for block in message.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "\n".join(parts).strip()
    except Exception:  # pragma: no cover
        return ""
