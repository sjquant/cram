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

async function openPlayer(page, deck) {
  await page.goto(PLAYER_URL);
  // Directly opened templates start with their built-in preview deck. Replace it
  // through the player's public setup API so each test can supply a fixture deck.
  await page.evaluate((initialDeck) => {
    window.CRAM_PLAYER.setDeck(initialDeck);
  }, deck);
  await expect(page.getByTestId("player")).toHaveAttribute("data-state", "ready");
}
