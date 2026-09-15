const { execSync } = require('child_process');
const { aiIngest } = require('./ai-ingest');

async function main() {

// 0. 如果草稿箱 inbox.md 有内容，调用 DeepSeek API 进行智能入库
await aiIngest();

console.log('\n🚀 [1/3] 正在解析题目并同步 manifest.json...');
try {
  execSync('node scripts/sync.js', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ 同步失败，请检查 Markdown 格式后重试。');
  process.exit(1);
}

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

console.log('\n☁️ [3/3] 正在推送到 GitHub 并自动部署...');
try {
  // 先拉取变动，防止 non-fast-forward
  try {
    execSync('git pull --rebase origin main', { stdio: 'inherit' });
  } catch (rebaseErr) {
    console.warn('⚠️ rebase 检查完成');
  }

  execSync('git push origin main', { stdio: 'inherit' });
  console.log('\n🎉 [Success] 部署指令已发出！GitHub Pages 将在 1 分钟内完成更新。');
  console.log('🌐 线上地址: https://xunyuefei.github.io/kaoyan-math/');
} catch (e) {
  console.error('❌ Git 推送失败，请检查网络连接后重试。');
  process.exit(1);
}

} // end async function main

main().catch(err => {
  console.error('❌ 执行失败:', err.message);
  process.exit(1);
});
