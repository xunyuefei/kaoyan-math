const fs = require('fs');
const path = require('path');

const inboxPath = path.join(__dirname, '../inbox.md');

// 用户官方唯一标准大纲与题集体系
const CANONICAL_CHAPTERS = {
  calculus: {
    name: '高等数学',
    file: 'content/高等数学_题解集.md',
    chapters: [
      '1. 函数与极限',
      '2. 一元函数微分',
      '3. 一元函数积分',
      '4. 常微分方程',
      '5. 多元函数微分',
      '6. 二重积分'
    ]
  },
  linalg: {
    name: '线性代数',
    file: 'content/线性代数_题解集.md',
    chapters: [
      '1. 行列式',
      '2. 矩阵',
      '3. n维向量',
      '4. 线性方程组',
      '5. 特征值与特征向量',
      '6. 二次型'
    ]
  }
};

function parseHeaderLine(line) {
  let source = '';
  let chapter = '';
  let subjectKey = 'calculus';

  const t = line.trim();

  // 1. 识别来源题集
  if (/600/i.test(t)) source = '600题';
  else if (/660/i.test(t)) source = '660题';
  else if (/精选/i.test(t)) source = '精选题';
  else if (/严选/i.test(t)) source = '严选题';
  else if (/讲义|辅导/i.test(t)) source = '辅导讲义';

  // 2. 识别章节与所属学科
  if (/二重积分/i.test(t)) {
    chapter = '6. 二重积分';
    subjectKey = 'calculus';
  } else if (/多元函数微分|多元微分/i.test(t)) {
    chapter = '5. 多元函数微分';
    subjectKey = 'calculus';
  } else if (/常微分方程|微分方程/i.test(t)) {
    chapter = '4. 常微分方程';
    subjectKey = 'calculus';
  } else if (/一元函数积分|一元积分/i.test(t)) {
    chapter = '3. 一元函数积分';
    subjectKey = 'calculus';
  } else if (/一元函数微分|一元微分/i.test(t)) {
    chapter = '2. 一元函数微分';
    subjectKey = 'calculus';
  } else if (/函数与极限|极限/i.test(t)) {
    chapter = '1. 函数与极限';
    subjectKey = 'calculus';
  } else if (/二次型/i.test(t)) {
    chapter = '6. 二次型';
    subjectKey = 'linalg';
  } else if (/特征值|特征向量/i.test(t)) {
    chapter = '5. 特征值与特征向量';
    subjectKey = 'linalg';
  } else if (/线性方程组|方程组/i.test(t)) {
    chapter = '4. 线性方程组';
    subjectKey = 'linalg';
  } else if (/n维向量|向量组|向量/i.test(t)) {
    chapter = '3. n维向量';
    subjectKey = 'linalg';
  } else if (/矩阵/i.test(t)) {
    chapter = '2. 矩阵';
    subjectKey = 'linalg';
  } else if (/行列式/i.test(t)) {
    chapter = '1. 行列式';
    subjectKey = 'linalg';
  }

  // 兜底来源
  if (!source) {
    source = (subjectKey === 'calculus') ? '600题' : '严选题';
  }

  return { source, chapter, subjectKey };
}

function processInbox() {
  if (!fs.existsSync(inboxPath)) {
    fs.writeFileSync(inboxPath, '', 'utf8');
    return false;
  }

  let raw = fs.readFileSync(inboxPath, 'utf8').trim();
  raw = raw.replace(/<!--[\s\S]*?-->/g, '').trim();

  if (!raw) {
    return false;
  }

  console.log('📥 [Inbox] 检测到草稿箱中有新题目，准备根据用户标准归档...');

  const lines = raw.split(/\r?\n/);
  const firstLine = lines[0].trim();

  const { source, chapter, subjectKey } = parseHeaderLine(firstLine);
  const subjectConfig = CANONICAL_CHAPTERS[subjectKey];

  // 如果首行是元数据标记（比如“严选题 二重积分”或“@...”），处理正文时将其剥离
  let bodyLines = lines;
  if (/^[#\s]*(?:严选题|600题|660题|辅导讲义|精选题|来源|章节|@)/i.test(firstLine)) {
    bodyLines = lines.slice(1);
  }
  let content = bodyLines.join('\n').trim();

  // 提取题号
  const numMatch = content.match(/^[#\s]*📌\s*题目\s*(\d+)/m);
  let problemNum = numMatch ? parseInt(numMatch[1], 10) : null;

  // 补充 anchor
  if (problemNum) {
    const anchorTag = `<a id="problem-${problemNum}"></a>`;
    if (!content.includes(anchorTag)) {
      content = `${anchorTag}\n\n${content}`;
    }
  }

  // 补充或更新 metadata（所属章节 & 来源题集）
  const finalChapter = chapter || (subjectKey === 'calculus' ? '6. 二重积分' : '5. 特征值与特征向量');
  const finalSource = source || (subjectKey === 'calculus' ? (problemNum && problemNum < 100 ? '严选题' : '600题') : '严选题');

  // 如果题目正文中没有所属章节标记，在标题下方优雅注入
  if (!content.includes('所属章节：')) {
    content = content.replace(/(^[#\s]*📌\s*题目\s*\d+[^\r\n]*)/m, `$1\n所属章节：\`${finalChapter.replace(/^\d+\.\s*/, '')}\` · 来源题集：\`${finalSource}\``);
  }

  // 追加写入目标科目文件
  const destPath = path.join(__dirname, '..', subjectConfig.file);
  let originalDest = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : '';

  const separator = originalDest.endsWith('\n\n---\n\n') ? '' : '\n\n---\n\n';
  const newDestContent = originalDest.trimEnd() + separator + content + '\n';

  fs.writeFileSync(destPath, newDestContent, 'utf8');
  console.log(`✅ [Inbox] 题目 ${problemNum ? 'P.' + problemNum : ''} 已成功按标准规制追加到 【${subjectConfig.name}】（章节：${finalChapter} | 来源：${finalSource}）！`);

  // 清空草稿箱 inbox.md，使其变回空白文件
  fs.writeFileSync(inboxPath, '', 'utf8');
  console.log(`✨ [Inbox] 草稿箱 inbox.md 已自动重置为空白文件，随时迎接下一道题！`);

  return true;
}

module.exports = { processInbox, parseHeaderLine };

if (require.main === module) {
  processInbox();
}
