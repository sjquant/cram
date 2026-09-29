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

# ───────── music: programmed beat, 120 BPM, A minor (Am – F – C – G) ─────────
BPM = 120
STEP = 60 / BPM / 4          # 16th note = .125 s
BAR = STEP * 16              # 2 s
MC = data.get("music", {})
DROP = MC.get("drop", 7.0)
SEC_B = MC.get("dense", 23.0)            # groove A → groove B
BREAK_A, BREAK_B = MC.get("breakA", 39.0), MC.get("breakB", 47.0)
BUILD_END = MC.get("buildEnd", 51.4)
CTA = MC.get("cta", 51.9)
END = data["dur"] - 1.1

def sat(x, k=2.0): return np.tanh(x * k) / np.tanh(k)

def kick808(g=1.0, tail=.55):
    t = tt(tail); f = 48 + 190 * np.exp(-t * 38) + 30 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    click = hp(noise(tail), 2500) * np.exp(-t * 400) * .5
    return sat(body * 1.4 + click, 2.2) * g

def snare(g=1.0):
    d = .32; t = tt(d)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * .7 + np.sin(2 * np.pi * 330 * t) * np.exp(-t * 40) * .3
    nz = bp(noise(d), 1400, 9000) * np.exp(-t * 14)
    cl = bp(noise(d), 900, 3000) * sum(np.where((t >= o) & (t < o + .01), 1, 0) * np.exp(-(t - o) * 250) for o in (0, .011, .022)) * .8
    return sat(body + nz * .9 + cl, 1.6) * g

HAT_F = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]
def hat808(open_=False, g=1.0):
    d = .32 if open_ else .06; t = tt(d)
    x = sum(signal.square(2 * np.pi * f * 1.9 * t) for f in HAT_F)
    x = hp(bp(x, 6000, 16000), 7000) * np.exp(-t * (11 if open_ else 70))
    return x * .22 * g

def crash(d=2.2):
    t = tt(d); x = sum(signal.square(2 * np.pi * f * 3.1 * t + i) for i, f in enumerate(HAT_F))
    return (hp(x, 5000) * .15 + hp(noise(d), 6000) * .5) * np.exp(-t * 2.2)

def bass808(m, d, glide_from=None):
    t = tt(d); f1 = midi(m)
    f = f1 if glide_from is None else f1 + (midi(glide_from) - f1) * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(np.ones_like(t) * f) / SR)
    x = sat(x * 1.8, 1.8) * np.exp(-t * .9) * adsr(d, .003, .04)
    return x

def pluck(m, d=.45, vel=1.0, bright=1.0):
    t = tt(d); f = midi(m); x = np.zeros_like(t)
    for k in range(1, 14):
        if f * k > 16000: break
        x += (1 / k) * np.sin(2 * np.pi * f * k * t + (k % 2) * .3) * np.exp(-t * (6 + k * 3.2 / bright))
    return x * adsr(d, .002, .05) * vel * .7

def supersaw(ms, d, cutoff=4200):
    t = tt(d); L = np.zeros_like(t); R = np.zeros_like(t)
    dets = [-.18, -.11, -.05, 0, .05, .11, .18]
    for m in ms:
        for i, det in enumerate(dets):
            v = signal.sawtooth(2 * np.pi * midi(m) * 2 ** (det / 12) * t + rng.random() * 6)
            if i % 2: L += v
            else: R += v
    n = len(ms) * len(dets) / 2
    e = adsr(d, .004, .06) * np.exp(-t * 3.5)
    return lp(L / n, cutoff) * e, lp(R / n, cutoff) * e

def swell_pad(ms, d, cutoff=900):
    return pad(ms, d, cutoff)

def sub_drop(d=1.6):
    t = tt(d); f = 30 + 70 * np.exp(-t * 3)
    return sat(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2), 1.5)

def tape_riser(d):
    t = tt(d); p = t / d
    w = noise(d); n = (hp(w, 600) * (1 - p) + hp(w, 4500) * p) * p ** 2.5 * .6
    s = signal.sawtooth(2 * np.pi * np.cumsum(110 * 2 ** (p * 3)) / SR) * p ** 3 * .15
    return lp(n + s, 12000)

class Stereo:
    def __init__(self): self.L = np.zeros(N + SR * 4); self.R = np.zeros(N + SR * 4)
    def add(self, t, l, r=None, g=1.0):
        r = l if r is None else r; i = int(t * SR); n = len(l)
        self.L[i:i + n] += l * g; self.R[i:i + n] += r * g

drums, synths, low = Bus(), Stereo(), Bus()
sidechain = np.ones(N + SR * 4)
def duck(t0, depth=.7, rel=.28):
    i = int(t0 * SR); n = int(rel * SR)
    sidechain[i:i + n] = np.minimum(sidechain[i:i + n], 1 - depth * (1 - np.linspace(0, 1, n)) ** 2)

PROG = [(45, [57, 60, 64]), (41, [57, 60, 65]), (36, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G
# hook: 16 steps per bar, values index chord tones (+3 = octave root), None = rest
HOOK_A = [0, None, 2, None, 3, None, 2, 1, None, 2, None, 3, 4, None, 3, None]
HOOK_B = [3, None, 4, 3, None, 2, None, 3, 1, None, 2, None, 0, None, 2, 3]
def tone(tones, k):
    return tones[k % 3] + 12 * (k // 3) + 12

# drum patterns (1 = hit, value = velocity)
K_A = [1, 0, 0, 0, 0, 0, 0, .8, 0, 0, 1, 0, 0, 0, 0, 0]
K_B = [1, 0, 0, .7, 0, 0, 0, .8, 0, 0, 1, 0, 0, .6, 0, 0]
S_ = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, .25, 1, 0, 0, .2]
H_A = [.9, .35, .6, .35] * 4
BASS_RHYTHM = [(0, 7), (7, 3), (10, 6)]  # (step, length in steps)

def section(t):
    if t < DROP: return "intro"
    if t < SEC_B: return "A"
    if t < BREAK_A: return "B"
    if t < BREAK_B: return "break"
    if t < BUILD_END: return "build"
    return "outro"

# intro: ticking clock + felt piano motif + dark pad swelling into the drop
INTRO = MC.get("intro", [(.35, 69, .7), (1.75, 72, .6), (2.3, 76, .5), (3.45, 74, .65), (4.2, 71, .45), (5.35, 69, .7), (5.37, 57, .5), (5.4, 64, .45)])
for t0, m, v in INTRO:
    music.add(t0, felt(m, 2.4, v), .45, pan=(m - 66) / 30); verb_send.add(t0, felt(m, 2.4, v), .3)
k = 0; tq = DROP - 4 * .5 * int(DROP / .5 / 4 + 1)
while tq < DROP - .3:
    if tq >= 0:
        f = 2400 if k % 2 == 0 else 1800
        d = .05; t = tt(d); x = np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + .4 * hp(noise(d), 5000) * np.exp(-t * 400)
        drums.add(tq, x, .16 + .12 * (tq / DROP), pan=.25 if k % 2 else -.25)
    tq += .5; k += 1
music.add(0, pad([45, 52, 57, 60], DROP, 600), .12)
music.add(DROP - 2.5, tape_riser(2.35), .35); verb_send.add(DROP - 2.5, tape_riser(2.35), .15)

def impact(t0, g=1.0):
    low.add(t0, sub_drop(), .9 * g)
    drums.add(t0, kick808(1.0, .8), 1.0 * g)
    x = crash(); synths.add(t0, x, np.roll(x, 90), .55 * g); verb_send.add(t0, crash(), .25 * g)
impact(DROP)

bar_t, bi, prev_root = DROP, 0, None
while bar_t < BUILD_END - 1e-6:
    root, tones = PROG[bi % 4]
    sec = section(bar_t)
    d = min(BAR, BUILD_END - bar_t)
    nsteps = int(round(d / STEP))
    for s in range(nsteps):
        ts = bar_t + s * STEP
        if sec in ("A", "B"):
            kp = K_B if sec == "B" else K_A
            if kp[s]: drums.add(ts, kick808(kp[s]), .95); duck(ts, .7 * kp[s])
            if S_[s]: drums.add(ts, snare(S_[s]), .55); verb_send.add(ts, snare(S_[s]), .12 * S_[s])
            hv = H_A[s]
            roll = sec == "B" and (bi % 4 == 3) and s >= 12
            if roll:
                for r in range(3): drums.add(ts + r * STEP / 3, hat808(g=.5 + .2 * r), .6, pan=.2)
            else:
                drums.add(ts, hat808(g=hv), .55, pan=.2 if s % 2 else -.1)
            if s == 14 and bi % 2 == 1: drums.add(ts, hat808(True, .8), .45, pan=-.3)
        elif sec == "break":
            if s == 0: drums.add(ts, kick808(.8, .9), .7); duck(ts, .4)
            if s == 8: drums.add(ts, snare(.6), .3); verb_send.add(ts, snare(.6), .35)
            if s % 4 == 2: drums.add(ts, hat808(g=.5), .3, pan=.3)
        elif sec == "build":
            prog = (ts - BREAK_B) / max(.01, BUILD_END - BREAK_B)
            if s % 4 == 0: drums.add(ts, kick808(.9), .8); duck(ts, .5)
            div = 1 if prog < .5 else 2
            for r in range(div):
                drums.add(ts + r * STEP / div, snare(.35 + .6 * prog), .22 + .35 * prog)
            drums.add(ts, hat808(g=.6), .4, pan=.2)
    # 808 bass
    if sec in ("A", "B", "build"):
        for st_, ln in BASS_RHYTHM:
            if st_ < nsteps:
                m = root - 12 + (12 if (sec == "B" and st_ == 10) else 0)
                low.add(bar_t + st_ * STEP, bass808(m, min(ln, nsteps - st_) * STEP, prev_root), .75)
                prev_root = m
    elif sec == "break":
        low.add(bar_t, bass808(root - 12, d, prev_root), .6); prev_root = root - 12
    # supersaw off-beat stabs (A/B), sustained filtered chord in break/build
    if sec in ("A", "B"):
        for s in (2, 6, 10, 14):
            if s < nsteps:
                l, r = supersaw(tones, .2, 3800 if sec == "A" else 5200)
                synths.add(bar_t + s * STEP, l, r, .32)
    else:
        cut = 900 if sec == "break" else 900 + 5000 * min(1, (bar_t + d - BREAK_B) / max(.01, BUILD_END - BREAK_B))
        l, r = supersaw(tones, d + .2, cut)
        synths.add(bar_t, l, r, .22)
    music.add(bar_t, pad(tones, d + .3, 1400), .08)
    # hook
    if sec in ("A", "B", "break"):
        hk = HOOK_A if (sec == "A" or bi % 2 == 0) else HOOK_B
        for s, k_ in enumerate(hk[:nsteps]):
            if k_ is None: continue
            m = tone(tones, k_) + (12 if sec == "B" and bi % 4 >= 2 else 0)
            x = pluck(m, .5, 1.0 if s % 4 == 0 else .75, 1.0 if sec != "break" else .45)
            music.add(bar_t + s * STEP, x, .34 if sec != "break" else .2, pan=((s % 3) - 1) * .25)
            verb_send.add(bar_t + s * STEP, x, .16)
            if sec == "B":  # octave-down double for weight
                music.add(bar_t + s * STEP, pluck(m - 12, .4, .6), .16)
    bar_t += BAR; bi += 1

# silence gap + riser into the final hit
music.add(BUILD_END - 1.8, tape_riser(1.75), .4); verb_send.add(BUILD_END - 1.8, tape_riser(1.75), .2)
impact(CTA, .9)
l, r = supersaw([57, 60, 64, 69], END - CTA + 1.0, 3000)
synths.add(CTA, l * np.exp(-tt(len(l) / SR) * .5), r * np.exp(-tt(len(r) / SR) * .5), .3)
low.add(CTA, bass808(33, 3.5), .7)
for i, s in enumerate([0, 2, 4, 7, 10, 12]):
    m = tone([57, 60, 64], HOOK_A[[0, 2, 4, 7, 11, 12][i]] or 0)
    x = pluck(m + 12, .9, .8); music.add(CTA + .5 + s * STEP, x, .26); verb_send.add(CTA + .5 + s * STEP, x, .3)
for kq in range(4):
    tb = CTA + 2 + kq * 1.0
    if tb < END - .5:
        drums.add(tb, kick808(.55), .5 * (1 - kq / 5)); duck(tb, .35)

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
mixL = sat(L, 1.3) * .9 + sfx.L * .9 + vL * .5
mixR = sat(R, 1.3) * .9 + sfx.R * .9 + vR * .5
mix = np.stack([mixL, mixR], 1)[:N]
mix = hp(mix.T, 28).T
# fade out
fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
# loudness-ish normalize & soft limit
rms = np.sqrt((mix ** 2).mean()); mix *= 10 ** (-17.3 / 20) / rms
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
mix *= .93 / np.abs(mix).max()
wavfile.write(out_path, SR, (mix * 32767).astype(np.int16))
print("wrote", out_path, mix.shape[0] / SR, "s")
