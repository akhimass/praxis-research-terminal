from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_LOADED = False


def load_praxis_env() -> None:
    """Load .env from common locations (idempotent)."""
    global _LOADED
    if _LOADED:
        return
    here = Path(__file__).resolve()
    # backend/agents -> repo root (parent of backend/)
    repo_root = here.parents[2]
    load_dotenv(repo_root / ".env")
    load_dotenv(repo_root / "backend" / ".env")
    load_dotenv(Path.cwd() / ".env")
    _LOADED = True


def env_str(name: str, default: str = "") -> str:
    load_praxis_env()
    return os.environ.get(name, default).strip()


def env_bool(name: str, default: bool = False) -> bool:
    load_praxis_env()
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}
