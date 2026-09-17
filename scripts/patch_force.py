import os

fp = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)\build_golden_datasets.py'
with open(fp, 'r', encoding='utf-8') as f:
    code = f.read()

target = 'if os.path.exists(out_json) and curr_batches:'
replacement = 'if "--force" not in sys.argv and os.path.exists(out_json) and curr_batches:'

if target in code:
    code = code.replace(target, replacement)
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully added --force support to build_golden_datasets.py")
else:
    print("Target string not found")
