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
// the icons and the manifest. Never sw.js itself, which the browser fetches and
// compares on its own and must never be answered from a cache; never an HTML file,
// which is what the navigation rule is for.
function isAsset(url) {
  if (FONT_HOSTS.includes(url.hostname)) return true;
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith(BASE)) return false;
  const path = url.pathname.slice(BASE.length);
  if (path === "sw.js") return false;
  if (path.startsWith("assets/") || path.startsWith("fonts/") || path.startsWith("icons/")) return true;
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
    const response = await fetch(request);
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
// content-hashed by the build or a font file that does not change under its own name.
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
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = { title: "BistroTech", body: "", path: "/", tag: "bt" };
  try { data = { ...data, ...event.data.json() }; } catch { /* a push with no body */ }
  const path = typeof data.path === "string" && data.path.startsWith("/") && !data.path.startsWith("//") ? data.path : "/";
  event.waitUntil(self.registration.showNotification(String(data.title).slice(0, 80), {
    body: String(data.body).slice(0, 160),
    tag: String(data.tag).slice(0, 60),
    icon: BASE + "icons/icon-192.png",
    badge: BASE + "icons/icon-192.png",
    data: { url: BASE.replace(/\/$/, "") + path },
    renotify: false,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || BASE;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).pathname.startsWith(BASE)) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch { /* ignore */ } } return; }
    }
    await self.clients.openWindow(url);
  })());
});
