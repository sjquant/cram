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
const RENDERER_PATH = path.join(ROOT, "skills/cram/scripts/render.py");
const OUTPUT_PATH = path.join(ROOT, "docs/demo.gif");
// A portrait tablet canvas keeps the storyboard and the player's lower actions visible.
const VIEWPORT = { width: 800, height: 900 };
const VIDEO_START = "0.15";
const TERMINAL_COMMAND = "/cram:cram";
const OPEN_COMMAND = "open examples/http-caching-essentials.html";
const EXAMPLE_DECK = JSON.parse(fs.readFileSync(EXAMPLE_JSON_PATH, "utf8"));
const DEMO_DECK = {
  ...EXAMPLE_DECK,
  cards: [EXAMPLE_DECK.cards[0], EXAMPLE_DECK.cards[1], EXAMPLE_DECK.cards[3]]
};
const TERMINAL_CARDS = [
  { type: "basic", prompt: "What does `max-age=60` permit?" },
  { type: "mcq", prompt: "Which directive prevents storage?" },
  { type: "cloze", prompt: "The validator header is _____." }
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
    verifyRenderedExample(tempDir);
    await page.setContent(buildTerminalMarkup(EXAMPLE_DECK), { waitUntil: "load" });
    await page.waitForSelector(".terminal-window");
    await playTerminalStory(page);

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

function verifyRenderedExample(tempDir) {
  const outputPath = path.join(tempDir, "rendered-example.html");
  const result = spawnSync("python3", [RENDERER_PATH, EXAMPLE_JSON_PATH, "-o", outputPath], {
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`The example deck could not be rendered: ${result.stderr || result.stdout}`);
  }
}

function buildTerminalMarkup(deck) {
  const cardLines = TERMINAL_CARDS.map((card, index) => `
    <div class="output-line card-line" data-output-line>
      <span class="card-number">0${index + 1}</span>
      <span class="card-type">${escapeHtml(card.type)}</span>
      <span class="card-prompt">${escapeHtml(card.prompt)}</span>
    </div>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cram terminal demo</title>
  <style>
    :root {
      --paper: #ede8de;
      --terminal: #111416;
      --terminal-rule: #2b3033;
      --terminal-muted: #899196;
      --terminal-ink: #e5ebe8;
      --terminal-green: #9bd4a7;
      --terminal-blue: #91c9e8;
      --terminal-amber: #e6c487;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--terminal-ink);
      background: var(--paper);
    }

    * { box-sizing: border-box; }

    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
    }

    body {
      display: grid;
      place-items: center;
      padding: 58px 48px;
      background: var(--paper);
      -webkit-font-smoothing: antialiased;
    }

    .terminal-window {
      width: 704px;
      height: 784px;
      overflow: hidden;
      border: 1px solid #4a514f;
      border-radius: 12px;
      background: var(--terminal);
      box-shadow: 0 22px 50px rgba(55, 46, 31, 0.2);
    }

    .terminal-bar {
      display: flex;
      height: 43px;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      border-bottom: 1px solid var(--terminal-rule);
      color: var(--terminal-muted);
      font-size: 11px;
    }

    .window-controls { display: flex; gap: 7px; }

    .window-controls span {
      display: block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .window-controls span:nth-child(1) { background: #e27d70; }
    .window-controls span:nth-child(2) { background: #e2c070; }
    .window-controls span:nth-child(3) { background: #7eb68d; }

    .terminal-body {
      height: calc(100% - 43px);
      padding: 32px 34px;
      font-size: 15px;
      line-height: 1.75;
    }

    .terminal-path {
      margin-bottom: 12px;
      color: var(--terminal-muted);
    }

    .command-line {
      display: flex;
      align-items: baseline;
      min-height: 27px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .command-prompt { color: var(--terminal-blue); }
    .command { color: var(--terminal-ink); }

    .terminal-caret {
      display: inline-block;
      width: 9px;
      height: 18px;
      margin-left: 4px;
      vertical-align: -3px;
      background: var(--terminal-green);
      animation: caret-blink 900ms steps(1) infinite;
    }

    @keyframes caret-blink { 50% { opacity: 0; } }

    .output-stack {
      display: grid;
      gap: 3px;
      margin-top: 20px;
    }

    .output-line {
      min-height: 27px;
      color: var(--terminal-muted);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 220ms ease, transform 220ms ease;
    }

    .output-line.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .output-line--success { color: var(--terminal-green); }
    .output-line--accent { color: var(--terminal-amber); }

    .card-line {
      display: grid;
      grid-template-columns: 30px 68px minmax(0, 1fr);
      gap: 10px;
      align-items: baseline;
      padding-left: 12px;
      color: var(--terminal-ink);
    }

    .card-number { color: var(--terminal-muted); }
    .card-type { color: var(--terminal-blue); }
    .card-prompt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #next-command {
      margin-top: 22px;
      opacity: 0;
      transition: opacity 220ms ease;
    }

    #next-command.is-visible { opacity: 1; }

    .terminal-hint {
      margin-top: 27px;
      color: var(--terminal-muted);
      font-size: 12px;
    }

    .terminal-hint strong { color: var(--terminal-green); font-weight: 500; }
  </style>
</head>
<body>
  <section class="terminal-window" aria-label="Cram terminal session">
    <header class="terminal-bar">
      <div class="window-controls" aria-hidden="true"><span></span><span></span><span></span></div>
      <span>cram — zsh</span>
      <span>⌘ 1</span>
    </header>
    <main class="terminal-body">
      <div class="terminal-path">~/study-notes</div>
      <div class="command-line">
        <span class="command-prompt">~/study-notes $ </span><span class="command" id="command"></span><span class="terminal-caret"></span>
      </div>
      <div class="output-stack" id="output-stack">
        <div class="output-line" data-output-line>source: ${escapeHtml(deck.title)} · attached notes</div>
        <div class="output-line" data-output-line>reading source material…</div>
        <div class="output-line output-line--success" data-output-line>✓ extracted 3 concepts</div>
        <div class="output-line output-line--success" data-output-line>✓ generated and validated deck</div>
        ${cardLines}
        <div class="output-line output-line--success" data-output-line>✓ rendered self-contained player</div>
      </div>
      <div class="command-line" id="next-command">
        <span class="command-prompt">~/study-notes $ </span><span class="command" id="open-command"></span><span class="terminal-caret"></span>
      </div>
      <div class="terminal-hint">ready to study · <strong>3 cards</strong> · basic / mcq / cloze</div>
    </main>
  </section>
</body>
</html>`;
}

async function playTerminalStory(page) {
  await typeTerminalText(page, "#command", TERMINAL_COMMAND, 55);
  await pause(650);

  for (const line of await page.locator("[data-output-line]").all()) {
    await revealTerminalLine(line);
    await pause(330);
  }

  await page.locator("#next-command").evaluate((line) => line.classList.add("is-visible"));
  await typeTerminalText(page, "#open-command", OPEN_COMMAND, 28);
  await pause(800);
}

async function revealTerminalLine(line) {
  await line.evaluate((element) => element.classList.add("is-visible"));
}

async function typeTerminalText(page, selector, value, delay) {
  for (const character of value) {
    await page.locator(selector).evaluate((element, nextCharacter) => {
      element.textContent += nextCharacter;
    }, character);
    await pause(delay);
  }
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
