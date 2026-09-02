"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const EXAMPLE_PATH = path.join(ROOT, "examples/http-caching-essentials.html");
const OUTPUT_PATH = path.join(ROOT, "docs/demo.gif");
const VIEWPORT = { width: 800, height: 600 };
const VIDEO_START = "0.8";

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
    await page.goto(pathToFileURL(EXAMPLE_PATH).href);
    await page.waitForFunction(() => document.querySelector("#player")?.dataset.state === "ready");
    await page.evaluate(() => {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("fc:")) localStorage.removeItem(key);
      }

      // The committed example supplies the content; two cards keep the README
      // animation short enough to follow without rushing the interactions.
      window.CRAM_PLAYER.setDeck({
        ...window.__DECK__,
        cards: window.__DECK__.cards.slice(0, 2)
      });
    });
    await page.waitForFunction(() => window.CRAM_PLAYER?.getState().total === 2);
    await driveDemo(page);
  } finally {
    await context.close();
    await browser.close();
  }

  if (!video) throw new Error("Playwright did not create a video recording.");
  return video.path();
}

async function driveDemo(page) {
  await pause(700);
  await page.getByTestId("reveal-answer").click();
  await page.getByTestId("card-answer").waitFor({ state: "visible" });
  await pause(900);
  await page.getByTestId("grade-known").click();
  await pause(650);
  await page.getByTestId("next-card").click();
  await page.getByTestId("mcq-options").waitFor({ state: "visible" });
  await pause(850);
  await page.getByTestId("mcq-option").filter({ hasText: "`no-cache`" }).click();
  await pause(650);
  await page.getByTestId("mcq-check-answer").click();
  await page.getByTestId("mcq-feedback").waitFor({ state: "visible" });
  await pause(850);
  await page.getByTestId("next-card").click();
  await page.getByTestId("score-screen").waitFor({ state: "visible" });
  await pause(1600);
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
