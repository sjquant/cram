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
                    const shell = document.querySelector('.app-shell');
                    const shellBounds = shell.getBoundingClientRect();
                    const shellStyles = getComputedStyle(shell);
                    checks.shellFillsViewport = Math.abs(shellBounds.height - window.innerHeight) < 1
                      && Math.abs(shellBounds.bottom - window.innerHeight) < 1;
                    checks.shellGuttersBalanced = Math.abs(
                      parseFloat(shellStyles.paddingTop) - parseFloat(shellStyles.paddingBottom)
                    ) < 1;
                    checks.cardAreaScrolls = getComputedStyle(document.querySelector('.card-frame')).overflowY === 'auto';
                    checks.navigationHintMarked = document.querySelector('#player-status')
                      .classList.contains('is-navigation-hint');
                    checks.navigationButtonsActiveAfterLoad = !document.querySelector('#next-card').disabled
                      && document.querySelector('#previous-card').disabled;
                    checks.navigationVisibleAfterLoad = getComputedStyle(
                      document.querySelector('.navigation')
                    ).visibility !== 'hidden';
                    const footerBounds = document.querySelector('.player-footer').getBoundingClientRect();
                    checks.footerMatchesShellGutter = Math.abs(
                      window.innerHeight - footerBounds.bottom - parseFloat(shellStyles.paddingBottom)
                    ) < 1;
                    const previousPaddingLeft = parseFloat(
                      getComputedStyle(document.querySelector('#previous-card')).paddingLeft
                    );
                    const previousPaddingRight = parseFloat(
                      getComputedStyle(document.querySelector('#previous-card')).paddingRight
                    );
                    const skipPaddingLeft = parseFloat(
                      getComputedStyle(document.querySelector('#next-card')).paddingLeft
                    );
                    const skipPaddingRight = parseFloat(
                      getComputedStyle(document.querySelector('#next-card')).paddingRight
                    );
                    checks.previousMatchesSkipPadding = Math.abs(
                      previousPaddingLeft - skipPaddingLeft
                    ) < 1 && Math.abs(
                      previousPaddingRight - skipPaddingRight
                    ) < 1;
                    checks.explanationHiddenBeforeAnswer = document.querySelector(
                      '[data-testid="mcq-explanation"]'
                    ).hidden;
                    const optionBounds = document.querySelector(
                      '[data-testid="mcq-options"]'
                    ).getBoundingClientRect();
                    const checkBounds = document.querySelector(
                      '[data-testid="mcq-check-answer"]'
                    ).getBoundingClientRect();
                    checks.checkAlignedToOptionRight = Math.abs(
                      checkBounds.right - optionBounds.right
                    ) < 1;
                    const nextBounds = document.querySelector('#next-card').getBoundingClientRect();
                    const promptBounds = document.querySelector('[data-testid="card-prompt"]')
                      .getBoundingClientRect();
                    checks.nextAlignedToOptionRight = Math.abs(
                      nextBounds.right - optionBounds.right
                    ) < 1;
                    checks.promptAlignedToOptionLeft = Math.abs(
                      promptBounds.left - optionBounds.left
                    ) < 1;
                    checks.nextIsSkipBeforeAnswer = document.querySelector('#next-card').textContent === 'Skip →'
                      && document.querySelector('#next-card').getAttribute('aria-label') === 'Skip to next card'
                      && document.querySelector('#next-card').classList.contains('is-skip')
                      && !document.querySelector('#next-card').disabled;
                    const initialIndex = window.CRAM_PLAYER.getState().index;
                    document.querySelector('#next-card').click();
                    checks.skipMovesWithoutGrade = window.CRAM_PLAYER.getState().index === initialIndex + 1
                      && window.CRAM_PLAYER.getGrade('mcq-card') === undefined;
                    document.querySelector('#previous-card').click();
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
                    checks.nextIsSkipBeforeCheck = document.querySelector('#next-card').textContent === 'Skip →'
                      && !document.querySelector('#next-card').disabled;
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
                    checks.nextIsNextAfterCheck = document.querySelector('#next-card').textContent === 'Next →'
                      && document.querySelector('#next-card').getAttribute('aria-label') === 'Next card'
                      && !document.querySelector('#next-card').classList.contains('is-skip');
                    document.querySelector('#next-card').click();
                    checks.basicNextIsSkipBeforeGrade = document.querySelector('#next-card').textContent === 'Skip →'
                      && !document.querySelector('#next-card').disabled;
                    document.querySelector('[data-testid="reveal-answer"]').click();
                    document.querySelector('[data-testid="grade-known"]').click();
                    checks.basicNextEnabledAfterGrade = !document.querySelector('#next-card').disabled;
                    checks.basicNextIsNextAfterGrade = document.querySelector('#next-card').textContent === 'Next →'
                      && !document.querySelector('#next-card').classList.contains('is-skip');
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
                    checks.navigationHintClearedAfterFeedback = !document.querySelector('#player-status')
                      .classList.contains('is-navigation-hint');
                    window.CRAM_PLAYER.setDeck({
                      id: 'layout-check',
                      title: 'Layout check',
                      cards: [
                        {
                          id: 'long-card',
                          type: 'basic',
                          prompt: 'Long prompt '.repeat(80),
                          answer: 'Long answer '.repeat(120)
                        },
                        {
                          id: 'next-card',
                          type: 'basic',
                          prompt: 'Next prompt',
                          answer: 'Next answer'
                        }
                      ]
                    });
                    const frame = document.querySelector('.card-frame');
                    const navigation = document.querySelector('.navigation');
                    const navigationBeforeScroll = navigation.getBoundingClientRect();
                    frame.scrollTop = frame.scrollHeight;
                    const navigationAfterScroll = navigation.getBoundingClientRect();
                    checks.navigationStableDuringCardScroll = Math.abs(
                      navigationBeforeScroll.top - navigationAfterScroll.top
                    ) < 1;
                    document.querySelector('#next-card').click();
                    checks.cardScrollResetsOnNext = frame.scrollTop === 0;
                    const revealBounds = document.querySelector('.reveal-button').getBoundingClientRect();
                    const frameBounds = frame.getBoundingClientRect();
                    checks.revealAlignedToCardRight = Math.abs(revealBounds.right - frameBounds.right) < 1;
                    JSON.stringify(checks);
                    """
                )
            finally:
                self._close_browser()

        # Then
        self.assertEqual(set(result["options"]), {"Right", "Wrong one", "Wrong two"})
        self.assertEqual(len(result["options"]), 3)
        self.assertTrue(result["shellFillsViewport"])
        self.assertTrue(result["cardAreaScrolls"])
        self.assertTrue(result["navigationHintMarked"])
        self.assertTrue(result["navigationButtonsActiveAfterLoad"])
        self.assertTrue(result["navigationVisibleAfterLoad"])
        self.assertTrue(result["shellGuttersBalanced"])
        self.assertTrue(result["footerMatchesShellGutter"])
        self.assertTrue(result["previousMatchesSkipPadding"])
        self.assertTrue(result["explanationHiddenBeforeAnswer"])
        self.assertTrue(result["checkAlignedToOptionRight"])
        self.assertTrue(result["nextAlignedToOptionRight"])
        self.assertTrue(result["promptAlignedToOptionLeft"])
        self.assertFalse(result["announcementLeaksExplanation"])
        self.assertTrue(result["shuffledOrderChanged"])
        self.assertTrue(result["gradeBeforeCheck"])
        self.assertTrue(result["explanationHiddenAfterSelection"])
        self.assertTrue(result["checkEnabledAfterSelection"])
        self.assertTrue(result["selectionCanChange"])
        self.assertTrue(result["nextIsSkipBeforeAnswer"])
        self.assertTrue(result["skipMovesWithoutGrade"])
        self.assertTrue(result["nextIsSkipBeforeCheck"])
        self.assertIn("Incorrect.", result["incorrectFeedback"])
        self.assertTrue(result["answerPageVisible"])
        self.assertTrue(result["explanationVisibleAfterCheck"])
        self.assertEqual(result["incorrectGrade"], "incorrect")
        self.assertTrue(result["nextEnabledAfterCheck"])
        self.assertTrue(result["nextIsNextAfterCheck"])
        self.assertTrue(result["basicNextIsSkipBeforeGrade"])
        self.assertTrue(result["basicNextEnabledAfterGrade"])
        self.assertTrue(result["basicNextIsNextAfterGrade"])
        self.assertEqual(result["restoredGrade"], "incorrect")
        self.assertTrue(result["restoredOptionsDisabled"])
        self.assertEqual(result["correctGrade"], "correct")
        self.assertTrue(result["navigationHintClearedAfterFeedback"])
        self.assertTrue(result["navigationStableDuringCardScroll"])
        self.assertTrue(result["cardScrollResetsOnNext"])
        self.assertTrue(result["revealAlignedToCardRight"])

    def test_given_a_cloze_card_when_checked_then_each_blank_is_graded_and_the_card_gets_one_grade(self):
        """Given a cloze card, when checked, then each blank and the whole card are graded."""
        # Given
        deck = {
            "id": "cloze-browser-check",
            "title": "Cloze browser check",
            "cards": [
                {
                    "id": "cloze-card",
                    "type": "cloze",
                    "prompt": "Send {{If-None-Match}} and accept {{304|304 Not Modified}}.",
                    "explanation": "The cached response is still fresh.",
                }
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
                    const prompt = document.querySelector('[data-testid="card-prompt"]');
                    const inputs = Array.from(document.querySelectorAll('[data-testid="cloze-input"]'));
                    checks.inputCount = inputs.length;
                    checks.rawMarkupHidden = !prompt.textContent.includes('{{');
                    checks.feedbackHiddenBeforeCheck = document.querySelector(
                      '[data-testid="cloze-feedback"]'
                    ).hidden;
                    inputs[0].value = '  if-none-match ';
                    inputs[1].value = 'wrong';
                    document.querySelector('[data-testid="cloze-check-answer"]').click();
                    checks.blankResults = inputs.map((input) => input.dataset.result);
                    checks.aggregateFeedback = document.querySelector(
                      '[data-testid="cloze-feedback"]'
                    ).dataset.result;
                    checks.feedback = Array.from(
                      document.querySelectorAll('[data-testid="cloze-blank-feedback"]')
                    ).map((item) => item.textContent);
                    checks.incorrectGrade = window.CRAM_PLAYER.getGrade('cloze-card');
                    checks.inputsDisabled = inputs.every((input) => input.disabled);
                    checks.explanationVisible = !document.querySelector(
                      '[data-testid="cloze-explanation"]'
                    ).hidden;
                    window.CRAM_PLAYER.setDeck(window.CRAM_PLAYER.getState().deck);
                    const restoredInputs = Array.from(
                      document.querySelectorAll('[data-testid="cloze-input"]')
                    );
                    restoredInputs[0].value = 'If-None-Match';
                    restoredInputs[1].value = ' 304 NOT MODIFIED ';
                    document.querySelector('[data-testid="cloze-check-answer"]').click();
                    checks.alternativeGrade = window.CRAM_PLAYER.getGrade('cloze-card');
                    checks.alternativeResults = restoredInputs.map((input) => input.dataset.result);
                    JSON.stringify(checks);
                    """
                )
            finally:
                self._close_browser()

        # Then
        self.assertEqual(result["inputCount"], 2)
        self.assertTrue(result["rawMarkupHidden"])
        self.assertTrue(result["feedbackHiddenBeforeCheck"])
        self.assertEqual(result["blankResults"], ["correct", "incorrect"])
        self.assertEqual(result["aggregateFeedback"], "incorrect")
        self.assertIn("Correct.", result["feedback"][0])
        self.assertIn("Correct answer: 304 / 304 Not Modified", result["feedback"][1])
        self.assertEqual(result["incorrectGrade"], "incorrect")
        self.assertTrue(result["inputsDisabled"])
        self.assertTrue(result["explanationVisible"])
        self.assertEqual(result["alternativeGrade"], "correct")
        self.assertEqual(result["alternativeResults"], ["correct", "correct"])

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
