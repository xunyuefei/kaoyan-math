const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const today = new Date().toISOString().split('T')[0];

let hasErrors = false;

// 用户官方唯一标准大纲与题集体系
const TAXONOMY = {
  calculus: {
    chapters: [
      '1. 函数与极限',
      '2. 一元函数微分',
      '3. 一元函数积分',
      '4. 常微分方程',
      '5. 多元函数微分',
      '6. 二重积分'
    ],
    sources: ['辅导讲义', '600题', '精选题', '严选题']
  },
  linalg: {
    chapters: [
      '1. 行列式',
      '2. 矩阵',
      '3. n维向量',
      '4. 线性方程组',
      '5. 特征值与特征向量',
      '6. 二次型'
    ],
    sources: ['辅导讲义', '660题', '严选题']
  }
};

// 标准化章节映射
function normalizeChapter(rawText, subjectId) {
  const text = (rawText || '').trim();
  if (subjectId === 'calculus') {
    if (/二重积分/i.test(text)) return '6. 二重积分';
    if (/多元函数微分|多元微分/i.test(text)) return '5. 多元函数微分';
    if (/常微分方程|微分方程/i.test(text)) return '4. 常微分方程';
    if (/一元函数积分|一元积分/i.test(text)) return '3. 一元函数积分';
    if (/一元函数微分|一元微分/i.test(text)) return '2. 一元函数微分';
    if (/函数与极限|极限/i.test(text)) return '1. 函数与极限';
    // 默认高数当前均为二重积分专项
    return '6. 二重积分';
  } else {
    if (/二次型/i.test(text)) return '6. 二次型';
    if (/特征值|特征向量/i.test(text)) return '5. 特征值与特征向量';
    if (/线性方程组|方程组/i.test(text)) return '4. 线性方程组';
    if (/n维向量|向量组|向量/i.test(text)) return '3. n维向量';
    if (/矩阵/i.test(text)) return '2. 矩阵';
    if (/行列式/i.test(text)) return '1. 行列式';
    // 默认线代当前均为特征值与特征向量专项
    return '5. 特征值与特征向量';
  }
}

// 标准化来源题集映射
function normalizeSource(rawText, num, subjectId) {
  const text = (rawText || '').trim();
  if (/600/i.test(text)) return '600题';
  if (/660/i.test(text)) return '660题';
  if (/精选/i.test(text)) return '精选题';
  if (/严选/i.test(text)) return '严选题';
  if (/讲义|辅导/i.test(text)) return '辅导讲义';

  // 兜底规则（依用户约定：高数小于100为严选题，大于100为600题；线代为严选题）
  if (subjectId === 'calculus') {
    return num < 100 ? '严选题' : '600题';
  } else {
    return '严选题';
  }
}

manifest.subjects.forEach(subject => {
  const filePath = path.join(__dirname, '..', subject.file);
  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31m[Error]\x1b[0m 找不到文件: ${filePath}`);
    return;
  }
  
  const md = fs.readFileSync(filePath, 'utf8');
  const parts = md.split(/(?:<a id="problem-\d+"><\/a>|<div id="problem-\d+"><\/div>)/);
  const parsedProblems = [];
  
  for (let i = 1; i < parts.length; i++) {
    const raw = parts[i];
    const titleMatch = raw.match(/^[#\s]*📌\s*题目\s*(\d+)[:：]\s*([^\r\n]+)/m);
    
    if (!titleMatch) {
      console.warn(`\x1b[33m[Warning]\x1b[0m 发现一处缺失标题格式或未以 "📌 题目" 开头的块，在 ${subject.file}`);
      hasErrors = true;
      continue;
    }
    
    const num = parseInt(titleMatch[1], 10);
    const title = titleMatch[2].trim();
    const anchor = 'problem-' + num;
    
    // 提取章节
    let chapterRaw = '';
    const chapterMatch = raw.match(/(?:所属章节|章节)[：:]\s*`?([^`\r\n·]+)`?/);
    if (chapterMatch) {
      chapterRaw = chapterMatch[1].trim();
    }
    const chapter = normalizeChapter(chapterRaw, subject.id);
    
    // 提取来源题集
    let sourceRaw = '';
    const sourceMatch = raw.match(/(?:来源题集|来源|题集)[：:]\s*`?([^`\r\n·]+)`?/);
    if (sourceMatch) {
      sourceRaw = sourceMatch[1].trim();
    }
    const source = normalizeSource(sourceRaw, num, subject.id);
    
    const tagMatch = raw.match(/题型标签[：:]\s*([^\r\n·]+)/);
    const tags = tagMatch ? tagMatch[1].replace(/`/g, '').split(/[\/、]/).map(t => t.trim()).filter(Boolean) : [];
    
    if (!tagMatch) {
      console.warn(`\x1b[33m[Warning]\x1b[0m 题目 P.${num} (${title}) 缺少 "题型标签："`);
      hasErrors = true;
    }
    
    const stemMatch = raw.match(/\*\*原题呈现\*\*[:：]?/);
    if (!stemMatch) {
      console.warn(`\x1b[33m[Warning]\x1b[0m 题目 P.${num} (${title}) 缺少 "**原题呈现**" 标记`);
      hasErrors = true;
    }
    
    const stepMatch = raw.match(/(?:####? 第[一1]步|###? 第[一1]步)/);
    if (!stepMatch) {
      console.warn(`\x1b[33m[Warning]\x1b[0m 题目 P.${num} (${title}) 未检测到 "#### 第一步" (SOP 起点)`);
      hasErrors = true;
    }
    
    parsedProblems.push({ num, title, chapter, source, tags, anchor });
  }
  
  // 合并到现有的 batches 中
  const existingBatches = subject.batches || [];
  
  // 记录已有题目的所属日期
  const existingNumToBatch = {};
  existingBatches.forEach(b => {
    b.problems.forEach(p => {
      existingNumToBatch[p.num] = b.date;
    });
  });
  
  // 筛选新题
  const newProblems = [];
  parsedProblems.forEach(p => {
    if (!existingNumToBatch[p.num]) {
      newProblems.push(p);
      console.log(`\x1b[36m[Info]\x1b[0m 发现新题：P.${p.num} - ${p.title}，归入【${p.chapter} | ${p.source}】，自动归档至 ${today}`);
    }
  });
  
  // 重建 batches（更新已有题目的标题、章节、来源和标签）
  const newBatchesMap = {};
  existingBatches.forEach(b => {
    newBatchesMap[b.date] = { date: b.date, problems: [] };
  });
  
  parsedProblems.forEach(p => {
    const date = existingNumToBatch[p.num] || today;
    if (!newBatchesMap[date]) {
      newBatchesMap[date] = { date, problems: [] };
    }
    newBatchesMap[date].problems.push(p);
  });
  
  // 将新题放入今天的 batch
  if (newProblems.length > 0) {
    if (!newBatchesMap[today]) {
      newBatchesMap[today] = { date: today, problems: [] };
    }
    newProblems.forEach(np => {
      if (!newBatchesMap[today].problems.some(p => p.num === np.num)) {
        newBatchesMap[today].problems.push(np);
      }
    });
  }
  
  // 转换回数组，并按日期升序排列
  const sortedDates = Object.keys(newBatchesMap).sort();
  const finalBatches = sortedDates.map(date => {
    const batch = newBatchesMap[date];
    // batch 内题目按题号升序
    batch.problems.sort((a, b) => a.num - b.num);
    return batch;
  });
  
  subject.batches = finalBatches;
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// 自动更新 index.html 与 preview.html 的资源时间戳，彻底防止浏览器与 GitHub CDN 强缓存
try {
  const ver = Date.now().toString(36);
  const root = path.join(__dirname, '..');
  ['index.html', 'preview.html'].forEach(f => {
    const fp = path.join(root, f);
    if (fs.existsSync(fp)) {
      let content = fs.readFileSync(fp, 'utf8');
      content = content.replace(/preview\.css\?v=[^"']+/g, `preview.css?v=${ver}`);
      content = content.replace(/preview\.js\?v=[^"']+/g, `preview.js?v=${ver}`);
      fs.writeFileSync(fp, content, 'utf8');
    }
  });
  console.log(`\x1b[32m[CacheBuster]\x1b[0m 已自动更新前端资源时间戳: v=${ver}`);
} catch (_) {}

if (hasErrors) {
  console.log(`\n\x1b[33m[Done]\x1b[0m 同步完成！已更新 manifest.json。但请检查上方列出的 \x1b[33m[Warning]\x1b[0m 格式问题。`);
} else {
  console.log(`\n\x1b[32m[Success]\x1b[0m 同步完成！所有题目已严格遵循用户标准大纲（章节 & 题集）规制，manifest.json 已更新。`);
}

