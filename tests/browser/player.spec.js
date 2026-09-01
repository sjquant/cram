const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const PLAYER_URL = pathToFileURL(path.join(ROOT, "skills/cram/template/player.html")).href;
const BASIC_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/basic-only.json"), "utf8")
);
const ALL_TYPES_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/all-types.json"), "utf8")
);
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
      (grade) => grade === "remembered",
      (grade) => grade === "remembered"
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
      (grade) => grade === "remembered",
      (grade) => grade === "remembered"
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
      (grade) => grade === "remembered",
      (grade) => grade === "remembered"
    );
  });
  expect(await page.evaluate(() => window.CRAM_PLAYER.getState().grades)).toEqual({});
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
        () => {
          throw new Error("validator failed");
        }
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
  await page.evaluate(() => {
    window.__recordGradeCalls = 0;
    window.__originalRecordGrade = window.CRAM_PLAYER.recordGrade;
    window.CRAM_PLAYER.recordGrade = (...args) => {
      window.__recordGradeCalls += 1;
      return window.__originalRecordGrade(...args);
    };
  });
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
  expect(await page.evaluate(() => window.__recordGradeCalls)).toBe(1);
  expect(await page.evaluate(() => window.CRAM_PLAYER.getGrade("cloze-card"))).toBe("incorrect");

  // Returning to the card shows only the aggregate result because the shell stores one grade.
  await page.getByTestId("next-card").click();
  await page.getByTestId("previous-card").click();
  await expect(page.getByTestId("cloze-feedback-summary")).toBeVisible();
  await expect(page.getByTestId("cloze-blank-feedback").nth(0)).toBeHidden();
  await expect(page.getByTestId("cloze-input").nth(0)).not.toHaveAttribute("data-result");

  // A fresh attempt accepts the pipe-separated alternative with case/whitespace normalization.
  await page.evaluate(() => {
    window.CRAM_PLAYER.recordGrade = window.__originalRecordGrade;
  });
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
