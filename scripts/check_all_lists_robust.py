import os, sys, glob, re, json

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import load_official_words, find_batch_file

mineru_official = load_official_words()

def get_robust_positions(b_words, txt):
    positions = []
    for w_item in b_words:
        w_str = w_item['word']
        no_int = int(w_item['no'])
        
        candidates = []
        for m in re.finditer(r'(?:^|\n)([^\n]+)', txt):
            line = m.group(1).strip()
            # NEVER match bullet points, quotes, tables
            if line.startswith(('-', '*', '>', '|', '+')):
                continue
            if len(line) > 120:
                continue
            
            # Check patterns
            has_exact_no = bool(re.search(rf'\bNO\.\s*{no_int}\b', line, re.I))
            has_slash_no = bool(re.search(rf'\bNO\.\s*[\d/]*\b{no_int}\b', line, re.I))
            has_word = bool(re.search(rf'\b{re.escape(w_str)}\b', line, re.I))
            is_header = bool(re.match(r'^(?:#{1,6}|\d+\.|\d+\.\d+|NO\.)', line) or line.lower().startswith(w_str.lower()))
            
            score = 0
            if has_exact_no and has_word: 
                score = 100
            elif has_slash_no and has_word:
                score = 95
            elif has_exact_no and is_header:
                score = 80
            elif has_word and is_header:
                # Check if it has another word's NO. (e.g. NO.54 when we want NO.51)
                other_no_matches = re.findall(r'\bNO\.\s*(\d+)\b', line, re.I)
                if other_no_matches and str(no_int) not in other_no_matches:
                    score = 0
                else:
                    score = 60
            
            if score > 0:
                candidates.append((score, m.start(1), line))
                
        candidates.sort(key=lambda x: (-x[0], x[1]))
        if candidates:
            positions.append((candidates[0][1], w_item, candidates[0][2]))
            
    positions.sort(key=lambda x: x[0])
    return positions

total_words = 0
matched_words = 0
unmatched = []

for l_num in range(1, 24):
    l_words = mineru_official.get(l_num, {})
    for b_num in range(1, 5):
        bf = find_batch_file(l_num, b_num)
        if not bf:
            # Missing batch
            continue
        with open(bf, encoding='utf-8', errors='ignore') as fp:
            raw_txt = fp.read()

        txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}\d+\.\d+\s+[a-zA-Z])', r'\1\n\n\2', raw_txt)
        txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(\*{0,2}NO\.\s*\d+)', r'\1\n\n\2', txt)
        txt = re.sub(r'([。！？\.\)）\*\"”\'])\s*(#{1,6}\s+[a-zA-Z\d])', r'\1\n\n\2', txt)

        b_words = [l_words[no] for no in range((b_num-1)*15+1, b_num*15+1) if no in l_words]
        positions = get_robust_positions(b_words, txt)
        matched_dict = {p[1]['no']: p for p in positions}
        
        for w in b_words:
            total_words += 1
            if w['no'] in matched_dict:
                matched_words += 1
            else:
                unmatched.append((l_num, b_num, w['no'], w['word']))

print(f"Total words tested: {total_words}")
print(f"Successfully matched with robust headers: {matched_words} ({matched_words/total_words*100:.1f}%)")
print(f"Unmatched words count: {len(unmatched)}")
if unmatched:
    print("Sample unmatched:")
    for u in unmatched[:20]:
        print(u)
