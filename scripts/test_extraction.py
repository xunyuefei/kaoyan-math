import os, sys, glob, re

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import (
    load_official_words, find_batch_file, extract_section_content, clean_txt, ROOT_PREFIX_DB
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

# Find positions with robust logic
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

for test_word in ['steer', 'stern', 'stay', 'steady']:
    blk = word_to_block.get(test_word, '')
    is_w = word_to_is_writing.get(test_word)
    print(f"=== {test_word} (is_writing={is_w}, block_len={len(blk)}) ===")
    print(blk[:300])
    print("...\n")
