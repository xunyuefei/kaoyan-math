/* ==========================================================================
   考研数学 SOP 题解阅读站 — Core Application Logic
   Features: Markdown + KaTeX rendering, sidebar TOC, dark mode,
             LaTeX copy enhancer, scroll spy, mobile menu, print
   ========================================================================== */
(function () {
  'use strict';

  // ────────────────────────────────────────────
  // DOM helpers
  // ────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => (root || document).querySelectorAll(sel);

  // ────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────
  let manifest = null;
  let currentSubjectId = null;
  let scrollSpyObserver = null;

  // ────────────────────────────────────────────
  // Initialization
  // ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // CDN scripts may still be loading when DOMContentLoaded fires.
    // Poll until both marked and katex are available.
    function tryInit() {
      if (typeof marked !== 'undefined' && typeof katex !== 'undefined') {
        init();
      } else {
        setTimeout(tryInit, 80);
      }
    }
    tryInit();
  });

  async function init() {
    try {
      manifest = await fetch('manifest.json?t=' + Date.now()).then((r) => r.json());
    } catch (e) {
      $('loading').hidden = true;
      $('errorState').hidden = false;
      console.error('Failed to load manifest.json:', e);
      return;
    }

    buildHeaderTabs();
    buildMobileTabs();
    buildSidebarStats();
    initDarkMode();
    setupPrintButton();
    setupScrollToTop();
    setupMobileMenu();
    setupCopyEnhancer();

    // Load first subject
    await switchSubject(manifest.subjects[0].id);
  }

  // ────────────────────────────────────────────
  // Header Tabs
  // ────────────────────────────────────────────
  function buildHeaderTabs() {
    const container = $('subjectTabs');
    manifest.subjects.forEach((sub) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.subject = sub.id;
      btn.textContent = sub.icon + ' ' + sub.name;
      btn.addEventListener('click', () => switchSubject(sub.id));
      container.appendChild(btn);
    });
  }

  function buildMobileTabs() {
    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar-mobile-tabs';
    manifest.subjects.forEach((sub) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.subject = sub.id;
      btn.textContent = sub.icon + ' ' + sub.name;
      btn.addEventListener('click', () => {
        switchSubject(sub.id);
        closeMobileMenu();
      });
      wrapper.appendChild(btn);
    });
    $('sidebar').insertBefore(wrapper, $('sidebar').firstChild);
  }

  function highlightTab(subjectId) {
    qsa('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.subject === subjectId);
    });
  }

  // ────────────────────────────────────────────
  // Sidebar Stats
  // ────────────────────────────────────────────
  function buildSidebarStats() {
    const stats = manifest.subjects.map((s) => {
      const total = s.batches.reduce((n, b) => n + b.problems.length, 0);
      return s.icon + ' ' + s.name + ' <span class="stat-num">' + total + '</span> 题';
    });
    $('sidebarStats').innerHTML = stats.join(' · ');
  }

  // ────────────────────────────────────────────
  // Sidebar Navigation (per subject)
  // ────────────────────────────────────────────
  function buildSidebarNav(subjectId) {
    const subject = manifest.subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    const nav = $('sidebarNav');
    nav.innerHTML = '';

    // Toolbar with Archive title and Expand/Collapse All
    const toolbar = document.createElement('div');
    toolbar.className = 'sidebar-toolbar';
    toolbar.innerHTML =
      '<span>收录日期归档</span>' +
      '<div class="sidebar-toolbar-actions">' +
      '<button class="sidebar-tool-btn" id="expandAllBtn" title="展开全部日期">全部展开</button>' +
      '<button class="sidebar-tool-btn" id="collapseAllBtn" title="收起全部日期">全部折叠</button>' +
      '</div>';
    nav.appendChild(toolbar);

    toolbar.querySelector('#expandAllBtn').addEventListener('click', () => {
      qsa('.nav-date-group', nav).forEach((g) => g.classList.remove('collapsed'));
    });
    toolbar.querySelector('#collapseAllBtn').addEventListener('click', () => {
      qsa('.nav-date-group', nav).forEach((g) => g.classList.add('collapsed'));
    });

    const currentHash = location.hash ? location.hash.slice(1) : '';

    subject.batches.forEach((batch, index) => {
      const group = document.createElement('div');
      group.className = 'nav-date-group';

      // Expand if it contains current targeted hash, otherwise collapse if multiple or by preference
      const hasTarget = currentHash && batch.problems.some((p) => p.anchor === currentHash);
      if (!hasTarget && index !== 0) {
        group.classList.add('collapsed');
      }

      // Date Header
      const label = document.createElement('div');
      label.className = 'nav-date-label';
      label.title = '点击跳转至该日期目录，或展开/收起题目列表';
      label.innerHTML =
        '<div class="nav-date-info">' +
        '<span class="nav-date-title">📅 ' + batch.date + '</span>' +
        '<span class="nav-date-badge">' + batch.problems.length + ' 题</span>' +
        '</div>' +
        '<span class="nav-date-arrow">▼</span>';

      label.addEventListener('click', () => {
        group.classList.toggle('collapsed');
        // Scroll to date anchor in article if it exists
        const dateEl = document.getElementById('date-' + batch.date);
        if (dateEl) {
          dateEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#date-' + batch.date);
        }
      });
      group.appendChild(label);

      const problemsContainer = document.createElement('div');
      problemsContainer.className = 'nav-problems';

      batch.problems.forEach((p) => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.href = '#' + p.anchor;
        a.dataset.anchor = p.anchor;
        a.innerHTML =
          '<span class="nav-item-num">' + p.num + '</span>' +
          '<span>' + p.title + '</span>';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(p.anchor);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL hash without jumping
            history.replaceState(null, '', '#' + p.anchor);
          }
          closeMobileMenu();
        });
        problemsContainer.appendChild(a);
      });

      group.appendChild(problemsContainer);
      nav.appendChild(group);
    });
  }

  // ────────────────────────────────────────────
  // Subject Switching
  // ────────────────────────────────────────────
  async function switchSubject(subjectId) {
    if (currentSubjectId === subjectId) return;
    currentSubjectId = subjectId;
    highlightTab(subjectId);
    buildSidebarNav(subjectId);

    const subject = manifest.subjects.find((s) => s.id === subjectId);
    const paper = $('paper');
    const loading = $('loading');

    // Show loading
    paper.innerHTML = '';
    paper.style.display = 'none';
    loading.hidden = false;
    $('errorState').hidden = true;

    try {
      const md = await fetch(subject.file + '?t=' + Date.now()).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      });

      renderContent(md, paper);

      loading.hidden = true;
      paper.style.display = '';

      // Scroll spy
      setupScrollSpy();

      // If URL has hash, scroll to it
      if (location.hash) {
        const el = document.getElementById(location.hash.slice(1));
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 200);
      }
    } catch (e) {
      loading.hidden = true;
      $('errorState').hidden = false;
      console.error('Failed to load subject:', e);
    }
  }

  // ────────────────────────────────────────────
  // Markdown + KaTeX Rendering
  // ────────────────────────────────────────────
  function renderContent(md, targetEl) {
    // 1. Extract math to protect from marked.js
    var extracted = extractMath(md);

    // 2. Parse markdown → HTML
    var html = marked.parse(extracted.md, { gfm: true, breaks: false });

    // 3. Insert into DOM
    targetEl.innerHTML = html;

    // 4. Render math via KaTeX
    restoreMath(targetEl, extracted.blocks);

    // 5. Wrap tables for horizontal scroll on mobile
    wrapTables(targetEl);
  }

  /**
   * Extract display ($$ ... $$) and inline ($ ... $) math from markdown,
   * replacing each with an HTML <span> placeholder that marked.js will
   * pass through untouched.
   */
  function extractMath(md) {
    var blocks = [];
    var counter = 0;

    // Display math — $$...$$ (possibly multi-line)
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, function (match, tex) {
      var id = counter++;
      blocks.push({ id: id, display: true, tex: tex.trim() });
      return '<span class="math-ph" data-mid="' + id + '"></span>';
    });

    // Inline math — $...$ (single line, non-greedy)
    md = md.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, function (match, tex) {
      var id = counter++;
      blocks.push({ id: id, display: false, tex: tex.trim() });
      return '<span class="math-ph" data-mid="' + id + '"></span>';
    });

    return { md: md, blocks: blocks };
  }

  /**
   * Replace placeholder <span> elements with KaTeX-rendered math.
   * Stores raw LaTeX in data-tex for the copy enhancer.
   */
  function restoreMath(root, blocks) {
    root.querySelectorAll('.math-ph').forEach(function (span) {
      var id = parseInt(span.getAttribute('data-mid'), 10);
      var block = blocks[id];
      if (!block) return;

      try {
        var rendered = katex.renderToString(block.tex, {
          displayMode: block.display,
          throwOnError: false,
          trust: true,
        });

        var wrapper = document.createElement(block.display ? 'div' : 'span');
        wrapper.className = block.display ? 'katex-display-wrapper' : 'katex-inline-wrapper';
        wrapper.setAttribute('data-tex', block.tex);
        wrapper.setAttribute('data-display', block.display ? '1' : '0');
        wrapper.innerHTML = rendered;
        span.replaceWith(wrapper);
      } catch (e) {
        span.textContent = block.display
          ? '$$' + block.tex + '$$'
          : '$' + block.tex + '$';
      }
    });
  }

  /** Wrap <table> elements in a scrollable div for mobile */
  function wrapTables(root) {
    root.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement.classList.contains('table-wrapper')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  // ────────────────────────────────────────────
  // Scroll Spy — highlight sidebar nav item
  // ────────────────────────────────────────────
  function setupScrollSpy() {
    if (scrollSpyObserver) scrollSpyObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;

    var anchors = qsa('[id^="problem-"]', $('paper'));
    if (!anchors.length) return;

    scrollSpyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveNavItem(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) + 20) + 'px 0px -60% 0px',
      }
    );

    anchors.forEach(function (el) {
      scrollSpyObserver.observe(el);
    });
  }

  function setActiveNavItem(anchorId) {
    qsa('.nav-item', $('sidebarNav')).forEach(function (item) {
      const match = item.dataset.anchor === anchorId;
      item.classList.toggle('active', match);
      if (match) {
        const parentGroup = item.closest('.nav-date-group');
        if (parentGroup && parentGroup.classList.contains('collapsed')) {
          parentGroup.classList.remove('collapsed');
        }
      }
    });
  }

  // ────────────────────────────────────────────
  // Dark Mode
  // ────────────────────────────────────────────
  function initDarkMode() {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    $('darkToggle').addEventListener('click', toggleDarkMode);
  }

  function toggleDarkMode() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  }

  // ────────────────────────────────────────────
  // LaTeX Copy Enhancer
  //
  // When the user selects text containing rendered KaTeX formulas
  // and copies (Ctrl+C), the clipboard receives clean LaTeX source
  // code ($...$ or $$...$$) instead of garbled Unicode symbols.
  // ────────────────────────────────────────────
  function setupCopyEnhancer() {
    document.addEventListener('copy', function (e) {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      // Check if selection intersects our paper
      var paper = $('paper');
      if (!paper) return;
      var range = sel.getRangeAt(0);
      if (!paper.contains(range.commonAncestorContainer)) return;

      // Clone selection into a DocumentFragment
      var fragment = range.cloneContents();

      // Check if any math wrappers are in the selection
      var mathEls = fragment.querySelectorAll('.katex-display-wrapper, .katex-inline-wrapper');
      if (!mathEls.length) return; // No math → default copy behavior

      // Walk fragment and build enhanced plain text
      var text = walkNodeForLatex(fragment);

      e.preventDefault();
      e.clipboardData.setData('text/plain', text);

      // Show toast
      showCopyToast('已复制（含 LaTeX 原码）');
    });
  }

  /**
   * Recursively walk a DOM tree. For math wrapper elements, extract
   * the data-tex attribute and wrap with $ or $$. For other elements,
   * extract text normally.
   */
  function walkNodeForLatex(node) {
    var result = '';
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        var el = child;
        if (el.classList.contains('katex-display-wrapper')) {
          var tex = el.getAttribute('data-tex') || '';
          result += '\n$$\n' + tex + '\n$$\n';
        } else if (el.classList.contains('katex-inline-wrapper')) {
          var tex2 = el.getAttribute('data-tex') || '';
          result += '$' + tex2 + '$';
        } else {
          // Recurse
          result += walkNodeForLatex(el);

          // Preserve block structure
          var tag = el.tagName;
          if (tag === 'P' || tag === 'DIV' || tag === 'LI' || tag === 'BR' ||
              tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' ||
              tag === 'TR' || tag === 'HR' || tag === 'BLOCKQUOTE') {
            result += '\n';
          }
        }
      }
    }
    return result;
  }

  function showCopyToast(msg) {
    var existing = qs('.copy-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 1800);
  }

  // ────────────────────────────────────────────
  // Mobile Menu
  // ────────────────────────────────────────────
  function setupMobileMenu() {
    $('menuBtn').addEventListener('click', function () {
      $('sidebar').classList.toggle('open');
      $('sidebarOverlay').classList.toggle('visible');
    });
    $('sidebarOverlay').addEventListener('click', closeMobileMenu);
  }

  function closeMobileMenu() {
    $('sidebar').classList.remove('open');
    $('sidebarOverlay').classList.remove('visible');
  }

  // ────────────────────────────────────────────
  // Print
  // ────────────────────────────────────────────
  function setupPrintButton() {
    $('printBtn').addEventListener('click', function () {
      window.print();
    });
  }

  // ────────────────────────────────────────────
  // Scroll to Top
  // ────────────────────────────────────────────
  function setupScrollToTop() {
    var btn = $('scrollTopBtn');
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
