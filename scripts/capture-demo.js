"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const EXAMPLE_PATH = path.join(ROOT, "examples/http-caching-essentials.html");
const EXAMPLE_JSON_PATH = path.join(ROOT, "examples/http-caching-essentials.json");
const OUTPUT_PATH = path.join(ROOT, "docs/demo.gif");
// A portrait tablet canvas keeps the storyboard and the player's lower actions visible.
const VIEWPORT = { width: 800, height: 900 };
const VIDEO_START = "0.15";
const PROMPT_TEXT = "Turn my HTTP caching notes into a self-graded quiz.";
const EXAMPLE_DECK = JSON.parse(fs.readFileSync(EXAMPLE_JSON_PATH, "utf8"));
const DEMO_DECK = {
  ...EXAMPLE_DECK,
  cards: [EXAMPLE_DECK.cards[0], EXAMPLE_DECK.cards[1], EXAMPLE_DECK.cards[3]]
};
const STORY_CARDS = [
  { type: "Basic", prompt: "What does max-age=60 permit?", detail: "free recall" },
  { type: "MCQ", prompt: "Which directive prevents storage?", detail: "choose one" },
  { type: "Cloze", prompt: "The validator header is ____.", detail: "fill the blank" }
];
const CURSOR_STYLE = `
  .demo-cursor {
    position: fixed;
    z-index: 1000;
    top: -30px;
    left: -30px;
    width: 19px;
    height: 19px;
    border: 2px solid #b5342b;
    border-radius: 50%;
    background: rgba(244, 239, 228, 0.72);
    box-shadow: 0 0 0 4px rgba(181, 52, 43, 0.15);
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: left 260ms ease, top 260ms ease;
  }

  .demo-cursor::after {
    content: "";
    position: absolute;
    inset: -9px;
    border: 2px solid rgba(181, 52, 43, 0.7);
    border-radius: 50%;
    opacity: 0;
  }

  .demo-cursor.is-clicking::after {
    animation: demo-cursor-click 420ms ease-out;
  }

  @keyframes demo-cursor-click {
    0% { opacity: 1; transform: scale(0.55); }
    100% { opacity: 0; transform: scale(1.5); }
  }
`;

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cram-demo-"));

  try {
    const videoPath = await captureVideo(tempDir);
    transcodeGif(videoPath, OUTPUT_PATH);
    const size = fs.statSync(OUTPUT_PATH).size;
    console.log(`Wrote ${OUTPUT_PATH} (${Math.round(size / 1024)} KiB).`);
  } finally {
    cleanup(tempDir);
  }
}

async function captureVideo(tempDir) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: tempDir, size: VIEWPORT },
    colorScheme: "light"
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    await page.setContent(buildStoryboardMarkup(EXAMPLE_DECK), { waitUntil: "load" });
    await page.waitForSelector("#prompt-scene.scene--active");
    await installCursor(page);
    await playStoryboard(page);

    await page.goto(pathToFileURL(EXAMPLE_PATH).href);
    await page.waitForFunction(() => document.querySelector("#player")?.dataset.state === "ready");
    await page.evaluate((deck) => {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("fc:")) localStorage.removeItem(key);
      }
      window.CRAM_PLAYER.setDeck(deck);
    }, DEMO_DECK);
    await page.waitForFunction(() => window.CRAM_PLAYER?.getState().total === 3);
    await installCursor(page);
    await capturePlayerFlow(page);
  } finally {
    await context.close();
    await browser.close();
  }

  if (!video) throw new Error("Playwright did not create a video recording.");
  return video.path();
}

function buildStoryboardMarkup(deck) {
  const questionRows = STORY_CARDS.map((card, index) => `
    <div class="question-row" data-question-index="${index}">
      <span class="question-number">0${index + 1}</span>
      <span class="question-copy">
        <span class="question-text">${escapeHtml(card.prompt)}</span>
        <span class="question-detail">${escapeHtml(card.detail)}</span>
      </span>
      <span class="question-type">${escapeHtml(card.type)}</span>
    </div>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cram demo</title>
  <style>
    :root {
      --paper: #f4efe4;
      --ink: #1f1c18;
      --ink-soft: #746c5e;
      --rule: #d9d0bf;
      --accent: #b5342b;
      --positive: #356b4a;
      --serif: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino,
        Georgia, serif;
      --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      font-family: var(--sans);
      color: var(--ink);
      background: var(--paper);
    }

    * { box-sizing: border-box; }

    html {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      min-width: 800px;
      min-height: 900px;
      margin: 0;
      overflow: hidden;
      background: var(--paper);
      -webkit-font-smoothing: antialiased;
    }

    .demo-shell {
      position: relative;
      width: 800px;
      height: 900px;
      padding: 44px 48px 34px;
      overflow: hidden;
    }

    .demo-shell::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.22;
      pointer-events: none;
      background-image: repeating-linear-gradient(0deg, rgba(74, 58, 35, 0.04) 0 1px, transparent 1px 5px);
    }

    .demo-header,
    .stage-steps,
    .demo-footer { position: relative; z-index: 1; }

    .demo-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand {
      display: flex;
      gap: 9px;
      align-items: center;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    .brand-mark {
      display: inline-grid;
      width: 27px;
      height: 27px;
      place-items: center;
      color: var(--paper);
      background: var(--accent);
      border-radius: 50%;
      font-family: var(--serif);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .header-caption,
    .demo-footer {
      color: var(--ink-soft);
      font-size: 10px;
      font-weight: 650;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .stage-steps {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 26px;
    }

    .stage-step {
      display: inline-flex;
      gap: 7px;
      align-items: center;
      color: #aaa092;
      font-size: 10px;
      font-weight: 650;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .stage-step + .stage-step::before {
      content: "→";
      margin-right: 4px;
      color: #c7bcaa;
      font-size: 13px;
    }

    .stage-step.is-current { color: var(--accent); }

    .stage-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border: 1px solid currentColor;
      border-radius: 50%;
    }

    .stage-step.is-current .stage-dot { background: currentColor; }

    main { position: relative; height: 765px; }

    .scene {
      position: absolute;
      inset: 18px 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transform: translateY(8px);
      transition: opacity 320ms ease, transform 320ms ease;
    }

    .scene--active {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .prompt-wrap { width: 620px; }

    .source-pill {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 15px;
      color: var(--ink-soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
    }

    .source-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--positive);
    }

    .prompt-card,
    .source-card,
    .deck-card {
      border: 1px solid var(--rule);
      background: rgba(255, 253, 248, 0.46);
      box-shadow: 0 11px 26px rgba(74, 58, 35, 0.07);
    }

    .prompt-card { padding: 25px 29px 23px; }

    .eyebrow {
      color: var(--accent);
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.17em;
      text-transform: uppercase;
    }

    .prompt-row {
      display: flex;
      min-height: 78px;
      align-items: center;
      font-family: var(--serif);
      font-size: 28px;
      line-height: 1.25;
    }

    .prompt-caret {
      margin-right: 13px;
      color: var(--accent);
      font-family: var(--sans);
      font-size: 25px;
    }

    .typing-caret {
      width: 2px;
      height: 31px;
      margin-left: 3px;
      background: var(--accent);
      animation: caret-blink 850ms steps(1) infinite;
    }

    @keyframes caret-blink { 50% { opacity: 0; } }

    .prompt-hint {
      padding-top: 14px;
      border-top: 1px solid var(--rule);
      color: var(--ink-soft);
      font-size: 12px;
    }

    .status {
      display: flex;
      gap: 9px;
      align-items: center;
      margin-top: 19px;
      color: var(--ink-soft);
      font-size: 12px;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 220ms ease, transform 220ms ease;
    }

    .status.is-visible { opacity: 1; transform: translateY(0); }

    .status-icon {
      display: inline-grid;
      width: 20px;
      height: 20px;
      place-items: center;
      border: 1px solid var(--rule);
      border-radius: 50%;
      color: var(--accent);
      font-size: 12px;
    }

    .status.is-done .status-icon {
      color: var(--paper);
      background: var(--positive);
      border-color: var(--positive);
    }

    .deck-wrap {
      display: grid;
      grid-template-columns: 190px 40px 1fr;
      gap: 14px;
      width: 700px;
      align-items: center;
    }

    .source-card { padding: 20px 18px; }

    .source-card h2,
    .deck-card h1 {
      margin: 9px 0 0;
      font-family: var(--serif);
      font-weight: 500;
      line-height: 1.15;
    }

    .source-card h2 { font-size: 20px; }

    .source-meta {
      margin-top: 9px;
      color: var(--ink-soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9px;
    }

    .source-lines {
      display: grid;
      gap: 7px;
      margin-top: 24px;
      color: var(--ink-soft);
      font-size: 11px;
      line-height: 1.35;
    }

    .source-lines span::before {
      content: "·";
      margin-right: 6px;
      color: var(--accent);
    }

    .source-check {
      margin-top: 23px;
      color: var(--positive);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .flow-arrow {
      color: var(--accent);
      font-family: var(--serif);
      font-size: 27px;
      text-align: center;
    }

    .deck-card { min-height: 315px; padding: 22px 24px 20px; }

    .deck-card h1 { font-size: 25px; }

    .deck-count {
      margin-top: 6px;
      color: var(--positive);
      font-size: 11px;
      font-weight: 650;
    }

    .question-list {
      display: grid;
      gap: 7px;
      margin-top: 19px;
    }

    .question-row {
      display: flex;
      gap: 11px;
      align-items: center;
      min-height: 45px;
      padding: 7px 10px;
      border: 1px solid var(--rule);
      background: rgba(244, 239, 228, 0.46);
      opacity: 0;
      transform: translateX(12px);
      transition: opacity 250ms ease, transform 250ms ease;
    }

    .question-row.is-visible { opacity: 1; transform: translateX(0); }

    .question-number {
      color: var(--accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .question-copy { display: grid; gap: 2px; min-width: 0; flex: 1; }

    .question-text {
      overflow: hidden;
      color: var(--ink);
      font-family: var(--serif);
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .question-detail {
      color: var(--ink-soft);
      font-size: 9px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .question-type {
      color: var(--ink-soft);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    #start-study {
      display: block;
      margin: 17px 0 0 auto;
      border: 0;
      padding: 9px 13px;
      color: var(--paper);
      background: var(--ink);
      font: inherit;
      font-size: 11px;
      font-weight: 650;
      cursor: pointer;
    }

    #start-study span { margin-left: 7px; color: #e0645a; }

    .demo-footer {
      position: absolute;
      right: 48px;
      bottom: 34px;
    }

    ${CURSOR_STYLE}
  </style>
</head>
<body>
  <div class="demo-shell">
    <header class="demo-header">
      <div class="brand"><span class="brand-mark">c</span><span>cram</span></div>
      <div class="header-caption">from material to memory</div>
    </header>

    <div class="stage-steps" id="stage-steps" aria-label="Demo stages">
      <span class="stage-step is-current"><span class="stage-dot"></span>Prompt</span>
      <span class="stage-step"><span class="stage-dot"></span>Deck</span>
      <span class="stage-step"><span class="stage-dot"></span>Study</span>
    </div>

    <main>
      <section class="scene scene--active" id="prompt-scene">
        <div class="prompt-wrap">
          <div class="source-pill"><span class="source-dot"></span>${escapeHtml(deck.title)} · notes.md</div>
          <div class="prompt-card">
            <div class="eyebrow">Prompt</div>
            <div class="prompt-row"><span class="prompt-caret">›</span><span id="prompt-text"></span><span class="typing-caret"></span></div>
            <div class="prompt-hint">Tell Cram what you want to remember.</div>
          </div>
          <div class="status" id="prompt-status"><span class="status-icon" id="prompt-status-icon">…</span><span id="prompt-status-text">Waiting for your prompt</span></div>
        </div>
      </section>

      <section class="scene" id="deck-scene">
        <div class="deck-wrap">
          <div class="source-card">
            <div class="eyebrow">Source</div>
            <h2>${escapeHtml(deck.title)}</h2>
            <div class="source-meta">RFC 9111 · notes.md</div>
            <div class="source-lines"><span>freshness</span><span>directives</span><span>validators</span></div>
            <div class="source-check">✓ source read</div>
          </div>
          <div class="flow-arrow">→</div>
          <div class="deck-card">
            <div class="eyebrow">Generated deck</div>
            <h1>${escapeHtml(deck.title)}</h1>
            <div class="deck-count" id="deck-count">Building recall questions…</div>
            <div class="question-list" id="question-list">${questionRows}</div>
            <button id="start-study" type="button">Study these questions <span>→</span></button>
          </div>
        </div>
      </section>
    </main>

    <footer class="demo-footer">one prompt → a playable quiz</footer>
  </div>
  <span class="demo-cursor" id="demo-cursor" aria-hidden="true"></span>
</body>
</html>`;
}

async function playStoryboard(page) {
  for (const character of PROMPT_TEXT) {
    await page.evaluate((value) => {
      document.querySelector("#prompt-text").textContent += value;
    }, character);
    await pause(24);
  }
  await pause(400);
  await page.evaluate(() => {
    const status = document.querySelector("#prompt-status");
    status.classList.add("is-visible");
    document.querySelector("#prompt-status-text").textContent = "Reading your source…";
  });
  await pause(500);
  await page.evaluate(() => {
    const status = document.querySelector("#prompt-status");
    status.classList.add("is-done");
    document.querySelector("#prompt-status-icon").textContent = "✓";
    document.querySelector("#prompt-status-text").textContent = "3 recall questions ready";
  });
  await pause(450);
  await showStage(page, "deck");

  for (let index = 0; index < STORY_CARDS.length; index += 1) {
    await pause(280);
    await revealGeneratedQuestion(page, index);
  }
  await page.evaluate(() => {
    document.querySelector("#deck-count").textContent = "3 questions ready · Basic · MCQ · Cloze";
  });
  await pause(450);
  const startStudy = page.locator("#start-study");
  await moveCursor(page, startStudy);
  await triggerCursorClick(page);
  await pause(300);
}

async function revealGeneratedQuestion(page, index) {
  await page.locator(`[data-question-index="${index}"]`).evaluate((row) => row.classList.add("is-visible"));
}

async function showStage(page, stage) {
  await page.evaluate((nextStage) => {
    document.querySelector("#prompt-scene").classList.toggle("scene--active", nextStage === "prompt");
    document.querySelector("#deck-scene").classList.toggle("scene--active", nextStage === "deck");
    document.querySelectorAll(".stage-step").forEach((step, index) => {
      step.classList.toggle("is-current", index === (nextStage === "prompt" ? 0 : 1));
    });
  }, stage);
}

async function capturePlayerFlow(page) {
  const reveal = page.getByTestId("reveal-answer");
  const answer = page.getByTestId("card-answer");
  const gradeKnown = page.getByTestId("grade-known");
  const next = page.getByTestId("next-card");

  await pause(500);
  await clickWithCue(page, reveal);
  await answer.waitFor({ state: "visible" });
  await pause(600);
  await clickWithCue(page, gradeKnown);
  await pause(350);
  await clickWithCue(page, next);
  await page.getByTestId("mcq-options").waitFor({ state: "visible" });
  await pause(500);
  await clickWithCue(page, page.getByTestId("mcq-option").filter({ hasText: "`no-store`" }));
  await pause(300);
  await clickWithCue(page, page.getByTestId("mcq-check-answer"));
  await page.getByTestId("mcq-feedback").waitFor({ state: "visible" });
  await pause(450);
  await clickWithCue(page, next);
  const clozeInput = page.getByTestId("cloze-input").first();
  await clozeInput.waitFor({ state: "visible" });
  await pause(500);
  await moveCursor(page, clozeInput);
  await clozeInput.pressSequentially("ETag", { delay: 70 });
  await pause(350);
  await clickWithCue(page, page.getByTestId("cloze-check-answer"));
  await page.getByTestId("cloze-feedback").waitFor({ state: "visible" });
  await pause(450);
  await clickWithCue(page, next);
  await page.getByTestId("score-screen").waitFor({ state: "visible" });
  await pause(1200);
}

async function installCursor(page) {
  if (!await page.locator("#demo-cursor").count()) {
    await page.addStyleTag({ content: CURSOR_STYLE });
    await page.evaluate(() => {
      const cursor = document.createElement("span");
      cursor.id = "demo-cursor";
      cursor.className = "demo-cursor";
      cursor.setAttribute("aria-hidden", "true");
      document.body.append(cursor);
    });
  }
}

async function clickWithCue(page, locator) {
  await moveCursor(page, locator);
  await triggerCursorClick(page);
  await pause(80);
  await locator.click();
}

async function moveCursor(page, locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error("Cannot focus the demo cursor on a hidden target.");
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector("#demo-cursor");
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
  await pause(220);
}

async function triggerCursorClick(page) {
  await page.evaluate(() => {
    const cursor = document.querySelector("#demo-cursor");
    cursor.classList.remove("is-clicking");
    void cursor.offsetWidth;
    cursor.classList.add("is-clicking");
  });
}

function transcodeGif(videoPath, outputPath) {
  const filter = [
    "fps=10,scale=800:-2:flags=lanczos,split[s0][s1]",
    "[s0]palettegen=max_colors=16:stats_mode=diff[p]",
    "[s1][p]paletteuse=dither=none:diff_mode=rectangle"
  ].join(";");
  const result = spawnSync("ffmpeg", [
    "-y",
    "-ss", VIDEO_START,
    "-i", videoPath,
    "-filter_complex", filter,
    "-an",
    outputPath
  ], { stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg exited with status ${result.status}.`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanup(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
