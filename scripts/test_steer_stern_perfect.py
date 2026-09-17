import os, sys, glob, re, json

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import load_official_words, find_batch_file, clean_txt

mineru_official = load_official_words()
l_words = mineru_official[23]
b_words = [l_words[no] for no in range(46, 61)]

bf = find_batch_file(23, 4)
with open(bf, encoding='utf-8', errors='ignore') as fp:
    raw_txt = fp.read()

txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}\d+\.\d+\s+[a-zA-Z])', r'\1\n\n\2', raw_txt)
txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}NO\.\s*\d+)', r'\1\n\n\2', txt)
txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(#{1,6}\s+[a-zA-Z\d])', r'\1\n\n\2', txt)

m_sec = re.search(r'(?:^|\n)\s*(?:#{1,6}\s+|\d+\.\s+|[一二三四五]、\s*)?[🔵🔴]?\s*(?:第二阶段|第二模块|第二部分|写译核心词|写译核心词组|写译核心)', txt)
writing_start_pos = m_sec.start() if m_sec else len(txt)

def is_word_header(line, w_str, no_int):
    line = line.strip()
    if not line or len(line) > 120:
        return False, 0
    if re.search(r'(?:第一阶段|第二阶段|第一部分|第二部分|写译核心|阅读识记|深度解码|实战产出|一、|二、|三、|四、|Batch \d+)', line):
        return False, 0
    if re.match(r'^[-•*]\s*\*{1,2}【', line):
        return False, 0
    if re.match(r'^[-•*]\s*\*{1,2}(?:词源|词根|考研|核心|阅读|真题|高质量|高分|中文|英文|例句|翻译|译文|实战|适用|同义|记忆|逻辑|介词|注意|概念|推理|语义|Cloze|场景|应试|提示|解析|干扰|设错|对齐|拓展)[^：:]*[：:]', line):
        return False, 0
    if line.startswith(('>', '|')):
        return False, 0
    if not re.search(rf'\b{re.escape(w_str)}\b', line, re.I):
        return False, 0
    nos_in_line = [int(n) for n in re.findall(r'\bNO\.\s*(\d+)\b', line, re.I)]
    if nos_in_line and no_int not in nos_in_line:
        return False, 0
    is_header = bool(re.match(r'^(?:#{1,6}|\d+\.|\d+\.\d+|NO\.)', line) or re.match(r'^[-•*]\s*\*{1,2}[a-zA-Z]', line) or line.lower().startswith(w_str.lower()))
    score = 0
    if nos_in_line and no_int in nos_in_line:
        score = 100 if is_header else 80
    elif is_header:
        score = 70
    elif line.lower().startswith(w_str.lower()):
        score = 60
    return score > 0, score

positions = []
for w_item in b_words:
    w_str = w_item['word']
    no_int = int(w_item['no'])
    best_score, best_pos = 0, None
    for m in re.finditer(r'(?:^|\n)([^\n]+)', txt):
        line = m.group(1).strip()
        ok, score = is_word_header(line, w_str, no_int)
        if ok and score > best_score:
            best_score = score
            best_pos = m.start(1)
    if best_score > 0:
        positions.append((best_pos, w_item))

positions.sort(key=lambda x: x[0])
distinct_starts = sorted(list(set(p[0] for p in positions)))

word_to_block = {}
word_to_is_writing = {}
for p_start, w_item in positions:
    next_starts = [s for s in distinct_starts if s > p_start]
    if p_start < writing_start_pos:
        candidates = [s for s in next_starts if s <= writing_start_pos]
        p_end = min(candidates) if candidates else writing_start_pos
    else:
        p_end = min(next_starts) if next_starts else len(txt)
    w_str = w_item['word'].lower()
    word_to_block[w_str] = txt[p_start:p_end]
    word_to_is_writing[w_str] = p_start >= writing_start_pos

def extract_section_content_enhanced(block, start_patterns, end_patterns):
    start_pat = r'(?:^|\n)[ \t]*[-•*]?[ \t]*(?:\*{1,2})?【?(?:' + '|'.join(start_patterns) + r')[：:]?】?(?:\*{1,2})?[ \t]*[：:]?[ \t]*'
    m_start = re.search(start_pat, block, re.I)
    if not m_start:
        return ""
    start_pos = m_start.end()
    end_pat = r'(?:\n[ \t]*[-•*]?[ \t]*(?:\*{1,2})?【?(?:' + '|'.join(end_patterns) + r')|\n\s*(?:NO\.\s*\d+|\*{2}\d+\.|\d+\.\s+[a-zA-Z])|\Z)'
    m_end = re.search(end_pat, block[start_pos:], re.I)
    end_pos = start_pos + m_end.start() if m_end else len(block)
    val = block[start_pos:end_pos].strip()
    return clean_txt(val)

# Test extracting steer and stern
steer_block = word_to_block['steer']
print("=== STEER BLOCK ===")
print(steer_block)

coll = extract_section_content_enhanced(steer_block, [
    r'高分词链', r'核心高分词链', r'提分词链', r'核心搭配', r'搭配磁链', r'搭配词链', r'搭配'
], [r'真题', r'替换', r'同义', r'适用', r'场景', r'例句', r'Sentence', r'注意', r'【'])

syn = extract_section_content_enhanced(steer_block, [
    r'真题替换', r'同义替换', r'真题对齐', r'替换', r'同义'
], [r'适用', r'场景', r'题型', r'例句', r'Sentence', r'【'])

scen = extract_section_content_enhanced(steer_block, [
    r'🎬[ \t]*英二专属场景', r'英二专属场景', r'适用题型', r'实战场景适配', r'场景描述'
], [r'高质量', r'高分例句', r'实战例句', r'真题例句', r'高分词链', r'搭配', r'例句', r'【'])

en = extract_section_content_enhanced(steer_block, [
    r'高分例句', r'高质量例句', r'实战例句', r'真题例句', r'例句'
], [r'中文', r'翻译', r'译文', r'【'])

zh = extract_section_content_enhanced(steer_block, [
    r'中文对照翻译', r'中文翻译', r'例句翻译', r'翻译', r'译文'
], [r'#####', r'###', r'NO\.', r'---', r'【'])

# If en has inline translation e.g. (教育在引导...)
if en and not zh:
    m_zh = re.search(r'[（\(]([^)]+)[）\)]\s*$', en)
    if m_zh and re.search(r'[\u4e00-\u9fa5]', m_zh.group(1)):
        zh = m_zh.group(1).strip()
        en = en[:m_zh.start()].strip()

# Clean coll pairs
pairs = re.findall(r'#*\s*([a-zA-Z\s\.,\-\'\’/]{3,}?)\s*[（\(]([^)]+)[）\)]', coll)
coll_en, coll_zh = "", ""
if pairs:
    coll_en = "  ｜  ".join([p[0].strip() for p in pairs if p[0].strip()])
    coll_zh = "  ｜  ".join([p[1].strip() for p in pairs if p[1].strip()])

print("\n--- STEER EXTRACTED ---")
print("coll_en:", coll_en)
print("coll_zh:", coll_zh)
print("syn:", syn)
print("scen:", scen)
print("en:", en)
print("zh:", zh)

stern_block = word_to_block['stern']
print("\n=== STERN BLOCK ===")
print(stern_block)

root_stern = extract_section_content_enhanced(stern_block, [
    r'记忆逻辑', r'词源拆解', r'词源与底层语义', r'词根解构', r'底层语义'
], [r'考研', r'核心', r'阅读', r'命题', r'【'])

rp_stern = extract_section_content_enhanced(stern_block, [
    r'阅读考点与命题陷阱', r'阅读考点', r'态度题专攻'
], [r'干扰拦截', r'命题陷阱', r'陷阱', r'【'])

traps_stern = extract_section_content_enhanced(stern_block, [
    r'干扰拦截', r'命题陷阱', r'干扰陷阱'
], [r'#####', r'###', r'NO\.', r'---', r'【'])

print("\n--- STERN EXTRACTED ---")
print("root:", root_stern)
print("rp:", rp_stern)
print("traps:", traps_stern)
