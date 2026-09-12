const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "../..");
let PLAYER_URL;
let previewDirectory;

test.beforeAll(() => {
  previewDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cram-player-tests-"));
  const output = path.join(previewDirectory, "player.html");
  execFileSync("python3", [path.join(ROOT, "skills/cram/scripts/render.py"),
    path.join(ROOT, "fixtures/valid/minimal.json"), "-o", output]);
  PLAYER_URL = pathToFileURL(output).href;
});

test.afterAll(() => {
  if (previewDirectory) fs.rmSync(previewDirectory, { recursive: true, force: true });
});
const BASIC_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/basic-only.json"), "utf8")
);
const LONG_COUNT_DECK = {
  id: "long-count-browser-check",
  title: "Long count browser check",
  cards: Array.from({ length: 100 }, (_, index) => ({
    id: `long-count-card-${index + 1}`,
    type: "basic",
    prompt: `Card ${index + 1}`,
    answer: `Answer ${index + 1}`,
  })),
};
const RETRY_DECK = {
  id: "retry-browser-check",
  title: "Retry browser check",
  cards: [
    {
      id: "retry-known-card",
      type: "basic",
      prompt: "A card answered correctly",
      answer: "Known answer",
    },
    {
      id: "retry-missed-card",
      type: "basic",
      prompt: "A card answered incorrectly",
      answer: "Missed answer",
    },
  ],
};
const CUMULATIVE_RETRY_DECK = {
  id: "cumulative-retry-browser-check",
  title: "Cumulative retry browser check",
  cards: Array.from({ length: 10 }, (_, index) => ({
    id: `cumulative-card-${index + 1}`,
    type: "basic",
    prompt: `Card ${index + 1}`,
    answer: `Answer ${index + 1}`,
  })),
};
const RETRY_TYPES_DECK = {
  id: "retry-types-browser-check",
  title: "Retry card types browser check",
  cards: [
    {
      id: "retry-mcq-card",
      type: "mcq",
      prompt: "Which option is correct?",
      answer: "Correct option",
      distractors: ["Incorrect option"],
    },
    {
      id: "retry-cloze-card",
      type: "cloze",
      prompt: "The correct answer is {{correct}}.",
    },
  ],
};
const ADAPTIVE_TYPES_DECK = {
  id: "adaptive-types-browser-check",
  title: "Adaptive card types browser check",
  cards: [
    {
      id: "adaptive-basic-card",
      type: "basic",
      prompt: "What does this basic card test?",
      answer: "Same-session drilling",
    },
    {
      id: "adaptive-mcq-card",
      type: "mcq",
      prompt: "Which option should be requeued?",
      answer: "The missed one",
      distractors: ["The skipped one"],
    },
    {
      id: "adaptive-cloze-card",
      type: "cloze",
      prompt: "A missed {{card}} returns later.",
    },
  ],
};
const ALL_TYPES_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/all-types.json"), "utf8")
);
const HINT_DECK = {
  id: "hint-browser-check",
  title: "Hint browser check",
  cards: [
    {
      id: "hint-basic-card",
      type: "basic",
      prompt: "What does a coroutine call return?",
      answer: "A coroutine object.",
      hint: "The function body has not run yet.",
    },
    {
      id: "hint-mcq-card",
      type: "mcq",
      prompt: "Which directive prevents storage?",
      answer: "no-store",
      distractors: ["no-cache"],
      hint: "Think about the difference between storing and reusing.",
    },
    {
      id: "hint-cloze-card",
      type: "cloze",
      prompt: "A cache revalidates with {{If-None-Match}}.",
      hint: "It carries the stored entity tag.",
    },
    {
      id: "without-hint-card",
      type: "basic",
      prompt: "Which card has no optional hint?",
      answer: "This one.",
    },
  ],
};
const SAME_CARD_ID_DECK = {
  id: "hint-browser-other-deck",
  title: "Other hint browser deck",
  cards: [
    {
      id: "hint-basic-card",
      type: "basic",
      prompt: "The same card id in another deck",
      answer: "A separate answer.",
    },
  ],
};
const UNSUPPORTED_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/invalid/unknown-card-type.json"), "utf8")
);
const CLOZE_DECK = {
  id: "cloze-browser-check",
  title: "Cloze browser check",
  cards: [
    {
      id: "cloze-card",
      type: "cloze",
      prompt: "Send {{If-None-Match}} and accept {{304|304 Not Modified}}.",
      explanation: "The cached response is still fresh.",
    },
    {
      id: "other-card",
      type: "basic",
      prompt: "Other prompt",
      answer: "Other answer",
    },
  ],
};
const OTHER_DECK = {
  id: "other-browser-check",
  title: "Other browser check",
  cards: [
    {
      id: "other-card",
      type: "basic",
      prompt: "A card from another deck",
      answer: "A separate answer",
    },
  ],
};
const CUSTOM_DECK = {
  id: "custom-browser-check",
  title: "Custom browser check",
  cards: [
    {
      id: "custom-card",
      type: "custom",
      prompt: "A custom card",
    },
  ],
};
const REQUIRED_CUSTOM_DECK = {
  id: "required-custom-browser-check",
  title: "Required custom browser check",
  cards: [
    {
      id: "required-custom-card",
      type: "custom",
      prompt: "A required custom card",
    },
    {
      id: "required-custom-basic-card",
      type: "basic",
      prompt: "A basic card",
      answer: "An answer",
    },
  ],
};

test.describe("basic cards", () => {
  test("reveals a basic explanation with its answer and restores it on return", async ({ page }) => {
    // Given: a basic card with an optional explanation.
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("next-card").click();
    const explanation = page.getByText(BASIC_DECK.cards[1].explanation, { exact: true });
    await expect(explanation).toBeHidden();

    // When: the learner reveals the answer and grades it as known.
    await page.getByTestId("reveal-answer").click();
    await expect(explanation).toBeVisible();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("previous-card").click();

    // Then: revisiting the answered card restores its reasoning too.
    await expect(explanation).toBeVisible();
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
  });

  test("reviewing earlier drill attempts does not add retries or change mastery", async ({ page }) => {
    // Given: three attempts on one card, with a miss resetting its correct streak.
    await openPlayer(page, OTHER_DECK);
    await enableCramMode(page);
    for (const grade of ["missed", "known", "missed"]) {
      await page.getByTestId("reveal-answer").click();
      await page.getByTestId(`grade-${grade}`).click();
      await page.getByTestId("next-card").click();
    }
    await expect(page.getByTestId("progress-label")).toHaveText("Card 4 of 4");

    // When: the learner reviews an older attempt without answering again.
    await page.getByTestId("previous-card").click();
    await page.getByTestId("previous-card").click();
    await page.getByTestId("next-card").click();

    // Then: navigation preserves the queue, and two fresh correct answers finish it.
    await expect(page.getByTestId("progress-label")).toHaveText("Card 3 of 4");
    await page.getByTestId("next-card").click();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByTestId("reveal-answer").click();
      await page.getByTestId("grade-known").click();
      await page.getByTestId("next-card").click();
      if (attempt === 0) {
        await expect(page.getByTestId("progress-label")).toHaveText("Card 5 of 5");
      }
    }
    await expect(page.getByTestId("score-value")).toHaveText("1/1");
    await expect(page.getByTestId("score-screen")).toBeVisible();
  });

  test("reveals a basic-card answer and records the selected grade", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the first basic card starts with its answer and grades hidden.
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().cramMode)).toBe(false);
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("grading-buttons")).toBeHidden();

    // When: the learner reveals the answer and marks it known.
    await page.getByTestId("reveal-answer").click();

    // Then: the answer and grade state are visible and announced.
    await expect(page.getByTestId("card-answer")).toHaveText(BASIC_DECK.cards[0].answer);
    await expect(page.getByTestId("grading-buttons")).toBeVisible();
    await page.getByTestId("grade-known").click();

    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#player-status")).toHaveText("Marked as known.");
    await expect(page.locator("#player-status")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#player-status")).toHaveCSS("clip", "rect(0px, 0px, 0px, 0px)");
  });

  for (const width of [390, 1280]) {
    test(`keeps revealed answers beside their questions at ${width}px`, async ({ page }) => {
      // Given: each theme shows a short question and an optional hint.
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ["paper", "focus", "sprint"]) {
        await openPlayer(page, HINT_DECK);
        await page.getByTestId("settings-toggle").click();
        await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
        await page.keyboard.press("Escape");

        const question = await page.getByTestId("card-prompt").boundingBox();
        const reveal = await page.getByTestId("reveal-answer").boundingBox();
        expect(reveal.y - (question.y + question.height)).toBeLessThan(140);

        // When: the answer replaces the recall task, through the keyboard shortcut.
        await page.keyboard.press("a");

        // Then: question and answer form one visible reading area; focus starts on the answer.
        const prompt = await page.getByTestId("card-prompt").boundingBox();
        const answer = await page.getByTestId("card-answer").boundingBox();
        expect(answer.y - (prompt.y + prompt.height)).toBeGreaterThan(0);
        expect(answer.y - (prompt.y + prompt.height)).toBeLessThan(90);
        await expect(page.getByTestId("card-prompt")).toBeInViewport();
        await expect(page.getByTestId("card-answer")).toBeInViewport({ ratio: 1 });
        await expect(page.getByTestId("card-answer")).toBeFocused();
        await expect(page.getByTestId("show-hint")).toBeHidden();
        await page.keyboard.press("Tab");
        await expect(page.getByTestId("grade-missed")).toBeFocused();
      }
    });

    test(`reveals the beginning of a long answer before its grading controls at ${width}px`, async ({ page }) => {
      // Given: the answer is taller than the viewport, and the learner has used a hint.
      await page.setViewportSize({ width, height: 844 });
      const card = { ...HINT_DECK.cards[0], answer: "Start reading here.\n" + "Detailed explanation.\n".repeat(80) };
      await openPlayer(page, { ...HINT_DECK, cards: [card] });
      await page.getByTestId("show-hint").click();

      // When: clicking Show answer expands the card well beyond the screen.
      await page.getByTestId("reveal-answer").click();

      // Then: the opening lines are visible, while grading stays after the full answer.
      const answer = await page.getByTestId("card-answer").boundingBox();
      const readingArea = await page.getByTestId("card-content").boundingBox();
      const readingTop = width >= 768 ? readingArea.y : 0;
      expect(answer.y).toBeGreaterThanOrEqual(readingTop);
      expect(answer.y - readingTop).toBeLessThan(120);
      await expect(page.getByTestId("card-hint")).toBeHidden();
      await expect(page.getByTestId("grading-buttons")).not.toBeInViewport();
      expect(await page.evaluate(id => window.CRAM_PLAYER.getHintUsed(id), card.id)).toBe(true);

      // When: the learner finishes reading, grades, and reopens the card.
      await page.getByTestId("grade-known").click();
      await page.reload();
      await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), { ...HINT_DECK, cards: [card] });

      // Then: the answer and recorded grade remain available without another reveal.
      await expect(page.getByTestId("card-answer")).toHaveText(card.answer);
      await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("show-hint")).toBeHidden();
    });
  }

  test("requeues missed cards in the same session until their correct streak is mastered", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);
    await enableCramMode(page);

    // Given: the learner answers the first card correctly and the second card incorrectly.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // When: the learner advances through the remaining first-pass cards.
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[2].prompt);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();

    // Then: the missed card returns without a score-screen round trip or stale answer UI.
    await expect(page.getByTestId("score-screen")).toBeHidden();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[1].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("grading-buttons")).toBeHidden();

    // When: the learner gets one drill attempt correct.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[1].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();

    // And: a miss during drilling resets the streak and requeues the card again.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-screen")).toBeHidden();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[1].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();

    // When: the learner answers the reset streak correctly twice in a row.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByTestId("reveal-answer").click();
      await page.getByTestId("grade-known").click();
      await page.getByTestId("next-card").click();
      if (attempt === 0) {
        await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[1].prompt);
        await expect(page.getByTestId("card-answer")).toBeHidden();
      }
    }

    // Then: results appear only after the drill queue is retired, with one score per card.
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText(`${BASIC_DECK.cards.length}/${BASIC_DECK.cards.length}`);
    await expect(page.getByTestId("retry-missed")).toBeHidden();
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), BASIC_DECK.id)).toEqual(
      Object.fromEntries(BASIC_DECK.cards.map((card) => [card.id, "known"]))
    );
  });

  test("applies same-session requeue behavior to every built-in card type", async ({ page }) => {
    await openPlayer(page, ADAPTIVE_TYPES_DECK);
    await enableCramMode(page);

    // Given: the learner answers a basic, MCQ, and cloze card incorrectly.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("mcq-option").filter({ hasText: "The skipped one" }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("cloze-input").fill("wrong");
    await page.getByTestId("cloze-check-answer").click();
    await page.getByTestId("next-card").click();

    // Then: each missed type returns as a fresh attempt before results can appear.
    await expect(page.getByTestId("card-prompt")).toHaveText(ADAPTIVE_TYPES_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();

    // When: the first basic drill attempt is correct.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();

    // And: the first MCQ drill attempt is fresh and correct.
    await expect(page.getByTestId("mcq-check-answer")).toBeHidden();
    await page.getByTestId("mcq-option").filter({ hasText: "The missed one" }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();

    // And: the first cloze drill attempt is fresh and correct.
    await expect(page.getByTestId("cloze-input")).toBeEnabled();
    await page.getByTestId("cloze-input").fill("card");
    await page.getByTestId("cloze-check-answer").click();
    await page.getByTestId("next-card").click();

    // When: the learner completes the second correct attempt for each type.
    await expect(page.getByTestId("card-prompt")).toHaveText(ADAPTIVE_TYPES_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("mcq-check-answer")).toBeHidden();
    await page.getByTestId("mcq-option").filter({ hasText: "The missed one" }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("cloze-input")).toBeEnabled();
    await page.getByTestId("cloze-input").fill("card");
    await page.getByTestId("cloze-check-answer").click();
    await page.getByTestId("next-card").click();

    // Then: results appear only after the final mastered attempt, with one score per card.
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText("3/3");
    await expect(page.getByTestId("retry-missed")).toBeHidden();
  });

  test("keeps Cram mode session-only and allows the learner to turn it off", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);
    await enableCramMode(page);

    // When: the learner turns Cram mode off before selecting another deck.
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("cram-mode-toggle").uncheck();
    await expect(page.getByTestId("cram-mode-toggle")).not.toBeChecked();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().cramMode)).toBe(false);
    await page.keyboard.press("Escape");

    // Then: selecting a new deck keeps the default off and a missed card ends normally.
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), OTHER_DECK);
    await expect(page.getByTestId("cram-mode-toggle")).not.toBeChecked();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().cramMode)).toBe(false);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-screen")).toBeVisible();
  });

  test("starts fresh shuffled rounds and restores original order without erasing history", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: one card has saved progress and a deterministic random source makes the shuffled order observable.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.evaluate(() => {
      let seed = 1;
      crypto.getRandomValues = values => { values[0] = seed++; return values; };
    });

    // When: the learner enables card shuffling from settings.
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();

    // Then: every card is still present, but the first pass uses a different order.
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().shuffleMode)).toBe(true);
    const shuffledPrompts = [];
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) {
      shuffledPrompts.push(await page.getByTestId("card-prompt").textContent());
      await expect(page.getByTestId("card-answer")).toBeHidden();
      await page.getByTestId("next-card").click();
    }
    expect(new Set(shuffledPrompts)).toEqual(new Set(BASIC_DECK.cards.map(card => card.prompt)));
    expect(shuffledPrompts).not.toEqual(BASIC_DECK.cards.map(card => card.prompt));

    await expect(page.getByTestId("score-value")).toHaveText("0/5");
    // When: another shuffle is requested without an off/on cycle.
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();
    const secondOrder = [];
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) {
      secondOrder.push(await page.getByTestId("card-prompt").textContent());
      await page.getByTestId("next-card").click();
    }
    expect(secondOrder).not.toEqual(shuffledPrompts);
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("restore-order").click();

    // Then: the session restarts from the original deck order without losing saved progress.
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().shuffleMode)).toBe(false);
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`fc:${id}:v1`)), BASIC_DECK.id))
      .toEqual({ [BASIC_DECK.cards[0].id]: "known" });
    await expect(page.locator("#player-status")).toHaveText("Card order restored for this session.");
  });

  test("resumes a shuffled round and its results after reload", async ({ page }) => {
    // Given: a shuffled round has reached its second card.
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();
    const first = await page.getByTestId("card-prompt").textContent();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    const second = await page.getByTestId("card-prompt").textContent();

    // When: the same deck is reopened.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);

    // Then: position, order and answers belong to the saved round.
    await expect(page.getByTestId("card-prompt")).toHaveText(second);
    await expect(page.getByTestId("card-position")).toHaveText("2/5");
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await page.getByTestId("previous-card").click();
    await expect(page.getByTestId("card-prompt")).toHaveText(first);
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) await page.getByTestId("next-card").click();
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);
    await expect(page.getByTestId("score-value")).toHaveText("1/5");
    await expect(page.getByTestId("score-screen")).toBeVisible();

    // When: a missed-card retry is shuffled, it remains a fresh four-card round.
    await page.getByTestId("retry-missed").click();
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();
    const retryPrompts = [];
    for (let index = 0; index < 4; index += 1) {
      retryPrompts.push(await page.getByTestId("card-prompt").textContent());
      await expect(page.getByTestId("card-answer")).toBeHidden();
      await page.getByTestId("next-card").click();
    }
    expect(retryPrompts).not.toContain(first);
    expect(new Set(retryPrompts).size).toBe(4);
    // Shuffling restarts only the retried round with fresh grades; the card graded
    // known before retry keeps its point in the full five-card cumulative score.
    await expect(page.getByTestId("score-value")).toHaveText("1/5");

    // And: reloading after the shuffled retry does not lose that preserved point.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);
    await expect(page.getByTestId("score-value")).toHaveText("1/5");
  });

  test("resumes fresh drill attempts and the mastery streak after reload", async ({ page }) => {
    // Given: a shuffled one-card round has a miss followed by one correct drill attempt.
    await openPlayer(page, OTHER_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();
    await enableCramMode(page);
    for (const grade of ["missed", "known"]) {
      await page.getByTestId("reveal-answer").click();
      await page.getByTestId(`grade-${grade}`).click();
      await page.getByTestId("next-card").click();
    }
    // When: the page reloads on the pending second drill attempt.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), OTHER_DECK);
    // Then: the fresh attempt is unanswered and one more correct answer completes mastery.
    await expect(page.getByTestId("card-position")).toHaveText("3/3");
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText("1/1");
  });

  test("discards invalid or outdated sessions without discarding grade history", async ({ page }) => {
    // Given: a graded card and a saved session that references an unknown card.
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.evaluate(id => {
      const key = `fc:${id}:session`;
      const saved = JSON.parse(localStorage.getItem(key));
      saved.queue[0] = "missing-card";
      localStorage.setItem(key, JSON.stringify(saved));
    }, BASIC_DECK.id);
    // When: the deck is reopened, the invalid queue is rejected as a whole.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);
    // Then: original order and recorded history remain usable.
    await expect(page.getByTestId("card-position")).toHaveText("1/5");
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("next-card").click();
    const changed = structuredClone(BASIC_DECK);
    changed.cards[0].prompt = "Updated question";
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), changed);
    await expect(page.getByTestId("card-prompt")).toHaveText("Updated question");
    await expect(page.getByTestId("card-position")).toHaveText("1/5");
  });

  test("keeps shuffle usable and warns when session storage is unavailable", async ({ page }) => {
    // Given: session writes fail while grade history remains writable.
    await openPlayer(page, BASIC_DECK);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.endsWith(":session")) throw new Error("Session storage blocked");
        return original.call(this, key, value);
      };
    });
    // When: the learner starts a shuffled round and answers a card.
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("shuffle-cards").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    // Then: the answer works and the warning describes the loss of resumability.
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#player-status")).toHaveText("This session could not be saved. Reloading may lose your place.");
    await expect(page.locator("#player-status")).toBeVisible();
    await expect(page.locator("#player-status")).toHaveCSS("clip", "auto");
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("card-position")).toHaveText("2/5");
  });

  test("closes the settings panel with Escape or an outside click", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the learner has opened the settings panel.
    await page.getByTestId("settings-toggle").click();
    await expect(page.getByTestId("settings-panel")).toBeVisible();

    // When: the learner presses Escape.
    await page.keyboard.press("Escape");

    // Then: the panel closes and focus returns to its toggle.
    await expect(page.getByTestId("settings-panel")).toBeHidden();
    await expect(page.getByTestId("settings-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("settings-toggle")).toBeFocused();

    // When: the learner reopens the panel and clicks outside it.
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("deck-title").click();

    // Then: the outside click closes the panel as well.
    await expect(page.getByTestId("settings-panel")).toBeHidden();
    await expect(page.getByTestId("settings-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps long card-position counts readable without horizontal page overflow", async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await openPlayer(page, LONG_COUNT_DECK);

      // Given: a 100-card deck renders a zero-padded card position.
      const badgeState = await page.evaluate(() => {
        const badge = document.querySelector("[data-testid='card-position']");
        const textRange = document.createRange();
        textRange.selectNodeContents(badge);
        const badgeBounds = badge.getBoundingClientRect();
        const textBounds = textRange.getBoundingClientRect();
        return {
          label: badge.textContent,
          badgeBounds,
          textBounds,
          badgeClientWidth: badge.clientWidth,
          badgeScrollWidth: badge.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      // Then: every digit stays inside the position label and the page remains viewport-bound.
      expect(badgeState.label).toBe("001/100");
      expect(badgeState.badgeScrollWidth).toBeLessThanOrEqual(badgeState.badgeClientWidth);
      expect(badgeState.textBounds.left).toBeGreaterThanOrEqual(badgeState.badgeBounds.left - 1);
      expect(badgeState.textBounds.right).toBeLessThanOrEqual(badgeState.badgeBounds.right + 1);
      expect(badgeState.bodyScrollWidth).toBeLessThanOrEqual(badgeState.viewportWidth);
    }
  });

  test("restores a basic-card grade after Next and Previous navigation", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the learner reveals and marks the first card as missed.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // When: the learner moves forward and then back.
    await page.getByTestId("next-card").click();

    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[1].prompt);
    await page.getByTestId("previous-card").click();

    // Then: returning to the card restores its answer and selected grade.
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeVisible();
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "false");
  });

  test("persists grades across reloads for the same deck", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the learner records a grade for the first card.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // When: the page reloads and the same deck is selected again.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);

    // Then: the selected grade is restored from the deck-scoped localStorage entry.
    await expect(page.getByTestId("card-position")).toHaveText("2/5");
    await page.getByTestId("previous-card").click();
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
      [BASIC_DECK.cards[1].id]: "missed",
    });

    // And: the stored miss does not create a new adaptive attempt in this sitting.
    for (let index = 0; index < BASIC_DECK.cards.length - 1; index += 1) {
      await page.getByTestId("next-card").click();
    }
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText(`1/${BASIC_DECK.cards.length}`);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().total)).toBe(BASIC_DECK.cards.length);
  });

  test("persists basic, MCQ, and cloze grades across reloads", async ({ page }) => {
    await openPlayer(page, ALL_TYPES_DECK);

    // Given: the learner answers one card from each renderer.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("mcq-option").filter({ hasText: ALL_TYPES_DECK.cards[1].answer }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("cloze-input").nth(0).fill("If-None-Match");
    await page.getByTestId("cloze-input").nth(1).fill("304");
    await page.getByTestId("cloze-check-answer").click();

    // When: the page reloads and the same deck is selected again.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), ALL_TYPES_DECK);

    // Then: each renderer restores its own persisted grade state.
    await expect(page.getByTestId("cloze-feedback-summary")).toBeVisible();
    for (let index = 0; index < 3; index += 1) await page.getByTestId("previous-card").click();
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("mcq-feedback")).toHaveAttribute("data-result", "correct");
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("cloze-feedback-summary")).toBeVisible();
  });

  test("restores the selected MCQ option and cloze submission within the same session, but forgets them after reload", async ({ page }) => {
    await openPlayer(page, ALL_TYPES_DECK);

    // Given: the learner answers the MCQ and cloze cards incorrectly.
    await page.getByTestId("next-card").click();
    await page.getByTestId("mcq-option").filter({ hasText: "no-cache" }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("cloze-input").nth(0).fill("wrong");
    await page.getByTestId("cloze-input").nth(1).fill("304");
    await page.getByTestId("cloze-check-answer").click();

    // When: the learner navigates back to the MCQ card without reloading.
    await page.getByTestId("previous-card").click();
    await page.getByTestId("previous-card").click();

    // Then: the previously selected wrong option is still highlighted, exactly like a fresh check.
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-cache" })).toHaveClass(/mcq__option--incorrect/);
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-store" })).toHaveClass(/mcq__option--correct/);

    // Then: the cloze submission is also restored before a reload.
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("cloze-input").nth(0)).toHaveValue("wrong");
    await expect(page.getByTestId("cloze-input").nth(0)).toHaveAttribute("data-result", "incorrect");
    await expect(page.getByTestId("cloze-input").nth(1)).toHaveValue("304");
    await expect(page.getByTestId("cloze-input").nth(1)).toHaveAttribute("data-result", "correct");

    // When: the page reloads.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), ALL_TYPES_DECK);

    // Then: the cloze grade remains, but its submitted values are forgotten after reload.
    await expect(page.getByTestId("cloze-feedback")).toHaveAttribute("data-result", "incorrect");
    await expect(page.getByTestId("cloze-input").nth(0)).toHaveValue("");
    await expect(page.getByTestId("cloze-input").nth(0)).not.toHaveAttribute("data-result");
    await expect(page.getByTestId("cloze-input").nth(1)).toHaveValue("");
    await expect(page.getByTestId("cloze-input").nth(1)).not.toHaveAttribute("data-result");

    // When: the learner navigates back to the MCQ after reloading.
    await page.getByTestId("previous-card").click();
    await page.getByTestId("previous-card").click();

    // Then: the grade is still correct, but the option choice is forgotten since its detail is session-only.
    await expect(page.getByTestId("mcq-feedback")).toHaveAttribute("data-result", "incorrect");
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-cache" })).not.toHaveClass(/mcq__option--incorrect/);
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-store" })).toHaveClass(/mcq__option--correct/);
  });

  test("reports when saved progress is unavailable", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the browser refuses writes for the player's storage key.
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key, value) {
        if (key.startsWith("fc:")) throw new Error("storage unavailable");
        return originalSetItem.call(this, key, value);
      };
    });

    // When: the learner tries to record a grade.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();

    // Then: the session reports the failed save but keeps the grade for this session.
    await expect(page.locator("#player-status")).toHaveText("Progress could not be saved. Try again.");
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
    });
  });

  test("rejects grades for cards outside the active deck", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // When: a caller tries to grade an id that is not in the selected deck.
    const message = await page.evaluate(() => {
      try {
        window.CRAM_PLAYER.recordGrade("not-in-this-deck", "known");
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    // Then: the public state and stored progress remain unchanged.
    expect(message).toBe("That card is not in the current deck.");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
    expect(await page.evaluate((deckId) => localStorage.getItem(`fc:${deckId}:v1`), BASIC_DECK.id)).toBeNull();
  });

  test("keeps a replacement grade in the session when saving fails", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();

    // Given: a card already has a saved grade and the next storage write fails.
    await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key, value) {
        if (key.startsWith("fc:")) throw new Error("storage unavailable");
        return window.__originalSetItem.call(this, key, value);
      };
    });

    // When: the learner tries to replace that grade.
    await page.getByTestId("grade-missed").click();

    // Then: the replacement remains usable in memory while storage keeps the old value.
    await expect(page.locator("#player-status")).toHaveText("Progress could not be saved. Try again.");
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
      [BASIC_DECK.cards[0].id]: "missed",
    });
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), BASIC_DECK.id)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
    });
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__originalSetItem;
    });
    await page.getByTestId("grade-missed").click();
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), BASIC_DECK.id)).toEqual({
      [BASIC_DECK.cards[0].id]: "missed",
    });
  });

  test("retries earlier unsaved grades with a later successful save", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the first grade is kept in memory while storage is unavailable.
    await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key, value) {
        if (key.startsWith("fc:")) throw new Error("storage unavailable");
        return window.__originalSetItem.call(this, key, value);
      };
    });
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();

    // When: storage recovers and the learner records another card.
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__originalSetItem;
    });
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // Then: the store flushes both the earlier and current session grades.
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), BASIC_DECK.id)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
      [BASIC_DECK.cards[1].id]: "missed",
    });
  });

  test("keeps progress isolated between deck ids", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: one deck has a recorded grade.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // When: a different deck is selected and then the original deck is selected again.
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), OTHER_DECK);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);

    // Then: each deck retains only its own progress.
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), OTHER_DECK.id)).toEqual({
      [OTHER_DECK.cards[0].id]: "known",
    });
  });

  test("resets the current deck progress from the score screen", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: another deck has independent progress and the current deck is completed.
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), OTHER_DECK);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) {
      await page.getByTestId("next-card").click();
    }
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText(`1/${BASIC_DECK.cards.length}`);

    // Given: Cram mode is enabled after the session completes.
    await enableCramMode(page);

    // When: the learner explicitly resets progress.
    await page.getByTestId("reset-progress").click();

    // Then: the current deck is restarted while the other deck's progress remains stored.
    await expect(page.getByTestId("score-screen")).toBeHidden();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("cram-mode-toggle")).not.toBeChecked();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().cramMode)).toBe(false);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
    expect(await page.evaluate((deckId) => localStorage.getItem(`fc:${deckId}:v1`), BASIC_DECK.id)).toBeNull();
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), OTHER_DECK.id)).toEqual({
      [OTHER_DECK.cards[0].id]: "known",
    });
  });

  test("retries only missed cards and persists a corrected grade", async ({ page }) => {
    await openPlayer(page, RETRY_DECK);

    // Given: the learner answers one card correctly and one card incorrectly in normal mode.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();

    // Then: the linear session ends with the missed card available for the separate retry action.
    await expect(page.getByTestId("score-value")).toHaveText("1/2");
    await expect(page.getByTestId("score-summary")).toHaveText("1 correct · 1 to review");
    await expect(page.getByTestId("score-correct-label")).toHaveText("1 correct");
    await expect(page.getByTestId("score-missed-label")).toHaveText("1 to review");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 1 missed card");

    // When: the learner starts a new retry session from the score screen.
    await page.getByTestId("retry-missed").click();

    // Then: the retry session contains only the missed card.
    await expect(page.getByTestId("card-prompt")).toHaveText(RETRY_DECK.cards[1].prompt);
    await expect(page.getByTestId("progress-label")).toHaveText("Card 1 of 1");
    await page.getByTestId("settings-toggle").click();
    await expect(page.getByTestId("cram-mode-toggle")).toBeDisabled();
    await page.getByTestId("settings-toggle").click();

    // When: the learner corrects the card and finishes the retry session.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();

    // Then: the score is cumulative against the original two-card session, with a recovery note.
    await expect(page.getByTestId("score-value")).toHaveText("2/2");
    await expect(page.getByTestId("score-summary")).toHaveText("All 2 correct · Nothing to review");
    await expect(page.getByTestId("score-recovered")).toHaveText("1 card recovered");
    await expect(page.getByTestId("no-missed-cards")).toBeVisible();
    await expect(page.getByTestId("retry-missed")).toBeDisabled();
    await expect(page.getByTestId("retry-missed")).toBeHidden();
    await expect(page.getByTestId("review-scroll-cue")).toBeHidden();

    // And: reopening resumes retry results, with the cumulative score and corrected grades retained.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), RETRY_DECK);
    await expect(page.getByTestId("score-value")).toHaveText("2/2");
    await expect(page.getByTestId("score-recovered")).toHaveText("1 card recovered");
    expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`fc:${id}:v1`)), RETRY_DECK.id))
      .toEqual(Object.fromEntries(RETRY_DECK.cards.map(card => [card.id, "known"])));
  });

  test("retries missed MCQ and cloze cards with fresh answer controls", async ({ page }) => {
    await openPlayer(page, RETRY_TYPES_DECK);

    // Given: an MCQ and cloze card are both answered incorrectly.
    await page.getByTestId("mcq-option").filter({ hasText: "Incorrect option" }).click();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("cloze-input").fill("wrong");
    await page.getByTestId("cloze-check-answer").click();
    await page.getByTestId("next-card").click();

    // Then: the linear session reaches the score screen with both cards missed.
    await expect(page.getByTestId("score-value")).toHaveText("0/2");
    await expect(page.getByTestId("score-summary")).toHaveText("0 correct · 2 to review");
    await expect(page.getByTestId("score-missed-label")).toHaveText("2 to review");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 2 missed cards");

    // When: the learner starts a retry session.
    await page.getByTestId("retry-missed").click();

    // Then: the missed MCQ starts with fresh, unselected answer controls.
    await expect(page.getByTestId("mcq-check-answer")).toBeHidden();
    await expect(page.getByTestId("mcq-option").first()).toBeEnabled();
    await page.getByRole("button", { name: "Correct option", exact: true }).click();
    await expect(page.getByTestId("mcq-check-answer")).toBeVisible();
    await page.getByTestId("mcq-check-answer").click();
    await page.getByTestId("next-card").click();

    // And: the missed cloze card can be answered again and completes the retry.
    await expect(page.getByTestId("cloze-check-answer")).toBeVisible();
    await expect(page.getByTestId("cloze-input")).toBeEnabled();
    await page.getByTestId("cloze-input").fill("correct");
    await page.getByTestId("cloze-check-answer").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("2/2");

    // And: the corrected grades persist when the original deck is reopened.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), RETRY_TYPES_DECK);
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("score-value")).toHaveText("2/2");
  });

  test("scores retry results against the full original session and narrows a second retry to what's still missed", async ({ page }) => {
    await openPlayer(page, CUMULATIVE_RETRY_DECK);

    // Given: a ten-card session where three cards are missed.
    await page.evaluate((deck) => {
      deck.cards.forEach((card, index) => {
        window.CRAM_PLAYER.recordGrade(card.id, index < 3 ? "missed" : "known");
      });
    }, CUMULATIVE_RETRY_DECK);
    for (let index = 0; index < CUMULATIVE_RETRY_DECK.cards.length; index += 1) {
      await page.getByTestId("next-card").click();
    }
    await expect(page.getByTestId("score-value")).toHaveText("7/10");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 3 missed cards");

    // When: the learner retries the missed cards and corrects two of the three.
    await page.getByTestId("retry-missed").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();

    // Then: results score against the original ten-card total, with a recovery note.
    await expect(page.getByTestId("score-value")).toHaveText("9/10");
    await expect(page.getByTestId("score-summary")).toHaveText("9 correct · 1 to review");
    await expect(page.getByTestId("score-recovered")).toHaveText("2 cards recovered");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 1 missed card");

    // And: reloading the results screen keeps the cumulative score.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), CUMULATIVE_RETRY_DECK);
    await expect(page.getByTestId("score-value")).toHaveText("9/10");
    await expect(page.getByTestId("score-recovered")).toHaveText("2 cards recovered");

    // When: a second retry starts, scoped only to the card that is still missed.
    await page.getByTestId("retry-missed").click();
    await expect(page.getByTestId("progress-label")).toHaveText("Card 1 of 1");

    // And: the page reloads mid-retry, before that last card is answered.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), CUMULATIVE_RETRY_DECK);
    await expect(page.getByTestId("progress-label")).toHaveText("Card 1 of 1");

    // Then: correcting the last card raises the cumulative score to a perfect result.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("10/10");
    await expect(page.getByTestId("no-missed-cards")).toBeVisible();
  });

  for (const { deck, correct, celebrates } of [
    { deck: LONG_COUNT_DECK, correct: 89, celebrates: false },
    { deck: CUMULATIVE_RETRY_DECK, correct: 9, celebrates: true },
    { deck: CUMULATIVE_RETRY_DECK, correct: 10, celebrates: true },
  ]) {
    test(`a ${correct}/${deck.cards.length} result ${celebrates ? "celebrates briefly" : "does not celebrate"}`, async ({ page }) => {
      // Given: a session on either side of the exact 90% threshold.
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openPlayer(page, deck);
      await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
      await page.clock.pauseAt("2026-01-01T01:00:00Z");

      // When: the learner finishes the session.
      await completeScoredSession(page, deck, correct);

      // Then: only qualifying scores celebrate, without moving focus from results.
      const celebration = page.getByTestId("result-celebration");
      await expect(page.getByTestId("score-value")).toHaveText(`${correct}/${deck.cards.length}`);
      await expect(page.locator("#score-title")).toBeFocused();
      if (celebrates) {
        await expect(celebration).toBeVisible();
        await expect(celebration).toHaveAttribute("aria-hidden", "true");
        // The clock pauses cleanup timers, but CSS animations may already have finished.
        expect(await celebration.evaluate(element =>
          element.getAnimations({ subtree: true }).length
        )).toBeGreaterThan(0);
        await page.clock.runFor(1600);
      }
      await expect(celebration).toHaveCount(0);
    });
  }

  test("reopening a completed high score does not replay its celebration", async ({ page }) => {
    // Given: a newly completed high score whose effect cannot expire during assertions.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await openPlayer(page, CUMULATIVE_RETRY_DECK);
    await page.clock.pauseAt("2026-01-01T01:00:00Z");
    await completeScoredSession(page, CUMULATIVE_RETRY_DECK, 9);
    await expect(page.getByTestId("result-celebration")).toBeVisible();

    // When: the same deck is reopened through the public API.
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), CUMULATIVE_RETRY_DECK);

    // Then: the saved results return without a celebration, including after reload.
    await expect(page.getByTestId("score-value")).toHaveText("9/10");
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
    // The installed, paused clock survives reload, so an erroneous replay cannot expire.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), CUMULATIVE_RETRY_DECK);
    await expect(page.getByTestId("score-value")).toHaveText("9/10");
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
  });

  test("retry and reset remain usable during celebrations", async ({ page }) => {
    // Given: a high score with one card left to review and the cleanup timer paused.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openPlayer(page, CUMULATIVE_RETRY_DECK);
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt("2026-01-01T01:00:00Z");
    await completeScoredSession(page, CUMULATIVE_RETRY_DECK, 9);
    await expect(page.getByTestId("result-celebration")).toBeVisible();

    // When: the learner immediately retries the missed card.
    await page.getByTestId("retry-missed").click();

    // Then: leaving results clears the effect and study controls work immediately.
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("10/10");
    await expect(page.getByTestId("result-celebration")).toBeVisible();

    // When: the learner immediately resets the completed retry.
    await page.getByTestId("reset-progress").click();

    // Then: the effect is removed and a new qualifying completion can celebrate.
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
    await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
    await completeScoredSession(page, CUMULATIVE_RETRY_DECK, 10);
    await expect(page.getByTestId("result-celebration")).toBeVisible();
  });

  test("reduced motion suppresses celebrations and stops an active effect", async ({ page }) => {
    // Given: the learner requests reduced motion before completing a perfect session.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPlayer(page, CUMULATIVE_RETRY_DECK);

    // When: the session completes.
    await completeScoredSession(page, CUMULATIVE_RETRY_DECK, 10);

    // Then: results remain available without an effect.
    await expect(page.getByTestId("score-value")).toHaveText("10/10");
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);

    // When: another session celebrates and reduced motion is enabled mid-effect.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByTestId("reset-progress").click();
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt("2026-01-01T01:00:00Z");
    await completeScoredSession(page, CUMULATIVE_RETRY_DECK, 10);
    await expect(page.getByTestId("result-celebration")).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Then: the running effect is removed and does not resume when motion is reenabled.
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.getByTestId("result-celebration")).toHaveCount(0);
    await expect(page.locator("#score-title")).toBeFocused();
  });

  test("disables retry when the completed session has no missed cards", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: every card is graded positively.
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) {
      await page.getByTestId("reveal-answer").click();
      await page.getByTestId("grade-known").click();
      await page.getByTestId("next-card").click();
    }

    // Then: the perfect-score empty state is shown and retry is unavailable.
    await expect(page.getByTestId("no-missed-cards")).toBeVisible();
    await expect(page.getByTestId("score-summary")).toHaveText(
      `All ${BASIC_DECK.cards.length} correct · Nothing to review`
    );
    await expect(page.getByTestId("score-missed-label")).toHaveText("Nothing to review");
    await expect(page.getByTestId("retry-missed")).toBeDisabled();
    await expect(page.getByTestId("retry-missed")).toBeHidden();
    await expect(page.getByTestId("review-scroll-cue")).toBeHidden();
  });

  test("scrolls a long score review inside the results panel", async ({ page }) => {
    await openPlayer(page, ALL_TYPES_DECK);

    // Given: every card is graded so the score screen contains a review item for each card.
    await page.evaluate((deck) => {
      const grades = { basic: "missed", mcq: "incorrect", cloze: "incorrect" };
      deck.cards.forEach((card) => window.CRAM_PLAYER.recordGrade(card.id, grades[card.type]));
      for (let index = 0; index < deck.cards.length * 2; index += 1) {
        document.querySelector("#next-card").click();
      }
    }, ALL_TYPES_DECK);
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(page.getByTestId("review-scroll-cue")).toBeVisible();

    // When: the learner uses the compact cue to reveal more of the review list.
    await page.getByTestId("review-scroll-cue").click();
    await expect.poll(() => page.evaluate(() => document.querySelector("#score-screen").scrollTop)).toBeGreaterThan(0);
    const cuePlacement = await page.evaluate(() => {
      const panelBounds = document.querySelector("#score-screen").getBoundingClientRect();
      const cueBounds = document.querySelector("#review-scroll-cue").getBoundingClientRect();
      return { cueBottom: cueBounds.bottom, panelBottom: panelBounds.bottom };
    });
    expect(cuePlacement.cueBottom).toBeGreaterThan(cuePlacement.panelBottom - 100);

    // When: the learner scrolls to the end of the review list.
    const scrollState = await page.evaluate(() => {
      const panel = document.querySelector("#score-screen");
      const lastCard = document.querySelector("#missed-cards > li:last-child");
      panel.scrollTop = panel.scrollHeight;
      const panelBounds = panel.getBoundingClientRect();
      const cardBounds = lastCard.getBoundingClientRect();
      return {
        canScroll: panel.scrollHeight > panel.clientHeight,
        moved: panel.scrollTop > 0,
        lastCardVisible: cardBounds.bottom <= panelBounds.bottom && cardBounds.top >= panelBounds.top,
      };
    });

    // Then: the final missed card is reachable without relying on page-level scrolling.
    expect(scrollState).toEqual({ canScroll: true, moved: true, lastCardVisible: true });
    await expect(page.getByTestId("review-scroll-cue")).toBeHidden();
  });

  test("reports reset storage failures without resurrecting stale grades", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: both cards have saved grades before storage removal becomes unavailable.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    for (let index = 1; index < BASIC_DECK.cards.length; index += 1) {
      await page.getByTestId("next-card").click();
    }
    await page.evaluate(() => {
      window.__originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function removeItem(key) {
        if (key.startsWith("fc:")) throw new Error("storage unavailable");
        return window.__originalRemoveItem.call(this, key);
      };
    });

    // When: the learner resets the completed deck.
    await page.getByTestId("reset-progress").click();

    // Then: the session warns about the failed removal and keeps no stale memory.
    await expect(page.locator("#player-status")).toHaveText(
      "Progress reset for this session, but saved progress could not be cleared."
    );
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});

    // And: the next successful write replaces, rather than merges, the stale entry.
    await page.evaluate(() => {
      Storage.prototype.removeItem = window.__originalRemoveItem;
    });
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
    });
  });

  test("discards malformed or old-shaped stored progress", async ({ page }) => {
    await page.goto(PLAYER_URL);
    const key = `fc:${BASIC_DECK.id}:v1`;

    // Given: the deck key contains several malformed or unsupported shapes.
    const invalidEntries = [
      "not-json",
      "null",
      "[]",
      JSON.stringify({ grades: { "coroutine-definition": "known" } }),
      JSON.stringify({ "coroutine-definition": "" }),
      JSON.stringify({ "coroutine-definition": 1 }),
      JSON.stringify({ "coroutine-definition": "bogus" }),
    ];

    for (const entry of invalidEntries) {
      // When: the page reloads and the deck is selected.
      await page.evaluate(([storageKey, storageValue]) => {
        localStorage.setItem(storageKey, storageValue);
      }, [key, entry]);
      await page.reload();
      await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);

      // Then: the player starts with empty progress instead of throwing.
      expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
    }
  });
});

for (const width of [390, 1280]) {
  test(`keeps choices and input feedback in the reading flow at ${width}px`, async ({ page }) => {
    // Given: an MCQ with a hint, followed by a cloze question.
    await page.setViewportSize({ width, height: 1000 });
    await openPlayer(page, { ...HINT_DECK, cards: HINT_DECK.cards.slice(1, 3) });
    const prompt = await page.getByTestId("card-prompt").boundingBox();
    const options = await page.getByTestId("mcq-options").boundingBox();
    expect(options.y - (prompt.y + prompt.height)).toBeLessThan(40);

    // When: an incorrect choice is submitted.
    await page.getByTestId("mcq-option").filter({ hasText: "no-cache" }).click();
    await page.getByTestId("mcq-check-answer").click();

    // Then: the result follows the choices and is the next thing to read.
    const answeredOptions = await page.getByTestId("mcq-options").boundingBox();
    const result = await page.getByTestId("mcq-feedback").boundingBox();
    expect(result.y - (answeredOptions.y + answeredOptions.height)).toBeLessThan(40);
    await expect(page.getByTestId("mcq-feedback")).toBeFocused();
    await expect(page.getByTestId("mcq-feedback")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("show-hint")).toBeHidden();

    // When: the following cloze question is answered incorrectly.
    await page.getByTestId("next-card").click();
    await page.getByTestId("cloze-input").fill("wrong");
    await page.getByTestId("cloze-check-answer").click();

    // Then: the correction follows the sentence, with an accessible link to the invalid blank.
    const sentence = await page.getByTestId("card-prompt").boundingBox();
    const feedback = await page.getByTestId("cloze-feedback").boundingBox();
    expect(feedback.y - (sentence.y + sentence.height)).toBeLessThan(40);
    await expect(page.getByTestId("cloze-input")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("cloze-input")).toHaveAccessibleDescription(/If-None-Match/);
    await expect(page.getByTestId("cloze-feedback")).toBeFocused();
    await expect(page.getByTestId("cloze-feedback")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("show-hint")).toBeHidden();
  });
}

test("shows four desktop choices and their check action without scrolling", async ({ page }) => {
  // Given: the example's four-choice question in each desktop theme.
  const example = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/http-caching-essentials.json"), "utf8"));
  await page.setViewportSize({ width: 1000, height: 850 });
  for (const theme of ["paper", "focus", "sprint"]) {
    await openPlayer(page, { ...example, cards: [example.cards.find(card => card.type === "mcq")] });
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
    await page.keyboard.press("Escape");
    const readingArea = page.getByTestId("card-content");
    const navigation = await page.getByTestId("next-card").boundingBox();

    // When: choosing an answer exposes the check action below all four options.
    await page.getByTestId("mcq-option").first().click();

    // Then: the entire question and response fit, and navigation remains in place.
    await expect(page.getByTestId("mcq-option")).toHaveCount(4);
    await expect.poll(() => readingArea.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("card-prompt")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("mcq-check-answer")).toBeInViewport({ ratio: 1 });
    expect(await page.getByTestId("next-card").boundingBox()).toEqual(navigation);
  }
});

test("renders the brand mark as a themed inline icon", async ({ page }) => {
  // Given: the player is ready in each of its visual themes.
  await openPlayer(page, BASIC_DECK);
  const brandMark = page.locator(".player__brand-mark");
  const sealFills = new Map();

  // When: the learner switches between Paper, Focus, and Sprint.
  for (const theme of ["paper", "focus", "sprint"]) {
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
    await page.keyboard.press("Escape");

    // Then: the brand remains an accessible, self-contained SVG with themed paths.
    await expect(brandMark).toHaveAttribute("aria-hidden", "true");
    expect(await brandMark.evaluate(element => element.tagName)).toBe("svg");
    expect(await brandMark.locator("path").count()).toBe(2);
    sealFills.set(theme, await brandMark.locator(".player__brand-seal").evaluate(element => getComputedStyle(element).fill));
  }

  // Then: each theme gives the inline seal its own action color.
  expect(new Set(sealFills.values()).size).toBe(3);
});

test("themes settings controls together in light and dark appearances", async ({ page }) => {
  // Given: settings remain open while the learner compares themes.
  await openPlayer(page, BASIC_DECK);
  await page.getByTestId("settings-toggle").click();
  for (const appearance of ["light", "dark"]) {
    await page.getByTestId("appearance-select").selectOption(appearance);
    const colors = [];
    const shapes = [];
    for (const theme of ["paper", "focus", "sprint"]) {
      // When: changing the theme without leaving settings.
      await page.getByTestId("theme-select").selectOption(theme);
      const shuffle = page.getByTestId("shuffle-cards");
      const panel = page.getByTestId("settings-panel");
      // Then: the controls share a theme color and the panel adopts its shape.
      await expect(panel).toBeVisible();
      const color = await panel.locator('input[type="checkbox"]').first()
        .evaluate(element => getComputedStyle(element).accentColor);
      // The button color eases into the new theme; wait for that transition.
      await expect(shuffle).toHaveCSS("color", color);
      colors.push(color);
      shapes.push(await panel.evaluate(element => {
        const style = getComputedStyle(element);
        return `${style.borderRadius} ${style.boxShadow}`;
      }));
    }
    expect(new Set(colors).size).toBe(3);
    expect(new Set(shapes).size).toBe(3);
  }
});

test("grows the desktop study panel for a long question when space allows", async ({ page }) => {
  // Given: a desktop viewport with enough room for a question taller than the baseline panel.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await openPlayer(page, {
    ...BASIC_DECK,
    cards: [
      BASIC_DECK.cards[0],
      { ...BASIC_DECK.cards[1], prompt: "Long question.\n".repeat(28) },
    ],
  });
  const initialPanel = await page.locator(".player__study-panel").boundingBox();

  // When: the learner advances to the long question.
  await page.getByTestId("next-card").click();

  // Then: the panel grows within the viewport and keeps its navigation reachable.
  const expandedPanel = await page.locator(".player__study-panel").boundingBox();
  expect(expandedPanel.height).toBeGreaterThan(initialPanel.height);
  expect(expandedPanel.height).toBeLessThanOrEqual(768);
  const prompt = await page.getByTestId("card-prompt").boundingBox();
  const navigation = await page.getByTestId("next-card").boundingBox();
  expect(prompt.y).toBeGreaterThanOrEqual(expandedPanel.y);
  expect(prompt.y).toBeLessThan(expandedPanel.y + expandedPanel.height);
  expect(navigation.y + navigation.height).toBeLessThanOrEqual(1200);
});

test("keeps the desktop attribution anchored to the viewport footer", async ({ page }) => {
  // Given: a desktop viewport where a long question can expand the study panel.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await openPlayer(page, {
    ...BASIC_DECK,
    cards: [
      BASIC_DECK.cards[0],
      { ...BASIC_DECK.cards[1], prompt: "Long question.\n".repeat(28) },
    ],
  });
  const attribution = page.locator(".player__attribution");
  const initialAttribution = await attribution.boundingBox();
  const initialStyle = await attribution.evaluate(element => getComputedStyle(element).position);

  // When: the learner advances to the card that grows the panel.
  await page.getByTestId("next-card").click();

  // Then: attribution remains fixed at the viewport footer instead of following the panel.
  const expandedAttribution = await attribution.boundingBox();
  const panel = await page.locator(".player__study-panel").boundingBox();
  expect(initialStyle).toBe("fixed");
  expect(expandedAttribution).toEqual(initialAttribution);
  expect(expandedAttribution.y + expandedAttribution.height).toBeGreaterThan(panel.y + panel.height);
  expect(1200 - (expandedAttribution.y + expandedAttribution.height)).toBeLessThanOrEqual(32);
});

test("scrolls long desktop cards internally and switches to page scrolling on phones", async ({ page }) => {
  // Given: a desktop card with an answer longer than the available screen.
  await page.setViewportSize({ width: 1280, height: 844 });
  await openPlayer(page, { ...BASIC_DECK, cards: [
    { ...BASIC_DECK.cards[0], answer: "Read from the beginning.\n" + "A detailed explanation.\n".repeat(80) },
    BASIC_DECK.cards[1],
  ] });
  await page.getByTestId("reveal-answer").click();
  const readingArea = page.getByTestId("card-content");

  // When: keyboard scrolling moves through the answer.
  await readingArea.focus();
  const previousScroll = await readingArea.evaluate(element => element.scrollTop);
  await page.keyboard.press("PageDown");

  // Then: only the card's body moves, and navigation stays visible.
  await expect.poll(() => readingArea.evaluate(element => element.scrollTop)).toBeGreaterThan(previousScroll);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(845);
  await expect(page.getByTestId("next-card")).toBeInViewport({ ratio: 1 });

  // When: the same long card is viewed on a phone.
  await page.setViewportSize({ width: 390, height: 844 });

  // Then: the content is part of the page, and advancing starts the next question in view.
  await expect.poll(() => readingArea.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(844);
  await page.getByTestId("grade-known").click();
  await page.getByTestId("next-card").click();
  await expect(page.getByTestId("card-prompt")).toBeInViewport({ ratio: 1 });
  await expect.poll(() => readingArea.evaluate(element => element.scrollTop)).toBe(0);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`advances through changing cards from a stable navigation target at ${viewport.width}px`, async ({ page }) => {
    // Given: short and long cards share a navigation target; desktop panels may grow within the viewport.
    await page.setViewportSize(viewport);
    await openPlayer(page, { ...BASIC_DECK, cards: [
      BASIC_DECK.cards[0],
      { ...BASIC_DECK.cards[1], prompt: "Long question.\n".repeat(60) },
      { ...BASIC_DECK.cards[0], id: "last-card" },
    ] });
    const next = page.getByTestId("next-card");
    const anchor = await next.boundingBox();
    const previousAnchor = await page.getByTestId("previous-card").boundingBox();
    await expect(next).toHaveAccessibleName("Skip to next card");

    // Desktop navigation belongs directly below the reading area, not at the window edge.
    if (viewport.width >= 768) {
      const card = await page.getByTestId("card").boundingBox();
      expect(anchor.y).toBeGreaterThanOrEqual(card.y + card.height);
      expect(anchor.y - (card.y + card.height)).toBeLessThan(24);
    }

    // When: revealing and grading changes both the card height and the button label.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();

    // Then: Next occupies exactly the same click target as Skip.
    await expect(next).toHaveAccessibleName("Next card");
    expect(await next.boundingBox()).toEqual(anchor);
    expect(await page.getByTestId("previous-card").boundingBox()).toEqual(previousAnchor);
    const clickPoint = { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height / 2 };
    await page.mouse.click(clickPoint.x, clickPoint.y);

    // When: the long card is scrolled and skipped by clicking the same coordinates.
    await page.getByTestId("card-content").focus();
    await page.keyboard.press("PageDown");
    const longAnchor = await next.boundingBox();
    expect(longAnchor.x).toBe(anchor.x);
    expect(longAnchor.width).toBe(anchor.width);
    expect(longAnchor.height).toBe(anchor.height);
    expect(Math.abs(longAnchor.y - anchor.y)).toBeLessThanOrEqual(8);
    expect(clickPoint.y).toBeGreaterThanOrEqual(longAnchor.y);
    expect(clickPoint.y).toBeLessThanOrEqual(longAnchor.y + longAnchor.height);
    await page.mouse.click(clickPoint.x, clickPoint.y);

    // Then: the final card's See results button also stays put and can be clicked again.
    await expect(page.getByTestId("card-position")).toHaveText("3/3");
    await expect(next).toHaveAccessibleName("See results");
    expect(await next.boundingBox()).toEqual(anchor);
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await expect(page.getByTestId("score-screen")).toBeVisible();
    await expect(next).toBeHidden();
  });
}

test("keeps the last mobile answer controls above the fixed navigation bar", async ({ page }) => {
  // Given: a long answer needs page scrolling on a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlayer(page, { ...BASIC_DECK, cards: [
    { ...BASIC_DECK.cards[0], answer: "Explanation.\n".repeat(80) },
  ] });
  await page.getByTestId("reveal-answer").click();

  // When: the learner reaches the end of the document.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  // Then: grading is fully visible and clickable above navigation, without an overlay.
  const grade = await page.getByTestId("grade-known").boundingBox();
  const navigation = await page.getByRole("navigation", { name: "Card navigation" }).boundingBox();
  expect(grade.y + grade.height).toBeLessThanOrEqual(navigation.y);
  await page.getByTestId("grade-known").click();
  await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
});

for (const themeName of ["paper", "focus", "sprint"]) {
  test(`keeps appearance independent from the ${themeName} theme`, async ({ page }) => {
    // Given: a named theme with an explicitly dark appearance.
    await page.emulateMedia({ colorScheme: "dark" });
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("settings-toggle").click();
    const theme = page.getByRole("combobox", { name: "Theme", exact: true });
    const appearance = page.getByRole("combobox", { name: "Appearance", exact: true });
    const body = page.locator("body");
    await theme.selectOption(themeName);
    await appearance.selectOption("dark");
    const darkBackground = await body.evaluate(element => getComputedStyle(element).backgroundColor);

    // When: the OS changes to light, then the learner explicitly chooses Light.
    await page.emulateMedia({ colorScheme: "light" });
    await expect(body).toHaveCSS("background-color", darkBackground);
    await appearance.selectOption("light");
    const lightBackground = await body.evaluate(element => getComputedStyle(element).backgroundColor);

    // Then: explicit modes differ, ignore OS changes, and persist with the theme.
    expect(lightBackground).not.toBe(darkBackground);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(body).toHaveCSS("background-color", lightBackground);
    await page.reload();
    await page.getByTestId("settings-toggle").click();
    await expect(theme).toHaveValue(themeName);
    await expect(appearance).toHaveValue("light");
    await expect(body).toHaveCSS("background-color", lightBackground);

    // When: System is restored while the OS is dark, including after reopening the file.
    await appearance.selectOption("");
    await expect(body).toHaveCSS("background-color", darkBackground);
    await page.reload();
    await page.getByTestId("settings-toggle").click();
    await expect(theme).toHaveValue(themeName);
    await expect(appearance).toHaveValue("");
    await expect(body).toHaveCSS("background-color", darkBackground);

    // Then: the visible theme follows subsequent OS changes in both directions.
    await page.emulateMedia({ colorScheme: "light" });
    await expect(body).toHaveCSS("background-color", lightBackground);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(body).toHaveCSS("background-color", darkBackground);
  });
}

test("keeps dark cards and settings readable across themes", async ({ page }) => {
  // Given: each named theme is shown with an explicitly dark appearance.
  await page.emulateMedia({ colorScheme: "light" });
  for (const themeName of ["paper", "focus", "sprint"]) {
    await openPlayer(page, BASIC_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(themeName);
    await page.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");

    // When: the learner inspects the card while the settings panel is open.
    const palette = await readSurfacePalette(page);

    // Then: dark surfaces stay dark while their text remains light enough to read.
    expect(palette.card.background).toBeLessThan(0.1);
    expect(palette.settings.background).toBeLessThan(0.1);
    expect(palette.card.color).toBeGreaterThan(0.65);
    expect(palette.settings.color).toBeGreaterThan(0.65);
  }
});

test("switches complete themes without losing an unfinished answer or saved progress", async ({ page }) => {
  // Given: an unfinished cloze answer in a mobile player.
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlayer(page, CLOZE_DECK);
  await page.getByRole("textbox", { name: "Blank 1", exact: true }).fill("If-None-Match");
  await page.getByTestId("settings-toggle").click();

  // When: the learner compares light, dark, and tinted themes before submitting.
  for (const theme of ["focus", "sprint", "paper"]) {
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
    await page.keyboard.press("Escape");

    // Then: changing the complete appearance preserves the unfinished input.
    await expect(page.getByRole("textbox", { name: "Blank 1", exact: true })).toHaveValue("If-None-Match");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByTestId("settings-toggle").click();
  }
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("sprint");
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Blank 2", exact: true }).fill("304");
  await page.getByRole("button", { name: "Check answers", exact: true }).click();

  // When: the file is reopened after grading.
  await page.reload();
  await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), CLOZE_DECK);
  await page.getByTestId("settings-toggle").click();

  // Then: the single theme preference and the recorded answer are restored.
  await expect(page.getByRole("combobox", { name: "Theme", exact: true })).toHaveValue("sprint");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("cloze-feedback-summary")).toHaveText("Correct.");
});

for (const theme of ["paper", "focus", "sprint"]) {
  test(`completes every card type on a narrow screen in the ${theme} theme`, async ({ page }) => {
    // Given: a phone-width player using the selected theme.
    await page.setViewportSize({ width: 320, height: 568 });
    await openPlayer(page, ADAPTIVE_TYPES_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
    await page.keyboard.press("Escape");

    // When: a learner reveals, self-grades, selects, and types through the deck.
    await page.getByTestId("reveal-answer").click();
    await expect(page.getByTestId("card-answer")).toBeVisible();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("card-prompt")).toBeInViewport();
    await page.getByRole("button", { name: "The missed one", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByTestId("next-card").click();
    await page.getByRole("textbox", { name: "Blank 1", exact: true }).fill("card");
    await page.getByRole("button", { name: "Check answers", exact: true }).click();
    await page.getByTestId("next-card").click();

    // Then: controls remain reachable, the round completes, and no horizontal scroll is needed.
    await expect(page.getByTestId("score-value")).toHaveText("3/3");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByTestId("reset-progress").click();
    await expect(page.getByTestId("reveal-answer")).toBeVisible();
  });
}

test("keeps theme switching usable when preference storage is blocked", async ({ page }) => {
  // Given: this browser cannot read or write local preferences.
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await openPlayer(page, BASIC_DECK);
  await page.getByTestId("reveal-answer").click();

  // When: the learner changes the theme while inspecting an answer.
  await page.getByTestId("settings-toggle").click();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("focus");
  await page.keyboard.press("Escape");

  // Then: the theme applies for this session without hiding the answer.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "focus");
  await expect(page.getByTestId("card-answer")).toBeVisible();
  await page.getByTestId("grade-known").click();
  await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
});

test.describe("hints", () => {
  test("reveals and records hints across basic, MCQ, and cloze cards", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: a basic card with a hint starts with the hint hidden and unrecorded.
    await expect(page.getByTestId("show-hint")).toBeVisible();
    await expect(page.getByTestId("card-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(false);

    // When: the learner requests the hint, then marks the basic card missed.
    await page.getByTestId("show-hint").click();

    // Then: the hint is revealed and recorded independently of the grade.
    await expect(page.getByTestId("card-hint")).toHaveText(HINT_DECK.cards[0].hint);
    await expect(page.getByTestId("card-hint")).toBeVisible();
    await expect(page.getByTestId("show-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(true);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();

    // Given: the MCQ card also has a hidden hint.
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("show-hint")).toBeVisible();
    await expect(page.getByTestId("card-hint")).toBeHidden();

    // When: the learner requests it and submits an incorrect option.
    await page.getByTestId("show-hint").click();
    await page.getByTestId("mcq-option").filter({ hasText: "no-cache" }).click();
    await page.getByTestId("mcq-check-answer").click();

    // Then: the result replaces the hint, while its use remains recorded for this session.
    await expect(page.getByTestId("card-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-mcq-card"))).toBe(true);

    // Given/When: the cloze learner requests its hint and submits an incorrect answer.
    await page.getByTestId("next-card").click();
    await page.getByTestId("show-hint").click();
    await expect(page.getByTestId("card-hint")).toHaveText(HINT_DECK.cards[2].hint);
    await expect(page.getByTestId("card-hint")).toBeVisible();
    await expect(page.getByTestId("show-hint")).toBeHidden();
    await page.getByTestId("cloze-input").fill("wrong");
    await page.getByTestId("cloze-check-answer").click();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-cloze-card"))).toBe(true);

    // Then: a card without a hint renders no hint affordance at all.
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("show-hint")).toHaveCount(0);
    await expect(page.getByTestId("card-hint")).toHaveCount(0);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();

    // And: the normal session's missed-card review identifies exactly the cards that needed hints.
    await expect(page.getByTestId("score-value")).toHaveText("0/4");
    await expect(page.getByTestId("missed-hint")).toHaveCount(3);
    const missedCards = page.getByTestId("missed-card");
    await expect(
      missedCards.filter({ hasText: HINT_DECK.cards[0].prompt }).getByTestId("missed-hint")
    ).toHaveCount(1);
    await expect(
      missedCards.filter({ hasText: HINT_DECK.cards[1].prompt }).getByTestId("missed-hint")
    ).toHaveCount(1);
    await expect(
      missedCards.filter({ hasText: HINT_DECK.cards[2].prompt }).getByTestId("missed-hint")
    ).toHaveCount(1);
    await expect(
      missedCards.filter({ hasText: HINT_DECK.cards[3].prompt }).getByTestId("missed-hint")
    ).toHaveCount(0);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().hintsUsed)).toEqual({
      "hint-basic-card": true,
      "hint-mcq-card": true,
      "hint-cloze-card": true,
    });

    // When: the learner resets progress from the score screen.
    await page.getByTestId("reset-progress").click();

    // Then: the session-only hint state is cleared with the rest of the session.
    await expect(page.getByTestId("show-hint")).toBeVisible();
    await expect(page.getByTestId("card-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().hintsUsed)).toEqual({});
  });

  test("clears hint usage when switching to another deck with the same card id", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the current deck has recorded a hint for its first card.
    await page.getByTestId("show-hint").click();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(true);

    // When: another deck reuses that card id.
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), SAME_CARD_ID_DECK);

    // Then: hint state belongs to the selected deck and does not leak across ids.
    await expect(page.getByTestId("show-hint")).toHaveCount(0);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(false);
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().hintsUsed)).toEqual({});
  });

  test("rejects hint usage for cards without a hint", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // When: a caller tries to record a hint for a card that has no hint field.
    const message = await page.evaluate(() => {
      try {
        window.CRAM_PLAYER.recordHintUsed("without-hint-card");
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    // Then: the invalid request is rejected without creating hint state.
    expect(message).toBe("That card does not have a hint.");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().hintsUsed)).toEqual({});
  });

  test("rejects hint usage for cards outside the active deck", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // When: a caller tries to record a hint for an unknown card id.
    const message = await page.evaluate(() => {
      try {
        window.CRAM_PLAYER.recordHintUsed("not-in-this-deck");
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    // Then: the invalid request is rejected without changing public state.
    expect(message).toBe("That card is not in the current deck.");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().hintsUsed)).toEqual({});
  });

  test("restores hint usage with the session while keeping grade history separate", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given/When: the learner requests a hint before recording a grade.
    await page.getByTestId("show-hint").click();

    // Then: hint usage does not create an entry in grade history.
    expect(await page.evaluate((deckId) => localStorage.getItem(`fc:${deckId}:v1`), HINT_DECK.id)).toBeNull();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(true);
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), HINT_DECK.id)).toEqual({
      "hint-basic-card": "missed",
    });

    // When: the page reloads and selects the same deck.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), HINT_DECK);

    // Then: the restored answer keeps hints collapsed, but retains their use for review.
    await expect(page.getByTestId("show-hint")).toBeHidden();
    await expect(page.getByTestId("card-answer")).toBeVisible();
    await expect(page.getByTestId("card-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(true);
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), HINT_DECK.id)).toEqual({
      "hint-basic-card": "missed",
    });
  });
});

test.describe("card controls", () => {
  test("remembers disabled letter shortcuts while keeping controls usable", async ({ page }) => {
    // Given: letter shortcuts are disabled in settings.
    await openPlayer(page, HINT_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("checkbox", { name: "Single-letter shortcuts", exact: true }).uncheck();
    await page.keyboard.press("Escape");

    // When: the preference is restored after a reload.
    await page.reload();
    await page.evaluate(deck => window.CRAM_PLAYER.setDeck(deck), HINT_DECK);
    await page.keyboard.press("h");
    await page.keyboard.press("a");

    // Then: letters do nothing, but explicit controls and arrow navigation still work.
    await expect(page.getByTestId("card-hint")).toBeHidden();
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("reveal-answer")).not.toHaveAttribute("aria-keyshortcuts");
    await page.getByTestId("reveal-answer").click();
    await expect(page.getByTestId("card-answer")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[1].prompt);

    // When: shortcuts are enabled again while a cloze answer is in progress.
    await page.keyboard.press("ArrowRight");
    await page.getByTestId("cloze-input").fill("draft");
    await page.getByTestId("settings-toggle").click();
    await page.getByRole("checkbox", { name: "Single-letter shortcuts", exact: true }).check();
    await page.keyboard.press("Escape");
    await page.keyboard.press("h");

    // Then: enabling shortcuts preserves the draft and restores hint activation.
    await expect(page.getByTestId("cloze-input")).toHaveValue("draft");
    await expect(page.getByTestId("card-hint")).toBeVisible();
  });

  test("keeps card shortcuts out of the theme selector", async ({ page }) => {
    // Given: the learner is using a native selection control in settings.
    await openPlayer(page, HINT_DECK);
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("theme-select").focus();

    // When: keys that also have player shortcuts are sent to the selector.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("h");
    await page.keyboard.press("a");

    // Then: the current card stays unanswered and navigation does not run.
    await expect(page.getByTestId("theme-select")).toBeFocused();
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-hint")).toBeHidden();
    await expect(page.getByTestId("card-answer")).toBeHidden();
  });

  for (const forcedColors of ["none", "active"]) {
    test(`keeps focus on revealed content with forced colors ${forcedColors}`, async ({ page }) => {
      await page.emulateMedia({ forcedColors });
      // Given: a deck with all three card types and hints.
      await openPlayer(page, HINT_DECK);
      await page.getByTestId("show-hint").focus();

      // When: a keyboard action hides its button, focus follows the revealed content.
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("card-hint")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByTestId("reveal-answer")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("card-answer")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByTestId("grade-missed")).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowRight");
      await page.getByRole("button", { name: "no-store", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByTestId("mcq-check-answer").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("mcq-feedback")).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.getByTestId("cloze-input").fill("If-None-Match");
      await page.getByTestId("cloze-check-answer").focus();
      await page.keyboard.press("Enter");

      // Then: the last feedback remains focused and keyboard navigation still works.
      await expect(page.getByTestId("cloze-feedback")).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await expect(page.locator("#score-title")).toBeFocused();
    });
  }

  for (const { width, height, textSize } of [
    { width: 320, height: 256, textSize: "16px" },
    { width: 640, height: 512, textSize: "32px" },
  ]) {
    test(`keeps study and retry controls reachable at ${width} by ${height} with ${textSize} text`, async ({ page }) => {
      // Given: a short viewport representing zoom, optionally with doubled text size.
      await page.setViewportSize({ width, height });
      await openPlayer(page, RETRY_DECK);
      await page.addStyleTag({ content: `:root { font-size: ${textSize}; }` });
      await page.mouse.move(width - 2, height / 2);
      await page.mouse.wheel(0, 5000);
      await expect(page.getByTestId("next-card")).toBeInViewport({ ratio: 0.99 });

      // When: each card is answered using controls scrolled into view.
      for (let index = 0; index < RETRY_DECK.cards.length; index += 1) {
        for (const name of ["reveal-answer", "grade-missed", "next-card"]) {
          const control = page.getByTestId(name);
          await control.scrollIntoViewIfNeeded();
          await expect(control).toBeInViewport({ ratio: 0.99 });
          await control.click();
        }
      }

      // Then: results and retry remain reachable without horizontal scrolling.
      const retry = page.getByTestId("retry-missed");
      await retry.scrollIntoViewIfNeeded();
      await expect(retry).toBeInViewport({ ratio: 0.99 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await retry.click();
      await page.getByTestId("settings-toggle").click();
      const shortcuts = page.getByRole("checkbox", { name: "Single-letter shortcuts", exact: true });
      await shortcuts.scrollIntoViewIfNeeded();
      await expect(shortcuts).toBeInViewport({ ratio: 0.99 });
      await shortcuts.uncheck();
    });
  }

  test("announces prompts and cloze blanks without revealing answers or hints", async ({ page }) => {
    // Given: unanswered basic, MCQ, and cloze cards with hidden hints.
    await openPlayer(page, HINT_DECK);
    const announcement = page.locator("#card-announcer");
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("card-hint")).toBeHidden();

    // When: the learner navigates through the unanswered cards.
    // Then: only each prompt is announced, with a spoken placeholder for the cloze blank.
    await expect(announcement).toHaveText(`Card 1 of 4. ${HINT_DECK.cards[0].prompt}`);
    await page.getByTestId("next-card").click();
    await expect(announcement).toHaveText(`Card 2 of 4. ${HINT_DECK.cards[1].prompt}`);
    await page.getByTestId("next-card").click();
    await expect(announcement).toHaveText("Card 3 of 4. A cache revalidates with Blank 1.");
    await expect(page.getByTestId("cloze-input")).toHaveValue("");
    await expect(page.getByTestId("card-hint")).toBeHidden();
  });

  test("uses state-aware keyboard shortcuts for help, answers, and navigation", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the current card advertises its help and navigation shortcuts.
    await expect(page.getByTestId("show-hint")).toHaveAttribute("aria-keyshortcuts", "H");
    await expect(page.getByTestId("reveal-answer")).toHaveAttribute("aria-keyshortcuts", "A");
    await expect(page.getByTestId("previous-card")).toHaveAttribute("aria-keyshortcuts", "ArrowLeft");
    await expect(page.getByTestId("next-card")).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
    await expect(page.getByRole("group", { name: "Optional hint" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Answer actions" })).toBeVisible();

    // When: the learner uses the card shortcuts instead of pointer clicks.
    await page.keyboard.press("h");
    await expect(page.getByTestId("card-hint")).toBeVisible();
    await page.keyboard.press("a");

    // Then: the answer takes over from the hint without changing grading.
    await expect(page.getByTestId("card-hint")).toBeHidden();
    await expect(page.getByTestId("card-answer")).toBeVisible();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("hint-basic-card"))).toBeUndefined();

    // And: the arrow keys navigate while the removed N/P mnemonics do nothing.
    await page.keyboard.press("n");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[0].prompt);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[1].prompt);
    await page.keyboard.press("p");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[1].prompt);
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[0].prompt);
  });

  test("does not trigger global shortcuts while typing a cloze answer", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the learner has navigated to a cloze card with an available hint.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const input = page.getByTestId("cloze-input").first();

    // When: the learner types the shortcut letter into the answer field.
    await input.focus();
    await page.keyboard.press("h");

    // Then: the input receives the character and the hint remains hidden.
    await expect(input).toHaveValue("h");
    await expect(page.getByTestId("card-hint")).toBeHidden();
  });

  test("reveals the MCQ primary action after the learner chooses an option", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the learner is on an MCQ card before making a choice.
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("mcq-check-answer")).toBeHidden();

    // When: the learner selects an option.
    await page.getByTestId("mcq-option").first().click();

    // Then: only the now-relevant check action is presented as the next step.
    await expect(page.getByTestId("mcq-check-answer")).toBeVisible();
    await expect(page.getByRole("group", { name: "Answer actions" })).toBeVisible();
  });
});

test("renders a fallback for unsupported card types", async ({ page }) => {
  await openPlayer(page, UNSUPPORTED_DECK);

  // Given/When: the shell receives the unsupported ordering card.
  // Then: it keeps the prompt but exposes no renderer-specific controls.
  await expect(page.getByTestId("card-type")).toHaveText("ordering");
  await expect(page.getByTestId("card-prompt")).toHaveText(UNSUPPORTED_DECK.cards[0].prompt);
  await expect(
    page.getByTestId("card-content").getByText("The “ordering” card renderer is not installed yet.")
  ).toBeVisible();
  await expect(page.getByTestId("reveal-answer")).toHaveCount(0);
});

test("persists grades for a renderer supplied through the public registry", async ({ page }) => {
  await openPlayer(page, CUSTOM_DECK);

  // Given: a self-contained renderer registers its own grade vocabulary.
  await page.evaluate((deck) => {
    const customRenderer = ({ card, createPromptElement }) => createPromptElement(card.prompt);
    window.CRAM_PLAYER.registerCardRenderer(
      "custom",
      customRenderer,
      {
        gradeValidator: (grade) => grade === "remembered",
        positiveGradeValidator: (grade) => grade === "remembered"
      }
    );
    window.CRAM_PLAYER.setDeck(deck);

    // When: the renderer records its opaque grade through the shared player API.
    window.CRAM_PLAYER.recordGrade("custom-card", "remembered");
  }, CUSTOM_DECK);
  await expect(page.getByTestId("card-prompt")).toHaveText(CUSTOM_DECK.cards[0].prompt);
  await expect(
    page.getByText("The “custom” card renderer is not installed yet.")
  ).toHaveCount(0);
  await page.getByTestId("next-card").click();
  await expect(page.getByTestId("score-value")).toHaveText("1/1");

  // When: the page reloads and the deck is selected before its renderer is registered.
  await page.reload();
  await page.evaluate((deck) => {
    window.CRAM_PLAYER.setDeck(deck);
  }, CUSTOM_DECK);
  await page.evaluate(() => {
    const customRenderer = ({ card, createPromptElement }) => createPromptElement(card.prompt);
    window.CRAM_PLAYER.registerCardRenderer(
      "custom",
      customRenderer,
      {
        gradeValidator: (grade) => grade === "remembered",
        positiveGradeValidator: (grade) => grade === "remembered"
      }
    );
  });

  // Then: the renderer-owned grade validator restores the saved custom value.
  expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
    "custom-card": "remembered",
  });

  // And: a value loaded before registration is discarded when the renderer validates it.
  await page.reload();
  await page.evaluate((deck) => {
    localStorage.setItem(`fc:${deck.id}:v1`, JSON.stringify({ "custom-card": "forgotten" }));
    window.CRAM_PLAYER.setDeck(deck);
  }, CUSTOM_DECK);
  expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
    "custom-card": "forgotten",
  });
  await page.evaluate(() => {
    const customRenderer = ({ card, createPromptElement }) => createPromptElement(card.prompt);
    window.CRAM_PLAYER.registerCardRenderer(
      "custom",
      customRenderer,
      {
        gradeValidator: (grade) => grade === "remembered",
        positiveGradeValidator: (grade) => grade === "remembered"
      }
    );
  });
  expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
});

test("completes opaque custom cards without adaptive requeueing", async ({ page }) => {
  await openPlayer(page, CUSTOM_DECK);

  // Given: a custom renderer accepts an opaque grade but does not declare mastery semantics.
  await page.evaluate((deck) => {
    const customRenderer = ({ card, createPromptElement }) => createPromptElement(card.prompt);
    window.CRAM_PLAYER.registerCardRenderer("custom", customRenderer, {
      gradeValidator: (grade) => grade === "opaque",
    });
    window.CRAM_PLAYER.setDeck(deck);

    // When: the renderer records its opaque grade through the shared player API.
    window.CRAM_PLAYER.recordGrade("custom-card", "opaque");
  }, CUSTOM_DECK);

  // Then: the session retires the card instead of creating an endless drill queue.
  await page.getByTestId("next-card").click();
  await expect(page.getByTestId("score-value")).toHaveText("0/1");
});

test("gives custom renderers a narrow player facade and navigation metadata", async ({ page }) => {
  await openPlayer(page, REQUIRED_CUSTOM_DECK);

  // Given: a custom renderer declares that its card requires a grade to advance.
  await page.evaluate(() => {
    const customRenderer = ({ card, createPromptElement, player }) => {
      window.__rendererFacade = {
        canSetDeck: typeof player.setDeck === "function",
        canRegisterCardRenderer: typeof player.registerCardRenderer === "function",
        canReadShellState: typeof player.getState === "function",
        canRecordGrade: typeof player.recordGrade === "function",
        canReadGrade: typeof player.getGrade === "function",
      };
      return createPromptElement(card.prompt);
    };
    window.CRAM_PLAYER.registerCardRenderer("custom", customRenderer, {
      requiresGrade: true,
    });
  });

  // Then: the shell exposes only grading methods and applies the declared policy.
  await expect(page.getByTestId("next-card")).toHaveText("Skip →");
  expect(await page.evaluate(() => window.__rendererFacade)).toEqual({
    canSetDeck: false,
    canRegisterCardRenderer: false,
    canReadShellState: false,
    canRecordGrade: true,
    canReadGrade: true,
  });
});

test("does not partially install a renderer whose validator throws", async ({ page }) => {
  await openPlayer(page, CUSTOM_DECK);
  await page.evaluate((deck) => window.CRAM_PLAYER.recordGrade("custom-card", "opaque"), CUSTOM_DECK);

  // When: registration fails while validating the already-selected deck's grades.
  const message = await page.evaluate(() => {
    try {
      window.CRAM_PLAYER.registerCardRenderer(
        "custom",
        ({ card, createPromptElement }) => createPromptElement(card.prompt),
        { gradeValidator: () => { throw new Error("validator failed"); } }
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  });

  // Then: the failed registration leaves the fallback renderer intact.
  expect(message).toBe("validator failed");
  await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), CUSTOM_DECK);
  await expect(
    page.getByTestId("card-content").getByText("The “custom” card renderer is not installed yet.")
  ).toBeVisible();
});

test("updates an open player when another tab changes the same deck", async ({ page, context }) => {
  await openPlayer(page, BASIC_DECK);
  const otherPage = await context.newPage();
  try {
    await otherPage.goto(PLAYER_URL);
    await otherPage.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), BASIC_DECK);

    // Given: two open players are viewing the same deck.
    await otherPage.evaluate((cardId) => {
      window.CRAM_PLAYER.recordGrade(cardId, "known");
    }, BASIC_DECK.cards[0].id);

    // Then: the first player refreshes only the changed card and shows its grade.
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    for (let index = 0; index < BASIC_DECK.cards.length; index += 1) {
      await page.getByTestId("next-card").click();
    }
    await expect(page.getByTestId("score-value")).toHaveText(`1/${BASIC_DECK.cards.length}`);

    // When: the second player grades the remaining card.
    await otherPage.evaluate((cardId) => {
      window.CRAM_PLAYER.recordGrade(cardId, "known");
    }, BASIC_DECK.cards[1].id);

    // Then: the results view in the first player reflects the remote update.
    await expect(page.getByTestId("score-value")).toHaveText(`2/${BASIC_DECK.cards.length}`);
  } finally {
    await otherPage.close();
  }
});

test("discards stale session-only answer details after a remote grade change", async ({ page, context }) => {
  await openPlayer(page, ALL_TYPES_DECK);
  const otherPage = await context.newPage();
  try {
    await otherPage.goto(PLAYER_URL);
    await otherPage.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), ALL_TYPES_DECK);
    await page.getByTestId("next-card").click();
    await otherPage.getByTestId("next-card").click();

    // Given: this tab records a wrong MCQ choice and keeps its session-only detail.
    await page.getByTestId("mcq-option").filter({ hasText: "no-cache" }).click();
    await page.getByTestId("mcq-check-answer").click();

    // When: another tab changes the aggregate grade for the same card.
    await otherPage.evaluate((cardId) => {
      window.CRAM_PLAYER.recordGrade(cardId, "correct", { choice: "no-store" });
    }, ALL_TYPES_DECK.cards[1].id);

    // Then: the current tab shows the remote grade without the old selected choice.
    await expect(page.getByTestId("mcq-feedback")).toHaveAttribute("data-result", "correct");
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-cache" }))
      .not.toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-cache" }))
      .not.toHaveClass(/mcq__option--incorrect/);
    await expect(page.getByTestId("mcq-option").filter({ hasText: "no-store" }))
      .toHaveClass(/mcq__option--correct/);
  } finally {
    await otherPage.close();
  }
});

test("checks cloze blanks with exact alternatives and restores aggregate feedback", async ({ page }) => {
  await openPlayer(page, CLOZE_DECK);

  // Given: inline blanks replace their markup while surrounding prompt text remains visible.
  await expect(page.getByTestId("card-prompt")).toHaveText("Send  and accept .");
  await expect(page.getByTestId("cloze-input")).toHaveCount(2);
  await expect(page.getByTestId("cloze-feedback")).toBeHidden();

  // When: one blank is exact (with case/whitespace normalization) and the other is a near miss.
  await page.getByTestId("cloze-input").nth(0).fill("  if-none-match ");
  await page.getByTestId("cloze-input").nth(1).fill("304 Not Modifie");
  await page.getByTestId("cloze-check-answer").click();

  // Then: every blank exposes its own result, and exactly one aggregate grade is recorded.
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveAttribute("data-result", "correct");
  await expect(page.getByTestId("cloze-input").nth(1)).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByTestId("cloze-feedback")).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByTestId("cloze-blank-feedback").nth(1)).toHaveText("304 / 304 Not Modified");
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("cloze-card"))).toBe("incorrect");

  // Returning to the card within the same session restores the submitted answer and its per-blank result.
  await page.getByTestId("next-card").click();
  await page.getByTestId("previous-card").click();
  await expect(page.getByTestId("cloze-feedback-summary")).toHaveText("Incorrect.");
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveValue("  if-none-match ");
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveAttribute("data-result", "correct");
  await expect(page.getByTestId("cloze-input").nth(1)).toHaveValue("304 Not Modifie");
  await expect(page.getByTestId("cloze-input").nth(1)).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByTestId("cloze-blank-feedback").nth(1)).toHaveText("304 / 304 Not Modified");

  // But reloading the page only restores the aggregate grade, since the detail is session-only.
  await page.reload();
  await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), CLOZE_DECK);
  await expect(page.getByTestId("cloze-feedback-summary")).toHaveText("This card was previously marked incorrect.");
  await expect(page.getByTestId("cloze-blank-feedback").nth(0)).toBeHidden();
  await expect(page.getByTestId("cloze-input").nth(0)).not.toHaveAttribute("data-result");
  await expect(page.getByTestId("cloze-blank-feedback").nth(1)).toBeHidden();
  await expect(page.getByTestId("cloze-input").nth(1)).not.toHaveAttribute("data-result");

  // A fresh attempt accepts the pipe-separated alternative with case/whitespace normalization.
  await openPlayer(page, CLOZE_DECK);
  await page.getByTestId("cloze-input").nth(0).fill("If-None-Match");
  await page.getByTestId("cloze-input").nth(1).fill(" 304 NOT MODIFIED ");
  await page.getByTestId("cloze-check-answer").click();
  await expect(page.getByTestId("cloze-feedback")).toHaveAttribute("data-result", "correct");
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveAttribute("data-result", "correct");
  await expect(page.getByTestId("cloze-input").nth(1)).toHaveAttribute("data-result", "correct");
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("cloze-card"))).toBe("correct");
});

test("keeps session-only grade details immutable through the public API", async ({ page }) => {
  await openPlayer(page, CLOZE_DECK);

  // Given: the learner submits a mixed-result cloze answer.
  await page.getByTestId("cloze-input").nth(0).fill("wrong");
  await page.getByTestId("cloze-input").nth(1).fill("304");
  await page.getByTestId("cloze-check-answer").click();

  // When: a caller tries to mutate the returned renderer detail.
  const detail = await page.evaluate(() => {
    const gradeDetail = window.CRAM_PLAYER.getGradeDetail("cloze-card");
    const frozen = {
      detail: Object.isFrozen(gradeDetail),
      results: Object.isFrozen(gradeDetail.results),
      values: Object.isFrozen(gradeDetail.values),
    };
    gradeDetail.results[0] = true;
    gradeDetail.values[0] = "tampered";
    return { frozen, current: window.CRAM_PLAYER.getGradeDetail("cloze-card") };
  });

  // Then: the stored detail remains unchanged and still restores the submitted answer.
  expect(detail.frozen).toEqual({ detail: true, results: true, values: true });
  expect(detail.current).toEqual({ results: [false, true], values: ["wrong", "304"] });
  await page.getByTestId("next-card").click();
  await page.getByTestId("previous-card").click();
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveValue("wrong");
  await expect(page.getByTestId("cloze-input").nth(0)).toHaveAttribute("data-result", "incorrect");
});

test("clears session-only grade details when a deck switch fails", async ({ page }) => {
  await openPlayer(page, CLOZE_DECK);

  // Given: the current deck has a submitted cloze detail.
  await page.getByTestId("cloze-input").nth(0).fill("wrong");
  await page.getByTestId("cloze-input").nth(1).fill("304");
  await page.getByTestId("cloze-check-answer").click();
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGradeDetail("cloze-card"))).toBeTruthy();

  // When: the host attempts to switch to an invalid deck.
  await page.evaluate(() => window.CRAM_PLAYER.setDeck({ title: "", cards: [] }));

  // Then: the failed switch cannot expose the previous deck's submitted detail.
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGradeDetail("cloze-card"))).toBeUndefined();
});

test("shows the accepted answer beside a single incorrect cloze blank", async ({ page }) => {
  // Given: a cloze card with a single blank.
  await openPlayer(page, {
    id: "single-blank-browser-check",
    title: "Single blank browser check",
    cards: [{ id: "single-blank-card", type: "cloze", prompt: "The capital of France is {{Paris}}." }],
  });
  const input = page.getByTestId("cloze-input");
  const correction = page.getByTestId("cloze-blank-feedback");

  // When: the learner submits an incorrect answer.
  await input.fill("London");
  await page.getByTestId("cloze-check-answer").click();

  // Then: the learner's text stays in the disabled input, marked invalid and colored, beside its own accepted answer.
  await expect(input).toHaveValue("London");
  await expect(input).toBeDisabled();
  await expect(input).toHaveClass(/cloze__input--incorrect/);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(/Paris/);
  await expect(correction).toBeVisible();
  await expect(correction).toHaveText("Paris");
  await expect(page.getByTestId("cloze-feedback")).toContainText("Blank 1: Paris");

  // And: the correction sits right next to the blank instead of only in a card-level summary.
  const inputBox = await input.boundingBox();
  const correctionBox = await correction.boundingBox();
  expect(Math.abs(correctionBox.y - inputBox.y)).toBeLessThan(60);
});

test("matches each blank's own correction to its position across multiple blanks", async ({ page }) => {
  // Given: a cloze card with three blanks.
  await openPlayer(page, {
    id: "multi-blank-browser-check",
    title: "Multi blank browser check",
    cards: [{
      id: "multi-blank-card",
      type: "cloze",
      prompt: "Send {{If-None-Match}} and accept {{304|304 Not Modified}} to confirm the response is {{fresh|still fresh}}.",
    }],
  });
  const inputs = page.getByTestId("cloze-input");
  const corrections = page.getByTestId("cloze-blank-feedback");

  // When: the first and third blanks are answered correctly and the second is wrong.
  await inputs.nth(0).fill("If-None-Match");
  await inputs.nth(1).fill("wrong");
  await inputs.nth(2).fill("still fresh");
  await page.getByTestId("cloze-check-answer").click();

  // Then: correct blanks need no visible badge, since green is already unambiguous.
  await expect(inputs.nth(0)).toHaveClass(/cloze__input--correct/);
  await expect(inputs.nth(2)).toHaveClass(/cloze__input--correct/);
  await expect(corrections.nth(0)).toHaveClass(/player__visually-hidden/);
  await expect(corrections.nth(2)).toHaveClass(/player__visually-hidden/);

  // And: only the incorrect blank turns red and shows its own accepted answer, beside that blank.
  await expect(inputs.nth(1)).toHaveClass(/cloze__input--incorrect/);
  await expect(corrections.nth(1)).toHaveClass(/cloze__blank-feedback--incorrect/);
  await expect(corrections.nth(1)).toHaveText("304 / 304 Not Modified");
  const wrongInputBox = await inputs.nth(1).boundingBox();
  const wrongCorrectionBox = await corrections.nth(1).boundingBox();
  expect(Math.abs(wrongCorrectionBox.y - wrongInputBox.y)).toBeLessThan(60);

  // And: the incorrect input's accessible description names its own accepted answer, not another blank's.
  await expect(inputs.nth(1)).toHaveAccessibleDescription(/304/);
});

async function completeScoredSession(page, deck, correct) {
  await page.evaluate(({ deck, correct }) => {
    deck.cards.forEach((card, index) => {
      window.CRAM_PLAYER.recordGrade(card.id, index < correct ? "known" : "missed");
    });
  }, { deck, correct });
  for (let index = 0; index < deck.cards.length; index += 1) {
    await page.getByTestId("next-card").click();
  }
}

async function openPlayer(page, deck) {
  await page.goto(PLAYER_URL);
  await page.evaluate(() => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith("fc:")) localStorage.removeItem(key);
    }
  });
  // The rendered player starts with the minimal fixture deck. Replace it
  // through the player's public setup API so each test can supply a fixture deck.
  await page.evaluate((initialDeck) => {
    window.CRAM_PLAYER.setDeck(initialDeck);
  }, deck);
  await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
}

async function enableCramMode(page) {
  await page.getByTestId("settings-toggle").click();
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await page.getByTestId("cram-mode-toggle").check();
  await expect(page.getByTestId("cram-mode-toggle")).toBeChecked();
  expect(await page.evaluate(() => window.CRAM_PLAYER.getState().cramMode)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("settings-panel")).toBeHidden();
}

async function readSurfacePalette(page) {
  return page.evaluate(() => {
    function read(selector) {
      const style = getComputedStyle(document.querySelector(selector));
      return {
        background: luminance(style.backgroundColor),
        color: luminance(style.color),
      };
    }

    function luminance(color) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    }

    return {
      card: read(".player__card"),
      settings: read(".player__settings-panel"),
    };
  });
}
