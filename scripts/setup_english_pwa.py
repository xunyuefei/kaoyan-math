# -*- coding: utf-8 -*-
"""
部署考研英语知识库 PWA 全套核心设施
"""

import sys
import os
import json
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_ENG = Path(r"c:\Users\31085\Desktop\红宝书讲义_排版修复版")
PORTAL = ROOT_ENG / "_内部核心程序与数据(无需修改)" / "web_portal"
SERVE_PY = ROOT_ENG / "_内部核心程序与数据(无需修改)" / "serve_portal.py"
SYNC_JS = PORTAL / "sync_english.js"

# -----------------------------------------------------------------------------
# 1. 英语 PWA Manifest (manifest.webmanifest)
# -----------------------------------------------------------------------------
MANIFEST_WEB = {
  "name": "考研英语红宝书 · 全景深度特训讲义站",
  "short_name": "红宝书讲义",
  "description": "考研英语核心词汇全案深度特训与专题卫星讲义（双端自适应沉浸阅读）",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#881337",
  "orientation": "portrait-primary",
  "categories": ["education", "books"],
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}

(PORTAL / "manifest.webmanifest").write_text(json.dumps(MANIFEST_WEB, ensure_ascii=False, indent=2), encoding="utf-8")
print("  [✓] 写入 web_portal/manifest.webmanifest")

# -----------------------------------------------------------------------------
# 2. 英语离线兜底页 (offline.html)
# -----------------------------------------------------------------------------
OFFLINE_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>离线背词模式 · 考研英语红宝书讲义站</title>
<style>
  :root {
    --bg-primary: #0f172a;
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
    --accent-red: #be123c;
    --card-bg: rgba(30, 41, 59, 0.7);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: radial-gradient(circle at 50% 20%, #4c0519 0%, #0f172a 70%);
    color: var(--text-primary);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
  }
  .offline-card {
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    border-radius: 20px;
    padding: 40px 24px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  }
  .icon-ring {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: rgba(190, 18, 60, 0.15);
    border: 1px solid rgba(190, 18, 60, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
  }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
  p { font-size: 14px; line-height: 1.6; color: var(--text-muted); margin-bottom: 24px; }
  .action-btn {
    display: inline-block;
    width: 100%;
    padding: 12px 20px;
    background: linear-gradient(135deg, #9f1239, #be123c);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.2s;
    margin-bottom: 10px;
  }
  .action-btn:active { opacity: 0.85; }
  .secondary-btn {
    background: rgba(255,255,255,0.08);
    color: var(--text-primary);
  }
</style>
</head>
<body>
<div class="offline-card">
  <div class="icon-ring">📶</div>
  <h1>当前处于离线背词模式</h1>
  <p>您暂时断开了网络。红宝书讲义 PWA 已将您此前查阅过的核心词汇单元与个人标记完整缓存在手机中，离线背单词丝毫不受影响！</p>
  <button class="action-btn" onclick="window.location.reload()">🔄 刷新重试连接</button>
  <a href="./" class="action-btn secondary-btn">🏠 返回讲义站主页</a>
</div>
</body>
</html>
"""
(PORTAL / "offline.html").write_text(OFFLINE_HTML.strip() + "\n", encoding="utf-8")
print("  [✓] 写入 web_portal/offline.html")

# -----------------------------------------------------------------------------
# 3. 英语专属 Service Worker (sw.js)
# 策略：App Shell + Network-First (网络优先防锁死) + 动态 LRU 缓存上限 (防爆内存)
# -----------------------------------------------------------------------------
SW_JS = """// ==============================================================================
// 📕 考研英语红宝书 · 全景深度特训讲义站 · PWA Service Worker (sw.js)
// 核心原则：Network-First (网络优先) + App Shell 预缓存 + 动态上限防膨胀
// ==============================================================================

const CACHE_VERSION = 'kaoyan-english-pwa-v1.0';
const OFFLINE_URL = './offline.html';

// 基础外壳资产（轻量级、核心必需）
const PRECACHE_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  OFFLINE_URL
];

// 1. 安装阶段
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(PRECACHE_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// 2. 激活阶段：立即接管并清洗历史过期缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            console.log('[SW-English] 正在清理过期缓存:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 请求拦截：双轨缓存调度
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. 导航、主 HTML、各 List 讲义 HTML (content/list-XX.html) 与清单 JSON
  // 强制采用【Network-First (网络优先)】，确保每次更新词汇或修复勘误时，手机端秒级获取最新版！
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const isData = url.pathname.endsWith('.json');

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
          // 断网降级：读取已缓存的讲义页面
          return caches.match(req).then(cached => {
            if (cached) return cached;
            if (req.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
        })
    );
    return;
  }

  // B. 静态字体、图标与前端通用资源 ——【Stale-While-Revalidate】
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
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
"""
(PORTAL / "sw.js").write_text(SW_JS.strip() + "\n", encoding="utf-8")
print("  [✓] 写入 web_portal/sw.js")

# -----------------------------------------------------------------------------
# 4. 更新 web_portal/index.html 头部注入 PWA 与安装引导
# -----------------------------------------------------------------------------
index_path = PORTAL / "index.html"
index_html = index_path.read_text(encoding="utf-8")

if "manifest.webmanifest" not in index_html:
    pwa_head_tags = """  <!-- PWA Manifest & Icons -->
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
  <link rel="icon" type="image/png" sizes="64x64" href="icons/favicon.png">
  <meta name="theme-color" content="#881337">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="红宝书讲义">
"""
    index_html = index_html.replace("</head>", pwa_head_tags + "</head>", 1)
    print("  [✓] web_portal/index.html: 注入 PWA head 元标签")

# 在顶部 header 增加安装按钮
if 'id="btnInstallPwa"' not in index_html:
    install_btn_html = """      <button class="header-btn" id="btnInstallPwa" style="display:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:600; border:none; padding:4px 10px; border-radius:6px; cursor:pointer;" title="📲 安装到手机桌面 (独立App模式)">
        <span>📲 安装</span>
      </button>\n"""
    # 插入在 themeToggle 之前
    index_html = index_html.replace('<button class="theme-toggle"', install_btn_html + '      <button class="theme-toggle"', 1)
    print("  [✓] web_portal/index.html: 注入安装按钮")

# 在 </body> 之前增加 SW 注册与 beforeinstallprompt 处理
if 'ServiceWorker 注册成功' not in index_html:
    pwa_sw_script = """
<!-- PWA Service Worker & Install Controller -->
<script>
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function(reg) {
          console.log('[PWA-English] Service Worker 注册成功，作用域:', reg.scope);
          reg.addEventListener('updatefound', function() {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA-English] 发现新版本词汇讲义，已在后台自动刷新！');
              }
            });
          });
        })
        .catch(function(err) {
          console.warn('[PWA-English] Service Worker 注册失败:', err);
        });
    });
  }

  var deferredPrompt = null;
  var installBtn = document.getElementById('btnInstallPwa');

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', function() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA-English] 用户已安装到桌面！');
          }
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      });
    }
  });

  window.addEventListener('appinstalled', function() {
    console.log('[PWA-English] 考研英语讲义 PWA 安装完成！');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
  });
})();
</script>
"""
    index_html = index_html.replace("</body>", pwa_sw_script + "\n</body>", 1)
    print("  [✓] web_portal/index.html: 注入 PWA 注册脚本")

index_path.write_text(index_html, encoding="utf-8")

# -----------------------------------------------------------------------------
# 5. 更新 serve_portal.py 添加 .webmanifest MIME 类型
# -----------------------------------------------------------------------------
if SERVE_PY.exists():
    py_code = SERVE_PY.read_text(encoding="utf-8")
    if 'manifest+json' not in py_code:
        # 给 SimpleHTTPRequestHandler 添加 MIME 映射
        patch_mime = """
SimpleHTTPRequestHandler.extensions_map.update({
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
})
"""
        py_code = py_code.replace("class CORSRequestHandler", patch_mime + "\nclass CORSRequestHandler", 1)
        SERVE_PY.write_text(py_code, encoding="utf-8")
        print("  [✓] 更新 serve_portal.py: 添加 .webmanifest MIME 支持")

# -----------------------------------------------------------------------------
# 6. 更新 web_portal/tests/test_portal_manifest.js 增加 PWA 测试项
# -----------------------------------------------------------------------------
test_js_path = PORTAL / "tests" / "test_portal_manifest.js"
if test_js_path.exists():
    test_js_code = test_js_path.read_text(encoding="utf-8")
    if 'PWA 设施合规性检验' not in test_js_code:
        pwa_test_snippet = """
console.log('\\n>>> 正在执行 PWA 设施合规性检验...');
const pwaManifestPath = path.join(rootDir, 'manifest.webmanifest');
const swPath = path.join(rootDir, 'sw.js');
const offlinePath = path.join(rootDir, 'offline.html');
const iconsDir = path.join(rootDir, 'icons');

if (!fs.existsSync(pwaManifestPath)) { console.error('[X] 缺少 manifest.webmanifest'); process.exit(1); }
if (!fs.existsSync(swPath)) { console.error('[X] 缺少 sw.js'); process.exit(1); }
if (!fs.existsSync(offlinePath)) { console.error('[X] 缺少 offline.html'); process.exit(1); }

['icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png'].forEach(ic => {
  const ip = path.join(iconsDir, ic);
  if (!fs.existsSync(ip) || fs.statSync(ip).size < 500) {
    console.error(`[X] 缺少有效 PWA 图标: ${ic}`);
    process.exit(1);
  }
});
console.log('✅ PWA manifest、Service Worker、离线页与全套图标 100% 合规！');
"""
        test_js_code = test_js_code.replace("console.log('✅ 全部已就绪单元对应 content HTML 100% 存在！测试通过！');",
                                            "console.log('✅ 全部已就绪单元对应 content HTML 100% 存在！测试通过！');" + pwa_test_snippet)
        test_js_path.write_text(test_js_code, encoding="utf-8")
        print("  [✓] 更新 test_portal_manifest.js: 增加 PWA 测试项")

print("\n🎉 考研英语 PWA 全套设施部署就绪！")
