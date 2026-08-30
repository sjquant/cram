"""Smoke checks for the committed deck contract and fixture inventory."""

from __future__ import annotations

import json
import unittest

from .support import fixture_paths, read_deck


class FixtureContractTests(unittest.TestCase):
    def test_given_valid_fixtures_when_loaded_then_each_has_a_renderable_deck_shape(self):
        """Given valid fixture JSON, when loaded, then each deck is renderable."""

        valid = fixture_paths("valid")

        self.assertTrue(valid, "the valid fixture directory should contain decks")
        for path in valid:
            with self.subTest(fixture=path.name):
                deck = read_deck(path)
                self.assertIsInstance(deck.get("id"), str)
                self.assertTrue(deck["id"])
                self.assertIsInstance(deck.get("title"), str)
                self.assertTrue(deck["title"])
                self.assertIsInstance(deck.get("cards"), list)
                self.assertTrue(deck["cards"])

    def test_given_invalid_fixtures_when_loaded_then_only_parse_failures_are_unreadable(self):
        """Given invalid fixture JSON, when loaded, then only the malformed file fails to parse."""

        invalid = fixture_paths("invalid")

        self.assertTrue(invalid, "the invalid fixture directory should contain decks")
        parse_failures = []
        for path in invalid:
            with self.subTest(fixture=path.name):
                try:
                    read_deck(path)
                except json.JSONDecodeError:
                    parse_failures.append(path)

        malformed = next(
            (path for path in invalid if path.name == "malformed-json.json"),
            None,
        )
        if malformed is not None:
            self.assertEqual(parse_failures, [malformed])
