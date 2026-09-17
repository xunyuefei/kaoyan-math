import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
p = Path(r'c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)\web_portal\content\list-23.html')
content = p.read_text(encoding='utf-8')

for term in ['id="w-steer"', 'id="w-stern"']:
    idx = content.find(term)
    print('=' * 60)
    print(f'MATCH FOR {term} at {idx}:')
    print('=' * 60)
    if idx != -1:
        # print up to next card or 1200 chars
        next_card = content.find('class="word-card', idx + 20)
        end = next_card if next_card != -1 else idx + 1200
        print(content[idx:end].strip())
    else:
        print('NOT FOUND!')
