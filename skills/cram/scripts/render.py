#!/usr/bin/env python3
"""Render a cram deck into a self-contained HTML player.

Validates the deck with the sibling ``validator`` module, then inlines the
deck JSON into a copy of ``skills/cram/template/player.html``. The template
supplies all card markup and behavior; this module only injects data, so the
output never depends on anything outside the single HTML file it writes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Sequence

# Imported by sibling filename, not as `skills.cram.scripts.validator`, because
# this CLI's documented entry point is a direct script path, not `python -m`.
# Keep it this way even though it means `render` and `skills.cram.scripts.validator`
# can end up as two distinct module objects if something ever imports this file
# as a library alongside the package-qualified validator.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from validator import DeckValidationError, load_deck  # noqa: E402

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or str(Path(__file__).resolve().parents[3]))
TEMPLATE_PATH = PLUGIN_ROOT / "skills" / "cram" / "template" / "player.html"
INJECTION_MARKER = "/*INJECT*/ null"
MODE_INJECTION_MARKER = "/*INJECT_MODE*/ false"
RENDER_MODES = ("normal", "cram")


def main(argv: Sequence[str] | None = None) -> int:
    """Validate a deck and write the rendered player, reporting failures without a traceback."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck", type=Path, help="path to a deck JSON file")
    parser.add_argument("-o", "--output", type=Path, required=True, help="path to write the rendered HTML")
    parser.add_argument(
        "--mode",
        choices=RENDER_MODES,
        default="normal",
        help="session mode for the generated player (default: normal)",
    )
    args = parser.parse_args(argv)

    try:
        deck = load_deck(args.deck)
    except DeckValidationError as error:
        print(error, file=sys.stderr)
        return 1

    try:
        html = render_deck(deck, args.mode)
        _write_output(args.output, html)
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1

    print(f"wrote {args.output}")
    return 0


def render_deck(deck: dict, mode: str = "normal") -> str:
    """Inline a validated deck into the player template and return the resulting HTML."""

    if mode not in RENDER_MODES:
        raise ValueError(f"unsupported player mode: {mode}")
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    if INJECTION_MARKER not in template:
        raise RuntimeError(f"{TEMPLATE_PATH}: injection marker not found")
    if MODE_INJECTION_MARKER not in template:
        raise RuntimeError(f"{TEMPLATE_PATH}: mode injection marker not found")

    deck_json = _escape_for_inline_script(json.dumps(deck))
    mode_value = "true" if mode == "cram" else "false"
    return template.replace(INJECTION_MARKER, deck_json, 1).replace(
        MODE_INJECTION_MARKER,
        mode_value,
        1,
    )


def _escape_for_inline_script(deck_json: str) -> str:
    """Escape every ``<`` so injected card text cannot close the surrounding script tag early."""

    return deck_json.replace("<", "\\u003C")


def _write_output(path: Path, html: str) -> None:
    """Write html to path atomically, so a crash mid-write cannot leave a truncated file."""

    descriptor, temp_name = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(html)
        os.replace(temp_name, path)
    except BaseException:
        os.unlink(temp_name)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
