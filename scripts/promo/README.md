# Promo videos

Source for the Cram promo videos. The rendered MP4s aren't committed, because
binaries would stay in git history forever. Render them locally, or publish them
as release assets.

| Output (`scripts/promo/out/`) | Format | Length |
| --- | --- | --- |
| `cram-long-en.mp4`, `cram-long-ko.mp4` | 1920×1080, 60 fps | 59 s |
| `cram-short-en.mp4`, `cram-short-ko.mp4` | 1080×1920 (Reels/Shorts/TikTok), 60 fps | 28 s |

Every frame is rendered from HTML. There's no editing timeline and no stock
footage. The soundtrack (music and sound effects) is synthesized in Python
and synced to cue points the page exports.

## How it works

- `stage.html` holds the animation engine, the copy (`STR.en` / `STR.ko`), and
  the long cut's scenes. `window.render(t)` draws the frame at time `t`
  deterministically, with no CSS transitions or wall-clock time, so any frame
  can be rendered on its own.
- `short_scenes.js` holds the vertical cut's copy (`SS`) and scenes.
  `build_short.py` combines it with the engine from `stage.html` into
  `short.html` (generated, not committed).
- `render.js` opens a page in headless Chromium through Playwright. It can:
  - export the audio cue list (`--cues`),
  - save stills (`--stills=1.5,7.0`),
  - pipe a frame range into ffmpeg (`--video`, `--f0`, `--f1`).
- `audio.py` synthesizes the soundtrack into a WAV file:
  - a light 120 BPM indie-pop track in C that follows the story's arc
    (기승전결): in the intro each line of text lands on a beat with a piano
    chord and a G pulse counts in to the first stamp; the money-chord
    progression (C–G/B–Am7–Em7/G–Fmaj7–C/E–Dm7–G) carries the first groove;
    the second half lifts to 4–5–3–6 with a ii–V–I cadence; the dark "share"
    scene turns to minor colour ending on E7; the build climbs F–Fm–Gsus4–G7;
    and the call to action resolves to C with a closing melody that ends on
    the tonic. Instruments stay light: off-beat piano, soft kick, finger
    snaps, shaker, simple bass, and a glockenspiel hook,
  - the sound effects. They snap to the music's 16th-note
    grid (at most 30 ms early, otherwise up to one 16th late), pitched ones use
    the chord playing at that moment, and busy ones such as typing are thinned
    out.
- `render.sh` runs the whole pipeline. It renders frame ranges in parallel
  workers, concatenates them, and muxes in the audio.

## Requirements

- Node.js with the repository's dev dependencies (`npm ci`)
- Python 3 with `numpy` and `scipy`
- `ffmpeg` with libx264, on `PATH` or set with `FFMPEG=/path/to/ffmpeg`
- Network access for the one-time font download

## Render

```sh
python3 scripts/promo/fetchfonts.py     # once: Inter Tight, Inter, Fraunces, JetBrains Mono, Caveat, Noto KR, Pretendard
scripts/promo/render.sh long en         # → scripts/promo/out/cram-long-en.mp4
scripts/promo/render.sh short ko        # → scripts/promo/out/cram-short-ko.mp4
```

A full render takes a few minutes per video with 4 workers. Environment
variables:

- `WORKERS`: number of parallel workers
- `CRF`: final x264 quality (default 22)
- `PYTHON`: Python interpreter (default `python3`)
- `CHROMIUM_PATH`: a Chromium binary to use instead of Playwright's bundled one

To preview frames while editing, render stills:

```sh
node scripts/promo/render.js --lang=ko --stills=4.4,11,27 --out=/tmp/stills
node scripts/promo/render.js --lang=ko --page=short.html --w=1080 --h=1920 --stills=5 --out=/tmp/stills
```

## Look

The palette is "red pen on white paper":

- paper `#f6f6f4`
- ink `#121316`
- seal red `#e0231b` (the key color, used for the logo and emphasis)
- highlighter `#ffd400` (secondary)

Headlines use Inter Tight in English and Pretendard in Korean. Keep the red
for the stamp and the emphasized words only.

The Cram player shown inside the browser window keeps the product's own look
(cream paper, brick red, serif titles). Its tokens are scoped to `.win` in
`stage.html`, so the promo palette never leaks into the product UI.

## Editing copy

- Change the text in `STR` (long cut) or `SS` (short cut), then check the
  affected scenes with stills. Headlines don't wrap automatically, so keep
  lines short enough to fit the layout.
- Korean headings use Pretendard. Big Korean headlines leave out the final
  period.
- If you move a scene's timing, move its `cue(...)` calls with it. Those calls
  place the sound effects, and `window.MUSIC` in `short_scenes.js` places the
  short cut's music sections.
