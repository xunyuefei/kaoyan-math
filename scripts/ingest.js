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

  // 1. 优先判断学科
  if (/线性代数|线代/i.test(t)) {
    subjectKey = 'linalg';
  } else if (/高等数学|高数/i.test(t)) {
    subjectKey = 'calculus';
  }

  // 2. 识别来源题集
  if (/600/i.test(t)) source = '600题';
  else if (/660/i.test(t)) source = '660题';
  else if (/精选/i.test(t)) source = '精选题';
  else if (/严选/i.test(t)) source = '严选题';
  else if (/讲义|辅导/i.test(t)) source = '辅导讲义';

  // 3. 识别中文“第X章”或数字编号
  let chapterIndex = null;
  if (/第一章|第1章/i.test(t)) chapterIndex = 0;
  else if (/第二章|第2章/i.test(t)) chapterIndex = 1;
  else if (/第三章|第3章/i.test(t)) chapterIndex = 2;
  else if (/第四章|第4章/i.test(t)) chapterIndex = 3;
  else if (/第五章|第5章/i.test(t)) chapterIndex = 4;
  else if (/第六章|第6章/i.test(t)) chapterIndex = 5;

  if (chapterIndex !== null) {
    chapter = CANONICAL_CHAPTERS[subjectKey].chapters[chapterIndex];
  } else {
    // 识别具体章节考点名称
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
  }

  // 兜底来源
  if (!source) {
    source = (subjectKey === 'calculus') ? '600题' : '严选题';
  }

  return { source, chapter, subjectKey };
}

// 自动还原被复制压缩到一行的 SOP 标题结构
function formatSopMarkdown(text) {
  let res = text;
  res = res.replace(/\s*(📌\s*题目\s*\d+[:：][^\r\n]*)/g, '\n\n### $1\n\n');
  res = res.replace(/\s*原题[:：]?\s*/g, '\n\n**原题呈现**：\n');
  res = res.replace(/\s*(第一步[：:]|Layer\s*1)/g, '\n\n#### 第一步：Layer 1 ');
  res = res.replace(/\s*(第二步[：:]|Layer\s*2)/g, '\n\n#### 第二步：Layer 2 ');
  res = res.replace(/\s*(第三步[：:]|Layer\s*3)/g, '\n\n#### 第三步：Layer 3 ');
  res = res.replace(/\s*(第四步[：:]|Layer\s*4)/g, '\n\n#### 第四步：Layer 4 ');
  res = res.replace(/\s*(第五步[：:]|Layer\s*5)/g, '\n\n#### 第五步：Layer 5 ');
  res = res.replace(/\s*(第六步[：:]|Layer\s*6)/g, '\n\n#### 第六步：Layer 6 ');
  res = res.replace(/\s*(正确答案|最终正确答案)[:：]?\s*/g, '\n\n🎯 **最终正确答案**：\n');
  return res.trim();
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

  // 支持草稿箱中同时存在多块题目（以学科/章节指示行分割）
  // 识别带有 “高数/线代/严选题/600题/660题/辅导讲义/精选题/第X章” 的指示行
  const lines = raw.split(/\r?\n/);
  const sections = [];
  let currentHeader = '';
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;

    const isIndicator = /^(?:高数|高等数学|线性代数|线代|严选题|600题|660题|辅导讲义|精选题)/i.test(l) &&
                        !l.includes('📌 题目') && !l.includes('原题');

    if (isIndicator) {
      if (currentLines.length > 0) {
        sections.push({ header: currentHeader, text: currentLines.join('\n') });
        currentLines = [];
      }
      currentHeader = l;
    } else {
      currentLines.push(lines[i]);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ header: currentHeader, text: currentLines.join('\n') });
  }

  if (sections.length === 0) {
    return false;
  }

  sections.forEach((sec, idx) => {
    const { source, chapter, subjectKey } = parseHeaderLine(sec.header || '高数 600题');
    const subjectConfig = CANONICAL_CHAPTERS[subjectKey];

    let content = formatSopMarkdown(sec.text);

    // 提取题号（可能包含多道题）
    const problemChunks = content.split(/(?=(?:<a id="problem-\d+"><\/a>|###\s*📌\s*题目\s*\d+|📌\s*题目\s*\d+))/);

    problemChunks.forEach(chunk => {
      let problemContent = chunk.trim();
      if (!problemContent) return;

      const numMatch = problemContent.match(/📌\s*题目\s*(\d+)/m);
      let problemNum = numMatch ? parseInt(numMatch[1], 10) : null;

      // 如果未写题号，自动计算目标文件中已有题目的最大序号 + 1
      const destPath = path.join(__dirname, '..', subjectConfig.file);
      let originalDest = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : '';

      if (!problemNum) {
        const existingNums = (originalDest.match(/📌\s*题目\s*(\d+)/g) || []).map(m => parseInt(m.match(/\d+/)[0], 10));
        problemNum = existingNums.length ? Math.max(...existingNums) + 1 : 1;
        problemContent = `### 📌 题目 ${problemNum}：${problemContent}\n`;
      }

      // 补充 anchor
      const anchorTag = `<a id="problem-${problemNum}"></a>`;
      if (!problemContent.includes(anchorTag)) {
        problemContent = `${anchorTag}\n\n${problemContent}`;
      }

      // 补充或更新 metadata
      const finalChapter = chapter || (subjectKey === 'calculus' ? '6. 二重积分' : '5. 特征值与特征向量');
      const finalSource = source || (subjectKey === 'calculus' ? (problemNum < 100 ? '严选题' : '600题') : '严选题');

      if (!problemContent.includes('所属章节：')) {
        problemContent = problemContent.replace(/(^[#\s]*📌\s*题目\s*\d+[^\r\n]*)/m, `$1\n所属章节：\`${finalChapter}\` · 来源题集：\`${finalSource}\``);
      }

      // 追加写入
      const separator = originalDest.endsWith('\n\n---\n\n') ? '' : '\n\n---\n\n';
      const newDestContent = originalDest.trimEnd() + separator + problemContent + '\n';

      fs.writeFileSync(destPath, newDestContent, 'utf8');
      console.log(`✅ [Inbox] 题目 P.${problemNum} 已成功追加至【${subjectConfig.name}】（${finalChapter} | ${finalSource}）！`);
    });
  });

  // 清空草稿箱 inbox.md
  fs.writeFileSync(inboxPath, '', 'utf8');
  console.log(`✨ [Inbox] 草稿箱 inbox.md 已自动重置为空白文件！`);

  return true;
}

module.exports = { processInbox, parseHeaderLine, formatSopMarkdown };

if (require.main === module) {
  processInbox();
}
