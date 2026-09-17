const fs = require('fs');
const filePath = 'c:/Users/31085/Desktop/红宝书讲义_排版修复版/_内部核心程序与数据(无需修改)/build_golden_datasets.py';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('pairs = re.findall(')) {
    lines[i] = '                    pairs = re.findall(r\'#*\\s*([a-zA-Z\\s\\.,\\-\u2019/]{3,}?)\\s*[\uff08\\(]([^)]+)[\uff09\\)]\', coll)';
  }
  if (lines[i].includes('elif re.match(r\'^[a-zA-Z')) {
    lines[i] = '                    elif re.match(r\'^[a-zA-Z\\s\\.,\\-\u2019/]{3,}$\', coll):';
  }
}
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed quotes in build_golden_datasets.py');
