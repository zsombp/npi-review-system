/* BistroTech website lab, direction A "Piac". script.js v0.1.0, 2026-09-25.
   Vanilla, no dependencies, no network. Every block checks that its markup exists,
   so one file serves index.html and sugo.html.
   1. menu  2. reveal on scroll  3. phone call-to-action bar  4. the try-it reply
   5. help search  6. feedback  7. video state */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* 1. menu ------------------------------------------------------------------ */
  var menuBtn = $(".menu-btn");
  var menu = $("#menu");
  if (menuBtn && menu) {
    var lbl = $(".menu-lbl", menuBtn);
    var setOpen = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (lbl) lbl.textContent = open ? "Bezárás" : "Menü";
    };
    menuBtn.addEventListener("click", function () {
      setOpen(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setOpen(false); menuBtn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (menuBtn.getAttribute("aria-expanded") === "true" && !e.target.closest(".site-head")) setOpen(false);
    });
    var wide = window.matchMedia("(min-width: 1100px)");
    var onWide = function () { if (wide.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }

  /* 2. reveal on scroll. Not an IntersectionObserver: a fast flick (or a headless
        screenshot pass) can carry an element through the viewport between two
        observations and leave it hidden. Here every frame that scrolls reveals all
        that has reached the lower edge, including whatever was scrolled past. ------ */
  var rv = $$(".rv");
  if (reduced.matches) {
    rv.forEach(function (el) { el.classList.add("in"); });
  } else {
    var pending = rv.slice();
    var queued = false;
    var reveal = function () {
      queued = false;
      var edge = window.innerHeight * 1.05;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < edge) { el.classList.add("in"); return false; }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", onMove);
        window.removeEventListener("resize", onMove);
      }
    };
    var onMove = function () { if (!queued) { queued = true; window.requestAnimationFrame(reveal); } };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    reveal();
  }

  /* in-page links glide; programmatic scrolling stays instant (no CSS smooth
     scrolling, which would also slow every script that scrolls the page) */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = a.getAttribute("href").slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
    if (history.pushState) history.pushState(null, "", "#" + id);
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* 3. phone call-to-action bar: shown after the hero's buttons scroll away, hidden
        again near the closing call to action, and while the toast is up ----------- */
  var sticky = $("#sticky-cta");
  var heroCta = $(".hero .cta-row");
  var ends = [$("#kezdes"), $(".site-foot")].filter(Boolean);
  var toastUp = false;
  var heroGone = false;
  var endSeen = false;
  var syncSticky = function () {
    if (sticky) sticky.classList.toggle("show", heroGone && !endSeen && !toastUp);
  };
  if (sticky && heroCta && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      heroGone = !en.isIntersecting && en.boundingClientRect.top < 0;
      syncSticky();
    }).observe(heroCta);
    var seen = new Map();
    var endIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen.set(en.target, en.isIntersecting); });
      endSeen = Array.from(seen.values()).some(Boolean);
      syncSticky();
    });
    ends.forEach(function (el) { endIo.observe(el); });
  }

  /* 4. the try-it reply ---------------------------------------------------------- */
  var demo = $("#demo");
  if (demo) {
    var TEXT = {
      eredeti: "Kedves Katalin, köszönjük, hogy megírta. Sajnáljuk, hogy langyos volt a leves, és sokat kellett várnia a számlára. Továbbadtuk a konyhának és a felszolgálóknak. Reméljük, visszatér, és akkor minden a helyén lesz.\n\nA Példa Bisztró csapata",
      rovidebb: "Kedves Katalin, köszönjük, és sajnáljuk a langyos levest meg a hosszú várakozást. Továbbadtuk a csapatnak.\n\nA Példa Bisztró csapata",
      melegebb: "Kedves Katalin, nagyon köszönjük, hogy időt szánt ránk. Bosszant minket, hogy langyos volt a leves, és hogy ennyit kellett várnia a számlára. Továbbadtuk a konyhának és a felszolgálóknak. Szeretnénk, ha legközelebb jó szívvel állna fel az asztaltól.\n\nA Példa Bisztró csapata",
      hatarozottabb: "Kedves Katalin, köszönjük a visszajelzést. A leves hőmérséklete és a húsz perc várakozás a számlára nem felel meg annak, ahogy dolgozni szeretnénk. Mindkettőt továbbadtuk a konyhának és a felszolgálóknak.\n\nA Példa Bisztró csapata",
      tegezo: "Kedves Katalin, köszönjük, hogy megírtad. Sajnáljuk, hogy langyos volt a leves, és sokat kellett várnod a számlára. Továbbadtuk a konyhának és a felszolgálóknak. Reméljük, visszajössz, és akkor minden a helyén lesz.\n\nA Példa Bisztró csapata"
    };
    TEXT.magazo = TEXT.eredeti; /* the default reply is already magázó */
    var NAME = { rovidebb: "Rövidebb", melegebb: "Melegebb", hatarozottabb: "Határozottabb", magazo: "Magázó", tegezo: "Tegező" };
    var UNDO_MS = 8000;

    var ta = $("#reply");
    var chips = $$(".chip", demo);
    var live = $("#demo-live");
    var done = $(".done", demo);
    var restart = $("[data-act=restart]", demo);
    var approveBtn = $("[data-act=approve]", demo);
    var toast = $("#toast");
    var toastMsg = $(".toast-msg", toast);
    var toastUse = $(".toast-ico use", toast);
    var undoBtn = $("[data-act=undo]", toast);
    var bar = $(".toast-bar", toast);

    var state = "draft";
    var variant = null;
    var before = null;          /* what undo restores */
    var raf = 0, left = 0, total = 0, last = 0, hovering = false, focusedIn = false;

    var say = function (msg) {
      live.textContent = "";
      window.setTimeout(function () { live.textContent = msg; }, 40);
    };
    var fit = function () {
      ta.style.height = "auto";
      ta.style.height = (ta.scrollHeight + 3) + "px";
    };
    var paint = function (v) {
      variant = v;
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-v") === v)); });
    };
    var put = function (text, v) {
      ta.value = text;
      paint(v);
      fit();
      if (!reduced.matches) {
        ta.classList.remove("swap");
        void ta.offsetWidth;
        ta.classList.add("swap");
      }
    };

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        if (state !== "draft") return;
        var v = c.getAttribute("data-v");
        put(TEXT[v], v);
        say(NAME[v] + " változat.");
      });
    });
    ta.addEventListener("input", function () { if (variant) paint(null); fit(); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); approveBtn.focus(); } });

    /* the toast: eight seconds for undo, paused while pointed at or focused */
    var tick = function (now) {
      var dt = Math.min(now - last, 100);
      last = now;
      if (!hovering && !focusedIn) left -= dt;
      bar.style.transform = "scaleX(" + Math.max(0, left / total) + ")";
      if (left <= 0) { hideToast(); return; }
      raf = window.requestAnimationFrame(tick);
    };
    var showToast = function (kind) {
      var withUndo = kind !== "undo";
      toast.classList.remove("is-skip", "is-undo");
      if (kind === "skip") toast.classList.add("is-skip");
      if (kind === "undo") toast.classList.add("is-undo");
      toastMsg.textContent = kind === "approve" ? "Jóváhagyva." : kind === "skip" ? "Kihagyva." : "Visszavontuk.";
      toastUse.setAttribute("href", kind === "skip" ? "#i-skip" : kind === "undo" ? "#i-undo" : "#i-check");
      undoBtn.hidden = !withUndo;
      bar.hidden = !withUndo;
      total = withUndo ? UNDO_MS : 2600;
      left = total;
      toast.hidden = false;
      toastUp = true; syncSticky();
      window.requestAnimationFrame(function () { toast.classList.add("show"); });
      window.cancelAnimationFrame(raf);
      last = performance.now();
      raf = window.requestAnimationFrame(tick);
    };
    var hideToast = function () {
      window.cancelAnimationFrame(raf);
      toast.classList.remove("show");
      window.setTimeout(function () { if (!toast.classList.contains("show")) toast.hidden = true; }, 320);
      toastUp = false; syncSticky();
      if (state !== "draft") {
        before = null;               /* the undo window has closed */
        restart.hidden = false;
      }
    };
    toast.addEventListener("pointerenter", function () { hovering = true; });
    toast.addEventListener("pointerleave", function () { hovering = false; });
    toast.addEventListener("focusin", function () { focusedIn = true; });
    toast.addEventListener("focusout", function () { focusedIn = false; });

    var decide = function (kind) {
      if (state !== "draft") return;
      before = { text: ta.value, variant: variant };
      state = kind === "approve" ? "approved" : "skipped";
      demo.setAttribute("data-state", state);
      ta.readOnly = true;
      restart.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      showToast(kind);
      say((kind === "approve" ? "Jóváhagyva." : "Kihagyva.") + " Nyolc másodpercig visszavonhatod.");
    };
    var undo = function () {
      if (state === "draft" || !before) return;
      state = "draft";
      demo.setAttribute("data-state", "draft");
      ta.readOnly = false;
      done.hidden = true;
      ta.value = before.text;
      paint(before.variant);
      fit();
      before = null;
      showToast("undo");
      say("Visszavontuk.");
      approveBtn.focus({ preventScroll: true });
    };
    var again = function () {
      state = "draft";
      demo.setAttribute("data-state", "draft");
      ta.readOnly = false;
      done.hidden = true;
      restart.hidden = true;
      put(TEXT.eredeti, null);
      say("Újra jóváhagyásra vár.");
      approveBtn.focus({ preventScroll: true });
    };

    demo.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "approve" || act === "skip") decide(act);
      else if (act === "restore") { put(TEXT.eredeti, null); say("Visszaállt az eredeti szöveg."); }
      else if (act === "restart") again();
    });
    undoBtn.addEventListener("click", undo);

    /* the product's keys, live only while focus is inside the demo or its toast,
       and never while typing in the reply (WCAG 2.1.4) */
    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (!(demo.contains(t) || toast.contains(t))) return;
      if (t.matches("textarea, input, select")) return;
      var k = (e.key || "").toLowerCase();
      if (k === "a" && state === "draft") { e.preventDefault(); decide("approve"); }
      else if (k === "s" && state === "draft") { e.preventDefault(); decide("skip"); }
      else if (k === "e" && state === "draft") { e.preventDefault(); ta.focus(); }
      else if (k === "u" && before && !toast.hidden) { e.preventDefault(); undo(); }
    });

    fit();
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  /* 5. help search: filters a fixed list of article titles, accents ignored ------- */
  var search = $("#help-search");
  if (search) {
    var ARTICLES = [
      { t: "Regisztráció", c: "Kezdés" },
      { t: "Étterem felvétele", c: "Kezdés" },
      { t: "Kezelőnek felveszel minket a Google-on", c: "Kezdés" },
      { t: "A napi jelentés beállítása", c: "Napi jelentés" },
      { t: "Telegram összekötése", c: "Napi jelentés" },
      { t: "Keresés az értékelések között", c: "Értékelések" },
      { t: "Tripadvisor-értékelések", c: "Értékelések" },
      { t: "Válasz jóváhagyása", c: "Válaszok", h: "sugo.html" },
      { t: "Automata válasz: mit kapcsolsz be", c: "Válaszok" },
      { t: "Témák és ételek", c: "Kimutatások" },
      { t: "Kollégák meghívása", c: "Csapat és fiók" },
      { t: "A 14 napos próbaidő", c: "Előfizetés" }
    ];
    var q = $("#q");
    var box = $("#results");
    var list = $("ul", box);
    var status = $(".results-status", box);
    var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    var render = function () {
      var words = norm(q.value.trim()).split(/\s+/).filter(Boolean);
      list.textContent = "";
      if (!words.length) { box.hidden = true; status.textContent = ""; return; }
      var hits = ARTICLES.filter(function (a) {
        var hay = norm(a.t + " " + a.c);
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      });
      hits.forEach(function (a) {
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = a.h || "#";
        var title = document.createElement("span");
        title.textContent = a.t;
        var cat = document.createElement("span");
        cat.className = "cat";
        cat.textContent = a.c;
        link.appendChild(title);
        link.appendChild(cat);
        li.appendChild(link);
        list.appendChild(li);
      });
      box.hidden = false;
      status.textContent = hits.length
        ? hits.length + " találat"
        : "Erre nincs leírás. Próbálj egy másik szót, vagy írj nekünk.";
    };
    /* the deck's placeholder is longer than a phone field; there the visible hint
       keeps its example and the label (read out, never shown) keeps the rest */
    var narrow = window.matchMedia("(max-width: 520px)");
    var full = q.getAttribute("placeholder");
    var fitHint = function () { q.setAttribute("placeholder", narrow.matches ? "Például: napi jelentés" : full); };
    fitHint();
    if (narrow.addEventListener) narrow.addEventListener("change", fitHint);
    q.addEventListener("input", render);
    search.addEventListener("submit", function (e) {
      e.preventDefault();
      render();
      var first = $("a", list);
      if (first) first.focus();
    });
    q.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && q.value) { q.value = ""; render(); }
    });
  }

  /* 6. feedback ---------------------------------------------------------------- */
  var fb = $("#feedback");
  if (fb) {
    var btns = $(".fb-btns", fb);
    var thanks = $(".fb-thanks", fb);
    btns.addEventListener("click", function (e) {
      if (!e.target.closest("button")) return;
      btns.hidden = true;
      thanks.hidden = false;
      thanks.focus();
    });
  }

  /* 7. video: the files are recorded in parallel and may not exist yet. When every
        source fails the frame shows its own poster and says the video is coming. --- */
  var video = $("#tutorial-video");
  if (video) {
    var fig = video.closest(".video");
    var setState = function (st) {
      if (st === "missing" && video.readyState > 0) return;   /* it is playing: not missing */
      fig.setAttribute("data-state", st);
    };
    var srcs = $$("source", video);
    if (srcs.length) srcs[srcs.length - 1].addEventListener("error", function () { setState("missing"); });
    video.addEventListener("error", function () { setState("missing"); });
    video.addEventListener("loadedmetadata", function () { setState("ready"); });
    /* preload is none, so nothing streams until play. The poster is written together
       with the recording and the player loads it anyway, so the same image, loaded
       once more from the cache, says whether the files exist yet. */
    if (video.poster) {
      var probe = new Image();
      probe.onload = function () { setState("ready"); };
      probe.onerror = function () { setState("missing"); };
      probe.src = video.poster;
    }
  }
})();
