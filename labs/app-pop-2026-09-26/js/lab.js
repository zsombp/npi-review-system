/* lab.js, v0.2.0, 2026-09-26 (v0.1.0 the same day). The lab page: its controls, its address and its frames.

   One state: { set, font, view, scenario, band, motion }. The band is the operator's call: still (the
   default), moving, or none. The controls change it, so can the Megjelenés
   card inside a frame (it reports back), and the phone frame reports the screen it moved to. Every
   change goes to every frame by postMessage and into the address, so what is on screen is a link. */
(function () {
  "use strict";
  var R = window.BT_REGISTRY;
  var VIEWS = ["ma", "ertekelesek", "valaszok", "kimutatasok", "beallitasok", "ettermek", "elso"];
  var NAMES = { ma: "Ma", ertekelesek: "Értékelések", valaszok: "Válaszok", kimutatasok: "Kimutatások", beallitasok: "Beállítások", ettermek: "Éttermek", elso: "Első lépések" };
  var SCEN = { reggel: "Reggel, 6 válasz vár", kesz: "Mára kész", elso: "Első nap", ures: "Üres fiók" };
  var SECMAP = { ma: "ma", rev: "rev", rep: "rep", ins: "ins", set: "set", ven: "ven", start: "start" };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function parse(h) {
    var o = {};
    String(h || "").replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    return o;
  }
  var BANDS = { still: "áll", move: "mozog", off: "nincs" };
  var DEF = { set: "pop-citrom", font: R.defaultFont, view: "ma", scenario: "reggel", band: "still", motion: "full" };
  var h = parse(location.hash);
  var state = {
    set: R.sets["pop-" + h.c] ? "pop-" + h.c : DEF.set,
    font: R.fonts[h.f] ? h.f : DEF.font,
    view: VIEWS.indexOf(h.v) >= 0 ? h.v : DEF.view,
    scenario: SCEN[h.st] ? h.st : DEF.scenario,
    band: BANDS[h.b] ? h.b : DEF.band,
    motion: h.m === "reduce" ? "reduce" : "full"
  };
  function hashOf(s, view) {
    return "c=" + R.sets[s.set].slug + "&f=" + s.font + "&v=" + (view || s.view) + "&st=" + s.scenario + (s.band !== "still" ? "&b=" + s.band : "") + (s.motion === "reduce" ? "&m=reduce" : "");
  }
  function lookOf(s) { return { palette: s.set, font: s.font, auto: false }; }

  /* ---- controls */
  $('[data-ctl="set"]').innerHTML = R.order.map(function (id) {
    var st = R.sets[id];
    return '<button type="button" class="opt" data-set="' + id + '" aria-pressed="false"><span class="sw4" aria-hidden="true">' +
      st.blocks.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span>" + esc(st.name) + "</button>";
  }).join("");
  $('[data-ctl="font"]').innerHTML = R.fontOrder.map(function (f) {
    return '<button type="button" class="opt opt-font" data-font="' + f + '" aria-pressed="false">' + esc(R.fonts[f].name) + "</button>";
  }).join("");
  $$('[data-ctl="font"] [data-font]').forEach(function (b) { b.setAttribute("data-font", b.getAttribute("data-font")); });
  function paint() {
    var press = function (sel, attr, v) { $$(sel).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute(attr) === v)); }); };
    press('[data-ctl="set"] .opt', "data-set", state.set);
    press('[data-ctl="font"] .opt', "data-font", state.font);
    press('[data-ctl="view"] .opt', "data-view", state.view);
    press('[data-ctl="scenario"] .opt', "data-scenario", state.scenario);
    press('[data-ctl="band"] .opt', "data-band", state.band);
    press('[data-ctl="motion"] .opt', "data-motion", state.motion);
    var sec = R.sets[state.set].sec;
    $$(".dot[data-sec]").forEach(function (d) { d.style.background = sec[SECMAP[d.getAttribute("data-sec")]]; });
    $("[data-now]").innerHTML = "Most: <b>" + esc(R.sets[state.set].name + ", " + R.fonts[state.font].name + ", " + NAMES[state.view] + ", " + SCEN[state.scenario].toLowerCase() + ", szalag: " + BANDS[state.band]) + "</b>";
  }

  /* ---- frames */
  var frames = { phone: $('[data-frame="phone"]'), desk: $('[data-frame="desk"]') };
  frames.phone.src = "app.html#" + hashOf(state);
  frames.desk.src = "app.html#" + hashOf(state);
  var gallery = $("[data-gallery]"), gal = [];
  VIEWS.forEach(function (v) {
    var item = document.createElement("div");
    item.className = "gal-item";
    item.innerHTML = '<div class="gal-frame"><iframe title="' + esc(NAMES[v]) + ', kicsinyítve" tabindex="-1" aria-hidden="true" loading="lazy"></iframe></div>' +
      '<button type="button" class="opt gal-open" data-view="' + v + '">' + esc(NAMES[v]) + "</button>";
    gallery.appendChild(item);
    var f = $("iframe", item);
    f.src = "app.html#" + hashOf(v === "elso" ? Object.assign({}, state, { scenario: "ures" }) : state, v);
    gal.push({ view: v, frame: f });
  });
  function post(frame, msg) { try { frame.contentWindow.postMessage(msg, "*"); } catch (e) { /* still loading: it read the address */ } }
  function broadcast(what) {
    var msg = { type: "bt-apply", look: lookOf(state), motion: state.motion, band: state.band };
    if (what.scenario) msg.scenario = state.scenario;
    [frames.phone, frames.desk].forEach(function (f) { post(f, Object.assign({}, msg, what.view ? { view: state.view } : {})); });
    gal.forEach(function (g) {
      var m = Object.assign({}, msg, { view: g.view });
      if (g.view === "elso") m.scenario = "ures";
      else if (what.scenario) m.scenario = state.scenario;
      post(g.frame, m);
    });
  }
  function writeHash() { try { history.replaceState(null, "", "#" + hashOf(state)); } catch (e) { /* file: or sandboxed */ } }
  function set(patch, what) { Object.assign(state, patch); paint(); broadcast(what || {}); writeHash(); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-set")) set({ set: b.getAttribute("data-set") });
    else if (b.closest('[data-ctl="font"]')) set({ font: b.getAttribute("data-font") });
    else if (b.hasAttribute("data-view")) {
      var v = b.getAttribute("data-view");
      // the first-run steps are a story of an account that has nothing yet
      if (v === "elso" && (state.scenario === "reggel" || state.scenario === "kesz")) set({ view: v, scenario: "ures" }, { view: true, scenario: true });
      else set({ view: v }, { view: true });
      if (b.classList.contains("gal-open")) $(".row-top").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    else if (b.hasAttribute("data-scenario")) set({ scenario: b.getAttribute("data-scenario") }, { scenario: true, view: true });
    else if (b.hasAttribute("data-band")) set({ band: b.getAttribute("data-band") });
    else if (b.hasAttribute("data-motion")) set({ motion: b.getAttribute("data-motion") });
    else if (b.getAttribute("data-act") === "reset") set(Object.assign({}, DEF), { scenario: true, view: true });
    else if (b.getAttribute("data-act") === "copy") {
      var done = function (ok) { $("[data-now]").textContent = ok ? "Kimásolva. A link ezt a változatot nyitja meg." : "A link a címsorban van, onnan kimásolhatod."; };
      try { navigator.clipboard.writeText(location.href).then(function () { done(true); }, function () { done(false); }); } catch (err) { done(false); }
    }
  });

  /* what the frames report: a screen changed in the phone, the look changed in a Settings card */
  window.addEventListener("message", function (e) {
    var from = null;
    Object.keys(frames).forEach(function (k) { if (frames[k].contentWindow === e.source) from = k; });
    var d = e.data || {};
    if (!from) return;
    if (d.type === "bt-view-changed" && from === "phone") { state.view = d.view; paint(); writeHash(); }
    if (d.type === "bt-look-changed" && d.look) {
      var p = d.look.palette === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? R.pair.dark : R.pair.light) : d.look.palette;
      set({ set: p, font: d.look.font });
    }
    if (d.type === "bt-scenario-changed" && d.scenario) { state.scenario = d.scenario; paint(); writeHash(); }
  });

  /* the desktop frame is a real 1440 px page, scaled to its column */
  function fit(box) {
    var k = box.clientWidth / Number(box.getAttribute("data-w"));
    box.style.setProperty("--k", k.toFixed(4));
    box.style.height = Math.round(Number(box.getAttribute("data-h")) * k) + "px";
  }
  var desk = $(".desk");
  fit(desk);
  if (window.ResizeObserver) new ResizeObserver(function () { fit(desk); }).observe(desk);

  paint();
  writeHash();
})();
