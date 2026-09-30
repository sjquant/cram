"""Synthesize the Cram promo soundtrack: music bed + cue-synced SFX."""
import json, os, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
cues_path, out_path = sys.argv[1], sys.argv[2]
data = json.load(open(cues_path))
DUR = data["dur"] + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-tt(d) * k)
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, "highpass", fs=SR, output="sos"), x)
def noise(d): return rng.standard_normal(int(d * SR))
def adsr(d, a=.005, r=.05):
    n = int(d * SR); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) if na else e[:na]; e[n - nr:] *= np.linspace(1, 0, nr) if nr else 1
    return e

class Bus:
    def __init__(self): self.L = np.zeros(N + SR * 4); self.R = np.zeros(N + SR * 4)
    def add(self, t, x, g=1.0, pan=0.0):
        i = int(t * SR)
        if i < 0: x = x[-i:]; i = 0
        n = len(x); gl = g * np.sqrt((1 - pan) / 2) * 1.414; gr = g * np.sqrt((1 + pan) / 2) * 1.414
        self.L[i:i + n] += x * gl; self.R[i:i + n] += x * gr

music, sfx, verb_send = Bus(), Bus(), Bus()

# ───────── instruments ─────────
def pad(ms, d, cutoff=1500):
    t = tt(d); x = np.zeros_like(t)
    for m in ms:
        for det in (-.08, .0, .07):
            f = midi(m) * 2 ** (det / 12)
            x += signal.sawtooth(2 * np.pi * f * t + rng.random() * 6)
    x = lp(x / (len(ms) * 3), cutoff, 2)
    return x * adsr(d, .35, .5)

# ───────── music: bright indie pop in the spirit of 2000s product ads, 120 BPM, C major ─────────
# Canon-style "money chord" progression, two chords per bar, descending bass:
#   C – G/B – Am7 – Em7/G | Fmaj7 – C/E – Dm7 – G
# Bouncy upright piano on the off-beats, ensemble handclaps on 2 and 4, tambourine,
# a round electric bass, a glockenspiel hook, whistling in the second half, and
# ukulele strums: an acoustic, feel-good groove with no sidechain pumping.
BPM = 120
STEP = 60 / BPM / 4          # 16th note = .125 s
BAR = STEP * 16              # 2 s
MC = data.get("music", {})
DROP = MC.get("drop", 7.0)
SEC_B = MC.get("dense", 23.0)
BREAK_A, BREAK_B = MC.get("breakA", 39.0), MC.get("breakB", 47.0)
BUILD_END = MC.get("buildEnd", 51.4)
CTA = MC.get("cta", 51.9)
END = data["dur"] - 1.1

def sat(x, k=2.0): return np.tanh(x * k) / np.tanh(k)

# ── instruments ──
def piano(m, d, vel=1.0):
    """Upright piano: slightly inharmonic partials, two detuned strings, hammer thump."""
    t = tt(d); f0 = midi(m); x = np.zeros_like(t)
    for det in (-2.5, 2.5):                               # cents; a touch of honky-tonk width
        f = f0 * 2 ** (det / 1200)
        for k in range(1, 9):
            fk = k * f * np.sqrt(1 + .0004 * k * k)
            if fk > 15000: break
            x += (1 / k ** 1.15) * np.sin(2 * np.pi * fk * t) * np.exp(-t * (2.2 + k * 1.6))
    x = x / 2 + lp(noise(d), 2500) * np.exp(-t * 90) * .15
    return x * adsr(d, .002, .06) * vel * .55

def piano_chord(ms, d, vel=1.0, spread=.004):
    out = np.zeros(int(d * SR))
    for i, m in enumerate(ms):
        x = piano(m, d - i * spread, vel * (1 - .06 * i)); i0 = int(i * spread * SR); out[i0:i0 + len(x)] += x
    return out / len(ms) * 1.8

def glock(m, d=1.2, vel=1.0):
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + .3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9) \
        + .1 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 20)
    return x * adsr(d, .001, .05) * vel * .7

def kick_soft(g=1.0):
    d = .35; t = tt(d); f = 55 + 70 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + lp(noise(d), 600) * np.exp(-t * 60) * .2) * g

def handclap(g=1.0, seed=0):
    """Several people clapping: a few slightly offset, differently filtered bursts."""
    d = .28; t = tt(d); x = np.zeros_like(t); r = np.random.default_rng(seed)
    for k in range(4):
        o = r.uniform(0, .014); lo = r.uniform(900, 1400); hi = lo * r.uniform(3.2, 4.2)
        e = np.where(t >= o, np.exp(-(t - o) * r.uniform(28, 40)), 0)
        x += bp(noise(d), lo, hi) * e * r.uniform(.7, 1.0)
    return x * g * .55

def ebass(m, d, g=1.0):   # round finger bass
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8) + .1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 12)
    return sat(x * np.exp(-t * 2.5), 1.2) * adsr(d, .004, .04) * g

def reverse_swell(d=.9):
    t = tt(d); x = hp(noise(d), 1500) * (t / d) ** 3 * .4
    x[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))
    return lp(x, 9000)

class Stereo:
    def __init__(self): self.L = np.zeros(N + SR * 4); self.R = np.zeros(N + SR * 4)
    def add(self, t, l, r=None, g=1.0):
        r = l if r is None else r; i = int(t * SR); n = len(l)
        self.L[i:i + n] += l * g; self.R[i:i + n] += r * g

drums, synths, low = Bus(), Stereo(), Bus()

PROG = [
    (36, [60, 64, 67]),      # C
    (35, [59, 62, 67]),      # G/B
    (33, [57, 60, 64, 67]),  # Am7
    (31, [55, 59, 62, 67]),  # Em7/G
    (29, [57, 60, 64, 65]),  # Fmaj7
    (28, [55, 60, 64, 67]),  # C/E
    (26, [57, 60, 62, 65]),  # Dm7
    (31, [55, 59, 62, 67]),  # G
]
HOOK = [(0, 76), (2, 79), (4, 81), (6, 79), (8, 76), (11, 74), (12, 72)]
HOOK_B = [(0, 79), (2, 81), (4, 84), (6, 83), (8, 81), (11, 79), (12, 76)]

def section(t):
    if t < DROP: return "intro"
    if t < SEC_B: return "A"
    if t < BREAK_A: return "B"
    if t < BREAK_B: return "break"
    if t < BUILD_END: return "build"
    return "outro"

def grid_origin(t):
    return CTA if t >= CTA else DROP

def chord_at(t):
    """Chord tones sounding at time t, for tuning pitched sound effects."""
    if t < DROP:   # the intro chord sounding at t
        if t >= PULSE_FROM - 1e-6: return CHORDS["G"][1]
        name = INTRO_HITS[0][1]
        for t0, n in INTRO_HITS:
            if t0 <= t + 1e-6: name = n
        return CHORDS[name][1]
    if t >= CTA or t >= BUILD_END: return [60, 64, 67]
    return PROG[int((t - DROP) / (BAR / 2)) % len(PROG)][1]

def on_grid(t):
    """Snap a cue onto the 16th-note grid (the intro shares the groove's grid).

    Sound that arrives before its picture is easy to notice, so a cue moves at most
    30 ms earlier; otherwise it waits for the next 16th (at most ~95 ms later).
    """
    if BUILD_END <= t < CTA - .03: return t
    o = CTA if t >= CTA - .03 else DROP
    prev = o + np.floor((t - o) / STEP + 1e-9) * STEP
    return prev if t - prev <= .03 else prev + STEP

def snap(g=1.0):   # finger snap
    d = .12; t = tt(d)
    return (bp(noise(d), 2200, 7500) * np.exp(-t * 60) + .3 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 120)) * .5 * g

def shaker(g=1.0):
    d = .07; t = tt(d); e = (1 - np.exp(-t * 300)) * np.exp(-t * 60)
    return hp(noise(d), 5500) * e * .16 * g

# ── intro: the music answers the motion. Each line of text lands on a beat with a piano chord
# (Am7 → Fmaj7 → Dm7 → Gsus4); then, while the stamp comes down, a G pulse counts in to the C drop.
CHORDS = {"Am7": (33, [57, 60, 64, 67]), "Fmaj7": (29, [57, 60, 64, 65]), "Dm7": (38, [57, 60, 62, 65]),
          "Gsus4": (31, [55, 60, 62, 67]), "G": (31, [55, 59, 62, 67])}
INTRO_HITS = [(t, n) for t, n in MC.get("introHits", [[.5, "Am7"], [2.0, "Fmaj7"], [3.5, "Dm7"], [5.5, "Gsus4"]])]
PULSE_FROM = MC.get("pulseFrom", DROP - 1.0)
for k, (t0, name) in enumerate(INTRO_HITS):
    root, tones = CHORDS[name]
    until = INTRO_HITS[k + 1][0] if k + 1 < len(INTRO_HITS) else PULSE_FROM
    ring = max(.6, until - t0 + .4)
    vel = .6 + .25 * k / max(1, len(INTRO_HITS) - 1)
    x = piano_chord(tones, ring, vel); music.add(t0, x, .55); verb_send.add(t0, x, .35)
    low.add(t0, ebass(root, max(.5, until - t0) * .95), .16)
music.add(INTRO_HITS[0][0], pad([45, 52, 57, 60], DROP - INTRO_HITS[0][0], 650), .06)
# count-in: G + D eighth notes, growing into the drop, stopping for the breath before the stamp
n_pulse = int(round((DROP - .25 - PULSE_FROM) / (2 * STEP)))
for i in range(n_pulse):
    ts = PULSE_FROM + i * 2 * STEP
    x = piano_chord([67, 74], .18, .45 + .4 * i / max(1, n_pulse - 1)); music.add(ts, x, .5, pan=.1); verb_send.add(ts, x, .1)
music.add(DROP - .9, reverse_swell(.9), .3)

def downbeat(t0, g=1.0):   # the stamp carries the impact; the music just starts cleanly
    drums.add(t0, kick_soft(1.0), .75 * g)
downbeat(DROP)

bar_t, bi = DROP, 0
while bar_t < BUILD_END - 1e-6:
    sec = section(bar_t)
    d = min(BAR, BUILD_END - bar_t)
    nsteps = int(round(d / STEP))
    for s in range(nsteps):
        ts = bar_t + s * STEP
        if sec in ("A", "B", "build"):
            if s in (0, 8) or (sec == "build" and s in (4, 12)):
                drums.add(ts, kick_soft(.8), .7)
            if s in (4, 12):
                drums.add(ts, snap(), .6, pan=-.1); verb_send.add(ts, snap(), .15)
                if sec == "B":
                    x = handclap(.5, bi * 16 + s); drums.add(ts, x, .3); verb_send.add(ts, x, .1)
            if s % 4 == 2:
                drums.add(ts, shaker(), .8, pan=.3)
        elif sec == "break":
            if s == 0 and bi % 2 == 0: drums.add(ts, kick_soft(.5), .45)
    for half in range(2):
        hs = half * 8
        if hs >= nsteps: break
        root, tones = PROG[(bi * 2 + half) % len(PROG)]
        th = bar_t + hs * STEP
        hd = min(8, nsteps - hs) * STEP
        if sec in ("A", "B", "build"):
            low.add(th, ebass(root, 5 * STEP), .45)
            if hs + 6 < nsteps: low.add(th + 6 * STEP, ebass(root, 2 * STEP * .9), .3)
            for s in (2, 6):   # light off-beat piano, high and airy
                if hs + s < nsteps:
                    x = piano_chord([m + 12 for m in tones], .2, .7); music.add(th + s * STEP, x, .38, pan=-.15); verb_send.add(th + s * STEP, x, .14)
        elif sec == "break":
            low.add(th, ebass(root, hd), .25)
            x = piano_chord(tones, hd, .6); music.add(th, x, .42); verb_send.add(th, x, .3)
    # glockenspiel hook: every other phrase at first, every phrase in the second half
    if (sec == "A" and bi % 4 == 0) or (sec in ("B", "break") and bi % 2 == 0):
        hook = HOOK_B if sec == "B" and bi % 4 == 2 else HOOK
        for s, m in hook:
            if s < nsteps:
                x = glock(m, 1.0, .7 if sec != "break" else .5); music.add(bar_t + s * STEP, x, .26, pan=.2); verb_send.add(bar_t + s * STEP, x, .18)
    bar_t += BAR; bi += 1

# a breath, then the last stamp: two light bars under the call to action and a C that rings out
music.add(BUILD_END - .9, reverse_swell(.9), .3)
downbeat(CTA, .9)
OUTRO = [(36, [60, 64, 67]), (35, [59, 62, 67]), (33, [57, 60, 64, 67]), (29, [57, 60, 64, 65])]  # C G/B Am7 Fmaj7
N_OUT = min(len(OUTRO), int(max(0.0, END - CTA - 1.8) / (BAR / 2)))   # leave ~2 s for the last chord to ring
for k, (root, tones) in enumerate(OUTRO[:N_OUT]):
    th = CTA + k * BAR / 2
    low.add(th, ebass(root, 5 * STEP), .38)
    for s_ in (2, 6):
        x = piano_chord([m + 12 for m in tones], .2, .65); music.add(th + s_ * STEP, x, .36, pan=-.15); verb_send.add(th + s_ * STEP, x, .15)
    drums.add(th + 4 * STEP, snap(.8), .5); verb_send.add(th + 4 * STEP, snap(.8), .15)
for s_, m in (HOOK if N_OUT >= 2 else []):
    x = glock(m, 1.0, .6); music.add(CTA + s_ * STEP, x, .24, pan=.2); verb_send.add(CTA + s_ * STEP, x, .2)
FIN = CTA + N_OUT * BAR / 2
x = piano_chord([48, 55, 60, 64, 67, 72], END - FIN + 1.0, .9); music.add(FIN, x, .55); verb_send.add(FIN, x, .45)
low.add(FIN, ebass(36, END - FIN + .8), .35)
for s_, m in [(0, 84), (2, 88), (4, 91)]:
    x = glock(m, 1.6, .5); music.add(FIN + s_ * STEP, x, .18); verb_send.add(FIN + s_ * STEP, x, .3)

# ───────── SFX ─────────
def sweep_noise(d, f0, f1, q=1.0, shape="up"):
    n = noise(d); t = tt(d); out = np.zeros_like(n)
    seg = int(.01 * SR)
    fs = np.geomspace(f0, f1, max(1, len(n) // seg + 1))
    zi = None
    for j, s in enumerate(range(0, len(n), seg)):
        f = fs[min(j, len(fs) - 1)]
        sos = signal.butter(2, [f / (1 + q * .5), min(f * (1 + q * .5), SR / 2 - 100)], "bandpass", fs=SR, output="sos")
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        out[s:s + seg], zi = signal.sosfilt(sos, n[s:s + seg], zi=zi)
    return out

def whoosh(d, f0=300, f1=3000, peak=.6):
    t = tt(d); e = np.where(t < peak * d, (t / (peak * d)) ** 2, np.exp(-(t - peak * d) * 9 / d))
    return sweep_noise(d, f0, f1, 1.2) * e

def thump(f0=90, f1=40, d=.5, k=8):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * k)

def keyclick():
    d = .03; t = tt(d); f = 2500 + rng.random() * 1500
    return (bp(noise(d), f * .7, f * 1.3) * np.exp(-t * 260) + .3 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 120))

def tick(f=1900, d=.06):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 70) + .3 * hp(noise(d), 4000) * np.exp(-t * 300))

def pop(f0=380, f1=950):
    d = .09; t = tt(d); f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45)

def paper(d=.08, lo=2000):
    t = tt(d); return hp(noise(d), lo) * np.exp(-t * 55) * (1 - np.exp(-t * 900))

# Sound effects sit on the beat: once the groove runs, cues snap to the nearest 16th note,
# pitched ones (pops, bells) use tones of the chord playing at that moment, and the
# busy ones (typing, ticks) are thinned out and kept low.
SFX_GAIN = .7
def top(tones, octave=84):   # chord tones folded into one bright octave
    return sorted({octave + ((m - octave) % 12) for m in tones})

key_n = 0
for c in data["cues"]:
    t0, ty = on_grid(c["t"]), c["type"]
    pan = (rng.random() - .5) * .4
    tones = chord_at(t0)
    G = SFX_GAIN
    if ty == "key":
        key_n += 1
        if key_n % 2: sfx.add(t0, keyclick(), .16 * G, pan)
    elif ty == "enter": sfx.add(t0, keyclick(), .35 * G); sfx.add(t0, thump(140, 70, .15, 30), .25 * G)
    elif ty == "tick": x = glock(top(tones)[0], .5, .5); sfx.add(t0, x, .08 * G, pan); verb_send.add(t0, x, .05)
    elif ty == "tick-soft": sfx.add(t0, tick(2600, .03), .05 * G, pan)
    elif ty == "marker": sfx.add(t0, sweep_noise(.45, 2500, 5000, .6) * adsr(.45, .05, .12), .2 * G, .2)
    elif ty in ("whoosh", "swoosh-in", "slide", "swish-soft", "zoom", "whoosh-rev"):
        d = {"whoosh": .5, "swoosh-in": .4, "slide": .3, "swish-soft": .5, "zoom": .6, "whoosh-rev": .4}[ty]
        g = {"whoosh": .22, "swoosh-in": .16, "slide": .08, "swish-soft": .1, "zoom": .22, "whoosh-rev": .16}[ty]
        x = whoosh(d, 500, 3500 if ty != "whoosh-rev" else 900, .7 if ty != "whoosh-rev" else .2)
        sfx.add(t0 - d * .5, x, g * G, pan); verb_send.add(t0 - d * .5, x, g * .2)
    elif ty in ("whoosh-big", "wipe"):
        x = whoosh(.8, 250, 4500, .55); sfx.add(t0 - .4, x, .3 * G); verb_send.add(t0 - .4, x, .1)
    elif ty == "hit-soft": sfx.add(t0, thump(80, 45, .7, 6), .2 * G); verb_send.add(t0, thump(80, 45, .7, 6), .08)
    elif ty in ("riser", "riser-short"):
        d = .95 if ty == "riser" else .72
        t = tt(d); e = (t / d) ** 2.4
        x = sweep_noise(d, 400, 6000, .8) * e
        x[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
        sfx.add(t0, x, .3 * G); verb_send.add(t0, x, .15)
    elif ty in ("stamp", "stamp-final"):
        g = 1.0 if ty == "stamp" else .85
        x = thump(110, 38, 1.0, 5) * 1.0
        x[:int(.25 * SR)] += lp(noise(.25), 1800) * env_exp(.25, 24) * .7
        x[:int(.06 * SR)] += hp(noise(.06), 2500) * env_exp(.06, 80) * .4
        sfx.add(t0, x, .85 * g); verb_send.add(t0, x, .35 * g)
        sfx.add(t0 + .02, paper(.12, 900), .3 * g)
    elif ty == "letter": sfx.add(t0, thump(150, 70, .15, 24), .22 * G); sfx.add(t0, paper(.04, 3000), .1 * G)
    elif ty in ("pop", "pop-soft"):
        m = top(tones, 72)[rng.integers(0, 3)]
        x = pop(midi(m) * .5, midi(m)); sfx.add(t0, x, (.2 if ty == "pop" else .1) * G, pan)
    elif ty == "card": sfx.add(t0, paper(.06, 2200 + rng.random() * 1500), .14 * G, (rng.random() - .5) * 1.2)
    elif ty == "gather":
        d = .6; x = sweep_noise(d, 5000, 700, .8) * np.linspace(0, 1, int(d * SR)) ** 2; sfx.add(t0, x, .18 * G)
    elif ty == "thump": sfx.add(t0, thump(100, 50, .45, 10), .35 * G)
    elif ty == "click": sfx.add(t0, tick(3200, .02), .2 * G); sfx.add(t0 + .04, tick(2600, .02), .1 * G)
    elif ty == "correct":
        up = top(tones)
        for i, m in enumerate((up[0], up[-1] + 12 if up[-1] < 90 else up[-1])):
            x = glock(m, 1.0, .8); sfx.add(t0 + i * STEP, x, .2 * G); verb_send.add(t0 + i * STEP, x, .12)
    elif ty == "wrong":
        low_t = sorted(tones)[:2]
        for i, m in enumerate((low_t[-1] - 12, low_t[0] - 12)):
            t = tt(.2); x = lp(signal.square(2 * np.pi * midi(m) * t), 700) * np.exp(-t * 14)
            sfx.add(t0 + i * STEP, x, .1 * G)
    elif ty in ("ding", "ding-soft"):
        x = glock(top(tones)[-1], 1.1, 1); sfx.add(t0, x, (.16 if ty == "ding" else .08) * G, pan); verb_send.add(t0, x, .1)
    elif ty == "chime":
        for i, m in enumerate(top(tones)):
            x = glock(m, 1.2, .7); sfx.add(t0 + i * STEP, x, .14 * G, (i - 1) / 3); verb_send.add(t0 + i * STEP, x, .12)
    elif ty == "count":
        for k in range(8):                     # 16th-note ticks rising through the chord
            m = top(tones)[k % len(top(tones))] + 12 * (k // len(top(tones)))
            x = glock(m, .3, .5); sfx.add(t0 + k * STEP, x, .07 * G)


# ───────── mix ─────────
L = music.L + synths.L + low.L + drums.L
R = music.R + synths.R + low.R + drums.R
# pre-drop silence: the beat cuts out for a breath before each stamp lands
g = np.ones_like(L)
for tgap in (DROP, CTA):
    i0, i1 = int((tgap - .22) * SR), int(tgap * SR); g[i0:i1] = np.minimum(g[i0:i1], np.linspace(.25, 0, i1 - i0))
L *= g; R *= g
# reverb: stereo noise IR
ir_d = 2.2; ti = tt(ir_d)
irL = noise(ir_d) * np.exp(-ti * 3.0); irR = noise(ir_d) * np.exp(-ti * 3.0)
irL = lp(irL, 5000); irR = lp(irR, 5000)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
vL = signal.fftconvolve(verb_send.L, irL)[:len(L)]; vR = signal.fftconvolve(verb_send.R, irR)[:len(R)]
mixL = sat(L, 1.0) * .9 + sfx.L * .9 + vL * .5
mixR = sat(R, 1.0) * .9 + sfx.R * .9 + vR * .5
mix = np.stack([mixL, mixR], 1)[:N]
mix = hp(mix.T, 28).T
# fade out
fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
# loudness-ish normalize & soft limit
rms = np.sqrt((mix ** 2).mean()); mix *= 10 ** (-16.2 / 20) / rms
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= .93 / np.abs(mix).max()
wavfile.write(out_path, SR, (mix * 32767).astype(np.int16))
print("wrote", out_path, mix.shape[0] / SR, "s")
