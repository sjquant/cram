"""Integration checks for the renderer's public deck-in/HTML-out command."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from .support import RENDERER, TEMPLATE, fixture_paths, read_deck, run_renderer

BASELINE_SCRIPT_CLOSES = TEMPLATE.read_text(encoding="utf-8").count("</script>")


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

                result = run_renderer(deck_path, output, Path(directory))

                self.assertEqual(
                    result.returncode,
                    0,
                    msg=result.stderr or result.stdout,
                )
                self.assertTrue(output.is_file())
                html = output.read_text(encoding="utf-8")
                self.assertIn("<!doctype html>", html.lower())
                match = re.search(
                    r"window\.__DECK__\s*=\s*(?P<deck>.*?);\s*</script>",
                    html,
                    flags=re.DOTALL,
                )
                self.assertIsNotNone(match, "the output should inject window.__DECK__ as JSON")
                if match is None:
                    continue
                try:
                    rendered_deck = json.loads(match.group("deck"))
                except json.JSONDecodeError as error:
                    self.fail(f"the injected deck should be valid JSON: {error}")
                self.assertEqual(rendered_deck, deck)

                self.assertEqual(
                    html.count("</script>"),
                    BASELINE_SCRIPT_CLOSES,
                    "card text must never add a closing </script> tag beyond the template's own; "
                    "this only holds if injected '<' characters are escaped",
                )
                self.assertNotIn("__CRAM_MODE__", html)
                self.assertNotIn("INJECT_MODE", html)

    def test_given_a_valid_deck_when_rendered_then_it_includes_only_a_passive_attribution_link(self):
        """Given a valid deck, when rendered, then attribution is a plain link without external resources."""

        deck_path = fixture_paths("valid")[0]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "deck.html"
            result = run_renderer(deck_path, output, Path(directory))

            self.assertEqual(result.returncode, 0, msg=result.stderr or result.stdout)
            html = output.read_text(encoding="utf-8")

            self.assertIn(
                '<a href="https://github.com/sjquant/cram">Made with Cram</a>',
                html,
            )
            self.assertNotRegex(
                html,
                r"<(?:img|iframe|script|link|source|video|audio|object|embed)\b[^>]*"
                r"(?:src|href|data)\s*=\s*['\"]https?://",
                "the attribution must not add a page-load external resource",
            )

    def test_given_the_removed_mode_option_when_rendered_then_the_cli_rejects_it(self):
        """Given the removed mode option, when passed to the CLI, then it is rejected."""

        deck_path = fixture_paths("valid")[0]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "deck.html"
            result = subprocess.run(
                [
                    sys.executable,
                    str(RENDERER),
                    str(deck_path),
                    "-o",
                    str(output),
                    "--mode",
                    "cram",
                ],
                cwd=directory,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(output.exists())

    def test_given_an_invalid_deck_when_rendered_then_it_is_rejected_without_html(self):
        """Given an invalid deck, when rendered, then the CLI rejects it without HTML."""

        invalid = fixture_paths("invalid")

        self.assertTrue(invalid, "the invalid fixture directory should contain decks")
        for deck_path in invalid:
            with self.subTest(fixture=deck_path.name), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "deck.html"

                result = run_renderer(deck_path, output, Path(directory))

                self.assertNotEqual(result.returncode, 0, msg=result.stdout)
                self.assertFalse(output.exists())
                message = result.stderr
                self.assertTrue(message.strip(), "rejections should explain the input error")
                self.assertIn(deck_path.name, message)
                if deck_path.name == "malformed-json.json":
                    self.assertRegex(message, r"line \d+, column \d+")
                else:
                    self.assertIn(EXPECTED_DIAGNOSTICS[deck_path.name], message)


EXPECTED_DIAGNOSTICS = {
    "cloze-with-empty-alternative.json": "card 0 field 'prompt'",
    "cloze-without-a-blank.json": "card 0 field 'prompt'",
    "deck-id-not-a-slug.json": "deck field 'id'",
    "duplicate-card-ids.json": "card 1 field 'id'",
    "empty-deck.json": "deck field 'cards'",
    "mcq-without-distractors.json": "card 0 field 'distractors'",
    "missing-required-field.json": "card 1 field 'answer'",
    "unknown-card-type.json": "card 0 field 'type'",
    "whitespace-only-prompt.json": "card 0 field 'prompt'",
}
