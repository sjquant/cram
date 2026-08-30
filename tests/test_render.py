"""Integration checks for the renderer's public deck-in/HTML-out command."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from .support import RENDERER, fixture_paths, read_deck, run_renderer


@unittest.skipUnless(
    RENDERER.is_file(),
    "the renderer CLI is added by the renderer slice; public-interface tests will then run",
)
class RendererCliTests(unittest.TestCase):
    def test_given_a_valid_deck_when_rendered_then_it_writes_self_contained_html(self):
        """Given a valid deck, when rendered, then the CLI writes self-contained HTML."""

        valid = fixture_paths("valid")

        self.assertTrue(valid, "the valid fixture directory should contain decks")
        for deck_path in valid:
            with self.subTest(fixture=deck_path.name), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "deck.html"
                deck = read_deck(deck_path)

                result = run_renderer(deck_path, output)

                self.assertEqual(
                    result.returncode,
                    0,
                    msg=result.stderr or result.stdout,
                )
                self.assertTrue(output.is_file())
                html = output.read_text(encoding="utf-8")
                self.assertIn("<!doctype html>", html.lower())
                self.assertIn("window.__DECK__", html)
                self.assertIn(deck["id"], html)

    def test_given_an_invalid_deck_when_rendered_then_it_is_rejected_without_html(self):
        """Given an invalid deck, when rendered, then the CLI rejects it without HTML."""

        invalid = fixture_paths("invalid")

        self.assertTrue(invalid, "the invalid fixture directory should contain decks")
        for deck_path in invalid:
            with self.subTest(fixture=deck_path.name), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "deck.html"

                result = run_renderer(deck_path, output)

                self.assertNotEqual(result.returncode, 0, msg=result.stdout)
                self.assertFalse(output.exists())
                self.assertTrue(result.stderr.strip(), "rejections should explain the input error")
