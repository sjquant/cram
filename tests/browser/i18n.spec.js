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
  { code: "en", design: "Design style", settings: "Open settings", theme: "Color theme", reveal: "Show answer", missed: "Missed it", hint: "Show hint", check: "Check answer", checks: "Check answers", blank: "Blank 1", correct: "Blank 1: Correct.", retry: "Retry 2 missed cards", single: "Retry 1 missed card", reset: "Reset progress" },
  { code: "ko", design: "디자인 스타일", settings: "설정 열기", theme: "색상 테마", reveal: "정답 보기", missed: "몰랐어요", hint: "힌트 보기", check: "정답 확인", checks: "정답 확인", blank: "빈칸 1", correct: "빈칸 1: 정답입니다.", retry: "틀린 카드 2개 다시 풀기", single: "틀린 카드 1개 다시 풀기", reset: "진행 상황 초기화" },
  { code: "ja", design: "デザインスタイル", settings: "設定を開く", theme: "カラーテーマ", reveal: "答えを見る", missed: "わからなかった", hint: "ヒントを見る", check: "答えを確認", checks: "答えを確認", blank: "空欄1", correct: "空欄1: 正解です。", retry: "間違えた2枚を再挑戦", single: "間違えた1枚を再挑戦", reset: "進捗をリセット" },
  { code: "zh-CN", design: "设计风格", settings: "打开设置", theme: "颜色主题", reveal: "显示答案", missed: "没记住", hint: "显示提示", check: "检查答案", checks: "检查答案", blank: "第1个空", correct: "第1个空：正确。", retry: "重试2张错题卡片", single: "重试1张错题卡片", reset: "重置进度" },
  { code: "es", design: "Estilo de diseño", settings: "Abrir ajustes", theme: "Tema de color", reveal: "Mostrar respuesta", missed: "No la sabía", hint: "Mostrar pista", check: "Comprobar respuesta", checks: "Comprobar respuestas", blank: "Espacio 1", correct: "Espacio 1: Correcto.", retry: "Reintentar 2 tarjetas falladas", single: "Reintentar 1 tarjeta fallada", reset: "Restablecer progreso" },
  { code: "fr", design: "Style visuel", settings: "Ouvrir les paramètres", theme: "Thème de couleur", reveal: "Afficher la réponse", missed: "Je ne savais pas", hint: "Afficher l’indice", check: "Vérifier la réponse", checks: "Vérifier les réponses", blank: "Trou 1", correct: "Trou 1 : Correct.", retry: "Reprendre 2 cartes ratées", single: "Reprendre 1 carte ratée", reset: "Réinitialiser la progression" },
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
    await page.getByRole("combobox", { name: language.design, exact: true }).selectOption("focus");
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

it("translates incorrect answers, restored feedback, and completion announcements in Korean", async ({ page }, testInfo) => {
  // Given: a Korean player whose answer text contains braces and literal markup.
  await page.goto(pathToFileURL(render(testInfo, ["--lang", "ko"])).href);
  // When: the learner skips the basic card and submits incorrect MCQ and cloze answers.
  await page.getByTestId("next-card").click();
  await page.getByRole("button", { name: "Wrong", exact: true }).click();
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  // Then: feedback is translated, including variable substitution and the live status.
  await expect(page.getByTestId("mcq-feedback")).toHaveText("오답입니다. 정답: <b>{score}</b>");
  await expect(page.locator("#player-status")).toHaveText("오답입니다.");
  await page.getByTestId("next-card").click();
  await page.getByRole("textbox", { name: "빈칸 1", exact: true }).fill("Wrong");
  await page.getByRole("button", { name: "정답 확인", exact: true }).click();
  await expect(page.getByTestId("cloze-blank-feedback")).toHaveText("빈칸 1: 오답입니다. 정답: Correct.");
  await expect(page.locator("#player-status")).toHaveText("오답입니다.");

  // When: the learner revisits the answered cloze and finishes the session.
  await page.getByTestId("previous-card").click();
  await page.getByTestId("next-card").click();
  // Then: restored feedback and both completion announcements remain translated.
  await expect(page.getByTestId("cloze-feedback-summary")).toHaveText("이전에 틀린 것으로 기록된 카드입니다.");
  await page.getByTestId("next-card").click();
  await expect(page.getByTestId("score-summary")).toHaveText("정답 0개 · 복습 3개");
  await expect(page.locator("#player-status")).toHaveText("학습 완료. 점수 0/3.");
  await expect(page.locator("#card-announcer")).toHaveText("학습 완료. 점수 0/3.");
});

for (const defect of ["missing message", "changed placeholder", "missing plural form", "invalid JSON", "empty translation", "invalid value type", "invalid root type"]) {
  it(`rejects a translation with a ${defect} before writing output`, async ({}, testInfo) => {
    // Given: an existing output and a plugin whose French translation has an editing mistake.
    const installation = copyInstallation(testInfo);
    const output = render(testInfo, []);
    const previous = fs.readFileSync(output, "utf8");
    const translationPath = path.join(installation, "skills/cram/locales/fr.json");
    const messages = JSON.parse(fs.readFileSync(translationPath, "utf8"));
    if (defect === "missing message") delete messages["Show answer"];
    if (defect === "changed placeholder") messages["Blank {number}"] = "Trou {wrong}";
    if (defect === "missing plural form") delete messages["Retry {count} missed card"].other;
    if (defect === "empty translation") messages["Show answer"] = "  ";
    if (defect === "invalid value type") messages["Show answer"] = 42;
    fs.writeFileSync(translationPath, defect === "invalid JSON" ? "{" : defect === "invalid root type" ? "[]" : JSON.stringify(messages));

    // When: the user renders a deck using that installation from another directory.
    const result = renderInstallation(installation, output, "fr");

    // Then: the CLI reports the resource error without a traceback or replacing the output.
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("fr");
    expect(result.stderr).not.toContain("Traceback");
    expect(fs.readFileSync(output, "utf8")).toBe(previous);
  });
}

for (const [language, missing] of [["en", "Show answer"], ["ko", "Settings"], ["fr", "Answer:"]]) {
  it(`rejects ${language} rendering when every catalog omits the used message ${missing}`, async ({}, testInfo) => {
    // Given: the same UI message is missing from every catalog, including English.
    const installation = copyInstallation(testInfo);
    for (const code of LANGUAGES.map(locale => locale.code)) {
      const file = path.join(installation, `skills/cram/locales/${code}.json`);
      const messages = JSON.parse(fs.readFileSync(file, "utf8"));
      delete messages[missing];
      fs.writeFileSync(file, JSON.stringify(messages));
    }
    const output = render(testInfo, []);
    const previous = fs.readFileSync(output, "utf8");
    // When: rendering a player that uses the omitted static or dynamic message.
    const result = renderInstallation(installation, output, language);
    // Then: the omission is reported at rendering time, preserving the previous player.
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(missing);
    expect(result.stderr).not.toContain("Traceback");
    expect(fs.readFileSync(output, "utf8")).toBe(previous);
  });
}

for (const marker of ["__CRAM_LANGUAGE__", "__CRAM_LOCALE__", "__CRAM_DECK__"]) {
  for (const defect of ["missing", "duplicated"]) {
    it(`rejects a ${defect} ${marker} template marker without replacing output`, async ({}, testInfo) => {
      // Given: a template editing error and an existing working player.
      const installation = copyInstallation(testInfo);
      const template = path.join(installation, "skills/cram/template/player.html");
      fs.writeFileSync(template, fs.readFileSync(template, "utf8").replace(marker, defect === "missing" ? "" : marker + marker));
      const output = render(testInfo, []);
      const previous = fs.readFileSync(output, "utf8");
      // When: rendering the edited template.
      const result = renderInstallation(installation, output, "ko");
      // Then: a precise error prevents overwriting the existing output.
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(marker);
      expect(fs.readFileSync(output, "utf8")).toBe(previous);
    });
  }
}

it("renders reformatted templates using the catalog as the sole English plural source", async ({ page }, testInfo) => {
  // Given: template whitespace/quotes change, and a translator edits an English plural.
  const installation = copyInstallation(testInfo);
  const template = path.join(installation, "skills/cram/template/player.html");
  fs.writeFileSync(template, fs.readFileSync(template, "utf8")
    .replace('lang="__CRAM_LANGUAGE__"', "lang = '__CRAM_LANGUAGE__'")
    .replaceAll(";</script>", ";\n</script>"));
  const catalog = path.join(installation, "skills/cram/locales/en.json");
  const messages = JSON.parse(fs.readFileSync(catalog, "utf8"));
  messages["Retry {count} missed card"].one = "Try {count} card again";
  fs.writeFileSync(catalog, JSON.stringify(messages));
  const output = testInfo.outputPath("preview.html");
  // When: rendering the preview through the public CLI and skipping its only card.
  const result = renderInstallation(installation, output, "en");
  expect(result.status).toBe(0);
  await page.goto(pathToFileURL(output).href);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByTestId("next-card").click();
  // Then: the preview uses the edited plural, with no independent template copy.
  await expect(page.getByRole("button", { name: "Try 1 card again", exact: true })).toBeVisible();
});

function copyInstallation(testInfo) {
  const installation = testInfo.outputPath("plugin");
  fs.cpSync(path.join(ROOT, "skills"), path.join(installation, "skills"), { recursive: true });
  return installation;
}

function renderInstallation(installation, output, language) {
  return spawnSync("python3", [path.join(installation, "skills/cram/scripts/render.py"),
    path.join(ROOT, "fixtures/valid/minimal.json"), "-o", output, "--language", language],
  { cwd: path.dirname(output), env: { ...process.env, CLAUDE_PLUGIN_ROOT: installation }, encoding: "utf8" });
}

function render(testInfo, options) {
  const source = testInfo.outputPath("deck.json");
  const output = testInfo.outputPath(`deck-${options.at(-1) || "default"}.html`);
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, JSON.stringify(DECK));
  execFileSync("python3", [RENDERER, source, "-o", output, ...options], { cwd: testInfo.outputDir });
  return output;
}
