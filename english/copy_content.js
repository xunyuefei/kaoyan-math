const fs = require('fs');
const path = require('path');

const src = 'c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版\\md_output';
const dst = 'c:\\Users\\31085\\Desktop\\数学练习产出Note\\english\\content';

// 确保目标目录存在
if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });

// 复制 22 个 List
for (let i = 1; i <= 22; i++) {
    const num = String(i).padStart(2, '0');
    const srcFile = path.join(src, `红宝书 List ${num} 全景深度特训讲义_精排版.html`);
    const dstFile = path.join(dst, `list-${num}.html`);
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, dstFile);
        console.log(`✅ Copied: list-${num}.html (${(fs.statSync(dstFile).size / 1024).toFixed(0)} KB)`);
    } else {
        console.log(`❌ MISSING: ${srcFile}`);
    }
}

// 复制词组特训 (话题特训)
const topicSrc = path.join(src, '红宝书全景话题特训讲义_精排版.html');
if (fs.existsSync(topicSrc)) {
    fs.copyFileSync(topicSrc, path.join(dst, 'topics.html'));
    console.log(`✅ Copied: topics.html (${(fs.statSync(topicSrc).size / 1024).toFixed(0)} KB)`);
}

// 复制阅读情感态度
const readSrc = path.join(src, '红宝书阅读情感态度全景特训讲义_精排版.html');
if (fs.existsSync(readSrc)) {
    fs.copyFileSync(readSrc, path.join(dst, 'reading.html'));
    console.log(`✅ Copied: reading.html (${(fs.statSync(readSrc).size / 1024).toFixed(0)} KB)`);
}

console.log('\n🎉 All done!');
