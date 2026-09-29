"use strict";

// Renders scripts/promo pages frame by frame. See scripts/promo/README.md.
const { chromium } = require("@playwright/test");
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path");
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")));
const lang = args.lang || "en";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width: +(args.w || 1920), height: +(args.h || 1080) }, deviceScaleFactor: 1 });
  page.on("console", m => console.log("[page]", m.text()));
  page.on("pageerror", e => console.log("[err]", e.message));
  await page.goto("file://" + path.resolve(__dirname, args.page || "stage.html") + "?lang=" + lang);
  await page.evaluate(() => window.ready);
  if (args.cues) { fs.writeFileSync(args.cues, JSON.stringify(await page.evaluate(() => ({ dur: window.DUR, cues: window.CUES, music: window.MUSIC })))); }
  if (args.stills) {
    fs.mkdirSync(args.out || "stills", { recursive: true });
    for (const t of args.stills.split(",").map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: `${args.out || "stills"}/${lang}_${t.toFixed(2).padStart(6, "0")}.png` });
    }
  }
  if (args.video) {
    const fps = +(args.fps || 60), dur = await page.evaluate(() => window.DUR);
    const f0 = args.f0 !== undefined ? +args.f0 : Math.round(+(args.from || 0) * fps), f1 = args.f1 !== undefined ? +args.f1 : Math.round(+(args.to || dur) * fps);
    const ff = spawn(process.env.FFMPEG || "ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", args.preset || "slow", "-crf", args.crf || "14", "-pix_fmt", "yuv420p", "-tune", "animation", "-movflags", "+faststart", args.video], { stdio: ["pipe", "inherit", "inherit"] });
    const n = f1 - f0;
    const st = Date.now();
    for (let i = 0; i < n; i++) {
      const t = (f0 + i) / fps;
      await page.evaluate(t => window.render(t), t);
      const buf = await page.screenshot({ type: "jpeg", quality: 100 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (i % 300 === 0) console.log(`${lang} frame ${i}/${n}  ${((Date.now() - st) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on("close", r));
  }
  await browser.close();
})();
