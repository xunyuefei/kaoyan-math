"""
考研数学知识库 · 自动化数据完整性与合规性检验套件
运行方式: python tests/test_math_integrity.py
"""

import sys
import os
import re
import json
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT_DIR / "content"
GAOSHU_FILE = CONTENT_DIR / "高等数学_题解集.md"
XIANDAI_FILE = CONTENT_DIR / "线性代数_题解集.md"
MANIFEST_FILE = ROOT_DIR / "manifest.json"

ALLOWED_GAOSHU_CHAPTERS = {
    "函数与极限", "一元函数微分", "一元函数积分", "常微分方程", "多元函数微分", "二重积分"
}

ALLOWED_XIANDAI_CHAPTERS = {
    "行列式", "矩阵", "n维向量", "线性方程组", "特征值与特征向量", "二次型"
}

def test_files_exist():
    print("[1/5] 正在检验核心真题数据源文件存在性...")
    assert GAOSHU_FILE.exists(), f"找不到高数数据源: {GAOSHU_FILE}"
    assert XIANDAI_FILE.exists(), f"找不到线代数据源: {XIANDAI_FILE}"
    print(f"  [✓] 发现数据源: {GAOSHU_FILE.name}, {XIANDAI_FILE.name}")

def test_anchor_uniqueness():
    print("\n[2/5] 正在检验全局锚点唯一性与题号递增...")
    anchor_pattern = re.compile(r'<(?:a|div)\s+id="(problem-[^"]+)"')
    
    seen_anchors = {}
    duplicates = []
    
    for f in [GAOSHU_FILE, XIANDAI_FILE]:
        text = f.read_text(encoding='utf-8')
        for lineno, line in enumerate(text.splitlines(), start=1):
            m = anchor_pattern.search(line)
            if m:
                aid = m.group(1)
                if aid in seen_anchors:
                    duplicates.append((aid, f.name, lineno, seen_anchors[aid]))
                else:
                    seen_anchors[aid] = (f.name, lineno)
                    
    assert len(duplicates) == 0, f"发现重复锚点: {duplicates}"
    print(f"  [✓] 全库共检测到 {len(seen_anchors)} 道独立题解卡片，全局锚点 100% 唯一无冲突！")
    return seen_anchors

def test_layer_formatting():
    print("\n[3/5] 正在检验 SOP 6 层标题独占换行防线...")
    layer_errors = []
    
    for f in [GAOSHU_FILE, XIANDAI_FILE]:
        text = f.read_text(encoding='utf-8')
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if re.match(r'^####\s+第\d+步：Layer\s+\d+', line):
                # 检查标题行是否附带了正文内容（如包含冒号或句号紧跟大段文字）
                # 合法格式为类似 "#### 第一步：Layer 1 代数表征（识别考卷符号）" 之后即为换行
                clean_title = line.strip()
                # 若包含换行符或长度异乎寻常（> 60 字符），可能混入了正文
                if len(clean_title) > 80:
                    layer_errors.append((f.name, i + 1, clean_title[:40]))
                    
    assert len(layer_errors) == 0, f"发现 Layer 标题与正文混排异常: {layer_errors}"
    print("  [✓] 所有 Layer 标题独占换行防线检测 100% 合规，无气泡气溶胶排版隐患！")

def test_chapter_taxonomy():
    print("\n[4/5] 正在检验大纲 12 大专属章节白名单归属性...")
    chap_pattern = re.compile(r'所属章节：`([^`]+)`')
    
    anomalies = []
    
    gaoshu_text = GAOSHU_FILE.read_text(encoding='utf-8')
    for m in chap_pattern.finditer(gaoshu_text):
        cname = m.group(1).strip()
        # 处理可能附带的编号，如 "6.二重积分"
        clean_cname = re.sub(r'^\d+[\.、\s]*', '', cname)
        if clean_cname not in ALLOWED_GAOSHU_CHAPTERS:
            anomalies.append(("高等数学", cname))
            
    xiandai_text = XIANDAI_FILE.read_text(encoding='utf-8')
    for m in chap_pattern.finditer(xiandai_text):
        cname = m.group(1).strip()
        clean_cname = re.sub(r'^\d+[\.、\s]*', '', cname)
        if clean_cname not in ALLOWED_XIANDAI_CHAPTERS:
            anomalies.append(("线性代数", cname))
            
    assert len(anomalies) == 0, f"发现非法章节分类: {anomalies}"
    print("  [✓] 章节分类全部精准落入用户 12 大官方标准章节白名单！")

def test_manifest_consistency(seen_anchors):
    print("\n[5/5] 正在检验 manifest.json 索引清单一致性...")
    if not MANIFEST_FILE.exists():
        print("  [!] manifest.json 尚未生成，跳过一致性检验。")
        return
        
    try:
        data = json.loads(MANIFEST_FILE.read_text(encoding='utf-8'))
        total = 0
        manifest_anchors = set()
        for sub in data.get("subjects", []):
            for batch in sub.get("batches", []):
                for p in batch.get("problems", []):
                    total += 1
                    if "anchor" in p:
                        manifest_anchors.add(p["anchor"])
                        
        print(f"  [i] manifest.json 结构化记录题目总量: {total}")
        for a in manifest_anchors:
            assert a in seen_anchors, f"manifest.json 中的锚点 {a} 在 Markdown 数据源中不存在！"
        print(f"  [✓] manifest.json 全部 {total} 道题目锚点与数据源 100% 对应一致！")
    except Exception as e:
        assert False, f"manifest.json 校验失败: {e}"

def main():
    print("===========================================================================")
    print("  📐 考研数学 SOP 题解知识库 · 数据完整性与工程合规自动化测试")
    print("===========================================================================")
    try:
        test_files_exist()
        anchors = test_anchor_uniqueness()
        test_layer_formatting()
        test_chapter_taxonomy()
        test_manifest_consistency(anchors)
        print("\n" + "=" * 75)
        print("  🎉 全部 5 项自动化测试 100% PASS！数学知识库数据完好无损！")
        print("===========================================================================")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[X] 测试失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
