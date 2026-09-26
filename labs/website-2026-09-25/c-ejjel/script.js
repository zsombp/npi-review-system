/* BistroTech website lab, direction C "Éjjel". script.js v0.1.0, 2026-09-25.
   Vanilla, no dependencies, nothing leaves the page. Every visible string the script shows
   is read from the HTML, so the copy lives in one place and the copy checker sees it.
   Parts: day and night switch, phone menu, the light the glass catches, pausing the glows
   off screen, the app mock with the try-it reply, and the help page (search, video, feedback). */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var KEY = "bt-lab-ejjel-theme";
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduceMotion = mq("(prefers-reduced-motion: reduce)").matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var fold = function (s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };
  var squash = function (s) { return String(s).replace(/\s+/g, " ").trim(); };

  /* ---- day and night -------------------------------------------------------------- */
  var modeBtn = doc.getElementById("mode");
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function applyTheme(t, remember) {
    root.setAttribute("data-theme", t);
    if (modeBtn) modeBtn.setAttribute("aria-checked", t === "night" ? "true" : "false");
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "night" ? "#1a0f14" : "#fff6ea");
    if (remember) { try { localStorage.setItem(KEY, t); } catch (e) { /* not remembered, still works */ } }
  }
  applyTheme(root.getAttribute("data-theme") === "day" ? "day" : "night", false);
  if (modeBtn) {
    modeBtn.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "night" ? "day" : "night", true);
    });
  }
  var light = mq("(prefers-color-scheme: light)");
  var onSystem = function (e) { var s = saved(); if (s !== "day" && s !== "night") applyTheme(e.matches ? "day" : "night", false); };
  if (light.addEventListener) light.addEventListener("change", onSystem);

  /* ---- in-page links glide, unless the person asked for less motion ------------------ */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || reduceMotion || e.defaultPrevented) return;
    var id = a.getAttribute("href").slice(1);
    var t = id && doc.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: "smooth", block: "start" });
    if (history.pushState) history.pushState(null, "", "#" + id);
    if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
    t.focus({ preventScroll: true });
  });

  /* ---- phone menu ------------------------------------------------------------------ */
  var toggle = doc.querySelector(".nav-toggle");
  var menu = doc.getElementById("nav-main");
  if (toggle && menu) {
    var setOpen = function (on) {
      toggle.setAttribute("aria-expanded", on ? "true" : "false");
      menu.classList.toggle("is-open", on);
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
    });
    doc.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !e.target.closest(".nav")) setOpen(false);
    });
  }

  /* ---- the light the glass catches (pointer devices only) -------------------------- */
  if (!reduceMotion && mq("(hover: hover) and (pointer: fine)").matches) {
    var raf = 0, target = null, px = 0, py = 0;
    doc.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".glass, .glass-strong");
      if (!el) return;
      target = el; px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = target.getBoundingClientRect();
        target.style.setProperty("--mx", (px - r.left) + "px");
        target.style.setProperty("--my", (py - r.top) + "px");
      });
    }, { passive: true });
  }

  /* ---- glows pause off screen, the eleven windows light up once -------------------- */
  var lights = doc.querySelectorAll("[data-light]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target.hasAttribute("data-anim")) en.target.classList.toggle("is-off", !en.isIntersecting);
        if (en.isIntersecting && en.target.hasAttribute("data-light")) en.target.classList.add("is-lit");
      });
    }, { rootMargin: "60px 0px" });
    each(doc.querySelectorAll("[data-anim], [data-light]"), function (el) { io.observe(el); });
  } else {
    each(lights, function (el) { el.classList.add("is-lit"); });
  }

  /* ---- lazy images start loading two screens ahead, so a fast scroll never meets an empty phone */
  if ("IntersectionObserver" in window) {
    var early = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.loading = "eager"; early.unobserve(en.target); }
      });
    }, { rootMargin: "1800px 0px" });
    each(doc.querySelectorAll('img[loading="lazy"]'), function (img) { early.observe(img); });
  }

  /* ---- the app mock ---------------------------------------------------------------- */
  var app = doc.getElementById("app");
  if (app) initApp(app);

  function initApp(app) {
    var tabs = Array.prototype.slice.call(app.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute("aria-controls")); });
    var main = doc.getElementById("app-main");
    var live = doc.getElementById("app-live");
    var data = app.querySelector(".app-data");
    var ta = doc.getElementById("draft-text");
    var edited = doc.getElementById("draft-edited");
    var errLine = doc.getElementById("draft-error");
    var toast = doc.getElementById("m-toast");
    var VAL = tabs.map(function (t) { return t.id; }).indexOf("t-val");
    var ERT = tabs.map(function (t) { return t.id; }).indexOf("t-ert");
    var str = function (sel) { var el = data.querySelector(sel); return el ? squash(el.textContent) : ""; };
    var ORIGINAL = str('[data-variant="default"]');
    var state = "pending";
    var toastOpen = false, timer = null, remaining = 0, startedAt = 0, paused = false;

    function say(msg) {
      live.textContent = "";
      setTimeout(function () { live.textContent = msg; }, 80);
    }
    function current() {
      for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute("aria-selected") === "true") return i;
      return 0;
    }
    function autosize() {
      if (!ta || !ta.offsetParent) return;
      ta.style.height = "auto";
      ta.style.height = (ta.scrollHeight + 2) + "px";
    }
    function focusSoon(el) {
      if (!el) return;
      requestAnimationFrame(function () { if (el.offsetParent !== null) el.focus(); });
    }

    function select(i, opts) {
      opts = opts || {};
      var prev = current();
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      app.setAttribute("data-view", tabs[i].id.slice(2));
      if (prev !== i) {
        main.scrollTop = 0;
        if (!reduceMotion) {
          panels[i].classList.remove("is-entering");
          void panels[i].offsetWidth;
          panels[i].classList.add("is-entering");
        }
      }
      if (i === VAL) requestAnimationFrame(autosize);
      if (opts.focusTab) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length, to = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") to = (i + 1) % n;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = (i - 1 + n) % n;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = n - 1;
        if (to !== null) { e.preventDefault(); select(to, { focusTab: true }); }
      });
    });

    function render() {
      app.setAttribute("data-state", state);
      each(app.querySelectorAll("[data-show]"), function (el) {
        el.hidden = el.getAttribute("data-show").split(" ").indexOf(state) === -1;
      });
    }
    function updateEdited() { edited.hidden = squash(ta.value) === ORIGINAL; }

    /* the toast: eight seconds to undo, paused while pointer or focus is on it */
    function openToast() {
      clearTimeout(timer);
      toastOpen = true; paused = false;
      toast.hidden = false;
      toast.classList.remove("is-paused");
      var bar = toast.querySelector(".m-toast-bar i");
      if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
      remaining = 8000; startedAt = Date.now();
      timer = setTimeout(closeToast, remaining);
    }
    function closeToast() {
      clearTimeout(timer); timer = null;
      var hadFocus = toast.contains(doc.activeElement);
      toastOpen = false; toast.hidden = true;
      if (hadFocus) focusSoon(doc.getElementById("done-title"));
    }
    function pause() {
      if (!toastOpen || paused) return;
      paused = true; clearTimeout(timer);
      remaining -= Date.now() - startedAt;
      toast.classList.add("is-paused");
    }
    function resume() {
      if (!toastOpen || !paused) return;
      if (toast.matches(":hover") || toast.contains(doc.activeElement)) return;
      paused = false; startedAt = Date.now();
      remaining = Math.max(remaining, 1500);
      timer = setTimeout(closeToast, remaining);
      toast.classList.remove("is-paused");
    }
    toast.addEventListener("mouseenter", pause);
    toast.addEventListener("mouseleave", resume);
    toast.addEventListener("focusin", pause);
    toast.addEventListener("focusout", function () { setTimeout(resume, 0); });

    function decide(kind) {
      if (state !== "pending") return;
      if (kind === "approved" && !squash(ta.value)) { errLine.hidden = false; ta.focus(); return; }
      errLine.hidden = true;
      state = kind;
      render();
      if (current() !== VAL) select(VAL);
      openToast();
      say(str('[data-say="' + kind + '"]'));
      focusSoon(doc.getElementById("done-title"));
    }
    function undo() {
      if (!toastOpen) return;
      clearTimeout(timer); toastOpen = false; toast.hidden = true;
      state = "pending";
      render();
      if (current() !== VAL) select(VAL);
      requestAnimationFrame(autosize);
      say(str('[data-say="undone"]'));
      focusSoon(doc.getElementById("draft-title"));
    }
    function reset() {
      clearTimeout(timer); toastOpen = false; toast.hidden = true;
      state = "pending";
      ta.value = ORIGINAL;
      errLine.hidden = true;
      render(); updateEdited();
      requestAnimationFrame(autosize);
      say(str('[data-say="reset"]'));
      focusSoon(doc.getElementById("draft-title"));
    }

    /* rewrite chips: the deck's pre-written variants, no model call */
    each(app.querySelectorAll("button[data-variant]"), function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-variant");
        ta.value = str('[data-variant="' + (v === "formal" ? "default" : v) + '"]');
        errLine.hidden = true;
        autosize(); updateEdited();
        if (!reduceMotion) { ta.classList.remove("is-swapped"); void ta.offsetWidth; ta.classList.add("is-swapped"); }
        say(str('[data-say="' + v + '"]'));
      });
    });
    ta.addEventListener("input", function () { updateEdited(); autosize(); if (squash(ta.value)) errLine.hidden = true; });

    /* reviews: search and the quick filters */
    var q = doc.getElementById("rv-q");
    var count = doc.getElementById("rv-count");
    var rvLive = doc.getElementById("rv-live");
    var empty = doc.getElementById("rv-empty");
    var fchips = Array.prototype.slice.call(app.querySelectorAll("[data-f]"));
    var items = Array.prototype.slice.call(app.querySelectorAll(".m-review"));
    var filter = "all", liveTimer = null, word = str('[data-say="results"]');
    function applyFilter() {
      var term = fold(q.value.trim()), n = 0;
      items.forEach(function (li) {
        var r = Number(li.getAttribute("data-rating")), waiting = li.getAttribute("data-waiting") === "1";
        var okF = filter === "all" || (filter === "waiting" && waiting) || (filter === "serious" && r <= 2) || (filter === "five" && r === 5);
        var okQ = !term || fold(li.textContent).indexOf(term) !== -1;
        li.hidden = !(okF && okQ);
        if (!li.hidden) n++;
      });
      count.textContent = n + " " + word;
      empty.hidden = n > 0;
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () { rvLive.textContent = count.textContent; }, 450);
    }
    function setFilter(f) {
      filter = f;
      fchips.forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-f") === f ? "true" : "false"); });
      applyFilter();
    }
    fchips.forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.getAttribute("data-f");
        setFilter(filter === f && f !== "all" ? "all" : f);
      });
    });
    q.addEventListener("input", applyFilter);

    /* every button in the mock */
    app.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b || !app.contains(b)) return;
      var act = b.getAttribute("data-act");
      if (act === "review") { select(VAL); focusSoon(doc.getElementById("draft-title")); }
      else if (act === "approve") decide("approved");
      else if (act === "skip") decide("skipped");
      else if (act === "restore") { ta.value = ORIGINAL; autosize(); updateEdited(); say(str('[data-say="restored"]')); ta.focus(); }
      else if (act === "undo") undo();
      else if (act === "home") select(0, { focusTab: true });
      else if (act === "reset") reset();
      else if (act === "open-waiting") { select(ERT); q.value = ""; setFilter("waiting"); focusSoon(doc.getElementById("ert-title")); }
    });

    /* keys, as in the product, but only while focus is inside the mock (WCAG 2.1.4) */
    app.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t === ta) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); decide("approved"); }
        return;
      }
      if (t.matches && t.matches("input, textarea, select")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = (e.key || "").toLowerCase();
      if (k === "u" && toastOpen) { e.preventDefault(); undo(); return; }
      if (current() !== VAL || state !== "pending") return;
      if (k === "a") { e.preventDefault(); decide("approved"); }
      else if (k === "s") { e.preventDefault(); decide("skipped"); }
      else if (k === "e") { e.preventDefault(); ta.focus(); }
    });

    ta.value = ORIGINAL;
    render();
    updateEdited();
  }

  /* ---- help page ------------------------------------------------------------------- */
  var hq = doc.getElementById("help-q");
  if (hq) initHelpSearch();

  function initHelpSearch() {
    var results = doc.getElementById("help-results");
    var list = Array.prototype.slice.call(results.querySelectorAll("li"));
    var countEl = doc.getElementById("help-count");
    var emptyEl = doc.getElementById("help-empty");
    var liveEl = doc.getElementById("help-live");
    var word = countEl.getAttribute("data-word") || "";
    var cats = Array.prototype.slice.call(doc.querySelectorAll("[data-cat-btn]"));
    var cat = null, t = null;
    function run() {
      var term = fold(hq.value.trim()), n = 0;
      if (!term && !cat) { results.hidden = true; liveEl.textContent = ""; return; }
      results.hidden = false;
      list.forEach(function (li) {
        var okC = !cat || li.getAttribute("data-cat") === cat;
        var okQ = !term || fold(li.textContent).indexOf(term) !== -1;
        li.hidden = !(okC && okQ);
        if (!li.hidden) n++;
      });
      emptyEl.hidden = n > 0;
      countEl.textContent = n + " " + word;
      clearTimeout(t);
      t = setTimeout(function () { liveEl.textContent = n > 0 ? countEl.textContent : squash(emptyEl.textContent); }, 450);
    }
    hq.addEventListener("input", run);
    cats.forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-cat-btn");
        cat = cat === c ? null : c;
        cats.forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-cat-btn") === cat ? "true" : "false"); });
        run();
      });
    });
  }

  /* the video: nothing is fetched until someone presses play */
  var play = doc.getElementById("video-play");
  if (play) {
    play.addEventListener("click", function () {
      var frame = doc.getElementById("video-frame");
      var tpl = doc.getElementById("video-tpl");
      var missing = doc.getElementById("video-missing");
      var v = tpl.content.querySelector("video").cloneNode(true);
      var failed = false;
      var fail = function () {
        if (failed) return;
        failed = true;
        if (v.parentNode) v.parentNode.removeChild(v);
        frame.setAttribute("data-state", "missing");
        missing.hidden = false;
        missing.focus();
      };
      var sources = v.querySelectorAll("source");
      if (sources.length) sources[sources.length - 1].addEventListener("error", fail);
      v.addEventListener("error", fail);
      frame.setAttribute("data-state", "video");
      play.hidden = true;
      frame.appendChild(v);
      v.focus();
      var p = v.play();
      if (p && p.catch) p.catch(function (err) { if (err && err.name === "NotSupportedError") fail(); });
    });
  }

  /* feedback */
  var fbButtons = doc.querySelectorAll("[data-fb]");
  if (fbButtons.length) {
    var thanks = doc.getElementById("fb-thanks");
    each(fbButtons, function (b) {
      b.addEventListener("click", function () {
        each(fbButtons, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        thanks.textContent = "";
        setTimeout(function () { thanks.textContent = thanks.getAttribute("data-thanks"); }, 60);
      });
    });
  }
})();
