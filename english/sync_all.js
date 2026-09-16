const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const redbookDir = 'c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版';
const englishDir = path.join(__dirname);

function run(cmd, cwd, stepName) {
  console.log(`\n========================================================`);
  console.log(`[*] ${stepName}...`);
  console.log(`========================================================`);
  try {
    execSync(cmd, { cwd: cwd, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  } catch (err) {
    console.error(`\n[!] 执行失败: ${stepName}`);
    process.exit(1);
  }
}

console.log(`========================================================`);
console.log(`  考研英语红宝书 · 全自动增量构建与网站极速同步流水线`);
console.log(`========================================================`);

// 步骤 1：智能检测并增量解析新单词批次（已有且未修改的 List 自动 0 秒跳过）
run('python build_golden_datasets.py', redbookDir, '步骤 1/4: 智能扫描并增量提炼单词库 (build_golden_datasets.py)');

// 步骤 2：基于时间基准智能增量排版新讲义（已生成且无变动的单元自动跳过）
run('python build_engine.py', redbookDir, '步骤 2/4: 智能增量排版渲染讲义 (build_engine.py)');

// 步骤 3：极速更新全景母题分类与阅读态度特训专区
run('python thematic_builder.py --html-only', redbookDir, '步骤 3/4: 刷新母题分类与态度特训专区 (thematic_builder.py)');

// 步骤 4：同步所有新讲义到单页面门户并更新 manifest.json 清单
run('node sync_english.js', englishDir, '步骤 4/4: 同步至网页门户并更新 manifest.json');

console.log(`\n========================================================`);
console.log(`[✓] 增量更新已圆满完成！新内容已实时注入网页门户！`);
console.log(`    本地阅读门户地址: http://localhost:5220/`);
console.log(`========================================================\n`);
