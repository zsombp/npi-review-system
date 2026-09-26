/* BistroTech website, Pop: site.js, v0.1.0, 2026-09-26.
   Vanilla, no dependencies. One file for every page; each part looks for its own markup first.
   No sentence lives here: every word a visitor sees comes from the page (a text node or a data
   attribute), so the English site will reuse this file as it is.
   Parts: the phone menu, the marquee pause, the try-it reply, the help search (reads
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
    function search(words) {
      var hits = [];
      index.forEach(function (row) {
        var score = 0;
        var ok = words.every(function (w) {
          var inT = row.t.indexOf(w) !== -1;
          var inS = row.s.indexOf(w) !== -1;
          var inB = row.b.indexOf(w) !== -1;
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

    function tell(text, isError) {
      if (!status) return;
      status.textContent = text || "";
      status.className = "status" + (isError ? " err" : "");
    }

    function value(name) {
      var el = form.elements[name];
      return el && typeof el.value === "string" ? el.value.trim() : "";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      tell("");

      // The browser's own required and type=email checks run first.
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

      if (button) {
        button.disabled = true;
        button.textContent = form.getAttribute("data-sending") || buttonLabel;
      }

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: res.ok, status: res.status, body: body };
          });
        })
        .then(function (res) {
          if (res.ok) {
            if (panel) panel.hidden = true;
            if (thanks) {
              thanks.hidden = false;
              thanks.setAttribute("tabindex", "-1");
              thanks.focus();
            }
            return;
          }
          var msg = res.status === 429
            ? form.getAttribute("data-error-rate")
            : form.getAttribute("data-error");
          tell(msg, true);
        })
        .catch(function () {
          tell(form.getAttribute("data-error"), true);
        })
        .then(function () {
          if (button) {
            button.disabled = false;
            button.textContent = buttonLabel;
          }
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

  initLegacyAnchors();
  initMenu();
  initMarquee();
  initTry();
  initHelpSearch();
  $all(".vid").forEach(initVideo);
  initFeedback();
  initForm();
  initTables();
})();
