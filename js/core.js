/* ==========================================================================
   TruthLens AI — Shared core: storage, settings, layout, 3D interactions
   ========================================================================== */
(function () {
  'use strict';
  var TL = (window.TL = window.TL || {});
  var root = document.documentElement;

  /* ---------------- Icons (inline SVG) ---------------- */
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    star: '<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 16v-3"/><path d="M13 16V9"/><path d="M18 16V6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".5"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8"/><path d="M20 3v5h-5"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    type: '<path d="M4 7V4h16v3"/><path d="M12 4v16"/><path d="M9 20h6"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 10.7C22 5.9 17.5 2 12 2z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 10.3 3 3 0 0 0 5 16a3 3 0 0 0 4 3.8V4z"/><path d="M15 4a3 3 0 0 1 3 3v.5a3 3 0 0 1 2 2.8 3 3 0 0 1-1 5.7 3 3 0 0 1-4 3.8V4z"/>',
    graduation: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 9v6"/>',
    rocket: '<path d="M5 15c-1.5 1.3-2 4-2 6 2 0 4.7-.5 6-2"/><path d="M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5z"/><path d="M9 11 5 11 3 13l4 1"/><path d="M13 15v4l-2 2-1-4"/><circle cx="15.5" cy="8.5" r="1.5"/>'
  };
  TL.icon = function (name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>';
  };
  function hydrateIcons(scope) {
    (scope || document).querySelectorAll('i[data-icon]').forEach(function (el) {
      el.outerHTML = TL.icon(el.getAttribute('data-icon'), el.className);
    });
  }
  TL.hydrateIcons = hydrateIcons;

  /* ---------------- Storage ---------------- */
  var KEYS = { history: 'tl_history', settings: 'tl_settings', last: 'tl_last' };
  TL.store = {
    get: function (k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  var DEFAULTS = { name: 'Guest User', email: '', theme: 'dark', accent: 'blue', effects3d: true, reduceMotion: false,
    sensitivity: 'balanced', saveHistory: true, highlight: true, createdAt: null };
  TL.getSettings = function () {
    var s = Object.assign({}, DEFAULTS, TL.store.get(KEYS.settings, {}));
    if (!s.createdAt) { s.createdAt = new Date().toISOString(); TL.store.set(KEYS.settings, s); }
    return s;
  };
  TL.saveSettings = function (patch) {
    var s = Object.assign(TL.getSettings(), patch);
    TL.store.set(KEYS.settings, s);
    TL.applySettings(s);
    return s;
  };
  TL.applySettings = function (s) {
    s = s || TL.getSettings();
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-accent', s.accent);
    root.classList.toggle('no-3d', !s.effects3d);
    root.classList.toggle('no-motion', !!s.reduceMotion);
    updateThemeButton();
    window.dispatchEvent(new CustomEvent('tl:settings', { detail: s }));
  };

  TL.getHistory = function () { return TL.store.get(KEYS.history, []); };
  TL.setHistory = function (list) { return TL.store.set(KEYS.history, list.slice(0, 300)); };
  TL.saveResult = function (r) {
    TL.store.set(KEYS.last, r);
    if (TL.getSettings().saveHistory) { var h = TL.getHistory(); h.unshift(r); TL.setHistory(h); }
  };
  TL.getResult = function (id) {
    var h = TL.getHistory();
    if (!id) return h[0] || TL.store.get(KEYS.last, null);
    for (var i = 0; i < h.length; i++) if (h[i].id === id) return h[i];
    var last = TL.store.get(KEYS.last, null);
    return last && last.id === id ? last : null;
  };
  TL.deleteResult = function (id) { TL.setHistory(TL.getHistory().filter(function (r) { return r.id !== id; })); };
  TL.clearHistory = function () { TL.store.remove(KEYS.history); TL.store.remove(KEYS.last); };

  /* ---------------- Formatting ---------------- */
  TL.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  TL.timeAgo = function (iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + ' min ago';
    if (d < 86400) return Math.floor(d / 3600) + ' h ago';
    if (d < 86400 * 7) return Math.floor(d / 86400) + ' d ago';
    return TL.formatDate(iso);
  };
  TL.formatDate = function (iso, withTime) {
    var d = new Date(iso);
    var opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return d.toLocaleString(undefined, opts);
  };
  TL.verdictMeta = function (v) {
    return {
      fake: { label: 'Fake', cls: 'badge-fake', icon: 'xcircle', level: 'bad' },
      suspicious: { label: 'Suspicious', cls: 'badge-suspicious', icon: 'alert', level: 'warn' },
      genuine: { label: 'Genuine', cls: 'badge-genuine', icon: 'checkcircle', level: 'good' }
    }[v] || { label: 'Unknown', cls: 'badge-neutral', icon: 'info', level: 'info' };
  };
  TL.badge = function (v, type) {
    var m = TL.verdictMeta(v);
    var label = v === 'genuine' && type === 'news' ? 'Real' : m.label;
    return '<span class="badge ' + m.cls + '">' + TL.icon(m.icon) + label + '</span>';
  };
  TL.qs = function (name) { return new URLSearchParams(location.search).get(name); };

  /* ---------------- Layout: header / footer / background ---------------- */
  var NAV = [
    { href: 'index.html', key: 'home', label: 'Home', icon: 'home' },
    { href: 'news-detector.html', key: 'news', label: 'Fake News', full: 'Fake News Detector', icon: 'search' },
    { href: 'review-detector.html', key: 'review', label: 'Fake Reviews', full: 'Fake Review Detector', icon: 'star' },
    { href: 'verified-news.html', key: 'verified', label: 'Verified', full: 'Verified News', icon: 'news' },
    { href: 'how-it-works.html', key: 'how', label: 'How It Works', icon: 'book' },
    { href: 'history.html', key: 'history', label: 'History', icon: 'history' },
    { href: 'about.html', key: 'about', label: 'About', icon: 'info' }
  ];
  var EXTRA = [
    { href: 'result.html', key: 'result', label: 'Analysis Result', icon: 'chart' },
    { href: 'dashboard.html', key: 'dashboard', label: 'Profile / Dashboard', icon: 'user' },
    { href: 'settings.html', key: 'settings', label: 'Settings', icon: 'settings' }
  ];

  function brandHTML() {
    return '<a class="brand" href="index.html" aria-label="TruthLens AI home">' +
      '<span class="brand-cube" aria-hidden="true"><span class="cube"><i class="face"></i><i class="face"></i><i class="face"></i><i class="face"></i><i class="face"></i><i class="face"></i></span></span>' +
      '<span>TruthLens<span class="grad-text"> AI</span><small>Fake News &amp; Review Detector</small></span></a>';
  }

  function renderLayout() {
    var page = document.body.getAttribute('data-page');

    if (!document.querySelector('.bg-scene')) {
      var bg = document.createElement('div');
      bg.className = 'bg-scene'; bg.setAttribute('aria-hidden', 'true');
      bg.innerHTML = '<div class="bg-blob b1"></div><div class="bg-blob b2"></div><div class="bg-blob b3"></div><div class="bg-grid"></div>';
      document.body.prepend(bg);
    }

    var header = document.getElementById('site-header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML =
        '<nav class="container nav" aria-label="Main">' + brandHTML() +
        '<ul class="nav-links">' + NAV.map(function (n) {
          return '<li><a href="' + n.href + '"' + (n.key === page ? ' class="active" aria-current="page"' : '') + '>' + n.label + '</a></li>';
        }).join('') + '</ul>' +
        '<div class="nav-actions">' +
        '<a class="icon-btn hide-xs' + (page === 'dashboard' ? ' active' : '') + '" href="dashboard.html" title="Profile / Dashboard" aria-label="Profile and dashboard">' + TL.icon('user') + '</a>' +
        '<a class="icon-btn hide-xs' + (page === 'settings' ? ' active' : '') + '" href="settings.html" title="Settings" aria-label="Settings">' + TL.icon('settings') + '</a>' +
        '<button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle theme"></button>' +
        '<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' + TL.icon('menu') + '</button>' +
        '</div></nav>';

      var mob = document.createElement('div');
      mob.className = 'mobile-nav'; mob.id = 'mobile-nav';
      mob.innerHTML = NAV.concat(EXTRA).map(function (n) {
        return '<a href="' + n.href + '"' + (n.key === page ? ' class="active"' : '') + '>' + TL.icon(n.icon) + (n.full || n.label) + '</a>';
      }).join('');
      header.after(mob);

      var btn = document.getElementById('menu-btn');
      btn.addEventListener('click', function () {
        var open = mob.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
        btn.innerHTML = TL.icon(open ? 'x' : 'menu');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      document.getElementById('theme-toggle').addEventListener('click', function () {
        var s = TL.getSettings();
        TL.saveSettings({ theme: s.theme === 'dark' ? 'light' : 'dark' });
      });
      updateThemeButton();
    }

    var footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      var col = function (title, items) {
        return '<div><h4>' + title + '</h4><ul>' + items.map(function (n) { return '<li><a href="' + n.href + '">' + (n.full || n.label) + '</a></li>'; }).join('') + '</ul></div>';
      };
      footer.innerHTML =
        '<div class="container"><div class="footer-grid">' +
        '<div>' + brandHTML() + '<p>An AI-powered mini project that detects fake news and fake product reviews using explainable natural language analysis.</p></div>' +
        col('Detect', [NAV[1], NAV[2], EXTRA[0]]) +
        col('Explore', [NAV[3], NAV[4], NAV[6]]) +
        col('Account', [EXTRA[1], NAV[5], EXTRA[2]]) +
        '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' TruthLens AI · Academic mini project</span>' +
        '<span>Results are probabilistic. Always verify important information with trusted sources.</span></div></div>';
    }
  }

  function updateThemeButton() {
    var b = document.getElementById('theme-toggle');
    if (!b) return;
    var dark = root.getAttribute('data-theme') !== 'light';
    b.innerHTML = TL.icon(dark ? 'sun' : 'moon');
    b.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  /* ---------------- 3D tilt ---------------- */
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  TL.initTilt = function (scope) {
    if (!finePointer) return;
    (scope || document).querySelectorAll('.tilt:not([data-tilt-ready])').forEach(function (el) {
      el.setAttribute('data-tilt-ready', '');
      var max = parseFloat(el.getAttribute('data-tilt-max')) || 10;
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        if (root.classList.contains('no-3d')) return;
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.classList.add('is-tilting');
          el.style.setProperty('--ry', ((x - 0.5) * max * 2).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - y) * max * 2).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  };

  /* ---------------- Reveal on scroll ---------------- */
  TL.initReveal = function (scope) {
    var els = (scope || document).querySelectorAll('[data-reveal]:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  };

  /* ---------------- Count-up numbers ---------------- */
  TL.countUp = function (el, to, opts) {
    opts = opts || {};
    var dur = root.classList.contains('no-motion') ? 0 : (opts.duration || 1400);
    var suffix = opts.suffix || '', start = performance.now();
    if (!dur) { el.textContent = to + suffix; return; }
    (function step(t) {
      var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  };
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var run = function (el) { TL.countUp(el, parseFloat(el.getAttribute('data-count')), { suffix: el.getAttribute('data-suffix') || '' }); };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- Toast ---------------- */
  TL.toast = function (msg, type) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.innerHTML = TL.icon(type === 'error' ? 'alert' : 'checkcircle') + '<span>' + TL.esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2600);
  };

  /* ---------------- Scanner overlay ---------------- */
  TL.scan = function (steps) {
    steps = steps || ['Tokenising and cleaning text', 'Extracting linguistic features', 'Scoring with detection model', 'Generating explanation'];
    var ov = document.createElement('div');
    ov.className = 'scan-overlay';
    ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-label', 'Analysing');
    ov.innerHTML = '<div class="scan-box card"><div class="scanner" aria-hidden="true"><div class="orbit"></div><div class="orbit"></div><div class="doc"><i></i><i></i><i></i><i></i><i></i></div></div>' +
      '<h3>AI is analysing…</h3><div class="progress"><span></span></div><ul class="scan-steps">' +
      steps.map(function (s) { return '<li><span class="st"></span>' + TL.esc(s) + '</li>'; }).join('') + '</ul></div>';
    document.body.appendChild(ov);
    window.dispatchEvent(new CustomEvent('tl:scan', { detail: true }));
    requestAnimationFrame(function () { ov.classList.add('show'); });
    var items = ov.querySelectorAll('.scan-steps li'), bar = ov.querySelector('.progress span');
    var fast = root.classList.contains('no-motion') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var per = fast ? 120 : 520;
    return new Promise(function (resolve) {
      var i = 0;
      (function next() {
        if (i > 0) { items[i - 1].className = 'done'; items[i - 1].querySelector('.st').innerHTML = TL.icon('check'); }
        bar.style.width = Math.round((i / items.length) * 100) + '%';
        if (i === items.length) { setTimeout(function () { resolve(); }, fast ? 50 : 260); return; }
        items[i].className = 'doing'; i++;
        setTimeout(next, per);
      })();
    });
  };

  /* ---------------- Run analysis and open the result ---------------- */
  TL.runAnalysis = function (type, input) {
    var settings = TL.getSettings();
    var result = type === 'news'
      ? TL.analyzer.analyzeNews(input, { sensitivity: settings.sensitivity })
      : TL.analyzer.analyzeReview(input, { sensitivity: settings.sensitivity });
    return TL.scan().then(function () {
      TL.saveResult(result);
      location.href = 'result.html?id=' + encodeURIComponent(result.id);
    });
  };

  /* ---------------- Demo data (for presentations) ---------------- */
  TL.loadDemoData = function () {
    var s = TL.getSettings(), A = TL.analyzer, S = TL.samples, list = [];
    var news = [
      { title: S.newsFake.title, text: S.newsFake.text, url: S.newsFake.url },
      { title: S.newsReal.title, text: S.newsReal.text, url: '' },
      { title: 'BREAKING: Government to ban all cash from next week, sources say', text: 'Insiders say the government will secretly ban cash. Share this before it is deleted! Nobody is talking about it.', url: '' },
      { title: '', text: '', url: 'https://www.theonion.com/', mode: 'url' },
      { title: 'University study links daily walking to better sleep', text: 'Researchers at the university published a peer-reviewed study in a medical journal on Monday. According to the data from 2,400 adults, people who walked 30 minutes a day reported 18 percent better sleep quality. The authors said more research is needed.', url: 'https://www.bbc.com/news' }
    ];
    var reviews = [
      S.reviewFake, S.reviewReal,
      { product: 'CozyKnit Sweater', category: 'Fashion', rating: 3, verified: true, text: 'The fabric is soft and the colour matches the photos, but the size runs small. I ordered a medium and had to exchange it for a large. Stitching looks durable after 5 washes.' },
      { product: 'QuickChef Blender', category: 'Home & Kitchen', rating: 1, verified: false, text: 'WORST blender EVER!!! Total scam, garbage, do not buy!!! Terrible terrible terrible.' },
      { product: 'AquaPure Bottle', category: 'Home & Kitchen', rating: 5, text: 'Broke after two days, poor quality, very disappointed and had to ask for a refund.' },
      { product: 'GlowSkin Serum', category: 'Beauty', rating: 5, verified: false, text: 'I received this product free in exchange for my honest review. Amazing, perfect, life changing! Must buy!' }
    ];
    news.forEach(function (n) { list.push(A.analyzeNews(n, { sensitivity: s.sensitivity })); });
    reviews.forEach(function (r) { list.push(A.analyzeReview(r, { sensitivity: s.sensitivity })); });
    var now = Date.now();
    list.forEach(function (r, i) {
      r.createdAt = new Date(now - (i * 0.55 + Math.random() * 0.4) * 86400000).toISOString();
      r.id = r.id + i;
    });
    list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    TL.setHistory(list.concat(TL.getHistory()));
    TL.toast(list.length + ' demo checks added');
  };

  /* ---------------- Download helper ---------------- */
  TL.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------------- Boot ---------------- */
  function boot() {
    renderLayout();
    hydrateIcons();
    TL.applySettings(TL.getSettings());
    TL.initTilt();
    TL.initReveal();
    initCounters();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
