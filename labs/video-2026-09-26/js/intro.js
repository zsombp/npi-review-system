/* intro.js, v0.2.0, 2026-09-26 (v0.1.0 the same day). The BistroTech introduction video: builds the seven
   scenes from js/strings.js in the language (?lang=hu|en) and the format (?format=h for 16:9, ?format=v for
   9:16) of the address, lays the words out, writes every movement onto the one master timeline of
   js/engine.js, and runs the player, or, with ?render=1, waits for tools/render.mjs to seek it frame by frame.

   v0.2.0: the timeline sits on the music (audio/love-train.mp3, 120 BPM, started at 10.000 s of the track,
   so its groove enters at 6.0 s of the video): a beat every 0.5 s, a bar every 2 s. Scenes change on bar
   starts; every entrance is keyed by its landing frame, which is on a beat; the big moments land on
   downbeats. Each intended hit is logged (window.__hits) and tools/beatcheck.mjs checks them all.
   Words never grow past their own size while they land, so neighbours never touch (tools/gapcheck.mjs).
   Storyboard, timing and sources: STORYBOARD.md. All example data is fictional. */
(function () {
  "use strict";
  var E = window.Engine, X = E.EASE;
  var q = new URLSearchParams(location.search);
  var LANG = q.get("lang") === "en" ? "en" : "hu";
  var FMT = q.get("format") === "v" ? "v" : "h";
  var RENDER = q.has("render"), QA = q.has("qa");
  var S = window.BT_STR[LANG];
  var TOTAL = 44.0, BEAT = 0.5, BAR = 2.0, FPS = 30;
  var W = FMT === "v" ? 720 : 1280, H = FMT === "v" ? 1280 : 720;
  var html = document.documentElement;
  html.lang = LANG;
  html.classList.add("fmt-" + FMT);
  if (RENDER) html.classList.add("render");

  /* ------------------------------------------------------------ the plan: bars and beats
     Scene changes (the new scene is fully in on these bar starts). 6.0 is where the groove enters, 38.0 is
     a 4-bar phrase line; 12, 18, 26 and 32 are bar starts (the story needs every scene at least 6 s, the
     replies 8 s, so only two of the phrase lines fit). */
  var SC = { s2: 6, s3: 12, s4: 18, s5: 26, s6: 32, s7: 38 };
  /* when each word of each headline lands, by its place in the line (a chunk of words may land together) */
  var WORDS = {
    s1: { hu: [0.5, 1.0, 1.5, 2.0], en: [0.5, 1.0, 1.5, 2.0] },
    s2: { hu: [6.5, 7.0, 7.5, 8.0], en: [6.5, 7.0, 7.5, 8.0] },
    s3: { hu: [12.5, 12.5, 13.0, 13.5, 13.5, 13.5], en: [12.5, 12.5, 13.0, 13.0, 13.0, 13.5, 13.5] },
    s4: { hu: [19.0, 20.5, 20.5, 21.0, 22.0], en: [19.0, 19.0, 19.0, 20.5, 20.5, 21.0, 21.0, 21.0, 21.0, 22.0, 22.0, 22.0] },
    s5: { hu: [26.5, 27.0, 27.5], en: [26.5, 27.0, 27.0, 27.5] },
    s6: { hu: [32.5, 32.5, 33.0, 33.0, 33.5, 33.5], en: [32.5, 32.5, 33.0, 33.0, 33.0, 33.5, 33.5, 33.5] },
    s7: { hu: [40.0, 40.0], en: [40.0, 40.0, 40.0, 40.0] }
  };

  /* ------------------------------------------------------------ the two layouts (CSS pixels of the stage;
     the renderer shoots at a device scale of 1.5: 1920 x 1080 and 1080 x 1920). In 9:16 no text sits in
     the top 167 or the bottom 233 CSS pixels (250 and 350 video pixels), where the phone apps put their
     buttons and captions; only colour, drawings and 3D may go there. */
  var SAFE_TOP = FMT === "v" ? 167 : 0, SAFE_BOTTOM = FMT === "v" ? 1047 : 720;
  var LAYOUT = {
    h: {
      s1: { k: { x: 64, y: 58, w: 640, max: 136 },
        land: [[748, 34, -6], [1000, 96, 5], [812, 226, 4], [1070, 318, -7], [742, 420, -3], [1004, 506, 6], [34, 486, 5], [336, 540, -4], [620, 588, 3], [900, 628, -5]],
        from: [[0, -520], [620, -80], [640, 0], [520, 60], [0, 520], [560, 300], [-560, 60], [0, 520], [0, 520], [300, 500]],
        band: { top: 496, x0: 44, slot: 346, y: 546 } },
      s2: { k: { x: 64, y: 118, w: 600, max: 124 }, clock: [44, 390, 268], cup: [292, 470, 250], report: { left: 742, top: 44, w: 468 } },
      s3: { k: { x: 64, y: 128, w: 510, max: 104 }, phone: [608, 34], tiles: [980, 60, 272] },
      s4: { k: { x: 748, y: 64, w: 496, max: 96 }, stack: [22, 10, 0.94] },
      s5: { k: { x: 640, w: 590, max: 150 }, toy: [96, 118, 520], done: [128, 96] },
      s6: { sticker: [64, 36], k: { x: 64, y: 102, w: 1150, max: 84 } },
      s7: { lockTop: 214, lockW: 760, closeTop: 404, closeSize: 44 }
    },
    v: {
      s1: { k: { x: 48, y: 180, w: 624, max: 150 },
        land: [[392, 596, 6], [-40, 612, -5], [214, 668, -3], [440, 720, 5], [4, 748, 4], [248, 790, -6], [-30, 838, 3], [430, 846, -4], [168, 880, 2], [300, 600, -8]],
        from: [[520, -60], [-520, 40], [0, 760], [560, 80], [-560, 100], [0, 760], [-520, 60], [540, 60], [0, 760], [520, -40]],
        band: { top: 800, x0: 30, slot: 346, y: 836 } },
      s2: { k: { x: 48, y: 180, w: 624, max: 124 }, clock: [6, 1022, 250], cup: [458, 1070, 228], report: { left: 90, w: 540 } },
      s3: { k: { x: 48, y: 180, w: 624, max: 104 }, phone: [30, 0], tiles: [384, 0, 304] },
      s4: { k: { x: 48, y: 180, w: 624, max: 90 }, stack: [0, 0, 0] },
      s5: { k: { x: 48, y: 190, w: 624, max: 150 }, toy: [120, 0, 480], done: [0, 0] },
      s6: { sticker: [48, 180], k: { x: 48, y: 236, w: 624, max: 84 } },
      s7: { lockTop: 470, lockW: 600, closeTop: 612, closeSize: 56 }
    }
  };
  var L = LAYOUT[FMT];
  function lines(key) { return (FMT === "v" && S.v && S.v[key]) || S[key]; }

  var stage = document.getElementById("stage");
  function el(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function px(n) { return n + "px"; }
  function at(node, x, y) { node.style.left = px(x); node.style.top = px(y); return node; }
  var STAR = '<svg aria-hidden="true" focusable="false"><use href="#g-star"/></svg>';
  var MK = '<svg class="mk-line" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 7C20 3.5 40 9.5 58 6S88 4.5 98 8"/></svg>';

  /* ------------------------------------------------------------ the hit log */
  var HITS = [], CUR = "s1";
  function hit(t, what, o) { o = o || {}; HITS.push({ scene: CUR, t: Math.round(t * 1000) / 1000, what: what, big: !!o.big, el: o.el || null, check: o.check || null }); return t; }

  /* ------------------------------------------------------------ building blocks */

  /* A poster headline: lines of words; a word may be {hl: "..."} (the box) or {mk: "..."} (the marker
     stroke). Fitted to a width so the English and the Hungarian both fit. */
  function kinetic(parent, lns, o) {
    var box = el("p", "kt " + (o.cls || ""), parent);
    at(box, o.x, o.y || 0);
    if (o.hl) box.style.setProperty("--hl", o.hl);
    if (o.mk) box.style.setProperty("--mk", o.mk);
    var out = { box: box, lines: [], words: [] };
    lns.forEach(function (ln) {
      var Ln = el("span", "ln", box);
      var words = [];
      ln.forEach(function (w, i) {
        if (i) Ln.appendChild(document.createTextNode(" "));
        var Wd = el("span", "w", Ln);
        if (typeof w === "string") Wd.textContent = w;
        else if (w.hl) { var m = el("mark", "hl", Wd, w.hl); Wd.mark = m; }
        else if (w.mk) { Wd.classList.add("mk"); Wd.textContent = w.mk; Wd.insertAdjacentHTML("beforeend", MK); Wd.mkLine = Wd.querySelector(".mk-line"); }
        words.push(Wd); out.words.push(Wd);
      });
      out.lines.push(words);
    });
    out.fit = function () {
      var f = o.max;
      box.style.fontSize = px(f);
      var too = function () { return Array.prototype.some.call(box.children, function (l) { return l.offsetWidth > o.w; }); };
      while (f > (o.min || 36) && too()) { f -= 1; box.style.fontSize = px(f); }
      out.font = f;
      return f;
    };
    return out;
  }

  var SLAM = "cubic-bezier(.4, 0, .85, .55)";      /* speeds up into the landing */
  var APPROACH = "cubic-bezier(.25, .5, .55, .85)"; /* travels far, still moving when it lands */

  /* A word lands on beat T: it rises into place, reaches full size and its place exactly at T, bounces a
     little and settles. The bounce is in the lift and the tilt only; the size never passes 1. */
  function landWord(Wd, T, o) {
    o = o || {};
    var dy = o.dy != null ? o.dy : 0.36;
    E.move(Wd, "opacity", [[T - 0.2, 0], [T - 0.13, 1]]);
    E.move(Wd, "scale", [[T - 0.2, "0.45", X.out], [T, "1"]]);
    E.move(Wd, "translate", [[T - 0.2, "0px " + dy + "em", SLAM], [T, "0px 0em", X.out], [T + 0.1, "0px -0.05em", X.soft], [T + 0.3, "0px 0em"]]);
    E.move(Wd, "rotate", [[T - 0.2, "-9deg", SLAM], [T, "0deg", X.out], [T + 0.1, "1deg", X.soft], [T + 0.3, "0deg"]]);
    if (Wd.mark) E.move(Wd.mark, "scale", [[T - 0.15, "0.85 0.6", X.out], [T, "1 1", X.out], [T + 0.08, "1 0.92", X.soft], [T + 0.22, "1 1"]]);
    if (Wd.mkLine) E.move(Wd.mkLine, "clipPath", [[T + 0.05, "inset(-120% 101% -120% -8%)", X.out], [T + 0.45, "inset(-120% -8% -120% -8%)"]]);
    hit(T, "word " + Wd.textContent.trim(), { el: Wd, check: "word" });
  }
  function landWords(k, times) {
    if (times.length !== k.words.length) throw new Error("word times do not match the words: " + k.words.map(function (w) { return w.textContent; }).join(" "));
    k.words.forEach(function (Wd, i) { landWord(Wd, times[i]); });
  }

  /* A thing lands on beat T: it comes in small and tilted, is full size and in place at T, then a short
     squash and settle. For stickers, tiles, drawings, toys and pins. */
  function landIn(node, T, what, o) {
    o = o || {};
    var lead = o.lead || 0.22;
    E.move(node, "opacity", [[T - lead, 0], [T - lead + 0.07, 1]]);
    E.move(node, "scale", [[T - lead, String(o.from != null ? o.from : 0.3), SLAM], [T, "1", X.out], [T + 0.08, o.squash || "1.05 0.95", X.soft], [T + 0.26, "1"]]);
    if (o.rot != null) E.move(node, "rotate", [[T - lead, o.rot + "deg", SLAM], [T, (o.to || 0) + "deg", X.out], [T + 0.12, ((o.to || 0) + (o.rot < 0 ? 2 : -2)) + "deg", X.soft], [T + 0.3, (o.to || 0) + "deg"]]);
    if (o.dx != null || o.dy != null) E.move(node, "translate", [[T - lead, px(o.dx || 0) + " " + px(o.dy || 0), SLAM], [T, "0px 0px"]]);
    hit(T, what, { el: node, check: "land", big: o.big });
  }
  /* a stamp slams down on T: from large, faster and faster, squashed flat on impact, then settles */
  function slam(node, T, rot, what, o) {
    o = o || {};
    E.move(node, "opacity", [[T - 0.16, 0], [T - 0.12, 1]]);
    E.move(node, "scale", [[T - 0.16, "1.9", SLAM], [T, "1", X.out], [T + 0.06, "1.08 0.9", X.soft], [T + 0.24, "1"]]);
    if (rot != null) E.move(node, "rotate", [[T - 0.16, rot + "deg"], [T, rot + "deg"]]);
    hit(T, what, { el: node, check: "land", big: o.big });
  }
  /* a light pulse on a downbeat, for decoration during a hold (never on the words being read) */
  function pulse(node, times, amt, what) {
    var keys = [];
    times.forEach(function (t) { keys.push([t - 0.05, "1", X.out], [t, String(1 + amt)], [t, String(1 + amt), X.soft], [t + 0.35, "1"]); });
    E.move(node, "scale", keys);
    times.forEach(function (t) { hit(t, "pulse " + what); });
  }
  function show(node, t) { E.set(node, "opacity", t, 0, 1); }
  function hide(node, t) { E.set(node, "opacity", t, 1, 0); }
  /* press into the shadow on T (and let go, unless it stays pressed) */
  function press(node, T, depth, shadowFrom, keep) {
    var dd = px(depth) + " " + px(depth);
    E.move(node, "translate", [[T - 0.08, "0px 0px", X.out], [T, dd]].concat(keep ? [] : [[T + 0.14, dd, X.pop], [T + 0.34, "0px 0px"]]));
    E.move(node, "boxShadow", [[T - 0.08, shadowFrom, X.out], [T, "0px 0px 0px transparent"]].concat(keep ? [] : [[T + 0.14, "0px 0px 0px transparent", X.pop], [T + 0.34, shadowFrom]]));
  }
  /* the finger's ring, touching down on T */
  function tapRing(ring, T) {
    E.move(ring, "opacity", [[T - 0.06, 0], [T - 0.02, 1], [T + 0.24, 1, X.out], [T + 0.46, 0]]);
    E.move(ring, "scale", [[T - 0.06, "0.35", X.out], [T + 0.46, "1.7"]]);
  }
  /* a scene arrives the way a page scrolls, and is fully in on the bar B; the old one slides up behind it */
  function scrollIn(scene, prev, B, d) {
    d = d || 0.5;
    E.move(scene, "translate", [[B - d, "0px " + px(H + 40), X.inout], [B, "0px 0px"]]);
    show(scene, B - d);
    if (prev) { E.move(prev, "translate", [[B - d, "0px 0px", X.inout], [B, "0px " + px(-Math.round(H * 0.38))]]); hide(prev, B); }
    hit(B, "scene " + scene.id + " in", { el: scene, check: "scene", big: true });
  }
  /* a scene opens as a circle with an ink ring, fully open on the bar B */
  function circleIn(scene, prev, B, d, cx, cy) {
    var c = " at " + px(cx) + " " + px(cy) + ")";
    var ring = el("div", "wipe-ring", stage);
    var R = Math.ceil(Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy))) + 20;
    E.move(scene, "clipPath", [[B - d, "circle(0px" + c, X.inout], [B, "circle(" + R + "px" + c]]);
    show(scene, B - d);
    at(ring, cx, cy);
    E.move(ring, "width", [[B - d, "0px", X.inout], [B, px(2 * R)]]);
    E.move(ring, "height", [[B - d, "0px", X.inout], [B, px(2 * R)]]);
    show(ring, B - d); hide(ring, B);
    if (prev) hide(prev, B);
    hit(B, "scene " + scene.id + " in", { el: scene, check: "circle", big: true });
  }
  /* a ring of the alarm clock: short shakes that start on the beats */
  function ring3(node, beats, amp) {
    var keys = [];
    beats.forEach(function (b) {
      keys.push([b, "0deg", X.soft]);
      for (var i = 1; i <= 5; i++) keys.push([b + i * 0.045, ((i % 2 ? 1 : -1) * amp * (1 - i / 6)) + "deg", X.soft]);
      keys.push([b + 0.3, "0deg"]);
    });
    E.move(node, "rotate", keys);
    beats.forEach(function (b) { hit(b, "clock rings"); });
  }
  function float(node, t0, t1, amp, period, phase) {
    var keys = [], n = Math.max(2, Math.round((t1 - t0) / (period / 2)));
    for (var i = 0; i <= n; i++) keys.push([t0 + (t1 - t0) * i / n, "0px " + px(((i + (phase || 0)) % 2 ? -1 : 1) * amp * (i === 0 || i === n ? 0 : 1)), X.soft]);
    return keys;
  }
  function sceneEl(id, bg) { var s = el("section", "scene " + bg, stage); s.id = id; return s; }
  function img(src, cls, parent, w, h) { var i = el("img", cls, parent); i.src = src; i.alt = ""; i.width = w; i.height = h || w; i.decoding = "sync"; return i; }
  function frameReady(f) {
    return new Promise(function (ok) {
      var go = function () { var d = f.contentDocument; if (d && d.readyState === "complete" && f.contentWindow.fillFrame) ok(); else setTimeout(go, 20); };
      go();
    });
  }

  /* ------------------------------------------------------------ the scenes, as markup */

  /* S1: every review, one place */
  var s1 = sceneEl("s1", "bg-yellow");
  var k1 = kinetic(s1, lines("s1"), { x: L.s1.k.x, y: L.s1.k.y, w: L.s1.k.w, max: L.s1.k.max, mk: "var(--pink)" });
  var band = el("div", "band", s1);
  band.style.top = px(L.s1.band.top);
  var cardsBox = el("div", "cards", s1);
  var cards = S.reviews.map(function (r) {
    var c = el("article", "snip c-" + r.c, cardsBox);
    c.innerHTML = '<div class="snip-top"><span class="snip-tag">' + S.example + '</span><span class="rate r' + r.stars + '">' + STAR + r.stars + '</span><span class="snip-where">' + r.venue + '</span></div>' +
      '<p class="snip-q' + (r.quiet ? " quiet" : "") + '"' + (r.lang ? ' lang="' + r.lang + '"' : "") + ">" + r.text + "</p>" +
      '<p class="snip-who"><span>' + r.who + '</span><span class="snip-src">' + r.src + "</span></p>";
    return c;
  });

  /* S2: one report every morning */
  var s2 = sceneEl("s2", "bg-blue edge");
  var k2 = kinetic(s2, lines("s2"), { x: L.s2.k.x, y: L.s2.k.y, w: L.s2.k.w, max: L.s2.k.max, cls: "on-blue", hl: "var(--yellow)" });
  var cup = img("img/3d/kave.png", "toy3d", s2, L.s2.cup[2]);
  at(cup, L.s2.cup[0], L.s2.cup[1]);
  var clock = img("img/3d/ebreszto.png", "toy3d", s2, L.s2.clock[2]);
  at(clock, L.s2.clock[0], L.s2.clock[1]);
  clock.style.transformOrigin = "55% 86%";
  var rw = el("div", "report-wrap", s2);
  rw.style.left = px(L.s2.report.left); rw.style.width = px(L.s2.report.w);
  var printer = el("div", "printer", rw);
  var clip = el("div", "paper-clip", rw);
  var R = S.report;
  var starsLine = function (a) {
    return '<p class="stars">' + [5, 4, 3, 2, 1].map(function (k, i) { return '<span class="s' + k + '">' + STAR + k + ": " + (k === 5 || k <= 2 ? "<b>" + a[i] + "</b>" : a[i]) + "</span>"; }).join("") + "</p>";
  };
  var report = el("div", "report", clip);
  report.style.width = px(L.s2.report.w);
  report.innerHTML =
    '<div class="report-head"><svg class="glyph" aria-hidden="true"><use href="#g-chart"/></svg><span class="report-title">' + R.title + "</span></div>" +
    '<p class="line" style="margin-top:4px"><svg class="glyph quiet" aria-hidden="true"><use href="#g-cal"/></svg><span class="muted sm">' + R.date + "</span></p><hr>" +
    R.venues.map(function (v) {
      return '<div class="venue"><p class="line"><svg class="glyph" aria-hidden="true"><use href="#g-pin"/></svg><span><b>' + v.name + "</b> · " + v.line + "</span>" + (v.neg ? '<span class="dot-neg" aria-hidden="true"></span>' : "") + "</p>" + starsLine(v.stars) + '<p class="google">' + v.google + "</p></div>";
    }).join("") +
    '<hr><p class="line"><b>' + R.total + "</b></p>" + starsLine(R.totalStars) +
    '<hr><p class="line"><svg class="glyph warn" aria-hidden="true"><use href="#g-warn"/></svg><span><b>' + R.unanswered + "</b> · " + R.unansweredN + "</span></p>" +
    R.un.map(function (u) {
      return '<div class="un"><p class="line"><span class="dot-neg" aria-hidden="true"></span><span>' + u.line + '<svg class="star-neg" aria-hidden="true"><use href="#g-star"/></svg> · ' + u.date + '</span></p><p class="quote">' + u.quote + "</p></div>";
    }).join("") +
    '<p class="report-time">' + R.time + "</p>";

  /* S3: one sentence tells you what needs doing (the phone runs the real Ma screen) */
  var s3 = sceneEl("s3", "bg-cyan edge");
  var k3 = kinetic(s3, lines("s3"), { x: L.s3.k.x, y: L.s3.k.y, w: L.s3.k.w, max: L.s3.k.max, mk: "var(--blue)" });
  var phone = el("div", "phone", s3);
  phone.innerHTML = '<div class="phone-body"><div class="phone-screen"><iframe title="" tabindex="-1" src="app/ma.html"></iframe></div></div>';
  var maFrame = phone.querySelector("iframe");
  var xt = el("div", "xtiles", s3);
  xt.style.width = px(L.s3.tiles[2]);
  var xtHead = el("p", "xt-head", xt);
  xtHead.innerHTML = S.app.period + "<span>" + S.app.periodDate + "</span>";
  var xtiles = S.app.tiles.map(function (tl, i) {
    var d = el("div", "xtile " + ["t-a", "t-b", "t-neg"][i], xt);
    d.innerHTML = '<span class="n">' + tl[0] + '</span><span class="l">' + tl[1] + "</span>";
    return d;
  });

  /* S4: read it, rewrite it if you need to, approve it (the real queue card, twice) */
  var s4 = sceneEl("s4", "bg-pink");
  var qstack = el("div", "qstack", s4);
  var deck = el("div", "deck", qstack);
  var backs = [0, 1, 2, 3].map(function () { return el("div", "dc", deck); });
  var q2 = el("div", "qcard", qstack); q2.innerHTML = '<iframe title="" tabindex="-1" src="app/reply.html"></iframe>';
  var q1 = el("div", "qcard", qstack); q1.innerHTML = '<iframe title="" tabindex="-1" src="app/reply.html"></iframe>';
  var k4 = kinetic(s4, lines("s4"), { x: L.s4.k.x, y: L.s4.k.y, w: L.s4.k.w, max: L.s4.k.max, hl: "var(--yellow)" });
  var stk4 = el("p", "sticker yellow", s4, S.s4sticker);
  var planes = [img("img/3d/papirrepulo.png", "toy3d", s4, 250)];
  var RS = 360, rstamps = [0, 1].map(function () { var r = img("img/svg/pecset.svg", "ill", s4, RS); r.style.transformOrigin = "52% 66%"; return r; });
  var toast = el("div", "toast", s4);
  toast.innerHTML = '<span class="toast-ic" aria-hidden="true"><svg class="ic"><use href="#i-check"/></svg></span><p class="toast-msg">' + S.queue.toast + '</p><span class="toast-undo"><svg class="ic" aria-hidden="true"><use href="#i-undo"/></svg>' + S.queue.undo + '</span><span class="toast-bar"></span>';
  var toastBar = toast.querySelector(".toast-bar");

  /* S5: nothing needs you today */
  var s5 = sceneEl("s5", "bg-green");
  var toy = el("div", "toy", s5);
  toy.style.width = px(L.s5.toy[2]);
  img("img/3d/bubble.png", "", toy, 800, 800);
  var bits = el("div", "bits", s5);
  var BITS = [["var(--yellow)", "round", -210, -160], ["var(--pink)", "", 130, -215], ["var(--cyan)", "pill", -262, -40], ["var(--lilac)", "round", -236, 96],
    ["var(--orange)", "", -150, 208], ["var(--blue)", "round", 120, 214], ["var(--paper)", "pill", -40, -258], ["var(--yellow)", "", 20, 262]];
  if (FMT === "v") BITS = [["var(--yellow)", "round", -220, -150], ["var(--pink)", "", 200, -170], ["var(--cyan)", "pill", -250, 20], ["var(--lilac)", "round", 236, 40],
    ["var(--orange)", "", -170, 190], ["var(--blue)", "round", 170, 200], ["var(--paper)", "pill", -40, -240], ["var(--yellow)", "", 40, 240]];
  var bitEls = BITS.map(function (b) { var d = el("span", "bit " + b[1], bits); d.style.setProperty("--c", b[0]); return d; });
  var done = el("p", "sticker", s5, S.done);
  done.style.font = "700 40px/1 var(--font-d)"; done.style.padding = "10px 24px 13px";
  var k5 = kinetic(s5, lines("s5"), { x: L.s5.k.x, y: L.s5.k.y || 0, w: L.s5.k.w, max: L.s5.k.max, hl: "var(--paper)" });

  /* S6: several venues in one account, side by side */
  var s6 = sceneEl("s6", "bg-orange edge");
  var stk6 = el("p", "sticker", s6, S.s6sticker);
  var k6 = kinetic(s6, lines("s6"), { x: L.s6.k.x, y: L.s6.k.y, w: L.s6.k.w, max: L.s6.k.max, mk: "var(--blue)" });
  var vday = el("p", "vday", s6, S.venuesDay);
  var vwrap = el("div", "vcards", s6);
  var vcards = S.venues.map(function (v) {
    var c = el("article", "vcard c-" + v.c, vwrap);
    var max = Math.max.apply(null, v.st.concat([1]));
    c.innerHTML = '<div class="vc-top"><span class="vc-pin"><img src="img/svg/terkeptu.svg" alt="" width="40" height="40"></span><span class="vc-name">' + v.name + "</span></div>" +
      '<div class="vc-big"><span class="vc-n">' + v.n + '</span><span class="vc-nw">' + v.nw + '</span><span class="vc-avg">' + v.avg + "</span></div>" +
      '<div class="vc-bars">' + [5, 4, 3, 2, 1].map(function (k, i) {
        return '<div class="vb s' + k + '"><span class="k">' + k + STAR + '</span><span class="track"><span class="fill" style="--w:' + (v.st[i] / max * 100) + '%"></span></span><span class="v">' + v.st[i] + "</span></div>";
      }).join("") + "</div>" +
      '<p class="vc-google">' + v.google + "</p>";
    return c;
  });

  /* S7: the lockup and one line */
  var s7 = sceneEl("s7", "bg-yellow edge");
  var lw = el("div", "lockup-wrap", s7);
  lw.style.top = px(L.s7.lockTop); lw.style.width = px(L.s7.lockW); lw.style.marginLeft = px(-L.s7.lockW / 2);
  lw.innerHTML = '<svg class="lockup" viewBox="0 0 760 131" role="img" aria-label="BistroTech" style="width:' + L.s7.lockW + 'px;height:' + Math.round(L.s7.lockW * 131 / 760) + 'px">' +
    '<g class="lk-mark"><g transform="translate(-8.1,-4.4) scale(6.2)"><path class="bt-mk" fill-rule="evenodd" d="M 4.01 13.41 A 8.5 8.5 0 1 1 6.31 16.82 L 2.6 20.4 Z M 7.2 14.6 V 11.8 A 1.2 1.2 0 0 1 9.6 11.8 V 14.6 Z M 10.8 14.6 V 9.8 A 1.2 1.2 0 0 1 13.2 9.8 V 14.6 Z M 14.4 14.6 V 7.8 A 1.2 1.2 0 0 1 16.8 7.8 V 14.6 Z"/></g></g>' +
    '<g class="lk-word"><g transform="translate(154,15)"><g class="bt-word">' +
    '<path d="M 6 6 V 94 M 6 6 H 30 A 22 22 0 0 1 30 50 H 6 M 6 50 H 30 A 22 22 0 0 1 30 94 H 6"/>' +
    '<path transform="translate(66,0)" d="M 7 34 V 94"/>' +
    '<path transform="translate(88,0)" d="M 44 47 C 44 37 35 34 25 34 C 15 34 6 37 6 47 C 6 57 16 60 25 64 C 34 68 44 71 44 81 C 44 91 35 94 25 94 C 15 94 6 91 6 81"/>' +
    '<path transform="translate(146,0)" d="M 22 14 V 82 A 12 12 0 0 0 34 94 M 6 34 H 38"/>' +
    '<path transform="translate(196,0)" d="M 6 94 V 52 A 18 18 0 0 1 24 34"/>' +
    '<circle transform="translate(230,0)" cx="36" cy="64" r="30"/>' +
    '<path transform="translate(306,0)" d="M 6 6 H 58 M 32 6 V 94"/>' +
    '<path transform="translate(372,0)" d="M 6 64 H 66 A 30 30 0 1 0 60.6 81.2"/>' +
    '<path transform="translate(452,0)" d="M 60.6 46.8 A 30 30 0 1 0 60.6 81.2"/>' +
    '<path transform="translate(532,0)" d="M 6 6 V 94 M 6 61 A 27 27 0 0 1 60 61 V 94"/>' +
    '</g><circle class="bt-dot" cx="73" cy="16" r="7"/></g></g></svg>';
  var lkMark = lw.querySelector(".lk-mark"), lkWord = lw.querySelector(".lk-word");
  var closing = el("p", "closing", s7);
  closing.style.top = px(L.s7.closeTop); closing.style.fontSize = px(L.s7.closeSize);
  var brk = FMT === "v" && S.v && S.v.s7break;
  S.s7.split(" ").forEach(function (w, i) {
    if (i && i === brk) closing.appendChild(document.createElement("br"));
    else if (i) closing.appendChild(document.createTextNode(" "));
    el("span", "w", closing, w);
  });
  var closeWords = Array.prototype.slice.call(closing.querySelectorAll(".w"));
  var caption = el("p", "caption", s7, S.caption);
  var stripes = el("div", "stripes", s7);

  /* QA only: a dot that flashes on every beat, bigger and yellow on the bar starts */
  var qaBeat = null, qaBar = null;
  if (QA) { qaBeat = el("span", "qa-dot qa-beat", stage); qaBar = el("span", "qa-dot qa-bar", stage); }

  /* ------------------------------------------------------------ the app screens, filled and measured */
  function flat(prefix, o, out) {
    out = out || {};
    Object.keys(o).forEach(function (k) { if (typeof o[k] === "string") out[prefix + k] = o[k]; });
    return out;
  }
  function fillMa() {
    var F = flat("app.", S.app);
    S.app.tabs.forEach(function (t, i) { F["app.tab" + i] = t; });
    F.lang = LANG;
    return maFrame.contentWindow.fillFrame(F, function (d) {
      var list = d.getElementById("band-list");
      var cls = ["snip-w", "snip-a", "snip-w", "snip-h", "snip-w", "snip-n", "snip-w", "snip-p"];
      list.innerHTML = S.reviews.slice(0, 8).map(function (r, i) {
        return '<li class="snip ' + cls[i] + '"><span class="snip-in"><span class="snip-top"><span class="rate r' + r.stars + '"><svg width="13" height="13" aria-hidden="true" focusable="false"><use href="#g-star"/></svg>' + r.stars + '</span><span class="snip-where">' + r.venue + '</span></span><span class="snip-q' + (r.quiet ? " snip-quiet" : "") + '">' + r.text + '</span><span class="snip-who">' + r.who + "</span></span></li>";
      }).join("");
    });
  }
  function fillReply(frame, n) {
    var C = S.queue.cards[n], Q = S.queue;
    var F = { lang: LANG, "q.i": String(n + 1), "q.of": Q.of, "q.venue": C.venue, "q.meta": C.meta, "q.google": Q.google, "q.review": C.review, "q.label": Q.label, "q.rewrite": Q.rewrite, "q.approve": Q.approve, "q.skip": Q.skip, "q.stamp": Q.stamp };
    return frame.contentWindow.fillFrame(F, function (d) {
      d.getElementById("q-stars").innerHTML = '<span class="glyphs" aria-hidden="true">' +
        [0, 1, 2, 3, 4].map(function (i) { return i < C.stars ? '<svg><use href="#g-star"/></svg>' : '<svg class="o"><use href="#g-star-o"/></svg>'; }).join("") +
        '</span><span class="num" aria-hidden="true">' + C.stars + "/5</span>";
      var pips = d.querySelectorAll(".pips li");
      for (var i = 0; i < n; i++) pips[i].className = "is-ok";
      pips[n].className = "is-cur";
      d.getElementById("chips").innerHTML = Q.chips.map(function (c) { return '<span class="chip">' + c + "</span>"; }).join("");
      var txt = d.getElementById("rb-text");
      C.draft.split("").forEach(function (ch) {
        if (ch === "\n") { txt.appendChild(d.createElement("br")); return; }
        var sp = d.createElement("span"); sp.className = "ch"; sp.textContent = ch; txt.appendChild(sp);
      });
      var alt = d.getElementById("rb-alt");
      if (C.warmer) C.warmer.split("\n").forEach(function (part, i) { if (i) alt.appendChild(d.createElement("br")); alt.appendChild(d.createTextNode(part)); });
      var bq = d.querySelector(".q-body");
      bq.style.position = "relative"; bq.style.zIndex = "0";
      var hb = d.createElement("span"); hb.className = "v-read";
      hb.style.cssText = "position:absolute;z-index:-1;left:-8px;right:-8px;top:-4px;bottom:-4px;border-radius:8px;background:var(--blk-hero);border:2px solid var(--blk-line);transform-origin:left center;opacity:0";
      bq.appendChild(hb);
    });
  }

  /* ------------------------------------------------------------ the timeline */
  function timeline(M) {
    var i;
    /* ===== S1: 0.0 to 6.0, the last three bars of the intro */
    CUR = "s1";
    landWords(k1, WORDS.s1[LANG]);
    hit(2.0, "marker under the last word");
    /* the cards land in pairs on the beats, like a table after service */
    var LAND = L.s1.land, FROM = L.s1.from;
    var CARD_T = [0.5, 1.5, 1.0, 2.5, 3.0, 0.5, 1.5, 3.0, 1.0, 2.5];
    cards.forEach(function (c, n) {
      var Ld = LAND[n], F = FROM[n], T = CARD_T[n];
      at(c, Ld[0], Ld[1]);
      E.move(c, "opacity", [[T - 0.4, 0], [T - 0.34, 1]]);
      E.move(c, "translate", [[T - 0.4, px(F[0]) + " " + px(F[1]), APPROACH], [T, "0px 0px", X.out],
        [T + 0.09, px(Math.round(-F[0] * 0.025)) + " " + px(Math.round(-F[1] * 0.025)), X.soft], [T + 0.3, "0px 0px"]].concat(float(c, T + 0.3, 3.75, 3, 1.0, n).slice(1)));
      E.move(c, "rotate", [[T - 0.4, (Ld[2] + (n % 2 ? 24 : -24)) + "deg", APPROACH], [T, Ld[2] + "deg", X.out], [T + 0.12, (Ld[2] + (n % 2 ? -2 : 2)) + "deg", X.soft], [T + 0.32, Ld[2] + "deg"]]);
      hit(T, "card " + (n + 1) + " lands", { el: c, check: "card" });
    });
    /* one place: the band lands on the bar at 4.0, every card takes its seat on the beat at 4.5, the band runs */
    E.move(band, "translate", [[3.6, "0px " + px(H - L.s1.band.top + 20), SLAM], [4.0, "0px 0px", X.out], [4.08, "0px 6px", X.soft], [4.25, "0px 0px"]]);
    hit(4.0, "band lands", { el: band, check: "scene", big: true });
    var B = L.s1.band, RUN0 = 4.5, RUN1 = 6.0, SPEED = 95;
    cards.forEach(function (c, n) {
      var Ld = LAND[n];
      var bx = B.x0 + n * B.slot - Ld[0], by = B.y + (n % 2 ? 6 : 0) - Ld[1];
      var r = n % 2 ? 1.3 : -1.6;
      E.move(c, "translate", [[3.95, "0px 0px", X.inout], [4.5, px(bx) + " " + px(by), X.lin], [RUN1, px(Math.round(bx - SPEED * (RUN1 - RUN0))) + " " + px(by)]]);
      E.move(c, "rotate", [[3.95, Ld[2] + "deg", X.inout], [4.5, r + "deg"]]);
    });
    hit(4.5, "cards seated in the band", { big: false });

    /* ===== S2: 6.0 to 12.0, the groove */
    CUR = "s2";
    scrollIn(s2, s1, SC.s2);
    landWords(k2, WORDS.s2[LANG]);
    landIn(clock, 6.5, "alarm clock", { from: 0.2, rot: -30 });
    ring3(clock, [7.0, 7.5, 8.0], 7);
    E.move(printer, "scale", [[6.28, "0 1", SLAM], [6.5, "1 1", X.out], [9.8, "1 1", X.inn], [10.0, "1 0"]]);
    show(printer, 6.28); hide(printer, 10.0);
    hit(6.5, "printer slot");
    /* the report prints in eighth notes: ten steps from 7.5 to 10.0 */
    var RH = M.reportH;
    E.move(clip, "clipPath", [[7.5, "inset(0px -30px " + px(RH + 40) + " -10px)", "steps(10, end)"], [10.0, "inset(0px -30px -40px -10px)"], [10.02, "inset(-400px -400px -400px -400px)"]]);
    show(report, 7.5);
    E.move(report, "translate", [[7.5, "0px -30px", X.lin], [10.0, "0px 0px"], [10.0, "0px 0px", X.pop], [10.3, "0px 10px"],
      [11.0, "0px 5px", X.soft], [11.5, "0px 10px"]]);
    E.move(report, "rotate", [[9.82, "0deg", SLAM], [10.0, "1.4deg", X.out], [10.12, "2.4deg", X.soft], [10.3, "2deg"]]);
    hit(10.0, "report torn off and down", { el: report, big: true });
    landIn(cup, 10.5, "coffee cup", { from: 0.25, rot: 22, dy: 60 });
    pulse(clock, [10.0], 0.03, "clock");

    /* ===== S3: 12.0 to 18.0 */
    CUR = "s3";
    scrollIn(s3, s2, SC.s3);
    landWords(k3, WORDS.s3[LANG]);
    E.move(phone, "translate", [[12.0, "0px " + px(H - M.phoneTop + 40), APPROACH], [12.5, "0px 0px", X.out], [12.6, "0px -8px", X.soft], [12.8, "0px 0px"]].concat(float(phone, 15.0, 17.3, 5, 2.0, 1).slice(1)));
    E.move(phone, "rotate", [[12.0, "9deg", APPROACH], [12.5, M.phoneRot + "deg"]]);
    hit(12.5, "phone lands", { el: phone, check: "card" });
    var D = M.ma;
    landIn(D.date, 13.0, "app: date sticker", { from: 0.3, rot: -18, to: 0 });
    E.move(D.hello1, "opacity", [[13.3, 0], [13.42, 1]]);
    E.move(D.hello1, "translate", [[13.3, "0px 14px", X.out], [13.5, "0px 0px"]]);
    E.move(D.hello2, "opacity", [[13.3, 0], [13.42, 1]]);
    E.move(D.hello2, "translate", [[13.3, "0px 18px", SLAM], [13.5, "0px 0px", X.out], [13.6, "0px -3px", X.soft], [13.75, "0px 0px"]]);
    E.move(D.mark, "scale", [[13.35, "0.85 0.6", X.out], [13.5, "1 1"]]);
    hit(13.5, "app: greeting", { el: D.hello2, check: "land" });
    landIn(D.art, 13.5, "app: cup", { from: 0.3, rot: -30, to: 0 });
    E.move(D.card, "opacity", [[13.8, 0], [13.9, 1]]);
    E.move(D.card, "translate", [[13.8, "0px 40px", SLAM], [14.0, "0px 0px", X.out], [14.1, "0px -4px", X.soft], [14.3, "0px 0px"]]);
    hit(14.0, "app: the day's card", { el: D.card, check: "land", big: true });
    landIn(D.badge, 14.5, "app: badge 6", { from: 0.2 });
    landIn(xtHead, 15.0, "tiles: yesterday", { from: 0.6, dx: -60 });
    xtiles.forEach(function (tl, n) {
      var T = 15.5 + n * 0.5;
      E.move(tl, "opacity", [[T - 0.3, 0], [T - 0.24, 1]]);
      E.move(tl, "translate", [[T - 0.3, px(-240) + " " + px(120 - n * 150), APPROACH], [T, "0px 0px"]].concat(float(tl, T + 0.2, 17.4, 4, 1.0, n).slice(1)));
      E.move(tl, "scale", [[T - 0.3, "0.3", APPROACH], [T, "1", X.out], [T + 0.08, "1.05 0.95", X.soft], [T + 0.26, "1"]]);
      hit(T, "tile " + S.app.tiles[n][0], { el: tl, check: "land", big: T === 16.0 });
    });
    /* the tap on "Válasz átnézése" on the beat, and the pink comes out of the button, open on the bar */
    tapRing(D.tap, 17.0);
    press(D.btn, 17.0, 4, "4px 4px 0px " + M.ma.btnShadow, false);
    hit(17.0, "tap: Válasz átnézése");

    /* ===== S4: 18.0 to 26.0 */
    CUR = "s4";
    circleIn(s4, null, SC.s4, 0.5, M.btnX, M.btnY);
    hide(s3, SC.s4);
    var t4 = 18.5;
    E.move(qstack, "opacity", [[t4 - 0.3, 0], [t4 - 0.24, 1]]);
    E.move(qstack, "translate", [[t4 - 0.3, "0px 90px", SLAM], [t4, "0px 0px", X.out], [t4 + 0.1, "0px -6px", X.soft], [t4 + 0.3, "0px 0px"]]);
    E.move(qstack, "rotate", [[t4 - 0.3, "-6deg", SLAM], [t4, "0deg"]]);
    hit(t4, "the stack of six lands", { el: qstack, check: "card" });
    E.move(q1, "rotate", [[t4, "-1deg"], [t4, "-1deg"]]);
    E.move(q2, "rotate", [[t4, "2.2deg"], [t4, "2.2deg"]]);
    E.move(q2, "translate", [[t4, "10px 10px"], [t4, "10px 10px"]]);
    backs.forEach(function (b, n) {
      E.move(b, "rotate", [[t4, (n % 2 ? -2.6 : 3.4) + "deg"], [t4, (n % 2 ? -2.6 : 3.4) + "deg"]]);
      E.move(b, "translate", [[t4, px(12 + n * 5) + " " + px(14 + n * 4)], [t4, px(12 + n * 5) + " " + px(14 + n * 4)]]);
    });
    landWords(k4, WORDS.s4[LANG]);
    landIn(stk4, 19.5, "sticker: you approve every reply", { from: 0.3, rot: -20, to: 3 });
    var A = M.r1, Bq = M.r2;
    /* read: the highlighter behind the review, landing with the word */
    E.move(A.read, "opacity", [[18.8, 0], [18.84, 1]]);
    E.move(A.read, "scale", [[18.8, "0 1", X.out], [19.0, "1 1"]]);
    hit(19.0, "highlighter on the review");
    /* the reply writes itself, from 19.25 to 20.35 */
    var T0 = 19.25, CPS = A.chars.length / 1.1;
    A.chars.forEach(function (c, n) { E.set(c, "opacity", T0 + n / CPS, 0, 1); });
    var caretKeys = [[18.9, px(A.caret0[0]) + " " + px(A.caret0[1]), X.hold]];
    A.caret.forEach(function (p, n) { caretKeys.push([T0 + n / CPS, px(p[0]) + " " + px(p[1]), X.hold]); });
    E.move(A.caretEl, "translate", caretKeys);
    var TE = T0 + A.chars.length / CPS;
    E.move(A.caretEl, "opacity", [[18.9, 1, X.hold], [19.05, 0, X.hold], [19.2, 1, X.hold], [TE + 0.2, 0, X.hold], [TE + 0.4, 1, X.hold], [TE + 0.6, 0]]);
    /* rewrite it if you need to: the chip is pressed on the beat, the new text lands on the next half beat */
    tapRing(A.tap2, 21.0);
    var chip = A.chip;
    E.move(chip, "translate", [[20.92, "0px 0px", X.out], [21.0, "3px 3px"]]);
    E.move(chip, "boxShadow", [[20.92, "3px 3px 0px " + A.ink, X.out], [21.0, "0px 0px 0px transparent"]]);
    E.move(chip, "backgroundColor", [[20.92, A.paper], [21.0, A.ink]]);
    E.move(chip, "color", [[20.92, A.ink], [21.0, A.paper]]);
    hit(21.0, "chip Melegebb pressed");
    E.move(A.text, "opacity", [[21.05, 1, X.inn], [21.2, 0]]);
    E.move(A.text, "translate", [[21.05, "0px 0px", X.inn], [21.2, "0px -10px"]]);
    E.move(A.alt, "opacity", [[21.25, 0, X.out], [21.4, 1]]);
    E.move(A.alt, "translate", [[21.25, "0px 12px", SLAM], [21.5, "0px 0px"]]);
    hit(21.5, "the warmer reply lands", { el: A.alt, check: "land" });
    E.move(A.swap, "opacity", [[21.1, 0], [21.2, 1], [22.0, 1, X.soft], [22.5, 0]]);
    E.move(A.rwNow, "opacity", [[21.35, 0], [21.5, 1]]);
    /* approve it: the stamp prints on the downbeat 22.0, with the word */
    tapRing(A.tap, 21.8);
    press(A.approve, 21.8, 4, "4px 4px 0px " + A.ink, true);
    rubber(0, 22.0, M.stampAt, A.stamp);
    E.move(A.pip0, "backgroundColor", [[22.0, A.cur], [22.0, A.okc]]);
    E.move(A.pip0, "scale", [[22.0, "1", X.pop], [22.3, "0.8333"]]);
    E.move(toast, "translate", [[22.28, "0px 160px", SLAM], [22.5, "0px 0px", X.out], [22.6, "0px -5px", X.soft], [22.75, "0px 0px"]]);
    show(toast, 22.28);
    hit(22.5, "undo bar rises", { el: toast, check: "land" });
    E.move(toastBar, "scale", [[22.5, "1 1", X.lin], [25.5, "0.625 1"], [25.5, "1 1", X.lin], [26.0, "0.94 1"]]);
    /* the reply goes out: the paper plane takes off on the downbeat 24.0 */
    plane(planes[0], 24.0, M.stampAt);
    /* the next one: the card goes, the one under it comes up on 25.0, and is stamped on 25.5 */
    E.move(q1, "translate", [[24.35, "0px 0px", X.inn], [24.75, "-880px 90px"]]);
    E.move(q1, "rotate", [[24.35, "-1deg", X.inn], [24.75, "-14deg"]]);
    hide(q1, 24.75);
    E.move(q2, "translate", [[24.6, "10px 10px", SLAM], [25.0, "0px 0px", X.out], [25.1, "-3px -3px", X.soft], [25.25, "0px 0px"]]);
    E.move(q2, "rotate", [[24.6, "2.2deg", SLAM], [25.0, "-1deg"]]);
    hit(25.0, "the next card comes up", { el: q2, check: "card" });
    E.move(Bq.read, "opacity", [[24.8, 0], [24.84, 1]]);
    E.move(Bq.read, "scale", [[24.8, "0 1", X.out], [25.0, "1 1"]]);
    tapRing(Bq.tap, 25.3);
    press(Bq.approve, 25.3, 4, "4px 4px 0px " + Bq.ink, true);
    rubber(1, 25.5, M.stampAt, Bq.stamp);
    E.move(Bq.pip1, "backgroundColor", [[25.5, Bq.cur], [25.5, Bq.okc]]);
    E.move(Bq.pip1, "scale", [[25.5, "1", X.pop], [25.8, "0.8333"]]);

    /* ===== S5: 26.0 to 32.0 */
    CUR = "s5";
    circleIn(s5, s4, SC.s5, 0.5, M.stampAt[0], M.stampAt[1]);
    landIn(toy, 26.5, "the 3D bubble", { from: 0.2, rot: -18, lead: 0.3 });
    E.move(toy, "translate", [[26.8, "0px 0px"]].concat(float(toy, 26.8, 31.6, 7, 2.0, 0).slice(1)));
    landWords(k5, WORDS.s5[LANG]);
    slam(done, 28.0, -6, "the kész stamp", { big: true });
    bitEls.forEach(function (b, n) {
      var B2 = BITS[n], T = 28.0;
      at(b, M.toyC[0], M.toyC[1]);
      E.move(b, "opacity", [[T - 0.05, 0], [T, 1]]);
      E.move(b, "translate", [[T, "0px 0px", X.out], [T + 0.7, px(B2[2]) + " " + px(B2[3])], [T + 3.2, px(Math.round(B2[2] * 1.12)) + " " + px(Math.round(B2[3] * 1.12 + 14)), X.soft]]);
      E.move(b, "rotate", [[T, "0deg", X.out], [T + 0.7, (n % 2 ? 160 : -140) + "deg"], [T + 3.2, (n % 2 ? 200 : -180) + "deg"]]);
      E.move(b, "scale", [[T - 0.05, "0", X.pop], [T + 0.4, "1"]]);
    });
    hit(28.0, "the burst");
    pulse(done, [30.0], 0.03, "the kész stamp");

    /* ===== S6: 32.0 to 38.0 */
    CUR = "s6";
    scrollIn(s6, s5, SC.s6);
    landIn(stk6, 32.5, "sticker: for groups", { from: 0.3, rot: -24, to: -4 });
    landWords(k6, WORDS.s6[LANG]);
    E.move(vday, "opacity", [[33.8, 0], [33.9, 1]]);
    E.move(vday, "translate", [[33.8, "-20px 0px", X.out], [34.0, "0px 0px"]]);
    hit(34.0, "the day line", { el: vday, check: "land" });
    vcards.forEach(function (c, n) {
      var T = 34.0 + n * 0.5;
      E.move(c, "opacity", [[T - 0.4, 0], [T - 0.34, 1]]);
      E.move(c, "translate", [[T - 0.4, FMT === "v" ? "760px 0px" : "0px 420px", APPROACH], [T, "0px 0px", X.out],
        [T + 0.1, FMT === "v" ? "-12px 0px" : "0px -8px", X.soft], [T + 0.3, "0px 0px"]].concat(float(c, T + 0.6, 37.4, 3, 1.0, n).slice(1)));
      E.move(c, "rotate", [[T - 0.4, (FMT === "v" ? 10 : (n - 1) * 8) + "deg", APPROACH], [T, [-1.2, 0.8, -0.6][n] + "deg"]]);
      hit(T, "venue card " + S.venues[n].name, { el: c, check: "card" });
      landIn(c.querySelector(".vc-pin"), T + 0.5, "pin " + (n + 1), { from: 0.2, rot: -40 });
      Array.prototype.forEach.call(c.querySelectorAll(".fill"), function (f, j) {
        E.move(f, "scale", [[35.5 + j * 0.05, "0 1", X.out], [36.0 + j * 0.05, "1 1"]]);
      });
    });
    hit(36.0, "the star bars fill");
    pulse(stk6, [36.0], 0.03, "sticker");

    /* ===== S7: 38.0 to 44.0 */
    CUR = "s7";
    scrollIn(s7, s6, SC.s7);
    M.stripeEls.forEach(function (s, n) {
      var T = 39.0 + Math.floor(n / 2) * 0.5;
      E.move(s, "translate", [[T - 0.2, "0px 60px", SLAM], [T, "0px 0px", X.out], [T + 0.08, "0px 3px", X.soft], [T + 0.22, "0px 0px"]]);
    });
    hit(39.0, "stripes 1 and 2"); hit(39.5, "stripes 3 and 4"); hit(40.0, "stripes 5 and 6");
    /* the lockup lands with the scene on the phrase line 38.0: the mark in 2D (scale and fade only), the
       wordmark slides in on the next beat; the line lands on the downbeat 40.0 */
    E.move(lkMark, "opacity", [[37.78, 0], [37.86, 1]]);
    E.move(lkMark, "scale", [[37.78, "0.3", SLAM], [38.0, "1", X.out], [38.1, "1.04", X.soft], [38.3, "1"], [41.95, "1", X.out], [42.0, "1.02", X.soft], [42.35, "1"]]);
    hit(38.0, "the lockup: the mark", { el: lkMark, check: "lockup", big: true });
    hit(42.0, "pulse the mark");
    E.move(lkWord, "opacity", [[38.22, 0], [38.32, 1]]);
    E.move(lkWord, "translate", [[38.22, "-40px 0px", SLAM], [38.5, "0px 0px"]]);
    hit(38.5, "the lockup: the wordmark", { el: lkWord, check: "card" });
    landWords({ words: closeWords }, WORDS.s7[LANG]);
    E.move(caption, "opacity", [[40.3, 0], [40.5, 1]]);
    hit(40.5, "caption");

    /* QA: the beat dot */
    if (QA) {
      var bk = [], bb = [];
      for (var b = 0; b < TOTAL; b += BEAT) {
        bk.push([b, "1.9", X.out], [b + 0.2, "1"]);
        if (Math.abs(b / BAR - Math.round(b / BAR)) < 1e-6) bb.push([b, "1", X.out], [b, "2.2", X.out], [b + 0.3, "1"]);
      }
      E.move(qaBeat, "scale", bk);
      E.move(qaBar, "scale", bb);
    }
  }

  /* the rubber stamp comes down (from 0.22 s before T), prints the mark on T, squashes, lifts away */
  function rubber(i, T, p, mark) {
    var r = rstamps[i];
    at(r, p[0] - RS * 126 / 240, p[1] - RS * 158 / 240 + 8);
    E.move(r, "opacity", [[T - 0.22, 0], [T - 0.18, 1], [T + 0.42, 1], [T + 0.5, 0]]);
    E.move(r, "translate", [[T - 0.22, "80px -520px", X.inn], [T, "0px 0px"], [T + 0.05, "0px 8px", X.out], [T + 0.12, "0px 0px"], [T + 0.16, "0px 0px", X.inn], [T + 0.5, "160px -560px"]]);
    E.move(r, "rotate", [[T - 0.22, "16deg", X.inn], [T, "2deg"], [T + 0.16, "2deg", X.inn], [T + 0.5, "22deg"]]);
    E.move(r, "scale", [[T, "1", X.out], [T + 0.05, "1.05 0.9"], [T + 0.14, "1"]]);
    E.move(mark, "opacity", [[T, 0], [T, 1]]);
    E.move(mark, "scale", [[T, "1.16", X.pop], [T + 0.28, "1"]]);
    E.move(mark, "rotate", [[T, "-8deg"], [T + 0.28, "-8deg"]]);
    hit(T, "Jóváhagyva stamp " + (i + 1), { el: r, check: "stamp", big: i === 0 });
  }
  /* the paper plane: in place and full size on T, then away up and to the right */
  function plane(pl, T, p) {
    at(pl, p[0] - 125, p[1] - 150);
    E.move(pl, "opacity", [[T - 0.18, 0], [T - 0.12, 1], [T + 0.78, 1], [T + 0.82, 0]]);
    E.move(pl, "scale", [[T - 0.18, "0.3", SLAM], [T, "1", X.lin], [T + 0.82, "0.8"]]);
    E.move(pl, "rotate", [[T - 0.18, "-24deg", SLAM], [T, "0deg", X.lin], [T + 0.82, "6deg"]]);
    E.move(pl, "translate", [[T - 0.18, "0px 0px"], [T, "0px 0px", X.inn], [T + 0.3, "150px -110px", X.lin], [T + 0.82, FMT === "v" ? "520px -760px" : "760px -560px"]]);
    hit(T, "paper plane takes off", { el: pl, check: "plane", big: true });
  }

  /* ------------------------------------------------------------ measure, then build */
  function measure() {
    [k1, k2, k3, k4, k5, k6].forEach(function (k) { k.fit(); });
    var bottomOf = function (k) { return k.box.offsetTop + k.box.offsetHeight; };

    /* S2: the report under the words in 9:16, beside them in 16:9; a long one is set a little smaller */
    var rTop = FMT === "v" ? bottomOf(k2) + 40 : L.s2.report.top;
    rw.style.top = px(rTop);
    var reportH = report.offsetHeight;
    var avail = (FMT === "v" ? SAFE_BOTTOM - 44 : 720 - 30) - rTop - 13;
    if (reportH > avail) { rw.style.scale = String(avail / reportH); rw.style.transformOrigin = "50% 0"; }

    /* S3: the phone and the three tiles */
    var phTop = FMT === "v" ? bottomOf(k3) + 28 : L.s3.phone[1];
    at(phone, L.s3.phone[0], phTop);
    at(xt, L.s3.tiles[0], FMT === "v" ? phTop + 22 : L.s3.tiles[1]);

    /* S4: the stack of cards and where the stamp lands */
    var f1 = q1.querySelector("iframe"), cr1 = f1.contentDocument.querySelector(".queue-detail").getBoundingClientRect();
    var cardH = cr1.top + cr1.height + 10;
    var QS, qx, qy;
    if (FMT === "v") {
      qy = bottomOf(k4) + 38;
      QS = Math.min(0.94, 624 / 680, (SAFE_BOTTOM - qy) / cardH);
      qx = Math.round((W - 680 * QS) / 2);
    } else { qx = L.s4.stack[0]; qy = L.s4.stack[1]; QS = L.s4.stack[2]; }
    at(qstack, qx, qy); qstack.style.scale = String(QS);
    deck.style.left = px(cr1.left); deck.style.top = px(cr1.top); deck.style.width = px(cr1.width); deck.style.height = px(cr1.height);
    var stp = f1.contentDocument.getElementById("stamp").getBoundingClientRect();
    var stampAt = [Math.round(qx + (stp.left + stp.width / 2) * QS), Math.round(qy + (stp.top + stp.height / 2) * QS)];
    if (FMT === "v") {
      at(stk4, Math.round(qx + (cr1.left + cr1.width) * QS - stk4.offsetWidth + 10), Math.max(bottomOf(k4) + 8, Math.round(qy + cr1.top * QS - stk4.offsetHeight + 12)));
      toast.style.left = px(Math.round((W - toast.offsetWidth) / 2)); toast.style.marginLeft = "0";
      toast.style.bottom = "auto"; toast.style.top = px(SAFE_BOTTOM - toast.offsetHeight - 18);
    } else {
      at(stk4, 754, bottomOf(k4) + 34);
      toast.style.left = "auto"; toast.style.right = "44px"; toast.style.bottom = "34px"; toast.style.marginLeft = "0";
    }

    /* S5: the headline beside the bubble in 16:9, above it in 9:16 */
    var toyW = L.s5.toy[2], toyX, toyY;
    if (FMT === "v") {
      toyX = L.s5.toy[0]; toyY = bottomOf(k5) + 6;
      at(done, toyX - 34, toyY + 92);
    } else {
      k5.box.style.top = px(Math.round(360 - k5.box.offsetHeight / 2));
      toyX = L.s5.toy[0]; toyY = L.s5.toy[1];
      at(done, L.s5.done[0], L.s5.done[1]);
    }
    at(toy, toyX, toyY);
    var toyC = [toyX + Math.round(toyW * 0.5), toyY + Math.round(toyW * 0.46)];

    /* S6: the sticker, the date line and the cards under the headline */
    at(stk6, L.s6.sticker[0], L.s6.sticker[1]);
    var k6b = bottomOf(k6);
    vday.style.left = px(L.s6.k.x); vday.style.top = px(k6b + (FMT === "v" ? 18 : 24));
    vwrap.style.left = px(FMT === "v" ? 48 : 60); vwrap.style.top = px(k6b + (FMT === "v" ? 54 : 64));

    /* S7 stripes: the scene colours, the way the website stacks its blocks */
    var cols = ["var(--blue)", "var(--cyan)", "var(--pink)", "var(--green)", "var(--orange)", "var(--lilac)"];
    var stripeEls = cols.map(function (c, n) {
      var s = el("span", "", stripes);
      s.style.cssText = "position:absolute;bottom:0;height:" + (FMT === "v" ? 34 : 26) + "px;border-top:3px solid var(--ink);border-left:" + (n ? "3px solid var(--ink)" : "0") + ";background:" + c + ";left:" + (n * 100 / 6) + "%;width:" + (100 / 6) + "%";
      return s;
    });
    if (FMT === "v") { caption.style.top = px(SAFE_BOTTOM - 64); caption.style.bottom = "auto"; caption.style.padding = "0 48px"; }
    else caption.style.bottom = "50px";

    /* the Ma screen inside the phone */
    var md = maFrame.contentDocument;
    var btn = md.querySelector("[data-go-btn]");
    var tap = md.createElement("span"); tap.className = "v-tap"; md.body.appendChild(tap);
    var br = btn.getBoundingClientRect();
    var bx = br.left + br.width / 2, by = br.top + br.height / 2;
    tap.style.left = px(bx); tap.style.top = px(by);
    var cs = maFrame.contentWindow.getComputedStyle(btn);
    var ma = {
      date: md.querySelector(".stk-date"), hello1: md.querySelector(".hello-1"), hello2: md.querySelector(".hello-2"),
      mark: md.querySelector("mark.hl"), art: md.querySelector(".art-ma .ill"), card: md.querySelector(".day-card"),
      badge: md.querySelector(".tab-badge"), btn: btn, tap: tap,
      btnShadow: cs.boxShadow.replace(/^(rgb[^)]*\)).*$/, "$1")
    };
    var phoneRot = 2;
    var sc = 290 / 390, offX = 16, offY = 16;
    var pl = phone.offsetLeft, pt = phone.offsetTop, pw = phone.offsetWidth, ph = phone.offsetHeight;
    var x0 = pl + offX + bx * sc, y0 = pt + offY + by * sc;
    var cx = pl + pw / 2, cy = pt + ph / 2, a = phoneRot * Math.PI / 180;
    var btnX = Math.round(cx + (x0 - cx) * Math.cos(a) - (y0 - cy) * Math.sin(a));
    var btnY = Math.round(cy + (x0 - cx) * Math.sin(a) + (y0 - cy) * Math.cos(a));

    function replyParts(frame, n) {
      var d = frame.contentDocument, w = frame.contentWindow;
      var box = d.getElementById("reply-box"), text = d.getElementById("rb-text"), alt = d.getElementById("rb-alt");
      var h = Math.max(text.offsetHeight, alt.offsetHeight || 0);
      box.style.minHeight = px(h + 30);
      var chars = Array.prototype.slice.call(d.querySelectorAll("#rb-text .ch"));
      var bb = box.getBoundingClientRect();
      var caret = chars.map(function (c) { var r = c.getBoundingClientRect(); return [Math.round(r.right - bb.left - 2), Math.round(r.top - bb.top - 2)]; });
      var f = chars[0].getBoundingClientRect();
      var caret0 = [Math.round(f.left - bb.left - 3), Math.round(f.top - bb.top - 2)];
      var approve = d.getElementById("approve");
      var tapA = d.getElementById("tap");
      var ar = approve.getBoundingClientRect(), cr = d.querySelector(".queue-detail").getBoundingClientRect();
      tapA.style.left = px(ar.left - cr.left + ar.width / 2); tapA.style.top = px(ar.top - cr.top + ar.height / 2);
      var chipEl = d.querySelectorAll("#chips .chip")[1];
      var tap2 = tapA.cloneNode(); tapA.parentNode.appendChild(tap2);
      var chr = chipEl.getBoundingClientRect();
      tap2.style.left = px(chr.left - cr.left + chr.width / 2); tap2.style.top = px(chr.top - cr.top + chr.height / 2);
      if (n === 0) d.getElementById("rw-now").textContent = S.queue.chips[1];
      var root = w.getComputedStyle(d.documentElement);
      var pips = d.querySelectorAll(".pips li");
      return {
        chars: n === 0 ? chars : [], caret: caret, caret0: caret0, caretEl: d.getElementById("caret"), text: text, alt: alt,
        swap: d.querySelector(".swap-bg"), rwNow: d.getElementById("rw-now"), chip: chipEl, approve: approve,
        stamp: d.getElementById("stamp"), tap: tapA, tap2: tap2, read: d.querySelector(".v-read"),
        pip0: pips[0], pip1: pips[1],
        ink: root.getPropertyValue("--fg").trim(), paper: root.getPropertyValue("--card").trim(),
        cur: root.getPropertyValue("--sec-rep").trim(), okc: root.getPropertyValue("--blk-pos").trim()
      };
    }
    var r1 = replyParts(f1, 0);
    var r2 = replyParts(q2.querySelector("iframe"), 1);
    r1.chars.forEach(function (c) { c.style.opacity = "0"; });
    return { reportH: reportH, ma: ma, btnX: btnX, btnY: btnY, phoneRot: phoneRot, phoneTop: phTop, r1: r1, r2: r2,
      stripeEls: stripeEls, stampAt: stampAt, toyC: toyC };
  }

  /* ------------------------------------------------------------ checks the tools read */
  function onGrid(t) { var k = Math.round(t / BEAT); return Math.abs(t - k * BEAT) <= 1 / FPS - 1e-9; }
  window.__hits = function () {
    return HITS.map(function (h) { return { scene: h.scene, t: h.t, what: h.what, big: h.big, onGrid: onGrid(h.t), downbeat: Math.abs(h.t / BAR - Math.round(h.t / BAR)) < 1e-6 }; });
  };
  /* at each hit's own frame: is the thing where it lands? (the frame the move is keyed to land on) */
  window.__keys = function () { return E.dump(); };
  window.__verifyHits = function () {
    var out = [];
    HITS.forEach(function (h) {
      if (!h.el || !h.check) return;
      E.seek(Math.round(h.t * 1000));
      var cs = h.el.ownerDocument.defaultView.getComputedStyle(h.el);
      var sc = cs.scale === "none" ? "1" : cs.scale, tr = cs.translate === "none" ? "0px" : cs.translate, op = Number(cs.opacity);
      var ok = true, why = "";
      var scale1 = function () { return sc.split(" ").every(function (v) { return Math.abs(parseFloat(v) - 1) < 0.002; }); };
      var at0 = function () { return tr.split(" ").every(function (v) { return Math.abs(parseFloat(v)) < 0.6; }); };
      if (h.check === "word" || h.check === "land") { ok = scale1() && at0() && op > 0.99; why = "scale " + sc + ", translate " + tr + ", opacity " + op; }
      else if (h.check === "card" || h.check === "scene" || h.check === "stamp") { ok = at0() && op > 0.99; why = "translate " + tr + ", opacity " + op; }
      else if (h.check === "circle") { ok = /circle\((\d{3,})px/.test(cs.clipPath); why = cs.clipPath.slice(0, 40); }
      else if (h.check === "plane" || h.check === "lockup") { ok = scale1() && op > 0.99; why = "scale " + sc + ", opacity " + op; }
      out.push({ scene: h.scene, t: h.t, what: h.what, ok: ok, why: why });
    });
    return out;
  };

  /* ------------------------------------------------------------ start */
  var frames = [maFrame, q1.querySelector("iframe"), q2.querySelector("iframe")];
  var ready = Promise.all(frames.map(frameReady))
    .then(function () { return Promise.all([fillMa(), fillReply(frames[1], 0), fillReply(frames[2], 1)]); })
    .then(function () { return document.fonts.ready; })
    .then(function () {
      var imgs = Array.prototype.slice.call(document.images);
      frames.forEach(function (f) { imgs = imgs.concat(Array.prototype.slice.call(f.contentDocument.images)); });
      return Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
    })
    .then(function () {
      var M = measure();
      [s2, s3, s4, s5, s6, s7].forEach(function (s) { s.style.opacity = "0"; });
      timeline(M);
      var n = E.build(TOTAL);
      E.seek(0);
      window.__duration = E.T;
      window.__count = n;
      window.__format = FMT;
      return n;
    });
  window.__ready = ready;
  window.__seek = function (ms) { E.seek(ms); };

  /* ------------------------------------------------------------ the player */
  if (RENDER) return;
  var vp = document.getElementById("viewport");
  function fitStage() { stage.style.transform = "scale(" + (vp.clientWidth / W) + ")"; }
  window.addEventListener("resize", fitStage);
  fitStage();
  var playBtn = document.getElementById("play"), scrub = document.getElementById("scrub"), time = document.getElementById("time");
  var playing = false, t0 = 0, pos = 0, raf = 0;
  var fmt = function (ms) { var s = (ms / 1000).toFixed(1); return LANG === "hu" ? s.replace(".", ",") : s; };
  function paint(ms) { pos = ms; E.seek(ms); scrub.value = String(Math.round(ms)); time.textContent = fmt(ms) + " / " + fmt(E.T); }
  function loop(now) {
    var ms = now - t0;
    if (ms >= E.T) { paint(E.T); setPlaying(false); return; }
    paint(ms);
    raf = requestAnimationFrame(loop);
  }
  function setPlaying(on) {
    playing = on;
    playBtn.setAttribute("aria-pressed", String(on));
    playBtn.textContent = on ? playBtn.getAttribute("data-pause") : playBtn.getAttribute("data-play");
    cancelAnimationFrame(raf);
    if (on) { if (pos >= E.T) pos = 0; t0 = performance.now() - pos; raf = requestAnimationFrame(loop); }
  }
  ready.then(function () {
    scrub.max = String(E.T);
    paint(0);
    playBtn.disabled = false;
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
    scrub.addEventListener("input", function () { if (playing) setPlaying(false); paint(Number(scrub.value)); });
    document.addEventListener("keydown", function (e) {
      if (e.target === scrub && e.key !== " ") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); setPlaying(!playing); }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === LANG));
      b.addEventListener("click", function () { location.search = "?lang=" + b.getAttribute("data-lang") + "&format=" + FMT; });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-format]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-format") === FMT));
      b.addEventListener("click", function () { location.search = "?lang=" + LANG + "&format=" + b.getAttribute("data-format"); });
    });
    if (q.has("t")) paint(Number(q.get("t")) * 1000);
    if (q.has("autoplay")) setPlaying(true);
  });
})();
