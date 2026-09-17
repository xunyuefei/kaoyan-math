// ==============================================================================
// 📐 考研数学 SOP 题解知识库 · PWA Service Worker (sw.js)
// 策略：App Shell 快速秒开 + 内容数据 Network-First (网络优先防锁死) + 离线兜底
// ==============================================================================

const CACHE_VERSION = 'kaoyan-math-pwa-v1.1';
const OFFLINE_URL = './offline.html';

// 核心外壳预缓存清单（轻量必需，绝不大包揽）
const PRECACHE_SHELL = [
  './',
  './index.html',
  './preview.css',
  './preview.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icon-192.png',
  './icon-512.png',
  OFFLINE_URL
];

// 1. 安装阶段：弹性容错预缓存 App Shell（保障安卓 Edge/Chrome 100% 安装成功）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      // 使用 Promise.allSettled 逐项缓存，绝不因单项偶发波动而导致整套 SW 安装夭折
      await Promise.allSettled(
        PRECACHE_SHELL.map(async url => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(url, res);
            } else {
              console.warn('[SW-Math] Precache status non-200 for:', url, res ? res.status : 'null');
            }
          } catch (err) {
            console.warn('[SW-Math] Precache fetch error for:', url, err);
          }
        })
      );
    }).then(() => {
      // 允许新 SW 立即激活接管
      return self.skipWaiting();
    })
  );
});

// 2. 激活阶段：立即接管客户端并清理历史过期缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            console.log('[SW-Math] 正在清理过期缓存:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. 请求拦截与智能双轨缓存策略
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 仅拦截 http/https 的 GET 请求
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 策略 A：HTML 导航页、真题 Markdown 与大纲 JSON ——【Network-First (网络优先)】
  // 保证用户只要联网，永远获取云端最新题解与章节修订，彻底杜绝手机端锁死旧版！
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const isData = url.pathname.endsWith('.json') || url.pathname.endsWith('.md');

  if (isHtml || isData) {
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // 断网或异常时降级读取本地缓存
          return caches.match(req).then(cached => {
            if (cached) return cached;
            // 若为全新未读页面且彻底离线，返回离线兜底页
            if (req.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
        })
    );
    return;
  }

  // 策略 B：静态静态样式、脚本、字体与图标 ——【Stale-While-Revalidate (缓存秒开 + 异步静默更新)】
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      const fetchPromise = fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // 静态资源离线失败静默降级
        });

      return cachedResponse || fetchPromise;
    })
  );
});
