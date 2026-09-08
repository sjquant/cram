const { test: it, expect } = require("@playwright/test");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const RENDERER = path.join(ROOT, "skills/cram/scripts/render.py");
const DECK = {
  id: "localized-learning",
  title: "Settings",
  cards: [
    { id: "basic", type: "basic", prompt: "Show answer", answer: "<script>not code</script>" },
    { id: "mcq", type: "mcq", prompt: "Pick an answer", answer: "<b>{score}</b>", distractors: ["Wrong"], hint: "Show hint", explanation: "Explanation" },
    { id: "cloze", type: "cloze", prompt: "Write {{Correct.}}" },
  ],
};
const LANGUAGES = [
  { code: "en", settings: "Open settings", theme: "Color theme", reveal: "Show answer", missed: "Missed it", hint: "Show hint", check: "Check answer", checks: "Check answers", blank: "Blank 1", correct: "Blank 1: Correct.", retry: "Retry 2 missed cards", single: "Retry 1 missed card", reset: "Reset progress" },
  { code: "ko", settings: "설정 열기", theme: "색상 테마", reveal: "정답 보기", missed: "몰랐어요", hint: "힌트 보기", check: "정답 확인", checks: "정답 확인", blank: "빈칸 1", correct: "빈칸 1: 정답입니다.", retry: "틀린 카드 2개 다시 풀기", single: "틀린 카드 1개 다시 풀기", reset: "진행 상황 초기화" },
  { code: "ja", settings: "設定を開く", theme: "カラーテーマ", reveal: "答えを見る", missed: "わからなかった", hint: "ヒントを見る", check: "答えを確認", checks: "答えを確認", blank: "空欄1", correct: "空欄1: 正解です。", retry: "間違えた2枚を再挑戦", single: "間違えた1枚を再挑戦", reset: "進捗をリセット" },
  { code: "zh-CN", settings: "打开设置", theme: "颜色主题", reveal: "显示答案", missed: "没记住", hint: "显示提示", check: "检查答案", checks: "检查答案", blank: "第1个空", correct: "第1个空：正确。", retry: "重试2张错题卡片", single: "重试1张错题卡片", reset: "重置进度" },
  { code: "es", settings: "Abrir ajustes", theme: "Tema de color", reveal: "Mostrar respuesta", missed: "No la sabía", hint: "Mostrar pista", check: "Comprobar respuesta", checks: "Comprobar respuestas", blank: "Espacio 1", correct: "Espacio 1: Correcto.", retry: "Reintentar 2 tarjetas falladas", single: "Reintentar 1 tarjeta fallada", reset: "Restablecer progreso" },
  { code: "fr", settings: "Ouvrir les paramètres", theme: "Thème de couleur", reveal: "Afficher la réponse", missed: "Je ne savais pas", hint: "Afficher l’indice", check: "Vérifier la réponse", checks: "Vérifier les réponses", blank: "Trou 1", correct: "Trou 1 : Correct.", retry: "Reprendre 2 cartes ratées", single: "Reprendre 1 carte ratée", reset: "Réinitialiser la progression" },
];

for (const language of LANGUAGES) {
  it(`lets a learner complete and retry all card types in ${language.code} offline`, async ({ page }, testInfo) => {
    // Given: a CLI-generated localized deck on a narrow screen, with literal markup in its content.
    const errors = [];
    const requests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.setViewportSize({ width: 390, height: 844 });
    const output = render(testInfo, ["--language", language.code]);
    await page.goto(pathToFileURL(output).href);
    await expect(page.locator("html")).toHaveAttribute("lang", language.code);
    await expect(page.getByTestId("deck-title")).toHaveText(DECK.title);
    await expect(page.getByTestId("card-prompt")).toHaveText("Show answer");

    // When: the learner opens settings, misses two cards, and answers a cloze correctly.
    await page.getByRole("button", { name: language.settings, exact: true }).click();
    await expect(page.getByRole("combobox", { name: language.theme, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: language.reveal, exact: true }).click();
    await expect(page.getByTestId("card-answer")).toHaveText(DECK.cards[0].answer);
    await page.getByRole("button", { name: language.missed, exact: true }).click();
    await page.getByTestId("next-card").click();
    await page.getByRole("button", { name: language.hint, exact: true }).click();
    await expect(page.getByTestId("card-hint")).toHaveText("Show hint");
    await page.getByRole("button", { name: "Wrong", exact: true }).click();
    await page.getByRole("button", { name: language.check, exact: true }).click();
    await expect(page.getByTestId("mcq-feedback")).toContainText(DECK.cards[1].answer);
    await expect(page.getByTestId("mcq-feedback").locator("b")).toHaveCount(0);
    await expect(page.getByTestId("mcq-explanation")).toHaveText("Explanation");
    await page.getByTestId("next-card").click();
    await page.getByRole("textbox", { name: language.blank, exact: true }).fill("Correct.");
    await page.getByRole("button", { name: language.checks, exact: true }).click();
    await expect(page.getByTestId("cloze-blank-feedback")).toHaveText(language.correct);
    await page.getByTestId("next-card").click();

    // Then: translated results and plural retry controls work without fetching resources.
    await expect(page.getByTestId("score-value")).toHaveText("1/3");
    await expect(page.getByRole("button", { name: language.retry, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: language.reset, exact: true })).toBeVisible();
    await page.getByRole("button", { name: language.retry, exact: true }).click();
    await page.getByTestId("next-card").click();
    await page.getByRole("button", { name: DECK.cards[1].answer, exact: true }).click();
    await page.getByRole("button", { name: language.check, exact: true }).click();
    await page.getByTestId("next-card").click();
    await expect(page.getByRole("button", { name: language.single, exact: true })).toBeVisible();
    await page.getByRole("button", { name: language.reset, exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: language.reveal, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}

it("defaults to English and accepts the language alias", async ({ page }, testInfo) => {
  // Given: the same deck rendered with no option and with the short alias.
  const english = render(testInfo, []);
  // When: each generated file is opened.
  await page.goto(pathToFileURL(english).href);
  // Then: the default is English, and the explicit alias selects Korean.
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Show answer", exact: true })).toBeVisible();
  const korean = render(testInfo, ["--lang", "ko"]);
  await page.goto(pathToFileURL(korean).href);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("button", { name: "정답 보기", exact: true })).toBeVisible();
});

it("rejects an unsupported language without overwriting an existing output", async ({}, testInfo) => {
  // Given: an existing usable English player.
  const output = render(testInfo, []);
  const previous = fs.readFileSync(output, "utf8");
  // When: the user passes an unsupported language.
  const result = spawnSync("python3", [RENDERER, path.join(ROOT, "fixtures/valid/minimal.json"), "-o", output, "--lang", "../../invalid"], { encoding: "utf8" });
  // Then: the CLI explains the error and preserves the previous file.
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("invalid choice");
  expect(result.stderr).toContain("../../invalid");
  expect(fs.readFileSync(output, "utf8")).toBe(previous);
});

for (const defect of ["missing message", "changed placeholder", "missing plural form"]) {
  it(`rejects a translation with a ${defect} before writing output`, async ({}, testInfo) => {
    // Given: a plugin installation whose French translation has an editing mistake.
    const installation = testInfo.outputPath("plugin");
    fs.cpSync(path.join(ROOT, "skills"), path.join(installation, "skills"), { recursive: true });
    const translationPath = path.join(installation, "skills/cram/locales/fr.json");
    const messages = JSON.parse(fs.readFileSync(translationPath, "utf8"));
    if (defect === "missing message") delete messages["Show answer"];
    if (defect === "changed placeholder") messages["Blank {number}"] = "Trou {wrong}";
    if (defect === "missing plural form") delete messages["Retry {count} missed card"].other;
    fs.writeFileSync(translationPath, JSON.stringify(messages));
    const output = testInfo.outputPath("quiz.html");

    // When: the user renders a deck using that installation from another directory.
    const result = spawnSync("python3", [
      path.join(installation, "skills/cram/scripts/render.py"),
      path.join(ROOT, "fixtures/valid/minimal.json"), "-o", output, "--language", "fr",
    ], { cwd: testInfo.outputDir, env: { ...process.env, CLAUDE_PLUGIN_ROOT: installation }, encoding: "utf8" });

    // Then: the CLI reports the invalid French resource without a traceback or output.
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("fr");
    expect(result.stderr).not.toContain("Traceback");
    expect(fs.existsSync(output)).toBe(false);
  });
}

function render(testInfo, options) {
  const source = testInfo.outputPath("deck.json");
  const output = testInfo.outputPath(`deck-${options.at(-1) || "default"}.html`);
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, JSON.stringify(DECK));
  execFileSync("python3", [RENDERER, source, "-o", output, ...options], { cwd: testInfo.outputDir });
  return output;
}
