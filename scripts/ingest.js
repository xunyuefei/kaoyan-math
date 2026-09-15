const fs = require('fs');
const path = require('path');

const inboxPath = path.join(__dirname, '../inbox.md');

function processInbox() {
  if (!fs.existsSync(inboxPath)) {
    fs.writeFileSync(inboxPath, '', 'utf8');
    return false;
  }

  let content = fs.readFileSync(inboxPath, 'utf8').trim();
  // 忽略只包含注释或空白的内容
  content = content.replace(/<!--[\s\S]*?-->/g, '').trim();

  if (!content) {
    return false; // 没有待处理的新题目
  }

  console.log('📥 [Inbox] 检测到草稿箱中有新题目，准备自动归档...');

  // 1. 判断学科（高等数学 vs 线性代数）
  let targetFile = 'content/高等数学_题解集.md';
  let subjectName = '高等数学';

  const isLinalg = /线性代数|矩阵|向量|特征值|行列式|二次型|基础解系|伴随矩阵|秩/i.test(content);
  const isCalculus = /高等数学|积分|求导|导数|极限|级数|微分|泰勒|曲面|弧长|微分方程/i.test(content);

  if (content.includes('@subject: linalg') || content.includes('@线代') || (isLinalg && !isCalculus)) {
    targetFile = 'content/线性代数_题解集.md';
    subjectName = '线性代数';
  }

  // 清除学科指示标记
  content = content.replace(/@subject:\s*(?:linalg|calculus|线代|高数)/gi, '').trim();

  // 2. 提取题号，补充 anchor（如果缺少）
  const numMatch = content.match(/^[#\s]*📌\s*题目\s*(\d+)/m);
  let problemNum = numMatch ? numMatch[1] : null;

  if (problemNum) {
    const anchorTag = `<a id="problem-${problemNum}"></a>`;
    if (!content.includes(anchorTag)) {
      content = `${anchorTag}\n\n${content}`;
    }
  }

  // 3. 追加写入目标科目文件
  const destPath = path.join(__dirname, '..', targetFile);
  let originalDest = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : '';

  // 避免完全重复追加同一题
  if (problemNum && originalDest.includes(`problem-${problemNum}`)) {
    console.log(`⚠️ 提示: 题目 P.${problemNum} 在 ${subjectName} 中已存在对应锚点，正在更新/覆盖追加...`);
  }

  const separator = originalDest.endsWith('\n\n---\n\n') ? '' : '\n\n---\n\n';
  const newDestContent = originalDest.trimEnd() + separator + content + '\n';

  fs.writeFileSync(destPath, newDestContent, 'utf8');
  console.log(`✅ [Inbox] 题目 ${problemNum ? 'P.' + problemNum : ''} 已成功追加到 【${subjectName}】！`);

  // 4. 清空草稿箱 inbox.md，使其变回空白文件
  fs.writeFileSync(inboxPath, '', 'utf8');
  console.log(`✨ [Inbox] 草稿箱 inbox.md 已自动重置为空白文件，随时迎接下一道题！`);

  return true;
}

module.exports = { processInbox };

if (require.main === module) {
  processInbox();
}
