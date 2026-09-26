/* app.js, v0.1.0, 2026-09-26. Appearance v2 lab: the app mock's behaviour.

   Views, the phone menu, the period switches, the review filters, the reply queue with an
   eight-second undo, the two charts, and the new Megjelenés card, whose three steps change the
   appearance live. Inside the lab the page is a frame: it takes the appearance from the lab by
   postMessage and reports changes made in its own Settings card back. Standalone it keeps the
   state in its own hash. window.BT is what matrix.mjs drives. Nothing leaves the page. */
(function () {
  "use strict";
  var A = window.BT_APPEARANCE, R = A.R;
  var html = document.documentElement;
  var search = new URLSearchParams(location.search);
  var MINI = search.has("mini"), NOMINI = search.has("nomini");
  var framed = window.parent !== window;
  var state = window.BT_STATE;
  var view = window.BT_VIEW;
  var compact = window.matchMedia("(max-width: 800px)");
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tell(msg) { if (framed) try { window.parent.postMessage(msg, "*"); } catch (e) { /* not in a frame we know */ } }

  /* ---------------------------------------------------------------- appearance */
  function applyState(next, how) {
    state = A.normalise(next, state);
    A.apply(state);
    if (MINI) return;
    renderCard();
    pushMinis();
    if (how && how.announce) live(A.describe(state));
    if (how && how.local) {
      if (framed) tell({ type: "bt-changed", state: state });
      else history.replaceState(null, "", "#" + A.toHash(state, view));
    }
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var d = e.data || {};
    if (d.type === "bt-apply") applyState(d.state);
    if (d.type === "bt-view" && !MINI) show(d.view, { silent: true });
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (state.colour === "auto") applyState(state);
  });
  if (MINI) { window.BT = { ready: ready }; return; }
  window.addEventListener("hashchange", function () {
    if (framed) return;
    var raw = A.parseHash(location.hash);
    applyState({ style: raw.style, colour: raw.colour, font: raw.font, glass: raw.glass, blur: raw.blur, tint: raw.tint });
    if (raw.view) show(raw.view, { silent: true });
  });

  /* ---------------------------------------------------------------- views and the shell */
  var TITLES = { ma: "Ma", ertekelesek: "Értékelések", valaszok: "Válaszok", kimutatasok: "Kimutatások", beallitasok: "Beállítások" };
  function show(v, how) {
    if (!TITLES[v]) v = "ma";
    view = v;
    $$(".view").forEach(function (s) { s.hidden = s.getAttribute("data-view") !== v; });
    $$("[data-go]").forEach(function (a) {
      var on = a.getAttribute("data-go") === v && a.classList.contains("tab") || (v === "beallitasok" && a.getAttribute("data-go") === v);
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = TITLES[v] + " · BistroTech";
    closeMenu();
    window.scrollTo(0, 0);
    if (v === "kimutatasok") drawCharts();
    if (v === "beallitasok") ensureMinis();
    if (!(how && how.silent)) {
      if (framed) tell({ type: "bt-view-changed", view: v });
      else history.replaceState(null, "", "#" + A.toHash(state, v));
    }
  }
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); show(go.getAttribute("data-go")); $("#main").focus({ preventScroll: true }); return; }
    if (e.target.closest('a[href="#"]')) e.preventDefault();
  });
  var menuBtn = $(".menu-btn"), panel = $("#app-menu");
  function closeMenu() { panel.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    var open = panel.hidden;
    panel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) { var f = panel.querySelector("a, button, select"); if (f) f.focus(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { closeMenu(); menuBtn.focus(); }
  });
  var tog = $(".nav-group-toggle"), togList = $("#g-data-list");
  tog.addEventListener("click", function () {
    var open = togList.hidden;
    togList.hidden = !open;
    tog.setAttribute("aria-expanded", String(open));
    tog.querySelector(".nav-group-caret").textContent = open ? "−" : "+";
  });
  function syncCompact() { var d = $(".full-breakdown"); if (d) d.open = !compact.matches; }
  compact.addEventListener("change", syncCompact);
  syncCompact();

  // a segmented control: the pressed button is the primary one, as in the real app
  function press(group, btn) {
    $$("button", group).forEach(function (b) {
      var on = b === btn;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("secondary", !on);
    });
  }

  /* ---------------------------------------------------------------- Ma: the period card */
  var GOOGLE = { "Példa Bisztró": ["4,6", "1284"], "Minta Étterem": ["4,4", "612"], "Teszt Kávézó": ["4,7", "238"] };
  var RANGES = {
    today: { n: 5, avg: "4,60", five: 3, serious: 0, unans: 0,
      v: [["Példa Bisztró", 2, [1, 1, 0, 0, 0], "4,50"], ["Minta Étterem", 2, [2, 0, 0, 0, 0], "5,00"], ["Teszt Kávézó", 1, [0, 1, 0, 0, 0], "4,00"]] },
    "7": { n: 34, avg: "4,50", five: 24, serious: 2, unans: 4,
      v: [["Példa Bisztró", 15, [11, 2, 1, 1, 0], "4,53"], ["Minta Étterem", 12, [8, 2, 1, 0, 1], "4,33"], ["Teszt Kávézó", 7, [5, 2, 0, 0, 0], "4,71"]] },
    "30": { n: 146, avg: "4,53", five: 104, serious: 7, unans: 16,
      v: [["Példa Bisztró", 62, [44, 10, 4, 2, 2], "4,48"], ["Minta Étterem", 54, [38, 9, 4, 2, 1], "4,50"], ["Teszt Kávézó", 30, [22, 6, 2, 0, 0], "4,67"]] }
  };
  function setText(bind, text) { var el = $('[data-bind="' + bind + '"]'); if (el) el.textContent = text; }
  function renderRange(key) {
    var d = RANGES[key];
    setText("new", d.n); setText("avg", d.avg); setText("five", d.five); setText("serious", d.serious); setText("unans", d.unans);
    $('[data-bind="five"]').classList.toggle("pos", d.five > 0);
    $('[data-bind="serious"]').classList.toggle("neg", d.serious > 0);
    $('[data-bind="unans"]').classList.toggle("neg", d.unans > 0);
    setText("answer", d.n + " új értékelés érkezett ebben az időszakban. Az átlaguk " + d.avg + ".");
    var rows = d.v.slice().sort(function (a, b) { return (b[2][3] + b[2][4]) - (a[2][3] + a[2][4]) || b[1] - a[1]; });
    $('[data-bind="venue-rows"]').innerHTML = rows.map(function (r) {
      var s = r[2][3] + r[2][4];
      return '<li><span class="venue-name">' + esc(r[0]) + '</span><span class="muted small">' + r[1] + " új · átlag " + r[3] + '</span><span class="tag small ' + (s ? "neg" : "pos") + '">' + (s ? s + " súlyos" : "rendben") + "</span></li>";
    }).join("");
    var table = d.v.slice().sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], "hu"); });
    $('[data-bind="venue-table"]').innerHTML = table.map(function (r) {
      var st = r[2], neg = st[3] + st[4] > 0, g = GOOGLE[r[0]];
      return "<tr" + (r[1] ? "" : ' class="quiet"') + "><td>" + (neg ? '<span class="tag small neg" title="1 vagy 2 csillagos értékelés érkezett az időszakban">Negatív</span> ' : "") + esc(r[0]) + "</td>" +
        '<td class="num"><strong>' + r[1] + '</strong></td><td class="num"><strong' + (st[0] ? ' class="pos"' : "") + ">" + st[0] + "</strong></td>" +
        '<td class="num">' + st[1] + '</td><td class="num">' + st[2] + '</td>' +
        '<td class="num"><strong' + (st[3] ? ' class="neg"' : "") + ">" + st[3] + '</strong></td><td class="num"><strong' + (st[4] ? ' class="neg"' : "") + ">" + st[4] + "</strong></td>" +
        '<td class="num">' + r[3] + '</td><td class="num">' + g[0] + '</td><td class="num">' + g[1] + "</td></tr>";
    }).join("");
    setText("with", d.v.filter(function (r) { return r[1] > 0; }).length + " / " + d.v.length);
  }
  $$(".period-card .seg button").forEach(function (b) {
    b.addEventListener("click", function () { press(b.parentNode, b); renderRange(b.getAttribute("data-range")); });
  });

  /* ---------------------------------------------------------------- Értékelések: filters */
  var COUNTS = { all: 2134, waiting: 23, serious: 142, five: 1580 };
  var chip = "all";
  function filterReviews() {
    var q = ($('[data-bind="search"]').value || "").trim().toLowerCase();
    var venue = $('[data-bind="venue"]').value;
    var shown = 0;
    $$(".review-list .review-card").forEach(function (c) {
      var r = Number(c.getAttribute("data-rating")), open = c.getAttribute("data-open") === "1";
      var ok = chip === "all" || (chip === "waiting" && open && r <= 3) || (chip === "serious" && r <= 2) || (chip === "five" && r === 5);
      if (venue && c.getAttribute("data-venue") !== venue) ok = false;
      if (q && c.textContent.toLowerCase().indexOf(q) < 0) ok = false;
      c.hidden = !ok;
      if (ok) shown++;
    });
    setText("count", (q || venue ? shown : COUNTS[chip]) + " találat");
  }
  $$('[data-chip]').forEach(function (b) {
    b.addEventListener("click", function () {
      chip = b.getAttribute("data-chip");
      $$('[data-chip]').forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      filterReviews();
    });
  });
  $('[data-bind="search"]').addEventListener("input", filterReviews);
  $('[data-bind="venue"]').addEventListener("change", filterReviews);

  /* ---------------------------------------------------------------- Válaszok: the queue */
  var Q = $$(".q-data [data-q]").map(function (el) {
    return { id: Number(el.getAttribute("data-q")), venue: el.getAttribute("data-venue"), rating: Number(el.getAttribute("data-rating")),
      meta: el.getAttribute("data-meta"), lang: el.getAttribute("data-lang") || "", body: $(".q-body", el).textContent, draft: $(".q-draft", el).textContent };
  });
  var RW = {};
  $$(".q-data [data-rw]").forEach(function (p) { RW[p.getAttribute("data-rw")] = p.textContent; });
  var queue = Q.map(function (q) { return q.id; }), cur = 0, last = null, toastTimer = 0;
  function starsHTML(n) {
    var g = "";
    for (var i = 0; i < 5; i++) g += i < n ? '<svg class="star"><use href="#s-full"/></svg>' : '<svg class="star o"><use href="#s-empty"/></svg>';
    return '<span class="star-glyphs" aria-hidden="true">' + g + '</span><span class="stars-num">' + n + "/5</span>";
  }
  function renderQueue() {
    var n = queue.length;
    $$(".tab-badge").forEach(function (b) { b.setAttribute("data-n", n); b.setAttribute("aria-label", n + " válasz vár rád"); b.hidden = n === 0; });
    setText("pending", n ? "Jóváhagyásra vár: " + n + ". A jóváhagyott választ mi tesszük ki a Google-re. A kihagyott értékelés válasz nélkül marad." : "");
    $('[data-bind="queue-list"]').setAttribute("aria-label", "Jóváhagyásra vár: " + n);
    $$(".queue-item").forEach(function (b) {
      var id = Number(b.getAttribute("data-q")), at = queue.indexOf(id);
      b.parentNode.hidden = at < 0;
      b.classList.toggle("on", at === cur);
      if (at === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    $(".queue").hidden = n === 0;
    $(".queue-done").hidden = n > 0;
    // the Ma screen says the same count
    var head = $(".home-head");
    if (n) head.innerHTML = "Ma <mark class=\"hl\">" + n + " válasz</mark> vár rád.";
    else head.textContent = "Ma nincs teendőd.";
    head.classList.toggle("todo-head", n > 0);
    $(".hcard-todo").hidden = n === 0;
    var more = $(".hcard-todo .hcard-actions .muted");
    if (more) more.textContent = n > 1 ? "Még " + (n - 1) + " válasz vár rád." : "";
    if (!n) return;
    var q = Q[queue[cur]];
    setText("q-pos", (cur + 1) + " / " + n);
    setText("q-venue", q.venue);
    $('[data-bind="q-stars"]').innerHTML = starsHTML(q.rating);
    setText("q-meta", q.meta);
    var body = $('[data-bind="q-body"]');
    body.textContent = q.body;
    if (q.lang) body.setAttribute("lang", q.lang); else body.removeAttribute("lang");
    var ta = $('[data-bind="q-draft"]');
    ta.value = q.draft;
    if (q.lang) ta.setAttribute("lang", q.lang); else ta.removeAttribute("lang");
    $$("[data-rw]", $(".rewrite-row")).forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
    $('[data-act="prev"]').disabled = cur <= 0;
    $('[data-act="next"]').disabled = cur >= n - 1;
  }
  function act(kind) {
    if (!queue.length) return;
    last = { id: queue[cur], at: cur, kind: kind };
    queue.splice(cur, 1);
    if (cur >= queue.length) cur = Math.max(0, queue.length - 1);
    renderQueue();
    toast(kind === "approve" ? "Jóváhagyva." : "Kihagyva.");
  }
  function undo() {
    if (!last) return;
    queue.splice(last.at, 0, last.id);
    cur = last.at;
    last = null;
    hideToast();
    renderQueue();
  }
  function step(d) { cur = Math.max(0, Math.min(queue.length - 1, cur + d)); renderQueue(); }
  $('[data-act="approve"]').addEventListener("click", function () { act("approve"); });
  $('[data-act="skip"]').addEventListener("click", function () { act("skip"); });
  $('[data-act="prev"]').addEventListener("click", function () { step(-1); });
  $('[data-act="next"]').addEventListener("click", function () { step(1); });
  $$(".queue-item").forEach(function (b) {
    b.addEventListener("click", function () { var at = queue.indexOf(Number(b.getAttribute("data-q"))); if (at >= 0) { cur = at; renderQueue(); } });
  });
  // The rewrite chips swap in the copy deck's pre-written variants for the first reply; the
  // product asks the model, and a lab must not pretend to, so the other replies only show the press.
  $$("[data-rw]", $(".rewrite-row")).forEach(function (c) {
    c.addEventListener("click", function () {
      $$("[data-rw]", $(".rewrite-row")).forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
      if (queue[cur] === 0 && RW[c.getAttribute("data-rw")]) $('[data-bind="q-draft"]').value = RW[c.getAttribute("data-rw")];
    });
  });
  var toastEl = $(".toast");
  function toast(msg) {
    setText("toast-msg", msg);
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 8000);
  }
  function hideToast() { toastEl.hidden = true; clearTimeout(toastTimer); }
  $('[data-act="undo"]').addEventListener("click", undo);
  document.addEventListener("keydown", function (e) {
    if (view !== "valaszok" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select")) return;
    var k = e.key.toLowerCase();
    if (k === "a") act("approve"); else if (k === "s") act("skip"); else if (k === "j") step(1); else if (k === "k") step(-1);
    else if (k === "u") undo(); else if (k === "e") { e.preventDefault(); $('[data-bind="q-draft"]').focus(); }
  });

  /* ---------------------------------------------------------------- Kimutatások: data and charts */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var DAYS = 90, TODAY = Date.UTC(2026, 8, 26);
  var MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
  function dayLabel(i) { var d = new Date(TODAY - (DAYS - 1 - i) * 864e5); return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + "."; }
  // Google rating per venue, one decimal, 90 days. The 30-day window opens one step below today
  // for Példa Bisztró and Teszt Kávézó and level for Minta Étterem (the Változás column).
  function ratingSeries(seed, lo, hi, open30, today) {
    var r = rng(seed), v = Math.round((lo + hi) * 5) / 10, out = [];
    for (var i = 0; i < DAYS; i++) {
      var x = r();
      if (x < 0.18 && v < hi - 1e-9) v = Math.round((v + 0.1) * 10) / 10;
      else if (x > 0.82 && v > lo + 1e-9) v = Math.round((v - 0.1) * 10) / 10;
      out.push(v);
    }
    out[DAYS - 30] = open30; out[DAYS - 1] = today;
    return out;
  }
  var SERIES = [
    { name: "Példa Bisztró", pts: ratingSeries(11, 4.5, 4.7, 4.5, 4.6) },
    { name: "Minta Étterem", pts: ratingSeries(23, 4.3, 4.5, 4.4, 4.4) },
    { name: "Teszt Kávézó", pts: ratingSeries(37, 4.6, 4.8, 4.6, 4.7) }
  ];
  // New reviews per day: the last 7 days add up to 34, the last 30 to 146, all 90 to 431.
  var NEWS = (function () {
    var r = rng(5), out = [];
    function fill(n, total) {
      var a = [];
      for (var i = 0; i < n; i++) a.push(2 + Math.floor(r() * 6));
      var s = a.reduce(function (x, y) { return x + y; }, 0), k = 0;
      while (s !== total && k < 10000) { var j = Math.floor(r() * n); if (s < total && a[j] < 9) { a[j]++; s++; } else if (s > total && a[j] > 1) { a[j]--; s--; } k++; }
      return a;
    }
    out = out.concat(fill(60, 431 - 146), fill(23, 146 - 34), [4, 6, 3, 5, 6, 5, 5]);
    return out;
  })();
  var PERIODS = {
    "7": { n: 34, avg: "4,50", low: "6%", unans: 4, cov: "100%" },
    "30": { n: 146, avg: "4,53", low: "5%", unans: 16, cov: "100%" },
    "90": { n: 431, avg: "4,51", low: "5%", unans: 41, cov: "99%" }
  };
  var period = 30, hiddenSeries = {};
  function fmt1(v) { return v.toFixed(1).replace(".", ","); }
  function xTicks(n, w) {
    if (n <= 1) return [0];
    var max = Math.max(2, Math.min(8, Math.floor(w / 90))), step = Math.max(1, Math.ceil((n - 1) / (max - 1))), out = [];
    for (var i = 0; i < n - 1; i += step) if (n - 1 - i >= step / 2) out.push(i);
    out.push(n - 1);
    return out;
  }
  function drawRating() {
    var wrap = $('[data-chart="rating"]');
    if (!wrap || wrap.closest("[hidden]")) return;
    var w = Math.max(260, Math.floor(wrap.clientWidth)), H = 240, ML = 34, MR = 14, MT = 12, MB = 26, n = period;
    var vis = SERIES.map(function (s, i) { return { i: i, pts: s.pts.slice(DAYS - n) }; }).filter(function (s) { return !hiddenSeries[s.i]; });
    var lo = 5, hi = 1;
    vis.forEach(function (s) { s.pts.forEach(function (p) { lo = Math.min(lo, p); hi = Math.max(hi, p); }); });
    if (!vis.length) { lo = 4.4; hi = 4.8; }
    lo = Math.round((lo - 0.1) * 10) / 10; hi = Math.round((hi + 0.1) * 10) / 10;
    var iw = w - ML - MR, ih = H - MT - MB;
    function x(i) { return ML + (n > 1 ? i / (n - 1) * iw : iw / 2); }
    function y(v) { return MT + (1 - (v - lo) / (hi - lo)) * ih; }
    var g = [];
    for (var v = lo; v <= hi + 1e-9; v = Math.round((v + 0.1) * 10) / 10) {
      g.push('<line class="axis" x1="' + ML + '" x2="' + (w - MR) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/><text x="' + (ML - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmt1(v) + "</text>");
    }
    xTicks(n, w).forEach(function (i, k, all) {
      var anchor = k === 0 ? "start" : k === all.length - 1 ? "end" : "middle";
      g.push('<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + dayLabel(DAYS - n + i) + "</text>");
    });
    vis.forEach(function (s) {
      var d = s.pts.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p).toFixed(1); }).join(" ");
      g.push('<path class="series" d="' + d + '" fill="none" stroke="var(--s' + (s.i + 1) + ')" stroke-linejoin="round" stroke-linecap="round"/>');
      g.push('<circle class="dot" cx="' + x(n - 1).toFixed(1) + '" cy="' + y(s.pts[n - 1]).toFixed(1) + '" r="4.5" fill="var(--s' + (s.i + 1) + ')"/>');
    });
    wrap.innerHTML = '<svg class="chart" viewBox="0 0 ' + w + " " + H + '" width="' + w + '" height="' + H + '" aria-hidden="true" focusable="false">' + g.join("") + "</svg>";
    var rows = [];
    for (var i = DAYS - 1; i >= DAYS - n; i--) rows.push("<tr><td>" + dayLabel(i) + "</td>" + SERIES.map(function (s) { return '<td class="num">' + fmt1(s.pts[i]) + "</td>"; }).join("") + "</tr>");
    $('[data-bind="rating-table"]').innerHTML = "<table><thead><tr><th>Nap</th>" + SERIES.map(function (s) { return '<th class="num">' + esc(s.name) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table>";
  }
  function drawNew() {
    var wrap = $('[data-chart="new"]');
    if (!wrap || wrap.closest("[hidden]")) return;
    var w = Math.max(260, Math.floor(wrap.clientWidth)), H = 200, ML = 28, MR = 8, MT = 10, MB = 26, n = period;
    var vals = NEWS.slice(DAYS - n), max = Math.max.apply(null, vals), top = Math.ceil(max / 2) * 2;
    var iw = w - ML - MR, ih = H - MT - MB, slot = iw / n, bw = Math.max(2, slot * 0.64);
    var g = [];
    for (var v = 0; v <= top; v += top > 8 ? 4 : 2) {
      var yy = MT + (1 - v / top) * ih;
      g.push('<line class="axis" x1="' + ML + '" x2="' + (w - MR) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text x="' + (ML - 6) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + v + "</text>");
    }
    vals.forEach(function (v, i) {
      var h = v / top * ih;
      g.push('<rect class="bar" x="' + (ML + i * slot + (slot - bw) / 2).toFixed(1) + '" y="' + (MT + ih - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="var(--s1)"/>');
    });
    xTicks(n, w).forEach(function (i, k, all) {
      var anchor = k === 0 ? "start" : k === all.length - 1 ? "end" : "middle";
      g.push('<text x="' + (ML + i * slot + slot / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + dayLabel(DAYS - n + i) + "</text>");
    });
    wrap.innerHTML = '<svg class="chart" viewBox="0 0 ' + w + " " + H + '" width="' + w + '" height="' + H + '" aria-hidden="true" focusable="false">' + g.join("") + "</svg>";
    wrap.setAttribute("aria-label", "Oszlopdiagram: új értékelések naponta az elmúlt " + n + " napban, összesen " + vals.reduce(function (a, b) { return a + b; }, 0) + ". A részletek a diagram alatti táblázatban is olvashatók.");
  }
  function drawCharts() { drawRating(); drawNew(); }
  function renderPeriod() {
    var d = PERIODS[period];
    setText("i-new", d.n); setText("i-avg", d.avg); setText("i-low", d.low); setText("i-unans", d.unans); setText("i-cov", d.cov);
    $('[data-chart="rating"]').setAttribute("aria-label", "Vonaldiagram: a Google-értékelés alakulása 3 étteremnél az elmúlt " + period + " napban. A részletek a diagram alatti táblázatban is olvashatók.");
    drawCharts();
  }
  $$(".insights .seg button").forEach(function (b) {
    b.addEventListener("click", function () { press(b.parentNode, b); period = Number(b.getAttribute("data-period")); renderPeriod(); });
  });
  $$('[data-bind="legend"] button').forEach(function (b) {
    b.addEventListener("click", function () {
      var i = b.getAttribute("data-series"), on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      hiddenSeries[i] = !on;
      drawRating();
    });
  });
  if (window.ResizeObserver) {
    var lastW = {};
    var cro = new ResizeObserver(function (entries) {
      entries.forEach(function (en) {
        var k = en.target.getAttribute("data-chart"), w = Math.floor(en.contentRect.width);
        if (w && w !== lastW[k]) { lastW[k] = w; if (k === "rating") drawRating(); else drawNew(); }
      });
    });
    $$("[data-chart]").forEach(function (c) { cro.observe(c); });
  }

  /* ---------------------------------------------------------------- Beállítások: the Megjelenés card */
  var card = $(".appearance");
  function article(word) { return /^[aáeéiíoóöőuúüű]/i.test(word) ? "az" : "a"; }
  function tick() { return '<span class="pick-tick" aria-hidden="true"><svg class="ic"><use href="#i-check"/></svg></span>'; }
  function colourPick(id) {
    var s = R.sets[id], pair = R.styles[s.style].pair;
    var tag = id === pair.light ? '<span class="pick-tag"><svg class="ic" aria-hidden="true"><use href="#i-sun"/></svg>nappal</span>'
      : id === pair.dark ? '<span class="pick-tag"><svg class="ic" aria-hidden="true"><use href="#i-moon"/></svg>éjjel</span>' : "";
    return '<label class="pick"><input type="radio" name="ap-colour" value="' + id + '">' + tick() +
      '<span class="swatch" data-palette="' + id + '" aria-hidden="true"><span class="sw-card"><span class="sw-line"></span><span class="sw-line short"></span><span class="sw-btn"></span></span><span class="sw-dots"><i></i><i></i><i></i></span></span>' +
      '<span class="pick-name">' + esc(s.name) + "</span>" + tag + "</label>";
  }
  function fontPick(f) {
    return '<label class="pick"><input type="radio" name="ap-font" value="' + f + '">' + tick() +
      '<span class="font-sample" data-font="' + f + '">Minden értékelés egy helyen</span><span class="pick-name">' + esc(R.fonts[f].name) + "</span></label>";
  }
  function renderCard() {
    if (!card) return;
    var st = R.styles[state.style];
    $$('input[name="ap-style"]', card).forEach(function (i) { i.checked = i.value === state.style; });
    var cBox = $('[data-bind="ap-colour"]'), fBox = $('[data-bind="ap-font"]');
    if (cBox.getAttribute("data-style") !== state.style) { cBox.innerHTML = st.sets.map(colourPick).join(""); cBox.setAttribute("data-style", state.style); }
    if (fBox.getAttribute("data-style") !== state.style) { fBox.innerHTML = st.fonts.map(fontPick).join(""); fBox.setAttribute("data-style", state.style); }
    var live = A.resolve(state);
    $$('input[name="ap-colour"]', cBox).forEach(function (i) {
      i.checked = state.colour !== "auto" && i.value === state.colour;
      i.closest(".pick").classList.toggle("is-live", state.colour === "auto" && i.value === live);
    });
    $$('input[name="ap-font"]', fBox).forEach(function (i) { i.checked = i.value === state.font; });
    var L = R.sets[st.pair.light].name, D = R.sets[st.pair.dark].name;
    setText("ap-pair", "Automatikusan nappal " + article(L) + " " + L + ", éjjel " + article(D) + " " + D + ".");
    var scheme = A.schemeOf(state), sBox = $('[data-bind="ap-scheme"]');
    press(sBox, $('[data-scheme="' + scheme + '"]', sBox));
    var gBox = $('[data-bind="ap-glass"]');
    gBox.hidden = state.style !== "uveg";
    press($(".seg", gBox), $('[data-glass="' + state.glass + '"]', gBox));
    ["blur", "tint"].forEach(function (k) {
      var inp = $('[data-slider="' + k + '"]', gBox);
      inp.value = state[k];
      inp.disabled = state.glass === "off";
      $('[data-out="' + k + '"]', gBox).textContent = state[k];
    });
  }
  function live(text) { setText("ap-live", text); }
  if (card) {
    card.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === "ap-style") applyState(A.withStyle(state, t.value), { local: true, announce: true });
      if (t.name === "ap-colour") applyState(Object.assign({}, state, { colour: t.value }), { local: true, announce: true });
      if (t.name === "ap-font") applyState(Object.assign({}, state, { font: t.value }), { local: true, announce: true });
    });
    card.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-scheme")) applyState(A.withScheme(state, b.getAttribute("data-scheme")), { local: true, announce: true });
      if (b.hasAttribute("data-glass")) applyState(Object.assign({}, state, { glass: b.getAttribute("data-glass") }), { local: true, announce: true });
      if (b.getAttribute("data-act") === "reset") applyState(A.normalise(R.defaults, R.defaults), { local: true, announce: true });
    });
    card.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-slider");
      if (!k) return;
      var patch = {}; patch[k] = Number(e.target.value);
      applyState(Object.assign({}, state, patch), { local: true });
    });
  }
  // The three style previews are the Ma screen itself, small: this page in ?mini, one per style.
  function miniState(style) {
    if (style === state.style) return state;
    var st = R.styles[style], dark = R.sets[A.resolve(state)].scheme === "dark";
    return { style: style, colour: st.pair[dark ? "dark" : "light"], font: st.defaultFont, glass: "chrome", blur: 18, tint: 55 };
  }
  var minisMade = false;
  function ensureMinis() {
    if (minisMade) return;
    minisMade = true;
    $$(".pick-mini").forEach(function (box) {
      if (NOMINI) { box.innerHTML = '<span class="mini-ph"></span>'; return; }
      var f = document.createElement("iframe");
      f.setAttribute("title", "");
      f.setAttribute("tabindex", "-1");
      f.setAttribute("aria-hidden", "true");
      f.src = "app.html?mini#" + A.toHash(A.normalise(miniState(box.getAttribute("data-mini"))));
      box.appendChild(f);
    });
  }
  function pushMinis() {
    $$(".pick-mini iframe").forEach(function (f) {
      try { f.contentWindow.postMessage({ type: "bt-apply", state: miniState(f.parentNode.getAttribute("data-mini")) }, "*"); } catch (e) { /* still loading */ }
    });
  }
  if (window.ResizeObserver) {
    var mro = new ResizeObserver(function (entries) {
      entries.forEach(function (en) { en.target.style.setProperty("--mini-scale", (en.contentRect.width / 390).toFixed(4)); });
    });
    $$(".pick-mini").forEach(function (b) { mro.observe(b); });
  }

  /* ---------------------------------------------------------------- the frame's height, for the lab */
  // The lab shows the Settings page whole, so it asks how tall the page's content is. Measured on
  // the shown view, not the document, which is never shorter than its frame.
  function reportSize() {
    if (!framed) return;
    var v = $(".view:not([hidden])");
    if (v) tell({ type: "bt-size", view: view, h: Math.ceil(v.getBoundingClientRect().bottom + window.scrollY + 40) });
  }
  if (framed && window.ResizeObserver) {
    var sro = new ResizeObserver(function () { reportSize(); });
    $$(".view").forEach(function (v) { sro.observe(v); });
  }

  /* ---------------------------------------------------------------- what matrix.mjs drives */
  function ready() {
    return document.fonts.ready
      .then(function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); })
      .then(function () { return document.fonts.ready; })
      .then(function () {
        var fam = getComputedStyle(html).getPropertyValue("--font-display").split(",")[0].replace(/["']/g, "").trim();
        var loaded = false;
        document.fonts.forEach(function (f) { if (f.family.replace(/["']/g, "") === fam && f.status === "loaded") loaded = true; });
        return { family: fam, loaded: loaded };
      });
  }
  function describeEl(el) {
    var cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
    var txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 36);
    return el.tagName.toLowerCase() + cls + (txt ? ' "' + txt + '"' : "");
  }
  function clipper(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible") return p;
    return null;
  }
  function ownText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function overflow() {
    var vw = html.clientWidth, out = [];
    if (html.scrollWidth > vw + 1) out.push("page " + html.scrollWidth + " px wide in a " + vw + " px window");
    [$(".view:not([hidden])"), compact.matches ? $(".topbar") : $(".side")].forEach(function (root) {
      if (!root) return;
      $$("*", root).forEach(function (el) {
        if (el.closest("[hidden], .sr-only, .q-data, svg, .pick-mini")) return;
        var cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        var r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        if (!clipper(el) && (r.right > vw + 1 || r.left < -1)) out.push(describeEl(el) + " runs to " + Math.round(r.right) + " px in a " + vw + " px window");
        // text wider than its own box: a long word in a heading, a clipped button label. Only
        // elements that hold text themselves, so a chip pressed into its shadow is not a finding.
        if (cs.display !== "inline" && cs.display !== "contents" && cs.overflowX === "visible" && cs.textOverflow !== "ellipsis" &&
            !/^(SELECT|INPUT|TEXTAREA|IFRAME|TABLE|TBODY|THEAD|TR)$/.test(el.tagName) && ownText(el) &&
            el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
          out.push(describeEl(el) + ": content " + el.scrollWidth + " px in a " + el.clientWidth + " px box");
        }
      });
    });
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  window.BT = {
    ready: ready,
    show: function (v) { show(v, { silent: true }); },
    check: function (v) {
      show(v, { silent: true });
      html.classList.add("bt-measure");
      return ready().then(function () { var out = overflow(); html.classList.remove("bt-measure"); return out; });
    },
    state: function () { return state; }
  };

  /* ---------------------------------------------------------------- start */
  renderQueue();
  renderCard();
  show(view, { silent: true });
})();
