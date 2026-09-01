const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const PLAYER_URL = pathToFileURL(path.join(ROOT, "skills/cram/template/player.html")).href;
const BASIC_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/basic-only.json"), "utf8")
);
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
  test("reveals a basic-card answer and records the selected grade", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the first basic card starts with its answer and grades hidden.
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
  });

  test("aligns the mobile footer action with the header shell gutter", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, BASIC_DECK);

    // Given: a fresh mobile card hides the non-essential navigation hint.
    const gutters = await page.evaluate(() => {
      const player = document.querySelector("#player");
      const header = document.querySelector(".player__header");
      const navigation = document.querySelector(".player__navigation");
      const playerBounds = player.getBoundingClientRect();
      const headerBounds = header.getBoundingClientRect();
      const navigationBounds = navigation.getBoundingClientRect();
      const styles = getComputedStyle(player);
      return {
        headerTop: headerBounds.top - playerBounds.top,
        navigationBottom: playerBounds.bottom - navigationBounds.bottom,
        shellPaddingBottom: Number.parseFloat(styles.paddingBottom),
      };
    });

    // Then: the visible footer action and header use the same outer gutter.
    expect(gutters.headerTop).toBeCloseTo(gutters.navigationBottom, 1);
    expect(gutters.navigationBottom).toBeCloseTo(gutters.shellPaddingBottom, 1);
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
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("grade-missed")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({
      [BASIC_DECK.cards[0].id]: "known",
      [BASIC_DECK.cards[1].id]: "missed",
    });
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
    await expect(page.getByTestId("grade-known")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("mcq-feedback")).toHaveAttribute("data-result", "correct");
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("cloze-feedback-summary")).toBeVisible();
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

    // When: the learner explicitly resets progress.
    await page.getByTestId("reset-progress").click();

    // Then: the current deck is restarted while the other deck's progress remains stored.
    await expect(page.getByTestId("score-screen")).toBeHidden();
    await expect(page.getByTestId("card-prompt")).toHaveText(BASIC_DECK.cards[0].prompt);
    await expect(page.getByTestId("card-answer")).toBeHidden();
    await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
    expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
    expect(await page.evaluate((deckId) => localStorage.getItem(`fc:${deckId}:v1`), BASIC_DECK.id)).toBeNull();
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), OTHER_DECK.id)).toEqual({
      [OTHER_DECK.cards[0].id]: "known",
    });
  });

  test("retries only missed cards and persists a corrected grade", async ({ page }) => {
    await openPlayer(page, RETRY_DECK);

    // Given: the learner completes the deck with one known card and one missed card.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-missed").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("1/2");
    await expect(page.getByTestId("score-summary")).toHaveText("1 correct · 1 to review");
    await expect(page.getByTestId("score-correct-label")).toHaveText("1 correct");
    await expect(page.getByTestId("score-missed-label")).toHaveText("1 to review");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 1 missed card");

    // When: the learner starts a retry from the score screen.
    await page.getByTestId("retry-missed").click();

    // Then: the retry session contains only the missed card.
    await expect(page.getByTestId("card-prompt")).toHaveText(RETRY_DECK.cards[1].prompt);
    await expect(page.getByTestId("progress-label")).toHaveText("Card 1 of 1");

    // When: the learner corrects the card and finishes the retry session.
    await page.getByTestId("reveal-answer").click();
    await page.getByTestId("grade-known").click();
    await page.getByTestId("next-card").click();

    // Then: the retry score is scoped to one card and the original deck progress is updated.
    await expect(page.getByTestId("score-value")).toHaveText("1/1");
    await expect(page.getByTestId("no-missed-cards")).toBeVisible();
    await expect(page.getByTestId("retry-missed")).toBeDisabled();
    await expect(page.getByTestId("retry-missed")).toBeHidden();

    // And: selecting the original deck again counts the corrected card as positive.
    await page.reload();
    await page.evaluate((deck) => window.CRAM_PLAYER.setDeck(deck), RETRY_DECK);
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("2/2");
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
    await expect(page.getByTestId("score-value")).toHaveText("0/2");
    await expect(page.getByTestId("score-summary")).toHaveText("0 correct · 2 to review");
    await expect(page.getByTestId("score-missed-label")).toHaveText("2 to review");
    await expect(page.getByTestId("retry-missed")).toHaveText("Retry 2 missed cards");

    // When: the learner starts a retry session.
    await page.getByTestId("retry-missed").click();

    // Then: the missed MCQ can be answered again.
    await expect(page.getByTestId("mcq-check-answer")).toBeVisible();
    await expect(page.getByTestId("mcq-option").first()).toBeEnabled();
    await page.getByRole("button", { name: "Correct option", exact: true }).click();
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
    await page.getByTestId("next-card").click();
    await page.getByTestId("next-card").click();
    await expect(page.getByTestId("score-value")).toHaveText("2/2");
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
  });

  test("scrolls a long score review inside the results panel", async ({ page }) => {
    await openPlayer(page, ALL_TYPES_DECK);

    // Given: every card is graded so the score screen contains a review item for each card.
    await page.evaluate((deck) => {
      const grades = { basic: "missed", mcq: "incorrect", cloze: "incorrect" };
      deck.cards.forEach((card) => window.CRAM_PLAYER.recordGrade(card.id, grades[card.type]));
      for (let index = 0; index < deck.cards.length; index += 1) {
        document.querySelector("#next-card").click();
      }
    }, ALL_TYPES_DECK);
    await expect(page.getByTestId("score-screen")).toBeVisible();

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

    // Then: that renderer records the same per-card hint state.
    await expect(page.getByTestId("card-hint")).toHaveText(HINT_DECK.cards[1].hint);
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

    // And: the missed-card review identifies exactly the cards that needed hints.
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

  test("does not persist hint usage in deck progress", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given/When: the learner requests a hint before recording a grade.
    await page.getByTestId("show-hint").click();

    // Then: hint usage stays in memory and creates no localStorage entry.
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

    // Then: the hint starts hidden again while grade persistence remains independent.
    await expect(page.getByTestId("show-hint")).toBeVisible();
    await expect(page.getByTestId("card-hint")).toBeHidden();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getHintUsed("hint-basic-card"))).toBe(false);
    expect(await page.evaluate((deckId) => JSON.parse(localStorage.getItem(`fc:${deckId}:v1`)), HINT_DECK.id)).toEqual({
      "hint-basic-card": "missed",
    });
  });
});

test.describe("card controls", () => {
  test("uses state-aware keyboard shortcuts for help, answers, and navigation", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the current card advertises its help and navigation shortcuts.
    await expect(page.getByTestId("show-hint")).toHaveAttribute("aria-keyshortcuts", "H");
    await expect(page.getByTestId("reveal-answer")).toHaveAttribute("aria-keyshortcuts", "A");
    await expect(page.getByTestId("previous-card")).toHaveAttribute("aria-keyshortcuts", "P ArrowLeft");
    await expect(page.getByTestId("next-card")).toHaveAttribute("aria-keyshortcuts", "N ArrowRight");
    await expect(page.getByRole("group", { name: "Optional hint" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Answer actions" })).toBeVisible();

    // When: the learner uses the card shortcuts instead of pointer clicks.
    await page.keyboard.press("h");
    await page.keyboard.press("a");

    // Then: the same hint and answer state is reached without changing grading.
    await expect(page.getByTestId("card-hint")).toBeVisible();
    await expect(page.getByTestId("card-answer")).toBeVisible();
    expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("hint-basic-card"))).toBeUndefined();

    // And: mnemonic navigation follows the same bounds as the arrow keys.
    await page.keyboard.press("n");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[1].prompt);
    await page.keyboard.press("p");
    await expect(page.getByTestId("card-prompt")).toHaveText(HINT_DECK.cards[0].prompt);
  });

  test("does not trigger global shortcuts while typing a cloze answer", async ({ page }) => {
    await openPlayer(page, HINT_DECK);

    // Given: the learner has navigated to a cloze card with an available hint.
    await page.keyboard.press("n");
    await page.keyboard.press("n");
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
    await page.keyboard.press("n");
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
  await expect(page.getByTestId("cloze-blank-feedback").nth(1)).toContainText(
    "Correct answer: 304 / 304 Not Modified"
  );
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("cloze-card"))).toBe("incorrect");

  // Returning to the card shows only the aggregate result because the shell stores one grade.
  await page.getByTestId("next-card").click();
  await page.getByTestId("previous-card").click();
  await expect(page.getByTestId("cloze-feedback-summary")).toBeVisible();
  await expect(page.getByTestId("cloze-blank-feedback").nth(0)).toBeHidden();
  await expect(page.getByTestId("cloze-input").nth(0)).not.toHaveAttribute("data-result");

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

async function openPlayer(page, deck) {
  await page.goto(PLAYER_URL);
  await page.evaluate(() => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith("fc:")) localStorage.removeItem(key);
    }
  });
  // Directly opened templates start with their built-in preview deck. Replace it
  // through the player's public setup API so each test can supply a fixture deck.
  await page.evaluate((initialDeck) => {
    window.CRAM_PLAYER.setDeck(initialDeck);
  }, deck);
  await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
}
