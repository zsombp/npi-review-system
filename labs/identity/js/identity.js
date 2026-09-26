/* BistroTech identity sheet: identity.js, v1.0.0, 2026-09-26.
   Vanilla, no dependencies, no network request of its own. No sentence lives here: every word it
   writes comes from the page (a text node or a data attribute).
   Parts: the contrast ratios, computed from the colours as rendered (WCAG 2.x); the live sizes of
   the type scale and the space diagram; the press-in, lift and motion demos; the chips; the marquee
   pause and the video block (both from platform/website/static/js/site.js, unchanged in what they
   do); the turntable (from the illustration lab's index.html). */
(function () {
  "use strict";

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function still() { return !!(reduce && reduce.matches); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return id ? document.getElementById(id) : null; }

  /* A polite live region. Emptying it first lets the same words be announced twice. */
  function say(region, text) {
    if (!region || !text) return;
    region.textContent = "";
    window.setTimeout(function () { region.textContent = text; }, 60);
  }
  /* Hungarian decimals: 15,52. */
  function hu(n, digits) { return n.toFixed(digits).replace(".", ","); }
  function px(v) { return Math.round(v) + " px"; }

  /* ---- contrast, from the rendered colours ---------------------------------------------------- */
  function rgb(s) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s || "");
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
  }
  function luminance(c) {
    var w = [0.2126, 0.7152, 0.0722];
    var sum = 0;
    for (var i = 0; i < 3; i++) {
      var v = c[i] / 255;
      v = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      sum += w[i] * v;
    }
    return sum;
  }
  function ratio(a, b) {
    var x = luminance(a);
    var y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function initPairs() {
    $all(".pair").forEach(function (el) {
      var cs = window.getComputedStyle(el);
      var fg = rgb(cs.color);
      var bg = rgb(cs.backgroundColor);
      var out = el.querySelector(".pair-ratio");
      if (!fg || !bg || !out) return;
      out.textContent = hu(Math.round(ratio(fg, bg) * 100) / 100, 2) + ":1";
    });
  }

  /* ---- live sizes: the type scale and the space diagram --------------------------------------- */
  function measure() {
    $all("[data-now-of]").forEach(function (out) {
      var el = byId(out.getAttribute("data-now-of"));
      if (el) out.textContent = px(parseFloat(window.getComputedStyle(el).fontSize));
    });
    var vals = {};
    var sec = byId("ter");
    var wrap = sec && sec.querySelector(".wrap");
    if (sec) vals.section = parseFloat(window.getComputedStyle(sec).paddingTop);
    if (wrap) {
      var cs = window.getComputedStyle(wrap);
      vals.gutter = parseFloat(cs.paddingLeft);
      vals.content = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    }
    var tiles = $(".tiles");
    if (tiles) vals.gap = parseFloat(window.getComputedStyle(tiles).columnGap);
    var head = $(".site-head");
    if (head) vals.head = head.getBoundingClientRect().height;
    $all("[data-live]").forEach(function (out) {
      var v = vals[out.getAttribute("data-live")];
      if (typeof v === "number" && isFinite(v)) out.textContent = px(v);
    });
  }

  /* ---- toggles: aria-pressed on the button, a class on the target, a sentence for the reader ---- */
  function initToggles() {
    $all("[data-toggle]").forEach(function (b) {
      var target = byId(b.getAttribute("data-toggle"));
      var cls = b.getAttribute("data-class") || "is-on";
      var out = byId(b.getAttribute("data-out"));
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        if (target) target.classList.toggle(cls, on);
        say(out, b.getAttribute(on ? "data-on" : "data-off"));
      });
    });
  }

  /* ---- replays: take a class off and put it back, so its animation runs again ------------------ */
  function initReplays() {
    $all("[data-replay]").forEach(function (b) {
      var target = byId(b.getAttribute("data-replay"));
      var cls = b.getAttribute("data-class");
      var out = byId(b.getAttribute("data-out"));
      b.addEventListener("click", function () {
        if (!target || !cls) return;
        target.classList.remove(cls);
        void target.offsetWidth;
        target.classList.add(cls);
        say(out, b.getAttribute(still() ? "data-say-still" : "data-say"));
      });
    });
  }

  /* ---- the press-in demo ------------------------------------------------------------------------ */
  function initPress() {
    var btn = byId("press-me");
    var lock = byId("press-lock");
    var out = byId("press-out");
    if (!btn) return;
    btn.addEventListener("click", function () { say(out, btn.getAttribute("data-say")); });
    if (!lock) return;
    lock.addEventListener("click", function () {
      var on = lock.getAttribute("aria-pressed") !== "true";
      lock.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-pressed", on);
      say(out, lock.getAttribute(on ? "data-on" : "data-off"));
    });
  }

  /* ---- chips: one pressed at a time, as in the site's try-it card ------------------------------ */
  function initChips() {
    $all("[data-chip-group]").forEach(function (group) {
      var chips = $all(".chip", group);
      var out = byId(group.getAttribute("data-out"));
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var on = chip.getAttribute("aria-pressed") !== "true";
          chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip && on ? "true" : "false"); });
          say(out, chip.textContent.replace(/\s+/g, " ").trim() + group.getAttribute(on ? "data-on" : "data-off"));
        });
      });
    });
  }

  /* ---- the marquee: a visible pause, as WCAG 2.2.2 asks for moving content (site.js) ---------- */
  function initMarquee() {
    $all(".band-toggle").forEach(function (btn) {
      var panel = btn.closest(".band-panel");
      var track = panel && panel.querySelector(".marquee");
      var label = btn.querySelector(".band-toggle-tx");
      if (!track || !label) return;
      btn.addEventListener("click", function () {
        var paused = btn.getAttribute("data-paused") !== "true";
        btn.setAttribute("data-paused", paused ? "true" : "false");
        track.classList.toggle("is-paused", paused);
        label.textContent = label.getAttribute(paused ? "data-off" : "data-on");
      });
    });
  }

  /* ---- the video block: a big play button over the native player, chapters by time (site.js) --- */
  function initVideo(fig) {
    var video = fig.querySelector("video");
    var btn = fig.querySelector(".vid-play");
    var missing = fig.querySelector(".vid-missing");
    var status = fig.querySelector(".vid-status");
    var chapters = fig.querySelector(".chapters");
    var buttons = $all(".chapter", fig);
    if (!video) return;
    var sources = video.querySelectorAll("source");
    var last = sources[sources.length - 1];
    var failed = false;

    function fail() {
      if (failed) return;
      failed = true;
      fig.setAttribute("data-state", "missing");
      missing.hidden = false;
      if (chapters) chapters.hidden = true;
      say(status, missing.textContent.replace(/\s+/g, " ").trim());
    }
    function start(at) {
      if (failed) { missing.focus(); return; }
      if (typeof at === "number" && isFinite(at)) {
        try { video.currentTime = at; } catch (err) { /* not seekable yet */ }
      }
      var p = video.play();
      if (p && p.catch) {
        p.catch(function (err) {
          if (err && err.name === "NotSupportedError") { fail(); missing.focus(); }
        });
      }
    }
    if (last) last.addEventListener("error", fail);
    video.addEventListener("error", fail);
    video.addEventListener("play", function () { fig.setAttribute("data-state", "playing"); });
    if (btn) btn.addEventListener("click", function () { start(); video.focus(); });

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { start(parseFloat(b.getAttribute("data-t"))); });
    });
    var times = buttons.map(function (b) { return parseFloat(b.getAttribute("data-t")); });
    video.addEventListener("timeupdate", function () {
      var now = video.currentTime;
      var at = -1;
      times.forEach(function (t, i) { if (isFinite(t) && now + 0.05 >= t) at = i; });
      buttons.forEach(function (b, i) {
        if (i === at) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
    });
  }

  /* ---- the turntable: plays by itself unless the viewer asked for less motion ------------------ */
  function initSpin() {
    var v = $(".spin-video");
    var b = $(".spin-toggle");
    if (!v || !b) return;
    var label = b.querySelector(".spin-label");
    function show(playing) {
      b.setAttribute("aria-pressed", playing ? "true" : "false");
      if (label) label.textContent = label.getAttribute(playing ? "data-playing" : "data-paused");
    }
    function play() {
      var p = v.play();
      if (p && p.catch) p.catch(function () { show(false); });
    }
    v.addEventListener("play", function () { show(true); });
    v.addEventListener("pause", function () { show(false); });
    b.addEventListener("click", function () { if (v.paused) play(); else v.pause(); });
    if (!still()) play();
  }

  /* ---- what the viewer's device asked for ------------------------------------------------------- */
  function initPref() {
    var out = byId("mo-pref");
    if (!out || !reduce) return;
    function show() { out.textContent = out.getAttribute(still() ? "data-still" : "data-moving"); }
    show();
    if (reduce.addEventListener) reduce.addEventListener("change", show);
    else if (reduce.addListener) reduce.addListener(show);
  }

  initPairs();
  measure();
  initToggles();
  initReplays();
  initPress();
  initChips();
  initMarquee();
  $all(".vid").forEach(initVideo);
  initSpin();
  initPref();

  var raf = 0;
  window.addEventListener("resize", function () {
    window.cancelAnimationFrame(raf);
    raf = window.requestAnimationFrame(measure);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
