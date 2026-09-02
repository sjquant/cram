"""Small helpers shared by public-interface tests.

The helpers deliberately invoke the renderer as a subprocess.  Tests should
exercise the command users run (deck JSON in, HTML out), rather than importing
implementation details from the validator or renderer.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "fixtures"
RENDERER = ROOT / "skills" / "cram" / "scripts" / "render.py"
TEMPLATE = ROOT / "skills" / "cram" / "template" / "player.html"


def fixture_paths(kind: str) -> list[Path]:
    """Return fixture files in a stable order."""

    return sorted((FIXTURES / kind).glob("*.json"))


def read_deck(path: Path) -> dict:
    """Read a fixture for assertions that concern the deck contract."""

    with path.open(encoding="utf-8") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise TypeError(f"expected an object in {path}")
    return value


def run_renderer(deck: Path, output: Path, cwd: Path, mode: str = "normal") -> subprocess.CompletedProcess:
    """Run the renderer's documented CLI against one deck fixture."""

    environment = os.environ.copy()
    environment["CLAUDE_PLUGIN_ROOT"] = str(ROOT)
    command = [sys.executable, str(RENDERER), str(deck), "-o", str(output)]
    if mode != "normal":
        command.extend(["--mode", mode])
    return subprocess.run(
        command,
        cwd=cwd,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
