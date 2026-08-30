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
        """
        # Given
        A deck JSON document from the valid fixture directory.

        # When
        It is loaded through the public file interface.

        # Then
        Validation succeeds and returns a non-empty deck.
        """
        for path in sorted(VALID.glob("*.json")):
            with self.subTest(path=path.name):
                deck = load_deck(path)
                self.assertIsInstance(deck, dict)
                self.assertGreaterEqual(len(deck["cards"]), 1)

    def test_invalid_fixtures_are_rejected_with_actionable_messages(self):
        """
        # Given
        A deck JSON document from the invalid fixture directory.

        # When
        It is loaded through the public file interface.

        # Then
        Validation fails with the offending field, or parsing fails with file location details.
        """
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
                if path.name == "malformed-json.json":
                    with self.assertRaises(DeckParseError) as context:
                        load_deck(path)
                    message = str(context.exception)
                    self.assertIn(str(path), message)
                    self.assertRegex(message, r"line \d+, column \d+")
                else:
                    with self.assertRaises(DeckValidationError) as context:
                        load_deck(path)
                    message = str(context.exception)
                    self.assertIn(expected_fields[path.name], message)
                    if path.name not in {"deck-id-not-a-slug.json", "empty-deck.json"}:
                        self.assertRegex(message, r"card \d+ field '")

    def test_duplicate_ids_identify_the_later_card(self):
        """
        # Given
        A deck containing the same card id twice.

        # When
        Validation runs.

        # Then
        The later card's id field is identified as the duplicate.
        """
        with self.assertRaises(DeckValidationError) as context:
            load_deck(INVALID / "duplicate-card-ids.json")
        self.assertIn("card 1 field 'id'", str(context.exception))

    def test_decoded_non_object_is_rejected(self):
        """
        # Given
        A decoded value that is not a deck object.

        # When
        Validation runs.

        # Then
        The root deck field is named in the validation error.
        """
        with self.assertRaises(DeckValidationError) as context:
            validate_deck([])
        self.assertIn("deck field 'root'", str(context.exception))

    def test_deeply_nested_invalid_json_is_readable(self):
        """
        # Given
        Malformed JSON nested deeper than the standard decoder can recurse.

        # When
        It is parsed with a source filename.

        # Then
        A readable parse error includes the source, line, column, and depth problem.
        """
        with self.assertRaises(DeckParseError) as context:
            parse_deck("[" * 200_000, source="deep.json")
        message = str(context.exception)
        self.assertIn("deep.json", message)
        self.assertRegex(message, r"line \d+, column \d+")
        self.assertIn("nesting is too deep", message)

    def test_cli_reports_failures_without_tracebacks(self):
        """
        # Given
        Malformed and semantically invalid deck files.

        # When
        The CLI entry point validates each file.

        # Then
        It returns failure and prints a concise diagnostic without a traceback.
        """
        cases = (
            (INVALID / "malformed-json.json", "line ", "column "),
            (INVALID / "whitespace-only-prompt.json", "card 0 field 'prompt'", ""),
        )
        for path, expected_one, expected_two in cases:
            with self.subTest(path=path.name):
                stdout = io.StringIO()
                stderr = io.StringIO()
                with redirect_stdout(stdout), redirect_stderr(stderr):
                    status = main([str(path)])
                self.assertEqual(status, 1)
                self.assertEqual(stdout.getvalue(), "")
                message = stderr.getvalue()
                self.assertIn(str(path), message)
                self.assertIn(expected_one, message)
                if expected_two:
                    self.assertIn(expected_two, message)
                self.assertNotIn("Traceback", message)

    def test_module_execution_has_no_duplicate_import_warning(self):
        """
        # Given
        A valid deck file.

        # When
        The validator is executed as a Python module.

        # Then
        It succeeds without writing an import warning to stderr.
        """
        result = subprocess.run(
            [sys.executable, "-m", "skills.cram.scripts.validator", str(VALID / "minimal.json")],
            capture_output=True,
            text=True,
            check=False,
            cwd=ROOT,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")

    def test_card_type_controls_allowed_fields(self):
        """
        # Given
        A basic card containing a field allowed only on mcq cards.

        # When
        Validation runs.

        # Then
        The card's additional field is rejected by name.
        """
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
        with self.assertRaises(DeckValidationError) as context:
            validate_deck(deck)
        self.assertIn("card 0 field 'distractors'", str(context.exception))

    def test_unknown_or_unhashable_card_type_is_reported_at_type(self):
        """
        # Given
        A card whose type is unsupported and not hashable.

        # When
        Validation runs.

        # Then
        The error names only the card's type field.
        """
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
        with self.assertRaises(DeckValidationError) as context:
            validate_deck(deck)
        message = str(context.exception)
        self.assertIn("card 0 field 'type'", message)
        self.assertNotIn("field 'items'", message)


if __name__ == "__main__":
    unittest.main()
