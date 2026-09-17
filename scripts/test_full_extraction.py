import os, sys, glob, re, json

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import (
    load_official_words, find_batch_file, extract_section_content, clean_txt, ROOT_PREFIX_DB,
    CURATED_MISSING_WRITING
)

mineru_official = load_official_words()
l_words = mineru_official[23]

bf = find_batch_file(23, 4)
with open(bf, encoding='utf-8', errors='ignore') as fp:
    raw_txt = fp.read()

txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}\d+\.\d+\s+[a-zA-Z])', r'\1\n\n\2', raw_txt)
txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}NO\.\s*\d+)', r'\1\n\n\2', txt)
txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(#{1,6}\s+[a-zA-Z\d])', r'\1\n\n\2', txt)

m_sec = re.search(r'(?:^|\n)\s*(?:#{1,6}\s+|\d+\.\s+|[一二三四五]、\s*)?[🔵🔴]?\s*(?:第二阶段|第二模块|第二部分|写译核心词|写译核心词组|写译核心)', txt)
writing_start_pos = m_sec.start() if m_sec else len(txt)

b_words = [l_words[no] for no in range(46, 61)]

positions = []
for w_item in b_words:
    w_str = w_item['word']
    no_int = int(w_item['no'])
    
    candidates = []
    for m in re.finditer(r'(?:^|\n)([^\n]+)', txt):
        line = m.group(1).strip()
        if line.startswith(('-', '*', '>', '|', '+')):
            continue
        if len(line) > 120:
            continue
        
        has_no = bool(re.search(rf'\bNO\.\s*{no_int}\b', line, re.I))
        has_word = bool(re.search(rf'\b{re.escape(w_str)}\b', line, re.I))
        is_header = bool(re.match(r'^(?:#{1,6}|\d+\.|\d+\.\d+|NO\.)', line) or line.lower().startswith(w_str.lower()))
        
        score = 0
        if has_no and has_word: 
            score = 100
        elif has_no and is_header: 
            score = 80
        elif has_word and is_header:
            other_no = re.search(r'\bNO\.\s*(\d+)\b', line, re.I)
            if other_no and int(other_no.group(1)) != no_int:
                score = 0
            else:
                score = 50
        
        if score > 0:
            candidates.append((score, m.start(1), line))
            
    candidates.sort(key=lambda x: (-x[0], x[1]))
    if candidates:
        positions.append((candidates[0][1], w_item))

positions.sort(key=lambda x: x[0])
distinct_starts = sorted(list(set(p[0] for p in positions)))

word_to_block = {}
word_to_is_writing = {}
for p_start, w_item in positions:
    next_starts = [s for s in distinct_starts if s > p_start]
    p_end = min(next_starts) if next_starts else len(txt)
    w_str = w_item['word'].lower()
    word_to_block[w_str] = txt[p_start:p_end]
    word_to_is_writing[w_str] = p_start >= writing_start_pos

# Now simulate extraction for all 15 words in List 23 Batch 4
results = []
for no_int in range(46, 61):
    w_item = l_words[no_int]
    w = w_item['word']
    pos = w_item['pos']
    mean = w_item['meaning']
    w_lower = w.lower()

    block = word_to_block.get(w_lower, "")
    is_writing = word_to_is_writing.get(w_lower, None)
    if is_writing is None:
        is_writing = True if (no_int - 1) % 15 >= 4 else False

    # Extract root
    root = extract_section_content(block, [
        r'(?:词源与底层语义|词源与科学记忆|词根解构|底层语义|硬核词源|科学记忆|底层语义与核心图式|介词/副词搭配机理 & 记忆挂钩|词根底层语义|词源 purified & 科学记忆|词源拆解|词根拆解|词源解码|语言学词源解构|词源分析|词源与核心逻辑|记忆逻辑)'
    ], [
        r'考研', r'核心', r'僻义', r'阅读', r'命题', r'真题', r'高质量', r'适用'
    ])
    if not root:
        root = f"词源核心素 {w}，经学术语境历史演进，直击考研核心概念：{mean}。"

    if not is_writing:
        rp = extract_section_content(block, [
            r'(?:考研真题)?(?:阅读考点与命题陷阱|阅读考点与逻辑陷阱|考点与逻辑陷阱|考点解析|阅读深度解析|阅读考点|命题点|真题深度解析|真题考点)'
        ], [
            r'命题陷阱', r'干扰项', r'陷阱', r'#####', r'###', r'NO\.', r'---', r'【'
        ])
        if not rp:
            # Check if there is 态度题专攻 directly
            m_att = re.search(r'态度题专攻[：:]\s*(.*?)(?=\n-|\n[1-9]|\n【|\Z)', block, re.S)
            if m_att:
                rp = m_att.group(0).strip()
            else:
                rp = "考研阅读事实论据向观点推演的核心定位词。在英一/英二事实细节题中常作为锁定题干事实的关键线索。"

        traps = extract_section_content(block, [
            r'(?:命题陷阱|干扰陷阱|逻辑陷阱|设错规律|干扰项分析|干扰拦截)'
        ], [
            r'#####', r'###', r'NO\.', r'---', r'【'
        ])
        if not traps:
            traps = "干扰项常设'偷换概念'或'正反颠倒'。注意紧扣段落核心主题句，避免范围被选项过度泛化。"

        att_str, att_cls = "⚪ 中立", "neu"
        all_text = mean + " " + block + " " + traps
        if any(k in all_text for k in ["褒义", "正向", "积极", "赞同", "支持", "推崇", "优势", "健全", "健康", "成功", "安全", "明智", "提升"]):
            att_str, att_cls = "🟢 正向/褒义", "pos"
        elif any(k in all_text for k in ["负向", "贬义", "批判", "质疑", "消极", "陷阱", "自私", "迟缓", "破坏", "危害", "暴力", "危机", "违背", "强负极"]):
            att_str, att_cls = "🔴 负向/警惕", "neg"
        elif any(k in all_text for k in ["偏见", "警告", "过度", "谨慎", "保留"]):
            att_str, att_cls = "⚠️ 警惕/偏见", "warn"

        results.append({
            "no": f"{no_int:02d}", "word": w, "type": "reading",
            "root": root, "reading_points": rp, "traps": traps, "attitude": att_str
        })
    else:
        en = extract_section_content(block, [
            r'(?:英文)?(?:高质量|高分|实战|真题)?(?:适配)?(?:例句|Sentence|Example)'
        ], [
            r'中文', r'翻译', r'译文', r'Translation', r'【'
        ])
        zh = extract_section_content(block, [
            r'(?:中文)?(?:对照)?(?:例句)?(?:翻译|译文|Translation)'
        ], [
            r'#####', r'###', r'NO\.', r'---', r'【'
        ])
        coll = extract_section_content(block, [
            r'(?:核心)?(?:高分|高阶|提分|实战)?(?:适配)?(?:搭配)?(?:磁链|词链|搭配)'
        ], [
            r'真题', r'替换', r'同义', r'适用', r'场景', r'例句', r'Sentence', r'【'
        ])
        syn = extract_section_content(block, [
            r'(?:真题对齐)?(?:同义)?(?:替换)?(?:扩展)?(?:大礼包|拓展|礼包|通路|策略|替换)'
        ], [
            r'适用', r'场景', r'题型', r'例句', r'Sentence', r'【'
        ])
        scen = extract_section_content(block, [
            r'(?:🎬[ \t]*)?(?:适用场景|适用题型|实战场景|英二专属场景|英二专属写译场景适配|写译场景适配|实战场景适配|场景描述)'
        ], [
            r'高质量', r'高分例句', r'实战例句', r'真题例句', r'适配例句', r'例句', r'Sentence', r'Example', r'【'
        ])
        results.append({
            "no": f"{no_int:02d}", "word": w, "type": "writing",
            "coll": coll, "syn": syn, "scen": scen, "en": en, "zh": zh
        })

print("STEER:")
print(json.dumps([r for r in results if r['word'] == 'steer'][0], ensure_ascii=False, indent=2))
print("\nSTERN:")
print(json.dumps([r for r in results if r['word'] == 'stern'][0], ensure_ascii=False, indent=2))
