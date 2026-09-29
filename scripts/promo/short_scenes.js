// ═══════════════ Vertical short (1080×1920) — scenes ═══════════════
const SS = {
  en: {
    h1: "You read it.", h2: "But can you", h3: "**explain** **it?**",
    tag1: "Turn **anything**", tag2: "into a quiz.",
    c1: "Drop in your notes.", c2: "**One** **prompt.**",
    d1: "A full deck,", d2: "**written** **for** **you.**",
    rrg: ["Recall.", "Reveal.", "Grade."],
    mc1: "Multiple choice.", mc2: "**Fill-in-the-blank.**",
    f1: "Skip what you know.", f2: "Drill what you **missed.**",
    g1: "One HTML file.", g2: "**Study** **anywhere.**",
    badges: ["Works offline", "No sign-up", "No install"],
    foot: "Free &amp; open source · MIT",
  },
  ko: {
    h1: "분명 읽었는데", h2: "설명하려니", h3: "**기억이** **안** **나요?**",
    tag1: "**무엇이든**", tag2: "퀴즈로 바꿔보세요",
    c1: "자료만 주고", c2: "**한** **줄로** 요청",
    d1: "문제는", d2: "**알아서** **만들어져요**",
    rrg: ["떠올리고", "확인하고", "채점하고"],
    mc1: "객관식도", mc2: "**빈칸** **채우기도**",
    f1: "아는 건 넘기고", f2: "**틀린** **것만** 다시",
    g1: "HTML 파일 하나로", g2: "**어디서든** 복습",
    badges: ["인터넷 없이", "회원가입 없이", "설치 없이"],
    foot: "무료 오픈소스 · MIT 라이선스",
  },
};
const U = SS[LANG];
const KO = LANG === "ko";
const CAP = KO ? 100 : 100;
const IMPACT = 3.0, CTA = 24.0;
const CX = 540;
window.MUSIC = {
  intro: [[0.1, 69, .7], [0.75, 72, .6], [1.3, 76, .6], [1.33, 64, .45], [1.36, 57, .4]],
  drop: IMPACT, liftEnd: 5.3, dense: 11, breakA: 20.5, breakB: 22.5, buildEnd: 23.5, cta: CTA,
};
// big centered headline: returns {el, ws}
function headline(parent, txt, size, weight) {
  const d = h("div", "h1 ctr", parent);
  css(d, { fontSize: size + "px", whiteSpace: "nowrap", textAlign: "center" });
  if (weight) d.style.fontWeight = weight;
  if (KO) d.style.fontWeight = 700;
  return { el: d, ws: words(d, txt) };
}

// ── A — hook (0 → 3.05)
scene(0, 3.05, el => {
  const S = KO ? 132 : 150;
  const l1 = headline(el, U.h1, S), l2 = headline(el, U.h2, S), l3 = headline(el, U.h3, S, 700);
  const shadow = h("div", "ctr", el); css(shadow, { width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(10,12,16,.55) 0%, rgba(10,12,16,.25) 40%, transparent 70%)" });
  cue(.1, "tick"); cue(.75, "tick"); cue(1.3, "hit-soft"); cue(2.05, "riser");
  return t => {
    revealWords(l1.ws, t, .1, .07, .6); revealWords(l2.ws, t, .75, .07, .6); revealWords(l3.ws, t, 1.3, .08, .65);
    const ant = A(t, 2.2, .8, 0, 1, E.inC), gone = t > 2.97 ? 0 : 1;
    [l1, l2, l3].forEach((l, i) => st(l.el, { x: CX, y: 720 + i * (KO ? 168 : 200) - ant * 20 * (1 - i), s: 1 - ant * .05, o: gone * (i < 2 ? lerp(1, .35, A(t, 1.3, .4, 0, 1)) : 1) }));
    st(shadow, { x: CX, y: 900, s: lerp(2.4, .7, E.inC(P(t, 2.2, 3.0))), o: A(t, 2.2, .8, 0, .55, E.inC) });
  };
});

// ── B — stamp & brand (2.45 → 5.9)
scene(2.45, 5.9, el => {
  const specks = [];
  for (let i = 0; i < 26; i++) {
    const d = h("div", "abs", el); const s = 7 + rnd() * 18;
    css(d, { width: s + "px", height: s * (0.7 + rnd() * .6) + "px", borderRadius: "50%", background: "#e0231b" });
    specks.push({ d, a: rnd() * Math.PI * 2, r: 230 + rnd() * 190, s });
  }
  const ring = h("div", "ctr", el); css(ring, { width: "360px", height: "360px", borderRadius: "50%", border: "6px solid #e0231b" });
  const seal = h("div", "seal ctr", el, SEAL_SVG()); css(seal, { width: "360px", height: "360px" });
  const word = h("div", "ctr", el); css(word, { fontFamily: "\"Inter Tight\", sans-serif", letterSpacing: "-.06em", fontSize: "230px", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 1' });
  const letters = [...T.wordmark].map(ch => { const s = h("span", "", word); s.textContent = ch; s.style.display = "inline-block"; return s; });
  const tg1 = headline(el, U.tag1, KO ? 104 : 110, 600), tg2 = headline(el, U.tag2, KO ? 104 : 110, 600);
  const squig = h("div", "abs", el); squig.innerHTML = `<svg width="420" height="60" viewBox="0 0 420 60" preserveAspectRatio="none"><path d="M8 38 C60 20 90 50 140 32 S220 18 260 34 S350 46 412 22" fill="none" stroke="#ffd400" stroke-width="12" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`;
  const sqp = squig.querySelector("path");
  cue(IMPACT, "stamp"); [0, 1, 2, 3].forEach(i => cue(3.45 + i * .07, "letter")); cue(3.9, "swish-soft"); cue(4.45, "marker"); cue(5.35, "whoosh-big");
  return t => {
    const d = P(t, 2.45, IMPACT), hit = t >= IMPACT;
    const sq = hit ? Math.exp(-(t - IMPACT) * 9) * Math.cos((t - IMPACT) * 38) : 0;
    const mv = A(t, 3.3, .6, 0, 1, E.ioQ);
    const ex = A(t, 5.3, .6, 0, 1, E.ioQ) * -1920;
    const sy = lerp(900, 560, mv), ss = lerp(1, .78, mv);
    st(seal, { x: CX, y: sy + ex, s: hit ? ss * (1 + sq * .06) : lerp(2.8, 1, E.inC(d)), sy: hit ? ss * (1 - sq * .06) : undefined, r: hit ? 0 : (1 - d) * -8, o: hit ? 1 : E.outC(P(t, 2.45, 2.75)), blur: hit ? 0 : (1 - d) * 14 });
    const rp = P(t, IMPACT, IMPACT + .6);
    st(ring, { x: CX, y: 900 + ex, s: .9 + E.outE(rp) * 1.5, o: hit ? (1 - rp) * .7 : 0 }); ring.style.borderWidth = (6 * (1 - rp) + 1) + "px";
    for (const s of specks) { const p = E.outE(P(t, IMPACT, IMPACT + .45)); st(s.d, { x: CX + Math.cos(s.a) * s.r * p - s.s / 2, y: 900 + Math.sin(s.a) * s.r * p + ex, s: hit ? 1 : 0, o: hit ? 1 - A(t, 3.6, .4, 0, 1) : 0 }); }
    st(word, { x: CX, y: 870 + ex, o: 1 });
    letters.forEach((l, i) => { const tt = 3.45 + i * .07; const p = P(t, tt, tt + .35); l.style.transform = `scale(${lerp(1.7, 1, E.outE(p))})`; l.style.opacity = E.outC(P(t, tt, tt + .12)); l.style.filter = p < 1 ? `blur(${(1 - E.outE(p)) * 8}px)` : "none"; });
    revealWords(tg1.ws, t, 3.9, .08, .7); revealWords(tg2.ws, t, 4.05, .08, .7);
    st(tg1.el, { x: CX, y: 1110 + ex }); st(tg2.el, { x: CX, y: 1270 + ex });
    const acc = tg1.ws.find(w => w.classList.contains("acc"));
    if (acc) { const r = acc.getBoundingClientRect(); css(squig, { left: (r.left - 8) + "px", top: (r.bottom - 26) + "px" }); squig.firstChild.setAttribute("width", r.width + 20); sqp.style.strokeDashoffset = 1 - A(t, 4.45, .5, 0, 1, E.ioC); squig.style.opacity = t > 4.4 ? 1 : 0; }
  };
});

// ── C — create (5.3 → 10.0)
scene(5.3, 10.0, el => {
  const enter = t => (1 - A(t, 5.3, .6, 0, 1, E.ioQ)) * 1920;
  const c1 = headline(el, U.c1, CAP), c2 = headline(el, U.c2, CAP);
  const notes = h("div", "ctr", el); css(notes, { width: "300px", height: "340px", background: "#ffffff", borderRadius: "12px", boxShadow: "0 22px 50px rgba(18,20,26,.18),0 0 0 1px rgba(18,20,26,.08)", padding: "26px 28px", backgroundImage: "repeating-linear-gradient(transparent 0 47px, #e6e8eb 47px 49px)", backgroundPosition: "0 58px" });
  notes.innerHTML = `<div style="font-family:var(--mono);font-size:18px;color:var(--ink-soft);margin-bottom:18px">${T.notes}</div>` + T.notesHand.map((l, i) => `<div style="font-family:var(--hand);font-size:34px;line-height:48px;color:#2b2a5a;${i === 2 ? "background:linear-gradient(transparent 45%, rgba(255,212,0,.8) 45%, rgba(255,212,0,.8) 88%, transparent 88%);display:inline-block" : ""}">${l}</div>`).join("");
  const pdf = h("div", "ctr", el); css(pdf, { width: "250px", height: "310px", background: "#ffffff", borderRadius: "12px", boxShadow: "0 22px 50px rgba(18,20,26,.18),0 0 0 1px rgba(18,20,26,.08)", padding: "28px 26px" });
  pdf.innerHTML = `<div style="display:inline-block;background:#e0231b;color:#fff;font-weight:800;font-size:18px;padding:5px 12px;border-radius:6px;letter-spacing:.08em">PDF</div><div style="font-family:var(--mono);font-size:18px;color:var(--ink-soft);margin:14px 0 20px">${T.pdf}</div>` + [92, 80, 88, 60, 84, 72, 90].map(w => `<div style="height:10px;border-radius:5px;background:#e4e6e9;margin:0 0 15px;width:${w}%"></div>`).join("");
  const link = h("div", "chip ctr", el, `${ICON.globe}<span style="font-family:var(--mono);font-size:26px;font-weight:500">${T.link}</span>`); link.style.boxShadow = "0 18px 40px rgba(18,20,26,.18),0 0 0 1px rgba(18,20,26,.08)";
  const term = h("div", "term ctr", el); css(term, { width: "960px", height: "520px" });
  term.innerHTML = `<div class="chrome"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="ttl">${T.termTitle}</div></div><div class="tbody" style="font-size:34px"></div>`;
  const tb = term.querySelector(".tbody");
  const pl = h("div", "", tb); pl.innerHTML = `<span style="color:#ff4d42">›</span> <span class="p1" style="color:#f6f6f4"></span><span class="p2" style="color:#b8bcc3"></span><span class="caret"></span>`;
  const p1 = pl.querySelector(".p1"), p2 = pl.querySelector(".p2"), caret = pl.querySelector(".caret");
  const outs = T.out.map((o, i) => { const d = h("div", "", tb); d.style.marginTop = i === 0 ? "22px" : "4px"; d.innerHTML = o.replace(/^✓/, '<span style="color:#86d4a0">✓</span>').replace("study.html", '<span style="color:#ff4d42">study.html</span>'); if (i === 0) d.style.color = "#8b8f97"; return d; });
  const spin = h("span", "", outs[0]);
  const glow = h("div", "ctr", el); css(glow, { width: "960px", height: "520px", borderRadius: "22px", boxShadow: "0 0 0 3px #ff4d42, 0 0 60px rgba(255,77,66,.5)" });
  const T1 = 6.25, cps = KO ? 28 : 32, T2 = T1 + T.prompt1.length / cps + .08, TE = T2 + T.prompt2.length / cps, ENTER = Math.max(TE + .15, 8.0);
  for (let i = 0; i < T.prompt1.length; i += 1) cue(T1 + i / cps, "key");
  for (let i = 0; i < T.prompt2.length; i += 1) cue(T2 + i / cps, "key");
  const OT = [ENTER + .25, ENTER + .6, ENTER + .9, ENTER + 1.2];
  cue(5.75, "pop"); cue(5.9, "pop"); cue(6.05, "pop"); cue(ENTER - .5, "swoosh-in"); cue(ENTER, "enter"); cue(OT[1], "ding-soft"); cue(OT[2], "ding-soft"); cue(OT[3], "ding");
  const srcs = [{ el: notes, x: 280, y: 800, r: -7, t: 5.7 }, { el: pdf, x: 800, y: 790, r: 6, t: 5.85 }, { el: link, x: 560, y: 1000, r: -2, t: 6.0 }];
  window.__C = { ENTER, done: OT[3] };
  return t => {
    const ey = enter(t), ex = A(t, 9.6, .45, 0, 1, E.inC);
    revealWords(c1.ws, t, 5.45, .06, .6); revealWords(c2.ws, t, 5.6, .07, .7);
    st(c1.el, { x: CX, y: 330 + ey, o: 1 - ex }); st(c2.el, { x: CX, y: 460 + ey, o: 1 - ex });
    srcs.forEach((s, i) => {
      const fly = E.ioC(P(t, ENTER - .55 + i * .06, ENTER - .1 + i * .06));
      const by = S(t, s.t, 2100, s.y, 1.6, .5) + ey;
      const x = lerp(s.x, 540, fly), y = lerp(by, 1150, fly) - Math.sin(fly * Math.PI) * 160;
      st(s.el, { x, y, r: S(t, s.t, s.r + 20, s.r) * (1 - fly), s: lerp(1, .12, fly), o: 1 - P(fly, .75, 1) });
    });
    const tIn = S(t, 6.0, 900, 0, 1.4, .6);
    const tz = A(t, 9.6, .45, 0, 1, E.inC);
    st(term, { x: CX, y: 1330 + tIn + ey, s: 1 - tz * .5, o: 1 - tz });
    st(glow, { x: CX, y: 1330 + tIn + ey, s: 1 - tz * .5, o: Math.sin(P(t, ENTER - .4, ENTER + .4) * Math.PI) * .9 });
    typeText(p1, T.prompt1, t, T1, cps); typeText(p2, T.prompt2, t, T2, cps);
    caret.style.opacity = t < 6.1 || t > ENTER ? 0 : (t < TE ? 1 : (Math.floor(t * 2.4) % 2 ? 0 : 1));
    outs.forEach((o, i) => st(o, { y: A(t, OT[i], .3, 14, 0, E.outE), o: A(t, OT[i], .2, 0, 1) }));
    const fr = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
    spin.textContent = t < OT[1] ? " " + fr[Math.floor(t * 14) % fr.length] : " ✓"; spin.style.color = t < OT[1] ? "#ff4d42" : "#86d4a0";
  };
});

// ── D — deck (9.55 → 12.6)
scene(9.55, 12.6, el => {
  const d1 = headline(el, U.d1, CAP), d2 = headline(el, U.d2, CAP);
  const L = T.minis.slice(0, 9).map(([type, pr], i) => {
    const c = h("div", "mini", el);
    c.innerHTML = `<div class="lbl">${T.typeLabel[type]}</div><div class="num">${String(i + 1).padStart(2, "0")}/10</div><div class="pr">${pr}</div>`;
    if (type === "mcq") c.querySelector(".lbl").style.color = "#e0231b"; if (type === "cloze") c.querySelector(".lbl").style.color = "#15803d";
    const col = i % 3, row = Math.floor(i / 3);
    return { c, x: 200 + col * 340 + (row % 2 ? 18 : -18), y: 790 + row * 240, r: (rnd() - .5) * 9, t0: 9.7 + i * .05 };
  });
  const morph = h("div", "ctr", el); css(morph, { background: "#eceef1", zIndex: 30, boxShadow: "0 40px 90px rgba(18,20,26,.22)" });
  const file = h("div", "file ctr", el, FILE_SVG()); file.style.zIndex = 20;
  L.forEach(l => cue(l.t0, "card")); cue(11.05, "gather"); cue(11.6, "thump"); cue(11.9, "zoom");
  return t => {
    revealWords(d1.ws, t, 9.7, .07, .6); revealWords(d2.ws, t, 9.85, .07, .7);
    const tex = A(t, 11.85, .3, 0, 1, E.inC);
    st(d1.el, { x: CX, y: 330, o: 1 - tex }); st(d2.el, { x: CX, y: 460, o: 1 - tex });
    L.forEach((l, i) => {
      const g = E.inB(P(t, 10.8 + (8 - i) * .025, 11.3 + (8 - i) * .025));
      const x = S(t, l.t0, 540, l.x, 1.3, .6), y = S(t, l.t0, 1330, l.y, 1.3, .6), s = S(t, l.t0, .3, 1, 1.5, .5);
      st(l.c, { x: lerp(x, 540, g) - 150, y: lerp(y, 1000, g) - 98, r: S(t, l.t0, 0, l.r, 1.3, .5) * (1 - g), s: s * lerp(1, .5, g), o: t < l.t0 ? 0 : 1 - P(g, .85, 1) });
    });
    const fp = P(t, 11.35, 11.6);
    const bump = t > 11.6 ? 1 + Math.exp(-(t - 11.6) * 7) * Math.sin((t - 11.6) * 26) * .06 : lerp(.6, 1, E.outB(fp));
    const m = E.ioQ(P(t, 11.9, 12.4));
    st(file, { x: CX, y: lerp(1000, 1010, m), s: bump * lerp(1.1, 1.8, m), o: fp > 0 ? Math.min(1, fp * 2) * (1 - P(t, 11.9, 12.1)) : 0 });
    css(morph, { width: lerp(330, 975, m) + "px", height: lerp(418, 846, m) + "px", borderRadius: "20px", display: t > 11.9 ? "block" : "none" });
    st(morph, { x: CX, y: lerp(1000, 1010, m), o: 1 - P(t, 12.45, 12.6) });
  };
});

// ── E/F — study & review in the player (12.3 → 20.7)
scene(12.3, 20.7, el => {
  const capBox = h("div", "ctr", el); css(capBox, { display: "flex", gap: KO ? "40px" : "30px", whiteSpace: "nowrap" });
  const rrg = U.rrg.map(s => { const d = h("div", "h1", capBox); d.textContent = s; d.style.fontSize = KO ? "84px" : "92px"; return d; });
  const m1 = headline(el, U.mc1, CAP), m2 = headline(el, U.mc2, CAP);
  const f1 = headline(el, U.f1, CAP), f2 = headline(el, U.f2, CAP);
  const WW = 1060, WH = 920, SC = .92, WX = CX, WY = 1010;
  const win = h("div", "win ctr", el); css(win, { width: WW + "px", height: WH + "px" });
  win.innerHTML = `<div class="chrome"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="addr"><svg width="18" height="22" viewBox="0 0 18 22"><path d="M2 1h9l6 6v13H2z" fill="none" stroke="#5f636b" stroke-width="2"/></svg>file:///…/study.html</div></div>`;
  const pl = h("div", "pl", win);
  pl.innerHTML = `<div class="pl-head"><div style="width:34px;height:34px">${SEAL_SVG(false)}</div>Cram</div><div class="pl-title">${T.deckTitle}</div><div class="pl-prog"><i></i></div>`;
  const prog = pl.querySelector(".pl-prog i");
  const card = h("div", "pl-card", pl);
  const c1 = h("div", "pc", card);
  c1.innerHTML = `<div class="lbl">${T.typeLabel.basic}</div><div class="num">01/15</div><div class="q" style="font-size:44px">${T.q1}</div>`;
  const hint = h("div", "", c1, `${T.showHint}<span class="kbd">H</span>`); css(hint, { position: "absolute", left: "46px", top: "310px", fontSize: "24px", color: "var(--ink-soft)" });
  const show = h("div", "btn dark", c1, `${T.showAnswer}<span class="kbd">A</span>`); css(show, { right: "46px", top: "380px", width: KO ? "270px" : "310px", height: "80px", fontSize: "28px" });
  const rule = h("div", "abs", c1); css(rule, { left: "46px", right: "46px", top: "290px", height: "1.5px", background: "var(--rule)", transformOrigin: "left" });
  const ansBox = h("div", "abs", c1); css(ansBox, { left: "46px", right: "46px", top: "318px" });
  ansBox.innerHTML = `<div class="ans-l">${T.answerL}</div><div class="ans" style="font-size:32px">${T.a1text}</div>`;
  const bMiss = h("div", "btn line", c1, T.missedIt), bKnew = h("div", "btn line", c1, T.knewIt);
  css(bMiss, { left: "46px", top: "500px", width: "412px", height: "84px", fontSize: "28px" }); css(bKnew, { left: "474px", top: "500px", width: "412px", height: "84px", fontSize: "28px" });
  const knewFill = h("div", "abs", bKnew); css(knewFill, { inset: "-1.5px", borderRadius: "12px", background: "var(--positive)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "28px", fontWeight: 600 });
  knewFill.innerHTML = "✓&nbsp; " + T.knewIt;
  const c2 = h("div", "pc", card);
  c2.innerHTML = `<div class="lbl" style="color:var(--accent)">${T.typeLabel.mcq}</div><div class="num">02/15</div><div class="q" style="font-size:42px">${T.q2}</div>`;
  const opts = T.opts.map((o, i) => { const d = h("div", "opt", c2); d.style.top = (236 + i * 80) + "px"; d.style.height = "66px"; d.style.fontSize = "28px"; d.innerHTML = `<div class="radio"><i></i></div><span>${o}</span><span class="mark"></span>`; return d; });
  const chk = h("div", "btn dark", c2, T.check); css(chk, { right: "46px", top: "546px", width: "250px", height: "60px", fontSize: "24px" });
  const fb2 = h("div", "fb", c2, T.wrongFb); css(fb2, { top: "562px", color: "var(--accent)", fontSize: "24px" });
  const res = h("div", "pc", card);
  res.innerHTML = `<div style="text-align:center;font-family:var(--serif);font-size:46px;font-weight:600;margin-top:6px">${T.done}</div>`;
  const ringWrap = h("div", "abs", res); css(ringWrap, { left: "50%", top: "96px", width: "220px", height: "220px", marginLeft: "-110px" });
  ringWrap.innerHTML = `<svg viewBox="0 0 220 220" width="220" height="220"><circle cx="110" cy="110" r="94" fill="none" stroke="#dcdde0" stroke-width="16"/><circle class="arc" cx="110" cy="110" r="94" fill="none" stroke="#15803d" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 110 110)"/></svg><div class="sc" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:64px;font-weight:700"></div>`;
  const arc = ringWrap.querySelector(".arc"), sc = ringWrap.querySelector(".sc");
  const sline = h("div", "abs", res, T.scoreLine); css(sline, { left: 0, right: 0, top: "324px", textAlign: "center", fontSize: "28px", color: "var(--ink-soft)" });
  const tabs = h("div", "abs", res); css(tabs, { left: "46px", top: "370px", display: "flex", gap: "12px" });
  const tAll = h("div", "", tabs, T.all), tMiss = h("div", "", tabs, T.missed);
  [tAll, tMiss].forEach(d => css(d, { padding: "8px 22px", borderRadius: "999px", fontSize: "22px", fontWeight: 600, border: "1.5px solid var(--rule-strong)" }));
  const grid = h("div", "abs", res); css(grid, { left: "46px", right: "46px", top: "428px", height: "150px" });
  const miss = new Set([1, 6, 10]);
  const gcards = Array.from({ length: 15 }, (_, i) => { const g = h("div", "abs", grid); css(g, { width: "164px", height: "40px", borderRadius: "8px", background: "#fff", border: "1.5px solid " + (miss.has(i) ? "#f2b1ad" : "#b5dcc3"), fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", fontWeight: 600, color: miss.has(i) ? "var(--accent)" : "var(--positive)" }); g.innerHTML = `<span style="font-family:var(--mono);color:var(--ink-soft);font-weight:500">${String(i + 1).padStart(2, "0")}</span>${miss.has(i) ? "✕ " + T.missedTag : "✓ " + T.correctTag}`; return g; });
  const retry = h("div", "btn dark", res, T.retry); css(retry, { left: "50%", marginLeft: KO ? "-200px" : "-190px", top: "500px", width: KO ? "400px" : "380px", height: "70px", fontSize: "25px" });
  const cursor = makeCursor(el);
  // map window-local coords to screen
  const OX = WX - WW * SC / 2, OY = WY - WH * SC / 2;
  const cardX = x => OX + (70 + x) * SC, cardY = y => OY + (64 + 196 + y) * SC;
  const clicks = [13.45, 14.55, 16.0, 16.6, 18.9, 19.9];
  clicks.forEach(c => cue(c, "click")); cue(14.6, "correct"); cue(16.65, "wrong"); cue(14.95, "slide"); cue(17.4, "slide");
  cue(17.65, "count"); cue(18.45, "chime"); for (let i = 0; i < 15; i++) cue(18.5 + i * .025, "tick-soft"); cue(20.2, "whoosh-big");
  const keys = [[12.6, 900, 1700], [13.3, cardX(790), cardY(420)], [13.6, cardX(790), cardY(430)], [14.4, cardX(680), cardY(542)], [14.9, cardX(690), cardY(560)],
    [15.4, cardX(690), cardY(600)], [15.95, cardX(180), cardY(268)], [16.1, cardX(200), cardY(285)], [16.55, cardX(790), cardY(576)],
    [17.5, cardX(790), cardY(595)], [18.85, cardX(262), cardY(390)], [19.2, cardX(262), cardY(398)], [19.85, cardX(460), cardY(535)], [20.4, cardX(470), cardY(560)]];
  return t => {
    const wIn = E.outC(P(t, 12.35, 12.6)), wOut = A(t, 20.1, .5, 0, 1, E.inC);
    st(win, { x: WX, y: WY + wOut * 60, s: SC * (1 - wOut * .08), o: wIn * (1 - wOut) });
    // captions
    const cA = A(t, 12.4, .4, 0, 1) * (1 - A(t, 14.95, .3, 0, 1));
    st(capBox, { x: CX, y: 380, o: cA });
    const lit = [12.6, 13.45, 14.55];
    rrg.forEach((d, i) => { const on = A(t, lit[i], .25, 0, 1); d.style.color = i === 2 && t > 14.55 ? "var(--positive)" : `rgba(31,28,24,${.14 + on * .86})`; st(d, { y: (1 - E.outE(P(t, lit[i], lit[i] + .45))) * 16 }); });
    revealWords(m1.ws, t, 15.05, .06, .6); revealWords(m2.ws, t, 15.2, .06, .6);
    const cB = 1 - A(t, 17.35, .3, 0, 1);
    st(m1.el, { x: CX, y: 310, o: cB }); st(m2.el, { x: CX, y: 440, o: cB });
    revealWords(f1.ws, t, 17.5, .06, .6); revealWords(f2.ws, t, 18.9, .07, .6);
    const cC = 1 - A(t, 20.1, .4, 0, 1);
    st(f1.el, { x: CX, y: 310, o: cC }); st(f2.el, { x: CX, y: 440, o: cC });
    prog.style.width = ((t < 14.6 ? 1 : t < 16.65 ? 2 : 15) / 15 * 100) + "%";
    const slide = (c, tin, tout) => { const i = E.outE(P(t, tin, tin + .45)), o = E.inC(P(t, tout, tout + .3)); st(c, { x: (1 - i) * 90 - o * 90, o: (t < tin ? 0 : i) * (1 - o) }); c.style.visibility = (t < tin || t > tout + .35) ? "hidden" : "visible"; };
    slide(c1, 11.0, 14.95); slide(c2, 15.0, 17.4); slide(res, 17.45, 99);
    const rev = E.outE(P(t, 13.5, 13.95));
    st(show, { s: t > 13.45 && t < 13.6 ? .96 : 1, o: 1 - P(t, 13.5, 13.62) }); show.style.visibility = t > 13.65 ? "hidden" : "visible";
    st(hint, { o: 1 - P(t, 13.5, 13.62) });
    st(rule, { sx: rev, o: rev > 0 ? 1 : 0 }); st(ansBox, { y: (1 - rev) * 18, o: rev });
    st(bMiss, { y: (1 - E.outE(P(t, 13.6, 14.05))) * 18, o: P(t, 13.6, 13.85) });
    st(bKnew, { y: (1 - E.outE(P(t, 13.65, 14.1))) * 18, o: P(t, 13.65, 13.9), s: t > 14.55 && t < 14.68 ? .97 : 1 });
    st(knewFill, { o: A(t, 14.57, .12, 0, 1) });
    opts.forEach((o, i) => {
      const dot = o.querySelector(".radio i"), mark = o.querySelector(".mark");
      const ap = P(t, 15.15 + i * .05, 15.45 + i * .05);
      let x = 0, s = 1;
      if (i === 0) { dot.style.transform = `scale(${S(t, 16.02, 0, 1, 3, .4)})`; o.style.borderColor = t > 16.02 ? "var(--ink)" : ""; }
      if (i === 0 && t > 16.65) { o.style.borderColor = "var(--accent)"; o.style.background = "#fdeceb"; dot.style.background = "var(--accent)"; mark.textContent = "✕ " + (KO ? "오답" : "Incorrect"); mark.style.color = "var(--accent)"; mark.style.opacity = A(t, 16.65, .2, 0, 1); x = Math.exp(-(t - 16.65) * 7) * Math.sin((t - 16.65) * 60) * 8; }
      if (i === 1 && t > 16.7) { o.style.borderColor = "var(--positive)"; o.style.background = "#e9f6ee"; mark.textContent = "✓ " + (KO ? "정답" : "Correct"); mark.style.color = "var(--positive)"; mark.style.opacity = A(t, 16.7, .2, 0, 1); s = 1 + Math.exp(-(t - 16.7) * 8) * Math.sin((t - 16.7) * 30) * .02; }
      st(o, { x, s, y: (1 - E.outE(ap)) * 20, o: ap });
    });
    st(chk, { o: A(t, 16.1, .25, 0, 1) * (1 - P(t, 16.65, 16.8)), s: t > 16.6 && t < 16.72 ? .96 : 1 });
    st(fb2, { o: A(t, 16.8, .3, 0, 1), y: A(t, 16.8, .4, 10, 0, E.outE) });
    const cnt = E.outC(P(t, 17.65, 18.45));
    arc.style.strokeDashoffset = 1 - cnt * .8;
    sc.innerHTML = `${Math.round(cnt * 12)}<span style="font-size:34px;color:var(--ink-soft);font-weight:500">/15</span>`;
    st(ringWrap, { s: t > 18.45 ? 1 + Math.exp(-(t - 18.45) * 8) * Math.sin((t - 18.45) * 28) * .04 : 1 });
    st(sline, { o: A(t, 18.3, .3, 0, 1) }); st(tabs, { o: A(t, 18.4, .3, 0, 1) });
    const filt = E.ioC(P(t, 18.95, 19.4));
    tAll.style.background = filt > .5 ? "transparent" : "var(--ink)"; tAll.style.color = filt > .5 ? "var(--ink)" : "var(--paper)";
    tMiss.style.background = filt > .5 ? "var(--accent)" : "transparent"; tMiss.style.color = filt > .5 ? "#fff" : "var(--ink)"; tMiss.style.borderColor = filt > .5 ? "var(--accent)" : "var(--rule-strong)";
    let mi = 0;
    gcards.forEach((g, i) => { const col = i % 5, row = Math.floor(i / 5), isM = miss.has(i), k = isM ? mi++ : 0; const ap = E.outE(P(t, 18.5 + i * .025, 18.85 + i * .025)); st(g, { x: isM ? lerp(col * 176, k * 176, filt) : col * 176, y: (isM ? lerp(row * 50, 0, filt) : row * 50) + (1 - ap) * 14, o: ap * (isM ? 1 : 1 - filt), s: isM ? 1 + Math.sin(filt * Math.PI) * .06 : 1 - filt * .2 }); });
    st(retry, { o: A(t, 19.35, .35, 0, 1), y: A(t, 19.35, .45, 14, 0, E.outE), s: t > 19.9 && t < 20.03 ? .96 : 1 });
    cursor(t, keys, clicks, [12.6, 20.1]);
  };
});

// ── G — one file (20.2 → 23.95), dark
const wipes = document.getElementById("wipes");
const w1 = h("div", "wipe", wipes), w2 = h("div", "wipe", wipes), w3 = h("div", "wipe", wipes), w4 = h("div", "wipe", wipes);
[w1, w2, w3, w4].forEach(w => css(w, { width: "1400px", height: "2200px", top: "-140px" }));
css(w1, { background: "#e0231b" }); css(w2, { background: "#0e0f11" }); css(w3, { background: "#e0231b" }); css(w4, { background: "#f6f6f4" });
function wipesAt(t) {
  const a = E.ioQ(P(t, 20.2, 20.65)), b = E.ioQ(P(t, 20.32, 20.8));
  st(w1, { y: lerp(2200, -140, a) }); st(w2, { y: lerp(2200, -140, b) });
  w1.style.display = w2.style.display = t > 20.15 && t < 20.82 ? "block" : "none";
  const c = E.ioQ(P(t, 23.45, 23.85)), d = E.ioQ(P(t, 23.55, 23.97));
  st(w3, { y: lerp(2200, -140, c) }); st(w4, { y: lerp(2200, -140, d) });
  w3.style.display = w4.style.display = t > 23.4 && t < 23.99 ? "block" : "none";
  document.getElementById("night").style.opacity = t > 20.78 && t < 23.9 ? 1 : 0;
}
scene(20.7, 23.95, el => {
  const g1 = headline(el, U.g1, CAP), g2 = headline(el, U.g2, CAP);
  [g1, g2].forEach(g => { g.el.style.color = "#f6f6f4"; g.ws.forEach(w => { if (w.classList.contains("acc")) w.style.color = "#ff4d42"; }); });
  const glowF = h("div", "ctr", el); css(glowF, { width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,66,.3), transparent 65%)" });
  const file = h("div", "file ctr", el, FILE_SVG(true));
  const ic = [ICON.offline, ICON.nosignup, ICON.noinstall];
  const badges = U.badges.map((b, i) => { const c = h("div", "chip ctr", el, `${ic[i]}<span>${b}</span>`); css(c, { fontSize: "40px", padding: "22px 40px 22px 28px" }); c.querySelector("svg").style.cssText = "width:48px;height:48px"; return c; });
  cue(20.25, "wipe"); cue(20.9, "thump"); badges.forEach((_, i) => cue(21.75 + i * .2, "pop")); cue(23.5, "wipe");
  return t => {
    el.style.visibility = t > 20.75 ? "visible" : "hidden";
    revealWords(g1.ws, t, 20.85, .07, .6); revealWords(g2.ws, t, 21.0, .07, .6);
    st(g1.el, { x: CX, y: 320 }); st(g2.el, { x: CX, y: 450 });
    const fIn = S(t, 20.9, 0, 1, 1.6, .45);
    st(file, { x: CX, y: 850, s: fIn * .95, r: (1 - fIn) * -10 + noise1(t * .6) * 1.2, o: P(t, 20.9, 21.0) });
    st(glowF, { x: CX, y: 850, s: .9 + Math.sin(t * 2.4) * .04, o: P(t, 21.0, 21.5) });
    badges.forEach((b, i) => { const bt = 21.75 + i * .2, sp = S(t, bt, 0, 1, 2, .45); st(b, { x: CX + noise1(t * .5, i) * 5, y: 1170 + i * 125 + (1 - sp) * 40, s: .6 + .4 * sp, o: t < bt ? 0 : Math.min(1, (t - bt) * 6) }); });
  };
});

// ── I — call to action (23.5 → 28)
scene(23.5, 28.1, el => {
  const shadow = h("div", "ctr", el); css(shadow, { width: "440px", height: "440px", borderRadius: "50%", background: "radial-gradient(circle, rgba(10,12,16,.5) 0%, rgba(10,12,16,.2) 40%, transparent 70%)" });
  const seal = h("div", "seal ctr", el, SEAL_SVG()); css(seal, { width: "300px", height: "300px" });
  const word = h("div", "ctr", el); css(word, { fontFamily: "\"Inter Tight\", sans-serif", letterSpacing: "-.06em", fontSize: "210px", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 1' }); word.textContent = T.wordmark;
  const tg1 = headline(el, U.tag1, KO ? 96 : 96, 600), tg2 = headline(el, U.tag2, KO ? 96 : 96, 600);
  const url = h("div", "ctr", el); css(url, { fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "50px", whiteSpace: "nowrap", background: "#121316", color: "#f6f6f4", borderRadius: "999px", padding: "26px 46px" });
  url.innerHTML = `<span style="display:inline-flex;align-items:center;gap:20px"><svg width="50" height="50" viewBox="0 0 16 16"><path fill="#f6f6f4" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span>github.com/<span style="color:#ff4d42">sjquant/cram</span></span></span>`;
  const foot = h("div", "ctr", el, U.foot); css(foot, { fontSize: "34px", color: "var(--ink-soft)", fontWeight: 500, whiteSpace: "nowrap" });
  cue(CTA, "stamp-final"); cue(24.4, "letter"); cue(24.6, "swish-soft"); cue(25.2, "ding"); cue(26.0, "end");
  return t => {
    const d = P(t, 23.55, CTA), hit = t >= CTA;
    const sq = hit ? Math.exp(-(t - CTA) * 9) * Math.cos((t - CTA) * 38) : 0;
    const fade = 1 - A(t, 27.3, .7, 0, 1, E.ioC);
    st(seal, { x: CX, y: 520, s: hit ? 1 + sq * .06 : lerp(2.8, 1, E.inC(d)), sy: hit ? 1 - sq * .06 : undefined, o: (hit ? 1 : E.outC(P(t, 23.55, 23.8))) * fade, blur: hit ? 0 : (1 - d) * 14, r: hit ? 0 : (1 - d) * 8 });
    st(shadow, { x: CX, y: 530, s: lerp(2.2, .7, E.inC(d)), o: hit ? 0 : A(t, 23.55, .45, 0, .5, E.inC) });
    st(word, { x: CX, y: 810 + A(t, 24.35, .5, 30, 0, E.outE), o: A(t, 24.35, .3, 0, 1) * fade });
    revealWords(tg1.ws, t, 24.6, .07, .6); revealWords(tg2.ws, t, 24.75, .07, .6);
    st(tg1.el, { x: CX, y: 1000, o: fade }); st(tg2.el, { x: CX, y: 1135, o: fade });
    st(url, { x: CX, y: 1330 + A(t, 25.2, .6, 30, 0, E.outE), s: t > 25.2 ? 1 + Math.exp(-(t - 25.2) * 7) * Math.sin((t - 25.2) * 22) * .03 : 1, o: A(t, 25.2, .4, 0, 1) * fade });
    st(foot, { x: CX, y: 1450, o: A(t, 25.6, .5, 0, 1) * fade });
  };
});

// ── camera + frame
const grain = document.getElementById("grain"), flash = document.getElementById("flash");
function camera(t) {
  let x = noise1(t * .25, 1) * 4, y = noise1(t * .25, 2) * 4, r = noise1(t * .2, 3) * .1, s = 1 + A(t, 1.3, 1.7, 0, .04, E.inC) - (t >= IMPACT ? .04 : 0);
  for (const [ti, amp] of [[IMPACT, 30], [CTA, 18], [11.6, 5], [20.9, 5]]) if (t >= ti && t < ti + .6) { const k = Math.exp(-(t - ti) * 9); x += noise1(t * 60, ti) * amp * k; y += noise1(t * 60, ti + 5) * amp * k; r += noise1(t * 40, ti + 9) * amp * .02 * k; }
  if (t >= IMPACT && t < IMPACT + 1) s *= 1 + .025 * Math.exp(-(t - IMPACT) * 5);
  cam.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
  flash.style.opacity = Math.max(t >= IMPACT ? .55 * Math.exp(-(t - IMPACT) * 14) : 0, t >= CTA ? .35 * Math.exp(-(t - CTA) * 14) : 0);
}
window.render = function (t) {
  wipesAt(t);
  for (const sc of scenes) { const on = t >= sc.t0 && t < sc.t1; sc.el.style.display = on ? "block" : "none"; if (on) sc.render(t); }
  camera(t);
  const dark = t > 20.78 && t < 23.9;
  grain.style.mixBlendMode = dark ? "screen" : "multiply"; grain.style.opacity = dark ? .04 : .055;
};
window.DUR = 28.0;
window.CUES = CUES.sort((a, b) => a.t - b.t);
window.ready = (async () => { for (let t = 0; t < window.DUR; t += .5) window.render(t); await document.fonts.ready; window.render(0); return true; })();
