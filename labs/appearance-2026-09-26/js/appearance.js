/* appearance.js, v0.1.0, 2026-09-26. Appearance v2 lab: the state, in one place.

   Used by the first-paint line in app.html's head, by the app mock (js/app.js) and by the lab
   page (js/lab.js), so the three can never disagree. It is what lib/appearance.ts v2 would be.

   State: { style, colour, font, glass, blur, tint }
     style   pop | uveg | klasszikus
     colour  "auto" or the id of a set of that style (pop-citrom, uveg-piac, ...)
     font    a font of that style (space-grotesk, nunito, newsreader, ...)
     glass, blur, tint   only read under Üveg
   URL hash: s=pop&c=citrom&f=space-grotesk (c is the set's short name or "auto"),
   plus g, b, t under Üveg and v for the screen shown. */
(function () {
  "use strict";
  var R = window.BT_REGISTRY;
  var STYLES = Object.keys(R.styles);

  function clamp(n, range, d) {
    var v = Number(n);
    return isFinite(v) ? Math.min(range[1], Math.max(range[0], Math.round(v))) : d;
  }
  function setBySlug(style, slug) {
    if (!slug) return null;
    if (slug === "auto") return "auto";
    var sets = R.styles[style].sets;
    for (var i = 0; i < sets.length; i++) if (R.sets[sets[i]].slug === slug || sets[i] === slug) return sets[i];
    return null;
  }
  function isDark() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; }
  }

  // Anything in, a valid state out. Missing parts come from `base` (the lab's start by default).
  function normalise(raw, base) {
    raw = raw || {};
    base = base || R.labStart || R.defaults;
    var style = STYLES.indexOf(raw.style) >= 0 ? raw.style : base.style;
    var st = R.styles[style];
    var colour = setBySlug(style, raw.colour) || setBySlug(style, base.colour) || st.pair.light;
    var font = st.fonts.indexOf(raw.font) >= 0 ? raw.font : (st.fonts.indexOf(base.font) >= 0 ? base.font : st.defaultFont);
    var g = (R.styles.uveg && R.styles.uveg.glass) || { tintRange: [40, 85], blurRange: [6, 32] };
    var glass = ["off", "chrome", "full"].indexOf(raw.glass) >= 0 ? raw.glass : R.defaults.glass;
    return {
      style: style, colour: colour, font: font, glass: glass,
      blur: clamp(raw.blur, g.blurRange, R.defaults.blur),
      tint: clamp(raw.tint, g.tintRange, R.defaults.tint)
    };
  }

  // A new style keeps what still makes sense: the same colour idea if the style has it
  // (Aperol, Gelato, Balaton, Matcha exist in Pop and Üveg), else the automatic pair's set of
  // the same brightness; the font resets to the style's default.
  function withStyle(state, style) {
    if (style === state.style) return state;
    var st = R.styles[style];
    var colour = "auto";
    if (state.colour !== "auto") {
      var cur = R.sets[state.colour];
      colour = setBySlug(style, cur.slug) || st.pair[cur.scheme];
    }
    return normalise({ style: style, colour: colour, font: st.defaultFont, glass: state.glass, blur: state.blur, tint: state.tint });
  }

  // The Világos / Sötét / Automatikus switch. Automatic follows the device inside the style's pair;
  // Világos and Sötét keep a set of that brightness if one is picked, else take the pair's.
  function schemeOf(state) { return state.colour === "auto" ? "auto" : R.sets[state.colour].scheme; }
  function withScheme(state, scheme) {
    var next = Object.assign({}, state);
    if (scheme === "auto") next.colour = "auto";
    else if (state.colour === "auto" || R.sets[state.colour].scheme !== scheme) next.colour = R.styles[state.style].pair[scheme];
    return next;
  }

  function resolve(state) {
    return state.colour === "auto" ? R.styles[state.style].pair[isDark() ? "dark" : "light"] : state.colour;
  }

  function parseHash(h) {
    var out = {};
    String(h || "").replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    return { style: out.s, colour: out.c, font: out.f, glass: out.g, blur: out.b, tint: out.t, view: out.v };
  }
  function toHash(state, view) {
    var c = state.colour === "auto" ? "auto" : R.sets[state.colour].slug;
    var parts = ["s=" + state.style, "c=" + c, "f=" + state.font];
    if (state.style === "uveg") parts.push("g=" + state.glass, "b=" + state.blur, "t=" + state.tint);
    if (view) parts.push("v=" + view);
    return parts.join("&");
  }

  // Put a state on an element: <html> for a page, any element for a nested preview.
  function apply(state, el) {
    el = el || document.documentElement;
    el.setAttribute("data-style", state.style);
    el.setAttribute("data-palette", resolve(state));
    el.setAttribute("data-font", state.font);
    if (state.style === "uveg") {
      el.setAttribute("data-glass", state.glass);
      el.style.setProperty("--glass-blur", state.blur + "px");
      el.style.setProperty("--glass-tint", state.tint + "%");
    } else {
      el.removeAttribute("data-glass");
      el.style.removeProperty("--glass-blur");
      el.style.removeProperty("--glass-tint");
    }
  }

  function describe(state) {
    var set = R.sets[resolve(state)];
    var colour = state.colour === "auto" ? "Automatikus (most " + set.name + ")" : set.name;
    return R.styles[state.style].name + ", " + colour + ", " + R.fonts[state.font].name;
  }

  // The same few lines the product's index.html runs before the bundle: paint right the first time.
  function firstPaint() {
    var raw = parseHash(location.hash);
    var state = normalise(raw);
    apply(state);
    window.BT_STATE = state;
    window.BT_VIEW = raw.view || "ma";
    if (/[?&]mini\b/.test(location.search)) document.documentElement.classList.add("is-mini");
  }

  window.BT_APPEARANCE = {
    R: R, STYLES: STYLES, normalise: normalise, withStyle: withStyle, withScheme: withScheme, schemeOf: schemeOf,
    resolve: resolve, parseHash: parseHash, toHash: toHash, apply: apply, describe: describe, firstPaint: firstPaint, isDark: isDark
  };
})();
