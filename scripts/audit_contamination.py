import os, sys, glob, re, json

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import load_official_words, find_batch_file

mineru_official = load_official_words()

# Audit all current list*_words.json files
cross_contaminated = []

for l_num in range(1, 24):
    json_path = os.path.join(ROOT_DIR, f'list{l_num}_words.json')
    if not os.path.exists(json_path):
        continue
    with open(json_path, encoding='utf-8') as fp:
        words = json.load(fp)
        
    for w in words:
        w_word = w.get('word', '')
        w_no = int(w.get('no', 0))
        
        # Check reading_points for other word names/numbers
        rp = w.get('reading_points', '')
        root = w.get('root', '')
        coll = w.get('collocation', '') or w.get('coll', '')
        example_en = w.get('example_en', '') or w.get('en', '')
        
        # Look for explicit mismatched NO.
        for text_field in [rp, root, coll, example_en]:
            m = re.findall(r'\bNO\.\s*(\d+)\b', text_field)
            for found_no in m:
                if int(found_no) != w_no:
                    cross_contaminated.append({
                        'list': l_num,
                        'no': w_no,
                        'word': w_word,
                        'found_other_no': found_no,
                        'field_snippet': text_field[:100]
                    })
                    break

print(f"Total cross-contaminated words detected: {len(cross_contaminated)}")
for c in cross_contaminated:
    print(f"List {c['list']:02d} NO.{c['no']:02d} [{c['word']}]: contains NO.{c['found_other_no']} -> {c['field_snippet']}")
