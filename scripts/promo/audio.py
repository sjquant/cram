"""Synthesize the Cram promo soundtrack: music bed + cue-synced SFX."""
import json, sys
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
def kick(g=1.0):
    d = .45; t = tt(d); f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5) + .25 * hp(noise(d), 3000) * np.exp(-t * 180)
    return x * g

def clap():
    d = .35; t = tt(d); n = bp(noise(d), 900, 3500)
    e = np.exp(-t * 16) + sum(np.where((t > o) & (t < o + .012), np.exp(-(t - o) * 300), 0) for o in (0, .012, .024))
    return n * e * .6

def hat(open_=False):
    d = .18 if open_ else .05; t = tt(d)
    return hp(noise(d), 7000) * np.exp(-t * (22 if open_ else 90)) * .35

def epiano(m, d=1.2, vel=1.0):
    t = tt(d); f = midi(m)
    idx = 1.6 * np.exp(-t * 5)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t * 2.2)
    x += .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4)
    return x * adsr(d, .004, .08) * vel

def felt(m, d=2.2, vel=1.0):
    t = tt(d); f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * t + k) for k, a in ((1, 1), (2, .35), (3, .12), (4, .05)))
    x = lp(x * np.exp(-t * 1.6), 2400)
    return x * adsr(d, .012, .2) * vel

def pad(ms, d, cutoff=1500):
    t = tt(d); x = np.zeros_like(t)
    for m in ms:
        for det in (-.08, .0, .07):
            f = midi(m) * 2 ** (det / 12)
            x += signal.sawtooth(2 * np.pi * f * t + rng.random() * 6)
    x = lp(x / (len(ms) * 3), cutoff, 2)
    return x * adsr(d, .35, .5)

def bass(m, d):
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + .3 * lp(signal.sawtooth(2 * np.pi * f * t), 500)
    return x * adsr(d, .005, .04) * np.exp(-t * 1.5)

def bell(m, d=1.4, vel=1.0):
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t))
    return x * np.exp(-t * 3.2) * adsr(d, .002, .1) * vel

# ───────── music: money-chord pop house, 120 BPM, C major ─────────
# Canon-style "money chord" progression with a descending bass line, two chords per bar:
#   C(add9) – G/B – Am7 – Em7/G | Fmaj7 – C/E – Dm7 – G
BPM = 120
STEP = 60 / BPM / 4          # 16th note = .125 s
BAR = STEP * 16              # 2 s
SWING = .018                 # push off-beat 16ths late for a modern shuffle
MC = data.get("music", {})
DROP = MC.get("drop", 7.0)
SEC_B = MC.get("dense", 23.0)            # groove A → groove B
BREAK_A, BREAK_B = MC.get("breakA", 39.0), MC.get("breakB", 47.0)
BUILD_END = MC.get("buildEnd", 51.4)
CTA = MC.get("cta", 51.9)
END = data["dur"] - 1.1

def sat(x, k=2.0): return np.tanh(x * k) / np.tanh(k)
def sw(s): return s * STEP + (SWING if s % 2 else 0)

def kick_tight(g=1.0):
    d = .3; t = tt(d); f = 52 + 160 * np.exp(-t * 50)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
    click = hp(noise(d), 3500) * np.exp(-t * 700) * .3
    return sat(body * 1.25 + click, 1.5) * g

def clap_snap(g=1.0):
    d = .3; t = tt(d)
    burst = sum(np.where((t >= o) & (t < o + .01), 1.0, 0) * np.exp(-(t - o) * 300) for o in (0, .009, .018))
    clap = bp(noise(d), 1100, 5200) * (burst + .7 * np.exp(-t * 22))
    snap = bp(noise(d), 2500, 9000) * np.exp(-t * 70) * .6
    return (clap * .8 + snap) * g

HAT_F = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]
def hat(open_=False, g=1.0):
    d = .2 if open_ else .04; t = tt(d)
    x = sum(signal.square(2 * np.pi * f * 1.9 * t) for f in HAT_F)
    return hp(bp(x, 7000, 16000), 8000) * np.exp(-t * (18 if open_ else 110)) * .15 * g

def shaker(g=1.0):
    d = .05; t = tt(d); e = (1 - np.exp(-t * 400)) * np.exp(-t * 90)
    return hp(noise(d), 6000) * e * .12 * g

def rim(g=1.0):
    d = .06; t = tt(d)
    return (np.sin(2 * np.pi * 1700 * t) * .5 + bp(noise(d), 1500, 5000)) * np.exp(-t * 90) * .35 * g

def bass(m, d, g=1.0):
    t = tt(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
    return sat(x, 1.4) * adsr(d, .003, .03) * g

def keys(ms, d, vel=1.0):  # FM e-piano chord stab
    return sum(epiano(m, d, vel) for m in ms) / len(ms)

def pluck(m, d=.6, vel=1.0):
    t = tt(d); f = midi(m); x = np.zeros_like(t)
    for k in range(1, 9):
        x += (1 / k ** 1.3) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (5 + k * 4))
    return x * adsr(d, .002, .08) * vel * .8

def warm_pad(ms, d, cutoff=1500):
    t = tt(d); L = np.zeros_like(t); R = np.zeros_like(t)
    for m in ms:
        for i, det in enumerate((-.07, .07)):
            v = signal.sawtooth(2 * np.pi * midi(m) * 2 ** (det / 12) * t + rng.random() * 6)
            (L if i == 0 else R)[:] += v
    e = adsr(d, .08, .25)
    return lp(L / len(ms), cutoff) * e, lp(R / len(ms), cutoff) * e

def sub_drop(d=1.4):
    t = tt(d); f = 32 + 60 * np.exp(-t * 3.5)
    return sat(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.8), 1.3)

def air_hit(d=1.0):
    t = tt(d); return hp(noise(d), 7000) * np.exp(-t * 5) * .35

def reverse_swell(d=.9):
    t = tt(d); x = hp(noise(d), 1500) * (t / d) ** 3 * .5
    x[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))
    return lp(x, 9000)

class Stereo:
    def __init__(self): self.L = np.zeros(N + SR * 4); self.R = np.zeros(N + SR * 4)
    def add(self, t, l, r=None, g=1.0):
        r = l if r is None else r; i = int(t * SR); n = len(l)
        self.L[i:i + n] += l * g; self.R[i:i + n] += r * g

drums, synths, low, dly = Bus(), Stereo(), Bus(), Bus()
sidechain = np.ones(N + SR * 4)
def duck(t0, depth=.6, rel=.3):
    i = int(t0 * SR); n = int(rel * SR)
    sidechain[i:i + n] = np.minimum(sidechain[i:i + n], 1 - depth * (1 - np.linspace(0, 1, n)) ** 2)

# (bass note, chord voicing) — two per bar
PROG = [
    (36, [60, 64, 67, 74]),  # C(add9)
    (35, [59, 62, 67, 74]),  # G/B
    (33, [57, 60, 64, 67]),  # Am7
    (31, [55, 59, 62, 67]),  # Em7/G
    (29, [57, 60, 64, 65]),  # Fmaj7
    (28, [55, 60, 64, 67]),  # C/E
    (26, [57, 60, 62, 65]),  # Dm7
    (31, [55, 59, 62, 67]),  # G
]
STAB = [0, 3, 6]                         # per half-bar chord: on the beat, then two syncopated hits
BASS = [(0, 2, 0), (3, 1, 12), (6, 2, 0)]  # (step, length, octave offset) per half bar
# topline: a singable hook over the first bar of each two-bar phrase (step, midi)
HOOK = [(0, 76), (2, 79), (4, 81), (7, 79), (10, 76), (12, 74)]
HOOK_B = [(0, 79), (2, 81), (4, 84), (7, 83), (10, 81), (12, 79)]

def section(t):
    if t < DROP: return "intro"
    if t < SEC_B: return "A"
    if t < BREAK_A: return "B"
    if t < BREAK_B: return "break"
    if t < BUILD_END: return "build"
    return "outro"

# intro: felt piano phrases over a soft pad, rising into a breath of silence
INTRO = MC.get("intro", [(.35, 69, .7), (1.75, 72, .6), (2.3, 76, .5), (3.45, 74, .65), (4.2, 71, .45), (5.35, 69, .7), (5.37, 57, .5), (5.4, 64, .45)])
for t0, m, v in INTRO:
    music.add(t0, felt(m, 2.4, v), .45, pan=(m - 66) / 30); verb_send.add(t0, felt(m, 2.4, v), .3)
l, r = warm_pad([45, 52, 57, 60, 64], DROP, 700); synths.add(0, l, r, .18)
music.add(DROP - .9, reverse_swell(.9), .5)

def impact(t0, g=1.0):
    low.add(t0, sub_drop(), .8 * g)
    drums.add(t0, kick_tight(1.1), .9 * g)
    x = air_hit(); synths.add(t0, x, np.roll(x, 120), .5 * g); verb_send.add(t0, air_hit(), .2 * g)
impact(DROP)

bar_t, bi = DROP, 0
while bar_t < BUILD_END - 1e-6:
    sec = section(bar_t)
    d = min(BAR, BUILD_END - bar_t)
    nsteps = int(round(d / STEP))
    # drums
    for s in range(nsteps):
        ts = bar_t + sw(s)
        if sec in ("A", "B"):
            if s % 4 == 0:
                drums.add(ts, kick_tight(), .9); duck(ts, .6)
            if s in (4, 12):
                drums.add(ts, clap_snap(), .5); verb_send.add(ts, clap_snap(), .18)
            if s % 4 == 2:
                drums.add(ts, hat(open_=(sec == "B")), .5, pan=.2)
            if sec == "B":
                drums.add(ts, shaker(.6 + .4 * (s % 2 == 0)), .6, pan=-.25)
                if s in (3, 11): drums.add(ts, rim(), .35, pan=.3)
        elif sec == "break":
            if s == 0: drums.add(ts, kick_tight(.7), .55); duck(ts, .3)
            if s == 12: drums.add(ts, clap_snap(.6), .25); verb_send.add(ts, clap_snap(.6), .4)
        elif sec == "build":
            prog = (ts - BREAK_B) / max(.01, BUILD_END - BREAK_B)
            if s % 4 == 0: drums.add(ts, kick_tight(.9), .85); duck(ts, .55)
            if s in (4, 12): drums.add(ts, clap_snap(), .45); verb_send.add(ts, clap_snap(), .2)
            if s % 2 == 0: drums.add(ts, hat(), .35 + .25 * prog, pan=.2)
    # harmony: two chords per bar
    for half in range(2):
        hs = half * 8
        if hs >= nsteps: break
        root, tones = PROG[(bi * 2 + half) % len(PROG)]
        th = bar_t + hs * STEP
        hd = min(8, nsteps - hs) * STEP
        if sec in ("A", "B", "build"):
            for s, ln, octv in BASS:
                if hs + s < nsteps:
                    low.add(bar_t + sw(hs + s), bass(root + octv, ln * STEP * .9), .5 if octv == 0 else .32)
            for s in STAB:
                if hs + s < nsteps:
                    x = keys(tones, .32, 1.0 if s == 0 else .75)
                    music.add(bar_t + sw(hs + s), x, .45 if sec != "build" else .38, pan=-.1)
                    verb_send.add(bar_t + sw(hs + s), x, .1)
        elif sec == "break":
            low.add(th, bass(root, hd), .35)
            x = keys(tones, hd, .7); music.add(th, x, .35); verb_send.add(th, x, .25)
        cut = {"A": 1300, "B": 1800, "break": 900}.get(sec, 900 + 2600 * min(1, (bar_t + d - BREAK_B) / max(.01, BUILD_END - BREAK_B)))
        l, r = warm_pad(tones, hd + .1, cut); synths.add(th, l, r, .16)
    # topline hook on the first bar of each two-bar phrase
    if sec in ("A", "B", "break") and bi % 2 == 0:
        hook = HOOK_B if sec == "B" and bi % 4 == 2 else HOOK
        for s, m in hook:
            if s < nsteps:
                x = pluck(m, .7, .85 if sec != "break" else .55)
                music.add(bar_t + sw(s), x, .26, pan=.15); dly.add(bar_t + sw(s), x, .45); verb_send.add(bar_t + sw(s), x, .12)
    bar_t += BAR; bi += 1

# breath, then the final hit resolving to C
music.add(BUILD_END - .9, reverse_swell(.9), .5)
impact(CTA, .85)
l, r = warm_pad([60, 64, 67, 71, 74], END - CTA + 1.2, 2000)
fade = np.exp(-tt(len(l) / SR) * .45); synths.add(CTA, l * fade, r * fade, .3)
x = keys([60, 64, 67, 71, 74], 3.5, .9); music.add(CTA, x, .4); verb_send.add(CTA, x, .35)
x = bass(36, 5.0) * np.exp(-tt(5.0) * 1.1); low.add(CTA, x, .5)
for s, m in [(0, 76), (2, 79), (4, 84), (8, 83), (12, 84)]:
    x = pluck(m, 1.0, .75); music.add(CTA + .5 + s * STEP, x, .26); dly.add(CTA + .5 + s * STEP, x, .45)
for kq in range(3):
    tb = CTA + 2 + kq * 1.0
    if tb < END - .5: drums.add(tb, kick_tight(.5), .45 * (1 - kq / 4)); duck(tb, .3)

# ping-pong dotted-eighth delay
D = int(STEP * 3 * SR); src = lp(dly.L + dly.R, 5000) * .5
for k in range(1, 7):
    g = .38 ** k; seg = src[:len(src) - k * D] * g
    (synths.L if k % 2 else synths.R)[k * D:] += seg

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

bell_cycle = [84, 88, 91, 96]
bc = 0
for c in data["cues"]:
    t0, ty = c["t"], c["type"]
    pan = (rng.random() - .5) * .4
    if ty == "key": sfx.add(t0, keyclick(), .35, pan)
    elif ty == "enter": sfx.add(t0, keyclick(), .6); sfx.add(t0, thump(140, 70, .15, 30), .35)
    elif ty == "tick": sfx.add(t0, tick(), .3, pan); verb_send.add(t0, tick(), .1)
    elif ty == "tick-soft": sfx.add(t0, tick(2600, .04), .12, pan)
    elif ty == "marker": sfx.add(t0, sweep_noise(.45, 2500, 5000, .6) * adsr(.45, .05, .12), .35, .2)
    elif ty in ("whoosh", "swoosh-in", "slide", "swish-soft", "zoom", "whoosh-rev"):
        d = {"whoosh": .55, "swoosh-in": .45, "slide": .35, "swish-soft": .6, "zoom": .7, "whoosh-rev": .45}[ty]
        g = {"whoosh": .4, "swoosh-in": .3, "slide": .18, "swish-soft": .2, "zoom": .4, "whoosh-rev": .3}[ty]
        x = whoosh(d, 400, 4000 if ty != "whoosh-rev" else 800, .7 if ty != "whoosh-rev" else .2)
        sfx.add(t0 - d * .5, x, g, pan); verb_send.add(t0 - d * .5, x, g * .3)
    elif ty in ("whoosh-big", "wipe"):
        x = whoosh(.9, 200, 5000, .55); sfx.add(t0 - .45, x, .55); verb_send.add(t0 - .45, x, .2)
    elif ty == "hit-soft": sfx.add(t0, thump(80, 45, .9, 5), .5); verb_send.add(t0, thump(80, 45, .9, 5), .2)
    elif ty in ("riser", "riser-short"):
        d = .95 if ty == "riser" else .72
        t = tt(d); e = (t / d) ** 2.2
        x = sweep_noise(d, 300, 7000, .8) * e + .25 * np.sin(2 * np.pi * np.cumsum(180 + 700 * (t / d) ** 2) / SR) * e
        x[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
        sfx.add(t0, x, .5); verb_send.add(t0, x, .25)
    elif ty in ("stamp", "stamp-final"):
        g = 1.0 if ty == "stamp" else .85
        x = thump(110, 38, 1.2, 4.2) * 1.1
        x[:int(.25 * SR)] += lp(noise(.25), 1800) * env_exp(.25, 22) * .8
        x[:int(.06 * SR)] += hp(noise(.06), 2500) * env_exp(.06, 80) * .5
        sfx.add(t0, x, g); verb_send.add(t0, x, .45 * g)
        sfx.add(t0 + .02, paper(.12, 900), .4 * g)
    elif ty == "letter": sfx.add(t0, thump(150, 70, .18, 22), .4); sfx.add(t0, paper(.04, 3000), .2)
    elif ty == "pop": sfx.add(t0, pop(), .28, pan)
    elif ty == "pop-soft": sfx.add(t0, pop(500, 1100), .14, pan)
    elif ty == "card": sfx.add(t0, paper(.07, 1800 + rng.random() * 2000), .3, (rng.random() - .5) * 1.2)
    elif ty == "gather":
        d = .7; x = sweep_noise(d, 5000, 600, .8) * np.linspace(0, 1, int(d * SR)) ** 2; sfx.add(t0, x, .3)
    elif ty == "thump": sfx.add(t0, thump(100, 50, .5, 9), .6); verb_send.add(t0, thump(100, 50, .5, 9), .15)
    elif ty == "click": sfx.add(t0, tick(3200, .02), .35); sfx.add(t0 + .05, tick(2600, .02), .2)
    elif ty == "correct":
        for i, m in enumerate((84, 91)): x = bell(m, 1.2, .8); sfx.add(t0 + i * .085, x, .22); verb_send.add(t0 + i * .085, x, .15)
    elif ty == "wrong":
        for i, m in enumerate((55, 51)):
            t = tt(.22); x = lp(signal.square(2 * np.pi * midi(m) * t), 900) * np.exp(-t * 12)
            sfx.add(t0 + i * .11, x, .16)
    elif ty in ("ding", "ding-soft"):
        m = bell_cycle[bc % 4]; bc += 1; x = bell(m, 1.3, 1)
        sfx.add(t0, x, .2 if ty == "ding" else .11, pan); verb_send.add(t0, x, .12)
    elif ty == "chime":
        for i, m in enumerate((84, 88, 91, 96)): x = bell(m, 1.5, .8); sfx.add(t0 + i * .07, x, .16, (i - 1.5) / 4); verb_send.add(t0 + i * .07, x, .15)
    elif ty == "count":
        for k in range(12):
            tk = t0 + 1.2 * (1 - (1 - (k + 1) / 12) ** (1 / 3)) * .98
            sfx.add(tk, tick(1500 + k * 90, .04), .16)

# ───────── mix ─────────
sc = sidechain
L = music.L * sc + synths.L * sc + low.L * (.45 + .55 * sc) + drums.L
R = music.R * sc + synths.R * sc + low.R * (.45 + .55 * sc) + drums.R
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
mixL = sat(L, 1.1) * .9 + sfx.L * .9 + vL * .5
mixR = sat(R, 1.1) * .9 + sfx.R * .9 + vR * .5
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
