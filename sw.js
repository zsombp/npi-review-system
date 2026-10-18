// Service worker, v0.3.0, 2026-10-18 (Round C, D-087; BUILD-PLAN "Push payload", G10.1, G10.3). v0.3.0: the push handler
// reads the payload {title, body, path, tag, kind, acct, count, test, lang}. Per kind it picks the notification's
// actions, vibration and sound (a low review: Open and Replies, vibration; the morning report: Replies, silent; a test:
// no actions); an unknown or missing kind keeps the old behaviour exactly, so a push in the old shape still works. A
// count sets the app badge (0 clears it) and every open window is told the push arrived (PUSH_SEEN, which is how the
// notification card learns that a test push reached this device). The badge glyph is its own monochrome file
// (icons/badge-96.png). A tap on the Replies action opens drafts for the pushed account; every target stays inside
// BASE. The action titles come from the payload's lang (hu by default), because the worker has no locale of its own.
// No skipWaiting, same registration URL scheme: an installed phone takes this worker like any other deploy.
// Service worker, v0.2.3, 2026-10-17 (D-070, D-071; BUILD-PLAN K0 section 5). v0.2.3: the interface sounds are three
// sets now, sounds/<set>/<name>.mp3 (lib/sound.ts loads only the chosen set's), and each file is kept by its own address
// under the same rule as before: on first use, stale while revalidate, nothing precached. The six at sounds/<name>.mp3
// (v2.0.0's Pop, for a tab still on the old build) keep the rule they had. Only the sounds' lines changed.
// Service worker, v0.2.2, 2026-09-28 (critical review C-048): a navigation asks the server (cache mode no-cache,
// which revalidates with the ETag) instead of taking the HTTP cache's copy of index.html, which after a deploy names
// chunks that no longer exist. Network first now means the network.
// Service worker, v0.2.1, 2026-09-27 (candy fix: docs/reviews/CODEX-CANDY-REVIEW-2026-09-27.md finding 8). v0.2.1: the
// interface sounds (sounds/*.mp3, lib/sound.ts) are kept like the drawings, on first use, stale while revalidate, so a
// sound that was heard once plays offline too; the map pin of the missing page (illo/terkeptu-480.webp) was already
// kept by the same rule. Nothing is precached for them: with Hangok Ki nothing may be fetched. Supabase untouched.
// Service worker, v0.2.0, 2026-09-22 (push and notification click; v0.1.0, 2026-09-17). Registered by src/lib/pwa.ts.
//
// Written by hand, not generated. Workbox would be a build step, a dependency and a
// generated file nobody reads, for four rules that fit on one screen. These four:
//
//   navigation      network first, offline.html when the network is gone
//   hashed assets   stale while revalidate
//   fonts           stale while revalidate
//   Supabase        never touched, in either direction
//
// The version. This file is copied verbatim out of public/, so Vite's define never
// reaches it; the build id arrives in the script URL instead. src/lib/pwa.ts registers
// `sw.js?v=<__BUILD_ID__>`, the worker reads that back off its own location, and every
// cache it opens is named for it. Two things follow from one line. The cache is
// generation-scoped, so a deploy cannot serve last week's chunk against this week's
// index.html; and the registration URL changes on every build, which is what makes the
// browser install a new worker at all.
//
// What is never cached, and why it is stated twice. Every Supabase request, which is
// the REST API, the auth endpoints, the edge functions and realtime, passes straight
// through: a cached session or a cached row is a customer's data sitting in a store
// this worker has no business holding, and a stale read would be a wrong number on a
// screen that exists to be trusted. Today Supabase is cross-origin, so the general
// "same origin only" rule already covers it. The explicit host check below stays anyway,
// because the day someone proxies the API under our own path is the day the general
// rule quietly stops covering it.
//
// Nothing here is cached with a POST, a PUT or a Range header either. A cache keyed by
// URL cannot tell two different request bodies apart, and a partial response served
// whole is a corrupt file.

const BASE = new URL("./", self.location).pathname;        // /npi-review-system/
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `bistrotech-${BUILD}`;
const SHELL = BASE + "index.html";
const OFFLINE = BASE + "offline.html";

// The app shell. index.html is here for the broken-deploy case in onNavigate below;
// offline.html is here because it is the one page that has to exist when nothing else
// can be fetched. The icons and the manifest are small, and an install prompt that
// cannot draw its own icon is not a prompt.
const PRECACHE = [
  SHELL,
  OFFLINE,
  BASE + "manifest.webmanifest",
  BASE + "favicon.svg",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
  BASE + "icons/icon-maskable-512.png",
  BASE + "icons/apple-touch-icon-180.png",
  BASE + "icons/badge-96.png",
];

// The hosts a font may come from. The product self-hosts its faces under BASE + fonts/,
// which the same-origin rule already covers; these two are here so that a later switch
// to Google Fonts does not silently lose its cache.
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// A Supabase project is <ref>.supabase.co. The check is on the host, not on the path,
// so it holds for the REST API, auth, storage, realtime and the edge functions alike.
function isSupabase(url) {
  return /(^|\.)supabase\.(co|in)$/.test(url.hostname) || /\/(auth|rest|realtime|storage|functions)\/v1\//.test(url.pathname);
}

// Everything this worker is allowed to keep: the build's own hashed output, the fonts,
// the icons, the drawings, the interface sounds and the manifest. Never sw.js itself, which the browser fetches and
// compares on its own and must never be answered from a cache; never an HTML file,
// which is what the navigation rule is for.
function isAsset(url) {
  if (FONT_HOSTS.includes(url.hostname)) return true;
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith(BASE)) return false;
  const path = url.pathname.slice(BASE.length);
  if (path === "sw.js") return false;
  if (path.startsWith("assets/") || path.startsWith("fonts/") || path.startsWith("icons/")) return true;
  // v0.2.3: the interface sounds, each set's files by their own address, and the old build's six at the root
  if (/^sounds\/(?:(?:pop|papir|uveg)\/)?[a-z]+\.mp3$/.test(path)) return true;
  return /\.(js|css|woff2?|png|jpe?g|webp|avif|svg|ico|webmanifest)$/.test(path);
}

self.addEventListener("install", (event) => {
  // allSettled, not addAll: one icon that 404s after a rename should cost that icon,
  // not the whole worker. cache: "reload" so the precache is the deploy's bytes and
  // not whatever the HTTP cache happened to be holding.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(PRECACHE.map((path) => cache.add(new Request(path, { cache: "reload" }))))
    )
  );
  // No skipWaiting here on purpose. A new worker waits, the app notices it and says so,
  // and the reader decides when the page reloads. Swapping the worker under a half
  // written reply draft is not an improvement.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => (name.startsWith("bistrotech-") && name !== CACHE ? caches.delete(name) : null)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window" });
    for (const client of windows) client.postMessage({ type: "ACTIVATED", version: BUILD });
  })());
});

// Network first. The network's answer is the answer, including a 404: GitHub Pages
// serves 404.html for every path but the base, and that file is what hands the route to
// the router (public/404.html). Two departures from "whatever the server said":
//   5xx, which is a broken deploy or an outage rather than a page that is missing, and
//     the shell we already have answers it better than the server does;
//   a fetch that throws, which is the network being gone, and gets offline.html.
async function onNavigate(request) {
  const cache = await caches.open(CACHE);
  try {
    // v0.2.2: revalidate, never the HTTP cache's copy as it stands (C-048)
    const response = await fetch(request, { cache: "no-cache" });
    if (response.status >= 500) {
      const shell = await cache.match(SHELL);
      if (shell) return shell;
    }
    return response;
  } catch {
    const offline = await cache.match(OFFLINE);
    return offline || Response.error();
  }
}

// Stale while revalidate. The cached copy is served at once and the network copy
// replaces it in the background. Safe here because every URL this applies to is either
// content-hashed by the build, a font file that does not change under its own name, or a
// file of public/ (an icon, a drawing, a sound) whose content does not change within one
// build; the cache is named for the build, so a deploy starts it afresh.
function onAsset(event) {
  return caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((response) => {
      if (response && response.ok) cache.put(event.request, response.clone()).catch(() => {});
      return response;
    }).catch(() => undefined);
    if (cached) {
      event.waitUntil(network);   // keep the worker alive long enough to refresh
      return cached;
    }
    return (await network) || Response.error();
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (!url.protocol.startsWith("http")) return;
  if (isSupabase(url)) return;                    // stated twice, see the header
  if (request.mode === "navigate") { event.respondWith(onNavigate(request)); return; }
  if (isAsset(url)) { event.respondWith(onAsset(event)); }
});

// The channel the app talks back on (src/lib/pwa.ts).
//   SKIP_WAITING  the reader accepted the new version: take over, and the page reloads
//                 itself on controllerchange.
//   GET_VERSION   which build is answering, for the console and for a support call.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data.type !== "string") return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (data.type === "GET_VERSION") {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ type: "VERSION", version: BUILD });
  }
});

// ---------------------------------------------------------------------------
// v0.2.0, 2026-09-22 (completeness audit 5.3): push. The payload is ours (title, body,
// path); the path is opened inside the app's own base only, so a payload can never
// send a person to another site. A tap focuses an open window if there is one.
// v0.3.0, 2026-10-18 (Round C): kinds, actions, badge count, PUSH_SEEN. The pure part comes first (pushOptions,
// clickTarget, no browser object in them) so scripts/sw_unit.mjs can drive it; the two handlers below only call it.
// ---------------------------------------------------------------------------
const KINDS = ["low_reviews", "daily_report", "test"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The label of an action, by the payload's own lang. hu unless the payload says en.
const ACTION_TITLES = { hu: { open: "Megnyitom", replies: "Válaszok" }, en: { open: "Open", replies: "Replies" } };

function actionList(lang, names) {
  const t = ACTION_TITLES[lang === "en" ? "en" : "hu"];
  return names.map((action) => ({ action, title: t[action] }));
}

// An account id is only ever UUID shaped here; anything else is dropped, never passed on.
function acctOf(value) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

// What the payload asks for, as the notification's options. data is the parsed payload (any shape, none of it
// trusted); base is the app's path ("/npi-review-system/"). Returns {title, options, count, test, kind, acct}:
// count is an integer 0..9999 (a larger one is shown as 9999) or null, test a nonce string or null. Unknown or missing kind: no actions and no
// per-kind options, exactly what v0.2.x showed.
function pushOptions(data, base) {
  const d = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const title = typeof d.title === "string" && d.title ? d.title : "BistroTech";
  const body = typeof d.body === "string" ? d.body : "";
  const tag = typeof d.tag === "string" && d.tag ? d.tag : "bt";
  const path = typeof d.path === "string" && d.path.startsWith("/") && !d.path.startsWith("//") ? d.path : "/";
  const kind = KINDS.includes(d.kind) ? d.kind : null;
  const acct = acctOf(d.acct);
  // Codex whole-diff review (finding 3): one contract with the engine, which sends any non-negative integer; the icon shows at most 9999
  const count = Number.isInteger(d.count) && d.count >= 0 ? Math.min(d.count, 9999) : null;
  const test = typeof d.test === "string" && d.test ? d.test.slice(0, 64) : null;
  const options = {
    body: body.slice(0, 160),
    tag: tag.slice(0, 60),
    icon: base + "icons/icon-192.png",
    badge: base + "icons/badge-96.png",
    data: { url: base.replace(/\/$/, "") + path, kind, acct },
    renotify: false,
  };
  if (kind === "low_reviews") {
    options.vibrate = [200, 100, 200];
    options.requireInteraction = false;
    options.actions = actionList(d.lang, ["open", "replies"]);
  } else if (kind === "daily_report") {
    options.silent = true;
    options.actions = actionList(d.lang, ["replies"]);
  }
  return { title: title.slice(0, 80), options, count, test, kind, acct };
}

// Where a tap goes: a path inside base, never anything else. data is the notification's data ({url, kind, acct}),
// action the button that was pressed ("" for a plain tap). The Replies button opens the drafts of the pushed
// account (acct only when UUID shaped); Open and a plain tap use the stored address when it stays inside base.
function clickTarget(data, action, base) {
  const d = data && typeof data === "object" ? data : {};
  if (action === "replies") {
    const acct = acctOf(d.acct);
    return base + "drafts" + (acct ? "?acct=" + acct : "");
  }
  if (typeof d.url === "string" && d.url.startsWith("/") && !d.url.startsWith("//")) {
    try {
      // resolved against a dummy origin: dot segments and backslashes are normalised before the base check
      const u = new URL(d.url, "https://app.invalid");
      const root = base.replace(/\/$/, "");
      if (u.origin === "https://app.invalid" && (u.pathname === root || u.pathname.startsWith(base))) {
        return (u.pathname === root ? base : u.pathname) + u.search + u.hash;
      }
    } catch { /* an address that does not parse is not ours */ }
  }
  return base;
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { const parsed = event.data.json(); if (parsed && typeof parsed === "object") payload = parsed; } catch { /* a push with no body */ }
  const push = pushOptions(payload, BASE);
  event.waitUntil((async () => {
    // every open window learns the push arrived, before the notification is shown; a failure here costs nothing
    try {
      // Codex review of C2 (finding 1): only this app's own windows hear it; another project on the same origin never does
      const windows = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).filter((c) => { try { return new URL(c.url).pathname.startsWith(BASE); } catch { return false; } });
      for (const client of windows) {
        try { client.postMessage({ type: "PUSH_SEEN", test: push.test, kind: push.kind, acct: push.acct }); } catch { /* a window that is going away */ }
      }
    } catch { /* no windows to tell */ }
    // the badge: a count from the engine, 0 clears; absent API or a refusal is no error
    try {
      const nav = self.navigator;
      if (push.count !== null && nav && typeof nav.setAppBadge === "function") {
        if (push.count === 0 && typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
        else await nav.setAppBadge(push.count);
      }
    } catch { /* the Badging API refused */ }
    await self.registration.showNotification(push.title, push.options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = clickTarget(event.notification.data, event.action || "", BASE);
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).pathname.startsWith(BASE)) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch { /* ignore */ } } return; }
    }
    await self.clients.openWindow(url);
  })());
});
