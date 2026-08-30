import io
import subprocess
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from skills.cram.scripts.validator import (
    DeckParseError,
    DeckValidationError,
    load_deck,
    main,
    parse_deck,
    validate_deck,
)


ROOT = Path(__file__).resolve().parents[1]
VALID = ROOT / "fixtures" / "valid"
INVALID = ROOT / "fixtures" / "invalid"


class DeckValidatorTests(unittest.TestCase):
    def test_valid_fixtures_are_accepted(self):
        """Accept each deck JSON document from the valid fixture directory."""
        # Given
        valid_paths = sorted(VALID.glob("*.json"))
        # When
        for path in valid_paths:
            with self.subTest(path=path.name):
                deck = load_deck(path)
                # Then
                self.assertIsInstance(deck, dict)
                self.assertGreaterEqual(len(deck["cards"]), 1)

    def test_invalid_fixtures_are_rejected_with_actionable_messages(self):
        """Reject each invalid fixture with an actionable validation or parse error."""
        # Given
        expected_fields = {
            "cloze-without-a-blank.json": "prompt",
            "deck-id-not-a-slug.json": "id",
            "duplicate-card-ids.json": "id",
            "empty-deck.json": "cards",
            "mcq-without-distractors.json": "distractors",
            "missing-required-field.json": "answer",
            "unknown-card-type.json": "type",
            "whitespace-only-prompt.json": "prompt",
        }
        for path in sorted(INVALID.glob("*.json")):
            with self.subTest(path=path.name):
                # When
                if path.name == "malformed-json.json":
                    with self.assertRaises(DeckParseError) as context:
                        load_deck(path)
                    # Then
                    message = str(context.exception)
                    self.assertIn(str(path), message)
                    self.assertRegex(message, r"line \d+, column \d+")
                else:
                    with self.assertRaises(DeckValidationError) as context:
                        load_deck(path)
                    # Then
                    message = str(context.exception)
                    self.assertIn(expected_fields[path.name], message)
                    if path.name not in {"deck-id-not-a-slug.json", "empty-deck.json"}:
                        self.assertRegex(message, r"card \d+ field '")

    def test_duplicate_ids_identify_the_later_card(self):
        """Identify the later card when a deck repeats a card id."""
        # Given
        duplicate_deck = INVALID / "duplicate-card-ids.json"
        # When
        with self.assertRaises(DeckValidationError) as context:
            load_deck(duplicate_deck)
        # Then
        self.assertIn("card 1 field 'id'", str(context.exception))

    def test_decoded_non_object_is_rejected(self):
        """Name the root field when a decoded value is not a deck object."""
        # Given
        decoded_value = []
        # When
        with self.assertRaises(DeckValidationError) as context:
            validate_deck(decoded_value)
        # Then
        self.assertIn("deck field 'root'", str(context.exception))

    def test_deeply_nested_invalid_json_is_readable(self):
        """Report source and location when JSON nesting exceeds decoder depth."""
        # Given
        deeply_nested_json = "[" * 200_000
        # When
        with self.assertRaises(DeckParseError) as context:
            parse_deck(deeply_nested_json, source="deep.json")
        # Then
        message = str(context.exception)
        self.assertIn("deep.json", message)
        self.assertRegex(message, r"line \d+, column \d+")
        self.assertIn("nesting is too deep", message)

    def test_cli_reports_failures_without_tracebacks(self):
        """Return failure diagnostics without tracebacks for invalid CLI inputs."""
        # Given
        cases = (
            (INVALID / "malformed-json.json", "line ", "column "),
            (INVALID / "whitespace-only-prompt.json", "card 0 field 'prompt'", ""),
        )
        for path, expected_one, expected_two in cases:
            with self.subTest(path=path.name):
                stdout = io.StringIO()
                stderr = io.StringIO()
                # When
                with redirect_stdout(stdout), redirect_stderr(stderr):
                    status = main([str(path)])
                # Then
                self.assertEqual(status, 1)
                self.assertEqual(stdout.getvalue(), "")
                message = stderr.getvalue()
                self.assertIn(str(path), message)
                self.assertIn(expected_one, message)
                if expected_two:
                    self.assertIn(expected_two, message)
                self.assertNotIn("Traceback", message)

    def test_module_execution_has_no_duplicate_import_warning(self):
        """Execute the validator module without duplicate-import warnings."""
        # Given
        valid_deck = VALID / "minimal.json"
        # When
        result = subprocess.run(
            [sys.executable, "-m", "skills.cram.scripts.validator", str(valid_deck)],
            capture_output=True,
            text=True,
            check=False,
            cwd=ROOT,
        )
        # Then
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")

    def test_card_type_controls_allowed_fields(self):
        """Reject fields that are not allowed by a card's declared type."""
        # Given
        deck = {
            "id": "field-check",
            "title": "Field check",
            "cards": [
                {
                    "id": "basic",
                    "type": "basic",
                    "prompt": "Question",
                    "answer": "Answer",
                    "distractors": ["wrong"],
                }
            ],
        }
        # When
        with self.assertRaises(DeckValidationError) as context:
            validate_deck(deck)
        # Then
        self.assertIn("card 0 field 'distractors'", str(context.exception))

    def test_unknown_or_unhashable_card_type_is_reported_at_type(self):
        """Report only the type field for an unsupported unhashable card type."""
        # Given
        deck = {
            "id": "type-check",
            "title": "Type check",
            "cards": [
                {
                    "id": "unknown",
                    "type": ["basic"],
                    "items": ["not supported"],
                }
            ],
        }
        # When
        with self.assertRaises(DeckValidationError) as context:
            validate_deck(deck)
        # Then
        message = str(context.exception)
        self.assertIn("card 0 field 'type'", message)
        self.assertNotIn("field 'items'", message)


if __name__ == "__main__":
    unittest.main()
