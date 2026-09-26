/* app.js, v0.2.0, 2026-09-26 (v0.1.0 the same day). App Pop lab: the app mock's behaviour.

   It behaves like the product where the product has decided (platform/web/src, read only):
     - the four tabs and the account pages, one screen at a time, focus moved to the page;
     - Válaszok: worst first then oldest, A approves, S closes the review without a reply (the
       product's skip: it leaves the queue for good and stays unanswered on Google), J and K move,
       E edits, O opens Google, U undoes; the undo lasts eight seconds; a reply for a venue we cannot
       post to opens the copy-and-open sheet; rewrite chips swap in pre-written variants (the product
       calls a model);
     - Ma: the greeting names the one thing to do, from the whole queue, never from the range;
     - the first import after a venue is added, then the first look.
   Round 2 (docs/reviews/CODEX-APP-POP-CRITIQUE-2026-09-26.md, the usability points only): a visible
   undo bar on every screen size; one announcement per action, never a countdown; focus to the next
   reply after J, K, approve and skip, and to the done heading at the end; no single-key shortcut in
   any field or while an IME composes; a sticky approve bar on phones that steps aside while you type;
   the review's state and "Válasz átnézése" on Értékelések; three numbers about yesterday on Ma, the
   rest folded; the band as a lab switch (still by default, moving, or none).
   Every string comes from div.strings in app.html, so the copy check reads it. */
(function () {
  "use strict";
  var R = window.BT_REGISTRY, html = document.documentElement;
  var framed = window.parent !== window;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function bind(k) { return $('[data-bind="' + k + '"]'); }
  function tell(msg) { if (framed) try { window.parent.postMessage(msg, "*"); } catch (e) { /* not our lab */ } }
  var S = {};
  $$(".strings [data-k]").forEach(function (el) { S[el.getAttribute("data-k")] = el.textContent; });
  function t(k, v) {
    var s = S[k] == null ? k : S[k];
    return s.replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] != null ? v[n] : m; });
  }
  function fmt(n, d) {
    if (n == null || !isFinite(n)) return "";
    return Number(n).toFixed(d || 0).replace(".", ",");
  }
  function store(k, v) { try { if (v == null) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* storage off: the default stands */ } return null; }

  /* Motion: the device's reduced-motion setting always wins; the lab's switch can only add to it. */
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqPhone = window.matchMedia("(max-width: 800px)");
  var labMotion = /(^|[#&])m=reduce(&|$)/.test(location.hash) ? "reduce" : "full";
  function setMotion(m) { if (m) labMotion = m; html.setAttribute("data-motion", mqReduce.matches || labMotion === "reduce" ? "reduce" : "full"); }
  setMotion();
  mqReduce.addEventListener("change", function () { setMotion(); });
  function moving() { return html.getAttribute("data-motion") === "full"; }

  /* One live announcement per action: what happened and that it can be undone. Never a countdown. */
  var live = bind("announce"), liveTimer = 0;
  function say(msg) {
    clearTimeout(liveTimer);
    live.textContent = "";
    liveTimer = setTimeout(function () { live.textContent = msg; }, 60);
  }

  /* ================================================================ appearance */
  var look = { palette: html.getAttribute("data-palette"), font: html.getAttribute("data-font"), auto: !!(window.BT_START && window.BT_START.auto) };
  function autoSet() { try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? R.pair.dark : R.pair.light; } catch (e) { return R.pair.light; } }
  function applyLook(next, how) {
    how = how || {};
    if (next.auto != null) look.auto = !!next.auto;
    if (next.palette && R.sets[next.palette]) look.palette = next.palette;
    if (next.font && R.fonts[next.font]) look.font = next.font;
    var set = look.auto ? autoSet() : look.palette;
    html.setAttribute("data-palette", set);
    html.setAttribute("data-font", look.font);
    syncAppearanceCard();
    if (charts.drawn) drawCharts();
    if (how.announce) bind("ap-live").textContent = t("ap.live", { set: R.sets[set].name, font: R.fonts[look.font].name });
    if (how.local) tell({ type: "bt-look-changed", look: { palette: look.auto ? "auto" : look.palette, font: look.font } });
    writeHash();
  }

  /* ================================================================ navigation */
  var VIEWS = ["ma", "ertekelesek", "valaszok", "kimutatasok", "beallitasok", "ettermek", "elso"];
  var NAMES = { ma: "Ma", ertekelesek: "Értékelések", valaszok: "Válaszok", kimutatasok: "Kimutatások", beallitasok: "Beállítások", ettermek: "Éttermek", elso: "Első lépések" };
  var view = "ma";
  var scenario = html.getAttribute("data-scenario");
  function writeHash() {
    var parts = ["c=" + (look.auto ? "auto" : R.sets[look.palette].slug), "f=" + look.font, "v=" + view, "st=" + scenario];
    if (labMotion === "reduce") parts.push("m=reduce");
    var b = html.getAttribute("data-band");
    if (b && b !== "still") parts.push("b=" + b);
    if (view === "elso" && wiz) parts.push("step=" + wiz.step);
    try { history.replaceState(null, "", "#" + parts.join("&")); } catch (e) { /* sandboxed */ }
  }
  function show(v, how) {
    how = how || {};
    if (VIEWS.indexOf(v) < 0) v = "ma";
    var changed = v !== view;
    view = v;
    $$(".view").forEach(function (s) {
      var on = s.getAttribute("data-view") === v;
      s.hidden = !on;
      s.classList.remove("is-in");
      if (on && moving() && !how.still) { void s.offsetWidth; s.classList.add("is-in"); }
    });
    $$("[data-go]").forEach(function (a) {
      if (a.closest(".view")) return;
      if (a.getAttribute("data-go") === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = NAMES[v] + " · BistroTech";
    closeMenu();
    syncBars();
    if (!how.silent) {
      window.scrollTo(0, 0);
      if (how.focus && how.focus.offsetParent) how.focus.focus();
      else $("#main").focus({ preventScroll: true });
      tell({ type: "bt-view-changed", view: v });
    }
    if (v === "kimutatasok") drawCharts();
    if (v === "elso") wiz.render();
    if (changed || how.silent) writeHash();
  }
  document.addEventListener("click", function (e) {
    var rp = e.target.closest("[data-reply]");
    if (rp) { e.preventDefault(); openReply(Number(rp.getAttribute("data-reply"))); return; }
    var go = e.target.closest("[data-go]");
    if (go) {
      e.preventDefault();
      var f = go.getAttribute("data-filter");
      show(go.getAttribute("data-go"));
      if (f) setChip(f);
      return;
    }
    var soon = e.target.closest("[data-soon]");
    if (soon) { e.preventDefault(); note(t("toast.soon")); return; }
    var g = e.target.closest("[data-google]");
    if (g) { e.preventDefault(); note(t("toast.google")); return; }
  });

  /* phone menu */
  var menuBtn = $(".menu-btn"), panel = $("#app-menu");
  function closeMenu() { if (!panel.hidden) { panel.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); } }
  menuBtn.addEventListener("click", function () {
    var open = panel.hidden;
    panel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) { var first = $("a, button, select", panel); if (first) first.focus(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { closeMenu(); menuBtn.focus(); } });
  /* the rail's folded group */
  var tog = $(".nav-toggle");
  tog.addEventListener("click", function () {
    var open = tog.getAttribute("aria-expanded") !== "true";
    tog.setAttribute("aria-expanded", String(open));
    $("#rail-more").hidden = !open;
  });

  /* ================================================================ the undo bar and short notes */
  var toastEl = bind("toast"), toastTimer = 0, noteTimer = 0;
  /* a short note in the bar's place (a copy, a dead end of the lab); an open undo keeps its place */
  function note(msg) {
    say(msg);
    if (undoState) return;
    toastEl.classList.add("is-note");
    toastEl.classList.remove("is-skip");
    bind("toast-msg").textContent = msg;
    bind("toast-undo").hidden = true;
    bind("toast-bar").classList.remove("is-running");
    toastEl.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { if (!undoState) hideToast(); }, 2600);
  }
  /* the eight-second undo: "Jóváhagyva. Visszavonom", on a phone above the approve bar */
  function toast(kind) {
    clearTimeout(noteTimer);
    toastEl.classList.remove("is-note");
    toastEl.classList.toggle("is-skip", kind === "skipped");
    $(".toast-ic use", toastEl).setAttribute("href", kind === "skipped" ? "#i-close" : "#i-check");
    bind("toast-msg").textContent = kind === "approved" ? t("toast.approved") : t("toast.skipped");
    bind("toast-undo").hidden = false;
    toastEl.hidden = false;
    var bar = bind("toast-bar");
    bar.classList.remove("is-running"); void bar.offsetWidth; bar.classList.add("is-running");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      var had = toastEl.contains(document.activeElement);
      undoState = null;
      hideToast();
      if (had) focusQueue();
    }, 8000);
  }
  function hideToast() { clearTimeout(toastTimer); clearTimeout(noteTimer); toastEl.hidden = true; bind("toast-bar").classList.remove("is-running"); }
  bind("toast-undo").addEventListener("click", function () { undo(); });

  /* ================================================================ the queue (Drafts.tsx) */
  var Q = {};
  $$(".q-data [data-q]").forEach(function (el) {
    var id = Number(el.getAttribute("data-q"));
    var rw = {};
    $$("[data-rw]", el).forEach(function (p) { rw[p.getAttribute("data-rw")] = p.textContent; });
    var draft = $(".q-draft", el).textContent;
    rw.magazo = draft;
    Q[id] = {
      id: id, venue: el.getAttribute("data-venue"), rating: Number(el.getAttribute("data-rating")),
      meta: el.getAttribute("data-meta"), t: Number(el.getAttribute("data-t")), lang: el.getAttribute("data-lang") || "",
      whenAdj: el.getAttribute("data-when-adj") || "",
      linked: el.getAttribute("data-linked") === "1", pre: el.getAttribute("data-pre") === "approved",
      body: $(".q-body", el).textContent, draft: draft, rw: rw
    };
  });
  var ALL = Object.keys(Q).map(Number);
  var texts = {}, before = {}, handled = [], cur = 0, undoState = null, posted = {};
  function resetQueue(sc) {
    texts = {}; before = {}; handled = []; cur = 0; undoState = null; posted = {};
    ALL.forEach(function (id) { texts[id] = Q[id].draft; });
    ALL.forEach(function (id) { if (Q[id].pre) handled.push({ id: id, kind: "approved", pre: true, text: Q[id].draft }); });
    if (sc === "kesz") ALL.forEach(function (id) {
      if (!Q[id].pre) handled.push({ id: id, kind: "approved", text: Q[id].draft });
      // done earlier this morning: what we could post is posted, what needs a hand is still here
      if (Q[id].linked) posted[id] = true;
    });
    touched.appr = touched.hist = false;
    hideToast(); hideSheet();
  }
  function handledOf(id) { return handled.filter(function (h) { return h.id === id; })[0]; }
  function remaining() {
    if (scenario === "ures" || scenario === "elso") return [];
    return ALL.filter(function (id) { return !handledOf(id); }).sort(function (a, b) { return Q[a].rating - Q[b].rating || Q[a].t - Q[b].t; });
  }
  function session() { return handled.filter(function (h) { return !h.pre; }); }
  function starsHTML(n) {
    var g = "";
    for (var i = 1; i <= 5; i++) g += i <= n ? '<svg><use href="#g-star"/></svg>' : '<svg class="o"><use href="#g-star-o"/></svg>';
    return '<span class="glyphs" aria-hidden="true">' + g + '</span><span class="num" aria-hidden="true">' + n + "/5</span>";
  }
  function whenOf(id) { return Q[id].meta.split(" · ")[1] || ""; }
  /* where a review stands, for its card on Értékelések */
  function stateOf(id) {
    if (scenario === "ures" || scenario === "elso") return "open";
    var h = handledOf(id);
    if (!h) return "draft";
    if (h.kind === "skipped") return "skipped";
    if (posted[id]) return "posted";
    return Q[id].linked ? "approved" : "manual";
  }

  var detail = bind("detail"), editor = bind("q-draft"), rwBox = bind("rewrite"), qbar = bind("q-actions");
  var apprFold = bind("approved-sec"), histFold = bind("history"), touched = { appr: false, hist: false };
  function renderQueue(opts) {
    opts = opts || {};
    var rem = remaining(), ses = session(), n = rem.length;
    if (cur >= n) cur = Math.max(0, n - 1);
    var id = rem[cur];
    // tab badges, the count sticker, the pending line
    $$('[data-bind="badge"]').forEach(function (b) { b.textContent = n; b.setAttribute("aria-label", t("nav.waiting", { n: n })); b.hidden = n === 0; });
    $$('[data-bind="badge-done"]').forEach(function (b) { b.hidden = !(n === 0 && ses.length > 0); });
    var cnt = bind("rep-count");
    cnt.hidden = n === 0;
    cnt.textContent = t("rep.count", { n: n });
    var pend = bind("pending");
    pend.hidden = n === 0;
    pend.textContent = t("pending", { n: n });
    bind("queue").hidden = n === 0;
    // the done moment: the 3D bubble, the headline, one sticker; the undo bar stays on top of it
    var done = bind("done"), wasHidden = done.hidden;
    done.hidden = !(n === 0 && ses.length > 0);
    if (!done.hidden && wasHidden && opts.fresh && moving()) { done.classList.remove("is-in"); void done.offsetWidth; done.classList.add("is-in"); }
    if (done.hidden) done.classList.remove("is-in");
    bind("rep-empty").hidden = !(n === 0 && ses.length === 0);
    renderApproved();
    renderHistory();
    // approved and history are one summary row each while replies wait; approved opens when the queue is done
    if (!touched.appr) apprFold.open = n === 0;
    if (!touched.hist) histFold.open = false;
    renderMa();
    renderStates();
    syncBars();
    if (!n) return;
    // the list at the side (desktop)
    var list = bind("queue-list");
    list.setAttribute("aria-label", t("pending.list", { n: n }));
    list.innerHTML = rem.map(function (qid, i) {
      var q = Q[qid];
      return '<li><button type="button" class="q-item" data-q="' + qid + '"' + (i === cur ? ' aria-current="true"' : "") + '>' +
        '<span class="q-it"><span class="q-iv">' + esc(q.venue) + '</span><span class="stars" role="img" aria-label="' + esc(t("stars", { n: q.rating })) + '">' + starsHTML(q.rating) + "</span></span>" +
        '<span class="q-ix"' + (q.lang ? ' lang="' + q.lang + '"' : "") + ">" + esc(q.body) + "</span>" +
        '<span class="q-iw">' + esc(whenOf(qid)) + "</span></button></li>";
    }).join("");
    // the one in focus
    var q = Q[id];
    bind("q-i").textContent = cur + 1;
    bind("q-n").textContent = n;
    bind("pips").innerHTML = ses.map(function (h) { return '<li class="' + (h.kind === "approved" ? "is-ok" : "is-skip") + '"></li>'; }).join("") +
      rem.map(function (qid, i) { return "<li" + (i === cur ? ' class="is-cur"' : "") + "></li>"; }).join("");
    bind("q-venue").textContent = q.venue;
    var st = bind("q-stars");
    st.innerHTML = starsHTML(q.rating);
    st.setAttribute("aria-label", t("stars", { n: q.rating }));
    bind("q-meta").textContent = q.meta;
    var body = bind("q-body");
    body.textContent = q.body;
    if (q.lang) body.setAttribute("lang", q.lang); else body.removeAttribute("lang");
    if (editor.getAttribute("data-for") !== String(id)) {
      editor.value = texts[id];
      editor.setAttribute("data-for", id);
      if (q.lang) editor.setAttribute("lang", q.lang); else editor.removeAttribute("lang");
    }
    bind("q-edited").hidden = texts[id] === q.draft;
    var now = "";
    $$("[data-rw]", rwBox).forEach(function (c) {
      var on = texts[id] === q.rw[c.getAttribute("data-rw")] && texts[id] !== q.draft;
      if (on) now = c.textContent;
      c.setAttribute("aria-pressed", String(on));
      c.disabled = false;
    });
    bind("rw-now").textContent = now;
    $('[data-act="rw-undo"]').hidden = before[id] == null;
    $('[data-act="prev"]').disabled = cur <= 0;
    $('[data-act="next"]').disabled = cur >= n - 1;
    if (opts.fresh && moving()) { detail.classList.remove("is-next"); void detail.offsetWidth; detail.classList.add("is-next"); }
  }
  /* focus goes to the reply now in front of you, or to the done heading when there is none */
  function focusQueue() {
    if (view !== "valaszok") { $("#main").focus({ preventScroll: true }); return; }
    var el = remaining().length ? bind("q-venue") : bind("done").hidden ? $("#main") : $("#h-done");
    if (el && (el === $("#main") || el.offsetParent)) el.focus();
  }
  function select(i) { var n = remaining().length; if (!n) return; cur = Math.max(0, Math.min(n - 1, i)); editor.removeAttribute("data-for"); renderQueue({ fresh: true }); }
  function step(d) {
    var n = remaining().length;
    if (!n || cur + d < 0 || cur + d > n - 1) return;
    select(cur + d);
    focusQueue();
  }
  function openReply(id) {
    var i = remaining().indexOf(id);
    if (i >= 0) { cur = i; editor.removeAttribute("data-for"); }
    renderQueue();
    show("valaszok", { focus: remaining().length ? bind("q-venue") : null });
  }
  editor.addEventListener("input", function () {
    var id = Number(editor.getAttribute("data-for"));
    texts[id] = editor.value;
    bind("q-edited").hidden = texts[id] === Q[id].draft;
    editor.classList.remove("is-swapped");
  });
  /* while you type on a phone, the approve bar and the tab bar step aside so nothing covers the reply */
  editor.addEventListener("focus", function () { html.classList.add("is-editing"); });
  editor.addEventListener("blur", function () { html.classList.remove("is-editing"); });
  function syncBars() { html.classList.toggle("has-qbar", view === "valaszok" && remaining().length > 0); }
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (qbar.offsetHeight) html.style.setProperty("--qbar-h", qbar.offsetHeight + "px");
      if (toastEl.offsetHeight) html.style.setProperty("--toast-h", toastEl.offsetHeight + "px");
    }).observe(qbar);
  }
  function act(kind) {
    var rem = remaining();
    if (!rem.length) return;
    var id = rem[cur], text = (texts[id] || "").trim();
    if (kind === "approved" && !text) { note(t("empty.text")); editor.focus(); return; }
    handled.push({ id: id, kind: kind, text: text });
    undoState = { id: id, kind: kind, at: cur };
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* not supported */ }
    editor.removeAttribute("data-for");
    if (document.activeElement === editor) editor.blur();
    renderQueue({ fresh: true });
    var last = remaining().length === 0;
    toast(kind);
    if (toastEl.offsetHeight) html.style.setProperty("--toast-h", toastEl.offsetHeight + "px");
    say(t(kind === "approved" ? "say.approved" : "say.skipped") + (last ? " " + t("say.last") : ""));
    if (kind === "approved" && !Q[id].linked) showSheet(id); else hideSheet();
    // focus moves now, not on the next frame: a key pressed right after (E) must not lose its target
    focusQueue();
  }
  function undo() {
    if (!undoState) return;
    var u = undoState;
    handled = handled.filter(function (h) { return !(h.id === u.id && !h.pre); });
    undoState = null;
    hideToast(); hideSheet();
    cur = Math.max(0, remaining().indexOf(u.id));
    editor.removeAttribute("data-for");
    renderQueue({ fresh: true });
    focusQueue();
    note(t("toast.undone"));
  }
  $('[data-act="approve"]').addEventListener("click", function () { act("approved"); });
  $('[data-act="skip"]').addEventListener("click", function () { act("skipped"); });
  /* the arrows keep focus, unless they just ran out of replies */
  $('[data-act="prev"]').addEventListener("click", function (e) { select(cur - 1); if (e.currentTarget.disabled) focusQueue(); });
  $('[data-act="next"]').addEventListener("click", function (e) { select(cur + 1); if (e.currentTarget.disabled) focusQueue(); });
  bind("queue-list").addEventListener("click", function (e) {
    var b = e.target.closest(".q-item");
    if (!b) return;
    select(remaining().indexOf(Number(b.getAttribute("data-q"))));
    focusQueue();
  });
  $('[data-act="restore"]').addEventListener("click", function () {
    var id = Number(editor.getAttribute("data-for"));
    texts[id] = Q[id].draft; delete before[id];
    editor.value = texts[id];
    renderQueue();
    editor.focus();
    say(t("say.restored"));
  });
  /* rewrite: five chips under one "Átírás" control, open on a desktop, folded on a phone */
  var rwTimer = 0;
  $$("[data-rw]", rwBox).forEach(function (c) {
    c.addEventListener("click", function () {
      var id = Number(editor.getAttribute("data-for")), mode = c.getAttribute("data-rw"), label = c.textContent;
      if (texts[id] === Q[id].rw[mode]) return;
      $$("[data-rw]", rwBox).forEach(function (x) { x.disabled = true; });
      c.textContent = t("rw.busy");
      c.setAttribute("aria-pressed", "true");
      clearTimeout(rwTimer);
      rwTimer = setTimeout(function () {
        c.textContent = label;
        before[id] = texts[id];
        texts[id] = Q[id].rw[mode];
        editor.value = texts[id];
        editor.classList.remove("is-swapped"); void editor.offsetWidth; editor.classList.add("is-swapped");
        renderQueue();
        if (document.activeElement === document.body || document.activeElement === c) c.focus();
        say(t("say.rewrite", { mode: label }));
      }, moving() ? 520 : 200);
    });
  });
  $('[data-act="rw-undo"]').addEventListener("click", function () {
    var id = Number(editor.getAttribute("data-for"));
    if (before[id] == null) return;
    texts[id] = before[id]; delete before[id];
    editor.value = texts[id];
    renderQueue();
    editor.focus();
    say(t("say.rwundo"));
  });
  function syncRewrite() { rwBox.open = !mqPhone.matches; }
  mqPhone.addEventListener("change", syncRewrite);

  /* the copy-and-open sheet, for a venue we cannot post to yet */
  var sheet = bind("sheet"), sheetText = "";
  function showSheet(id) { sheetText = (handledOf(id) || {}).text || ""; sheet.hidden = false; }
  function hideSheet() { sheet.hidden = true; }
  function copy(text) {
    var ok = function () { note(t("toast.copied")); };
    try { navigator.clipboard.writeText(text).then(ok, function () { note(t("toast.copyfail")); }); } catch (e) { note(t("toast.copyfail")); }
  }
  $('[data-act="copy-open"]').addEventListener("click", function () { hideSheet(); focusQueue(); copy(sheetText); });
  $('[data-act="sheet-later"]').addEventListener("click", function () { hideSheet(); focusQueue(); });

  /* Keys: only on Válaszok, never in a field (the reply, the search, a select, anything editable),
     never while an IME composes a character, never with a modifier, never under a dialog or the menu. */
  document.addEventListener("keydown", function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (view !== "valaszok" || !report.hidden || !panel.hidden) return;
    var el = e.target;
    var field = el && el.closest && el.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (field) {
      if (el === editor && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); act("approved"); }
      else if (el === editor && e.key === "Escape") { e.preventDefault(); editor.blur(); focusQueue(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = (e.key || "").toLowerCase();
    if (k === "j") { e.preventDefault(); step(1); }
    else if (k === "k") { e.preventDefault(); step(-1); }
    else if (k === "a") { e.preventDefault(); act("approved"); }
    else if (k === "s") { e.preventDefault(); act("skipped"); }
    else if (k === "e") { if (remaining().length) { e.preventDefault(); editor.focus(); } }
    else if (k === "u") { e.preventDefault(); undo(); }
    else if (k === "o") { if (remaining().length) note(t("toast.google")); }
  });

  /* approved, not yet posted */
  function renderApproved() {
    var box = bind("approved-list"), sec = apprFold;
    var list = handled.filter(function (h) { return h.kind === "approved" && !posted[h.id]; });
    sec.hidden = scenario === "ures" || scenario === "elso" || list.length === 0;
    bind("appr-n").textContent = list.length;
    box.innerHTML = list.slice().reverse().map(function (h) {
      var q = Q[h.id], manual = !q.linked;
      return '<article class="card approved" data-appr="' + h.id + '">' +
        '<div class="rv-top"><h3 class="rv-venue">' + esc(q.venue) + '</h3><span class="stars" role="img" aria-label="' + esc(t("stars", { n: q.rating })) + '">' + starsHTML(q.rating) + "</span>" +
        '<span class="tag ' + (manual ? "" : "warn") + '">' + esc(manual ? t("appr.manual") : t("appr.waiting")) + "</span></div>" +
        '<p class="rv-meta">' + esc(q.meta) + "</p>" +
        '<p class="rv-text"' + (q.lang ? ' lang="' + q.lang + '"' : "") + ">" + esc(q.body) + "</p>" +
        '<p class="final-label">' + esc(t("appr.final")) + "</p>" +
        '<p class="final-text"' + (q.lang ? ' lang="' + q.lang + '"' : "") + ">" + esc(h.text) + "</p>" +
        '<p class="actions">' + (manual
          ? '<button type="button" class="btn" data-appr-act="copy">' + esc(t("appr.copy")) + '</button><a class="ext" href="#" data-google>' + esc(t("appr.google")) + '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-ext"/></svg></a>'
          : '<button type="button" class="btn" data-appr-act="post">' + esc(t("appr.post")) + "</button>") +
        '<button type="button" class="btn btn-2" data-appr-act="back">' + esc(t("appr.back")) + '</button><span class="pos-note" role="status"></span></p></article>';
    }).join("");
  }
  bind("approved-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-appr-act]");
    if (!b) return;
    var card = b.closest("[data-appr]"), id = Number(card.getAttribute("data-appr")), what = b.getAttribute("data-appr-act");
    var h = handledOf(id);
    if (what === "copy") { copy(h ? h.text : ""); return; }
    if (what === "post") {
      b.disabled = true; b.textContent = t("post.busy");
      setTimeout(function () {
        $(".pos-note", card).textContent = t("post.done");
        setTimeout(function () { posted[id] = true; renderQueue(); $("summary", apprFold.hidden ? histFold : apprFold).focus(); }, 900);
      }, 700);
      return;
    }
    if (what === "back") {
      handled = handled.filter(function (x) { return x.id !== id; });
      if (h) texts[id] = h.text;
      if (undoState && undoState.id === id) { undoState = null; hideToast(); }
      cur = Math.max(0, remaining().indexOf(id));
      editor.removeAttribute("data-for");
      renderQueue({ fresh: true });
      focusQueue();
      note(t("post.back"));
    }
  });
  $("summary", apprFold).addEventListener("click", function () { touched.appr = true; });
  $("summary", histFold).addEventListener("click", function () { touched.hist = true; });
  /* history: what this session closed comes first, the way the product lists the last 50 */
  var histBody = $("tbody", histFold), histStatic = histBody.innerHTML;
  function renderHistory() {
    var rows = handled.filter(function (h) { return h.kind === "skipped" || (h.kind === "approved" && posted[h.id]); }).slice().reverse().map(function (h) {
      var q = Q[h.id], skip = h.kind === "skipped";
      return '<tr><td class="nowrap">' + esc(t("hist.today")) + "</td><td>" + esc(q.venue) + "</td><td>" +
        (skip ? '<span class="muted">' + esc(t("hist.skipped")) + "</span>" : '<span class="pos">' + esc(t("hist.posted")) + "</span>") + "</td>" +
        "<td" + (q.lang && !skip ? ' lang="' + q.lang + '"' : "") + ">" + esc(skip ? t("hist.none") : h.text) + "</td></tr>";
    }).join("");
    histBody.innerHTML = rows + histStatic;
  }

  /* ================================================================ Ma */
  function setHead(key, n) {
    bind("head-a").textContent = t("head." + key + ".a");
    bind("head-hl").textContent = t("head." + key + ".hl", { n: n });
    bind("head-b").textContent = t("head." + key + ".b");
    var len = (t("head." + key + ".a") + t("head." + key + ".hl", { n: n }) + t("head." + key + ".b")).length;
    bind("hello-p").classList.toggle("is-long", len > 26);
  }
  function fillCard(which, id) {
    var q = Q[id];
    bind(which + "-title").textContent = t("next.title", { rating: q.rating, venue: q.venue });
    bind(which + "-body").textContent = q.body;
    if (q.lang) bind(which + "-body").setAttribute("lang", q.lang); else bind(which + "-body").removeAttribute("lang");
    bind(which + "-meta").textContent = q.meta;
  }
  function renderMa() {
    var rem = remaining(), ses = session(), card = "none";
    bind("hello").textContent = scenario === "reggel" || scenario === "kesz" ? t("hello.morning") : t("hello.day");
    var skippedSerious = ses.filter(function (h) { return h.kind === "skipped" && Q[h.id].rating <= 2; });
    var doneSticker = false;
    if (scenario === "ures") { setHead("new"); }
    else if (rem.length) {
      setHead(rem.length === 1 ? "one" : "queue", rem.length);
      card = "next";
      fillCard("next", rem[0]);
      // the card says why this one is first: the worst, then the oldest
      bind("next-why").textContent = t("next.why", { when: Q[rem[0]].whenAdj, rating: Q[rem[0]].rating });
      var more = bind("next-more");
      more.hidden = rem.length < 2;
      more.textContent = t("next.more", { n: rem.length - 1 });
    } else if (scenario === "elso") {
      setHead("unans1");
      card = "open"; fillCard("open", 0);
    } else if (skippedSerious.length) {
      setHead(skippedSerious.length === 1 ? "unans1" : "unans", skippedSerious.length);
      card = "open"; fillCard("open", skippedSerious[0].id);
    } else {
      setHead("quiet");
      card = "quiet";
      doneSticker = ses.length > 0;
    }
    $$(".day-card").forEach(function (c) { c.hidden = c.getAttribute("data-card") !== card; });
    bind("hello-done").hidden = !doneSticker;
    renderRange(range);
  }

  /* The period's numbers (Overview.tsx), yesterday first. The rows add up to the totals, yesterday
     is inside the 7 days and the 7 days inside the 30, and yesterday's eight are the band's eight. */
  var VENUES = [["Példa Bisztró", 4.6, 1284], ["Minta Étterem", 4.4, 612], ["Teszt Kávézó", 4.7, 238]];
  var MA = {
    yday: [[0, 1, 0, 0, 2], [0, 1, 1, 0, 1], [0, 0, 0, 1, 1]],
    today: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    "7": [[1, 1, 1, 3, 11], [0, 2, 1, 2, 8], [0, 0, 0, 2, 6]],
    "30": [[2, 2, 4, 10, 44], [1, 2, 4, 9, 38], [0, 0, 2, 6, 22]]
  };
  var range = "yday";
  /* Unanswered one and two star reviews: yesterday's two are drafts 0 and 1 in the queue; the older
     ones inside 30 days were answered. Approved is not answered until it is on Google. */
  function unanswered(key) {
    if (key === "today") return 0;
    return [0, 1].filter(function (id) { return !posted[id]; }).length;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function avgOf(st) { var n = sum(st); if (!n) return null; return (st[0] + 2 * st[1] + 3 * st[2] + 4 * st[3] + 5 * st[4]) / n; }
  function renderRange(key) {
    range = key;
    var rows = MA[key].map(function (st, i) { return { name: VENUES[i][0], st: st, n: sum(st), avg: avgOf(st), google: VENUES[i][1], total: VENUES[i][2] }; });
    var all = [0, 0, 0, 0, 0];
    rows.forEach(function (r) { r.st.forEach(function (v, i) { all[i] += v; }); });
    var n = sum(all), avg = avgOf(all);
    bind("period-title").textContent = t("period." + key);
    bind("period-date").textContent = t("period." + key + ".d");
    bind("m-new").textContent = n;
    bind("m-avg").textContent = fmt(avg, 2);
    bind("m-unans").textContent = unanswered(key);
    $(".period-tiles").hidden = n === 0;
    bind("ma-none").hidden = n !== 0;
    bind("ma-answer").textContent = n === 0 ? t("ma.answer.none") : n === 1 ? t("ma.answer.one") : t("ma.answer", { n: n }) + " " + t("ma.answer.avg", { avg: fmt(avg, 2) });
    var byWorst = rows.slice().sort(function (a, b) { return (b.st[0] + b.st[1]) - (a.st[0] + a.st[1]) || b.n - a.n; });
    bind("venue-rows").innerHTML = byWorst.map(function (r) {
      var s = r.st[0] + r.st[1];
      return '<li><span class="vn">' + esc(r.name) + '</span><span class="vm">' + esc(t("venue.row", { n: r.n, avg: r.avg == null ? "0" : fmt(r.avg, 2) })) + "</span>" +
        '<span class="stk ' + (s ? "stk-neg" : "stk-ok") + '">' + esc(s ? t("venue.serious", { n: s }) : t("venue.ok")) + "</span></li>";
    }).join("");
    var byNew = rows.slice().sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name, "hu"); });
    bind("venue-table").innerHTML = byNew.map(function (r) {
      var neg = r.st[0] + r.st[1] > 0;
      return "<tr" + (r.n === 0 ? ' class="quiet"' : "") + "><td>" + (neg ? '<span class="tag neg" title="' + esc(t("neg.marker")) + '">' + esc(t("neg.flag")) + "</span>" : "") + esc(r.name) + "</td>" +
        '<td class="num"><strong>' + r.n + '</strong></td><td class="num"><strong' + (r.st[4] ? ' class="pos"' : "") + ">" + r.st[4] + '</strong></td><td class="num">' + r.st[3] + '</td><td class="num">' + r.st[2] + "</td>" +
        '<td class="num"><strong' + (r.st[1] ? ' class="neg"' : "") + ">" + r.st[1] + '</strong></td><td class="num"><strong' + (r.st[0] ? ' class="neg"' : "") + ">" + r.st[0] + "</strong></td>" +
        '<td class="num">' + (r.avg == null ? "" : fmt(r.avg, 2)) + '</td><td class="num">' + fmt(r.google, 1) + '</td><td class="num">' + r.total + "</td></tr>";
    }).join("");
    bind("with").textContent = rows.filter(function (r) { return r.n > 0; }).length + " / " + rows.length;
  }
  /* "Más időszak": the other periods behind one control */
  var maRange = bind("ma-range"), moreBtn = $('[data-act="period-more"]');
  function setMore(open) { maRange.hidden = !open; moreBtn.setAttribute("aria-expanded", String(open)); }
  moreBtn.addEventListener("click", function () { setMore(maRange.hidden); });
  function pickRange(key) {
    $$("button", maRange).forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-range") === key)); });
    renderRange(key);
  }
  maRange.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    pickRange(b.getAttribute("data-range"));
    say(t("period." + range) + ". " + bind("ma-answer").textContent);
  });
  /* "Részletes bontás": open on a desktop, where D-041 keeps the star table in view; folded on a
     phone, where the table is then one tap away; remembered on this device per layout once changed */
  var maFold = bind("ma-details");
  function foldKey() { return "bt.ma.details." + (mqPhone.matches ? "phone" : "desk"); }
  function syncMaFold() { var p = store(foldKey()); maFold.open = p ? p === "open" : !mqPhone.matches; }
  $("summary", maFold).addEventListener("click", function () { setTimeout(function () { store(foldKey(), maFold.open ? "open" : "closed"); }, 0); });
  mqPhone.addEventListener("change", syncMaFold);
  $('[data-act="hide-check"]').addEventListener("click", function () { $(".checklist").hidden = true; $("#main").focus({ preventScroll: true }); });

  /* The band: still by default, a row you scroll; moving on the lab's switch, pausable and never under
     reduced motion; or none. The loop's copy is hidden from assistive technology and from Tab. */
  var BANDS = { move: 1, still: 1, off: 1 };
  function setBandMode(m) { html.setAttribute("data-band", BANDS[m] ? m : "still"); }
  var band = bind("band"), bandBtn = $('[data-act="band"]'), loopCopy = bind("marquee-copy");
  loopCopy.innerHTML = $(".marquee-list:not(.marquee-copy)").innerHTML;
  $$("a", loopCopy).forEach(function (a) { a.setAttribute("tabindex", "-1"); });
  function setPaused(paused) {
    band.classList.toggle("is-paused", paused);
    bandBtn.setAttribute("aria-pressed", String(paused));
    bind("band-word").textContent = paused ? t("band.play") : t("band.pause");
    store("bt.band.paused", paused ? "1" : "0");
  }
  bandBtn.addEventListener("click", function () { setPaused(!band.classList.contains("is-paused")); });
  if (store("bt.band.paused") === "1") setPaused(true);

  /* the morning report: the quiet card's "Legutóbbi jelentés" opens it; Escape, the scrim and Bezárás close it */
  var report = bind("report"), reportFrom = null;
  function openReport(from) {
    reportFrom = from || document.activeElement;
    report.hidden = false;
    document.body.style.overflow = "hidden";
    bind("report-card").focus();
  }
  function closeReport() {
    if (report.hidden) return;
    report.hidden = true;
    document.body.style.overflow = "";
    if (reportFrom && reportFrom.focus) reportFrom.focus();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest('[data-act="report-open"]')) openReport(e.target.closest("button"));
    else if (e.target.closest('[data-act="report-close"]')) closeReport();
  });
  document.addEventListener("keydown", function (e) {
    if (report.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeReport(); return; }
    if (e.key === "Tab") {
      // the dialog holds the card and one button: Tab stays inside it
      var card = bind("report-card"), btn = $(".report-actions .btn", report);
      if (e.shiftKey && document.activeElement === card) { e.preventDefault(); btn.focus(); }
      else if (!e.shiftKey && document.activeElement === btn) { e.preventDefault(); card.focus(); }
      else if (!report.contains(document.activeElement)) { e.preventDefault(); card.focus(); }
    }
  }, true);

  /* ================================================================ Értékelések */
  var chips = $$("[data-chip]"), venueSel = bind("venue"), search = bind("search");
  var fRating = bind("f-rating"), fAns = bind("f-answered"), fSent = bind("f-sent"), fText = bind("f-text"), fSort = bind("f-sort");
  var filtersBox = $("#rev-filters"), filterBtn = $('[data-act="filters"]');
  var chip = "all";
  function setChip(c) {
    chip = c;
    chips.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-chip") === c)); });
    if (c === "all") { venueSel.value = ""; search.value = ""; fRating.value = ""; fAns.value = ""; fSent.value = ""; fText.value = ""; }
    filterReviews();
  }
  /* on a phone the quick chips and the other filters sit behind one "Szűrők" button, with a count */
  function setFilters(open) { filtersBox.classList.toggle("is-open", open); filterBtn.setAttribute("aria-expanded", String(open)); }
  filterBtn.addEventListener("click", function () { setFilters(!filtersBox.classList.contains("is-open")); });
  function filterReviews() {
    var cards = $$(".rv", bind("review-list")), q = search.value.trim().toLowerCase(), v = venueSel.value, shown = 0;
    var any = chip !== "all" || v || q || fRating.value || fAns.value || fSent.value || fText.value;
    cards.forEach(function (c) {
      var r = Number(c.getAttribute("data-rating")), open = c.getAttribute("data-open") === "1";
      var ok = true;
      if (scenario === "elso" && c.getAttribute("data-venue") !== "Példa Bisztró") ok = false;
      if (chip === "waiting" && !(open && r <= 3)) ok = false;
      if (chip === "serious" && r > 2) ok = false;
      if (chip === "five" && r !== 5) ok = false;
      if (v && c.getAttribute("data-venue") !== v) ok = false;
      if (q && c.textContent.toLowerCase().indexOf(q) < 0) ok = false;
      if (fRating.value === "neg" ? r > 3 : fRating.value && r !== Number(fRating.value)) ok = false;
      if (fAns.value === "open" && !open) ok = false;
      if (fAns.value === "done" && open) ok = false;
      if (fSent.value && c.getAttribute("data-sent") !== fSent.value) ok = false;
      if (fText.value && c.getAttribute("data-text") !== fText.value) ok = false;
      c.hidden = !ok;
      if (ok) shown++;
    });
    var list = bind("review-list");
    cards.sort(function (a, b) {
      return fSort.value === "low" ? Number(a.getAttribute("data-rating")) - Number(b.getAttribute("data-rating")) || Number(b.getAttribute("data-when")) - Number(a.getAttribute("data-when"))
        : Number(b.getAttribute("data-when")) - Number(a.getAttribute("data-when"));
    }).forEach(function (c) { list.appendChild(c); });
    var total = scenario === "elso" ? 200 : 2134;
    bind("rev-count").textContent = t("rev.count", { n: any ? shown : total });
    bind("rev-empty").hidden = shown > 0;
    bind("rev-more").hidden = !!any || shown === 0;
    $$(".stk-new", list).forEach(function (s) { s.hidden = scenario === "elso"; });
    var nf = (chip !== "all" ? 1 : 0) + [venueSel, fRating, fAns, fSent, fText].filter(function (s) { return !!s.value; }).length;
    var fc = bind("fcount");
    fc.hidden = nf === 0;
    fc.innerHTML = nf + '<span class="sr-only">' + esc(t("fcount.sr")) + "</span>";
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { setChip(chip === c.getAttribute("data-chip") && chip !== "all" ? "all" : c.getAttribute("data-chip")); }); });
  [venueSel, fRating, fAns, fSent, fText, fSort].forEach(function (s) { s.addEventListener("change", filterReviews); });
  search.addEventListener("input", filterReviews);
  $('[data-act="clear-filters"]').addEventListener("click", function () { setChip("all"); search.focus(); });
  /* each drafted review says where it stands; with a draft the main action is "Válasz átnézése" */
  function renderStates() {
    $$(".rv[data-q]", bind("review-list")).forEach(function (c) {
      var id = Number(c.getAttribute("data-q")), st = stateOf(id), box = $(".rv-state", c);
      c.setAttribute("data-open", st === "posted" ? "0" : "1");
      if (box.getAttribute("data-state") === st) return;
      box.setAttribute("data-state", st);
      box.innerHTML = '<span class="state state-' + st + '">' + esc(t("state." + st)) + "</span>" +
        (st === "draft" ? '<a class="btn btn-sm" href="#valaszok" data-reply="' + id + '">' + esc(t("state.review")) + '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></a>' : "") +
        '<a class="ext" href="#" data-google>' + esc(t("appr.google")) + '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-ext"/></svg></a>';
    });
  }

  /* ================================================================ Kimutatások */
  var MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
  var INS = {
    "7": { n: 38, avg: 4.37, low: "11%", unans: 3, cov: "100%", start: [4.6, 4.4, 4.7], end: [4.6, 4.4, 4.7],
      cmp: [["Példa Bisztró", 17, 4.29, 2, 1, 4.6, "0,0", 1284], ["Minta Étterem", 13, 4.23, 2, 2, 4.4, "0,0", 612], ["Teszt Kávézó", 8, 4.75, 0, 0, 4.7, "0,0", 238]] },
    "30": { n: 146, avg: 4.53, low: "5%", unans: 3, cov: "100%", start: [4.5, 4.4, 4.6], end: [4.6, 4.4, 4.7],
      cmp: [["Példa Bisztró", 62, 4.48, 4, 1, 4.6, "+0,1", 1284], ["Minta Étterem", 54, 4.50, 3, 2, 4.4, "0,0", 612], ["Teszt Kávézó", 30, 4.67, 0, 0, 4.7, "+0,1", 238]] },
    "90": { n: 402, avg: 4.53, low: "5%", unans: 3, cov: "100%", start: [4.5, 4.5, 4.5], end: [4.6, 4.4, 4.7],
      cmp: [["Példa Bisztró", 170, 4.49, 9, 1, 4.6, "+0,1", 1284], ["Minta Étterem", 150, 4.50, 8, 2, 4.4, "−0,1", 612], ["Teszt Kávézó", 82, 4.68, 3, 0, 4.7, "+0,2", 238]] }
  };
  var period = "30", charts = { drawn: false, hidden: [false, false, false] };
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function days(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) { var d = new Date(Date.UTC(2026, 8, 26 - i)); out.push({ d: d, label: MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ".", dow: d.getUTCDay() }); }
    return out;
  }
  function series(key) {
    var info = INS[key], ds = days(Number(key)), r = rng(Number(key) * 7919 + 17);
    // new reviews per day: the weekend is busier; the last day, today, has none yet; they add up to the total
    var w = ds.map(function (x, i) { return i === ds.length - 1 ? 0 : 1 + (x.dow === 5 || x.dow === 6 || x.dow === 0 ? .7 : 0) + r() * .7; });
    var ws = sum(w), counts = w.map(function (x) { return Math.floor(info.n * x / ws); });
    var diff = info.n - sum(counts), order = w.map(function (x, i) { return i; }).sort(function (a, b) { return w[b] - w[a]; });
    for (var k = 0; diff > 0; k = (k + 1) % order.length, diff--) counts[order[k]]++;
    // the Google rating per venue: a step from the first value to the last, on a day of its own
    var lines = [0, 1, 2].map(function (v) {
      var a = info.start[v], b = info.end[v], at = Math.floor(ds.length * (.25 + .5 * r()));
      var steps = Math.round(Math.abs(b - a) * 10), dir = b > a ? 1 : -1, vals = [];
      for (var i = 0; i < ds.length; i++) {
        var passed = 0;
        for (var s = 1; s <= steps; s++) if (i >= at + (s - 1) * Math.max(2, Math.floor(ds.length / 8))) passed = s;
        vals.push(Math.round((a + dir * passed / 10) * 10) / 10);
      }
      return vals;
    });
    return { ds: ds, counts: counts, lines: lines };
  }
  function svgEl(w, h, inner) { return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">' + inner + "</svg>"; }
  function drawCharts() {
    if (view !== "kimutatasok" && !charts.drawn) return;
    var box1 = $('[data-chart="rating"]'), box2 = $('[data-chart="new"]');
    var W = Math.max(280, Math.round(box1.clientWidth || 900)), phone = W < 560;
    var H = phone ? 220 : 280, L = 40, Rt = 12, T = 12, B = 30, iw = W - L - Rt, ih = H - T - B;
    var s = series(period), n = s.ds.length;
    var ymin = 4.2, ymax = 4.8, y = function (v) { return T + ih - (v - ymin) / (ymax - ymin) * ih; }, x = function (i) { return L + (n === 1 ? 0 : i * iw / (n - 1)); };
    var g = "";
    [4.3, 4.5, 4.7].forEach(function (v) { g += '<line class="ch-grid" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v, 1) + "</text>"; });
    g += '<line class="ch-base" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + (T + ih) + '" y2="' + (T + ih) + '"/>';
    var ticks = phone ? 3 : 5;
    for (var k = 0; k < ticks; k++) { var i = Math.round(k * (n - 1) / (ticks - 1)); g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + (k === 0 ? "start" : k === ticks - 1 ? "end" : "middle") + '">' + s.ds[i].label + "</text>"; }
    s.lines.forEach(function (vals, si) {
      var d = vals.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      var dots = "";
      vals.forEach(function (v, i) { if (i === 0 || i === n - 1 || v !== vals[i - 1]) dots += '<circle class="ch-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="5"/>'; });
      g += '<g class="ch-s' + si + (charts.hidden[si] ? " is-off" : "") + '" data-s="' + si + '"><path class="ch-line" d="' + d + '"/>' + dots + "</g>";
    });
    box1.innerHTML = svgEl(W, H, g);
    // bars
    var max = Math.max.apply(null, s.counts) || 1, top = Math.ceil(max / 5) * 5, yb = function (v) { return T + ih - v / top * ih; };
    var bw = Math.max(2, iw / n - (n > 60 ? 1 : 3)), b = "";
    [0, top / 2, top].forEach(function (v) { b += '<line class="' + (v ? "ch-grid" : "ch-base") + '" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + yb(v) + '" y2="' + yb(v) + '"/><text x="' + (L - 8) + '" y="' + (yb(v) + 4) + '" text-anchor="end">' + v + "</text>"; });
    s.counts.forEach(function (c, i) { if (c) b += '<rect class="ch-bar" x="' + (L + i * iw / n + (iw / n - bw) / 2).toFixed(1) + '" y="' + yb(c).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (T + ih - yb(c)).toFixed(1) + '" rx="' + (bw > 8 ? 3 : 1) + '"/>'; });
    for (var k2 = 0; k2 < ticks; k2++) { var i2 = Math.round(k2 * (n - 1) / (ticks - 1)); b += '<text x="' + (L + (i2 + .5) * iw / n) + '" y="' + (H - 8) + '" text-anchor="' + (k2 === 0 ? "start" : k2 === ticks - 1 ? "end" : "middle") + '">' + s.ds[i2].label + "</text>"; }
    box2.innerHTML = svgEl(W, H, b);
    box1.setAttribute("aria-label", t("ins.rating.aria", { days: n }));
    box2.setAttribute("aria-label", t("ins.new.aria", { days: n, total: INS[period].n }));
    // the table twins
    bind("rating-table").innerHTML = "<table><thead><tr><th>" + esc(t("ins.col.day")) + "</th>" + VENUES.map(function (v) { return '<th class="num">' + esc(v[0]) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      s.ds.map(function (d, i) { return "<tr><td>" + d.label + "</td>" + s.lines.map(function (l) { return '<td class="num">' + fmt(l[i], 1) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    bind("new-table").innerHTML = "<table><thead><tr><th>" + esc(t("ins.col.day")) + '</th><th class="num">' + esc(t("ins.col.new")) + "</th></tr></thead><tbody>" +
      s.ds.map(function (d, i) { return "<tr><td>" + d.label + '</td><td class="num">' + s.counts[i] + "</td></tr>"; }).join("") + "</tbody></table>";
    charts.drawn = true;
  }
  function renderInsights() {
    var info = INS[period];
    bind("i-new").textContent = info.n; bind("i-avg").textContent = fmt(info.avg, 2); bind("i-low").textContent = info.low;
    bind("i-unans").textContent = info.unans; bind("i-cov").textContent = info.cov;
    bind("ins-answer").textContent = t("ins.answer", { n: info.n, avg: fmt(info.avg, 2) });
    bind("compare").innerHTML = info.cmp.map(function (r) {
      var ch = r[6];
      return "<tr><td>" + esc(r[0]) + '</td><td class="num">' + r[1] + '</td><td class="num">' + fmt(r[2], 2) + '</td><td class="num' + (r[3] ? " neg" : "") + '">' + r[3] + '</td><td class="num' + (r[4] ? " neg" : "") + '">' + r[4] +
        '</td><td class="num">' + fmt(r[5], 1) + '</td><td class="num' + (ch.charAt(0) === "+" ? " pos" : ch.charAt(0) === "−" ? " neg" : "") + '">' + ch + '</td><td class="num">' + r[7] + "</td></tr>";
    }).join("");
    if (view === "kimutatasok") drawCharts();
  }
  var insRange = bind("ins-range");
  insRange.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    $$("button", insRange).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    period = b.getAttribute("data-period");
    renderInsights();
  });
  $$(".legend button").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = Number(b.getAttribute("data-series"));
      charts.hidden[i] = !charts.hidden[i];
      b.setAttribute("aria-pressed", String(!charts.hidden[i]));
      $$('[data-chart="rating"] [data-s="' + i + '"]').forEach(function (g) { g.classList.toggle("is-off", charts.hidden[i]); });
      bind("hidden-all").hidden = !charts.hidden.every(Boolean);
    });
  });
  var resizeT = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (view === "kimutatasok") drawCharts(); }, 120); });

  /* ================================================================ Beállítások */
  var apCard = $(".appearance");
  function syncAppearanceCard() {
    $$('input[name="ap-set"]', apCard).forEach(function (i) { i.checked = !look.auto && i.value === look.palette; });
    $$('input[name="ap-font"]', apCard).forEach(function (i) { i.checked = i.value === look.font; });
    var scheme = look.auto ? "auto" : R.sets[look.palette].scheme;
    $$("[data-scheme]", apCard).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-scheme") === scheme)); });
  }
  apCard.addEventListener("change", function (e) {
    var i = e.target;
    if (i.name === "ap-set") applyLook({ palette: i.value, auto: false }, { local: true, announce: true });
    if (i.name === "ap-font") applyLook({ font: i.value }, { local: true, announce: true });
  });
  apCard.addEventListener("click", function (e) {
    var b = e.target.closest("[data-scheme]");
    if (!b) return;
    var s = b.getAttribute("data-scheme");
    if (s === "auto") applyLook({ auto: true }, { local: true, announce: true });
    else if (s === "dark") applyLook({ palette: R.pair.dark, auto: false }, { local: true, announce: true });
    else applyLook({ palette: R.sets[look.palette].scheme === "dark" ? R.pair.light : look.palette, auto: false }, { local: true, announce: true });
  });
  document.addEventListener("click", function (e) {
    var sw = e.target.closest('[data-act="switch"]');
    if (!sw) return;
    var on = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", String(on));
    if (sw === bind("sw-auto")) { bind("auto-box").hidden = !on; bind("auto-off").hidden = on; }
  });
  var autoMin = bind("auto-min");
  autoMin.addEventListener("change", function () {
    var n = Number(autoMin.value);
    bind("auto-pos").textContent = t("auto.pos", { n: n });
    bind("auto-neg").hidden = n > 2;
  });
  bind("digest").addEventListener("change", function (e) { bind("set-answer").textContent = t("set.answer", { time: e.target.value }); });
  $('[data-act="save"]').addEventListener("click", function () {
    var n = bind("save-note");
    n.textContent = t("set.saved");
    setTimeout(function () { n.textContent = ""; }, 2400);
  });

  /* ================================================================ Éttermek */
  document.addEventListener("click", function (e) {
    var v = e.target.closest('[data-act="voice"]');
    if (!v) return;
    var box = $(".voice", v.closest(".vcard")), open = box.hidden;
    box.hidden = !open;
    v.setAttribute("aria-expanded", String(open));
    v.textContent = open ? t("voice.close") : t("voice.open");
    if (open) $("textarea", box).focus();
  });
  $('[data-act="check-link"]').addEventListener("click", function (e) {
    var b = e.currentTarget, out = bind("link-note");
    b.disabled = true; out.textContent = t("link.busy");
    setTimeout(function () { b.disabled = false; out.textContent = t("link.done"); }, 900);
  });
  $$('form[data-act="find"]').forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var b = $('button[type="submit"]', f), label = b.textContent, q = $("input", f).value.trim();
      b.disabled = true; b.textContent = t("find.busy");
      setTimeout(function () {
        b.disabled = false; b.textContent = label;
        if (f.getAttribute("data-scope") === "venues") { bind("ven-results").hidden = !q; if (!q) note(t("find.none")); }
        else { wiz.results = !!q; if (!q) note(t("find.none")); wiz.render(); }
      }, moving() ? 600 : 250);
    });
  });

  /* ================================================================ Első lépések (Start.tsx, FirstImport.tsx) */
  var wiz = {
    step: 1, results: false, added: false, imp: 0, impDone: false, tg: false, timer: 0,
    reset: function () { clearInterval(this.timer); this.step = 1; this.results = false; this.added = false; this.imp = 0; this.impDone = false; this.tg = false; },
    go: function (s) {
      this.reset();
      if (s >= 1.5) { this.results = true; this.added = true; this.imp = 200; this.impDone = true; }
      if (s >= 2) this.step = 2;
      if (s >= 3) { this.step = 3; }
      this.render();
    },
    render: function () {
      $$(".wiz-card").forEach(function (c) { c.hidden = Number(c.getAttribute("data-step")) !== wiz.step; });
      var nowStep = wiz.step === 1 && wiz.impDone ? 2 : wiz.step;
      $$(".steps .step").forEach(function (li) {
        var s = Number(li.getAttribute("data-s"));
        var done = s === 0 || s < wiz.step || (s === 1 && wiz.impDone);
        li.classList.toggle("is-done", done);
        li.classList.toggle("is-now", !done && s === nowStep);
      });
      bind("results").hidden = !wiz.results || wiz.added;
      bind("added").textContent = wiz.added ? t("add.done", { name: "Példa Bisztró" }) : "";
      $$('[data-act="add-venue"]').forEach(function (b) { b.disabled = wiz.added; });
      bind("import").hidden = !wiz.added;
      bind("imp-n").textContent = wiz.imp;
      bind("imp-bar").style.setProperty("--p", Math.round(wiz.imp / 2) + "%");
      bind("imp-line").textContent = wiz.impDone ? t("imp.done", { n: 200 }) : wiz.imp ? t("imp.downloading") : t("imp.waiting");
      var shown = wiz.impDone ? 5 : Math.min(5, Math.floor(wiz.imp / 40));
      var list = bind("arrivals"), have = list.children.length;
      if (have > shown) { list.innerHTML = ""; have = 0; }
      $$(".arrive-data li").slice(have, shown).forEach(function (li) {
        var r = li.getAttribute("data-r"), lang = li.getAttribute("lang");
        var el = document.createElement("li");
        el.className = "arrival";
        el.innerHTML = '<span class="rate"><svg width="13" height="13" aria-hidden="true" focusable="false"><use href="#g-star"/></svg>' + r + '<span class="sr-only"> csillag</span></span><span class="at"' + (lang ? ' lang="' + lang + '"' : "") + ">„" + esc(li.textContent) + '”<span class="aw">' + esc(li.getAttribute("data-who")) + "</span></span>";
        list.appendChild(el);
      });
      bind("wiz-next-1").disabled = !wiz.impDone;
      bind("wiz-next-2").innerHTML = esc(wiz.tg ? t("tg.next") : t("tg.later")) + '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg>';
      bind("tg-note").textContent = wiz.tg ? t("tg.done") : "";
      bind("tg-ok").textContent = wiz.tg ? t("tg.ok") : t("tg.no");
      bind("wiz-skip").hidden = wiz.step >= 3;
      if (view === "elso") writeHash();
    },
    importNow: function () {
      clearInterval(this.timer);
      var self = this;
      this.imp = 0; this.impDone = false; this.render();
      var stepN = 0;
      this.timer = setInterval(function () {
        stepN++;
        self.imp = Math.min(200, stepN * 25);
        if (self.imp >= 200) { self.impDone = true; clearInterval(self.timer); }
        self.render();
      }, moving() ? 320 : 250);
    }
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || !b.closest('[data-view="elso"]')) return;
    var a = b.getAttribute("data-act");
    if (a === "add-venue") {
      var label = b.textContent;
      b.disabled = true; b.textContent = t("add.busy");
      setTimeout(function () { b.textContent = label; wiz.added = true; wiz.importNow(); }, moving() ? 500 : 200);
    } else if (a === "wiz-next") { wiz.step = Math.min(3, wiz.step + 1); wiz.render(); $("#main").focus({ preventScroll: true }); window.scrollTo(0, 0); }
    else if (a === "wiz-back") { wiz.step = Math.max(1, wiz.step - 1); wiz.render(); }
    else if (a === "tg-connect") { bind("tg-note").textContent = t("tg.waiting"); setTimeout(function () { wiz.tg = true; wiz.render(); }, 1100); }
    else if (a === "copy-code") copy("/link K7Q2-M9TX");
    else if (a === "wiz-finish") { setScenario(wiz.added ? "elso" : "ures"); show("ma"); tell({ type: "bt-scenario-changed", scenario: scenario }); }
  });

  /* ================================================================ scenarios */
  function setScenario(sc, how) {
    how = how || {};
    scenario = /^(reggel|kesz|ures|elso)$/.test(sc) ? sc : "reggel";
    html.setAttribute("data-scenario", scenario);
    if (!report.hidden) closeReport();
    resetQueue(scenario);
    editor.removeAttribute("data-for");
    setChip("all");
    setFilters(false);
    setMore(false);
    pickRange("yday");
    bind("breakdown").open = true;
    syncMaFold();
    syncRewrite();
    $$(".more-filters, .rv-fold").forEach(function (d) { d.open = false; });
    renderQueue();
    renderInsights();
    $(".checklist").hidden = false;
    if (!how.keepWizard) wiz.reset();
    wiz.render();
    writeHash();
  }

  /* ================================================================ the lab */
  window.addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.type !== "bt-apply") return;
    if (d.look) applyLook(d.look);
    if (d.motion) setMotion(d.motion);
    if (d.band) setBandMode(d.band);
    if (d.scenario && d.scenario !== scenario) setScenario(d.scenario);
    if (d.step != null && (d.view || view) === "elso") wiz.go(Number(d.step));
    if (d.view && d.view !== view) show(d.view, { silent: true });
    writeHash();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (look.auto) applyLook({}); });

  /* what matrix.mjs drives: a state, then a measurement of the screen on show */
  function ready() {
    return document.fonts.ready
      .then(function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); })
      .then(function () {
        var fam = getComputedStyle(html).getPropertyValue("--font-display").split(",")[0].replace(/["']/g, "").trim(), loaded = false;
        document.fonts.forEach(function (f) { if (f.family.replace(/["']/g, "") === fam && f.status === "loaded") loaded = true; });
        return { family: fam, loaded: loaded };
      });
  }
  function describeEl(el) {
    var cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
    var txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return el.tagName.toLowerCase() + cls + (txt ? ' "' + txt + '"' : "");
  }
  function clipper(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) { var o = getComputedStyle(p).overflowX; if (o !== "visible") return p; }
    return null;
  }
  function ownText(el) { for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; }
  function visible(el) {
    if (el.closest("[hidden], .sr-only, .strings, .q-data, .sprite")) return false;
    for (var p = el; p && p !== document.body; p = p.parentElement) { var cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false; }
    var r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }
  function inlineLink(el) {
    if (el.tagName !== "A") return false;
    var p = el.parentElement;
    return getComputedStyle(el).display === "inline" && p && Array.prototype.some.call(p.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
  }
  function check() {
    var vw = html.clientWidth, out = [];
    if (html.scrollWidth > vw + 1) out.push("page " + html.scrollWidth + " px wide in a " + vw + " px window");
    var roots = [$(".view:not([hidden])"), mqPhone.matches ? $(".topbar") : $(".rail"), mqPhone.matches ? $(".tabbar") : null, toastEl, sheet, report];
    roots.forEach(function (root) {
      if (!root || root.hidden) return;
      $$("*", root).forEach(function (el) {
        if (!visible(el) || el.closest("svg")) return;
        var cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (!clipper(el) && (r.right > vw + 1 || r.left < -1)) out.push(describeEl(el) + " runs to " + Math.round(r.left) + ".." + Math.round(r.right) + " px in a " + vw + " px window");
        if (cs.display !== "inline" && cs.display !== "contents" && cs.overflowX === "visible" && cs.textOverflow !== "ellipsis" &&
            !/^(SELECT|INPUT|TEXTAREA|IFRAME|TABLE|TBODY|THEAD|TR|svg)$/.test(el.tagName) && ownText(el) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
          out.push(describeEl(el) + ": content " + el.scrollWidth + " px in a " + el.clientWidth + " px box");
        }
        // 44 px targets on the phone: buttons, fields, standalone links, summaries, switches
        if (mqPhone.matches && el.matches("button, a[href], select, input:not([type=radio]):not([type=checkbox]), summary, label.pick") && !inlineLink(el) && !el.closest(".marquee-copy")) {
          if (r.height < 43.5 || r.width < 43.5) out.push(describeEl(el) + ": target " + Math.round(r.width) + " x " + Math.round(r.height) + " px");
        }
      });
    });
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  window.BT = {
    ready: ready,
    set: function (o) {
      o = o || {};
      html.classList.toggle("bt-shot", o.shot !== false);
      if (o.look) applyLook(o.look);
      if (o.motion) setMotion(o.motion);
      if (o.band) setBandMode(o.band);
      if (o.scenario) setScenario(o.scenario);
      if (o.view) show(o.view, { silent: true, still: true });
      if (o.step != null) wiz.go(Number(o.step));
      // the moment right after the last reply: the done panel with the undo bar still on top
      if (o.act === "done") { var guard = 0; while (remaining().length && guard++ < 20) act("approved"); hideSheet(); }
      if (o.act === "toast") act("approved");
      if (o.act === "sheet") { cur = remaining().indexOf(4); act("approved"); }
      if (o.act === "menu") { panel.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); }
      if (o.act === "report") openReport(null);
      if (o.act === "filter-none") { search.value = "pizza"; filterReviews(); }
      if (o.act === "auto") { var sw = bind("sw-auto"); sw.setAttribute("aria-checked", "true"); bind("auto-box").hidden = false; bind("auto-off").hidden = true; autoMin.value = "2"; autoMin.dispatchEvent(new Event("change")); }
      if (o.act === "details") maFold.open = true;
      if (o.act === "period") { setMore(true); pickRange("7"); }
      if (o.act === "filters") { setFilters(true); $(".more-filters").open = true; $$(".rv-fold").slice(0, 3).forEach(function (d) { d.open = true; }); }
      if (o.act === "rewrite") {
        rwBox.open = true;
        var id = remaining()[cur];
        before[id] = texts[id]; texts[id] = Q[id].rw.rovidebb; editor.removeAttribute("data-for"); renderQueue();
      }
      if (o.act === "edit") editor.focus({ preventScroll: true });
      // a picture shows the state, not where a script left the focus ring; the edit state keeps the cursor
      if (o.act !== "edit") {
        if (o.shot !== false && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        window.scrollTo(0, 0);
      }
      if (view === "kimutatasok") drawCharts();
      return ready();
    },
    check: function () {
      html.classList.add("bt-measure");
      return ready().then(function () { var o = check(); html.classList.remove("bt-measure"); return o; });
    },
    state: function () {
      var a = document.activeElement;
      return {
        look: look, view: view, scenario: scenario, remaining: remaining().length, handled: handled.length,
        announce: live.textContent, focus: a ? a.id || a.getAttribute("data-bind") || a.tagName.toLowerCase() : "",
        band: html.getAttribute("data-band"), motion: html.getAttribute("data-motion")
      };
    }
  };

  /* ================================================================ start */
  resetQueue(scenario);
  bind("breakdown").open = true;
  syncMaFold();
  syncRewrite();
  renderQueue();
  renderInsights();
  syncAppearanceCard();
  setChip("all");
  var start = window.BT_START || {};
  if (start.view === "elso") wiz.go(start.step || 1); else wiz.render();
  show(VIEWS.indexOf(start.view) >= 0 ? start.view : "ma", { silent: true });
  if (framed) tell({ type: "bt-ready" });
})();
