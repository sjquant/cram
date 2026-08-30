#!/usr/bin/env python3
"""Render a cram deck into a self-contained HTML player.

Validates the deck with :mod:`skills.cram.scripts.validator`, then inlines
the deck JSON into a copy of ``skills/cram/template/player.html``. The
template supplies all card markup and behavior; this module only injects
data, so the output never depends on anything outside the single HTML file
it writes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validator import DeckValidationError, load_deck  # noqa: E402

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", str(Path(__file__).resolve().parents[3])))
TEMPLATE_PATH = PLUGIN_ROOT / "skills" / "cram" / "template" / "player.html"
INJECTION_MARKER = "/*INJECT*/ null"


def main(argv: Sequence[str] | None = None) -> int:
    """Validate a deck and write the rendered player, reporting failures without a traceback."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck", type=Path, help="path to a deck JSON file")
    parser.add_argument("-o", "--output", type=Path, required=True, help="path to write the rendered HTML")
    args = parser.parse_args(argv)

    try:
        deck = load_deck(args.deck)
    except DeckValidationError as error:
        print(error, file=sys.stderr)
        return 1

    html = render_deck(deck)
    args.output.write_text(html, encoding="utf-8")
    print(f"wrote {args.output}")
    return 0


def render_deck(deck: dict) -> str:
    """Inline a validated deck into the player template and return the resulting HTML."""

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    if INJECTION_MARKER not in template:
        raise RuntimeError(f"{TEMPLATE_PATH}: injection marker not found")

    deck_json = _escape_for_inline_script(json.dumps(deck))
    return template.replace(INJECTION_MARKER, deck_json, 1)


def _escape_for_inline_script(deck_json: str) -> str:
    """Escape every ``<`` so injected card text cannot close the surrounding script tag early."""

    return deck_json.replace("<", "\\u003C")


if __name__ == "__main__":
    raise SystemExit(main())
