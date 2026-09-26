/* lab.js, v0.1.0, 2026-09-26. The lab page: the controls, the address, and the three frames.

   One state (js/appearance.js). The controls change it; so can the Megjelenés card inside any
   frame, which reports back. Every change goes to every frame by postMessage and into the
   address, so the combination on screen is always a link. */
(function () {
  "use strict";
  var A = window.BT_APPEARANCE, R = A.R;
  var VIEWS = ["ma", "ertekelesek", "valaszok", "kimutatasok", "beallitasok"];
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var raw = A.parseHash(location.hash);
  var state = A.normalise(raw);
  var view = VIEWS.indexOf(raw.view) >= 0 ? raw.view : "ma";
  var frames = { phone: $('[data-frame="phone"]'), desk: $('[data-frame="desk"]'), settings: $('[data-frame="settings"]') };
  frames.phone.src = "app.html#" + A.toHash(state, view);
  frames.desk.src = "app.html#" + A.toHash(state, "ma");
  frames.settings.src = "app.html#" + A.toHash(state, "beallitasok");

  function post(frame, msg) { try { frame.contentWindow.postMessage(msg, "*"); } catch (e) { /* still loading: it read the address */ } }
  function broadcast() { Object.keys(frames).forEach(function (k) { post(frames[k], { type: "bt-apply", state: state }); }); }
  function writeHash() { history.replaceState(null, "", "#" + A.toHash(state, view)); }
  function set(next) { state = A.normalise(next, state); render(); broadcast(); writeHash(); }

  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>';
  var built = null;
  function build() {
    var st = R.styles[state.style];
    $('[data-ctl="style"]').innerHTML = A.STYLES.map(function (k) {
      return '<button type="button" class="opt opt-style" data-style="' + k + '" aria-pressed="false">' + esc(R.styles[k].name) + "<small>" + esc(R.styles[k].blurb) + "</small></button>";
    }).join("");
    $('[data-ctl="colour"]').innerHTML = st.sets.map(function (id) {
      var s = R.sets[id], mark = id === st.pair.light ? '<span class="mark">' + SUN + "nappal</span>" : id === st.pair.dark ? '<span class="mark">' + MOON + "éjjel</span>" : "";
      return '<button type="button" class="opt" data-colour="' + id + '" aria-pressed="false"><span class="dots" aria-hidden="true">' +
        s.swatch.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span>" + esc(s.name) + mark + "</button>";
    }).join("");
    $('[data-ctl="font"]').innerHTML = st.fonts.map(function (f) {
      return '<button type="button" class="opt opt-font" data-font="' + f + '" aria-pressed="false">' + esc(R.fonts[f].name) + "</button>";
    }).join("");
    var g = R.styles.uveg.glass;
    var blur = $('[data-slider="blur"]'), tint = $('[data-slider="tint"]');
    blur.min = g.blurRange[0]; blur.max = g.blurRange[1];
    tint.min = g.tintRange[0]; tint.max = g.tintRange[1];
    built = state.style;
  }
  function pressed(sel, attr, value) { $$(sel).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)); }); }
  function render() {
    if (built !== state.style) build();
    pressed('[data-ctl="style"] .opt', "data-style", state.style);
    pressed('[data-ctl="colour"] .opt', "data-colour", state.colour);
    pressed('[data-ctl="font"] .opt', "data-font", state.font);
    pressed('[data-ctl="scheme"] .opt', "data-scheme", A.schemeOf(state));
    pressed('[data-row="glass"] .opt', "data-glass", state.glass);
    pressed('[data-ctl="view"] .opt', "data-view", view);
    $('[data-row="glass"]').hidden = state.style !== "uveg";
    ["blur", "tint"].forEach(function (k) {
      var inp = $('[data-slider="' + k + '"]');
      inp.value = state[k];
      inp.disabled = state.glass === "off";
      $('[data-out="' + k + '"]').textContent = state[k];
    });
    $("[data-now]").innerHTML = "Most: <b>" + esc(A.describe(state)) + "</b>";
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-style") && b.closest('[data-ctl="style"]')) set(A.withStyle(state, b.getAttribute("data-style")));
    else if (b.hasAttribute("data-colour")) set(Object.assign({}, state, { colour: b.getAttribute("data-colour") }));
    else if (b.hasAttribute("data-font") && b.closest('[data-ctl="font"]')) set(Object.assign({}, state, { font: b.getAttribute("data-font") }));
    else if (b.hasAttribute("data-scheme")) set(A.withScheme(state, b.getAttribute("data-scheme")));
    else if (b.hasAttribute("data-glass")) set(Object.assign({}, state, { glass: b.getAttribute("data-glass") }));
    else if (b.hasAttribute("data-view")) { view = b.getAttribute("data-view"); post(frames.phone, { type: "bt-view", view: view }); render(); writeHash(); }
    else if (b.getAttribute("data-act") === "reset") set(A.normalise(R.defaults, R.defaults));
    else if (b.getAttribute("data-act") === "copy") copyLink();
  });
  document.addEventListener("input", function (e) {
    var k = e.target.getAttribute("data-slider");
    if (!k) return;
    var patch = {}; patch[k] = Number(e.target.value);
    set(Object.assign({}, state, patch));
  });
  function copyLink() {
    var done = function (ok) { $("[data-now]").textContent = ok ? "Kimásolva. A link ezt a változatot nyitja meg." : "A link a címsorban van, onnan kimásolhatod."; };
    try { navigator.clipboard.writeText(location.href).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  // The Megjelenés card inside a frame changed something, or the phone moved to another screen.
  window.addEventListener("message", function (e) {
    var from = null;
    Object.keys(frames).forEach(function (k) { if (frames[k].contentWindow === e.source) from = k; });
    if (!from) return;
    var d = e.data || {};
    if (d.type === "bt-changed") set(d.state);
    if (d.type === "bt-view-changed" && from === "phone") { view = d.view; render(); writeHash(); }
    if (d.type === "bt-size" && from === "settings" && d.view === "beallitasok") {
      var h = Math.max(900, Math.min(4000, Number(d.h) || 0)), box = frames.settings.parentNode;
      frames.settings.style.height = h + "px";
      box.setAttribute("data-h", h);
      fit(box);
    }
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);

  // The desktop frames are real 1440 px pages, scaled to the column.
  function fit(box) {
    var k = box.clientWidth / Number(box.getAttribute("data-w"));
    box.style.setProperty("--k", k.toFixed(4));
    box.style.height = Math.round(Number(box.getAttribute("data-h")) * k) + "px";
  }
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (en) { fit(en.target); }); }) : null;
  $$(".desk").forEach(function (box) { fit(box); if (ro) ro.observe(box); });

  render();
  writeHash();
})();
