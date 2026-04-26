"""In-process Anthropic usage and session budget snapshot (per worker process)."""

from __future__ import annotations

import os
import threading
from typing import Any

_lock = threading.Lock()
_session_input_tokens = 0
_session_output_tokens = 0
_session_calls = 0
_session_cost_usd = 0.0


def _token_rates_usd_per_mtok() -> tuple[float, float]:
    inp = float(os.environ.get("PRAXIS_INPUT_USD_PER_MTOK", "3") or "3")
    out = float(os.environ.get("PRAXIS_OUTPUT_USD_PER_MTOK", "15") or "15")
    return inp, out


def record_message_usage(message: Any) -> None:
    """Accumulate token usage from an Anthropic ``Message`` response object."""
    global _session_input_tokens, _session_output_tokens, _session_calls, _session_cost_usd
    usage = getattr(message, "usage", None)
    if usage is None:
        return
    inp = int(getattr(usage, "input_tokens", 0) or 0)
    out = int(getattr(usage, "output_tokens", 0) or 0)
    in_r, out_r = _token_rates_usd_per_mtok()
    delta = (inp / 1_000_000.0) * in_r + (out / 1_000_000.0) * out_r
    with _lock:
        _session_input_tokens += inp
        _session_output_tokens += out
        _session_calls += 1
        _session_cost_usd += delta


def get_usage_snapshot() -> dict[str, Any]:
    """Return JSON-serializable session spend for ``GET /usage``."""
    budget = float(os.environ.get("PRAXIS_SESSION_BUDGET_USD", "20") or "20")
    with _lock:
        remaining = max(0.0, budget - _session_cost_usd)
        return {
            "session_cost_usd": round(_session_cost_usd, 4),
            "budget_remaining_usd": round(remaining, 2),
            "session_calls": _session_calls,
            "session_input_tokens": _session_input_tokens,
            "session_output_tokens": _session_output_tokens,
        }
