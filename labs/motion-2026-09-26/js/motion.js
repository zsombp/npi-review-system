/* motion.js, v0.1.0, 2026-09-26. The motion lab's engine (docs/design/MOTION-v0.1.0.md).

   What it does:
     - the controls: the level (Javasolt puts the website on Játékos and the app on Élénk), reduced motion
       (from the device on load, and the lab's switch), the page pause, slow motion (every duration and
       timer times four), replay all; the state goes into the address;
     - the one-shot moments, played with the Web Animations API on the tokens of MOTION section 3, so each
       one can be replayed and none of them runs under reduced motion;
     - the rules of MOTION section 6: loops only at Játékos, in view (IntersectionObserver), in a visible
       tab, awake (60 s without input puts them to sleep); now-and-then idles on a jittered timer only at
       Játékos; nothing waits for an animation; one announcement per action;
     - the demos: the website hero, the drawings, Ma, the reply queue with undo and the done moment, the
       empty state, the small things, numbers and charts, transitions, loading.
   Vanilla, no dependency, no request. */
(function () {
  "use strict";
  var html = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var S = {};
  $$(".strings [data-k]").forEach(function (el) { S[el.getAttribute("data-k")] = el.textContent; });
  function t(k, v) { var s = S[k] != null ? S[k] : k; return s.replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] != null ? v[n] : m; }); }

  /* ---- tokens (MOTION section 3) ---------------------------------------------------------------- */
  var E = { tap: "ease", pop: "cubic-bezier(.2, .9, .3, 1.3)", slam: "cubic-bezier(.2, 1.5, .4, 1)", out: "cubic-bezier(.2, 0, 0, 1)", inn: "cubic-bezier(.4, 0, 1, 1)", swing: "cubic-bezier(.37, 0, .63, 1)", line: "linear" };
  var M = { tap: 120, snap: 180, lift: 220, slide: 240, rise: 280, stamp: 340, land: 420, stick: 500, draw: 520, roll: 600, toy: 620, line: 700, idle: 1100, puff: 1600, undo: 8000 };
  var EJ = ["elenk", "jatekos"], ALL = ["nyugodt", "elenk", "jatekos"];

  /* ---- state -------------------------------------------------------------------------------------- */
  var mq = null;
  try { mq = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch (e) { /* old browser */ }
  var st = {
    choice: html.getAttribute("data-choice") || "javasolt",
    reduce: html.getAttribute("data-motion") === "reduce",
    paused: html.getAttribute("data-paused") === "true",
    slow: html.getAttribute("data-slow") === "true",
    asleep: false
  };
  function k() { return st.slow ? 4 : 1; }
  function full() { return !st.reduce; }
  function surfaceOf(el) { return el && el.closest ? el.closest("[data-surface]") : null; }
  function lvlOf(el) { var s = surfaceOf(el); return s ? s.getAttribute("data-lvl") : "elenk"; }
  function on(el, levels) { return full() && levels.indexOf(lvlOf(el)) >= 0; }
  function later(fn, ms) { return setTimeout(fn, ms * k()); }

  /* one animation, on the tokens; never under reduced motion */
  function play(el, frames, ms, easing, opt) {
    if (!el || !el.animate || !full()) return null;
    opt = opt || {};
    return el.animate(frames, {
      duration: ms * k(), easing: easing || E.line, delay: (opt.delay || 0) * k(),
      fill: opt.fill || "backwards", iterations: opt.iterations || 1
    });
  }
  function isScript(a) {
    return !((typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation) || (typeof CSSTransition !== "undefined" && a instanceof CSSTransition));
  }
  function cancelScript(root) {
    var list = root && root.getAnimations ? root.getAnimations({ subtree: true }) : (document.getAnimations ? document.getAnimations() : []);
    list.forEach(function (a) { if (isScript(a)) a.cancel(); });
  }
  /* a line that draws itself (a tick, the sparkline): pathLength is 1 and the dash exists only while
     it draws. "1 2" leaves a gap longer than the line, and the start at 1.01 keeps a zero-length dash
     (which a round cap would draw as a dot) off both ends. fromEnd draws from the path's last point: a
     tick is written from its short left stroke, and its path starts at the long right one. */
  function drawLine(path, ms, delay, fromEnd) {
    if (!path || !full()) return null;
    path.style.strokeDasharray = "1 2";
    var a = play(path, [{ strokeDashoffset: fromEnd ? -1.01 : 1.01 }, { strokeDashoffset: 0 }], ms, E.out, { delay: delay || 0 });
    function done() { path.style.strokeDasharray = ""; }
    if (a) { a.onfinish = done; a.oncancel = done; } else done();
    return a;
  }
  /* the marker under a word keeps its stroke width with vector-effect: non-scaling-stroke, and there the
     dash does not follow pathLength (Chromium draws two pieces at once), so the marker is wiped in from
     the left instead: a clip on its own box, opened past the round caps at both ends */
  function drawMarker(svg, ms, delay) {
    if (!svg || !full()) return null;
    return play(svg, [{ clipPath: "inset(-80% 100% -80% -12%)" }, { clipPath: "inset(-80% -12% -80% -12%)" }], ms, E.out, { delay: delay || 0 });
  }
  function stick(el, delay, ms) { return play(el, [{ scale: .2, opacity: 0 }, { scale: 1, opacity: 1 }], ms || M.stick, E.slam, { delay: delay || 0 }); }
  function bumpFrames(max) { return [{ scale: 1, rotate: "0deg", easing: E.out }, { scale: max || 1.3, rotate: "-12deg", offset: .45, easing: E.out }, { scale: 1, rotate: "0deg" }]; }

  /* ---- announcements: one per action, never a countdown ------------------------------------------- */
  var live = $('[data-bind="status"]'), vis = $('[data-bind="status-vis"]'), liveT = 0;
  function say(msg) {
    clearTimeout(liveT);
    live.textContent = "";
    liveT = setTimeout(function () { live.textContent = msg; }, 60);
    vis.textContent = msg;
  }

  /* ---- controls ------------------------------------------------------------------------------------ */
  var devNote = $('[data-bind="dev-note"]');
  function surfaceLvl(s) { return st.choice === "javasolt" ? (s.classList.contains("web") ? "jatekos" : "elenk") : st.choice; }
  function writeHash() {
    var parts = ["l=" + st.choice];
    if (st.reduce && !(mq && mq.matches)) parts.push("r=1");
    if (st.paused) parts.push("p=1");
    if (st.slow) parts.push("s=1");
    try { history.replaceState(null, "", "#" + parts.join("&")); } catch (e) { /* file: or sandbox */ }
  }
  function applyState() {
    html.setAttribute("data-motion", st.reduce ? "reduce" : "full");
    html.setAttribute("data-choice", st.choice);
    html.setAttribute("data-paused", st.paused ? "true" : "false");
    html.setAttribute("data-asleep", st.asleep ? "true" : "false");
    html.setAttribute("data-slow", st.slow ? "true" : "false");
    html.style.setProperty("--k", st.slow ? "4" : "1");
    $$("[data-surface]").forEach(function (s) { s.setAttribute("data-lvl", surfaceLvl(s)); });
    $$(".opt[data-choice]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-choice") === st.choice ? "true" : "false"); });
    $('[data-ctl="reduce"]').setAttribute("aria-checked", st.reduce ? "true" : "false");
    $('[data-ctl="pause"]').setAttribute("aria-pressed", st.paused ? "true" : "false");
    $('[data-ctl="slow"]').setAttribute("aria-pressed", st.slow ? "true" : "false");
    $('[data-bind="lvl-desc"]').textContent = t("lvl." + st.choice) + (st.reduce ? " " + t("lvl.reduce") : "");
    devNote.hidden = !(mq && mq.matches);
    $$(".demo").forEach(function (d) {
      var s = $("[data-surface]", d), b = $("[data-lvl-name]", d);
      var lv = s ? s.getAttribute("data-lvl") : "elenk";
      if (b) b.textContent = st.reduce ? t("name.reduce") : t("name." + lv);
      $$(".items li", d).forEach(function (li) {
        var ok = !st.reduce && (li.getAttribute("data-lv") || "").split(" ").indexOf(lv) >= 0;
        li.classList.toggle("is-off", !ok);
        var n = $(".off-note", li);
        if (n) n.textContent = ok ? "" : (st.reduce ? t("off.reduce") : t("off"));
      });
    });
    writeHash();
    scheduleAll();
  }

  $$(".opt[data-choice]").forEach(function (b) {
    b.addEventListener("click", function () {
      st.choice = b.getAttribute("data-choice");
      cancelScript(document);
      applyState();
      say(t("st.level", { name: b.textContent.trim() }));
      idles.forEach(function (it) { it.seen = false; });
      replayVisible();
    });
  });
  $('[data-ctl="reduce"]').addEventListener("click", function () {
    st.reduce = !st.reduce;
    if (st.reduce) settleEverything();
    applyState();
    say(t(st.reduce ? "st.reduce.on" : "st.reduce.off"));
    if (!st.reduce) replayVisible();
  });
  $('[data-ctl="pause"]').addEventListener("click", function () {
    st.paused = !st.paused;
    applyState();
    say(t(st.paused ? "st.pause.on" : "st.pause.off"));
  });
  $('[data-ctl="slow"]').addEventListener("click", function () {
    st.slow = !st.slow;
    applyState();
    say(t(st.slow ? "st.slow.on" : "st.slow.off"));
  });
  $('[data-ctl="replay-all"]').addEventListener("click", function () {
    if (!full()) { say(t("st.still")); return; }
    Object.keys(arrive).forEach(function (key) { arrive[key](); });
    idles.forEach(function (it) { if (it.visible) it.fn(); });
    say(t("st.replay"));
  });
  if (mq) {
    var onDev = function () {
      if (mq.matches && !st.reduce) { st.reduce = true; settleEverything(); }
      applyState();
    };
    if (mq.addEventListener) mq.addEventListener("change", onDev); else if (mq.addListener) mq.addListener(onDev);
  }
  /* reduced motion switched on mid-way: every moment jumps to its end, every loader stops */
  function settleEverything() {
    cancelScript(document);
    $$(".hop.is-on").forEach(function (h) { h.classList.remove("is-on"); });
    $$(".roll-host").forEach(function (el) { el.textContent = el.getAttribute("data-final"); el.classList.remove("roll-host"); });
    $$(".p-line").forEach(function (l) { l.style.transform = ""; });
    zeroCounters.forEach(function (c) { c.stop(); });
    if (qToast && !qToast.hidden) hideToast(true);
  }

  /* ---- loops, in view, awake --------------------------------------------------------------------- */
  var idles = [];
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var el = e.target;
      if (el.classList.contains("loop-host")) el.classList.toggle("in-view", e.isIntersecting);
      if (el._idle) {
        el._idle.visible = e.isIntersecting;
        if (e.isIntersecting) seeIdle(el._idle);
        scheduleIdle(el._idle);
      }
      if (el._arrive && e.isIntersecting && e.intersectionRatio >= .25 && !el._arrived) { el._arrived = true; el._arrive(); }
      if (el.classList.contains("demo")) el._visible = e.isIntersecting;
    });
  }, { threshold: [0, .25] }) : null;
  $$(".loop-host").forEach(function (h) { if (io) io.observe(h); else h.classList.add("in-view"); });

  function addIdle(host, fn, min, max, onSee) {
    var it = { host: host, fn: fn, min: min, max: max, onSee: onSee !== false, visible: !io, seen: false, timer: 0 };
    host._idle = it;
    idles.push(it);
    if (io) io.observe(host);
    return it;
  }
  function seeIdle(it) {
    if (it.seen || !it.onSee || !on(it.host, EJ)) return;
    it.seen = true;
    it.fn();
  }
  function scheduleIdle(it) {
    clearTimeout(it.timer);
    if (!on(it.host, ["jatekos"]) || st.paused || st.asleep || !it.visible || document.hidden) return;
    var s = it.min + Math.random() * (it.max - it.min);
    it.timer = later(function () { it.fn(); scheduleIdle(it); }, s * 1000);
  }
  function scheduleAll() { idles.forEach(scheduleIdle); }
  document.addEventListener("visibilitychange", scheduleAll);

  /* 60 s without input: every loop sleeps until the next input (MOTION 6.1) */
  var lastInput = Date.now();
  function anyLoop() { return full() && !st.paused && $$("[data-surface]").some(function (s) { return s.getAttribute("data-lvl") === "jatekos"; }); }
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      lastInput = Date.now();
      if (st.asleep) { st.asleep = false; applyState(); say(""); }
    }, { passive: true, capture: true });
  });
  setInterval(function () {
    if (!st.asleep && anyLoop() && Date.now() - lastInput > 60000) { st.asleep = true; applyState(); say(t("st.asleep")); }
  }, 5000);

  /* the marquee's copy for a seamless loop, and each band's own button */
  $$("[data-copy-of]").forEach(function (copy) { copy.innerHTML = copy.previousElementSibling.innerHTML; });
  $$("[data-band]").forEach(function (band) {
    var b = $("[data-band-toggle]", band);
    if (!b) return;
    b.addEventListener("click", function () {
      var p = !band.classList.contains("is-paused");
      band.classList.toggle("is-paused", p);
      $("[data-band-word]", b).textContent = t(p ? "band.off" : "band.on");
    });
  });
  $$("[data-noop]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); say(t("st.noop")); }); });

  /* ---- the drawings' idle moments ---------------------------------------------------------------- */
  function ring(svg) {
    if (!svg || !on(svg, EJ)) return;
    var sw = function (a) { return [0, -14 * a, 12 * a, -8 * a, 5 * a, -2 * a, 0].map(function (d, i) { return { transform: "rotate(" + d + "deg)", offset: [0, .12, .3, .5, .68, .85, 1][i], easing: E.swing }; }); };
    $$(".p-swing", svg).forEach(function (g) { play(g, sw(1), M.idle, E.line); });
    $$(".p-clapper", svg).forEach(function (g) { play(g, sw(1.5), M.idle, E.line, { delay: 60 }); });
    $$(".p-dot", svg).forEach(function (g) { play(g, [{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: .4 }, { transform: "scale(1)" }], 320, E.out); });
  }
  function puffs(svg, times) {
    if (!svg || !on(svg, EJ)) return;
    $$(".p-steam", svg).forEach(function (g, i) {
      play(g, [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-26px)", opacity: 0, offset: .45 },
        { transform: "translateY(18px)", opacity: 0, offset: .46 },
        { transform: "translateY(0)", opacity: 1 }
      ], M.puff, E.out, { delay: i * 150, iterations: times || 1 });
    });
  }
  function printReceipt(svg, rows) {
    if (!svg || !on(svg, EJ)) return;
    var lines = $$(".p-line", svg);
    lines.forEach(function (l) {
      var r = Number(l.getAttribute("data-row")) || 0;
      if (rows && rows.indexOf(r) < 0) return;
      play(l, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 140, E.out, { delay: (rows ? rows.indexOf(r) : r) * 70 });
    });
    if (!rows) $$(".p-clock", svg).forEach(function (c) { stampIn(c, 7 * 70 + 120); });
  }
  function stampIn(el, delay) { return play(el, [{ transform: "scale(0)", easing: E.out }, { transform: "scale(1.25)", offset: .6, easing: E.out }, { transform: "scale(1)" }], M.stamp, E.line, { delay: delay || 0 }); }

  /* the website's drawings: once when seen (Élénk), and every so often while in view (Játékos) */
  var webReceipt = $('.web [data-idle="receipt"]'), webBell = $('.web [data-idle="bell"]');
  addIdle(webReceipt, function () { printReceipt($("svg", webReceipt)); }, 16, 24);
  addIdle(webBell, function () { ring($("svg", webBell)); }, 14, 22);

  /* ================================================================ the website */
  var web = $(".web");
  var arrive = {};
  arrive.web = function () {
    if (!on(web, EJ)) return;
    $$(".sticker-free, .sticker-note", web).forEach(function (el, i) { stick(el, 350 + i * 140); });
    drawMarker($(".hero .mk-line", web), M.draw, 200);
  };
  function webHl() { play($('[data-part="web-hl"]', web), [{ scale: ".85 .6", opacity: 0 }, { scale: "1 1", opacity: 1 }], M.land, E.pop, { delay: 120 }); }
  arrive.webHl = function () { if (on(web, EJ)) webHl(); };

  /* ================================================================ Ma */
  var maApp = $("#d-ma .app"), maCup = $(".art-cup", maApp);
  arrive.ma = function () {
    if (!full()) return;
    var head = $('[data-part="ma-head"]', maApp);
    if (lvlOf(maApp) === "nyugodt") { play(head, [{ opacity: .4 }, { opacity: 1 }], M.tap, E.out); return; }
    play(head, [{ translate: "0 10px", opacity: .4 }, { translate: "0 0", opacity: 1 }], 200, E.out);
    stick($('[data-part="ma-date"]', maApp), 60);
    play($('[data-part="ma-hl"]', maApp), [{ scale: ".85 .6", opacity: 0 }, { scale: "1 1", opacity: 1 }], M.land, E.pop, { delay: 120 });
    $$('[data-part="ma-tiles"] .tile', maApp).forEach(function (tile, i) { play(tile, [{ translate: "0 14px", opacity: 0 }, { translate: "0 0", opacity: 1 }], M.land, E.pop, { delay: 80 + i * 40 }); });
    puffs(maCup, 2);
  };
  addIdle($("#d-ma .art"), function () { puffs(maCup, 1); }, 12, 18, false);
  $("#d-ma .art").addEventListener("click", function () { puffs(maCup, 1); });

  /* ================================================================ Válaszok: the queue */
  var qApp = $("[data-queue]");
  function qb(name) { return $('[data-q="' + name + '"]', qApp); }
  var Q = $$(".q-data article").map(function (a) {
    function f(n) { return $('[data-f="' + n + '"]', a).textContent; }
    return { stars: Number(a.getAttribute("data-stars")), venue: f("venue"), meta: f("meta"), body: f("body"), draft: f("draft") };
  });
  var q = { done: [], cur: 0, undo: null };
  var qToast = qb("toast"), qBar = qb("bar"), qTimer = 0, qStep = 0, qLeft = 0, qSince = 0, qHeld = 0;
  function rem() { return Q.map(function (x, i) { return i; }).filter(function (i) { return !q.done.some(function (d) { return d.i === i; }); }); }
  function starsHTML(n) {
    var g = "";
    for (var i = 1; i <= 5; i++) g += i <= n ? '<svg aria-hidden="true"><use href="#g-star"/></svg>' : '<svg class="o" aria-hidden="true"><use href="#g-star-o"/></svg>';
    return '<span class="glyphs" aria-hidden="true">' + g + '</span><span class="num" aria-hidden="true">' + n + "/5</span>";
  }
  function setBadge(badge, doneEl, n, animate) {
    var was = badge.hidden ? 0 : Number(badge.textContent);
    if (n === was && !badge.hidden) return;
    var move = animate && on(badge, EJ);
    if (n === 0) {
      badge.hidden = true;
      if (doneEl) {
        doneEl.hidden = false;
        if (move) play(doneEl, [{ rotate: "-90deg", scale: .3, opacity: 0 }, { rotate: "0deg", scale: 1, opacity: 1 }], M.stamp, E.slam);
      }
      return;
    }
    if (doneEl) doneEl.hidden = true;
    var fromHidden = badge.hidden;
    badge.hidden = false;
    if (!move) { badge.textContent = n; return; }
    if (fromHidden) { badge.textContent = n; stick(badge, 0, M.stamp); return; }
    play(badge, bumpFrames(1.3), M.stamp, E.line);
    later(function () { badge.textContent = n; }, M.stamp * .45);
  }
  function renderQueue() {
    var r = rem(), n = r.length;
    q.cur = Math.max(0, Math.min(q.cur, n - 1));
    qb("count").textContent = n ? t("q.count", { n: n }) : t("q.count0");
    qb("pending").textContent = n ? t("q.pending", { n: n }) : t("q.pending0");
    qb("pips").innerHTML = q.done.map(function (d) { return '<li class="' + (d.kind === "approved" ? "is-ok" : "is-skip") + '"></li>'; }).join("") +
      r.map(function (x, i) { return "<li" + (i === q.cur ? ' class="is-cur"' : "") + "></li>"; }).join("");
    qb("detail").hidden = !n;
    if (n) {
      var it = Q[r[q.cur]];
      qb("i").textContent = q.done.length + q.cur + 1;
      qb("n").textContent = Q.length;
      qb("venue").textContent = it.venue;
      qb("stars").innerHTML = starsHTML(it.stars);
      qb("stars").setAttribute("aria-label", t("q.stars", { n: it.stars }));
      qb("meta").textContent = it.meta;
      qb("body").textContent = it.body;
      qb("draft").value = it.draft;
    }
  }
  function slideIn(dir) {
    var el = qb("in");
    if (!full()) return;
    if (lvlOf(qApp) === "nyugodt") { play(el, [{ opacity: .2 }, { opacity: 1 }], 140, E.out); return; }
    var dx = (qApp.clientWidth < 380 ? 12 : 18) * (dir || 1);
    play(el, [{ translate: dx + "px 0", opacity: .2 }, { translate: "0 0", opacity: 1 }], M.slide, E.pop);
  }
  function focusQ(el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }

  /* the undo bar: rises, drains over eight seconds, holds while the pointer or the focus is on it */
  function showToast(kind, note) {
    clearTimeout(qTimer); clearInterval(qStep);
    qToast.classList.toggle("is-skip", kind === "skipped");
    qToast.classList.toggle("is-note", !!note);
    qb("toast-icon").setAttribute("href", kind === "skipped" ? "#i-close" : "#i-check");
    qb("toast-msg").textContent = note || t(kind === "skipped" ? "q.skipped" : "q.approved");
    qb("undo").hidden = !!note;
    var appear = qToast.hidden;
    qToast.hidden = false;
    if (appear) {
      if (lvlOf(qApp) === "nyugodt") play(qToast, [{ translate: "0 30%", opacity: 0 }, { translate: "0 0", opacity: 1 }], 160, E.out);
      else play(qToast, [{ translate: "0 140%" }, { translate: "0 0" }], M.rise, E.pop);
    }
    qBar.classList.remove("is-running");
    qBar.style.removeProperty("--left");
    void qBar.offsetWidth;
    qLeft = (note ? 2600 : M.undo) * k();
    qSince = performance.now();
    qBar.hidden = !!note;
    if (!note) {
      if (full()) qBar.classList.add("is-running");
      else { stepBar(); qStep = setInterval(stepBar, 1000 * k()); }
    }
    qTimer = setTimeout(expire, qLeft);
  }
  function stepBar() {
    var left = qLeft - (qHeld ? 0 : performance.now() - qSince);
    qBar.style.setProperty("--left", String(Math.max(0, Math.ceil(left / (1000 * k())) / 8)));
  }
  function hold(on_) {
    if (qToast.hidden) return;
    if (on_) {
      if (qHeld++) return;
      clearTimeout(qTimer); clearInterval(qStep);
      qLeft -= performance.now() - qSince;
      qToast.classList.add("is-held");
    } else {
      if (!qHeld || --qHeld) return;
      qSince = performance.now();
      qToast.classList.remove("is-held");
      qTimer = setTimeout(expire, qLeft);
      if (!full() && !qBar.hidden) qStep = setInterval(stepBar, 1000 * k());
    }
  }
  qToast.addEventListener("pointerenter", function () { hold(true); });
  qToast.addEventListener("pointerleave", function () { hold(false); });
  qToast.addEventListener("focusin", function () { hold(true); });
  qToast.addEventListener("focusout", function () { hold(false); });
  function expire() {
    q.undo = null;
    var had = qToast.contains(document.activeElement);
    hideToast(false);
    if (had) { var r = rem(); focusQ(r.length ? qb("venue") : $("#h-done")); }
  }
  function hideToast(now) {
    clearTimeout(qTimer); clearInterval(qStep); qHeld = 0;
    qToast.classList.remove("is-held");
    qBar.classList.remove("is-running");
    var a = now ? null : play(qToast, [{ translate: "0 0", opacity: 1 }, { translate: "0 100%", opacity: 0 }], M.snap, E.inn, { fill: "forwards" });
    if (a) a.onfinish = function () { qToast.hidden = true; a.cancel(); };
    else qToast.hidden = true;
  }

  function act(kind) {
    var r = rem();
    if (!r.length) return;
    var i = r[q.cur];
    q.done.push({ i: i, kind: kind });
    q.undo = { i: i, kind: kind, at: q.cur };
    renderQueue();
    var n = rem().length;
    var pip = qb("pips").children[q.done.length - 1];
    if (pip && on(qApp, EJ)) play(pip, [{ scale: 1, easing: E.out }, { scale: 1.45, offset: .4, easing: E.out }, { scale: 1 }], M.snap, E.line);
    setBadge(qb("badge"), qb("badge-done"), n, true);
    showToast(kind);
    if (n) { slideIn(1); focusQ(qb("venue")); say(t(kind === "skipped" ? "q.say.skipped" : "q.say.approved")); }
    else { doneMoment(); say(t("q.say.done")); }
  }
  function doneMoment() {
    var panel = qb("done");
    panel.hidden = false;
    qb("detail").hidden = true;
    var lv = lvlOf(qApp), extra = on(qApp, ["jatekos"]);
    qb("stk1").hidden = qb("stk2").hidden = !extra;
    focusQ($("#h-done"));
    if (!full()) return;
    if (lv === "nyugodt") { play(panel, [{ opacity: 0 }, { opacity: 1 }], 140, E.out); return; }
    var toy = qb("toy");
    play(toy, [{ scale: .2, rotate: "-18deg", opacity: 0 }, { scale: 1, rotate: "0deg", opacity: 1 }], M.toy, E.pop);
    play(qb("stamp"), [{ scale: 1.9, opacity: 0 }, { scale: 1, opacity: 1 }], M.stamp, E.slam, { delay: 380 });
    if (extra) {
      play(toy, [{ translate: "0 0", easing: E.out }, { translate: "0 5px", offset: .4, easing: E.out }, { translate: "0 0" }], 240, E.line, { delay: 600, fill: "none" });
      stick(qb("stk1"), 700, M.stamp);
      stick(qb("stk2"), 820, M.stamp);
      $$("li", qb("pips")).forEach(function (li, j) { play(li, [{ scale: 1, easing: E.out }, { scale: 1.45, offset: .4, easing: E.out }, { scale: 1 }], M.snap, E.line, { delay: 700 + j * 60, fill: "none" }); });
    }
  }
  function undo() {
    if (!q.undo) return;
    var u = q.undo;
    q.done = q.done.filter(function (d) { return d.i !== u.i; });
    q.cur = u.at;
    q.undo = null;
    qb("done").hidden = true;
    renderQueue();
    setBadge(qb("badge"), qb("badge-done"), rem().length, true);
    slideIn(-1);
    showToast("approved", t("q.undone"));
    focusQ(qb("venue"));
    say(t("q.undone"));
  }
  function stepQ(d) {
    var n = rem().length;
    if (!n) return;
    var c = Math.max(0, Math.min(n - 1, q.cur + d));
    if (c === q.cur) return;
    q.cur = c;
    renderQueue();
    slideIn(d);
    focusQ(qb("venue"));
  }
  function resetQueue() {
    cancelScript(qApp);
    q = { done: [], cur: 0, undo: null };
    hideToast(true);
    qb("done").hidden = true;
    renderQueue();
    qb("badge").hidden = false; qb("badge").textContent = rem().length; qb("badge-done").hidden = true;
  }
  $('[data-act="approve"]', qApp).addEventListener("click", function () { act("approved"); });
  $('[data-act="skip"]', qApp).addEventListener("click", function () { act("skipped"); });
  qb("undo").addEventListener("click", undo);
  qApp.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "input") return;
    var key = e.key.toLowerCase();
    if (key === "a") { e.preventDefault(); act("approved"); }
    else if (key === "s") { e.preventDefault(); act("skipped"); }
    else if (key === "u") { e.preventDefault(); undo(); }
    else if (key === "j") { e.preventDefault(); stepQ(1); }
    else if (key === "k") { e.preventDefault(); stepQ(-1); }
  });
  arrive.rep = function () { if (on(qApp, EJ)) drawMarker($(".blk-head .mk-line", qApp), M.draw, 200); };
  renderQueue();

  /* ================================================================ the empty state */
  var eApp = $("[data-empty]");
  function eb(n) { return $('[data-e="' + n + '"]', eApp); }
  function emptyArrive() {
    if (!eb("list").hidden) emptyReset();
    ring($(".art-bell", eApp));
    eb("empty").hidden = true;
    eb("list").hidden = false;
    if (on(eApp, EJ)) play(eb("new"), [{ translate: "0 -16px", scale: .9, opacity: 0 }, { translate: "0 0", scale: 1, opacity: 1 }], 360, E.pop);
    setBadge(eb("badge"), null, 4, true);
  }
  function emptyReset() {
    cancelScript(eApp);
    eb("empty").hidden = false;
    eb("list").hidden = true;
    eb("badge").hidden = false; eb("badge").textContent = "3";
  }
  $("[data-tap-bell]", eApp).addEventListener("click", function () { ring($(".art-bell", eApp)); });
  /* A8: the empty tray's tick says "nothing waiting", which is true while the empty state shows: once when
     it is seen (Élénk), now and then while it stays in view (Játékos), and on tap. Hidden, it is not seen. */
  var trayHost = $('[data-idle="tray"]', eApp);
  function bumpTray() {
    var svg = $("svg", trayHost);
    if (!svg || !on(svg, EJ)) return;
    $$(".p-tick", svg).forEach(function (g) {
      play(g, [{ transform: "scale(1) rotate(0deg)", easing: E.out }, { transform: "scale(1.3) rotate(-12deg)", offset: .4, easing: E.out }, { transform: "scale(1) rotate(0deg)" }], M.land, E.line);
    });
  }
  addIdle(trayHost, bumpTray, 12, 20);
  trayHost.addEventListener("click", bumpTray);

  /* ================================================================ small things */
  var sApp = $("[data-small]");
  function sb(n) { return $('[data-s="' + n + '"]', sApp); }
  $$("button", sb("seg")).forEach(function (b) {
    b.addEventListener("click", function () { $$("button", sb("seg")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); });
  });
  sb("switch").addEventListener("click", function () {
    var sw = sb("switch"), onNow = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", onNow ? "true" : "false");
    if (on(sw, ["jatekos"])) play($(".knob", sw), [{ scale: "1 1", easing: E.out }, { scale: "1.15 1", offset: .5, easing: E.out }, { scale: "1 1" }], M.snap, E.line);
  });
  $$("input[type=checkbox]", sb("checks")).forEach(function (cb) {
    cb.addEventListener("change", function () {
      sb("done-n").textContent = $$("input:checked", sb("checks")).length;
      if (!cb.checked || !on(cb, EJ)) return;
      var box = cb.nextElementSibling;
      play(box, [{ scale: .88 }, { scale: 1 }], 160, E.slam);
      drawLine($("path", box), 240, 40, true);
    });
  });
  sb("fold").addEventListener("toggle", function () {
    if (sb("fold").open && on(sApp, EJ)) play(sb("fold-body"), [{ translate: "0 6px", opacity: 0 }, { translate: "0 0", opacity: 1 }], M.snap, E.out);
  });
  var sToast = sb("toast"), sToastT = 0;
  function sNote(msg) {
    clearTimeout(sToastT);
    sb("toast-msg").textContent = msg;
    var appear = sToast.hidden;
    sToast.hidden = false;
    if (appear) {
      if (lvlOf(sApp) === "nyugodt") play(sToast, [{ translate: "0 30%", opacity: 0 }, { translate: "0 0", opacity: 1 }], 160, E.out);
      else play(sToast, [{ translate: "0 140%" }, { translate: "0 0" }], M.rise, E.pop);
    }
    sToastT = later(function () {
      var a = play(sToast, [{ translate: "0 0", opacity: 1 }, { translate: "0 100%", opacity: 0 }], M.snap, E.inn, { fill: "forwards" });
      if (a) a.onfinish = function () { sToast.hidden = true; a.cancel(); }; else sToast.hidden = true;
    }, 2600);
  }
  sb("save").addEventListener("click", function () {
    var inp = sb("name");
    if (!inp.value.trim()) {
      sb("err").hidden = false;
      if (on(inp, EJ)) play(inp, [{ translate: "0 0" }, { translate: "-4px 0" }, { translate: "4px 0" }, { translate: "-2px 0" }, { translate: "0 0" }], 240, E.out);
      inp.focus();
      return;
    }
    sb("err").hidden = true;
    sNote(t("s.saved"));
  });
  var sCount = 3;
  sb("badge-up").addEventListener("click", function () { sCount++; setBadge(sb("badge"), sb("badge-done"), sCount, true); });
  sb("badge-down").addEventListener("click", function () { sCount = Math.max(0, sCount - 1); setBadge(sb("badge"), sb("badge-done"), sCount, true); });
  arrive.small = function () { if (on(sApp, EJ)) drawMarker($(".blk-head .mk-line", sApp), M.draw, 200); };

  /* ================================================================ numbers and charts */
  var nApp = $("[data-num]");
  function nb(n) { return $('[data-n="' + n + '"]', nApp); }
  var STATES = [[41, 4.21, 3], [44, 4.23, 2], [47, 4.26, 2], [49, 4.25, 1]];
  var nState = 0, nFrom = "prev", zeroCounters = [];
  function fmt(v, dec) { return dec ? v.toFixed(2).replace(".", ",") : String(Math.round(v)); }
  function fmtDelta(d, dec) { if (!d) return ""; var s = dec ? Math.abs(d).toFixed(2).replace(".", ",") : String(Math.abs(d)); return (d > 0 ? "+" : "−") + s; }
  function rollTo(el, a, b) {
    el.setAttribute("data-final", b);
    if (!on(el, EJ) || a === b) { el.textContent = b; return; }
    if (a.length !== b.length) {
      el.textContent = b;
      play(el, [{ translate: "0 -10px", scale: .92, opacity: 0 }, { translate: "0 0", scale: 1, opacity: 1 }], M.land, E.pop);
      return;
    }
    var h = "", strips = [];
    for (var i = 0; i < b.length; i++) {
      var ca = a[i], cb = b[i];
      if (ca === cb || !/\d/.test(ca) || !/\d/.test(cb)) { h += "<span>" + cb + "</span>"; continue; }
      var x = Number(ca), y = Number(cb), step = y > x ? 1 : -1, seq = [];
      for (var v = x; v !== y + step; v += step) seq.push(v);
      h += '<span class="roll"><span class="roll-strip" data-steps="' + (seq.length - 1) + '">' + seq.map(function (s) { return "<span>" + s + "</span>"; }).join("") + "</span></span>";
    }
    el.innerHTML = '<span aria-hidden="true" style="display:inline-flex">' + h + "</span>";
    el.classList.add("roll-host");
    var last = null;
    $$(".roll-strip", el).forEach(function (s) {
      var n = Number(s.getAttribute("data-steps"));
      last = play(s, [{ transform: "translateY(0)" }, { transform: "translateY(" + (-1.15 * n) + "em)" }], M.roll, E.out, { fill: "forwards" });
    });
    function done() { if (el.classList.contains("roll-host")) { el.classList.remove("roll-host"); el.textContent = b; } }
    if (last) { last.onfinish = done; last.oncancel = done; } else done();
  }
  function countUp(el, target, dec) {
    el.setAttribute("data-final", fmt(target, dec));
    if (!on(el, EJ)) { el.textContent = fmt(target, dec); return; }
    var c = { raf: 0, stop: function () { cancelAnimationFrame(c.raf); el.textContent = fmt(target, dec); } };
    zeroCounters.push(c);
    var t0 = performance.now(), dur = 900 * k();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e, dec);
      if (p < 1) c.raf = requestAnimationFrame(tick);
      else zeroCounters = zeroCounters.filter(function (z) { return z !== c; });
    })(t0);
  }
  function newDay() {
    var a = STATES[nState], b = STATES[(nState + 1) % STATES.length];
    nState = (nState + 1) % STATES.length;
    [0, 1, 2].forEach(function (i) {
      var dec = i === 1, el = nb("v" + i), d = nb("d" + i);
      var from = fmt(a[i], dec), to = fmt(b[i], dec);
      if (nFrom === "zero") countUp(el, b[i], dec);
      else rollTo(el, from, to);
      var delta = fmtDelta(Math.round((b[i] - a[i]) * 100) / 100, dec);
      d.textContent = delta;
      if (delta) stick(d, nFrom === "zero" ? 700 : 300, M.stamp);
    });
    nb("live").textContent = t("n.live", { a: fmt(b[0]), b: fmt(b[1], true), c: fmt(b[2]) });
  }
  $$("[data-from]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      nFrom = btn.getAttribute("data-from");
      $$("[data-from]").forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
    });
  });
  /* the bars: 30 days, two months */
  var MONTHS = [
    [1, 2, 0, 3, 1, 2, 4, 1, 0, 2, 3, 1, 2, 2, 1, 3, 0, 1, 2, 4, 2, 1, 3, 2, 1, 0, 2, 3, 1, 8],
    [2, 1, 1, 2, 3, 0, 2, 1, 2, 3, 1, 0, 2, 1, 2, 2, 3, 1, 0, 2, 1, 2, 2, 1, 3, 2, 1, 0, 2, 1]
  ];
  var month = 0, SV = "http://www.w3.org/2000/svg", barsSvg = nb("bars"), unit = 13;
  (function buildBars() {
    var g = '<line class="ch-base" x1="0" y1="120" x2="300" y2="120"/>';
    MONTHS[0].forEach(function (v, i) {
      g += '<rect class="ch-bar" x="' + (4 + i * 9.8).toFixed(1) + '" y="' + (120 - v * unit) + '" width="7" height="' + (v * unit) + '" rx="1.5"/>';
    });
    barsSvg.innerHTML = g;
  })();
  function growBars() {
    if (!on(nApp, EJ)) return;
    $$(".ch-bar", barsSvg).forEach(function (r, i) { play(r, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], M.land, E.pop, { delay: i * 14 }); });
  }
  function setMonth(mIdx) {
    if (mIdx === month) return;
    var bars = $$(".ch-bar", barsSvg), lv = lvlOf(nApp);
    bars.forEach(function (r, i) {
      var oldH = MONTHS[month][i] * unit, newH = MONTHS[mIdx][i] * unit;
      r.setAttribute("y", String(120 - newH));
      r.setAttribute("height", String(newH));
      if (!newH || !full()) return;
      play(r, [{ transform: "scaleY(" + (oldH / newH) + ")" }, { transform: "scaleY(1)" }], lv === "nyugodt" ? 160 : 300, E.out);
    });
    month = mIdx;
  }
  $$("[data-m]", nb("month")).forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-m]", nb("month")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      setMonth(Number(b.getAttribute("data-m")));
    });
  });
  /* the line: the average over 30 days */
  var AVG = [4.18, 4.2, 4.19, 4.22, 4.21, 4.24, 4.23, 4.25, 4.22, 4.26, 4.28, 4.27, 4.25, 4.29, 4.3, 4.28, 4.31, 4.3, 4.33, 4.32, 4.3, 4.34, 4.33, 4.35, 4.36, 4.34, 4.37, 4.36, 4.38, 4.35];
  var lineSvg = nb("line");
  (function buildLine() {
    function x(i) { return 6 + i * (288 / 29); }
    function y(v) { return 100 - (v - 4.1) / .35 * 88; }
    var d = AVG.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
    lineSvg.innerHTML = '<line class="ch-grid" x1="0" y1="' + y(4.2).toFixed(1) + '" x2="300" y2="' + y(4.2).toFixed(1) + '"/><line class="ch-grid" x1="0" y1="' + y(4.3).toFixed(1) + '" x2="300" y2="' + y(4.3).toFixed(1) + '"/>' +
      '<text x="0" y="' + (y(4.2) - 4).toFixed(1) + '">4,2</text><text x="0" y="' + (y(4.3) - 4).toFixed(1) + '">4,3</text>' +
      '<path class="ch-line" pathLength="1" d="' + d + '"/><circle class="ch-dot" r="5" cx="' + x(29).toFixed(1) + '" cy="' + y(AVG[29]).toFixed(1) + '"/>';
  })();
  function drawChartLine() {
    if (!on(nApp, EJ)) return;
    drawLine($(".ch-line", lineSvg), M.line, 0);
    play($(".ch-dot", lineSvg), [{ transform: "scale(0)", easing: E.out }, { transform: "scale(1.3)", offset: .6, easing: E.out }, { transform: "scale(1)" }], 220, E.line, { delay: M.line });
  }
  arrive.num = function () { growBars(); drawChartLine(); };

  /* ================================================================ transitions */
  var tApp = $("[data-trans]");
  function tb(n) { return $('[data-t="' + n + '"]', tApp); }
  var SECS = ["ma", "rev", "rep", "ins"], tCur = 0;
  function go(i) {
    if (i === tCur) return;
    tCur = i;
    tApp.setAttribute("data-sec", SECS[i]);
    tb("pill").style.setProperty("--i", String(i));
    tb("pill").style.setProperty("--pill-bg", "var(--sec-" + SECS[i] + ")");
    $$(".tabbar .tb", tApp).forEach(function (b, j) { if (j === i) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    var scr = $$('[data-t="scr"]', tApp);
    scr.forEach(function (s, j) { s.hidden = j !== i; });
    var now = scr[i];
    if (!full()) return;
    if (lvlOf(tApp) === "nyugodt") { play(now, [{ opacity: .4 }, { opacity: 1 }], M.tap, E.out); return; }
    play(now, [{ translate: "0 10px", opacity: .4 }, { translate: "0 0", opacity: 1 }], 200, E.out);
    stick($(".stk", now), 60);
  }
  $$(".tabbar .tb", tApp).forEach(function (b) { b.addEventListener("click", function () { go(Number(b.getAttribute("data-go"))); }); });
  function menu(open) {
    var m = tb("menu"), btn = tb("menu-btn");
    if (open === undefined) open = m.hidden;
    m.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open || !full()) return;
    if (lvlOf(tApp) === "nyugodt") play(m, [{ opacity: 0 }, { opacity: 1 }], M.tap, E.out);
    else play(m, [{ translate: "0 -8px", opacity: 0 }, { translate: "0 0", opacity: 1 }], 200, E.pop);
  }
  tb("menu-btn").addEventListener("click", function () { menu(); });
  $$(".menu-list button", tApp).forEach(function (b) { b.addEventListener("click", function () { go(Number(b.getAttribute("data-go"))); menu(false); tb("menu-btn").focus(); }); });
  tApp.addEventListener("keydown", function (e) { if (e.key === "Escape" && !tb("menu").hidden) { menu(false); tb("menu-btn").focus(); } });
  var sheetOpen = false;
  function openSheet() {
    var sh = tb("sheet");
    tb("copy-icon").setAttribute("href", "#i-copy");
    tb("copy-word").textContent = t("t.copyword");
    sh.hidden = false;
    sheetOpen = true;
    try { tb("copy").focus({ preventScroll: true }); } catch (e) { tb("copy").focus(); }
    if (!full()) return;
    if (lvlOf(tApp) === "nyugodt") { play(sh, [{ translate: "0 12px", opacity: 0 }, { translate: "0 0", opacity: 1 }], 160, E.out); return; }
    play(sh, [{ translate: "0 110%" }, { translate: "0 0" }], M.rise, E.pop);
    stick(tb("sheet-art"), 120, M.stamp);
  }
  function closeSheet(then) {
    var sh = tb("sheet");
    sheetOpen = false;
    var a = play(sh, [{ translate: "0 0" }, { translate: "0 110%" }], M.snap, E.inn, { fill: "forwards" });
    function end() { sh.hidden = true; if (a) a.cancel(); if (then) then(); }
    if (a) a.onfinish = end; else end();
  }
  tb("sheet-open").addEventListener("click", openSheet);
  tb("sheet-close").addEventListener("click", function () { closeSheet(); });
  var tToastT = 0;
  tb("copy").addEventListener("click", function () {
    tb("copy-icon").setAttribute("href", "#i-check");
    tb("copy-word").textContent = t("t.copied");
    if (on(tApp, EJ)) play($("svg", tb("copy")), [{ scale: 1, easing: E.out }, { scale: 1.4, offset: .45, easing: E.out }, { scale: 1 }], 240, E.line);
    later(function () {
      closeSheet(function () {
        var to = tb("toast");
        clearTimeout(tToastT);
        to.hidden = false;
        if (lvlOf(tApp) === "nyugodt") play(to, [{ translate: "0 30%", opacity: 0 }, { translate: "0 0", opacity: 1 }], 160, E.out);
        else play(to, [{ translate: "0 140%" }, { translate: "0 0" }], M.rise, E.pop);
        tToastT = later(function () { to.hidden = true; }, 2600);
        tb("sheet-open").focus();
      });
    }, 700);
  });

  /* ================================================================ loading */
  var lApp = $("[data-load]");
  function lb(n) { return $('[data-l="' + n + '"]', lApp); }
  var lTimers = [];
  function lLater(fn, ms) { lTimers.push(later(fn, ms)); }
  function startLoading() {
    lTimers.forEach(clearTimeout); lTimers = [];
    lb("hop").classList.remove("is-on");
    lb("loading").hidden = true;
    lb("loaded").hidden = true;
    lb("word").textContent = t("l.loading");
    lLater(function () {
      lb("loading").hidden = false;
      if (on(lApp, EJ)) lb("hop").classList.add("is-on");
    }, 200);
    lLater(function () { lb("word").textContent = t("l.slow"); }, 4000);
    lLater(function () { lb("hop").classList.remove("is-on"); }, 5000);
    lLater(function () { lb("loading").hidden = true; lb("loaded").hidden = false; }, 6500);
  }
  var iTimers = [];
  function startImport() {
    iTimers.forEach(clearTimeout); iTimers = [];
    var svg = $(".art-receipt", lb("receipt")), print = on(lApp, EJ);
    var lines = $$(".p-line", svg);
    lines.forEach(function (l) { l.style.transform = print ? "scaleX(0)" : ""; });
    lb("meter").style.setProperty("--p", "0");
    lb("import-tx").textContent = t("l.import", { n: 0 });
    var steps = [40, 80, 120, 160, 200], rowsPer = [[0], [1, 2], [3], [4, 5], [6]];
    steps.forEach(function (n, u) {
      iTimers.push(later(function () {
        lb("meter").style.setProperty("--p", String(n / 200));
        lb("import-tx").textContent = n === 200 ? t("l.imported") : t("l.import", { n: n });
        if (!print || !full()) { lines.forEach(function (l) { l.style.transform = ""; }); return; }
        lines.filter(function (l) { return rowsPer[u].indexOf(Number(l.getAttribute("data-row"))) >= 0; }).forEach(function (l, j) {
          var a = play(l, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 140, E.out, { delay: j * 70, fill: "forwards" });
          if (a) { a.onfinish = function () { l.style.transform = ""; a.cancel(); }; a.oncancel = function () { l.style.transform = ""; }; }
          else l.style.transform = "";
        });
        if (n === 200) $$(".p-clock", svg).forEach(function (c) { stampIn(c, 200); });
      }, 500 * (u + 1)));
    });
  }
  arrive.load = function () { startLoading(); startImport(); };

  /* ================================================================ replays and first sight */
  var REPLAY = {
    "web-arrive": arrive.web, "web-hl": webHl,
    "web-receipt": function () { printReceipt($("svg", webReceipt)); }, "web-bell": function () { ring($("svg", webBell)); },
    "ma-arrive": arrive.ma, "ma-steam": function () { puffs(maCup, 1); },
    "rep-reset": resetQueue, "rep-done": function () { rem().forEach(function (i) { q.done.push({ i: i, kind: "approved" }); }); q.undo = null; hideToast(true); renderQueue(); setBadge(qb("badge"), qb("badge-done"), 0, true); doneMoment(); },
    "empty-arrive": emptyArrive, "empty-reset": emptyReset, "empty-bell": function () { ring($(".art-bell", eApp)); }, "empty-tray": bumpTray,
    "small-mk": arrive.small,
    "num-day": newDay, "num-draw": arrive.num,
    "trans-sheet": function () { go(2); if (!sheetOpen) openSheet(); }, "trans-menu": function () { menu(); },
    "load-again": startLoading, "load-import": startImport
  };
  $$("[data-replay]").forEach(function (b) {
    b.addEventListener("click", function () {
      var fn = REPLAY[b.getAttribute("data-replay")];
      if (fn) fn();
      if (!full() && /arrive|draw|steam|bell|receipt|hl|mk/.test(b.getAttribute("data-replay"))) say(t("st.still"));
    });
  });
  /* each demo's arrival plays once when it first comes into view, like a screen that opens */
  var ARRIVE_AT = { "d-web": function () { arrive.web(); arrive.webHl(); }, "d-ma": arrive.ma, "d-rep": arrive.rep, "d-small": arrive.small, "d-num": arrive.num, "d-load": arrive.load };
  Object.keys(ARRIVE_AT).forEach(function (id) {
    var d = document.getElementById(id);
    d._arrive = ARRIVE_AT[id];
    if (io) io.observe(d); else d._arrive();
  });
  $$(".demo").forEach(function (d) { if (io && !d._arrive) io.observe(d); });
  function replayVisible() {
    if (!full()) return;
    Object.keys(ARRIVE_AT).forEach(function (id) {
      var d = document.getElementById(id);
      if (d._visible) ARRIVE_AT[id]();
    });
  }

  applyState();
})();
