"""Integration checks for the renderer's public deck-in/HTML-out command."""

from __future__ import annotations

import json
import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

from .support import RENDERER, TEMPLATE, fixture_paths, read_deck, run_renderer

BASELINE_SCRIPT_CLOSES = TEMPLATE.read_text(encoding="utf-8").count("</script>")


@unittest.skipUnless(
    RENDERER.is_file(),
    "the renderer CLI is added by the renderer slice; public-interface tests will then run",
)
class RendererCliTests(unittest.TestCase):
    def test_shared_quizzes_expose_safe_deck_metadata_without_running_scripts(self):
        # Given a title with Unicode, HTML, quotes, and an injection-marker lookalike.
        deck = read_deck(fixture_paths("valid")[0])
        deck["title"] = '한국어 </title><script>alert("x")</script> & __CRAM_DECK__'
        template_head = _HeadMetadata()
        template_head.feed(TEMPLATE.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.json"
            output = Path(directory) / "quiz.html"
            source.write_text(json.dumps(deck), encoding="utf-8")

            # When a link crawler reads the generated HTML without executing JavaScript.
            result = run_renderer(source, output, Path(directory))
            self.assertEqual(result.returncode, 0, result.stderr)
            html = output.read_text(encoding="utf-8")
            head = _HeadMetadata()
            head.feed(html)

            # Then the original title is text, not markup, and no hosted URL is invented.
            self.assertEqual(head.title, deck["title"] + " — Cram")
            self.assertEqual(head.meta["og:title"], deck["title"])
            self.assertEqual(head.meta["twitter:title"], deck["title"])
            self.assertIn(str(len(deck["cards"])), head.meta["description"])
            self.assertEqual(head.meta["description"], head.meta["og:description"])
            self.assertEqual(head.meta["description"], head.meta["twitter:description"])
            self.assertEqual(head.scripts, template_head.scripts)
            self.assertNotIn("og:url", head.meta)
            self.assertNotIn("og:image", head.meta)
            self.assertNotIn("twitter:image", head.meta)

    def test_metadata_descriptions_follow_the_selected_player_language(self):
        # Given a deck that can be shared with any supported player language.
        source = fixture_paths("valid")[0]
        expected = {"en": "Flashcards:", "ko": "퀴즈", "ja": "クイズ", "zh-CN": "道题", "es": "Tarjetas:", "fr": "Cartes :"}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "quiz.html"
            for language, text in expected.items():
                with self.subTest(language=language):
                    # When the public renderer is invoked with that language.
                    result = run_renderer(source, output, Path(directory), language=language)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    head = _HeadMetadata()
                    head.feed(output.read_text(encoding="utf-8"))
                    # Then the description is localized and all placeholders are resolved.
                    self.assertIn(text, head.meta["og:description"])
                    self.assertNotIn("{count}", head.meta["og:description"])

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

    def test_given_a_valid_deck_when_rendered_then_it_includes_only_a_passive_attribution_link(self):
        """Given a valid deck, when rendered, then attribution is a plain link without external resources."""

        deck_path = fixture_paths("valid")[0]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "deck.html"
            result = run_renderer(deck_path, output, Path(directory))

            self.assertEqual(result.returncode, 0, msg=result.stderr or result.stdout)
            html = output.read_text(encoding="utf-8")

            self.assertRegex(
                html,
                r'<a\b[^>]*href="https://github.com/sjquant/cram"[^>]*>Made with Cram</a>',
            )
            self.assertNotRegex(
                html,
                r"<(?:img|iframe|script|link|source|video|audio|object|embed)\b[^>]*"
                r"(?:src|href|data)\s*=\s*['\"]https?://",
                "the attribution must not add a page-load external resource",
            )

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


class _HeadMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.in_title = False
        self.title = ""
        self.meta = {}
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        if not self.in_head:
            return
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            self.meta[attrs.get("property") or attrs.get("name")] = attrs.get("content")
        elif tag == "script":
            self.scripts += 1

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        elif tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_head and self.in_title:
            self.title += data


EXPECTED_DIAGNOSTICS = {
    "cloze-with-empty-alternative.json": "card 0 field 'prompt'",
    "cloze-without-a-blank.json": "card 0 field 'prompt'",
    "deck-id-not-a-slug.json": "deck field 'id'",
    "duplicate-card-ids.json": "card 1 field 'id'",
    "empty-deck.json": "deck field 'cards'",
    "mcq-without-distractors.json": "card 0 field 'distractors'",
    "mcq-with-duplicate-distractors.json": "card 0 field 'distractors'",
    "mcq-with-too-many-distractors.json": "card 0 field 'distractors'",
    "missing-required-field.json": "card 1 field 'answer'",
    "unknown-card-type.json": "card 0 field 'type'",
    "whitespace-only-prompt.json": "card 0 field 'prompt'",
}
