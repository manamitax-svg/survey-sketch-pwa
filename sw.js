const CACHE_NAME = "survey-sketch-cache-v34"; // v34: meta.schema_versionを1.1へ（現地データにvalidationセクション追加を解析側が検知できるように）
const SHARE_TARGET_CACHE = "survey-sketch-share-target-v1"; // 共有で受け取ったファイルの一時置き場
const ASSETS = [
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./planegcs_modules.js",
  "./planegcs.js",
  "./planegcs.wasm",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== SHARE_TARGET_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Web Share Target: 他アプリ（Google Drive等）から「共有」でJSONファイルを
// 受け取るためのハンドラ。POSTされたファイルの中身を一時キャッシュに
// 保存し、index.html?shared=1 にリダイレクトする。app.js側の
// checkShareTargetPayload() がこれを検知して読み込む。
async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const file = formData.get("file");
    if (file) {
      const text = await file.text();
      const cache = await caches.open(SHARE_TARGET_CACHE);
      await cache.put(
        "/__shared_payload__",
        new Response(text, { headers: { "Content-Type": "text/plain" } })
      );
    }
  } catch (e) { /* 失敗時は何もせずindex.htmlへ */ }
  return Response.redirect("./index.html?shared=1", 303);
}

// index.html / app.js は開発中に頻繁に更新されるため、タイムアウト付き
// Network First にする（オンライン時は常に最新版、オフライン/低速回線時は
// NETWORK_FIRST_TIMEOUT_MS で見切りをつけてキャッシュへ即フォールバック）。
// それ以外（wasm・アイコン等の大きく変わらない資産）は Cache First のまま。
const NETWORK_FIRST_PATHS = ["/index.html", "/app.js"];
const NETWORK_FIRST_TIMEOUT_MS = 2500;

function isNetworkFirstRequest(url) {
  return NETWORK_FIRST_PATHS.some((p) => url.pathname.endsWith(p)) ||
    url.pathname.endsWith("/"); // ルート直下はindex.html相当
}

async function networkFirstWithTimeout(event) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_FIRST_TIMEOUT_MS);
    const fresh = await fetch(event.request, { signal: controller.signal });
    clearTimeout(timer);
    if (fresh && fresh.ok) {
      cache.put(event.request, fresh.clone());
      return fresh;
    }
    throw new Error("network response not ok");
  } catch (e) {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname.endsWith("/share-target/")) {
    event.respondWith(handleShareTarget(event));
    return;
  }
  if (event.request.method === "GET" && isNetworkFirstRequest(url)) {
    event.respondWith(networkFirstWithTimeout(event));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});