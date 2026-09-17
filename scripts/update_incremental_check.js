const fs = require('fs');
const filePath = 'c:/Users/31085/Desktop/红宝书讲义_排版修复版/_内部核心程序与数据(无需修改)/build_golden_datasets.py';
let code = fs.readFileSync(filePath, 'utf8');

const oldCheck = `        curr_batches = [bf for bf in batch_files if re.search(rf'List\\s*0?{l_num}\\b', os.path.basename(bf), re.IGNORECASE)]
        if os.path.exists(out_json) and curr_batches:
            json_mtime = os.path.getmtime(out_json)
            newest_batch_mtime = max(os.path.getmtime(b) for b in curr_batches)
            if json_mtime >= newest_batch_mtime:`;

const newCheck = `        curr_batches = [bf for bf in batch_files if re.search(rf'List\\s*0?{l_num}\\b', os.path.basename(bf), re.IGNORECASE)]
        script_mtime = os.path.getmtime(__file__)
        is_forced = "--force" in sys.argv
        if not is_forced and os.path.exists(out_json) and curr_batches:
            json_mtime = os.path.getmtime(out_json)
            newest_batch_mtime = max(os.path.getmtime(b) for b in curr_batches)
            if json_mtime >= newest_batch_mtime and json_mtime >= script_mtime:`;

if (code.includes('if json_mtime >= newest_batch_mtime:')) {
  code = code.replace(oldCheck, newCheck);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated incremental check in build_golden_datasets.py');
} else {
  console.log('Could not find old check string');
}
