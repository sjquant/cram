const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const PLAYER_URL = pathToFileURL(path.join(ROOT, "skills/cram/template/player.html")).href;
const BASIC_DECK = JSON.parse(
  fs.readFileSync(path.join(ROOT, "fixtures/valid/basic-only.json"), "utf8")
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

test.describe("basic cards", () => {
  test("stretches the card frame across the available player width", async ({ page }) => {
    await openPlayer(page, BASIC_DECK);

    // Given: the first card is rendered inside the player's main content area.
    const widths = await page.evaluate(() => ({
      main: document.querySelector("main").getBoundingClientRect().width,
      cardFrame: document.querySelector("[data-testid='card']").getBoundingClientRect().width,
    }));

    // Then: the card frame uses the full width available to it.
    expect(Math.abs(widths.cardFrame - widths.main)).toBeLessThan(0.5);
  });

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
  // Directly opened templates start with their built-in preview deck. Replace it
  // through the player's public setup API so each test can supply a fixture deck.
  await page.evaluate((initialDeck) => {
    window.CRAM_PLAYER.setDeck(initialDeck);
  }, deck);
  await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
}
