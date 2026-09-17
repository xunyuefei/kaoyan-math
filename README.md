# 📐 考研数学 SOP 决策解构题解知识库 (Kaoyan Math SOP Solutions)

> **💡 核心定位**：专为考研数学（高等数学、线性代数）打造的高频考点 SOP 决策解构与极简双端自适应沉浸阅读站。
> 每一道题目均经过“手眼法直击秒杀”与“6层严谨学术解构”，拒绝散碎题解，构建不可动摇的法理与算力防线。

[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?style=flat-square&logo=github)](https://xunyuefei.github.io/kaoyan-math/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-blue?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org/)
[![CI Status](https://img.shields.io/badge/CI-Passing-success?style=flat-square&logo=githubactions)](.github/workflows/ci.yml)

---

## 🌐 在线与本地访问

* 🌍 **云端在线发布站**：[https://xunyuefei.github.io/kaoyan-math/](https://xunyuefei.github.io/kaoyan-math/)
* 💻 **本地极速阅读端**：`http://localhost:5210/`
* 📱 **移动端直连适配**：电脑手机在同一 Wi-Fi 下，扫码或输入局域网 IP 直达，自动适配竖屏流体触控。

---

## 📚 专属大纲与学科分类 (Strict Taxonomy)

知识库严格按照用户的复习大纲标准划定，物理隔离为两大分流：

### 1. 高等数学 (Calculus)
* **数据源**：`content/高等数学_题解集.md`
* **来源题集**：`辅导讲义`、`600题`、`精选题`、`严选题`
* **6 大标准章节**：
  1. `函数与极限`
  2. `一元函数微分`
  3. `一元函数积分`
  4. `常微分方程`
  5. `多元函数微分`
  6. `二重积分`

### 2. 线性代数 (Linear Algebra)
* **数据源**：`content/线性代数_题解集.md`
* **来源题集**：`辅导讲义`、`660题`、`严选题`
* **6 大标准章节**：
  1. `行列式`
  2. `矩阵`
  3. `n维向量`
  4. `线性方程组`
  5. `特征值与特征向量`
  6. `二次型`

---

## 🏛️ 6 层 SOP 学术典藏解构体系

每道题目严格遵循 6 层认知递进模型重构：

```
[题头卡片] 📌 题目 ID · 所属章节 · 来源题集 · 题型考点标签
   │
   ├── 💡 核心突破手眼法 (IF 题干特征 -> THEN 秒杀切入点)
   ├── 1️⃣ Layer 1 代数表征（识别考卷符号与代数结构）
   ├── 2️⃣ Layer 2 语义逻辑（直击几何/物理本质或代数同构）
   ├── 3️⃣ Layer 3 教科书目标（精准对接讲义核心考点）
   ├── 4️⃣ Layer 4 认知路径（【等价性是如何建立的？】法理推导与思维主线）
   ├── 5️⃣ Layer 5 演算落地（最优化工程计算，微元与积分上下限精炼）
   └── 6️⃣ Layer 6 题型升维（【一题多变与陷阱防线】易错防线与变式）
   │
[终局呈现] 🎯 最终标准答案
```

---

## ⚡ 极简日常运维流 (One-Click Operations)

日常使用无需输入任何复杂代码，双击根目录批处理即可：

1. **查看题解网站**：
   👉 双击 `【打开数学题解网站】.bat`（自动唤起本地 5210 端口服务并打开浏览器）。
2. **AI 全自动录入新题**：
   在任何支持 Agent 的终端或聊天框中，第一行指明 `[来源题集] [标准章节]`（如 `严选题 二重积分`），第二行粘贴原题，AI 自动完成 SOP 重构、写入对应文件并部署。
3. **一键同步发布至云端**：
   👉 双击 `【一键同步数学并发布到云端】.bat`（全自动更新清单、排版校验并推送至 GitHub Pages）。

---

## 🗂️ 项目目录结构

```tree
数学练习产出Note/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions 自动化持续集成测试
├── content/
│   ├── 高等数学_题解集.md         # 高数真题数据源 (严禁写入根目录同名文件)
│   └── 线性代数_题解集.md         # 线代真题数据源
├── docs/
│   ├── ARCHITECTURE.md          # 系统深度架构与数据流规范
│   ├── API.md                   # manifest.json 与题解卡片契约规范
│   └── MODEL_CAPABILITIES.md    # AI 模型推理能力基准与手眼法指引
├── prompts/
│   ├── system.md                # 考研数学 SOP 专用系统提示词
│   └── code-review.md           # 题解格式与代码审查规范
├── tests/
│   └── test_math_integrity.py   # 题解锚点、格式与清单完整性测试
├── scripts/
│   └── sync_manifest.js         # 同步 Markdown 至 manifest.json 脚本
├── index.html                   # 门户核心单页应用 (SPA)
├── app.js                       # 门户核心控制器、Markdown 解析与搜索引擎
├── style.css                    # 现代响应式主题与移动端流体样式
├── manifest.json                # 全量题解结构化索引清单
├── AGENTS.md                    # AI 助手前置守则与自动化处理红线规范
├── HANDOFF.md                   # AI 接手交接手册与当前就绪状态
├── TASKS.md                     # 任务路线图与待办事项追踪
├── DECISIONS.md                 # 架构决策记录 (ADR)
├── .env.example                 # 环境变量模板
└── package.json                 # 项目依赖与 npm 脚本配置
```

---

## 🧪 自动化测试与质量检验

在提交代码或发布前，可直接在终端运行完整性检查：

```powershell
python tests/test_math_integrity.py
```
测试项包括：
- ✅ 题号唯一性与递增检查
- ✅ Markdown 卡片锚点 `#problem-[ID]` 合法性
- ✅ 6 层 Layer 标题独占换行检查
- ✅ `manifest.json` 与真实题解一致性校验

---

## 📄 开源与版权许可

本项目题解与认知体系由个人考研复习知识库沉淀而成，遵循 [MIT License](LICENSE)。
