import unittest
from pathlib import Path

from skills.cram.scripts.validator import DeckParseError, DeckValidationError, load_deck, validate_deck


ROOT = Path(__file__).resolve().parents[1]
VALID = ROOT / "fixtures" / "valid"
INVALID = ROOT / "fixtures" / "invalid"


class DeckValidatorTests(unittest.TestCase):
    def test_valid_fixtures_are_accepted(self):
        """Given each valid fixture, when it is loaded, then validation succeeds."""
        for path in sorted(VALID.glob("*.json")):
            with self.subTest(path=path.name):
                deck = load_deck(path)
                self.assertIsInstance(deck, dict)
                self.assertGreaterEqual(len(deck["cards"]), 1)

    def test_invalid_fixtures_are_rejected_with_actionable_messages(self):
        """Given each invalid fixture, when it is loaded, then its error identifies the problem."""
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
        """Given duplicate ids, when validation runs, then the later card is named."""
        with self.assertRaises(DeckValidationError) as context:
            load_deck(INVALID / "duplicate-card-ids.json")
        self.assertIn("card 1 field 'id'", str(context.exception))

    def test_decoded_non_object_is_rejected(self):
        """Given JSON containing a scalar, when validation runs, then root and field are named."""
        with self.assertRaises(DeckValidationError) as context:
            validate_deck([])
        self.assertIn("deck field 'root'", str(context.exception))

    def test_card_type_controls_allowed_fields(self):
        """Given a basic card with an mcq-only field, when validation runs, then that field is rejected."""
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
        """Given an unsupported card type value, when validation runs, then only type is reported."""
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
