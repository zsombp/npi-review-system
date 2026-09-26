/* engine.js, v0.2.0, 2026-09-26 (v0.2.0 adds dump(), the key log). One master timeline on the Web Animations API, for the intro video.

   The idea: every moving thing is a key on a track. A track is one CSS property of one element (opacity,
   translate, rotate, scale, clip-path, a colour, a stroke offset), and each track becomes exactly ONE
   Animation that spans the whole video, with its keys as keyframe offsets. Nothing plays by itself: every
   Animation is paused, and seek(ms) sets the same currentTime on all of them. The live player calls seek()
   from one requestAnimationFrame loop, the scrubber calls it when dragged, and the renderer calls it once
   per frame before each screenshot, so the picture at a given millisecond is always the same.

   Keys: move(el, prop, [[seconds, value, easing], ...]). The easing of a key shapes the way to the next
   key. Several moves may share a track; when one move ends on a value and the next starts on another,
   the first value holds until the next move begins and then jumps, instead of drifting between them.
   Works on elements inside same-origin iframes too (the app screens), each on its own document. */
(function () {
  "use strict";
  var E = {
    T: 1000,
    tracks: new Map(),   // element -> { prop: [keys] }
    anims: [],
    seq: 0,
    EASE: {
      pop: "cubic-bezier(.2, .9, .3, 1.3)",     // the identity's pop (POP-IDENTITY section 8)
      stamp: "cubic-bezier(.2, 1.5, .4, 1)",    // the app's stamp-in
      out: "cubic-bezier(.2, 0, 0, 1)",         // the app's --ease
      inn: "cubic-bezier(.55, 0, .85, .3)",
      inout: "cubic-bezier(.7, 0, .2, 1)",
      soft: "cubic-bezier(.45, 0, .55, 1)",
      lin: "linear",
      hold: "steps(1, end)"
    }
  };

  E.move = function (el, prop, keys) {
    if (!el) throw new Error("move: no element for " + prop);
    var id = ++E.seq;
    var byProp = E.tracks.get(el);
    if (!byProp) { byProp = {}; E.tracks.set(el, byProp); }
    var list = byProp[prop] || (byProp[prop] = []);
    keys.forEach(function (k, i) { list.push({ t: Math.round(k[0] * 1000), v: k[1], e: k[2] || "linear", id: id, n: list.length + i }); });
  };

  /* an instant change: from `from` to `to` exactly at t */
  E.set = function (el, prop, t, from, to) { E.move(el, prop, [[t, from], [t, to]]); };

  E.build = function (totalSeconds) {
    var T = Math.round(totalSeconds * 1000);
    E.T = T;
    E.tracks.forEach(function (byProp, el) {
      Object.keys(byProp).forEach(function (prop) {
        var ks = byProp[prop].slice().sort(function (a, b) { return a.t - b.t || a.n - b.n; });
        var frames = [];
        var first = ks[0];
        var push = function (t, v, e) {
          var f = { offset: Math.max(0, Math.min(1, t / T)), easing: e || "linear" };
          f[prop] = v;
          frames.push(f);
        };
        push(0, first.v, "linear");
        for (var i = 0; i < ks.length; i++) {
          var k = ks[i], prev = ks[i - 1];
          if (prev && prev.id !== k.id && String(prev.v) !== String(k.v)) push(k.t, prev.v, "linear");
          push(k.t, k.v, k.e);
        }
        push(T, ks[ks.length - 1].v, "linear");
        var a = el.animate(frames, { duration: T, fill: "both", easing: "linear" });
        a.pause();
        a.currentTime = 0;
        E.anims.push(a);
      });
    });
    return E.anims.length;
  };

  /* every keyed moment, for the logs of tools/beatcheck.mjs: element label, property, key times in seconds */
  E.dump = function () {
    var out = [];
    E.tracks.forEach(function (byProp, el) {
      var label = el.getAttribute && (el.getAttribute("data-qa") || el.id || (el.className && el.className.baseVal != null ? el.className.baseVal : el.className) || el.tagName);
      Object.keys(byProp).forEach(function (prop) {
        var ts = byProp[prop].map(function (k) { return k.t / 1000; });
        out.push({ el: String(label).slice(0, 48), prop: prop, t: ts.filter(function (v, i) { return ts.indexOf(v) === i; }).sort(function (a, b) { return a - b; }) });
      });
    });
    return out;
  };

  E.seek = function (ms) {
    ms = Math.max(0, Math.min(E.T, ms));
    for (var i = 0; i < E.anims.length; i++) E.anims[i].currentTime = ms;
  };

  window.Engine = E;
})();
