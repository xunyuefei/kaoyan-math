import os, sys, glob, re, json

ROOT_DIR = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)'
sys.path.insert(0, ROOT_DIR)
from build_golden_datasets import (
    load_official_words, find_batch_file, clean_txt, ROOT_PREFIX_DB,
    CURATED_MISSING_WRITING
)

# Import our robust build function from verify_l23_perfect
from verify_l23_perfect import build_list_words_robust

mineru_official = load_official_words()

total_cross_contaminated = 0
results_by_list = {}

for l_num in range(1, 24):
    words = build_list_words_robust(l_num, mineru_official)
    results_by_list[l_num] = words
    
    for w in words:
        w_word = w.get('word', '')
        w_no = int(w.get('no', 0))
        
        rp = w.get('reading_points', '')
        root = w.get('root', '')
        coll = w.get('collocation', '')
        example_en = w.get('example_en', '')
        
        for text_field in [rp, root, coll, example_en]:
            m = re.findall(r'\bNO\.\s*(\d+)\b', text_field)
            for found_no in m:
                if int(found_no) != w_no:
                    total_cross_contaminated += 1
                    print(f"List {l_num:02d} NO.{w_no:02d} [{w_word}]: contains NO.{found_no} -> {text_field[:100]}")
                    break

print(f"\n==========================================")
print(f"Total cross-contamination remaining: {total_cross_contaminated}")
print(f"==========================================")
