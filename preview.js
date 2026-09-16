/* ==========================================================================
   考研数学 SOP 题解阅读站 — Preview Edition Core Logic
   Card-flow architecture + KaTeX math + Interactive SOP drawers + Real-time search
   ========================================================================== */

(function () {
  'use strict';

  // DOM Helpers
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let manifest = null;
  let currentSubjectId = 'calculus';
  let allProblems = [];
  let mathObserver = null;

  // ────────────────────────────────────────────
  // Initialization
  // ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    setupSidebar();
    setupSearch();
    setupGlobalControls();
    setupLazyMathObserver();
    setupBlindTestMode();
    setupSidebarViewMode();
    setupFloatingDock();

    try {
      manifest = await fetch('manifest.json?t=' + Date.now()).then(r => r.json());

      // 智能识别初始学科：优先根据 URL hash 嗅探属于哪个学科，其次使用 localStorage 记忆，默认高等数学
      let initialSubject = localStorage.getItem('active_subject') || 'calculus';
      if (location.hash) {
        const targetAnchor = location.hash.slice(1);
        for (const sub of manifest.subjects) {
          const found = sub.batches && sub.batches.some(b => b.problems && b.problems.some(p => p.anchor === targetAnchor));
          if (found) {
            initialSubject = sub.id;
            break;
          }
        }
      }

      buildSubjectTabs();
      await switchSubject(initialSubject);
    } catch (e) {
      console.error('Failed to load manifest:', e);
      const loading = $('loadingState');
      if (loading) loading.innerHTML = '<p>⚠️ 加载失败，请刷新页面重试。</p>';
    }
  });

  // ────────────────────────────────────────────
  // Theme Management (Light / Dark)
  // ────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
      const icon = $('themeIcon');
      if (icon) icon.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      const icon = $('themeIcon');
      if (icon) icon.textContent = '☀️';
    }

    const toggle = $('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        const icon = $('themeIcon');
        if (icon) icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
      });
    }
  }

  // ────────────────────────────────────────────
  // Header Subject Tabs
  // ────────────────────────────────────────────
  function buildSubjectTabs() {
    const container = $('subjectTabs');
    if (!container) return;
    container.innerHTML = '';

    manifest.subjects.forEach((sub) => {
      const btn = document.createElement('button');
      btn.className = 'p-tab-btn' + (sub.id === currentSubjectId ? ' active' : '');
      btn.textContent = sub.icon + ' ' + sub.name;
      btn.addEventListener('click', () => {
        if (currentSubjectId === sub.id) return;
        qsa('.p-tab-btn', container).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchSubject(sub.id);
        closeMobileMenu();
      });
      container.appendChild(btn);
    });
  }

  // ────────────────────────────────────────────
  // Switch Subject & Load Data
  // ────────────────────────────────────────────
  async function switchSubject(subjectId) {
    currentSubjectId = subjectId;
    try { localStorage.setItem('active_subject', subjectId); } catch (_) {}

    // 同步更新顶栏 Tab 选中状态
    const tabsContainer = $('subjectTabs');
    if (tabsContainer) {
      qsa('.p-tab-btn', tabsContainer).forEach(btn => {
        const match = manifest && manifest.subjects.find(s => s.id === subjectId);
        if (match && btn.textContent.includes(match.name)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    const subject = manifest.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    if ($('subjectTitle')) {
      $('subjectTitle').textContent = subject.icon + ' ' + subject.name + ' · 现代学术预览版';
    }
    if ($('cardsStream')) {
      $('cardsStream').innerHTML = '';
    }
    if ($('loadingState')) {
      $('loadingState').style.display = 'flex';
    }

    try {
      const md = await fetch(subject.file + '?t=' + Date.now()).then(r => r.text());
      allProblems = parseProblems(md, subject);
      if ($('loadingState')) {
        $('loadingState').style.display = 'none';
      }

      buildSidebar(subject, allProblems);
      renderCards(allProblems);

      if ($('subjectStatsText')) {
        $('subjectStatsText').textContent = '已加载 ' + allProblems.length + ' 道核心高频题型 · 卡片式集成速览 · 点击题目右侧展开 SOP 决策层级';
      }

      // Check if hash matches an anchor
      if (location.hash) {
        const anchor = location.hash.slice(1);
        const card = document.getElementById(anchor);
        if (card) {
          card.classList.add('sop-expanded');
          setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
      }
    } catch (e) {
      console.error('Failed to load subject content:', e);
      if ($('loadingState')) {
        $('loadingState').innerHTML = '<p>⚠️ 内容加载失败，请重试。</p>';
      }
    }
  }

  // ────────────────────────────────────────────
  // Intersection Observer for Lazy Math
  // ────────────────────────────────────────────
  function setupLazyMathObserver() {
    if (mathObserver) return;
    mathObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          restoreAllMath(entry.target);
          mathObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '500px 0px' });
  }

  // ────────────────────────────────────────────
  // User Canonical Taxonomy & Normalizers
  // ────────────────────────────────────────────
  const TAXONOMY = {
    calculus: {
      chapters: [
        '1. 函数与极限',
        '2. 一元函数微分',
        '3. 一元函数积分',
        '4. 常微分方程',
        '5. 多元函数微分',
        '6. 二重积分'
      ],
      sources: ['辅导讲义', '600题', '精选题', '严选题']
    },
    linalg: {
      chapters: [
        '1. 行列式',
        '2. 矩阵',
        '3. n维向量',
        '4. 线性方程组',
        '5. 特征值与特征向量',
        '6. 二次型'
      ],
      sources: ['辅导讲义', '660题', '严选题']
    }
  };

  function normalizeChapter(rawText, subjectId) {
    const text = (rawText || '').trim();
    if (subjectId === 'calculus') {
      if (/二重积分/i.test(text)) return '6. 二重积分';
      if (/多元函数微分|多元微分/i.test(text)) return '5. 多元函数微分';
      if (/常微分方程|微分方程/i.test(text)) return '4. 常微分方程';
      if (/一元函数积分|一元积分/i.test(text)) return '3. 一元函数积分';
      if (/一元函数微分|一元微分/i.test(text)) return '2. 一元函数微分';
      if (/函数与极限|极限/i.test(text)) return '1. 函数与极限';
      return '6. 二重积分';
    } else {
      if (/二次型/i.test(text)) return '6. 二次型';
      if (/特征值|特征向量/i.test(text)) return '5. 特征值与特征向量';
      if (/线性方程组|方程组/i.test(text)) return '4. 线性方程组';
      if (/n维向量|向量组|向量/i.test(text)) return '3. n维向量';
      if (/矩阵/i.test(text)) return '2. 矩阵';
      if (/行列式/i.test(text)) return '1. 行列式';
      return '5. 特征值与特征向量';
    }
  }

  function normalizeSource(rawText, num, subjectId) {
    const text = (rawText || '').trim();
    if (/600/i.test(text)) return '600题';
    if (/660/i.test(text)) return '660题';
    if (/精选/i.test(text)) return '精选题';
    if (/严选/i.test(text)) return '严选题';
    if (/讲义|辅导/i.test(text)) return '辅导讲义';
    if (subjectId === 'calculus') {
      return num < 100 ? '严选题' : '600题';
    } else {
      return '严选题';
    }
  }

  // ────────────────────────────────────────────
  // Parse Problems from Markdown
  // ────────────────────────────────────────────
  function parseProblems(md, subject) {
    const parts = md.split(/(?:<a id="problem-\d+"><\/a>|<div id="problem-\d+"><\/div>)/);
    const problems = [];

    for (let i = 1; i < parts.length; i++) {
      const raw = parts[i];
      const titleMatch = raw.match(/^[#\s]*📌\s*题目\s*(\d+)[:：]\s*([^\n]+)/m);
      if (!titleMatch) continue;

      const num = parseInt(titleMatch[1], 10);
      const title = titleMatch[2].trim();
      const anchor = 'problem-' + num;

      // Extract tags
      const tagMatch = raw.match(/题型标签[：:]\s*([^\n\r·]+)/);
      const tags = tagMatch ? tagMatch[1].replace(/`/g, '').split(/[\/、]/).map(t => t.trim()).filter(Boolean) : [];

      // Extract chapter
      let chapterRaw = '';
      const chapterMatch = raw.match(/(?:所属章节|章节)[：:]\s*`?([^`\n\r·]+)`?/);
      if (chapterMatch) chapterRaw = chapterMatch[1].trim();
      const chapter = normalizeChapter(chapterRaw, subject.id);

      // Extract source
      let sourceRaw = '';
      const sourceMatch = raw.match(/(?:来源题集|来源|题集)[：:]\s*`?([^`\n\r·]+)`?/);
      if (sourceMatch) sourceRaw = sourceMatch[1].trim();
      const source = normalizeSource(sourceRaw, num, subject.id);

      // Extract stem (原题呈现)
      let stem = '';
      const stemMatch = raw.match(/\*\*原题呈现\*\*[:：]?([\s\S]*?)(?:####? 第[一1]步|###? 第[一1]步)/);
      if (stemMatch) {
        stem = stemMatch[1].replace(/^[>\s]+/, '').trim();
      }

      // Extract core breakthrough
      let breakthrough = '';
      const btMatch = raw.match(/(?:THEN[：:]|🏆 IF-THEN)[^\n]*\n([\s\S]*?)(?:####? 第[六6]步|###? 第[六6]步)/);
      if (btMatch) {
        breakthrough = btMatch[1].replace(/^[>\s*#]+/, '').trim();
      }

      // Extract final answer
      let finalAns = '';
      const ansMatch = raw.match(/(?:\*\*最终正确答案\*\*|🎯 \*\*最终正确答案\*\*|🎯 \*\*最终结论\*\*)[:：]?([\s\S]*?)(?:\[🔝|\n---|$)/);
      if (ansMatch) {
        finalAns = ansMatch[1].trim();
      }

      // Extract solution body
      let solutionBody = '';
      const solMatch = raw.match(/(?:####? 第[一1]步|###? 第[一1]步)[\s\S]*?(?=(?:\[🔝|\n---|$))/);
      if (solMatch) {
        solutionBody = solMatch[0].trim();
      }

      problems.push({ num, title, chapter, source, anchor, tags, stem, breakthrough, finalAns, solutionBody });
    }

    // Sort by num ascending
    problems.sort((a, b) => a.num - b.num);
    return problems;
  }

  // ────────────────────────────────────────────
  // Render Math-Cards
  // ────────────────────────────────────────────
  function renderCards(problems) {
    const container = $('cardsStream');
    if (!container) return;
    container.innerHTML = '';

    if (!problems.length) {
      container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); font-size:15px;">🔍 未找到匹配的题目，请尝试更换搜索词</div>';
      return;
    }

    problems.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'p-card';
      card.id = p.anchor;
      card.dataset.num = p.num;

      // Header
      const header = document.createElement('div');
      header.className = 'p-card-header';
      header.innerHTML = `
        <div class="p-card-title-group">
          <span class="p-problem-num-badge">P.${p.num}</span>
          <span class="p-source-badge">🏷️ ${p.source}</span>
          <span class="p-chapter-badge">📚 ${p.chapter}</span>
          <h3 class="p-card-title">${renderMathInline(p.title)}</h3>
          <div class="p-card-tags">
            ${p.tags.map(t => `<span class="p-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="p-card-actions">
          <button class="p-copy-btn" type="button" title="一键复制本题与公式">📋 复制</button>
          <button class="p-unmask-btn" type="button" title="揭晓本题手眼法与答案">👁️ 揭晓</button>
          <button class="p-toggle-sop-btn" type="button" aria-label="展开推导">
            <span>SOP 题解</span>
            <span class="p-sop-arrow">▼</span>
          </button>
        </div>
      `;

      card.appendChild(header);

      // Stem Box (原题呈现)
      const stemBox = document.createElement('div');
      stemBox.className = 'p-stem-box';
      stemBox.innerHTML = `
        <div class="p-stem-label">📝 完整原题呈现</div>
        <div class="p-stem-content">${renderMarkdownText(p.stem)}</div>
      `;
      card.appendChild(stemBox);

      // Breakthrough box if available
      if (p.breakthrough) {
        const btBox = document.createElement('div');
        btBox.className = 'p-breakthrough-box';
        btBox.innerHTML = `
          <span class="p-breakthrough-icon">💡</span>
          <div><strong>核心突破手眼法</strong>：${renderMarkdownText(p.breakthrough)}</div>
        `;
        card.appendChild(btBox);
      }

      // Collapsible SOP Drawer
      const drawer = document.createElement('div');
      drawer.className = 'p-sop-drawer';

      drawer.innerHTML = `
        <div class="p-solution-content">${renderMarkdownText(p.solutionBody)}</div>
        ${p.finalAns ? `
          <div class="p-final-answer-box">
            <div class="p-final-answer-title">🏆 最终正确结论</div>
            <div class="p-final-answer-val">${renderMarkdownText(p.finalAns)}</div>
          </div>
        ` : ''}
      `;
      card.appendChild(drawer);

      container.appendChild(card);
      
      // Observe card for lazy KaTeX rendering
      if (mathObserver) {
        mathObserver.observe(card);
      }
    });

    // Style step headings (Layer 1 ~ Layer 6 badges)
    styleStepHeadings(container);

    // Delegated click handler on container for card actions
    container.onclick = (e) => {
      // 1. Toggle SOP Button
      const btn = e.target.closest('.p-toggle-sop-btn');
      if (btn) {
        const card = btn.closest('.p-card');
        if (card) {
          card.classList.toggle('sop-expanded');
          restoreAllMath(card);
        }
        return;
      }

      // 2. Copy Question Button
      const copyBtn = e.target.closest('.p-copy-btn');
      if (copyBtn) {
        const card = copyBtn.closest('.p-card');
        if (card) {
          const num = card.dataset.num;
          const prob = allProblems.find(p => String(p.num) === String(num));
          if (prob) {
            const copyText = `📌 题目 ${prob.num}：${prob.title}\n\n【原题呈现】\n${prob.stem}\n\n【最终结论】\n${prob.finalAns || '见题解'}`;
            navigator.clipboard.writeText(copyText).then(() => {
              showToast(`✅ 题目 P.${prob.num} 已复制到剪贴板！`);
            }).catch(() => {
              showToast('⚠️ 复制失败，请手动选取文本');
            });
          }
        }
        return;
      }

      // 3. Unmask Button (Blind Test Mode)
      const unmaskBtn = e.target.closest('.p-unmask-btn');
      if (unmaskBtn) {
        const card = unmaskBtn.closest('.p-card');
        if (card) {
          card.classList.toggle('unmasked');
          const bt = card.querySelector('.p-breakthrough-box');
          if (bt) bt.classList.toggle('unmasked');
          restoreAllMath(card);
          showToast(card.classList.contains('unmasked') ? '👁️ 本题已揭晓' : '🙈 本题已重新遮罩');
        }
        return;
      }

      // 4. Click Breakthrough Box to toggle unmask in Blind Mode
      const btBox = e.target.closest('.p-breakthrough-box');
      if (btBox && document.body.classList.contains('mode-blind-test')) {
        btBox.classList.toggle('unmasked');
        return;
      }
    };
  }

  function styleStepHeadings(root) {
    root.querySelectorAll('.p-solution-content').forEach((solContent) => {
      const headings = Array.from(solContent.querySelectorAll('h1, h2, h3, h4, h5'));
      if (!headings.length) return;

      const timeline = document.createElement('div');
      timeline.className = 'p-timeline';

      let currentStep = null;
      let currentContent = null;

      Array.from(solContent.childNodes).forEach((node) => {
        if (node.nodeType === 1 && /^H[1-5]$/i.test(node.tagName) && /第[一二三四五六1-6]步/.test(node.textContent)) {
          const txt = node.textContent;
          let cls = 'l1';
          if (/第[二2]步/.test(txt)) cls = 'l2';
          else if (/第[三3]步/.test(txt)) cls = 'l3';
          else if (/第[四4]步/.test(txt)) cls = 'l4';
          else if (/第[五5]步/.test(txt)) cls = 'l5';
          else if (/第[六6]步/.test(txt)) cls = 'l6';

          currentStep = document.createElement('div');
          currentStep.className = 'p-timeline-step ' + cls;

          const marker = document.createElement('div');
          marker.className = 'p-timeline-node';
          currentStep.appendChild(marker);

          const badge = document.createElement('div');
          badge.className = 'p-step-badge ' + cls;
          badge.innerHTML = node.innerHTML;
          currentStep.appendChild(badge);

          currentContent = document.createElement('div');
          currentContent.className = 'p-timeline-content';
          currentStep.appendChild(currentContent);

          timeline.appendChild(currentStep);
        } else if (currentContent) {
          currentContent.appendChild(node.cloneNode(true));
        }
      });

      if (timeline.children.length > 0) {
        solContent.innerHTML = '';
        solContent.appendChild(timeline);
      }
    });
  }

  // ────────────────────────────────────────────
  // Sidebar Build (Tri-Dimension: Chapter vs Source vs Date)
  // ────────────────────────────────────────────
  function buildSidebar(subject, problems) {
    const nav = $('sidebarNav');
    if (!nav) return;
    nav.innerHTML = '';

    const dim = localStorage.getItem('sidebarDimension') || 'chapter';
    const isGrid = localStorage.getItem('sidebarViewMode') === 'grid';

    if (dim === 'chapter') {
      // 📚 按考研官方大纲 6 大标准章节归属分类（严格保持 1..6 顺序）
      const canonicalList = TAXONOMY[subject.id] ? TAXONOMY[subject.id].chapters : [];
      const chapterMap = {};
      problems.forEach((p) => {
        const ch = p.chapter || '考点专题';
        if (!chapterMap[ch]) chapterMap[ch] = [];
        chapterMap[ch].push(p);
      });

      const orderedChapters = canonicalList.filter(ch => chapterMap[ch] && chapterMap[ch].length > 0);
      Object.keys(chapterMap).forEach(ch => {
        if (!orderedChapters.includes(ch)) orderedChapters.push(ch);
      });

      const targetAnchor = location.hash ? location.hash.slice(1) : '';

      orderedChapters.forEach((ch, index) => {
        const chProblems = chapterMap[ch];
        const group = document.createElement('div');
        group.className = 'p-nav-date-group';

        // 智能折叠判定：若存在多章，仅展开包含当前目标题目的章节（或第一章），其余折叠以大幅节省纵向空间
        const containsTarget = Boolean(targetAnchor && chProblems.some(p => p.anchor === targetAnchor));
        if (orderedChapters.length > 1 && !containsTarget && index > 0) {
          group.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'p-nav-date-header';
        header.innerHTML = `
          <div class="p-date-title-box">
            <span>📚 ${ch}</span>
            <span class="p-date-badge">${chProblems.length} 题</span>
          </div>
          <span class="p-date-arrow">▼</span>
        `;
        header.addEventListener('click', () => {
          group.classList.toggle('collapsed');
          updateToggleAllBtnState();
        });
        group.appendChild(header);

        const problemList = document.createElement('div');
        problemList.className = 'p-nav-problems' + (isGrid ? ' grid-mode' : '');

        chProblems.forEach((p) => {
          const a = document.createElement('a');
          a.className = 'p-nav-item';
          a.href = '#' + p.anchor;
          a.dataset.anchor = p.anchor;
          a.title = p.num + '. [' + p.source + '] ' + stripMath(p.title);
          a.innerHTML = `
            <span class="p-nav-num">${p.num}</span>
            <span class="p-nav-text">${stripMath(p.title)}</span>
          `;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const card = document.getElementById(p.anchor);
            if (card) {
              card.classList.add('sop-expanded');
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
              history.replaceState(null, '', '#' + p.anchor);
              highlightActiveNavItem(p.anchor);
            }
            closeMobileMenu();
          });
          problemList.appendChild(a);
        });

        group.appendChild(problemList);
        nav.appendChild(group);
      });
    } else if (dim === 'source') {
      // 🏷️ 按用户来源题集（严选题 / 600题 / 660题 / 辅导讲义 / 精选题）分类
      const canonicalSources = TAXONOMY[subject.id] ? TAXONOMY[subject.id].sources : [];
      const sourceMap = {};
      problems.forEach((p) => {
        const src = p.source || '精选题集';
        if (!sourceMap[src]) sourceMap[src] = [];
        sourceMap[src].push(p);
      });

      const orderedSources = canonicalSources.filter(s => sourceMap[s] && sourceMap[s].length > 0);
      Object.keys(sourceMap).forEach(s => {
        if (!orderedSources.includes(s)) orderedSources.push(s);
      });

      const targetAnchor = location.hash ? location.hash.slice(1) : '';

      orderedSources.forEach((src, index) => {
        const srcProblems = sourceMap[src];
        const group = document.createElement('div');
        group.className = 'p-nav-date-group';

        const containsTarget = Boolean(targetAnchor && srcProblems.some(p => p.anchor === targetAnchor));
        if (orderedSources.length > 1 && !containsTarget && index > 0) {
          group.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'p-nav-date-header';
        header.innerHTML = `
          <div class="p-date-title-box">
            <span>🏷️ ${src}</span>
            <span class="p-date-badge">${srcProblems.length} 题</span>
          </div>
          <span class="p-date-arrow">▼</span>
        `;
        header.addEventListener('click', () => {
          group.classList.toggle('collapsed');
          updateToggleAllBtnState();
        });
        group.appendChild(header);

        const problemList = document.createElement('div');
        problemList.className = 'p-nav-problems' + (isGrid ? ' grid-mode' : '');

        srcProblems.forEach((p) => {
          const a = document.createElement('a');
          a.className = 'p-nav-item';
          a.href = '#' + p.anchor;
          a.dataset.anchor = p.anchor;
          a.title = p.num + '. [' + p.chapter + '] ' + stripMath(p.title);
          a.innerHTML = `
            <span class="p-nav-num">${p.num}</span>
            <span class="p-nav-text">${stripMath(p.title)}</span>
          `;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const card = document.getElementById(p.anchor);
            if (card) {
              card.classList.add('sop-expanded');
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
              history.replaceState(null, '', '#' + p.anchor);
              highlightActiveNavItem(p.anchor);
            }
            closeMobileMenu();
          });
          problemList.appendChild(a);
        });

        group.appendChild(problemList);
        nav.appendChild(group);
      });
    } else {
      // 📅 按收录日期归档
      const batches = (subject.batches && subject.batches.length)
        ? subject.batches
        : [{ date: '2026-09-15', problems: problems.map(p => ({ num: p.num, title: p.title, anchor: p.anchor })) }];

      const targetAnchor = location.hash ? location.hash.slice(1) : '';

      batches.forEach((batch, index) => {
        const group = document.createElement('div');
        group.className = 'p-nav-date-group';

        const batchProblems = problems.filter(p => batch.problems.some(bp => bp.num === p.num));
        if (!batchProblems.length) return;

        const containsTarget = Boolean(targetAnchor && batchProblems.some(p => p.anchor === targetAnchor));
        if (batches.length > 1 && !containsTarget && index > 0) {
          group.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'p-nav-date-header';
        header.innerHTML = `
          <div class="p-date-title-box">
            <span>📅 ${batch.date}</span>
            <span class="p-date-badge">${batchProblems.length} 题</span>
          </div>
          <span class="p-date-arrow">▼</span>
        `;
        header.addEventListener('click', () => {
          group.classList.toggle('collapsed');
          updateToggleAllBtnState();
        });
        group.appendChild(header);

        const problemList = document.createElement('div');
        problemList.className = 'p-nav-problems' + (isGrid ? ' grid-mode' : '');

        batchProblems.forEach((p) => {
          const a = document.createElement('a');
          a.className = 'p-nav-item';
          a.href = '#' + p.anchor;
          a.dataset.anchor = p.anchor;
          a.title = p.num + '. ' + stripMath(p.title);
          a.innerHTML = `
            <span class="p-nav-num">${p.num}</span>
            <span class="p-nav-text">${stripMath(p.title)}</span>
          `;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const card = document.getElementById(p.anchor);
            if (card) {
              card.classList.add('sop-expanded');
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
              history.replaceState(null, '', '#' + p.anchor);
              highlightActiveNavItem(p.anchor);
            }
            closeMobileMenu();
          });
          problemList.appendChild(a);
        });

        group.appendChild(problemList);
        nav.appendChild(group);
      });
    }

    updateToggleAllBtnState();
  }

  function highlightActiveNavItem(anchor) {
    qsa('.p-nav-item', $('sidebarNav')).forEach((item) => {
      const isActive = item.dataset.anchor === anchor;
      item.classList.toggle('active', isActive);
      if (isActive) {
        const group = item.closest('.p-nav-date-group');
        if (group && group.classList.contains('collapsed')) {
          group.classList.remove('collapsed');
          updateToggleAllBtnState();
        }
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  function updateToggleAllBtnState() {
    const btn = $('toggleAllGroupsBtn');
    if (!btn) return;
    const groups = qsa('.p-nav-date-group', $('sidebarNav'));
    if (!groups.length) return;
    const allCollapsed = groups.every(g => g.classList.contains('collapsed'));
    btn.textContent = allCollapsed ? '📂 全部展开' : '📁 全部折叠';
    btn.title = allCollapsed ? '展开所有章节分组' : '折叠所有章节分组';
  }

  // ────────────────────────────────────────────
  // Real-time Search Filter
  // ────────────────────────────────────────────
  function setupSearch() {
    const input = $('searchInput');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        renderCards(allProblems);
        return;
      }
      const filtered = allProblems.filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q)) ||
          p.stem.toLowerCase().includes(q) ||
          String(p.num).includes(q)
        );
      });
      renderCards(filtered);
    });
  }

  // ────────────────────────────────────────────
  // Global View Controls (Expand All / Collapse All)
  // ────────────────────────────────────────────
  function setupGlobalControls() {
    const expandAll = () => qsa('.p-card').forEach(c => c.classList.add('sop-expanded'));
    const collapseAll = () => qsa('.p-card').forEach(c => c.classList.remove('sop-expanded'));

    if ($('expandAllBtn')) $('expandAllBtn').addEventListener('click', expandAll);
    if ($('collapseAllBtn')) $('collapseAllBtn').addEventListener('click', collapseAll);
    if ($('expandStreamBtn')) $('expandStreamBtn').addEventListener('click', expandAll);
    if ($('collapseStreamBtn')) $('collapseStreamBtn').addEventListener('click', collapseAll);
  }

  // ────────────────────────────────────────────
  // Markdown & KaTeX Helpers
  // ────────────────────────────────────────────
  let mathBlocks = [];
  let mathCounter = 0;

  function renderMarkdownText(md) {
    if (!md) return '';

    // 1. Sanitize 4-space indentations
    const cleanMd = sanitizeMarkdown(md);

    // 2. Extract math
    const extracted = extractMath(cleanMd);

    // 3. Parse Markdown
    let html = marked.parse(extracted.md, { gfm: true, breaks: false });

    // 4. Safety-net: Decode any escaped math placeholder spans
    html = html.replace(/&lt;span class="math-ph" data-mid="(\d+)"&gt;&lt;\/span&gt;/g, '<span class="math-ph" data-mid="$1"></span>');

    // Store extracted blocks globally for restore
    extracted.blocks.forEach(b => mathBlocks[b.id] = b);

    return html;
  }

  function renderMathInline(str) {
    if (!str) return '';
    const extracted = extractMath(str);
    extracted.blocks.forEach(b => mathBlocks[b.id] = b);
    return extracted.md;
  }

  function sanitizeMarkdown(md) {
    const lines = md.split('\n');
    let inFence = false;
    const result = lines.map((line) => {
      if (line.trim().indexOf('```') === 0) {
        inFence = !inFence;
        return line;
      }
      if (!inFence && /^\s{4,}/.test(line) && !line.trim().startsWith('*') && !line.trim().startsWith('-')) {
        return line.replace(/^\s{4}/, '  ');
      }
      return line;
    });
    return result.join('\n');
  }

  function extractMath(md) {
    const blocks = [];
    // Display math
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
      const id = mathCounter++;
      blocks.push({ id, display: true, tex: tex.trim() });
      return `<span class="math-ph" data-mid="${id}"></span>`;
    });
    // Inline math
    md = md.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, tex) => {
      const id = mathCounter++;
      blocks.push({ id, display: false, tex: tex.trim() });
      return `<span class="math-ph" data-mid="${id}"></span>`;
    });
    return { md, blocks };
  }

  function restoreAllMath(root) {
    root.querySelectorAll('.math-ph').forEach((span) => {
      const id = parseInt(span.getAttribute('data-mid'), 10);
      const block = mathBlocks[id];
      if (!block) return;

      try {
        const rendered = katex.renderToString(block.tex, {
          displayMode: block.display,
          throwOnError: false,
          trust: true,
        });
        const wrapper = document.createElement(block.display ? 'div' : 'span');
        wrapper.className = block.display ? 'katex-display-wrapper' : 'katex-inline-wrapper';
        wrapper.innerHTML = rendered;
        span.replaceWith(wrapper);
      } catch (e) {
        span.textContent = block.display ? `$$${block.tex}$$` : `$${block.tex}$`;
      }
    });
  }

  function stripMath(str) {
    return str.replace(/\$\$[\s\S]*?\$\$/g, '[公式]').replace(/\$[^\$]+\$/g, '[式]');
  }

  // ────────────────────────────────────────────
  // Sidebar Controller (自由伸缩 + 抽屉 + 快捷键)
  // ────────────────────────────────────────────
  let sidebarCollapsedDesktop = localStorage.getItem('mathSidebarCollapsed') === 'true';

  function setupSidebar() {
    const menuBtn = $('menuBtn');
    const closeBtn = $('closeSidebarBtn');
    const backdrop = $('sidebarBackdrop');
    const floatingBtn = $('floatingNavBtn');
    const dockNavBtn = $('dockNavBtn');
    const toggleAllBtn = $('toggleAllGroupsBtn');

    // 恢复桌面端收起偏好
    if (window.innerWidth > 900) {
      if (sidebarCollapsedDesktop) {
        document.body.classList.add('sidebar-collapsed');
      }
    }

    const toggleSidebar = (forceOpen) => {
      const isMobile = window.innerWidth <= 900;
      const sb = $('sidebar');
      const bd = $('sidebarBackdrop');
      if (isMobile) {
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !sb.classList.contains('open');
        sb.classList.toggle('open', shouldOpen);
        if (bd) bd.classList.toggle('show', shouldOpen);
      } else {
        const willCollapse = typeof forceOpen === 'boolean' ? !forceOpen : !document.body.classList.contains('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', willCollapse);
        sidebarCollapsedDesktop = willCollapse;
        localStorage.setItem('mathSidebarCollapsed', willCollapse ? 'true' : 'false');
      }
    };

    const closeSidebar = () => {
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        const sb = $('sidebar');
        const bd = $('sidebarBackdrop');
        if (sb) sb.classList.remove('open');
        if (bd) bd.classList.remove('show');
      } else {
        document.body.classList.add('sidebar-collapsed');
        sidebarCollapsedDesktop = true;
        localStorage.setItem('mathSidebarCollapsed', 'true');
      }
    };

    const openSidebar = () => {
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        const sb = $('sidebar');
        const bd = $('sidebarBackdrop');
        if (sb) sb.classList.add('open');
        if (bd) bd.classList.add('show');
      } else {
        document.body.classList.remove('sidebar-collapsed');
        sidebarCollapsedDesktop = false;
        localStorage.setItem('mathSidebarCollapsed', 'false');
      }
    };

    if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar());
    if (closeBtn) closeBtn.addEventListener('click', () => closeSidebar());
    if (backdrop) backdrop.addEventListener('click', () => closeSidebar());
    if (floatingBtn) floatingBtn.addEventListener('click', () => openSidebar());
    if (dockNavBtn) dockNavBtn.addEventListener('click', () => toggleSidebar());

    // 快捷键支持：按 M 唤出/收起目录，按 ESC 收起目录
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'Escape') {
        closeSidebar();
      }
    });

    // 全部折叠 / 全部展开
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const groups = qsa('.p-nav-date-group', $('sidebarNav'));
        if (!groups.length) return;
        const allCollapsed = groups.every(g => g.classList.contains('collapsed'));
        groups.forEach(g => {
          g.classList.toggle('collapsed', !allCollapsed);
        });
        updateToggleAllBtnState();
      });
    }
  }

  function closeMobileMenu() {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      const sb = $('sidebar');
      const bd = $('sidebarBackdrop');
      if (sb) sb.classList.remove('open');
      if (bd) bd.classList.remove('show');
    }
  }

  // ────────────────────────────────────────────
  // Blind Test Mode (自测遮罩模式)
  // ────────────────────────────────────────────
  function setupBlindTestMode() {
    const toggleBlindMode = () => {
      const isBlind = document.body.classList.toggle('mode-blind-test');
      localStorage.setItem('blindTestMode', isBlind ? 'true' : 'false');
      updateBlindBtnState(isBlind);
      showToast(isBlind ? '🙈 已开启自测做题模式（手眼法与SOP解答已遮罩）' : '👁️ 已退出自测模式');
    };

    const updateBlindBtnState = (isBlind) => {
      const btnText = $('blindTestText');
      const btnIcon = $('blindTestIcon');
      if (btnText) btnText.textContent = isBlind ? '退出自测' : '自测做题模式';
      if (btnIcon) btnIcon.textContent = isBlind ? '👁️' : '🙈';

      const dockBtn = $('dockBlindBtn');
      if (dockBtn) dockBtn.textContent = isBlind ? '👁️' : '🙈';
    };

    if ($('blindTestBtn')) $('blindTestBtn').addEventListener('click', toggleBlindMode);
    if ($('dockBlindBtn')) $('dockBlindBtn').addEventListener('click', toggleBlindMode);

    // Restore saved state
    if (localStorage.getItem('blindTestMode') === 'true') {
      document.body.classList.add('mode-blind-test');
      updateBlindBtnState(true);
    }
  }

  // ────────────────────────────────────────────
  // Sidebar View Mode (章节/日期 维度 + 列表/矩阵 视图)
  // ────────────────────────────────────────────
  function setupSidebarViewMode() {
    // 1. 分类维度切换（📚 章节 vs 📅 日期）
    const dimContainer = $('sidebarDimensionTabs');
    if (dimContainer) {
      const setDim = (dim) => {
        qsa('.p-dim-tab', dimContainer).forEach(b => b.classList.toggle('active', b.dataset.dim === dim));
        localStorage.setItem('sidebarDimension', dim);
        const currentSub = manifest && manifest.subjects.find(s => s.id === currentSubjectId);
        if (currentSub && allProblems.length) {
          buildSidebar(currentSub, allProblems);
        }
        showToast(dim === 'chapter' ? '📚 已切换为按知识点章节分类' : (dim === 'source' ? '🏷️ 已切换为按题集来源分类' : '📅 已切换为按收录日期归档'));
      };

      qsa('.p-dim-tab', dimContainer).forEach(btn => {
        btn.addEventListener('click', () => setDim(btn.dataset.dim));
      });

      const savedDim = localStorage.getItem('sidebarDimension') || 'chapter';
      qsa('.p-dim-tab', dimContainer).forEach(b => b.classList.toggle('active', b.dataset.dim === savedDim));
    }

    // 2. 视图展示切换（列表 vs 题号矩阵）
    const container = $('sidebarViewMode');
    if (!container) return;

    const setMode = (mode) => {
      qsa('.p-mode-tab', container).forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      qsa('.p-nav-problems', $('sidebarNav')).forEach(el => {
        el.classList.toggle('grid-mode', mode === 'grid');
      });
      localStorage.setItem('sidebarViewMode', mode);
      showToast(mode === 'grid' ? '⊞ 已切换为题号矩阵视图' : '☰ 已切换为列表视图');
    };

    qsa('.p-mode-tab', container).forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Restore saved mode
    const saved = localStorage.getItem('sidebarViewMode');
    if (saved) {
      qsa('.p-mode-tab', container).forEach(b => b.classList.toggle('active', b.dataset.mode === saved));
    }
  }

  // ────────────────────────────────────────────
  // Floating Quick Dock (悬浮快捷工具栏)
  // ────────────────────────────────────────────
  function setupFloatingDock() {
    const dock = $('floatingDock');
    if (!dock) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        dock.classList.add('visible');
      } else {
        dock.classList.remove('visible');
      }
    });

    if ($('dockTopBtn')) {
      $('dockTopBtn').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if ($('dockExpandBtn')) {
      $('dockExpandBtn').addEventListener('click', () => {
        const cards = qsa('.p-card');
        const anyCollapsed = cards.some(c => !c.classList.contains('sop-expanded'));
        cards.forEach(c => {
          if (anyCollapsed) {
            c.classList.add('sop-expanded');
            restoreAllMath(c);
          } else {
            c.classList.remove('sop-expanded');
          }
        });
        showToast(anyCollapsed ? '📖 已全部展开 SOP' : '📑 已全部折叠');
      });
    }
  }

  // ────────────────────────────────────────────
  // Toast Notification System
  // ────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('pToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

})();
