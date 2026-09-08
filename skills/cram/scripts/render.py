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
import re
import sys
import tempfile
from html.parser import HTMLParser
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
LOCALES_PATH = PLUGIN_ROOT / "skills" / "cram" / "locales"
LANGUAGES = ("en", "ko", "ja", "zh-CN", "es", "fr")


def main(argv: Sequence[str] | None = None) -> int:
    """Validate a deck and write the rendered player, reporting failures without a traceback."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck", type=Path, help="path to a deck JSON file")
    parser.add_argument("-o", "--output", type=Path, required=True, help="path to write the rendered HTML")
    parser.add_argument(
        "--language", "--lang", choices=LANGUAGES, default="en",
        help="player UI language (default: en); does not translate deck content",
    )
    args = parser.parse_args(argv)

    try:
        deck = load_deck(args.deck)
    except DeckValidationError as error:
        print(error, file=sys.stderr)
        return 1

    try:
        html = render_deck(deck, args.language)
        _write_output(args.output, html)
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1

    print(f"wrote {args.output}")
    return 0


def render_deck(deck: dict, language: str = "en") -> str:
    """Inline a validated deck into the player template and return the resulting HTML."""

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    messages = _load_messages(language, template)
    injections = {
        "__CRAM_LANGUAGE__": language,
        "__CRAM_LOCALE__": _escape_for_inline_script(json.dumps({"language": language, "messages": messages})),
        "__CRAM_DECK__": _escape_for_inline_script(json.dumps(deck)),
    }
    for marker in injections:
        if template.count(marker) != 1:
            raise RuntimeError(f"{TEMPLATE_PATH}: expected exactly one {marker} injection marker")
    # One pass keeps marker-like text inside deck/translation content untouched.
    return re.sub("|".join(injections), lambda match: injections[match[0]], template)


def _load_messages(language: str, template: str) -> dict:
    """Reject incomplete translations before writing an unusable player."""

    if language not in LANGUAGES:
        raise RuntimeError(f"Unsupported language: {language}")
    english = _read_catalog("en")
    messages = english if language == "en" else _read_catalog(language)
    required = _TemplateMessages()
    required.feed(template)
    missing = required.messages - english.keys()
    if missing:
        raise RuntimeError(f"en: missing UI messages: {', '.join(sorted(missing))}")
    if messages.keys() != english.keys():
        raise RuntimeError(f"Incomplete translation catalog: {language}")
    for key, translation in messages.items():
        if type(translation) is not type(english[key]):
            raise RuntimeError(f"Translation type differs from English for {language}: {key}")
    return messages


def _read_catalog(language: str) -> dict:
    path = LOCALES_PATH / f"{language}.json"
    try:
        messages = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as error:
        raise RuntimeError(f"{path}: invalid translation JSON: {error}") from error
    if not isinstance(messages, dict):
        raise RuntimeError(f"{path}: expected a translation object")
    for key, translation in messages.items():
        if isinstance(translation, dict):
            if "other" not in translation:
                raise RuntimeError(f"{path}: missing plural forms for {key}")
            forms = translation.values()
        else:
            forms = [translation]
        placeholders = set(re.findall(r"\{(\w+)\}", key))
        for text in forms:
            if not isinstance(text, str) or not text.strip() or set(re.findall(r"\{(\w+)\}", text)) != placeholders:
                raise RuntimeError(f"{path}: invalid translation for {key}")
    return messages


class _TemplateMessages(HTMLParser):
    """Collect marked HTML messages and double-quoted literal t(...) calls."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.messages = set()
        self.text = None
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.in_script = tag == "script"
        if "data-i18n" in attrs:
            self.text = []
        for name in (attrs.get("data-i18n-attrs") or "").split():
            if name not in attrs or attrs[name] is None:
                raise RuntimeError(f"Missing translated attribute: {name}")
            self.messages.add(attrs[name])

    def handle_data(self, data):
        if self.text is not None:
            self.text.append(data)
        if self.in_script:
            # Skip comments and unrelated strings so examples and embedded text
            # cannot be mistaken for translation calls. No JS runtime is needed.
            tokens = (
                r'//[^\n]*|/\*[\s\S]*?\*/'  # Comments.
                r'|"(?:\\.|[^"\\])*"|\x27(?:\\.|[^\x27\\])*\x27|`(?:\\.|[^`\\])*`'  # Strings.
                r'|(?<![\w$.])t\s*\(\s*(?P<message>"(?:\\.|[^"\\])*")'  # Literal calls.
            )
            for match in re.finditer(tokens, data):
                if match["message"] is not None:
                    self.messages.add(json.loads(match["message"]))

    def handle_endtag(self, tag):
        if self.text is not None:
            self.messages.add("".join(self.text).strip())
            self.text = None
        if tag == "script":
            self.in_script = False


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
