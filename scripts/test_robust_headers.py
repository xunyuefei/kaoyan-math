import os, sys, glob, re

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import load_official_words, find_batch_file

mineru_official = load_official_words()
l_words = mineru_official[23]
b_words = [l_words[no] for no in range(46, 61)]

bf = find_batch_file(23, 4)
with open(bf, encoding='utf-8', errors='ignore') as fp:
    txt = fp.read()

print('Testing robust header matching for List 23 Batch 4:')
for w_item in b_words:
    w_str = w_item['word']
    no_int = int(w_item['no'])
    
    candidates = []
    for m in re.finditer(r'(?:^|\n)([^\n]+)', txt):
        line = m.group(1).strip()
        # Exclude bullet points, bold bullets, blockquotes
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
        print(f"Word {no_int:02d} {w_str:12s}: Best [{candidates[0][0]:3d}] pos={candidates[0][1]:5d}: {candidates[0][2]}")
    else:
        print(f"Word {no_int:02d} {w_str:12s}: NO MATCH!")
