/* BistroTech website lab, direction B "Pop": script.js, v0.1.0, 2026-09-25.
   Vanilla, no dependencies, no network request of its own. Each part looks for its own
   markup first, so one file serves index.html and sugo.html.
   Parts: the phone menu, the marquee pause, the try-it reply (rewrite chips, approve, skip,
   toast with an eight-second undo), the help search filter, the video facade, feedback. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* A polite live region. Emptying it first lets the same words be announced twice. */
  function say(region, text) {
    if (!region) return;
    region.textContent = "";
    window.setTimeout(function () { region.textContent = text; }, 60);
  }

  /* ---- the phone menu ---------------------------------------------------- */
  function initMenu() {
    var btn = $(".menu-btn");
    var menu = $("#site-menu");
    if (!btn || !menu) return;
    var icon = btn.querySelector("use");
    function isOpen() { return btn.getAttribute("aria-expanded") === "true"; }
    function setOpen(open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      menu.classList.toggle("is-open", open);
      if (icon) icon.setAttribute("href", open ? "#i-close" : "#i-menu");
    }
    btn.addEventListener("click", function () { setOpen(!isOpen()); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { setOpen(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && !e.target.closest(".nav-bar")) setOpen(false);
    });
  }

  /* ---- the marquee: a visible pause, as WCAG 2.2.2 asks for moving content ---- */
  function initMarquee() {
    var btn = $(".band-toggle");
    var track = $(".marquee");
    if (!btn || !track) return;
    var label = btn.querySelector(".band-toggle-tx");
    btn.addEventListener("click", function () {
      var paused = btn.getAttribute("data-paused") !== "true";
      btn.setAttribute("data-paused", paused ? "true" : "false");
      track.classList.toggle("is-paused", paused);
      label.textContent = label.getAttribute(paused ? "data-off" : "data-on");
    });
  }

  /* ---- try it: approve a drafted reply ------------------------------------- */
  function initTry() {
    var card = $(".try");
    if (!card) return;
    var area = $("#try-text");
    var live = $("#try-live");
    var toast = $("#try-toast");
    var toastMsg = toast.querySelector(".toast-msg");
    var undoBtn = toast.querySelector(".toast-undo");
    var bar = toast.querySelector(".toast-bar");
    var chips = $all(".chip", card);
    var approveBtn = card.querySelector('[data-act="approve"]');
    var resetBtn = card.querySelector('[data-act="reset"]');
    var texts = {};
    var says = {};

    /* The signature goes on its own line, the way a reply is read. */
    function format(t) {
      return t.replace(/\s+/g, " ").trim().replace(/\s*A Példa Bisztró csapata$/, "\n\nA Példa Bisztró csapata");
    }
    $all("#try-variants [data-v]").forEach(function (p) { texts[p.getAttribute("data-v")] = format(p.textContent); });
    $all("#try-variants [data-say]").forEach(function (p) { says[p.getAttribute("data-say")] = p.textContent.replace(/\s+/g, " ").trim(); });

    var current = null;
    var saved = { text: area.value, variant: null };

    function fit() {
      area.style.height = "auto";
      area.style.height = (area.scrollHeight + 4) + "px";
    }
    function setText(t) {
      area.value = t;
      fit();
      if (!reduceMotion.matches) {
        area.classList.add("is-swapped");
        window.setTimeout(function () { area.classList.remove("is-swapped"); }, 420);
      }
    }
    function press(variant) {
      current = variant;
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-variant") === variant ? "true" : "false");
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.getAttribute("aria-pressed") === "true") {
          press(null);
          setText(texts.eredeti);
          say(live, says.restore);
          return;
        }
        var v = chip.getAttribute("data-variant");
        press(v);
        setText(texts[v]);
        say(live, chip.getAttribute("data-say"));
      });
    });
    area.addEventListener("input", function () { if (current) press(null); fit(); });

    /* The toast: eight seconds, paused while a pointer rests on it or while it holds
       keyboard focus, so nobody is rushed (WCAG 2.2.1). */
    var timer = null;
    var left = 0;
    var since = 0;
    var holds = { hover: false, focus: false };
    function held() { return holds.hover || holds.focus; }
    function run() {
      window.clearTimeout(timer);
      since = Date.now();
      timer = window.setTimeout(expire, left);
      toast.classList.remove("is-paused");
    }
    function hold(key, on) {
      holds[key] = on;
      if (toast.hidden) return;
      if (held()) {
        if (timer) { window.clearTimeout(timer); timer = null; left -= Date.now() - since; }
        toast.classList.add("is-paused");
      } else if (!timer) {
        run();
      }
    }
    function showToast(msg) {
      toastMsg.textContent = msg;
      toast.hidden = false;
      bar.classList.remove("is-running");
      void bar.offsetWidth;
      bar.classList.add("is-running");
      holds = { hover: false, focus: false };
      left = 8000;
      run();
    }
    function hideToast() {
      window.clearTimeout(timer);
      timer = null;
      toast.hidden = true;
      toast.classList.remove("is-paused");
      bar.classList.remove("is-running");
    }
    function expire() {
      var hadFocus = toast.contains(document.activeElement);
      hideToast();
      if (hadFocus) resetBtn.focus();
    }
    toast.addEventListener("mouseenter", function () { hold("hover", true); });
    toast.addEventListener("mouseleave", function () { hold("hover", false); });
    toast.addEventListener("focusin", function (e) {
      var kb = false;
      try { kb = e.target.matches(":focus-visible"); } catch (err) { kb = true; }
      if (kb) hold("focus", true);
    });
    toast.addEventListener("focusout", function () { hold("focus", false); });
    toast.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { hideToast(); resetBtn.focus(); }
    });

    function setState(s) {
      card.setAttribute("data-state", s);
      area.readOnly = s !== "pending";
      fit();
    }
    function act(kind) {
      if (kind === "approve" || kind === "skip") {
        saved = { text: area.value, variant: current };
        setState(kind === "approve" ? "approved" : "skipped");
        showToast(kind === "approve" ? "Jóváhagyva." : "Kihagyva.");
        say(live, says[kind]);
        undoBtn.focus();
      } else if (kind === "undo") {
        hideToast();
        setState("pending");
        area.value = saved.text;
        press(saved.variant);
        fit();
        say(live, says.undo);
        approveBtn.focus();
      } else if (kind === "reset") {
        hideToast();
        setState("pending");
        press(null);
        setText(texts.eredeti);
        say(live, says.reset);
        approveBtn.focus();
      } else if (kind === "restore") {
        press(null);
        setText(texts.eredeti);
        say(live, says.restore);
      }
    }
    card.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (b) act(b.getAttribute("data-act"));
    });
    undoBtn.addEventListener("click", function () { act("undo"); });

    fit();
    var raf = 0;
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(fit);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  /* ---- help search: filters the fixed list of article titles in the page ---- */
  function initHelpSearch() {
    var form = $(".help-search");
    var input = $("#help-q");
    var box = $("#results");
    var list = $("#results-list");
    var count = $("#results-count");
    if (!form || !input || !list) return;
    var cats = $all(".cats .chip");
    var items = $all("li", list);
    var cat = null;
    var debounce = 0;
    function norm(s) {
      return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    }
    items.forEach(function (li) {
      li.setAttribute("data-text", norm(li.textContent));
    });
    function apply(announce) {
      var words = norm(input.value).split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (li) {
        var text = li.getAttribute("data-text");
        var ok = (!cat || li.getAttribute("data-cat") === cat) &&
          words.every(function (w) { return text.indexOf(w) !== -1; });
        li.hidden = !ok;
        if (ok) shown += 1;
      });
      var active = words.length > 0 || cat !== null;
      box.hidden = !active || shown === 0;
      window.clearTimeout(debounce);
      if (!active) { count.textContent = ""; return; }
      var msg = shown ? shown + " cikk" : "Nincs ilyen cikk. Próbáld másik szóval.";
      if (announce) debounce = window.setTimeout(function () { count.textContent = msg; }, 280);
      else count.textContent = msg;
    }
    input.addEventListener("input", function () { apply(true); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      apply(false);
      var first = items.filter(function (li) { return !li.hidden; })[0];
      if (first && !box.hidden) first.querySelector("a").focus();
    });
    cats.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var on = chip.getAttribute("aria-pressed") !== "true";
        cats.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        cat = on ? chip.getAttribute("data-cat") : null;
        apply(true);
      });
    });
  }

  /* ---- the video: a big play button over the native player, chapters from the captions ---- */
  function initVideo() {
    var fig = $(".vid");
    if (!fig) return;
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

    /* The poster is the first thing anybody sees: if it cannot load, say so now. */
    var poster = video.getAttribute("poster");
    if (poster) {
      var probe = new Image();
      probe.onerror = fail;
      probe.src = poster;
    }

    /* Chapters: each button names the first words of a caption cue; its time comes from
       the track itself. Nothing is shown until the cues are there. */
    var trackEl = video.querySelector('track[srclang="hu"]');
    function fmt(t) {
      var m = Math.floor(t / 60);
      var s = Math.floor(t % 60);
      return m + ":" + (s < 10 ? "0" : "") + s;
    }
    function norm(x) { return x.replace(/\s+/g, " ").trim(); }
    function build() {
      var track = trackEl && trackEl.track;
      if (!track || !track.cues || !track.cues.length || !chapters) return;
      var cues = Array.prototype.slice.call(track.cues);
      var found = 0;
      buttons.forEach(function (b) {
        var key = b.getAttribute("data-cue");
        var cue = cues.filter(function (c) { return norm(c.text).indexOf(key) === 0; })[0];
        if (!cue) { b.parentNode.hidden = true; return; }
        found += 1;
        b.setAttribute("data-t", String(cue.startTime));
        b.querySelector(".ch-t").textContent = fmt(cue.startTime);
      });
      if (found && !failed) chapters.hidden = false;
    }
    if (trackEl) {
      if (trackEl.readyState === 2) build();
      trackEl.addEventListener("load", build);
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var t = parseFloat(b.getAttribute("data-t"));
        start(t);
      });
    });
    var times = function () {
      return buttons.map(function (b) { return parseFloat(b.getAttribute("data-t")); });
    };
    video.addEventListener("timeupdate", function () {
      var ts = times();
      var now = video.currentTime;
      var at = -1;
      ts.forEach(function (t, i) { if (isFinite(t) && now + 0.05 >= t) at = i; });
      buttons.forEach(function (b, i) {
        if (i === at) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
    });
  }

  /* ---- was this helpful ----------------------------------------------------- */
  function initFeedback() {
    var box = $(".feedback");
    if (!box) return;
    var done = box.querySelector(".fb-done");
    var buttons = $all("[data-fb]", box);
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        if (box.getAttribute("data-answered") === "true") return;
        box.setAttribute("data-answered", "true");
        buttons.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        say(done, "Köszönjük.");
      });
    });
  }

  initMenu();
  initMarquee();
  initTry();
  initHelpSearch();
  initVideo();
  initFeedback();
})();
