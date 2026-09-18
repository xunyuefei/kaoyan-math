/**
 * ai-ingest.js — DeepSeek API 驱动的智能入库引擎
 * 
 * 读取 inbox.md → 调用 DeepSeek API 进行 6 层 SOP 学术重构 → 写入 content/ 数据库
 * 
 * 用法：node scripts/ai-ingest.js
 */

const fs = require('fs');
const path = require('path');

// ─── 加载 .env 中的 API Key ───
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}
loadEnv();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const inboxPath = path.join(__dirname, '..', 'inbox.md');
const contentDir = path.join(__dirname, '..', 'content');

// ─── 用户大纲标准定义 ───
const TAXONOMY = {
  calculus: {
    name: '高等数学',
    file: '高等数学_题解集.md',
    chapters: ['函数与极限', '一元函数微分', '一元函数积分', '常微分方程', '多元函数微分', '二重积分'],
    sources: ['辅导讲义', '660题', '精选题', '严选题']
  },
  linalg: {
    name: '线性代数',
    file: '线性代数_题解集.md',
    chapters: ['行列式', '矩阵', 'n维向量', '线性方程组', '特征值与特征向量', '二次型'],
    sources: ['辅导讲义', '660题', '严选题']
  }
};

// ─── 从首行提取来源与章节 ───
function parseFirstLine(line) {
  const t = line.trim();
  let source = '', chapter = '', subjectKey = '';

  // 识别来源题集
  if (/660|600/.test(t)) source = '660题';
  else if (/精选/.test(t)) source = '精选题';
  else if (/严选/.test(t)) source = '严选题';
  else if (/讲义|辅导/.test(t)) source = '辅导讲义';

  // 预判学科
  if (/线代|线性代数/.test(t)) {
    subjectKey = 'linalg';
  } else if (/高数|高等数学/.test(t)) {
    subjectKey = 'calculus';
  }

  // 识别章节（按关键字）
  if (/二重积分/.test(t)) { chapter = '二重积分'; subjectKey = 'calculus'; }
  else if (/多元函数微分|多元微分/.test(t)) { chapter = '多元函数微分'; subjectKey = 'calculus'; }
  else if (/常微分方程|微分方程/.test(t)) { chapter = '常微分方程'; subjectKey = 'calculus'; }
  else if (/一元函数积分|一元积分/.test(t)) { chapter = '一元函数积分'; subjectKey = 'calculus'; }
  else if (/一元函数微分|一元微分/.test(t)) { chapter = '一元函数微分'; subjectKey = 'calculus'; }
  else if (/函数与极限|极限/.test(t)) { chapter = '函数与极限'; subjectKey = 'calculus'; }
  else if (/二次型/.test(t)) { chapter = '二次型'; subjectKey = 'linalg'; }
  else if (/特征值|特征向量/.test(t)) { chapter = '特征值与特征向量'; subjectKey = 'linalg'; }
  else if (/线性方程组|方程组/.test(t)) { chapter = '线性方程组'; subjectKey = 'linalg'; }
  else if (/n维向量|向量组|向量/.test(t)) { chapter = 'n维向量'; subjectKey = 'linalg'; }
  else if (/矩阵/.test(t)) { chapter = '矩阵'; subjectKey = 'linalg'; }
  else if (/行列式/.test(t)) { chapter = '行列式'; subjectKey = 'linalg'; }

  // 识别章节（按“第X章”数字映射）
  if (!chapter) {
    const chapNumMatch = t.match(/第\s*([一二三四五六1-6])\s*章/);
    if (chapNumMatch) {
      const char = chapNumMatch[1];
      const idxMap = { '一': 0, '1': 0, '二': 1, '2': 1, '三': 2, '3': 2, '四': 3, '4': 3, '五': 4, '5': 4, '六': 5, '6': 5 };
      const idx = idxMap[char];
      if (idx !== undefined) {
        const targetSubKey = subjectKey || 'calculus';
        chapter = TAXONOMY[targetSubKey].chapters[idx];
      }
    }
  }

  // 若无法从章节名判断学科，则从来源推断
  if (!subjectKey) {
    if (/660/.test(t) || /线代|线性代数/.test(t)) subjectKey = 'linalg';
    else subjectKey = 'calculus';
  }

  return { source, chapter, subjectKey };
}

// ─── 获取目标文件中已有的最大题号 ───
function getMaxProblemNum(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const nums = (content.match(/📌\s*题目\s*(\d+)/g) || []).map(m => parseInt(m.match(/\d+/)[0], 10));
  return nums.length ? Math.max(...nums) : 0;
}

// ─── 构建 System Prompt ───
function buildSystemPrompt(source, chapter, subjectKey, existingMaxNum) {
  const subjectName = TAXONOMY[subjectKey].name;

  return `你是一位考研数学高级题解专家。用户会给你一道或多道考研数学题目（可能是原题、也可能附带部分解答思路），你需要将每一道题目严格重构为以下【6层 SOP 学术典藏结构】的标准 Markdown 格式。

## 严格输出规范
1. 所属章节为：\`${chapter}\`，来源题集为：\`${source}\`，学科为：${subjectName}。
2. 若用户输入中自带原始题号（如 "38."、"39."、"题5"），必须优先采用用户的原始题号；仅在用户完全未标号时，才从 ${existingMaxNum + 1} 开始递增分配题号。
3. 若用户一次发送多道题，必须逐道拆分成完全独立的卡片块，严禁合并。
4. 所有 \`#### 第X步：Layer X ...\` 标题必须独占一行，标题后必须换行再写正文，严禁标题与正文同行。
5. 微元符号必须加窄空格与正体：\\, \\mathrm{d}x。长公式使用独立公式块 $$ ... $$。
6. 矩阵用 \\begin{pmatrix}，行列式用 \\begin{vmatrix}。

## 每道题的标准输出模板

\`\`\`
<a id="problem-[题号]"></a>

### 📌 题目 [题号]：[简明题目标题]
所属章节：\`${chapter}\` · 来源题集：\`${source}\`
题型标签：\`[考点1]\` / \`[考点2]\` / \`[考点3]\`

**原题呈现**：
[完整原题，LaTeX 规范]

> 💡 **核心突破手眼法**：
> IF**: [题干特征识别]
> THEN**: [直击秒杀切入点]

#### 第一步：Layer 1 代数表征（识别考卷符号）
[符号结构、代数形式拆解]

#### 第二步：Layer 2 语义逻辑（直击几何/物理本质或代数同构）
[本质特征、几何构型、对称性]

#### 第三步：Layer 3 教科书目标（精准对接讲义考点）
[讲义考点对接]

#### 第四步：Layer 4 认知路径（【等价性是如何建立的？】法理本质与最优路径推导）
[等价链条推导]

#### 第五步：Layer 5 演算落地（最优化计算工程）
[最简算力落地过程]

#### 第六步：Layer 6 题型升维（【一题多变与陷阱防线】）
[易错防线与延伸变式]

🎯 **最终正确答案**：
$$[最终标准答案]$$

[🔝 返回目录](#toc)

---
\`\`\`

## 关键要求
- 直接输出纯 Markdown 文本，不要用代码围栏包裹整体输出
- 每道题之间用 \`---\` 分隔
- 数学推导必须严谨正确，不允许有计算错误
- 每一层的内容必须详实、有深度，不是敷衍的一两句话`;
}

// ─── 调用 DeepSeek API ───
async function callDeepSeekAPI(systemPrompt, userContent) {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === '你的API密钥填这里') {
    console.error('❌ [AI Ingest] 未配置 DeepSeek API Key！');
    console.error('   请打开 .env 文件，将 DEEPSEEK_API_KEY 替换为你的真实 API Key。');
    console.error('   获取地址：https://platform.deepseek.com');
    process.exit(1);
  }

  console.log('🧠 [AI Ingest] 正在调用 DeepSeek API 进行 SOP 学术重构...');
  console.log('   （预计耗时 10~30 秒，取决于题目数量与网络状况）\n');

  const requestBody = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 8192,
    stream: false
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [AI Ingest] DeepSeek API 返回错误 (HTTP ${response.status}):`);
    console.error(errorText);
    process.exit(1);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    console.error('❌ [AI Ingest] DeepSeek API 返回格式异常:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const result = data.choices[0].message.content;
  const usage = data.usage || {};
  console.log(`✅ [AI Ingest] DeepSeek API 返回成功！`);
  console.log(`   Token 消耗：prompt=${usage.prompt_tokens || '?'}, completion=${usage.completion_tokens || '?'}, total=${usage.total_tokens || '?'}`);

  return result;
}

// ─── 主流程 ───
async function aiIngest() {
  // 1. 读取 inbox.md
  if (!fs.existsSync(inboxPath)) {
    return false;
  }
  let raw = fs.readFileSync(inboxPath, 'utf8').trim();
  raw = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!raw) {
    return false;
  }

  console.log('📥 [AI Ingest] 检测到 inbox.md 中有新题目！\n');

  // 2. 解析首行指示
  const lines = raw.split(/\r?\n/);
  const firstLine = lines[0] || '';
  const { source, chapter, subjectKey } = parseFirstLine(firstLine);

  const subjectConfig = TAXONOMY[subjectKey];
  const finalSource = source || (subjectKey === 'calculus' ? '严选题' : '严选题');
  const finalChapter = chapter || (subjectKey === 'calculus' ? '二重积分' : '特征值与特征向量');

  console.log(`📋 [AI Ingest] 识别归属：【${subjectConfig.name}】${finalChapter} · ${finalSource}`);

  // 3. 确定目标文件与已有最大题号
  const targetFile = path.join(contentDir, subjectConfig.file);
  const maxNum = getMaxProblemNum(targetFile);
  console.log(`📊 [AI Ingest] 目标文件：${subjectConfig.file}，当前最大题号：P.${maxNum}\n`);

  // 4. 构建 Prompt 并调用 API
  const systemPrompt = buildSystemPrompt(finalSource, finalChapter, subjectKey, maxNum);

  // 首行是指示行，实际题目内容从第二行开始（如果首行是纯指示行）
  const isIndicatorLine = /^(?:高数|高等数学|线性代数|线代|严选题|600题|660题|辅导讲义|精选题)/i.test(firstLine.trim()) && !firstLine.includes('📌');
  const userContent = isIndicatorLine ? lines.slice(1).join('\n').trim() : raw;

  if (!userContent) {
    console.log('⚠️ [AI Ingest] inbox.md 只有指示行，没有实际题目内容。');
    return false;
  }

  // 查重防御：检查用户输入中的题号是否已存在于目标文件
  const explicitNumMatch = userContent.match(/(?:^|\n)\s*(\d{1,4})\s*\./) || userContent.match(/题目\s*(\d{1,4})/);
  if (explicitNumMatch) {
    const pNum = explicitNumMatch[1];
    const existingContent = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '';
    if (existingContent.includes(`id="problem-${pNum}"`) || existingContent.includes(`### 📌 题目 ${pNum}`)) {
      console.log(`\n⚠️ [AI Ingest] 查重拦截：【${subjectConfig.name}】中已存在【题目 ${pNum}】！`);
      console.log(`   无需重复调用 API 入库，将自动清空 inbox.md。`);
      fs.writeFileSync(inboxPath, '', 'utf8');
      return { success: true, count: 0, anchor: 'problem-' + pNum };
    }
  }

  const aiOutput = await callDeepSeekAPI(systemPrompt, userContent);

  // 5. 清洗 AI 输出（去除可能的代码围栏包裹）
  let cleanOutput = aiOutput.trim();
  if (cleanOutput.startsWith('```markdown')) {
    cleanOutput = cleanOutput.replace(/^```markdown\s*\n?/, '').replace(/\n?```\s*$/, '');
  } else if (cleanOutput.startsWith('```')) {
    cleanOutput = cleanOutput.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // 6. 追加写入目标文件
  let existing = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '';
  const separator = existing.trimEnd().endsWith('---') ? '\n\n' : '\n\n---\n\n';
  const newContent = existing.trimEnd() + separator + cleanOutput.trim() + '\n';
  fs.writeFileSync(targetFile, newContent, 'utf8');

  // 统计写入了多少道题
  const problemCount = (cleanOutput.match(/📌\s*题目\s*\d+/g) || []).length;
  console.log(`\n✨ [AI Ingest] 成功！${problemCount} 道题目已写入【${subjectConfig.name} · ${finalChapter}】`);

  // 提取首个题目 anchor
  const anchorMatch = cleanOutput.match(/<a\s+id="([^"]+)">/);
  const firstAnchor = anchorMatch ? anchorMatch[1] : '';

  // 7. 清空 inbox.md
  fs.writeFileSync(inboxPath, '', 'utf8');
  console.log('🧹 [AI Ingest] inbox.md 已自动清空\n');

  return { success: true, count: problemCount, anchor: firstAnchor };
}

module.exports = { aiIngest };

// 直接执行
if (require.main === module) {
  aiIngest().then(result => {
    if (!result) {
      console.log('ℹ️ [AI Ingest] inbox.md 为空，无需处理。');
    }
  }).catch(err => {
    console.error('❌ [AI Ingest] 执行失败:', err.message);
    process.exit(1);
  });
}
