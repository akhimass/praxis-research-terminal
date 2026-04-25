from __future__ import annotations

"""Shim: canonical implementation lives in `backend/scripts/test_pipeline.py`."""

from pathlib import Path
import runpy


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "backend" / "scripts" / "test_pipeline.py"
    runpy.run_path(str(target), run_name="__main__")
