#!/usr/bin/env python3
"""Validate cram deck JSON without third-party dependencies.

The JSON Schema in ``skills/cram/schema/deck.schema.json`` is deliberately
small.  This module implements the useful runtime subset directly so the
renderer can validate a deck on machines that only have the Python standard
library installed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence


class DeckValidationError(ValueError):
    """Raised when a decoded value is not a valid cram deck."""

    def __init__(self, errors: Iterable[str], *, source: str | Path | None = None) -> None:
        self.errors = tuple(errors)
        self.source = str(source) if source is not None else None
        super().__init__(self._format_message())

    def _format_message(self) -> str:
        heading = f"{self.source}: invalid deck" if self.source else "invalid deck"
        if not self.errors:
            return heading
        details = "\n".join(f"- {error}" for error in self.errors)
        return f"{heading}:\n{details}"


class DeckParseError(DeckValidationError):
    """Raised when a deck file or JSON document cannot be parsed."""


def main(argv: Sequence[str] | None = None) -> int:
    """Validate one deck file, reporting failures without a traceback."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck", type=Path, help="path to a deck JSON file")
    args = parser.parse_args(argv)

    try:
        load_deck(args.deck)
    except DeckValidationError as error:
        print(error, file=sys.stderr)
        return 1

    print(f"valid deck: {args.deck}")
    return 0


def load_deck(path: str | Path) -> dict[str, Any]:
    """Read, parse, and validate a deck JSON file.

    Parse errors include the filename and the line and column reported by the
    standard-library JSON decoder.  Files that decode successfully but violate
    the deck contract raise :class:`DeckValidationError`.
    """

    deck_path = Path(path)
    source = str(deck_path)
    try:
        text = deck_path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise DeckParseError(
            (f"file encoding is not valid UTF-8 near byte {error.start}",),
            source=source,
        ) from None
    except OSError as error:
        detail = error.strerror or str(error)
        raise DeckParseError((f"unable to read file: {detail}",), source=source) from None

    return parse_deck(text, source=source)


def parse_deck(text: str, *, source: str | Path | None = None) -> dict[str, Any]:
    """Parse and validate a JSON document containing a cram deck."""

    display_source = str(source) if source is not None else "<string>"
    try:
        deck = json.loads(text)
    except json.JSONDecodeError as error:
        location = f"line {error.lineno}, column {error.colno}"
        detail = f"invalid JSON: {error.msg}"
        raise DeckParseError((f"{location}: {detail}",), source=display_source) from None
    except RecursionError:
        line, column = _input_end_location(text)
        detail = "invalid JSON: nesting is too deep for the standard-library decoder"
        raise DeckParseError((f"line {line}, column {column}: {detail}",), source=display_source) from None

    return validate_deck(deck, source=source)


def _input_end_location(text: str) -> tuple[int, int]:
    """Return a useful line/column location for decoder depth failures."""

    line = text.count("\n") + 1
    column = len(text.rsplit("\n", 1)[-1]) + 1
    return line, column


def validate_deck(deck: Any, *, source: str | Path | None = None) -> dict[str, Any]:
    """Validate a decoded deck and return it unchanged when it is valid.

    All card diagnostics identify the zero-based card index and the offending
    field.  Multiple independent problems are reported together so callers can
    correct a generated deck in one pass.
    """

    errors: list[str] = []
    _collect_errors(deck, errors)
    if errors:
        raise DeckValidationError(errors, source=source)
    return deck


def _collect_errors(deck: Any, errors: list[str]) -> None:
    if not isinstance(deck, dict):
        errors.append("deck field 'root': must be an object")
        return

    _validate_root(deck, errors)

    cards = deck.get("cards")
    if not isinstance(cards, list):
        return

    seen_ids: dict[str, int] = {}
    for index, card in enumerate(cards):
        _validate_card(card, index, errors, seen_ids)


def _validate_root(deck: dict[str, Any], errors: list[str]) -> None:
    _check_required(deck, ("id", "title", "cards"), "deck", errors)
    _check_additional(deck, {"id", "title", "source", "cards"}, "deck", errors)

    if "id" in deck:
        _validate_slug(deck["id"], "deck", "id", errors)
    if "title" in deck:
        _validate_non_empty_string(deck["title"], "deck", "title", errors)
    if "source" in deck:
        _validate_non_empty_string(deck["source"], "deck", "source", errors)

    if "cards" in deck:
        cards = deck["cards"]
        if not isinstance(cards, list):
            errors.append("deck field 'cards': must be an array")
        elif not cards:
            errors.append("deck field 'cards': must contain at least one card")


def _validate_card(
    card: Any,
    index: int,
    errors: list[str],
    seen_ids: dict[str, int],
) -> None:
    if not isinstance(card, dict):
        errors.append(f"card {index} field 'card': must be an object")
        return

    prefix = f"card {index}"
    card_type = card.get("type")
    if "type" not in card:
        errors.append(f"{prefix} field 'type': is required")
        return
    if not isinstance(card_type, str) or card_type not in {"basic", "mcq", "cloze"}:
        errors.append(f"{prefix} field 'type': must be one of 'basic', 'mcq', or 'cloze'")
        return

    allowed_fields = {
        "basic": {"id", "type", "prompt", "answer", "hint", "explanation"},
        "mcq": {"id", "type", "prompt", "answer", "distractors", "hint", "explanation"},
        "cloze": {"id", "type", "prompt", "hint", "explanation"},
    }[card_type]
    _check_additional(card, allowed_fields, prefix, errors)

    required = {
        "basic": ("id", "type", "prompt", "answer"),
        "mcq": ("id", "type", "prompt", "answer", "distractors"),
        "cloze": ("id", "type", "prompt"),
    }[card_type]
    _check_required(card, required, prefix, errors)

    if "id" in card:
        _validate_non_empty_string(card["id"], prefix, "id", errors)
        card_id = card["id"]
        if isinstance(card_id, str) and card_id.strip():
            previous_index = seen_ids.get(card_id)
            if previous_index is not None:
                errors.append(
                    f"{prefix} field 'id': duplicate card id {card_id!r}; "
                    f"already used by card {previous_index}"
                )
            else:
                seen_ids[card_id] = index

    if card_type == "basic":
        _validate_basic_card(card, prefix, errors)
    elif card_type == "mcq":
        _validate_mcq_card(card, prefix, errors)
    else:
        _validate_cloze_card(card, prefix, errors)


def _validate_basic_card(card: dict[str, Any], prefix: str, errors: list[str]) -> None:
    if "prompt" in card:
        _validate_non_empty_string(card["prompt"], prefix, "prompt", errors)
    if "answer" in card:
        _validate_non_empty_string(card["answer"], prefix, "answer", errors)
    _validate_optional_text(card, prefix, "hint", errors)
    _validate_optional_text(card, prefix, "explanation", errors)


def _validate_mcq_card(card: dict[str, Any], prefix: str, errors: list[str]) -> None:
    if "prompt" in card:
        _validate_non_empty_string(card["prompt"], prefix, "prompt", errors)
    if "answer" in card:
        _validate_non_empty_string(card["answer"], prefix, "answer", errors)
    if "distractors" in card:
        _validate_distractors(card["distractors"], prefix, errors)
    if (
        isinstance(card.get("answer"), str)
        and isinstance(card.get("distractors"), list)
        and card["answer"] in card["distractors"]
    ):
        errors.append(f"{prefix} field 'distractors': must not contain the answer")
    _validate_optional_text(card, prefix, "hint", errors)
    _validate_optional_text(card, prefix, "explanation", errors)


def _validate_cloze_card(card: dict[str, Any], prefix: str, errors: list[str]) -> None:
    if "prompt" in card:
        prompt = card["prompt"]
        if not isinstance(prompt, str):
            errors.append(f"{prefix} field 'prompt': must be a string")
        else:
            blanks = list(_CLOZE_BLANK.finditer(prompt))
            if not blanks:
                errors.append(f"{prefix} field 'prompt': must contain at least one {{{{answer}}}} blank")
            elif any(not part.strip() for blank in blanks for part in blank.group(1).split("|")):
                errors.append(
                    f"{prefix} field 'prompt': each {{{{answer}}}} alternative must be non-empty"
                )
    _validate_optional_text(card, prefix, "hint", errors)
    _validate_optional_text(card, prefix, "explanation", errors)


def _validate_distractors(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, list):
        errors.append(f"{prefix} field 'distractors': must be an array")
        return
    if len(value) < 1:
        errors.append(f"{prefix} field 'distractors': must contain at least one item")
    if len(value) > 5:
        errors.append(f"{prefix} field 'distractors': must contain at most five items")

    seen: set[str] = set()
    for item in value:
        _validate_non_empty_string(item, prefix, "distractors", errors)
        if isinstance(item, str):
            if item in seen:
                errors.append(f"{prefix} field 'distractors': items must be unique")
            seen.add(item)


def _validate_optional_text(
    card: dict[str, Any], prefix: str, field: str, errors: list[str]
) -> None:
    if field in card:
        _validate_non_empty_string(card[field], prefix, field, errors)


def _validate_slug(value: Any, owner: str, field: str, errors: list[str]) -> None:
    if not isinstance(value, str):
        errors.append(f"{owner} field '{field}': must be a string")
    elif not _SLUG.fullmatch(value):
        errors.append(f"{owner} field '{field}': must be lowercase kebab-case")


def _validate_non_empty_string(
    value: Any, owner: str, field: str, errors: list[str]
) -> None:
    if not isinstance(value, str):
        errors.append(f"{owner} field '{field}': must be a string")
    elif not value or not _NON_WHITESPACE.search(value):
        errors.append(f"{owner} field '{field}': must contain a non-whitespace character")


def _check_required(
    value: dict[str, Any], required: Iterable[str], owner: str, errors: list[str]
) -> None:
    for field in required:
        if field not in value:
            errors.append(f"{owner} field '{field}': is required")


def _check_additional(
    value: dict[str, Any], allowed: set[str], owner: str, errors: list[str]
) -> None:
    for field in value:
        if field not in allowed:
            errors.append(f"{owner} field '{field}': is not allowed")


_NON_WHITESPACE = re.compile(r"\S")
_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_CLOZE_BLANK = re.compile(r"\{\{([^{}]*)\}\}")


if __name__ == "__main__":
    raise SystemExit(main())
