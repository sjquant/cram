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
const VIDEO_START = "0.35";
const TERMINAL_COMMAND = "/cram:cram";
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
      document.documentElement.dataset.theme = "bluebell";
      localStorage.setItem("cram:theme:v2", "bluebell");
      window.CRAM_PLAYER.setDeck(deck);
    }, DEMO_DECK);
    await page.waitForFunction(() => window.CRAM_PLAYER?.getState().total === 3);
    // Keep the capture crisp and compact; the production player still keeps its paper grain.
    await page.addStyleTag({ content: "body::before { opacity: 0 !important; }" });
    await installCursor(page);
    await moveCursor(page, page.getByTestId("reveal-answer"));
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
      --terminal: #090d12;
      --terminal-rule: #5d6267;
      --terminal-muted: #8e9398;
      --terminal-ink: #d8dbd9;
      --terminal-green: #a4d6ae;
      --terminal-blue: #9aa1a8;
      --terminal-amber: #f0b817;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--terminal-ink);
      background: var(--terminal);
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
      background: var(--terminal);
      -webkit-font-smoothing: antialiased;
    }

    .terminal-window {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--terminal);
    }

    .terminal-body {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
      justify-content: center;
      padding: 0 32px;
    }

    .terminal-workspace {
      display: flex;
      width: min(100%, 704px);
      min-height: 0;
      flex-direction: column;
      padding: 176px 0 32px;
    }

    .command-history-line {
      min-height: 24px;
      margin-top: 26px;
      color: var(--terminal-muted);
      font-size: 15px;
      opacity: 0;
      transition: opacity 220ms ease;
    }

    .command-history-line.is-visible { opacity: 1; }

    .output-stack {
      display: grid;
      gap: 2px;
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.4;
    }

    .output-line {
      min-height: 25px;
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
    }

    .card-number { color: var(--terminal-muted); }
    .card-type { color: var(--terminal-blue); }
    .card-prompt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .terminal-hint {
      margin-top: 10px;
      color: var(--terminal-muted);
      font-size: 12px;
      opacity: 0;
      transition: opacity 220ms ease;
    }

    .terminal-hint.is-visible { opacity: 1; }

    .terminal-hint strong { color: var(--terminal-green); font-weight: 500; }

    .command-line {
      display: flex;
      min-height: 58px;
      align-items: center;
      padding: 0 16px;
      border: 1px solid #4d5965;
      border-radius: 7px;
      background: #111821;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      font-size: 17px;
      line-height: 1.45;
      white-space: nowrap;
    }

    .command-line.is-hidden { display: none; }

    .command-line:focus-within {
      border-color: #96a8b7;
      box-shadow: 0 0 0 3px rgba(150, 168, 183, 0.14);
    }

    .command-prompt {
      flex: 0 0 auto;
      margin-right: 8px;
      color: var(--terminal-ink);
      font-size: 20px;
      line-height: 1;
    }

    .command-input {
      min-width: 0;
      width: 0;
      flex: 1;
      border: 0;
      padding: 0;
      color: var(--terminal-ink);
      background: transparent;
      caret-color: var(--terminal-amber);
      font: inherit;
      line-height: 1.45;
      outline: none;
    }

    .command-input.is-submitted { color: var(--terminal-muted); }

  </style>
</head>
<body>
  <section class="terminal-window" aria-label="Cram command preview">
    <main class="terminal-body">
      <section class="terminal-workspace">
        <div class="command-line" id="primary-command">
          <label class="command-prompt" for="command-input">›</label><input class="command-input" id="command-input" aria-label="Cram command" autocomplete="off" spellcheck="false">
        </div>
        <div class="command-history-line" id="command-history">› <span id="command-history-text"></span></div>
        <div class="output-stack" id="output-stack">
          <div class="output-line" data-output-line>source: ${escapeHtml(deck.title)} · attached notes</div>
          <div class="output-line" data-output-line>reading source material…</div>
          <div class="output-line output-line--success" data-output-line>✓ extracted 3 concepts</div>
          <div class="output-line output-line--success" data-output-line>✓ generated and validated deck</div>
          ${cardLines}
          <div class="output-line output-line--success" data-output-line>✓ rendered self-contained player</div>
        </div>
        <div class="terminal-hint" id="terminal-hint">ready to study · <strong>3 cards</strong> · basic / mcq / cloze</div>
      </section>
    </main>
  </section>
</body>
</html>`;
}

async function playTerminalStory(page) {
  const command = page.locator("#command-input");
  await command.focus();
  await pause(450);
  await typeTerminalText(command, TERMINAL_COMMAND, 55);
  await pause(700);
  await command.press("Enter");
  await command.evaluate((input) => {
    input.classList.add("is-submitted");
    input.closest(".command-line").classList.add("is-hidden");
    const history = document.querySelector("#command-history");
    history.querySelector("#command-history-text").textContent = input.value;
    history.classList.add("is-visible");
  });
  await pause(1000);

  for (const line of await page.locator("[data-output-line]").all()) {
    await revealTerminalLine(line);
    await pause(330);
  }

  await page.locator("#terminal-hint").evaluate((line) => line.classList.add("is-visible"));
  await pause(1100);
}

async function revealTerminalLine(line) {
  await line.evaluate((element) => element.classList.add("is-visible"));
}

async function typeTerminalText(input, value, delay) {
  await input.focus();
  await input.pressSequentially(value, { delay });
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
  await clozeInput.evaluate((input) => {
    input.style.minWidth = "8ch";
    input.style.paddingInline = "0.35em";
    input.style.textAlign = "left";
  });
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
