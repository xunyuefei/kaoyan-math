const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const today = new Date().toISOString().split('T')[0];

let hasErrors = false;

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
    const titleMatch = raw.match(/^[#\s]*📌\s*题目\s*(\d+)[:：]\s*([^\n]+)/m);
    
    if (!titleMatch) {
      console.warn(`\x1b[33m[Warning]\x1b[0m 发现一处缺失标题格式或未以 "📌 题目" 开头的块，在 ${subject.file}`);
      hasErrors = true;
      continue;
    }
    
    const num = parseInt(titleMatch[1], 10);
    const title = titleMatch[2].trim();
    const anchor = 'problem-' + num;
    
    const tagMatch = raw.match(/题型标签[：:]\s*([^\n\r]+)/);
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
    
    parsedProblems.push({ num, title, tags, anchor });
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
      console.log(`\x1b[36m[Info]\x1b[0m 发现新题：P.${p.num} - ${p.title}，自动归档至 ${today}`);
    }
  });
  
  // 重建 batches（更新已有题目的标题和标签）
  const newBatchesMap = {};
  existingBatches.forEach(b => {
    newBatchesMap[b.date] = { date: b.date, problems: [] };
  });
  
  parsedProblems.forEach(p => {
    const date = existingNumToBatch[p.num];
    if (date) {
      newBatchesMap[date].problems.push(p);
    }
  });
  
  // 将新题放入今天的 batch
  if (newProblems.length > 0) {
    if (!newBatchesMap[today]) {
      newBatchesMap[today] = { date: today, problems: [] };
    }
    newBatchesMap[today].problems.push(...newProblems);
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

if (hasErrors) {
  console.log(`\n\x1b[33m[Done]\x1b[0m 同步完成！已更新 manifest.json。但请检查上方列出的 \x1b[33m[Warning]\x1b[0m 格式问题。`);
} else {
  console.log(`\n\x1b[32m[Success]\x1b[0m 同步完成！题目格式全部规范，manifest.json 已更新。`);
}
