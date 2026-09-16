const fs = require('fs');
const path = require('path');

const vocabSrc = 'c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版\\md_output';
const phraseSrc = 'c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版\\四六级常考词组讲义\\output';
const contentDst = path.join(__dirname, 'content');

if (!fs.existsSync(contentDst)) fs.mkdirSync(contentDst, { recursive: true });

function copyIfNewer(srcFile, dstFile) {
  if (!fs.existsSync(srcFile)) return false;
  if (!fs.existsSync(dstFile)) {
    fs.copyFileSync(srcFile, dstFile);
    return true;
  }
  const sStat = fs.statSync(srcFile);
  const dStat = fs.statSync(dstFile);
  if (sStat.mtimeMs > dStat.mtimeMs || sStat.size !== dStat.size) {
    fs.copyFileSync(srcFile, dstFile);
    return true;
  }
  return false;
}

const manifest = {
  vocabLists: [],
  phraseLists: [],
  specials: []
};

// 1. 扫描红宝书单词 List (1~50)
for (let i = 1; i <= 50; i++) {
  const num = String(i).padStart(2, '0');
  const srcFile = path.join(vocabSrc, `红宝书 List ${num} 全景深度特训讲义_精排版.html`);
  const dstFile = path.join(contentDst, `list-${num}.html`);
  const exists = fs.existsSync(srcFile);
  if (exists) {
    const updated = copyIfNewer(srcFile, dstFile);
    if (updated) console.log(`[增量更新] 红宝书 List ${num}`);
  }
  // 只要本地已存在或者源文件存在就算就绪
  const ready = exists || fs.existsSync(dstFile);
  manifest.vocabLists.push({
    id: `list-${num}`,
    num: num,
    label: `List ${num}`,
    sublabel: `60 词 · 4 Batch · 精排版`,
    file: `content/list-${num}.html`,
    type: 'vocab',
    ready: ready
  });
}

// 2. 扫描四六级常考词组 List (1~30)
for (let i = 1; i <= 30; i++) {
  const num = String(i).padStart(2, '0');
  const srcFile = path.join(phraseSrc, `四六级常考词组 List ${num} 深度特训讲义_精排版.html`);
  const dstFile = path.join(contentDst, `phrase-list-${num}.html`);
  const exists = fs.existsSync(srcFile);
  if (exists) {
    const updated = copyIfNewer(srcFile, dstFile);
    if (updated) console.log(`[增量更新] 词组 List ${num}`);
  }
  const ready = exists || fs.existsSync(dstFile);
  manifest.phraseLists.push({
    id: `phrase-${num}`,
    num: num,
    label: `词组 List ${num}`,
    sublabel: `常考词组 · 深度精排`,
    file: `content/phrase-list-${num}.html`,
    type: 'phrase',
    ready: ready
  });
}

// 3. 扫描特训专区 (话题、阅读态度等)
const specialConfigs = [
  { id: 'topics', num: '话题', label: '全景话题特训', sublabel: '主题词群 · 场景关联', srcName: '红宝书全景话题特训讲义_精排版.html', dstName: 'topics.html' },
  { id: 'reading', num: '态势', label: '阅读情感态度特训', sublabel: '情感词 · 态度判断', srcName: '红宝书阅读情感态度全景特训讲义_精排版.html', dstName: 'reading.html' }
];

specialConfigs.forEach(item => {
  const srcFile = path.join(vocabSrc, item.srcName);
  const dstFile = path.join(contentDst, item.dstName);
  const exists = fs.existsSync(srcFile);
  if (exists) {
    const updated = copyIfNewer(srcFile, dstFile);
    if (updated) console.log(`[增量更新] 特训: ${item.label}`);
  }
  manifest.specials.push({
    id: item.id,
    num: item.num,
    label: item.label,
    sublabel: item.sublabel,
    file: `content/${item.dstName}`,
    type: 'special',
    ready: exists || fs.existsSync(dstFile)
  });
});

// 写入 manifest.json 供前端读取
fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('✅ 英语讲义大纲清单 manifest.json 生成完毕！');
