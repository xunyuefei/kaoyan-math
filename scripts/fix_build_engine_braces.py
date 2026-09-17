import re

filePath = r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)\build_engine.py'
with open(filePath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines between 1515 and 1570
in_media = False
new_lines = []
for idx, line in enumerate(lines):
    if '@media screen and (max-width: 640px)' in line:
        in_media = True
    
    if in_media:
        # Double the braces if they are not already doubled
        # replace single { with {{ and single } with }}
        # Be careful not to replace already doubled ones
        line = re.sub(r'(?<!\{)\{(?!\{)', '{{', line)
        line = re.sub(r'(?<!\})\}(?!\})', '}}', line)
        if '</style>' in line:
            in_media = False

    new_lines.append(line)

with open(filePath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully doubled CSS braces in build_engine.py")
