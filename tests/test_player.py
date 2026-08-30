"""Outside-in browser checks for the player's interactive card behavior."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from .support import run_renderer


AGENT_BROWSER = shutil.which("agent-browser")
BROWSER_PROFILE = Path.home() / ".agent-browser" / "profiles" / "sjquant"
BROWSER_SESSION = f"cram-player-tests-{os.getpid()}"


@unittest.skipUnless(
    AGENT_BROWSER and BROWSER_PROFILE.is_dir(),
    "agent-browser and the sjquant browser profile are required for player checks",
)
class PlayerBrowserTests(unittest.TestCase):
    def test_given_an_mcq_card_when_answered_then_feedback_explanation_and_grade_are_visible(self):
        """Given an MCQ card, when answered, then its behavior is exposed through the player UI."""
        # Given
        deck = {
            "id": "player-browser-check",
            "title": "Player browser check",
            "cards": [
                {
                    "id": "mcq-card",
                    "type": "mcq",
                    "prompt": "Which option is correct?",
                    "answer": "Right",
                    "distractors": ["Wrong one", "Wrong two"],
                    "explanation": "Because the right option is right.",
                },
                {
                    "id": "basic-card",
                    "type": "basic",
                    "prompt": "Basic prompt",
                    "answer": "Basic answer",
                },
                {
                    "id": "basic-card-two",
                    "type": "basic",
                    "prompt": "Second basic prompt",
                    "answer": "Second basic answer",
                },
            ],
        }

        with tempfile.TemporaryDirectory() as directory:
            directory_path = Path(directory)
            deck_path = directory_path / "deck.json"
            output = directory_path / "deck.html"
            deck_path.write_text(json.dumps(deck), encoding="utf-8")
            rendered = run_renderer(deck_path, output, directory_path)
            self.assertEqual(rendered.returncode, 0, msg=rendered.stderr or rendered.stdout)

            # When
            self._close_browser()
            try:
                opened = self._browser("open", output.as_uri())
                self.assertEqual(opened.returncode, 0, msg=opened.stderr or opened.stdout)
                result = self._eval(
                    """
                    const checks = {};
                    const optionTexts = () => Array.from(
                      document.querySelectorAll('[data-testid="mcq-option"]')
                    ).map((button) => button.textContent);
                    const deck = window.CRAM_PLAYER.getState().deck;
                    checks.options = optionTexts();
                    checks.explanationHiddenBeforeAnswer = document.querySelector(
                      '[data-testid="mcq-explanation"]'
                    ).hidden;
                    checks.announcementLeaksExplanation = document.querySelector(
                      '#card-announcer'
                    ).textContent.includes(deck.cards[0].explanation);
                    const originalRandom = Math.random;
                    Math.random = () => 0;
                    window.CRAM_PLAYER.setDeck({ ...deck, cards: [deck.cards[0]] });
                    const orderAtZero = optionTexts();
                    Math.random = () => 0.99;
                    window.CRAM_PLAYER.setDeck({ ...deck, cards: [deck.cards[0]] });
                    const orderAtHigh = optionTexts();
                    Math.random = originalRandom;
                    checks.shuffledOrderChanged = orderAtZero.join('|') !== orderAtHigh.join('|');
                    window.CRAM_PLAYER.setDeck(deck);
                    const wrong = Array.from(
                      document.querySelectorAll('[data-testid="mcq-option"]')
                    ).find((button) => button.textContent !== deck.cards[0].answer);
                    wrong.click();
                    checks.gradeBeforeCheck = window.CRAM_PLAYER.getGrade('mcq-card') === undefined;
                    checks.explanationHiddenAfterSelection = document.querySelector(
                      '[data-testid="mcq-explanation"]'
                    ).hidden;
                    checks.checkEnabledAfterSelection = !document.querySelector(
                      '[data-testid="mcq-check-answer"]'
                    ).disabled;
                    checks.nextDisabledBeforeCheck = document.querySelector('#next-card').disabled;
                    const rightAfterSelection = Array.from(
                      document.querySelectorAll('[data-testid="mcq-option"]')
                    ).find((button) => button.textContent === deck.cards[0].answer);
                    rightAfterSelection.click();
                    checks.selectionCanChange = rightAfterSelection.getAttribute('aria-pressed') === 'true'
                      && wrong.getAttribute('aria-pressed') === 'false'
                      && Array.from(document.querySelectorAll('[data-testid="mcq-option"]'))
                        .every((button) => !button.disabled);
                    wrong.click();
                    document.querySelector('[data-testid="mcq-check-answer"]').click();
                    checks.incorrectFeedback = document.querySelector(
                      '[data-testid="mcq-feedback"]'
                    ).textContent;
                    checks.answerPageVisible = document.querySelector(
                      '[data-testid="mcq-check-answer"]'
                    ).hidden && !document.querySelector('[data-testid="mcq-feedback"]').hidden;
                    checks.explanationVisibleAfterCheck = !document.querySelector(
                      '[data-testid="mcq-explanation"]'
                    ).hidden;
                    checks.incorrectGrade = window.CRAM_PLAYER.getGrade('mcq-card');
                    checks.nextEnabledAfterCheck = !document.querySelector('#next-card').disabled;
                    document.querySelector('#next-card').click();
                    checks.basicNextDisabledBeforeGrade = document.querySelector('#next-card').disabled;
                    document.querySelector('[data-testid="reveal-answer"]').click();
                    document.querySelector('[data-testid="grade-known"]').click();
                    checks.basicNextEnabledAfterGrade = !document.querySelector('#next-card').disabled;
                    document.querySelector('#previous-card').click();
                    checks.restoredGrade = window.CRAM_PLAYER.getGrade('mcq-card');
                    checks.restoredOptionsDisabled = Array.from(
                      document.querySelectorAll('[data-testid="mcq-option"]')
                    ).every((button) => button.disabled);
                    window.CRAM_PLAYER.setDeck(deck);
                    const right = Array.from(
                      document.querySelectorAll('[data-testid="mcq-option"]')
                    ).find((button) => button.textContent === deck.cards[0].answer);
                    right.click();
                    document.querySelector('[data-testid="mcq-check-answer"]').click();
                    checks.correctGrade = window.CRAM_PLAYER.getGrade('mcq-card');
                    JSON.stringify(checks);
                    """
                )
            finally:
                self._close_browser()

        # Then
        self.assertEqual(set(result["options"]), {"Right", "Wrong one", "Wrong two"})
        self.assertEqual(len(result["options"]), 3)
        self.assertTrue(result["explanationHiddenBeforeAnswer"])
        self.assertFalse(result["announcementLeaksExplanation"])
        self.assertTrue(result["shuffledOrderChanged"])
        self.assertTrue(result["gradeBeforeCheck"])
        self.assertTrue(result["explanationHiddenAfterSelection"])
        self.assertTrue(result["checkEnabledAfterSelection"])
        self.assertTrue(result["selectionCanChange"])
        self.assertTrue(result["nextDisabledBeforeCheck"])
        self.assertIn("Incorrect.", result["incorrectFeedback"])
        self.assertTrue(result["answerPageVisible"])
        self.assertTrue(result["explanationVisibleAfterCheck"])
        self.assertEqual(result["incorrectGrade"], "incorrect")
        self.assertTrue(result["nextEnabledAfterCheck"])
        self.assertTrue(result["basicNextDisabledBeforeGrade"])
        self.assertTrue(result["basicNextEnabledAfterGrade"])
        self.assertEqual(result["restoredGrade"], "incorrect")
        self.assertTrue(result["restoredOptionsDisabled"])
        self.assertEqual(result["correctGrade"], "correct")

    @classmethod
    def _browser(cls, *arguments: str, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
        if AGENT_BROWSER is None:  # pragma: no cover - guarded by skipUnless
            raise unittest.SkipTest("agent-browser is not installed")
        return subprocess.run(
            [
                AGENT_BROWSER,
                "--session",
                BROWSER_SESSION,
                "--profile",
                str(BROWSER_PROFILE),
                *arguments,
            ],
            input=input_text,
            capture_output=True,
            text=True,
            check=False,
        )

    @classmethod
    def _close_browser(cls) -> None:
        if AGENT_BROWSER:
            subprocess.run(
                [AGENT_BROWSER, "--session", BROWSER_SESSION, "close"],
                capture_output=True,
                text=True,
                check=False,
            )

    @classmethod
    def _eval(cls, script: str) -> dict:
        result = cls._browser("eval", "--stdin", input_text=script)
        if result.returncode != 0:
            raise AssertionError(result.stderr or result.stdout)
        value = json.loads(result.stdout)
        if isinstance(value, str):
            value = json.loads(value)
        if not isinstance(value, dict):
            raise AssertionError(f"browser evaluation returned {value!r}")
        return value


if __name__ == "__main__":
    unittest.main()
