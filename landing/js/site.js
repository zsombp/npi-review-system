/* BistroTech website, Pop: site.js, v0.3.4, 2026-09-28 (v0.3.3 and v0.3.2 on 2026-09-27; v0.3.1, v0.3.0,
   v0.2.0 and v0.1.0 on 2026-09-26).
   v0.3.4, the critical review of 2026-09-28 (docs/reviews/critical-2026-09-28/, fix/website.md there): the
   demo form keeps the focus, says when it is slow, gives up after fifteen seconds, points at the field the
   lead function refuses, and shows its limits (initForm; C-181, C-182, C-183, C-294). The other parts of
   that pass name their cluster where they sit.
   v0.3.3, the layout audit's Part 6 follow-up: the introduction video's cut check also runs when full
   screen ends and when the phone turns, so a cut hidden on leaving full screen is paused (initIntroCuts).
   v0.3.2, the layout audit's Part 5 follow-up (LAYOUT-AUDIT-WEBSITE-2026-09-26.md): the introduction
   video's hidden cut fetches nothing, not even its still (initIntroCuts), and pauses if it leaves the
   screen while playing.
   v0.3.1, part 4 of docs/reviews/CODEX-MOTION-REVIEW-2026-09-26.md: the marquee's loop and its row
   change places without moving a card (the pause sent it back to its start); a touchscreen that also
   hovers counts as touch once touched, so a flick's momentum holds the loops there too, with the
   scroll's end where the browser reports it.
   v0.3.0 is below.
   v0.3.0, the findings of docs/reviews/CODEX-MOTION-REVIEW-2026-09-26.md part 2: a finger or pen down
   holds every loop and the page wakes when it lifts (P1.1); a hidden tab pauses every loop at once,
   keeps no timer and does not wake the page on return (P2.1); each loop is watched for "out of view"
   on its own (P2.3); the sleep is one timeout, not a five-second poll; reduced motion switched on or
   off during the try-it countdown keeps the time left (P2.2).
   v0.2.0 (D-052, motion; docs/design/MOTION-v0.1.0.md v0.2.0): the marquee's own pause became the
   page pause (initMotion): one state for the Mozgás button in the header and the band's button,
   kept in this browser; a loop runs only while its block is in view and not after 60 s without
   input; and under reduced motion the try-it undo line steps down once a second instead of
   gliding. Nothing else changed.
   Vanilla, no dependencies. One file for every page; each part looks for its own markup first.
   No sentence lives here: every word a visitor sees comes from the page (a text node or a data
   attribute), so the English site will reuse this file as it is.
   Parts: the phone menu, the page pause and the loops, the try-it reply, the help search (reads
   sugo/kereses.json from this site when the search is first used), the video blocks, was this
   helpful, the demo request form (platform/landing/script.js, unchanged in what it sends), and the
   landing's old #anchors on the home page.
   The only network request of its own is the demo form's POST to the lead function, and only
   when a person sends the form. */
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
    // C-313 (2026-09-28): the keyboard leaving the open menu closes it, so the focus never lands on a
    // control the panel still covers (WCAG 2.4.11). A blur to nowhere is left to the click rule above.
    var bar = btn.closest(".nav-bar");
    if (bar) bar.addEventListener("focusout", function (e) {
      var to = e.relatedTarget;
      if (isOpen() && to && !bar.contains(to)) setOpen(false);
    });
  }

  /* ---- motion: the page pause, in view, asleep, hidden, under a finger (WCAG 2.2.2) ---------------
     One state for every [data-motion-toggle] (the Mozgás button in the header, the marquee's own),
     kept in this browser under motion.paused; the head's script puts it on <html> before the first
     paint. Every loop pauses through one inherited property, --loop-play (site.css), set to paused:
       - on <html> while the page is asleep (60 s without input, until the next input), hidden (the
         tab is not shown: at once, and no timer runs meanwhile; coming back does not wake it), or
         interacting (a finger or pen is down, and SETTLE_MS after the last one lifts; on a phone a
         scroll counts too), so nothing moves under a finger and the finger that wakes the page does
         not start what is under it: the page wakes when it lifts;
       - on a loop's block (.loop-host, its section) under the pointer or with the focus inside;
       - on the loop itself when it is out of view (.is-out: each loop is watched on its own, so one
         below the fold stops although its section's top is on screen).
     Under reduced motion nothing loops and the buttons are not shown. v0.3.0: the findings of
     docs/reviews/CODEX-MOTION-REVIEW-2026-09-26.md part 2 (P1.1, P1.2, P2.1, P2.3). */
  var LOOPS = ".marquee, .sticker-free, .sticker-note, .sticker-final, .sticker-page, .sticker-help, .illo-render img";
  var SLEEP_MS = 60000;
  var SETTLE_MS = 1200;
  function initMotion() {
    var root = document.documentElement;
    var buttons = $all("[data-motion-toggle]");
    function paused() { return root.getAttribute("data-paused") === "true"; }
    function sync() {
      var p = paused();
      buttons.forEach(function (b) {
        b.setAttribute("data-paused", p ? "true" : "false");
        var tx = b.querySelector("[data-on]");
        if (tx) tx.textContent = tx.getAttribute(p ? "data-off" : "data-on");
        if (b.hasAttribute("data-label-on")) b.setAttribute("aria-label", b.getAttribute(p ? "data-label-off" : "data-label-on"));
      });
    }
    // the marquee rolls or is the row you scroll (data-row), and its place is carried over both ways:
    // the loop's offset becomes the row's scroll position, the row's scroll position the point the
    // loop goes on from, so pausing and starting again move no card (the motion review, part 4)
    var mq = $(".marquee");
    var inner = mq && mq.querySelector(".marquee-inner");
    var firstList = inner && inner.querySelector(".marquee-list");
    var ROUND_MS = 64000; // --m-band
    function span() { return firstList ? firstList.getBoundingClientRect().width : 0; }
    // C-318 (2026-09-28): enough copies of the set to cover the window and one set more, and the loop
    // moves by one set (site.css: -100% / --band-n), so the band never runs empty and never jumps, at any
    // width (with two copies it ran out past a 2 512 px window). Copies are only added, never removed.
    function fillBand() {
      if (!inner || !firstList) return;
      var set = span();
      var proto = inner.querySelector(".marquee-copy");
      if (!set || !proto) return;
      var copies = inner.querySelectorAll(".marquee-list").length;
      var need = Math.max(2, Math.ceil(window.innerWidth / set) + 1);
      while (copies < need) { inner.appendChild(proto.cloneNode(true)); copies++; }
      inner.style.setProperty("--band-n", String(copies));
    }
    function wrap(x, m) { return m > 0 ? ((x % m) + m) % m : 0; }
    function toRow() {
      if (!mq || mq.hasAttribute("data-row")) return;
      var t = window.getComputedStyle(inner).transform;
      var p = t && t !== "none" && window.DOMMatrixReadOnly ? wrap(-new window.DOMMatrixReadOnly(t).m41, span()) : 0;
      mq.setAttribute("data-row", "");
      inner.style.animationDelay = "";
      mq.scrollLeft = p;
    }
    function toRoll() {
      if (!mq || !mq.hasAttribute("data-row")) return;
      var s = span();
      var p = wrap(mq.scrollLeft, s);
      inner.style.animationDelay = s > 0 ? (-(p / s) * ROUND_MS) + "ms" : "";
      mq.removeAttribute("data-row");
      mq.scrollLeft = 0;
    }
    function keyboardIn() { return !!(mq && mq.matches(":focus-visible")); }
    function marqueeFollows() {
      if (!mq) return;
      if (reduceMotion.matches) { mq.setAttribute("data-row", ""); inner.style.animationDelay = ""; return; }
      if (paused() || keyboardIn()) toRow(); else toRoll();
    }
    function setPaused(p) {
      // the marquee becomes the row before the page is paused, and rolls again after it is not
      if (p) toRow();
      if (p) root.setAttribute("data-paused", "true"); else root.removeAttribute("data-paused");
      try { if (p) window.localStorage.setItem("motion.paused", "1"); else window.localStorage.removeItem("motion.paused"); } catch (e) { /* this visit only */ }
      if (!p) marqueeFollows();
      sync();
      armSleep();
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { setPaused(!paused()); }); });
    sync();
    if (mq) {
      fillBand();
      window.addEventListener("resize", fillBand);
      if (paused() || reduceMotion.matches) mq.setAttribute("data-row", "");
      mq.addEventListener("focusin", function () { window.setTimeout(marqueeFollows, 0); });
      mq.addEventListener("focusout", function () { window.setTimeout(marqueeFollows, 0); });
    }

    // out of view: each loop on its own; its section groups the pointer and the focus
    if ("IntersectionObserver" in window) {
      var io = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle("is-out", !e.isIntersecting); });
      });
      $all(LOOPS).forEach(function (el) {
        var host = el.closest("section, .blk") || el.parentElement;
        if (host) host.classList.add("loop-host");
        io.observe(el);
      });
    }

    // asleep: one timeout, armed only while loops may run; firing early (there was input since), it
    // re-arms for the rest
    var last = Date.now();
    var sleepTimer = null;
    function armSleep() {
      window.clearTimeout(sleepTimer);
      sleepTimer = null;
      if (paused() || reduceMotion.matches || document.hidden || root.hasAttribute("data-asleep")) return;
      sleepTimer = window.setTimeout(function () {
        sleepTimer = null;
        if (Date.now() - last >= SLEEP_MS) { if (!paused() && !document.hidden) root.setAttribute("data-asleep", "true"); }
        else armSleep();
      }, Math.max(0, SLEEP_MS - (Date.now() - last)));
    }
    var fingers = [];
    var settle = null;
    function wake() {
      last = Date.now();
      if (fingers.length || root.hasAttribute("data-interacting")) return; // it wakes when the finger lifts
      if (root.hasAttribute("data-asleep")) { root.removeAttribute("data-asleep"); armSleep(); }
      else if (!sleepTimer) armSleep();
    }
    function hold() {
      window.clearTimeout(settle);
      settle = null;
      root.setAttribute("data-interacting", "true");
    }
    function letGo() {
      if (fingers.length) return;
      window.clearTimeout(settle);
      settle = window.setTimeout(function () {
        settle = null;
        root.removeAttribute("data-interacting");
        if (!noHover) touching = false;
        wake();
      }, SETTLE_MS);
    }
    var capture = { passive: true, capture: true };
    var noHover = !!(window.matchMedia && window.matchMedia("(hover: none)").matches);
    // a touch interaction: on a phone always, and on a touchscreen that also hovers from a touch or pen
    // press until the page has settled after it, so a flick's momentum holds the loops there too (the
    // motion review, part 4: that was keyed on the device's hover alone)
    var touching = noHover;
    window.addEventListener("pointerdown", function (e) {
      last = Date.now();
      if (e.pointerType === "mouse") { if (!noHover) touching = false; wake(); return; } // a mouse covers nothing; the pointer's own hover pauses what it is on
      touching = true;
      if (fingers.indexOf(e.pointerId) < 0) fingers.push(e.pointerId);
      hold();
    }, capture);
    function lift(e) {
      var i = fingers.indexOf(e.pointerId);
      if (i < 0) return;
      fingers.splice(i, 1);
      letGo();
    }
    window.addEventListener("pointerup", lift, capture);
    window.addEventListener("pointercancel", lift, capture);
    // every scroll of a touch interaction, and its end where the browser reports it (the settle's
    // timeout is the fallback where it does not)
    function scrolled() { if (touching) { last = Date.now(); hold(); letGo(); } else wake(); }
    window.addEventListener("scroll", scrolled, capture);
    window.addEventListener("scrollend", function () { if (touching) { hold(); letGo(); } }, capture);
    ["pointermove", "keydown", "wheel"].forEach(function (ev) {
      window.addEventListener(ev, function (e) { if (ev === "pointermove" && e.pointerType !== "mouse") { last = Date.now(); return; } wake(); }, capture);
    });

    // hidden: every loop pauses at once and no timer is kept; coming back does not wake the page
    function visibility() {
      if (document.hidden) { root.setAttribute("data-hidden", "true"); window.clearTimeout(sleepTimer); sleepTimer = null; }
      else { root.removeAttribute("data-hidden"); armSleep(); }
    }
    document.addEventListener("visibilitychange", visibility);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", function () { marqueeFollows(); armSleep(); });
    visibility();
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
    var store = $("#try-variants");
    var signature = store.getAttribute("data-signature") || "";
    var texts = {};
    var says = {};

    /* The signature goes on its own line, the way a reply is read. */
    function format(t) {
      t = t.replace(/\s+/g, " ").trim();
      if (signature && t.slice(-signature.length - 1) === " " + signature) {
        t = t.slice(0, -signature.length - 1) + "\n\n" + signature;
      }
      return t;
    }
    $all("[data-v]", store).forEach(function (p) { texts[p.getAttribute("data-v")] = format(p.textContent); });
    $all("[data-say]", store).forEach(function (p) { says[p.getAttribute("data-say")] = p.textContent.replace(/\s+/g, " ").trim(); });

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
    /* Under reduced motion the line does not glide: it steps down once a second (site.css reads
       --left), and holds with the timer. Reduced motion switched on or off during a countdown shows
       the time actually left, from where the countdown stands, and does not move the deadline (P2.2
       of the motion review: the line jumped back to full). */
    var stepper = null;
    function rest() { return timer ? left - (Date.now() - since) : left; }
    function step() {
      bar.style.setProperty("--left", String(Math.max(0, Math.ceil(rest() / 1000)) / 8));
    }
    function lineFollows() {
      if (toast.hidden) return;
      window.clearInterval(stepper);
      stepper = null;
      if (reduceMotion.matches) { step(); stepper = window.setInterval(step, 250); return; }
      bar.style.removeProperty("--left");
      bar.classList.remove("is-running");
      void bar.offsetWidth;
      bar.style.animationDelay = -(8000 - Math.max(0, rest())) + "ms";
      bar.classList.add("is-running");
    }
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", lineFollows);
    function showToast(msg) {
      toastMsg.textContent = msg;
      toast.hidden = false;
      bar.classList.remove("is-running");
      bar.style.animationDelay = "";
      void bar.offsetWidth;
      bar.classList.add("is-running");
      holds = { hover: false, focus: false };
      left = 8000;
      run();
      window.clearInterval(stepper);
      stepper = null;
      if (reduceMotion.matches) { step(); stepper = window.setInterval(step, 250); }
    }
    function hideToast() {
      window.clearTimeout(timer);
      timer = null;
      window.clearInterval(stepper);
      stepper = null;
      bar.style.removeProperty("--left");
      bar.style.animationDelay = "";
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
        showToast(store.getAttribute(kind === "approve" ? "data-toast-ok" : "data-toast-skip"));
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

  /* ---- help search: every article, from sugo/kereses.json ------------------ */
  function initHelpSearch() {
    var form = $(".help-search");
    var input = $("#help-q");
    var box = $("#results");
    var list = $("#results-list");
    var count = $("#results-count");
    if (!form || !input || !list) return;
    var root = form.getAttribute("data-root") || "";
    var index = null;
    var loading = null;
    var debounce = 0;

    function norm(s) {
      return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    }
    function load() {
      if (index) return Promise.resolve(index);
      if (loading) return loading;
      loading = fetch(form.getAttribute("data-index"), { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (rows) {
          index = rows.map(function (a) {
            return { a: a, t: norm(a.t), s: norm(a.s + " " + a.h), b: norm(a.b) };
          });
          return index;
        })
        .catch(function () { loading = null; return []; });
      return loading;
    }
    // C-314 (2026-09-28): a word shorter than four letters ("ár") counts only at the start of a word, so it
    // no longer finds itself inside "versenytársak" or "zárul"; a longer one still matches anywhere.
    function has(text, w) {
      if (w.length >= 4) return text.indexOf(w) !== -1;
      var i = text.indexOf(w);
      while (i !== -1) {
        if (i === 0 || !/[a-z0-9]/.test(text.charAt(i - 1))) return true;
        i = text.indexOf(w, i + 1);
      }
      return false;
    }
    function search(words) {
      var hits = [];
      index.forEach(function (row) {
        var score = 0;
        var ok = words.every(function (w) {
          var inT = has(row.t, w);
          var inS = has(row.s, w);
          var inB = has(row.b, w);
          score += (inT ? 6 : 0) + (inS ? 3 : 0) + (inB ? 1 : 0);
          return inT || inS || inB;
        });
        if (ok) hits.push({ row: row, score: score });
      });
      hits.sort(function (x, y) { return y.score - x.score || x.row.a.t.localeCompare(y.row.a.t, "hu"); });
      return hits.slice(0, 12);
    }
    function item(a) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = root + a.u;
      if (location.pathname.slice(-a.u.length) === a.u) link.setAttribute("aria-current", "page");
      var main = document.createElement("span");
      main.className = "res-main";
      var title = document.createElement("span");
      title.className = "res-title";
      title.textContent = a.t;
      var sum = document.createElement("span");
      sum.className = "res-sum";
      sum.textContent = a.s;
      main.appendChild(title);
      main.appendChild(sum);
      var cat = document.createElement("span");
      cat.className = "res-cat c-" + a.cc;
      cat.textContent = a.cl;
      link.appendChild(main);
      link.appendChild(cat);
      li.appendChild(link);
      return li;
    }
    function apply(announce) {
      var words = norm(input.value).split(/\s+/).filter(Boolean);
      window.clearTimeout(debounce);
      if (!words.length) {
        box.hidden = true;
        list.textContent = "";
        count.textContent = "";
        return;
      }
      load().then(function () {
        var hits = search(words);
        list.textContent = "";
        hits.forEach(function (h) { list.appendChild(item(h.row.a)); });
        box.hidden = hits.length === 0;
        var msg = hits.length
          ? form.getAttribute("data-count").replace("{n}", String(hits.length))
          : form.getAttribute("data-none");
        if (announce) debounce = window.setTimeout(function () { count.textContent = msg; }, 280);
        else count.textContent = msg;
      });
    }
    input.addEventListener("focus", function () { load(); }, { once: true });
    input.addEventListener("input", function () { apply(true); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      apply(false);
      load().then(function () {
        var first = list.querySelector("a");
        if (first && !box.hidden) first.focus();
      });
    });
    /* Arriving with ?q= (the form without JavaScript, or a link) runs the search at once. */
    var q = new URLSearchParams(location.search).get("q");
    if (q) { input.value = q; apply(false); }
  }

  /* ---- the videos: a big play button over the native player, chapters by time ---- */
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

    /* Chapter times are written into the page by the builder from the caption track. */
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

  /* ---- the introduction video: two cuts, the stylesheet shows the one that fits the window ---- */
  /* Only the cut on screen gets its still (data-poster), so the hidden cut downloads nothing: its video
     already waits for a press (preload="none"), and a poster attribute would fetch its still at once.
     When the window changes shape the other cut gets its still, and a cut that leaves the screen while
     playing is paused, so a hidden video does not go on talking.
     v0.3.3 (the Codex review's part 6): the check also runs when full screen ends and when the phone turns,
     not only on a resize. A cut in full screen stays shown whatever the window's shape (site.css), so a
     phone turned during full screen changes nothing until full screen ends, and leaving it fires no resize
     where the window keeps its size: the cut hidden then went on playing (measured in Chromium: the 9:16
     cut, full screen, turned to 844 x 390, left full screen: hidden and still playing). An iPhone plays full
     screen natively (webkitDisplayingFullscreen, webkitendfullscreen on the video), outside the page's
     layout, so a cut playing there is never paused by a turn of the page under it. */
  function initIntroCuts() {
    var cuts = $all(".intro-vid video[data-poster]");
    if (!cuts.length) return;
    function update() {
      cuts.forEach(function (v) {
        var shown = v.getClientRects().length > 0;
        if (shown && !v.getAttribute("poster")) v.setAttribute("poster", v.getAttribute("data-poster"));
        if (!shown && !v.paused && !v.webkitDisplayingFullscreen) v.pause();
      });
    }
    var timer = 0;
    function later() {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 150);
    }
    update();
    window.addEventListener("resize", later);
    window.addEventListener("orientationchange", later);
    document.addEventListener("fullscreenchange", later);
    document.addEventListener("webkitfullscreenchange", later);
    cuts.forEach(function (v) { v.addEventListener("webkitendfullscreen", later); });
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
        say(done, done.getAttribute("data-done"));
      });
    });
  }

  /* ---- the demo request form -------------------------------------------------- */
  // Unchanged in what it sends from platform/landing/script.js v0.4.0. The contract is
  // supabase/functions/lead/README.md: the same endpoint, the same anon key in the two
  // headers, the same field names and limits, the same honeypot, the same 429 answer.
  function initForm() {
    // v0.3.4 (the critical review of 2026-09-28, C-181, C-182, C-183, C-294): the button keeps the
    // keyboard focus while sending (aria-disabled, not disabled); after four seconds it says it is still
    // sending, and after fifteen the request is given up with the error message; a field the lead
    // function names (400 { field }) is marked and focused with its own line; the name and the message
    // say their limit where it bites. What is sent is unchanged (supabase/functions/lead/README.md).
    var form = document.getElementById("demo-form");
    if (!form) return;

    var endpoint = form.getAttribute("data-endpoint");
    var key = form.getAttribute("data-key");
    var source = form.getAttribute("data-source") || "landing";
    var status = document.getElementById("form-status");
    var thanks = document.getElementById("thanks");
    var panel = document.getElementById("form-panel");
    var button = form.querySelector("button[type=submit]");
    var buttonLabel = button ? button.textContent : "";
    var sending = false;
    var SLOW_MS = 4000;
    var GIVE_UP_MS = 15000;

    function tell(text, isError) {
      if (!status) return;
      status.textContent = text || "";
      status.className = "status" + (isError ? " err" : "");
    }

    function value(name) {
      var el = form.elements[name];
      return el && typeof el.value === "string" ? el.value.trim() : "";
    }

    function clearInvalid() {
      $all("[aria-invalid=true]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
    }

    // The limit where it bites: the note appears from nine tenths of the field's maxlength.
    function watchLimit(name, noteId) {
      var el = form.elements[name];
      var note = document.getElementById(noteId);
      var tpl = form.getAttribute("data-limit");
      if (!el || !note || !tpl) return;
      var max = parseInt(el.getAttribute("maxlength"), 10);
      if (!max) return;
      function update() {
        var n = el.value.length;
        if (n >= Math.floor(max * 0.9)) {
          note.textContent = tpl.replace("{n}", String(n)).replace("{max}", String(max));
          note.hidden = false;
        } else {
          note.hidden = true;
          note.textContent = "";
        }
      }
      el.addEventListener("input", update);
      update();
    }
    watchLimit("name", "name-limit");
    watchLimit("message", "message-limit");

    form.addEventListener("input", function (event) {
      if (event.target && event.target.getAttribute && event.target.getAttribute("aria-invalid") === "true") {
        event.target.removeAttribute("aria-invalid");
      }
    });

    function done() {
      sending = false;
      if (button) {
        button.removeAttribute("aria-disabled");
        button.textContent = buttonLabel;
      }
    }

    function fail(text, field) {
      tell(text, true);
      var el = field ? form.elements[field] : null;
      if (el && typeof el.focus === "function" && el.type !== "hidden") {
        el.setAttribute("aria-invalid", "true");
        el.focus();
      } else if (status) {
        status.focus();
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (sending) return;
      tell("");
      clearInvalid();

      // The browser's own required, type=email and pattern checks run first.
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

      var payload = {
        name: value("name"),
        restaurant: value("restaurant"),
        email: value("email"),
        phone: value("phone"),
        venues: value("venues"),
        message: value("message"),
        // Honeypot. A person never sees this field, so anything in it is a bot.
        company_website: value("company_website"),
        source: source
      };
      // v0.15.0 (G17.5): only when site.json attribution.lead_send is true; the lead function must accept the two fields first
      if (form.getAttribute("data-attribution") === "1") {
        payload.from = window.location.pathname.slice(0, 80);
        payload.utm = visitTags();
      }

      sending = true;
      if (button) {
        button.setAttribute("aria-disabled", "true");
        button.textContent = form.getAttribute("data-sending") || buttonLabel;
      }
      var slow = window.setTimeout(function () {
        if (sending && button) button.textContent = form.getAttribute("data-sending-slow") || button.textContent;
      }, SLOW_MS);
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var giveUp = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, GIVE_UP_MS);

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: res.ok, status: res.status, body: body };
          });
        })
        .then(function (res) {
          window.clearTimeout(slow);
          window.clearTimeout(giveUp);
          done();
          if (res.ok) {
            if (panel) panel.hidden = true;
            if (thanks) {
              thanks.hidden = false;
              thanks.setAttribute("tabindex", "-1");
              thanks.focus();
            }
            return;
          }
          if (res.status === 429) return fail(form.getAttribute("data-error-rate"));
          var field = res.status === 400 && res.body && typeof res.body.field === "string" ? res.body.field : "";
          if (field && form.elements[field]) {
            return fail(form.getAttribute(field === "email" ? "data-error-email" : "data-error-field"), field);
          }
          fail(form.getAttribute("data-error"));
        })
        .catch(function () {
          window.clearTimeout(slow);
          window.clearTimeout(giveUp);
          done();
          fail(form.getAttribute("data-error"));
        });
    });
  }

  /* ---- wide tables in the legal text: reachable by keyboard when they scroll ---- */
  // The document text is the landing's word for word, so its markup is not changed; a table
  // wrapper that has to scroll sideways becomes a focusable region named after its heading.
  function initTables() {
    var wraps = $all(".legal .table-wrap");
    if (!wraps.length) return;
    function heading(el) {
      for (var n = el.previousElementSibling; n; n = n.previousElementSibling) {
        if (/^H[1-6]$/.test(n.tagName)) return n.textContent.replace(/\s+/g, " ").trim();
      }
      return "";
    }
    function mark() {
      wraps.forEach(function (w) {
        if (w.scrollWidth > w.clientWidth + 1) {
          w.setAttribute("tabindex", "0");
          w.setAttribute("role", "region");
          if (!w.getAttribute("aria-label")) w.setAttribute("aria-label", heading(w));
        } else {
          w.removeAttribute("tabindex");
          w.removeAttribute("role");
          w.removeAttribute("aria-label");
        }
      });
    }
    mark();
    var raf = 0;
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(mark);
    });
  }

  /* ---- the landing's old #anchors, on the home page ---------------------------- */
  function initLegacyAnchors() {
    var node = document.getElementById("legacy-anchors");
    if (!node || !location.hash) return;
    var map;
    try { map = JSON.parse(node.textContent); } catch (err) { return; }
    var target = map[decodeURIComponent(location.hash.slice(1))];
    if (typeof target !== "string" || !target || target.charAt(0) === "#") return;
    location.replace(target);
  }

  /* ---- where a visit came from (website v0.15.0, G17.5) ---------------------------------------------
     The sign-up links carry the page they sit on ("from") and the utm_ tags of the visit; the demo request
     carries the same when site.json attribution.lead_send is true (data-attribution on the form). Nothing is
     stored: the privacy notice says this site remembers only that a visitor stopped the motion, so the tags
     travel in the address instead, from the first page to this site's other links. Values are cut to what a
     tag needs, so a crafted address cannot put anything else into a link. */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  function visitTags() {
    var found = {};
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (err) { return found; }
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (!v) return;
      v = v.replace(/[^A-Za-z0-9_.~-]/g, "").slice(0, 60);
      if (v) found[k] = v;
    });
    return found;
  }
  function withParams(href, add) {
    var hash = "";
    var i = href.indexOf("#");
    if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    Object.keys(add).forEach(function (k) {
      if (new RegExp("[?&]" + k + "=").test(href)) return;
      href += (href.indexOf("?") >= 0 ? "&" : "?") + k + "=" + encodeURIComponent(add[k]);
    });
    return href + hash;
  }
  function initAttribution() {
    var meta = document.querySelector('meta[name="bt:signup"]');
    var tags = visitTags();
    var from = window.location.pathname.slice(0, 80);
    var signup = meta ? meta.getAttribute("content") : "";
    var base = signup ? signup.split("?")[0] : "";
    var carry = Object.keys(tags).length > 0;
    $all("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (base && href.indexOf(base) === 0) {
        var add = { from: from };
        UTM_KEYS.forEach(function (k) { if (tags[k]) add[k] = tags[k]; });
        a.setAttribute("href", withParams(href, add));
      } else if (carry && href && !/^([a-z][a-z0-9+.-]*:|\/\/|#|mailto:|tel:)/i.test(href)) {
        a.setAttribute("href", withParams(href, tags));
      }
    });
  }

  /* ---- a walk through the demo account: one screen at a time with script, all three without ----- */
  function initWalk() {
    var tabs = $(".walk-tabs");
    if (!tabs) return;
    var buttons = $all("[data-walk]", tabs);
    var panels = $all("[data-walk-panel]");
    function show(id, focus) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-walk") === id;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");
        if (on && focus) b.focus();
      });
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-walk-panel") !== id; });
    }
    tabs.hidden = false;
    buttons.forEach(function (b, n) {
      b.addEventListener("click", function () { show(b.getAttribute("data-walk")); });
      b.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        show(buttons[(n + step + buttons.length) % buttons.length].getAttribute("data-walk"), true);
      });
    });
    show(buttons[0].getAttribute("data-walk"));
  }

  /* ---- the free checks and the try-it with a visitor's own review (G17.1, G17.2, G17.3) ----------
     Only on a build with site.json public_tools.enabled: the forms are not in the page otherwise. One
     public function, public-tools; the contract is HANDOFFS j-to-lead-public-tools.md. The same honeypot,
     limits and 429 answer as the demo form. Sentences are the page's (data-tpl-*, data-err-*); the answer
     brings only values. */
  function fill(tpl, values) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (m, k) { return values[k] != null ? String(values[k]) : m; });
  }
  function initTools() {
    $all("form[data-tool]").forEach(function (form) {
      var tool = form.getAttribute("data-tool");
      var status = $(".status", form);
      var result = $(".tool-result", form);
      var button = $("button[type=submit]", form);
      var label = button ? button.textContent : "";
      var sending = false;
      function tell(text, isError) { if (status) { status.textContent = text || ""; status.className = "status" + (isError ? " err" : ""); } }
      function out(name, text) { var el = $('[data-out="' + name + '"]', form); if (el) { el.textContent = text; el.hidden = !text; } }
      function done() { sending = false; if (button) { button.removeAttribute("aria-disabled"); button.textContent = label; } }
      function val(name) { var el = form.elements[name]; return el && typeof el.value === "string" ? el.value.trim() : ""; }
      // a success is an explicit one with the values the tool needs; anything else is the generic error
      function valid(body) {
        if (!body || body.ok === false) return false;
        if (tool === "profile") return typeof body.name === "string" && body.name !== "" && isFinite(Number(body.rating)) && isFinite(Number(body.count));
        if (tool === "rank") return isFinite(Number(body.position)) && Number(body.checked) > 0;
        return typeof body.reply === "string" && body.reply !== "";
      }
      function render(body, sent) {
        if (tool === "profile") {
          var total = Number(body.latest_total) || 0, open = Number(body.latest_open) || 0;
          out("head", fill(result.getAttribute("data-tpl-head"), { name: body.name, rating: String(body.rating).replace(".", document.documentElement.lang === "hu" ? "," : "."), count: body.count }));
          out("reviews", total ? fill(result.getAttribute(open ? "data-tpl-reviews" : "data-tpl-all"), { total: total, open: open }) : "");
        } else if (tool === "rank") {
          var pos = Number(body.position) || 0;
          out("rank", fill(result.getAttribute(pos ? "data-tpl-found" : "data-tpl-notfound"), { phrase: sent.phrase, position: pos, checked: body.checked }));
        } else if (tool === "draft") {
          out("reply", String(body.reply || ""));
        }
        result.hidden = false;
        // focus moves to the answer so a screen reader reads it
        result.setAttribute("tabindex", "-1");
        result.focus();
      }
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (sending) return;
        tell(""); result.hidden = true;
        if (typeof form.reportValidity === "function" && !form.reportValidity()) { tell(form.getAttribute("data-err-empty"), true); return; }
        var payload = { tool: tool, company_website: val("company_website") };
        ["q", "phrase", "review", "stars", "tone"].forEach(function (k) { if (form.elements[k]) payload[k] = val(k); });
        // required fields are checked after trimming, so spaces alone are empty
        var blank = ["q", "phrase", "review"].some(function (k) { return form.elements[k] && !payload[k]; });
        if (blank) { tell(form.getAttribute("data-err-empty"), true); return; }
        sending = true;
        if (button) { button.setAttribute("aria-disabled", "true"); button.textContent = form.getAttribute("data-sending") || label; }
        var key = form.getAttribute("data-key");
        var ctrl = typeof AbortController === "function" ? new AbortController() : null;
        var giveUp = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
        fetch(form.getAttribute("data-endpoint"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": key, "Authorization": "Bearer " + key },
          body: JSON.stringify(payload),
          signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
        }).then(function (res) {
          window.clearTimeout(giveUp); done();
          if (res.ok && valid(res.body)) return render(res.body, payload);
          if (res.status === 429) return tell(form.getAttribute("data-err-rate"), true);
          if (res.status === 404 && form.getAttribute("data-err-none")) return tell(form.getAttribute("data-err-none"), true);
          tell(form.getAttribute("data-err"), true);
        }).catch(function () { window.clearTimeout(giveUp); done(); tell(form.getAttribute("data-err"), true); });
      });
    });
  }

  initLegacyAnchors();
  initMenu();
  initMotion();
  initTry();
  initHelpSearch();
  $all(".vid").forEach(initVideo);
  initIntroCuts();
  initFeedback();
  initForm();
  initTables();
  initAttribution();
  initWalk();
  initTools();
})();
