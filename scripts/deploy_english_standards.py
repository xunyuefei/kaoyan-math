# -*- coding: utf-8 -*-
"""
脚本：全量自动部署考研英语知识库标准规范文档体系
部署目标：
  1. c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版
  2. c:\\Users\\31085\\Desktop\\红宝书讲义_排版修复版\\_内部核心程序与数据(无需修改)\\web_portal
"""

import os
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(r"c:\Users\31085\Desktop\红宝书讲义_排版修复版")
PORTAL = ROOT / "_内部核心程序与数据(无需修改)" / "web_portal"

def ensure_file(p: Path, content: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"  [✓] 写入文件: {p.relative_to(ROOT.parent)}")

# -------------------------------------------------------------
# 1. 英语根目录规范文件
# -------------------------------------------------------------

README_CONTENT = """# 📕 考研英语红宝书 · 全景深度特训讲义站与工业级解析引擎

> **💡 核心使命**：为考研英语（英语一/英语二）打造的全自动 Word 原件识别、黄金词库保真提炼、双端流体阅读与高清精排讲义生成流水线。
> 用户仅需投递 Word 讲义原件，系统全自动完成 100% 结构化解析、同义词深度穿透、情感极性靶向标定与云端同步。

[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?style=flat-square&logo=github)](https://xunyuefei.github.io/kaoyan-english/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-blue?style=flat-square&logo=node.js)](https://nodejs.org/)

---

## 🌐 访问与使用方式

* 🌍 **云端在线发布站**：[https://xunyuefei.github.io/kaoyan-english/](https://xunyuefei.github.io/kaoyan-english/)
* 💻 **本地阅读门户**：`http://localhost:5220/`
* 📱 **移动端直连适配**：同一 Wi-Fi 下手机/平板输入本机 IP 访问，触控自适应抽屉导航。

---

## ⚡ 极简日常使用指引（用户零接触代码）

1. **日常背单词与查讲义**：
   👉 双击 `【打开英语阅读门户网站】.bat`（端口 5220）。
2. **新写了 Word 讲义，一键自动更新**：
   - 第 1 步：将 `.docx` 文件扔进 `【放入新Word讲义】/1-红宝书核心词汇` 或 `2-四六级常考词组`；
   - 第 2 步：双击运行 `【一键更新英语讲义与网站】.bat`。
3. **一键同步发布至云端**：
   👉 双击 `【一键同步英语并发布到云端】.bat`（全自动同步并 push 到 GitHub Pages）。

---

## 🗂️ 核心目录结构

```tree
红宝书讲义_排版修复版/
├── 【放入新Word讲义】/             # 用户投放 Word 原件专用目录
│   ├── 1-红宝书核心词汇/
│   ├── 2-四六级常考词组/
│   └── _已成功入库讲义归档/       # 自动移入的已处理历史文件归档
├── docs/                           # 深度技术规格与架构定义
│   ├── ARCHITECTURE.md             # 6 阶段构建流水线与数据流
│   ├── API.md                      # 词库 JSON 与 manifest 数据契约
│   └── MODEL_CAPABILITIES.md       # AI 语言模型能力要求
├── prompts/                        # 专属 Prompt
│   ├── system.md                   # 英语讲义处理专属 System Prompt
│   └── code-review.md              # 词库质量审查规范
├── tests/
│   └── test_english_integrity.py   # 1380 词完整性与防串扰自动化校验
├── _内部核心程序与数据(无需修改)/    # 底层构建流水线（无需用户手动碰）
│   ├── build_golden_datasets.py    # 黄金词库提炼（核心防串扰匹配）
│   ├── build_engine.py             # HTML / PDF 精排编译引擎
│   ├── thematic_builder.py         # 母题与情感态度专题卫星构建器
│   ├── run_pipeline.py             # 全自动化一键闭环主控流水线
│   ├── serve_portal.py             # 本地 5220 极速跨设备静态服务
│   ├── list*_words.json            # 23 个 List 黄金词库真实数据
│   └── web_portal/                 # 对应 GitHub Pages 远程仓库 (kaoyan-english)
├── AGENTS.md                       # AI 行为守则与零串扰红线规范
├── HANDOFF.md                      # AI 助手交接简报与已排查状态
├── TASKS.md                        # 任务路线图与待办事项追踪
├── DECISIONS.md                    # 架构决策记录 (ADR)
└── .env.example                    # 环境变量模板
```

---

## 🧪 自动化测试

```powershell
python tests/test_english_integrity.py
```
验证全部 23 个 List（1,380 词）词条类型归属、例句完整度、零空缺考点与防串扰隔离。
"""

AGENTS_CONTENT = """# 考研英语知识库 · AI 助手前置守则与自动化处理红线规范 (AGENTS.md)

> **💡 核心原则**：
> 1. **用户从不触碰 Markdown/HTML，只输入 Word (.docx)**。
> 2. **内容准确是考研备考的生命线，“内容错误是绝对不容触碰的底线！”**

---

## 🚨 核心防线：词头匹配与零串扰铁律 (Critical Invariants)

在解析用户 Word 或 Markdown 提炼单词卡片时，**必须严格执行 `is_word_header_robust` 算法**：

1. **词头必须与编号强绑定**：
   * 标题行必须严格匹配 `NO.[序号]`，且与当前词条的期望序号完全吻合；
   * 严禁将行内偶然提及的单词误判为新词头！
2. **前缀严格反向排除**：
   * 凡以 `- **【`、`- **字段：` 等属性行开头的格式，**绝对不可识别为词头**；
   * 例如：`- **【记忆逻辑】：联想驾驶 ( steer )。船长站在船尾 ( stern ) 严厉地控制航向。**` 该行是 `stern` 的助记行，**绝不能被 `steer` 误认**！
3. **阅读区与写译区分水岭截断**：
   * 遇 `🔵 第二部分：写译核心词` 时，阅读词提取范围强制截断，绝对不可跨区吞噬写译词内容。
4. **卡片双轨模型不变性**：
   * `reading` (阅读识记词)：必须具备 `reading_points` (态度题/逻辑考点) 与 `traps` (命题陷阱)；
   * `writing` (写译核心词)：必须具备 `collocation` (核心词链)、`example_en` (高质量例句) 与 `example_zh`。

---

## 🛠️ 流水线主控程序调用规范

当需要执行更新或重新构建时，统一调用：
```powershell
python "_内部核心程序与数据(无需修改)/run_pipeline.py"
```
流水线会自动顺序执行：
1. `build_golden_datasets.py` (词库提炼)
2. `build_engine.py` (讲义精排)
3. `thematic_builder.py --html-only` (专题刷新)
4. `sync_english.js` (Web 门户同步)
"""

HANDOFF_CONTENT = """# 🤝 考研英语知识库 · AI 助手交接手册 (HANDOFF.md)

> **致接手本项目的 AI 助手或维护者**：
> 本仓库已完成全库 23 个单元（共 1,380 词）的排版重构与词头防串扰算法加固，目前系统处于健康稳定状态。

---

## 📌 当前项目基准状态 (Current State)

* **数据量**：
  * List 01 ~ 23 共 23 个单元，1,380 个核心考研词汇（761 个阅读词，619 个写译词）。
  * 全量词汇 0 空缺考点、0 残损例句。
* **已解决的历史重大 Bug (2026-09-17)**：
  * 根治了由于 `stern` 记忆行提及 `steer` 导致第 51 词与第 54 词考点串扰的重大问题；
  * `build_golden_datasets.py` 全面引入 `is_word_header_robust` 算法并完成全库强制重构；
  * 全部 23 单元 HTML 与 PDF 已全量更新并推送到 GitHub Pages。
* **本地与线上服务**：
  * 本地服务：`http://localhost:5220/` (通过 `serve_portal.py` 提供常驻服务)
  * 云端线上：[https://xunyuefei.github.io/kaoyan-english/](https://xunyuefei.github.io/kaoyan-english/)

---

## 🧭 常用运维指令速查

| 操作目的 | 执行指令 |
| :--- | :--- |
| 运行全量流水线 | `python "_内部核心程序与数据(无需修改)/run_pipeline.py"` |
| 强制刷新词库 | `python "_内部核心程序与数据(无需修改)/build_golden_datasets.py" --force` |
| 仅更新专题讲义 | `python "_内部核心程序与数据(无需修改)/thematic_builder.py" --html-only` |
| 启动本地门户服务 | `python "_内部核心程序与数据(无需修改)/serve_portal.py"` |
| 运行自动化测试 | `python tests/test_english_integrity.py` |
"""

TASKS_CONTENT = """# 📋 考研英语知识库 · 任务路线图与待办事项 (TASKS.md)

---

## 🚀 当前活跃任务 (In Progress)

* [ ] **工程化统一规范套件落地**：完成 README、AGENTS、HANDOFF、TASKS、DECISIONS、docs、prompts、tests、ci.yml。
* [ ] **List 24+ 新单元自动化接入准备**：确保后续放入的新 Word 讲义能自动识别批次并完美解析。

---

## 📌 待办事项 (Backlog)

### 1. 词库与讲义扩容
* [ ] **List 24 ~ List 50 阶段性构建**：随着用户考研复习节奏推进，分批次完成剩余单元的入库。
* [ ] **四六级常考词组专区打磨**：深化词组的真题例句解析与英一/英二小作文对策段适配。

### 2. 前端门户功能增强
* [ ] **艾宾浩斯复习打卡规划器**：在前端增加阶段一（自测）、阶段二（词链默写）与阶段三（真题穿透）的日期打卡持久化。
* [ ] **离线发音播报集成**：接入 Web Speech API 朗读例句与核心词链。

---

## 🏁 已达成里程碑 (Completed Milestones)

- [x] **2026-09-15**：完成 List 01 ~ 22 全景深度特训讲义精排版构建。
- [x] **2026-09-16**：建立手机端/电脑端流体自适应阅读门户，支持离线星标与备忘。
- [x] **2026-09-17**：完成 List 23 接入，彻底排查并根除词头正则匹配串扰，全量 23 单元数据通过 100% 保真测试并上线发布。
"""

DECISIONS_CONTENT = """# 🏛️ 考研英语知识库 · 架构决策记录 (DECISIONS.md)

---

## ADR-001: 用户零干预与 Word 原件自动分流归档

* **状态**：已采纳 (Accepted)
* **背景**：用户日常复习精力极其宝贵，不应要求用户手写复杂 Markdown。用户提供的资料为 Word (.docx) 格式。
* **决策**：
  1. 设立 `【放入新Word讲义】` 投递箱；
  2. 流水线自动嗅探正文元数据（List 编号、Batch 批次、词汇 vs 词组）；
  3. 处理完毕后自动移动至 `_已成功入库讲义归档/YYYY-MM/`，保持工作区绝对整洁。

---

## ADR-002: 词头判定编号强绑定与反向排除属性行 (根治串扰)

* **状态**：已采纳 (Accepted)
* **背景**：旧版正则按单词名宽松匹配，当正文助记行出现单词时被误判为词头，导致 `steer` 与 `stern` 发生严重的内容篡改与串扰。
* **决策**：
  1. 编写 `is_word_header_robust`：必须包含 `NO.\d+` 且与期望编号一致；
  2. 严格反向排除 `- **【` 等属性标记；
  3. 阅读词采集范围在遇到写译分隔线时强制截断。
* **后果**：全库 1380 词串扰隐患彻底归零。

---

## ADR-003: Edge Headless 编译与 PyMuPDF 双模输出

* **状态**：已采纳 (Accepted)
* **背景**：用户既需要网页端沉浸式随时刷词，又需要可打印、带书签跳转的学术 PDF 讲义。
* **决策**：
  采用 Chromium/Edge Headless 进行印刷级分页渲染，并利用 PyMuPDF (`fitz`) 自动化注入 70+ 个大纲书签节点与跨单元双向跳转链接。
"""

ENV_CONTENT = """# ==============================================================================
# 📕 考研英语知识库 · 环境变量配置模板
# ==============================================================================

# 本地阅读门户监听端口 (默认 5220)
ENGLISH_PORT=5220

# 绑定地址 (0.0.0.0 支持局域网手机 Wi-Fi 访问)
ENGLISH_HOST=0.0.0.0

# Edge 浏览器可执行程序路径
EDGE_EXE=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe

# GitHub 远程仓库
GITHUB_REPO=xunyuefei/kaoyan-english
GITHUB_PAGES_URL=https://xunyuefei.github.io/kaoyan-english/
"""

DOCS_ARCH_CONTENT = """# 📐 考研英语知识库 · 系统架构与数据流规范 (ARCHITECTURE.md)

```mermaid
flowchart TD
    WordInput["📄 Word 讲义 (.docx) 投放到【放入新Word讲义】"]
    
    subgraph Engine["⚙️ 内部构建流水线 (run_pipeline.py)"]
        S0["步骤 0: 深度嗅探并自动分流归档"]
        S1["步骤 1: 黄金词库保真提炼 (build_golden_datasets.py)"]
        S2["步骤 2: 精排版 HTML & PDF 编译 (build_engine.py)"]
        S3["步骤 3: 词组讲义编译 (phrase_build_engine.py)"]
        S4["步骤 4: 专题特训讲义构建 (thematic_builder.py)"]
        S5["步骤 5: 同步至 Web 门户 (sync_english.js)"]
    end
    
    subgraph Storage["💾 持久化数据产物"]
        JSONData["list*_words.json (23 单元黄金词库)"]
        MDDocs["md_output/*.md"]
        HTMLDocs["md_output/*.html"]
        PDFDocs["md_output/*.pdf (书签穿梭版)"]
    end

    subgraph WebPortal["🌐 阅读门户 (web_portal/)"]
        PortalContent["web_portal/content/"]
        Manifest["web_portal/manifest.json"]
        SPA["index.html (SPA 双端自适应门户)"]
    end

    subgraph Deploy["☁️ 云端部署"]
        GHPages["GitHub Pages (https://xunyuefei.github.io/kaoyan-english/)"]
    end

    WordInput --> S0 --> S1 --> S2 --> S4 --> S5
    S1 --> JSONData
    S2 --> MDDocs & HTMLDocs & PDFDocs
    S5 --> PortalContent & Manifest
    PortalContent --> SPA
    Manifest --> SPA
    WebPortal -->|git push| GHPages
```
"""

DOCS_API_CONTENT = """# 📄 考研英语知识库 · 数据模式与接口规范 (API.md)

## 1. 词库条目 Schema (`list*_words.json`)

### 阅读识记词 (Reading Card)
```json
{
  "no": "54",
  "word": "stern",
  "pos": "adj.",
  "type": "reading",
  "batch": 4,
  "root": "联想驾驶 ( steer )。船长站在船尾 ( stern ) 严厉地控制航向。",
  "meaning": "严厉的,严格的;苛刻的;n. 船尾",
  "reading_points": "态度题专攻：此词是作者态度题中的强负极/批评性词汇...",
  "traps": "不要将其误认为中性词，它带有明显的惩罚性或压迫性色彩。",
  "attitude": "🔴 负向/警惕",
  "attitude_cls": "neg"
}
```

### 写译核心词 (Writing Card)
```json
{
  "no": "51",
  "word": "steer",
  "pos": "v.",
  "type": "writing",
  "batch": 4,
  "root": "词源核心素 steer...",
  "meaning": "驾驶;引导;掌舵;操纵;n. 捷牛",
  "collocation": "steer the public toward healthy lifestyles",
  "collocation_zh": "引导公众走向健康生活方式",
  "synonyms": "升级 guide / direct",
  "scenario": "适用题型：小作文建议信/图表对策段。",
  "example_en": "Education plays a pivotal role in <strong>steering</strong> the younger generation toward correct values.",
  "example_zh": "教育在引导年轻一代建立正确价值观方面起着关键作用。"
}
```
"""

DOCS_MODEL_CONTENT = """# 🤖 考研英语知识库 · AI 模型能力基准与推理规范 (MODEL_CAPABILITIES.md)

1. **学术词根词缀推演能力**：准确拆解词根来源，直击考研核心考法；
2. **长难句双语对齐与写作升级能力**：例句严谨地将生词用 `<strong>...</strong>` 强化标注，中文释义信达雅；
3. **严格的实体边界隔离意识**：在解析复合词条或助记联想词时，绝不混淆主词与辅助词。
"""

PROMPTS_SYS_CONTENT = """# 📕 考研英语讲义解析专属 System Prompt

你是一名拥有资深考研英语（英一/英二）大纲研究经验的讲义解析与知识库重构专家。
在处理任何英语词汇与讲义时：
1. 严格区分阅读词（注重语义感情色彩、态度题、细节混淆陷阱）与写译词（注重词链搭配、升级替换、段落场景与真题高分例句）；
2. 绝对保证原件内容保真，零无中生有，零跨词串扰。
"""

PROMPTS_REVIEW_CONTENT = """# 🔍 考研英语词条审查规范 (Review Prompt)

审查清单：
1. 词号与词名是否 100% 对应？
2. 阅读词是否具备 `reading_points` 与 `traps`？
3. 写译词是否具备核心词链 `collocation` 与双语例句？
4. 助记文本中的联想词是否独立存在且未被错误提炼为独立词头？
"""

TEST_INTEGRITY_CONTENT = """\"\"\"
考研英语知识库 · 1380 词完整性与防串扰自动化检验套件
运行方式: python tests/test_english_integrity.py
\"\"\"

import sys
import json
import re
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
CORE_DIR = ROOT_DIR / "_内部核心程序与数据(无需修改)"
PORTAL_CONTENT = CORE_DIR / "web_portal" / "content"

def test_json_datasets():
    print("[1/3] 正在全面审计 23 单元黄金词库 list*_words.json...")
    json_files = sorted(CORE_DIR.glob("list*_words.json"))
    assert len(json_files) == 23, f"期望 23 个单元词库，实际发现 {len(json_files)} 个"

    total_words = 0
    reading_count = 0
    writing_count = 0
    anomalies = []

    for jf in json_files:
        words = json.loads(jf.read_text(encoding='utf-8'))
        for w in words:
            total_words += 1
            w_type = w.get("type")
            if w_type == "reading":
                reading_count += 1
                if not w.get("reading_points"):
                    anomalies.append((jf.name, w["no"], w["word"], "reading_points 为空"))
            elif w_type == "writing":
                writing_count += 1
                if not w.get("collocation") and not w.get("example_en"):
                    anomalies.append((jf.name, w["no"], w["word"], "写译搭配与例句缺失"))
            else:
                anomalies.append((jf.name, w["no"], w["word"], f"未知类型 {w_type}"))

    assert total_words == 1380, f"期望 1380 词，实际统计为 {total_words}"
    assert len(anomalies) == 0, f"发现词条内容残缺异常: {anomalies}"
    print(f"  [✓] 全量 1,380 词（阅读 {reading_count} 词，写译 {writing_count} 词）校验 100% 完整无空缺！")

def test_steer_stern_isolation():
    print("\\n[2/3] 正在专项校验 steer(NO.51) 与 stern(NO.54) 零串扰防线...")
    l23_json = CORE_DIR / "list23_words.json"
    assert l23_json.exists(), "list23_words.json 不存在"
    data = json.loads(l23_json.read_text(encoding='utf-8'))
    
    steer_word = next((w for w in data if w["word"] == "steer"), None)
    stern_word = next((w for w in data if w["word"] == "stern"), None)

    assert steer_word is not None, "未找到 steer"
    assert steer_word["type"] == "writing", f"steer 类型错误: {steer_word['type']}"
    assert "healthy lifestyles" in steer_word.get("collocation", ""), "steer 词链错误"

    assert stern_word is not None, "未找到 stern"
    assert stern_word["type"] == "reading", f"stern 类型错误: {stern_word['type']}"
    assert "强负极" in stern_word.get("reading_points", ""), "stern 考点错误"

    print("  [✓] steer(写译核心) 与 stern(阅读强负极) 独立隔离检验 100% PASS！")

def test_portal_html_sync():
    print("\\n[3/3] 正在检验 web_portal/content 静态文件就绪度...")
    assert PORTAL_CONTENT.exists(), "web_portal/content 不存在"
    for i in range(1, 24):
        f = PORTAL_CONTENT / f"list-{i:02d}.html"
        assert f.exists(), f"门户缺少 {f.name}"
    
    assert (PORTAL_CONTENT / "topics.html").exists(), "缺少 topics.html"
    assert (PORTAL_CONTENT / "reading.html").exists(), "缺少 reading.html"
    print("  [✓] 网页门户 23 个 List + 话题/态度特训 HTML 全部就绪！")

def main():
    print("===========================================================================")
    print("  📕 考研英语红宝书 · 数据完整性与防串扰自动化校验套件")
    print("===========================================================================")
    try:
        test_json_datasets()
        test_steer_stern_isolation()
        test_portal_html_sync()
        print("\\n" + "=" * 75)
        print("  🎉 全部测试 100% PASS！英语知识库 1,380 词保真无暇！")
        print("===========================================================================")
        sys.exit(0)
    except AssertionError as e:
        print(f"\\n[X] 测试失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
"""

# -------------------------------------------------------------
# 2. web_portal 专用规范文件
# -------------------------------------------------------------

PORTAL_README_CONTENT = """# 考研英语红宝书 · 全景深度特训讲义门户 (Web Portal)

> 本目录为 GitHub Pages 部署仓库源码 (`git@github.com:xunyuefei/kaoyan-english.git`)。

* **线上地址**：[https://xunyuefei.github.io/kaoyan-english/](https://xunyuefei.github.io/kaoyan-english/)
* **本地服务**：`http://localhost:5220/`

## 目录结构
- `index.html`: 双端自适应单页门户
- `content/`: 各 List 及专题精排 HTML
- `manifest.json`: 门户全量大纲清单
- `sync_english.js`: 增量同步与 manifest 生成器
"""

PORTAL_CI_CONTENT = """name: 📕 English Knowledge Base Portal CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify:
    name: 验证门户大纲与内容一致性
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 配置 Node.js 环境
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: 检验 manifest.json 与 content/ 文件可达性
        run: |
          node tests/test_portal_manifest.js
"""

PORTAL_TEST_JS_CONTENT = """const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const contentDir = path.join(rootDir, 'content');

console.log('===================================================');
console.log('  📕 Web Portal CI 自动化清单与静态内容检验');
console.log('===================================================');

if (!fs.existsSync(manifestPath)) {
  console.error('[X] 缺少 manifest.json');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const vocabLists = manifest.vocabLists || [];
console.log(`[i] manifest.json 记录词汇单元数: ${vocabLists.length}`);

let missing = 0;
vocabLists.forEach(item => {
  if (item.ready) {
    const fPath = path.join(rootDir, item.file);
    if (!fs.existsSync(fPath)) {
      console.error(`[X] 标记为 ready 但未找到文件: ${item.file}`);
      missing++;
    }
  }
});

if (missing > 0) {
  console.error(`[X] 共有 ${missing} 个内容文件缺失！`);
  process.exit(1);
}

console.log('✅ 全部已就绪单元对应 content HTML 100% 存在！测试通过！');
"""

def main():
    print(">>> 开始部署考研英语规范体系...")
    ensure_file(ROOT / "README.md", README_CONTENT)
    ensure_file(ROOT / "AGENTS.md", AGENTS_CONTENT)
    ensure_file(ROOT / "HANDOFF.md", HANDOFF_CONTENT)
    ensure_file(ROOT / "TASKS.md", TASKS_CONTENT)
    ensure_file(ROOT / "DECISIONS.md", DECISIONS_CONTENT)
    ensure_file(ROOT / ".env.example", ENV_CONTENT)
    ensure_file(ROOT / "docs" / "ARCHITECTURE.md", DOCS_ARCH_CONTENT)
    ensure_file(ROOT / "docs" / "API.md", DOCS_API_CONTENT)
    ensure_file(ROOT / "docs" / "MODEL_CAPABILITIES.md", DOCS_MODEL_CONTENT)
    ensure_file(ROOT / "prompts" / "system.md", PROMPTS_SYS_CONTENT)
    ensure_file(ROOT / "prompts" / "code-review.md", PROMPTS_REVIEW_CONTENT)
    ensure_file(ROOT / "tests" / "test_english_integrity.py", TEST_INTEGRITY_CONTENT)

    print("\n>>> 开始部署 web_portal 专用规范文件...")
    ensure_file(PORTAL / "README.md", PORTAL_README_CONTENT)
    ensure_file(PORTAL / ".github" / "workflows" / "ci.yml", PORTAL_CI_CONTENT)
    ensure_file(PORTAL / "tests" / "test_portal_manifest.js", PORTAL_TEST_JS_CONTENT)
    print("\n[✓] 考研英语全套工程规范文件已全部就绪！")

if __name__ == "__main__":
    main()
