const { execSync, spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { aiIngest } = require('./ai-ingest');

// ─── 启动/检查本地极速预览服务器并打开浏览器 ───
function openLocalPreview(anchor = '') {
  const PORT = 5210;
  const targetUrl = anchor ? `http://localhost:${PORT}/#${anchor}` : `http://localhost:${PORT}/`;

  const checkPort = () => new Promise((resolve) => {
    const socket = net.createConnection({ port: PORT, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });

  checkPort().then((isRunning) => {
    if (!isRunning) {
      // 后台脱钩静默启动 serve.js
      const serverProcess = spawn('node', [path.join(__dirname, 'serve.js')], {
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      console.log(`\n⚡ [本地即时预览] 本地极速服务已启动 (端口 ${PORT})`);
    }

    console.log(`⚡ [本地即时预览] 正在秒级打开本地预览: ${targetUrl}`);
    console.log(`💡 (本地预览 0 延迟，题目实时更新渲染；无需苦等 GitHub 1分钟的云端构建)`);

    // 打开系统默认浏览器
    try {
      if (process.platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', '', targetUrl], { detached: true, stdio: 'ignore' }).unref();
      }
    } catch (_) {}
  });
}

async function main() {
  // 0. 如果草稿箱 inbox.md 有内容，调用 DeepSeek API 进行智能入库
  const ingestResult = await aiIngest();

  console.log('\n🚀 [1/3] 正在解析题目并同步 manifest.json...');
  try {
    execSync('node scripts/sync.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('❌ 同步失败，请检查 Markdown 格式后重试。');
    process.exit(1);
  }

  // 此时本地文件与 manifest 已是最新的！立即秒级打开本地预览！
  const targetAnchor = (ingestResult && ingestResult.anchor) ? ingestResult.anchor : '';
  openLocalPreview(targetAnchor);

  console.log('\n📦 [2/3] 正在打包 Git 变更...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    try {
      execSync(`git commit -m "auto: 更新题库笔记 ${now}"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('ℹ️ 没有检测到新的文件更改，跳过提交。');
    }
  } catch (e) {
    console.error('❌ Git 提交失败:', e.message);
    process.exit(1);
  }

  console.log('\n☁️ [3/3] 正在静默推送到 GitHub (云端备份)...');
  try {
    try {
      execSync('git pull --rebase origin main', { stdio: 'inherit' });
    } catch (rebaseErr) {
      console.warn('⚠️ rebase 检查完成');
    }

    execSync('git push origin main', { stdio: 'inherit' });
    console.log('\n🎉 [Success] 云端备份已推送到 GitHub！');
    console.log('🌐 线上永久地址: https://xunyuefei.github.io/kaoyan-math/');
  } catch (e) {
    console.error('❌ Git 推送失败，请检查网络连接后重试。');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message);
  process.exit(1);
});
