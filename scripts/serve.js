/**
 * serve.js — 本地极速静态服务器（零第三方依赖，纯 Node.js 原生模块）
 * 端口：5210 (考研)
 * 用途：实现本地 0 延迟即时预览，无需等待 GitHub Pages 的 1 分钟 CDN 构建排队
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5210;
const ROOT_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // 允许跨域与禁用缓存以保证实时性
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, reqPath);

  // 安全检查，禁止越界访问
  if (!filePath.startsWith(ROOT_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end(`File not found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

function getLocalIp() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n========================================================================`);
  console.log(`🚀 [考研数学 SOP 题解站] 跨设备极速静态服务已启动！`);
  console.log(`💻 电脑浏览器打开: http://localhost:${PORT}/`);
  console.log(`📱 手机/平板打开 (同一Wi-Fi下): http://${localIp}:${PORT}/`);
  console.log(`🌐 官方云端发布地址 (免局域网限制): https://xunyuefei.github.io/kaoyan-math/`);
  console.log(`========================================================================\n`);
});

module.exports = { server, PORT };
