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
  window.switchSubject = switchSubject;
  window.getCurrentSubjectId = () => currentSubjectId;
  window.getManifest = () => manifest;
  window.getAllProblems = () => allProblems;
  window.rebuildSidebar = () => {
    const currentSub = manifest && manifest.subjects.find(s => s.id === currentSubjectId);
    if (currentSub && allProblems.length) {
      buildSidebar(currentSub, allProblems);
    }
  };

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

      updateSidebarDimensionTabs(subject.id);
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
      sources: ['辅导讲义', '660题', '严选题', '精选题']
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
    },
    past_exams: {
      chapters: [
        '1. 函数与极限',
        '2. 一元函数微分',
        '3. 一元函数积分',
        '4. 常微分方程',
        '5. 多元函数微分',
        '6. 二重积分',
        '7. 行列式',
        '8. 矩阵',
        '9. n维向量',
        '10. 线性方程组',
        '11. 特征值与特征向量',
        '12. 二次型'
      ],
      sources: Array.from({ length: 22 }, (_, i) => `${2005 + i}年数二`),
      pains: ['🔴 无思路', '🟠 计算失误', '🔵 产生疑问', '🟡 审题陷阱']
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
    } else if (subjectId === 'linalg') {
      if (/二次型/i.test(text)) return '6. 二次型';
      if (/特征值|特征向量/i.test(text)) return '5. 特征值与特征向量';
      if (/线性方程组|方程组/i.test(text)) return '4. 线性方程组';
      if (/n维向量|向量组|向量/i.test(text)) return '3. n维向量';
      if (/矩阵/i.test(text)) return '2. 矩阵';
      if (/行列式/i.test(text)) return '1. 行列式';
      return '5. 特征值与特征向量';
    } else {
      if (/二次型/i.test(text)) return '12. 二次型';
      if (/特征值|特征向量/i.test(text)) return '11. 特征值与特征向量';
      if (/线性方程组|方程组/i.test(text)) return '10. 线性方程组';
      if (/n维向量|向量组|向量/i.test(text)) return '9. n维向量';
      if (/矩阵/i.test(text)) return '8. 矩阵';
      if (/行列式/i.test(text)) return '7. 行列式';
      if (/二重积分/i.test(text)) return '6. 二重积分';
      if (/多元函数微分|多元微分/i.test(text)) return '5. 多元函数微分';
      if (/常微分方程|微分方程/i.test(text)) return '4. 常微分方程';
      if (/一元函数积分|一元积分/i.test(text)) return '3. 一元函数积分';
      if (/一元函数微分|一元微分/i.test(text)) return '2. 一元函数微分';
      if (/函数与极限|极限/i.test(text)) return '1. 函数与极限';
      return text || '未分类';
    }
  }

  function normalizeSource(rawText, num, subjectId) {
    const text = (rawText || '').trim();
    if (subjectId === 'past_exams') {
      const yearMatch = text.match(/(\d{4})/i) || String(num).match(/(\d{4})/i);
      if (yearMatch) return `${yearMatch[1]}年数二`;
      return text || '历年真题';
    }
    if (/660|600/i.test(text)) return '660题';
    if (/精选/i.test(text)) return '精选题';
    if (/严选/i.test(text)) return '严选题';
    if (/讲义|辅导/i.test(text)) return '辅导讲义';
    if (subjectId === 'calculus') {
      return num < 100 ? '严选题' : '660题';
    } else {
      return '严选题';
    }
  }

  function extractPainPoint(raw, tags) {
    const allText = (tags.join(' ') + ' ' + raw);
    if (/无思路/.test(allText)) return '无思路';
    if (/计算失误/.test(allText)) return '计算失误';
    if (/产生疑问|疑问/.test(allText)) return '产生疑问';
    if (/审题陷阱|陷阱|题意陷阱/.test(allText)) return '审题陷阱';
    return '';
  }

  function getPainIcon(p) {
    if (/无思路/.test(p)) return '🔴';
    if (/计算失误/.test(p)) return '🟠';
    if (/产生疑问|疑问/.test(p)) return '🔵';
    if (/审题陷阱|陷阱/.test(p)) return '🟡';
    return '🎯';
  }

  function getPainClass(p) {
    if (/无思路/.test(p)) return 'no-clue';
    if (/计算失误/.test(p)) return 'calc-error';
    if (/产生疑问|疑问/.test(p)) return 'doubt';
    if (/审题陷阱|陷阱/.test(p)) return 'trap';
    return 'other';
  }

  function getTagClass(t) {
    if (/无思路/.test(t)) return ' p-tag-pain-no-clue';
    if (/计算失误/.test(t)) return ' p-tag-pain-calc-error';
    if (/产生疑问|疑问/.test(t)) return ' p-tag-pain-doubt';
    if (/审题陷阱|陷阱/.test(t)) return ' p-tag-pain-trap';
    return '';
  }

  // ────────────────────────────────────────────
  // Parse Problems from Markdown
  // ────────────────────────────────────────────
  function parseProblems(md, subject) {
    const anchorRegex = /<(?:a|div)\s+id="(problem-[^"]+)"/g;
    const anchorMatches = [...md.matchAll(anchorRegex)].map(m => m[1]);
    const parts = md.split(/(?:<a id="problem-[^"]+"><\/a>|<div id="problem-[^"]+"><\/div>)/);
    const problems = [];
    const isPastExam = subject.id === 'past_exams';

    for (let i = 1; i < parts.length; i++) {
      const raw = parts[i];
      const titleMatch = raw.match(/^[#\s]*📌\s*题目\s*([0-9a-zA-Z_-]+)[:：]\s*([^\n]+)/m);
      if (!titleMatch) continue;

      const rawNum = titleMatch[1].trim();
      const num = isPastExam ? rawNum : parseInt(rawNum, 10);
      const title = titleMatch[2].trim();
      const anchor = anchorMatches[i - 1] || ('problem-' + num);

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

      // Extract pain point
      const painPoint = isPastExam ? extractPainPoint(raw, tags) : '';

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

      const item = { num, title, chapter, source, anchor, tags, stem, breakthrough, finalAns, solutionBody };
      if (painPoint) item.painPoint = painPoint;
      problems.push(item);
    }

    // Sort naturally
    problems.sort((a, b) => {
      if (typeof a.num === 'number' && typeof b.num === 'number') {
        return a.num - b.num;
      }
      return String(a.num).localeCompare(String(b.num), undefined, { numeric: true });
    });
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
      if (currentSubjectId === 'past_exams') {
        container.innerHTML = `
          <div class="p-empty-state-card">
            <div class="p-empty-icon">🏆</div>
            <h3>考研数学（二）历年真题 · SOP 错因复盘模块已就绪</h3>
            <p>覆盖 2005–2026 年数二全部真题。本题库旨在精炼你亲身做题踩坑的高价值题目。</p>
            <div class="p-empty-guide">
              <div class="p-guide-title">💡 录入协议说明（在对话框或 inbox.md 中发送）：</div>
              <code>2021年数二 T15 无思路 二重积分<br>[题目内容与演算...]</code>
              <div class="p-guide-desc">四维错因聚合：🔴 无思路 / 🟠 计算失误 / 🔵 产生疑问 / 🟡 审题陷阱</div>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); font-size:15px;">🔍 未找到匹配的题目，请尝试更换搜索词</div>';
      }
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
          ${p.painPoint ? `<span class="p-pain-badge p-pain-${getPainClass(p.painPoint)}">${getPainIcon(p.painPoint)} ${p.painPoint}</span>` : ''}
          <span class="p-source-badge">🏷️ ${p.source}</span>
          <span class="p-chapter-badge">📚 ${p.chapter}</span>
          <h3 class="p-card-title">${renderMathInline(p.title)}</h3>
          ${(window.getUserMarkBadgeHtml && window.getUserMarkBadgeHtml(p.anchor)) || ''}
          <div class="p-card-tags">
            ${p.tags.map(t => `<span class="p-tag${getTagClass(t)}">${t}</span>`).join('')}
          </div>
        </div>
        <div class="p-card-actions">
          <button class="p-mark-btn" type="button" title="随手记与星标">⭐️ 标记</button>
          <button class="p-copy-btn" type="button" title="一键复制本题与公式">📋 复制</button>
          <button class="p-unmask-btn" type="button" title="揭晓本题手眼法与答案">👁️ 揭晓</button>
          <button class="p-toggle-sop-btn" type="button" aria-label="展开推导">
            <span>SOP 题解</span>
            <span class="p-sop-arrow">▼</span>
          </button>
        </div>
      `;

      card.appendChild(header);

      // Inject existing note
      const existingNote = window.getUserNoteHtml && window.getUserNoteHtml(p.anchor);
      if (existingNote) {
        const noteBox = document.createElement('div');
        noteBox.className = 'p-card-note-box';
        noteBox.innerHTML = existingNote;
        card.appendChild(noteBox);
      }

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

      // 1.5. Mark Button
      const markBtn = e.target.closest('.p-mark-btn');
      if (markBtn) {
        const card = markBtn.closest('.p-card');
        if (card && window.openNoteModal) {
          const prob = allProblems.find(p => String(p.num) === String(card.dataset.num));
          if (prob) window.openNoteModal(prob);
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

    if (!problems.length) {
      if (subject.id === 'past_exams') {
        nav.innerHTML = '<div style="padding:28px 16px; text-align:center; color:var(--text-muted); font-size:13px; line-height:1.6;">🏆 暂无录入真题<br><span style="font-size:11.5px; opacity:0.8;">遇到卡点题目发送入库即可</span></div>';
      } else {
        nav.innerHTML = '<div style="padding:28px 16px; text-align:center; color:var(--text-muted); font-size:13px;">暂无题目</div>';
      }
      return;
    }

    let dim = localStorage.getItem('sidebarDimension_' + subject.id) || localStorage.getItem('sidebarDimension') || 'chapter';
    if (subject.id === 'past_exams' && (dim === 'source' || dim === 'date')) {
      dim = 'chapter';
    } else if (subject.id !== 'past_exams' && (dim === 'year' || dim === 'pain')) {
      dim = 'chapter';
    }

    const isGrid = localStorage.getItem('sidebarViewMode') === 'grid';

    if (dim === 'chapter') {
      // 📚 按考研官方大纲标准章节归属分类（严格保持 1..12 顺序）
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
    } else if (dim === 'year') {
      // 📋 按真题年份（2005~2026）套卷聚类
      const yearMap = {};
      problems.forEach(p => {
        let yr = '历年真题';
        const ym = String(p.source || p.num).match(/(\d{4})/);
        if (ym) yr = `${ym[1]}年数二`;
        if (!yearMap[yr]) yearMap[yr] = [];
        yearMap[yr].push(p);
      });

      const sortedYears = Object.keys(yearMap).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      const targetAnchor = location.hash ? location.hash.slice(1) : '';

      sortedYears.forEach((yr, index) => {
        const yrProblems = yearMap[yr];
        const group = document.createElement('div');
        group.className = 'p-nav-date-group';

        const containsTarget = Boolean(targetAnchor && yrProblems.some(p => p.anchor === targetAnchor));
        if (sortedYears.length > 1 && !containsTarget && index > 0) {
          group.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'p-nav-date-header';
        header.innerHTML = `
          <div class="p-date-title-box">
            <span>📋 ${yr}</span>
            <span class="p-date-badge">${yrProblems.length} 题</span>
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

        yrProblems.forEach(p => {
          const a = document.createElement('a');
          a.className = 'p-nav-item';
          a.href = '#' + p.anchor;
          a.dataset.anchor = p.anchor;
          a.title = `${p.num}. [${p.chapter}] ${stripMath(p.title)}`;
          a.innerHTML = `
            <span class="p-nav-num">${p.num}</span>
            <span class="p-nav-text">${p.painPoint ? getPainIcon(p.painPoint) + ' ' : ''}${stripMath(p.title)}</span>
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
    } else if (dim === 'pain') {
      // 🎯 按四维痛点归因聚合（🔴 无思路 / 🟠 计算失误 / 🔵 产生疑问 / 🟡 审题陷阱）
      const PAIN_ORDER = [
        { key: '无思路', label: '🔴 无思路' },
        { key: '计算失误', label: '🟠 计算失误' },
        { key: '产生疑问', label: '🔵 产生疑问' },
        { key: '审题陷阱', label: '🟡 审题陷阱' },
        { key: '未归因', label: '⚪ 暂未归因' }
      ];

      const painMap = {
        '无思路': [],
        '计算失误': [],
        '产生疑问': [],
        '审题陷阱': [],
        '未归因': []
      };

      problems.forEach(p => {
        const pk = p.painPoint || '未归因';
        if (painMap[pk]) painMap[pk].push(p);
        else painMap['未归因'].push(p);
      });

      const targetAnchor = location.hash ? location.hash.slice(1) : '';

      PAIN_ORDER.forEach((painItem, index) => {
        const pList = painMap[painItem.key] || [];
        if (!pList.length) return;

        const group = document.createElement('div');
        group.className = 'p-nav-date-group';

        const containsTarget = Boolean(targetAnchor && pList.some(p => p.anchor === targetAnchor));
        if (index > 0 && !containsTarget) {
          group.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'p-nav-date-header';
        header.innerHTML = `
          <div class="p-date-title-box">
            <span>${painItem.label}</span>
            <span class="p-date-badge">${pList.length} 题</span>
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

        pList.forEach(p => {
          const a = document.createElement('a');
          a.className = 'p-nav-item';
          a.href = '#' + p.anchor;
          a.dataset.anchor = p.anchor;
          a.title = `${p.num}. [${p.source}] ${stripMath(p.title)}`;
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

        // 核心优化：在各题集内按考研 6 大标准章节细分子组，解决纯序号无序混杂问题
        const canonicalChapters = TAXONOMY[subject.id] ? TAXONOMY[subject.id].chapters : [];
        const chMap = {};
        srcProblems.forEach((p) => {
          const ch = p.chapter || '考点专题';
          if (!chMap[ch]) chMap[ch] = [];
          chMap[ch].push(p);
        });

        const orderedChapters = canonicalChapters.filter(ch => chMap[ch] && chMap[ch].length > 0);
        Object.keys(chMap).forEach(ch => {
          if (!orderedChapters.includes(ch)) orderedChapters.push(ch);
        });

        const groupBody = document.createElement('div');
        groupBody.className = 'p-nav-group-body';

        orderedChapters.forEach((ch) => {
          const chProblems = chMap[ch];
          const subGroup = document.createElement('div');
          subGroup.className = 'p-nav-subgroup';

          const subHeader = document.createElement('div');
          subHeader.className = 'p-nav-sub-header';
          subHeader.innerHTML = `
            <span class="p-sub-title">📚 ${ch}</span>
            <span class="p-sub-badge">${chProblems.length} 题</span>
          `;
          subGroup.appendChild(subHeader);

          const problemList = document.createElement('div');
          problemList.className = 'p-nav-problems' + (isGrid ? ' grid-mode' : '');

          chProblems.forEach((p) => {
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

          subGroup.appendChild(problemList);
          groupBody.appendChild(subGroup);
        });

        group.appendChild(groupBody);
        nav.appendChild(group);
      });
    } else if (dim === 'marks') {
      window.buildMarksSidebar && window.buildMarksSidebar(nav, problems, isGrid, highlightActiveNavItem, closeMobileMenu, updateToggleAllBtnState);
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
          String(p.num).toLowerCase().includes(q) ||
          (p.painPoint && p.painPoint.toLowerCase().includes(q)) ||
          (p.chapter && p.chapter.toLowerCase().includes(q)) ||
          (p.source && p.source.toLowerCase().includes(q))
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
  // Sidebar Dimension Tabs (动态分学科切换维度)
  // ────────────────────────────────────────────
  function updateSidebarDimensionTabs(subjectId) {
    const dimContainer = $('sidebarDimensionTabs');
    if (!dimContainer) return;

    const isPast = subjectId === 'past_exams';
    let savedDim = localStorage.getItem('sidebarDimension_' + subjectId) || localStorage.getItem('sidebarDimension') || 'chapter';
    if (isPast && (savedDim === 'source' || savedDim === 'date')) savedDim = 'chapter';
    if (!isPast && (savedDim === 'year' || savedDim === 'pain')) savedDim = 'chapter';

    if (isPast) {
      dimContainer.innerHTML = `
        <button class="p-dim-tab${savedDim === 'chapter' ? ' active' : ''}" data-dim="chapter" title="按考纲知识点章节分类">📚 章节</button>
        <button class="p-dim-tab${savedDim === 'year' ? ' active' : ''}" data-dim="year" title="按 2005~2026 年份套卷浏览">📋 年份</button>
        <button class="p-dim-tab${savedDim === 'pain' ? ' active' : ''}" data-dim="pain" title="按错因痛点聚合（无思路/计算失误/产生疑问/审题陷阱）">🎯 痛点</button>
        <button class="p-dim-tab${savedDim === 'marks' ? ' active' : ''}" data-dim="marks" title="星标与随手记">⭐️ 标记</button>
      `;
    } else {
      dimContainer.innerHTML = `
        <button class="p-dim-tab${savedDim === 'chapter' ? ' active' : ''}" data-dim="chapter" title="按知识点章节分类">📚 章节</button>
        <button class="p-dim-tab${savedDim === 'source' ? ' active' : ''}" data-dim="source" title="按题集来源分类（严选题/600题/辅导讲义等）">🏷️ 题集</button>
        <button class="p-dim-tab${savedDim === 'date' ? ' active' : ''}" data-dim="date" title="按收录日期归档">📅 日期</button>
        <button class="p-dim-tab${savedDim === 'marks' ? ' active' : ''}" data-dim="marks" title="星标与随手记">⭐️ 标记</button>
      `;
    }

    qsa('.p-dim-tab', dimContainer).forEach(btn => {
      btn.addEventListener('click', () => {
        const dim = btn.dataset.dim;
        qsa('.p-dim-tab', dimContainer).forEach(b => b.classList.toggle('active', b.dataset.dim === dim));
        localStorage.setItem('sidebarDimension_' + currentSubjectId, dim);
        localStorage.setItem('sidebarDimension', dim);
        const currentSub = manifest && manifest.subjects.find(s => s.id === currentSubjectId);
        if (currentSub && allProblems) {
          buildSidebar(currentSub, allProblems);
        }
        const toastMsg = {
          chapter: '📚 已切换为按知识点章节分类',
          source: '🏷️ 已切换为按题集来源分类',
          date: '📅 已切换为按收录日期归档',
          year: '📋 已切换为按年份套卷分类',
          pain: '🎯 已切换为按错因痛点聚合',
          marks: '⭐️ 已切换为星标与随手记'
        }[dim] || '已切换分类维度';
        showToast(toastMsg);
      });
    });
  }

  // ────────────────────────────────────────────
  // Sidebar View Mode (章节/日期 维度 + 列表/矩阵 视图)
  // ────────────────────────────────────────────
  function setupSidebarViewMode() {
    // 1. 分类维度切换
    updateSidebarDimensionTabs(currentSubjectId);

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





/* =========================================================================
   NOTE MODAL & MARKS LOGIC (随手记 & 星标)
   ========================================================================= */

(function() {
  const STORAGE_KEY = 'kaoyan_math_user_marks';
  
  function loadMarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveMarks(marks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  }

  window.getUserMarkBadgeHtml = function(anchor) {
    const marks = loadMarks();
    const m = marks[anchor];
    if (!m || !m.priority) return '';
    let icon = '', label = '';
    if (m.priority === 3) { icon = '💖'; label = 'P3'; }
    if (m.priority === 2) { icon = '🧡'; label = 'P2'; }
    if (m.priority === 1) { icon = '💛'; label = 'P1'; }
    return '<span class="p-card-marks-badge" data-level="' + m.priority + '">' + icon + ' ' + label + (m.theme ? ' · ' + m.theme : '') + '</span>';
  };

  window.getUserNoteHtml = function(anchor) {
    const marks = loadMarks();
    const m = marks[anchor];
    if (!m || !m.text) return '';
    const safeText = m.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<strong>📝 随手记：</strong><br/>' + safeText;
  };

  let currentEditingAnchor = null;
  let currentEditingProb = null;
  let currentPriority = 0;

  window.openNoteModal = function(prob) {
    currentEditingProb = prob;
    currentEditingAnchor = prob.anchor;
    const marks = loadMarks();
    const m = marks[currentEditingAnchor] || { priority: 0, theme: '', text: '' };
    
    currentPriority = m.priority || 0;
    document.querySelectorAll('.p-priority-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.level) === currentPriority);
    });
    
    document.getElementById('noteThemeInput').value = m.theme || '';
    document.getElementById('noteTextInput').value = m.text || '';
    
    const backdrop = document.getElementById('noteModalBackdrop');
    if (backdrop) backdrop.classList.add('active');
  };

  function closeNoteModal() {
    const backdrop = document.getElementById('noteModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
    currentEditingAnchor = null;
    currentEditingProb = null;
  }

  function setupNoteModalUI() {
    const backdrop = document.getElementById('noteModalBackdrop');
    if (!backdrop) return;
    
    document.getElementById('closeNoteModalBtn').addEventListener('click', closeNoteModal);
    document.getElementById('cancelNoteBtn').addEventListener('click', closeNoteModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeNoteModal();
    });

    document.querySelectorAll('.p-priority-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentPriority = parseInt(btn.dataset.level);
        document.querySelectorAll('.p-priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 动态更新单题 DOM 中的星标徽章与随手记笔记框（免刷新，丝滑极致）
    function updateCardMarkInDOM(anchor) {
      const card = document.getElementById(anchor);
      if (card) {
        const titleBox = card.querySelector('.p-card-title-box');
        if (titleBox) {
          let badgeEl = titleBox.querySelector('.p-card-marks-badge');
          const newBadgeHtml = window.getUserMarkBadgeHtml ? window.getUserMarkBadgeHtml(anchor) : '';
          if (newBadgeHtml) {
            if (badgeEl) {
              badgeEl.outerHTML = newBadgeHtml;
            } else {
              const titleEl = titleBox.querySelector('.p-card-title');
              if (titleEl) titleEl.insertAdjacentHTML('afterend', newBadgeHtml);
            }
          } else if (badgeEl) {
            badgeEl.remove();
          }
        }

        let noteBox = card.querySelector('.p-card-note-box');
        const newNoteHtml = window.getUserNoteHtml ? window.getUserNoteHtml(anchor) : '';
        if (newNoteHtml) {
          if (!noteBox) {
            noteBox = document.createElement('div');
            noteBox.className = 'p-card-note-box';
            const stemBox = card.querySelector('.p-stem-box');
            if (stemBox) card.insertBefore(noteBox, stemBox);
            else card.appendChild(noteBox);
          }
          noteBox.innerHTML = newNoteHtml;
        } else if (noteBox) {
          noteBox.remove();
        }
      }

      // 如果侧边栏当前正处于【⭐️ 标记】视图，即时无感重绘侧边栏
      const currentDim = localStorage.getItem('sidebarDimension') || 'chapter';
      if (currentDim === 'marks' && typeof window.rebuildSidebar === 'function') {
        window.rebuildSidebar();
      }
    }

    document.getElementById('saveNoteBtn').addEventListener('click', () => {
      if (!currentEditingAnchor) return;
      const theme = document.getElementById('noteThemeInput').value.trim();
      const text = document.getElementById('noteTextInput').value.trim();
      
      const marks = loadMarks();
      const targetAnchor = currentEditingAnchor;
      if (currentPriority === 0 && !theme && !text) {
        delete marks[targetAnchor];
      } else {
        const curSubId = window.getCurrentSubjectId ? window.getCurrentSubjectId() : 'calculus';
        const curManifest = window.getManifest ? window.getManifest() : null;
        const currentSubObj = curManifest && curManifest.subjects ? curManifest.subjects.find(s => s.id === curSubId) : null;
        marks[targetAnchor] = {
          priority: currentPriority,
          theme: theme,
          text: text,
          timestamp: Date.now(),
          num: currentEditingProb ? currentEditingProb.num : '',
          title: currentEditingProb ? currentEditingProb.title : '',
          subjectId: curSubId,
          subjectName: currentSubObj ? currentSubObj.name : ''
        };
      }
      saveMarks(marks);
      closeNoteModal();
      
      // 毫秒级即时原地更新，消除卡顿与白屏重载
      updateCardMarkInDOM(targetAnchor);

      if (typeof window.showToast === 'function') {
        window.showToast('✨ 随手记与星标已实时保存');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', setupNoteModalUI);

  window.buildMarksSidebar = function(nav, allProblems, isGrid, highlightActiveNavItem, closeMobileMenu, updateToggleAllBtnState) {
    const marks = loadMarks();
    
    const grouped = {};
    Object.keys(marks).forEach(anchor => {
      const m = marks[anchor];
      if (m.priority === 0 && !m.text) return;
      const t = m.theme || '默认笔记 (未分类)';
      if (!grouped[t]) grouped[t] = [];
      
      // 跨学科全局收录支持：如果当前学科题目列表中有则直接使用，若为其它学科则根据持久化元数据降级承接
      let p = allProblems.find(prob => prob.anchor === anchor);
      if (!p && m.num) {
        p = {
          num: m.num,
          title: m.title || ('题目 ' + m.num),
          anchor: anchor,
          subjectId: m.subjectId || (anchor.includes('linalg') ? 'linalg' : 'calculus')
        };
      }
      const activeSubId = window.getCurrentSubjectId ? window.getCurrentSubjectId() : 'calculus';
      if (p) {
        if (!p.subjectId) p.subjectId = m.subjectId || activeSubId;
        grouped[t].push({ prob: p, mark: m });
      }
    });

    const themes = Object.keys(grouped).sort();

    if (themes.length === 0) {
      nav.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px; line-height:1.6;">⭐️ 暂无星标或随手记<br/><span style="font-size:12px; color:var(--text-secondary);">在任意题目卡片右上角点击【⭐️ 标记】即可按优先级与主题智能归并收录！</span></div>';
      return;
    }

    themes.forEach(theme => {
      const items = grouped[theme];
      items.sort((a, b) => {
        if (b.mark.priority !== a.mark.priority) return b.mark.priority - a.mark.priority;
        return a.prob.num - b.prob.num;
      });

      const group = document.createElement('div');
      group.className = 'p-nav-date-group';

      const header = document.createElement('div');
      header.className = 'p-nav-date-header';
      header.innerHTML = '<div class="p-date-title-box"><span>⭐️ ' + theme + '</span><span class="p-date-badge">' + items.length + ' 题</span></div><span class="p-date-arrow">▼</span>';
      
      header.addEventListener('click', () => {
        group.classList.toggle('collapsed');
        updateToggleAllBtnState();
      });
      group.appendChild(header);

      const problemList = document.createElement('div');
      problemList.className = 'p-nav-problems' + (isGrid ? ' grid-mode' : '');

      items.forEach((item) => {
        const p = item.prob;
        const a = document.createElement('a');
        a.className = 'p-nav-item';
        a.href = '#' + p.anchor;
        a.dataset.anchor = p.anchor;
        
        let priorityBadge = '';
        if (item.mark.priority === 3) priorityBadge = '💖';
        if (item.mark.priority === 2) priorityBadge = '🧡';
        if (item.mark.priority === 1) priorityBadge = '💛';

        a.title = 'P.' + p.num + ' ' + p.title;
        
        const cleanTitle = p.title.replace(/\$[^$]+\$/g, '[公式]').replace(/<[^>]+>/g, '');
        const curActiveSub = window.getCurrentSubjectId ? window.getCurrentSubjectId() : 'calculus';
        const isOtherSub = p.subjectId && p.subjectId !== curActiveSub;
        const subBadge = isOtherSub ? ('<span style="font-size:10.5px; padding:1px 5px; border-radius:4px; margin-right:4px; background:rgba(59,130,246,0.15); color:var(--primary); font-weight:700;">' + (p.subjectId === 'linalg' ? '线代' : '高数') + '</span>') : '';
        
        a.innerHTML = '<span class="p-nav-num">' + p.num + ' ' + priorityBadge + '</span><span class="p-nav-text">' + subBadge + cleanTitle + '</span>';

        a.addEventListener('click', async (e) => {
          e.preventDefault();
          // 如果点击的题目属于另一学科，先自动无缝切换学科
          const activeSubNow = window.getCurrentSubjectId ? window.getCurrentSubjectId() : 'calculus';
          if (p.subjectId && p.subjectId !== activeSubNow && typeof window.switchSubject === 'function') {
            await window.switchSubject(p.subjectId);
          }
          const card = document.getElementById(p.anchor);
          if (card) {
            card.classList.add('sop-expanded');
            setTimeout(() => {
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
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
    updateToggleAllBtnState();
  };

})();
