import re
from pathlib import Path

engine_path = Path(r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\四六级常考词组讲义\phrase_build_engine.py')
code = engine_path.read_text(encoding='utf-8')

old_part = """        # 提取写译部分 (##### 分隔)
        if '##### ' in full_text:
            writing_chunks = full_text.split('##### ')[1:]
            for chunk in writing_chunks:
                lines = [ln.strip() for ln in chunk.split('\\n') if ln.strip()]"""

new_part = """        # 提取写译部分 (##### 分隔)
        if '##### ' in full_text:
            writing_chunks = full_text.split('##### ')[1:]
            for chunk in writing_chunks:
                raw_parts = re.split(r'\\n|\\s+\\*\\s+', chunk)
                lines = [ln.strip(' *\\t\\r') for ln in raw_parts if ln.strip(' *\\t\\r')]"""

if old_part in code:
    code = code.replace(old_part, new_part)
    engine_path.write_text(code, encoding='utf-8')
    print("✅ phrase_build_engine.py 成功打补丁！")
else:
    print("⚠️ 已经打过补丁或特征字符串不匹配")
