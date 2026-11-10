/* ==========================================================================
   TruthLens AI — Page controllers
   ========================================================================== */
(function () {
  'use strict';
  var TL = window.TL;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function wordCount(s) { return (String(s).match(/\S+/g) || []).length; }
  function after(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  /* ---------------- Shared: tabs & flip cards ---------------- */
  function bindTabs(container, onChange) {
    $$('.tab', container).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tab', container).forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
        onChange(b);
      });
    });
  }
  function initFlips(scope) {
    $$('.flip', scope).forEach(function (f) {
      if (f.hasAttribute('data-flip-ready')) return;
      f.setAttribute('data-flip-ready', '');
      f.setAttribute('tabindex', '0');
      f.setAttribute('role', 'button');
      f.setAttribute('aria-pressed', 'false');
      var toggle = function () { var on = f.classList.toggle('flipped'); f.setAttribute('aria-pressed', on); };
      f.addEventListener('click', function (e) { if (!e.target.closest('a')) toggle(); });
      f.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  /* ---------------- Tooltip ---------------- */
  var tip;
  function showTip(e, html) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.classList.add('show');
    var x = e.clientX + 14, y = e.clientY - 12 - tip.offsetHeight;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
    if (y < 8) y = e.clientY + 18;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }

  /* ================= HOME ================= */
  function home() {
    var type = 'news';
    var ta = $('#quick-text');
    var placeholders = {
      news: 'Paste a news headline or article here… e.g. "SHOCKING!!! Miracle cure doctors don\'t want you to know"',
      review: 'Paste a product review here… e.g. "Amazing product!!! Best ever, must buy, five stars!!!"'
    };
    bindTabs($('#quick-tabs'), function (b) { type = b.getAttribute('data-type'); ta.placeholder = placeholders[type]; ta.focus(); });
    $('#quick-sample').addEventListener('click', function () {
      ta.value = type === 'news' ? TL.samples.newsFake.title + '. ' + TL.samples.newsFake.text : TL.samples.reviewFake.text;
      ta.dispatchEvent(new Event('input'));
    });
    var counter = $('#quick-count');
    ta.addEventListener('input', function () { counter.textContent = wordCount(ta.value) + ' words'; });
    $('#quick-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = ta.value.trim();
      if (wordCount(text) < 4) { TL.toast('Please enter at least a few words to analyse.', 'error'); ta.focus(); return; }
      TL.runAnalysis(type, type === 'news' ? { mode: 'text', text: text } : { text: text });
    });
  }

  /* ================= NEWS DETECTOR ================= */
  function newsPage() {
    var mode = 'text';
    var fTitle = $('#field-title'), fText = $('#field-text'), fUrl = $('#field-url');
    var title = $('#news-title'), text = $('#news-text'), url = $('#news-url');
    var textLabel = $('#text-label-note'), urlLabel = $('#url-label-note');
    var counter = $('#news-count');

    function apply() {
      fTitle.hidden = mode === 'url';
      fText.hidden = mode === 'headline';
      fUrl.hidden = mode === 'headline';
      textLabel.textContent = mode === 'url' ? 'optional — improves accuracy' : 'required';
      urlLabel.textContent = mode === 'url' ? 'required' : 'optional';
      $('#mode-hint').textContent = {
        text: 'Paste the full article for the most accurate result. Adding the source link also checks the publisher.',
        url: 'We check the domain reputation, link structure and clickbait patterns. Paste the article text too for full content analysis.',
        headline: 'Headline-only checks are fast but less certain, since there is less text to analyse.'
      }[mode];
    }
    bindTabs($('#news-tabs'), function (b) { mode = b.getAttribute('data-mode'); apply(); });
    apply();

    text.addEventListener('input', function () { counter.textContent = wordCount(text.value) + ' words'; });
    function fill(s) { title.value = s.title; text.value = s.text; url.value = s.url; text.dispatchEvent(new Event('input')); }
    $('#sample-fake').addEventListener('click', function () { fill(TL.samples.newsFake); });
    $('#sample-real').addEventListener('click', function () { fill(TL.samples.newsReal); });
    $('#sample-clear').addEventListener('click', function () { fill({ title: '', text: '', url: '' }); title.focus(); });

    $('#news-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = { mode: mode, title: mode === 'url' ? '' : title.value.trim(), text: mode === 'headline' ? '' : text.value.trim(), url: mode === 'headline' ? '' : url.value.trim() };
      if (mode === 'text' && wordCount(input.title + ' ' + input.text) < 6) { TL.toast('Please paste the article text (at least a sentence).', 'error'); text.focus(); return; }
      if (mode === 'url' && !input.url) { TL.toast('Please enter the article URL.', 'error'); url.focus(); return; }
      if (mode === 'headline' && wordCount(input.title) < 3) { TL.toast('Please enter a headline.', 'error'); title.focus(); return; }
      TL.runAnalysis('news', input);
    });
  }

  /* ================= REVIEW DETECTOR ================= */
  function reviewPage() {
    var rating = 0;
    var starsEl = $('#stars'), ratingLabel = $('#rating-label');
    var text = $('#review-text'), counter = $('#review-count');
    for (var i = 1; i <= 5; i++) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-v', i); b.setAttribute('aria-label', i + ' star' + (i > 1 ? 's' : ''));
      b.innerHTML = TL.icon('star');
      starsEl.appendChild(b);
    }
    function setRating(v) {
      rating = v;
      $$('button', starsEl).forEach(function (b) { var on = +b.getAttribute('data-v') <= v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', +b.getAttribute('data-v') === v); });
      ratingLabel.textContent = v ? v + ' / 5' : 'not rated';
    }
    starsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setRating(+b.getAttribute('data-v')); });

    text.addEventListener('input', function () { counter.textContent = wordCount(text.value) + ' words'; });
    function fill(s) {
      $('#review-product').value = s.product; $('#review-category').value = s.category;
      $('#review-verified').value = s.verified === true ? 'yes' : s.verified === false ? 'no' : 'unknown';
      text.value = s.text; setRating(s.rating || 0); text.dispatchEvent(new Event('input'));
    }
    $('#sample-fake').addEventListener('click', function () { fill(TL.samples.reviewFake); });
    $('#sample-real').addEventListener('click', function () { fill(TL.samples.reviewReal); });
    $('#sample-clear').addEventListener('click', function () { fill({ product: '', category: 'Electronics', verified: undefined, text: '', rating: 0 }); });

    $('#review-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (wordCount(text.value) < 3) { TL.toast('Please paste the review text.', 'error'); text.focus(); return; }
      var v = $('#review-verified').value;
      TL.runAnalysis('review', {
        product: $('#review-product').value.trim(), category: $('#review-category').value, rating: rating,
        verified: v === 'yes' ? true : v === 'no' ? false : undefined, text: text.value.trim()
      });
    });
  }

  /* ================= RESULT ================= */
  function resultPage() {
    var host = $('#result-root');
    var r = TL.getResult(TL.qs('id'));
    if (!r) {
      host.innerHTML = '<div class="card empty" data-reveal><div class="empty-icon">' + TL.icon('chart') + '</div><h2>No analysis yet</h2>' +
        '<p>Run a check with one of the detectors and your detailed result (score, confidence, reasons and evidence) will appear here.</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="news-detector.html">' + TL.icon('search') + 'Check news</a><a class="btn btn-ghost" href="review-detector.html">' + TL.icon('star') + 'Check a review</a></div></div>';
      TL.initReveal(host);
      return;
    }
    var vm = TL.verdictMeta(r.verdict);
    var isNews = r.type === 'news';
    var flagged = r.signals.filter(function (s) { return s.risk >= 60; }).length;
    var C = 2 * Math.PI * 110;
    var lvl = function (v) { return v >= 60 ? ['high', 'High'] : v >= 35 ? ['med', 'Medium'] : ['low', 'Low']; };
    var reasonIcon = { bad: 'xcircle', warn: 'alert', good: 'checkcircle', info: 'info' };
    var settings = TL.getSettings();
    var detector = isNews ? 'news-detector.html' : 'review-detector.html';
    var modeLabel = { text: 'Article text', url: 'URL check', headline: 'Headline', review: 'Product review' }[r.mode] || r.mode;
    var evidenceText = isNews ? [r.input.title, r.input.text].filter(Boolean).join('\n\n') : r.input.text;

    var html = '' +
      '<div class="result-top" data-reveal><a class="btn btn-ghost btn-sm" href="history.html">' + TL.icon('history') + 'All checks</a>' +
      '<div class="meta"><span class="badge badge-accent">' + TL.icon(isNews ? 'news' : 'star') + (isNews ? 'Fake News Detector' : 'Fake Review Detector') + '</span>' +
      '<span class="badge badge-neutral">' + TL.esc(modeLabel) + '</span><span class="badge badge-neutral">' + TL.icon('clock') + TL.formatDate(r.createdAt, true) + '</span></div></div>' +

      '<section class="card verdict-card" data-verdict="' + r.verdict + '" data-reveal>' +
      '<div class="gauge-3d" role="img" aria-label="Fake likelihood ' + r.score + ' percent"><div class="gauge-inner">' +
      '<div class="g-layer"></div><div class="g-layer l2"></div>' +
      '<svg viewBox="0 0 260 260"><circle class="g-track" cx="130" cy="130" r="110" fill="none" stroke-width="16"/>' +
      '<circle class="g-fill" cx="130" cy="130" r="110" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg>' +
      '<div class="g-center"><div class="g-value"><span id="g-num">0</span><small>%</small></div><div class="g-label">Fake likelihood</div></div></div></div>' +
      '<div><span class="eyebrow"><span class="dot"></span>Analysis result</span>' +
      '<h1 class="verdict-title">' + TL.icon(vm.icon) + TL.esc(r.verdictLabel) + '</h1>' +
      '<p class="verdict-summary">' + TL.esc(r.summary) + '</p>' +
      '<div class="conf"><div class="conf-top"><span>Model confidence</span><span>' + r.confidence + '%</span></div><div class="progress"><span id="conf-bar"></span></div></div>' +
      '<div class="verdict-meta"><span class="chip">' + TL.icon('file') + r.stats.words + ' words</span><span class="chip">' + TL.icon('target') + r.signals.length + ' signals checked</span>' +
      '<span class="chip">' + TL.icon('alert') + flagged + ' high-risk</span>' + (r.domain ? '<span class="chip">' + TL.icon('globe') + TL.esc(r.domain.host || 'invalid link') + '</span>' : '') +
      (r.engine ? '<span class="chip" title="Analysis time' + (r.engine.cached ? ' (served from cache)' : '') + '">' + TL.icon('zap') + TL.fmtMs(r.engine.roundTripMs || r.engine.ms) + ' · ' + TL.esc(TL.api ? TL.api.label(r.engine.backend) : r.engine.backend) + '</span>' : '') + '</div>' +
      '<div class="verdict-actions"><a class="btn btn-primary btn-sm" href="' + detector + '">' + TL.icon('refresh') + 'Analyse another</a>' +
      '<button class="btn btn-ghost btn-sm" id="act-copy" type="button">' + TL.icon('copy') + 'Copy summary</button>' +
      '<button class="btn btn-ghost btn-sm" id="act-download" type="button">' + TL.icon('download') + 'Download report</button>' +
      '<button class="btn btn-ghost btn-sm" id="act-print" type="button">' + TL.icon('printer') + 'Print</button>' +
      '<button class="btn btn-danger btn-sm" id="act-delete" type="button">' + TL.icon('trash') + 'Delete</button></div></div></section>' +

      '<div class="result-grid">' + mlCard(r, lvl) +
      '<section class="card" data-reveal><h2 class="card-title">' + TL.icon('sliders') + 'Signal breakdown</h2>' +
      r.signals.map(function (s) {
        var l = lvl(s.risk);
        return '<div class="signal"><div class="signal-top"><span class="signal-name">' + TL.esc(s.name) + '</span><span class="signal-val">' + l[1] + ' · ' + s.risk + '%</span></div>' +
          '<div class="signal-bar lvl-' + l[0] + '"><span data-w="' + s.risk + '"></span></div><p class="signal-desc">' + TL.esc(s.desc) + '</p></div>';
      }).join('') + '</section>' +

      '<section class="card" data-reveal style="--d:.08s"><h2 class="card-title">' + TL.icon('brain') + 'Why the AI decided this</h2><ul class="reasons">' +
      r.reasons.map(function (x) {
        return '<li class="reason ' + x.kind + '"><span class="r-icon">' + TL.icon(reasonIcon[x.kind]) + '</span><div><strong>' + TL.esc(x.title) + '</strong><p>' + TL.esc(x.detail) + '</p>' +
          (x.terms && x.terms.length ? '<div class="terms">' + x.terms.map(function (t) { return '<span class="term">' + TL.esc(t) + '</span>'; }).join('') + '</div>' : '') + '</div></li>';
      }).join('') + '</ul></section>' +

      (evidenceText ? '<section class="card span-2" data-reveal><div class="card-head"><h2 class="card-title">' + TL.icon('eye') + 'Evidence in the text</h2>' +
        '<div class="legend"><span><i style="background:rgba(var(--bad-rgb),.6)"></i>Suspicious phrase</span><span><i style="background:rgba(var(--good-rgb),.6)"></i>Credibility marker</span></div></div>' +
        '<div class="evidence-text' + (settings.highlight ? '' : ' no-highlight') + '">' + TL.analyzer.highlight(evidenceText, r.highlights) + '</div>' +
        '<p class="hint" style="margin-top:10px">Hover a highlighted phrase to see why it was flagged.</p></section>' : '') +

      '<section class="card" data-reveal><h2 class="card-title">' + TL.icon('file') + 'Input details</h2><dl class="kv">' +
      (isNews
        ? kv('Mode', modeLabel) + kv('Headline', r.input.title || '—') + kv('Source link', r.input.url || '—') + kv('Reading time', r.stats.readingTime + ' min')
        : kv('Product', r.input.product || '—') + kv('Category', r.input.category || '—') + kv('Star rating', r.input.rating ? r.input.rating + ' / 5' : 'Not rated') +
          kv('Verified purchase', r.input.verified === true ? 'Yes' : r.input.verified === false ? 'No' : 'Unknown')) +
      '</dl></section>' +

      '<section class="card" data-reveal style="--d:.08s"><h2 class="card-title">' + TL.icon('chart') + 'Text statistics</h2><dl class="kv">' +
      kv('Words', r.stats.words) + kv('Sentences', r.stats.sentences) + kv('Avg. sentence length', r.stats.avgSentence + ' words') +
      kv('Exclamation marks', r.stats.exclamations) + kv('ALL-CAPS words', r.stats.capsWords) +
      (isNews ? kv('Numbers & figures', r.stats.numbers) : kv('First-person words', (r.stats.firstPersonPct || 0) + '%')) +
      '</dl></section>' +

      (r.domain ? '<section class="card span-2" data-reveal><h2 class="card-title">' + TL.icon('globe') + 'Source link report</h2>' +
        '<dl class="kv" style="margin-bottom:16px">' + kv('Domain', r.domain.host || 'Invalid') + kv('Category', ({ trusted: 'Trusted news / fact-check', official: 'Official / academic', satire: 'Satire', unknown: 'Unverified' })[r.domain.category] || 'Unverified') +
        kv('Domain risk', r.domain.risk + '%') + kv('Secure (https)', /^https:/i.test(r.input.url) || !/^http:/i.test(r.input.url) ? 'Yes' : 'No') + '</dl>' +
        '<ul class="reasons">' + r.domain.positives.map(function (p) { return '<li class="reason good"><span class="r-icon">' + TL.icon('checkcircle') + '</span><div><p>' + TL.esc(p) + '</p></div></li>'; }).join('') +
        r.domain.flags.map(function (f) { return '<li class="reason ' + (r.domain.risk >= 60 ? 'bad' : 'warn') + '"><span class="r-icon">' + TL.icon('alert') + '</span><div><p>' + TL.esc(f) + '</p></div></li>'; }).join('') +
        '</ul></section>' : '') +
      '</div>' +
      '<div class="notice" style="margin-top:24px" data-reveal>' + TL.icon('info') + '<span>This result is generated by an automated model and is <b>probabilistic</b>. For important decisions, cross-check with the fact-checkers listed on the <a href="verified-news.html" style="color:var(--accent);font-weight:600">Verified News</a> page.</span></div>';

    host.innerHTML = html;
    document.title = r.verdictLabel + ' · Analysis Result · TruthLens AI';
    TL.initReveal(host);

    after(function () {
      $('.g-fill', host).style.strokeDashoffset = (C * (1 - r.score / 100)).toFixed(1);
      TL.countUp($('#g-num'), r.score, { duration: 1600 });
      $('#conf-bar').style.width = r.confidence + '%';
      $$('.signal-bar > span, .meter > span', host).forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; });
    });

    var fb = $('#feedback', host);
    fb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fb]');
      if (!b || !TL.api) return;
      var label = +b.getAttribute('data-fb');
      $$('[data-fb]', fb).forEach(function (x) { x.disabled = true; });
      b.innerHTML = TL.icon('refresh') + 'Learning…';
      TL.api.feedback(r.type, r.input, label).then(function (res) {
        r.feedback = label; r.feedbackAt = new Date().toISOString();
        TL.updateResult(r);
        fb.innerHTML = feedbackInner(r);
        TL.toast('Model updated to v' + res.model.version + '. Thanks for teaching it!');
      }, function (err) {
        TL.toast(err.message || 'Could not send feedback', 'error');
        fb.innerHTML = feedbackInner(r);
      });
    });

    var report = function () {
      var lines = ['TruthLens AI — Analysis Report', '==============================', '',
        'Detector:     ' + (isNews ? 'Fake News Detector' : 'Fake Review Detector'),
        'Date:         ' + TL.formatDate(r.createdAt, true),
        'Verdict:      ' + r.verdictLabel,
        'Fake score:   ' + r.score + '%',
        'Confidence:   ' + r.confidence + '%'];
      if (r.ml && !r.ml.skipped) {
        lines.push('Rule engine:  ' + r.ruleScore + '%', 'Naive Bayes:  ' + Math.round(r.ml.pNb * 100) + '%', 'Logistic reg: ' + Math.round(r.ml.pLr * 100) + '%',
          'ML model:     v' + r.ml.model.version + ', ' + r.ml.model.samples + ' training examples, ' + Math.round(r.ml.model.accuracy * 100) + '% CV accuracy');
      }
      if (r.engine) lines.push('Engine:       ' + (TL.api ? TL.api.label(r.engine.backend) : r.engine.backend) + ', ' + TL.fmtMs(r.engine.roundTripMs || r.engine.ms));
      lines.push('', 'Summary', '-------', r.summary, '', 'Signals', '-------');
      r.signals.forEach(function (s) { lines.push('- ' + s.name + ': ' + s.risk + '%'); });
      lines.push('', 'Reasons', '-------');
      r.reasons.forEach(function (x) { lines.push('[' + x.kind.toUpperCase() + '] ' + x.title + ' — ' + x.detail + (x.terms && x.terms.length ? ' (' + x.terms.join(', ') + ')' : '')); });
      lines.push('', 'Input', '-----');
      if (isNews) { if (r.input.url) lines.push('URL: ' + r.input.url); if (r.input.title) lines.push('Headline: ' + r.input.title); }
      else lines.push('Product: ' + (r.input.product || '—') + ' | Rating: ' + (r.input.rating || '—'));
      if (evidenceText) lines.push('', evidenceText);
      return lines.join('\n');
    };
    $('#act-copy').addEventListener('click', function () {
      var txt = r.verdictLabel + ' (' + r.score + '% fake likelihood, ' + r.confidence + '% confidence). ' + r.summary;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { TL.toast('Summary copied to clipboard'); }, function () { TL.toast('Could not copy', 'error'); });
      else TL.toast('Clipboard not available', 'error');
    });
    $('#act-download').addEventListener('click', function () { TL.download('truthlens-report-' + r.id + '.txt', report()); TL.toast('Report downloaded'); });
    $('#act-print').addEventListener('click', function () { window.print(); });
    $('#act-delete').addEventListener('click', function () {
      if (!confirm('Delete this analysis from your history?')) return;
      TL.deleteResult(r.id);
      var last = TL.store.get('tl_last', null);
      if (last && last.id === r.id) TL.store.remove('tl_last');
      location.href = 'history.html';
    });
  }
  function kv(k, v) { return '<div><dt>' + TL.esc(k) + '</dt><dd>' + TL.esc(v) + '</dd></div>'; }
  function pc(v) { return Math.round(v * 100); }

  function mlCard(r, lvl) {
    var ml = r.ml, fbBox = '<div class="feedback-box" id="feedback">' + feedbackInner(r) + '</div>';
    var head = '<h2 class="card-title">' + TL.icon('cpu') + 'Machine-learning analysis</h2>';
    if (!ml || ml.skipped) {
      return '<section class="card span-2 ml-card" data-reveal>' + head +
        '<div class="notice">' + TL.icon('info') + '<span>' + TL.esc(ml ? ml.reason : 'This check was saved before the ML engine was added, so only the rule engine was used.') + '</span></div>' + fbBox + '</section>';
    }
    var comps = [
      { k: 'Final ensemble', v: r.score, note: 'meta-learner output', main: true },
      { k: 'Rule engine', v: r.ruleScore, note: '7 explainable signals' },
      { k: 'Naive Bayes', v: pc(ml.pNb), note: 'word & bigram likelihoods' },
      { k: 'Logistic Regression', v: pc(ml.pLr), note: 'learned feature weights' }
    ];
    var inf = [['Naive Bayes', ml.influence.nb], ['Logistic Regression', ml.influence.lr], ['Rule engine', ml.influence.rules]];
    var chip = function (kind) { return function (t) { return '<span class="term term-' + kind + '" title="' + (kind === 'bad' ? 'Pushed towards fake' : 'Pushed towards real') + ' (' + t.w + ')">' + TL.esc(t.label) + '</span>'; }; };
    var terms = ml.fake.map(chip('bad')).concat(ml.real.map(chip('good'))).join('');
    var m = ml.model;
    return '<section class="card span-2 ml-card" data-reveal>' +
      '<div class="card-head">' + head + '<a class="btn btn-ghost btn-sm" href="model.html">' + TL.icon('chart') + 'Model accuracy</a></div>' +
      '<div class="ml-models">' + comps.map(function (c) {
        return '<div class="ml-model' + (c.main ? ' main' : '') + '"><span class="mm-label">' + c.k + '</span><span class="mm-value">' + c.v + '<small>%</small></span>' +
          '<div class="signal-bar lvl-' + lvl(c.v)[0] + '"><span data-w="' + c.v + '"></span></div><span class="mm-note">' + c.note + '</span></div>';
      }).join('') + '</div>' +
      '<div class="ml-split"><div><h3 class="mini-title">How much each model counted</h3>' + inf.map(function (x, i) {
        return '<div class="split-row"><div class="split-top"><span>' + x[0] + '</span><b>' + pc(x[1]) + '%</b></div><div class="meter' + (i === 1 ? ' alt' : '') + '"><span data-w="' + pc(x[1]) + '"></span></div></div>';
      }).join('') + '</div>' +
      '<div><h3 class="mini-title">Words that moved the ML score</h3>' + (terms ? '<div class="terms">' + terms + '</div>' : '<p class="muted small">No single word stood out; the score comes from many small signals.</p>') +
      '<div class="legend" style="margin-top:12px"><span><i style="background:rgba(var(--bad-rgb),.6)"></i>Towards fake</span><span><i style="background:rgba(var(--good-rgb),.6)"></i>Towards real</span></div></div></div>' +
      '<p class="hint ml-foot">Model v' + m.version + ' · trained on ' + m.samples + ' labelled examples (' + (m.custom ? 'custom dataset' : 'built-in dataset') + ') · ' +
      pc(m.accuracy) + '% accuracy and ' + (m.auc || 0).toFixed(2) + ' AUC in cross-validation.</p>' + fbBox + '</section>';
  }
  function feedbackInner(r) {
    var realWord = r.type === 'news' ? 'real' : 'genuine';
    if (r.feedback != null) {
      return '<span class="fb-icon good">' + TL.icon('checkcircle') + '</span><div class="fb-text"><strong>Thanks, the model learned from this.</strong>' +
        '<p>You marked it as ' + (r.feedback ? 'fake' : realWord) + '. Future checks use the updated model.</p></div>';
    }
    return '<span class="fb-icon">' + TL.icon('brain') + '</span><div class="fb-text"><strong>Was this verdict right?</strong><p>Tell the model the true answer. It learns from it straight away.</p></div>' +
      '<div class="btn-row"><button class="btn btn-ghost btn-sm" type="button" data-fb="1">' + TL.icon('xcircle') + 'It is fake</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-fb="0">' + TL.icon('checkcircle') + 'It is ' + realWord + '</button></div>';
  }

  /* ================= HISTORY ================= */
  function historyPage() {
    var state = { q: '', type: 'all', verdict: 'all', sort: 'new' };
    var list = $('#history-list'), summary = $('#history-summary');
    function render() {
      var all = TL.getHistory();
      $('#history-tools').hidden = !all.length;
      if (!all.length) {
        summary.textContent = '';
        list.innerHTML = '<div class="card empty"><div class="empty-icon">' + TL.icon('history') + '</div><h2>No checks yet</h2>' +
          '<p>Every analysis you run is saved here on this device so you can revisit the result later.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="news-detector.html">' + TL.icon('search') + 'Check news</a>' +
          '<a class="btn btn-ghost" href="review-detector.html">' + TL.icon('star') + 'Check a review</a>' +
          '<button class="btn btn-ghost" id="demo-btn" type="button">' + TL.icon('database') + 'Load demo data</button></div></div>';
        $('#demo-btn').addEventListener('click', function () { TL.loadDemoData(); render(); });
        return;
      }
      var q = state.q.toLowerCase();
      var items = all.filter(function (r) {
        if (state.type !== 'all' && r.type !== state.type) return false;
        if (state.verdict !== 'all' && r.verdict !== state.verdict) return false;
        if (q && (r.title + ' ' + (r.input.text || '') + ' ' + (r.input.url || '') + ' ' + (r.input.product || '')).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      items.sort(function (a, b) {
        if (state.sort === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
        if (state.sort === 'risk') return b.score - a.score;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      summary.textContent = 'Showing ' + items.length + ' of ' + all.length + ' check' + (all.length === 1 ? '' : 's');
      if (!items.length) { list.innerHTML = '<div class="card empty"><div class="empty-icon">' + TL.icon('search') + '</div><h3>No matches</h3><p>Try a different search or filter.</p></div>'; return; }
      list.innerHTML = items.map(function (r) {
        var snippet = r.type === 'news' ? (r.input.text || r.input.url || '') : r.input.text;
        return '<article class="h-item"><span class="h-type" title="' + (r.type === 'news' ? 'News' : 'Review') + '">' + TL.icon(r.type === 'news' ? 'news' : 'star') + '</span>' +
          '<div class="h-main"><a class="h-title" href="result.html?id=' + encodeURIComponent(r.id) + '">' + TL.esc(r.title || 'Untitled check') + '</a>' +
          '<div class="h-sub"><span>' + (r.type === 'news' ? 'News' : 'Review') + '</span><span>' + TL.timeAgo(r.createdAt) + '</span><span class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px">' + TL.esc(snippet.slice(0, 90)) + '</span></div></div>' +
          '<div class="h-score">' + TL.badge(r.verdict, r.type) + '<div><b>' + r.score + '%</b><span>fake score</span></div></div>' +
          '<div class="h-actions"><a class="icon-btn" href="result.html?id=' + encodeURIComponent(r.id) + '" title="View result" aria-label="View result">' + TL.icon('eye') + '</a>' +
          '<button class="icon-btn" type="button" data-del="' + TL.esc(r.id) + '" title="Delete" aria-label="Delete check">' + TL.icon('trash') + '</button></div></article>';
      }).join('');
    }
    $('#history-search').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    bindTabs($('#history-type'), function (b) { state.type = b.getAttribute('data-type'); render(); });
    $('#history-verdict').addEventListener('change', function (e) { state.verdict = e.target.value; render(); });
    $('#history-sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (!b) return;
      TL.deleteResult(b.getAttribute('data-del'));
      TL.toast('Check deleted');
      render();
    });
    $('#history-export').addEventListener('click', function () { TL.download('truthlens-history.json', JSON.stringify(TL.getHistory(), null, 2), 'application/json'); TL.toast('History exported'); });
    $('#history-clear').addEventListener('click', function () {
      if (!confirm('Delete all saved checks? This cannot be undone.')) return;
      TL.clearHistory(); TL.toast('History cleared'); render();
    });
    render();
  }

  /* ================= VERIFIED NEWS ================= */
  function verifiedPage() {
    var state = { verdict: 'all', cat: 'all', q: '' };
    var grid = $('#fact-grid');
    var cats = TL.facts.map(function (f) { return f.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    $('#fact-cat').innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    var vClass = { True: 'genuine', False: 'fake', Misleading: 'suspicious' };
    var vIcon = { True: 'checkcircle', False: 'xcircle', Misleading: 'alert' };
    function render() {
      var q = state.q.toLowerCase();
      var items = TL.facts.filter(function (f) {
        return (state.verdict === 'all' || f.verdict === state.verdict) && (state.cat === 'all' || f.category === state.cat) &&
          (!q || (f.claim + ' ' + f.detail + ' ' + f.source).toLowerCase().indexOf(q) > -1);
      });
      $('#fact-count').textContent = items.length + ' claim' + (items.length === 1 ? '' : 's');
      grid.innerHTML = items.length ? items.map(function (f, i) {
        var badge = '<span class="badge badge-' + vClass[f.verdict] + '">' + TL.icon(vIcon[f.verdict]) + f.verdict + '</span>';
        return '<article class="flip" data-reveal style="--d:' + (i % 3) * 0.06 + 's" aria-label="Claim: ' + TL.esc(f.claim) + '"><div class="flip-inner">' +
          '<div class="flip-face"><div class="fact-top"><span class="fact-cat">' + f.category + '</span>' + badge + '</div>' +
          '<p class="fact-claim">“' + TL.esc(f.claim) + '”</p><p class="hint">' + TL.icon('refresh') + 'Hover or tap to see the explanation</p></div>' +
          '<div class="flip-face flip-back"><div class="fact-top"><span class="fact-cat">Why it\'s ' + f.verdict.toLowerCase() + '</span>' + badge + '</div>' +
          '<p style="margin-top:12px">' + TL.esc(f.detail) + '</p>' +
          '<a class="fact-src" href="' + f.url + '" target="_blank" rel="noopener noreferrer">' + TL.icon('external') + TL.esc(f.source) + '</a></div></div></article>';
      }).join('') : '<div class="card empty" style="grid-column:1/-1"><div class="empty-icon">' + TL.icon('search') + '</div><h3>No claims match</h3><p>Try another filter or search term.</p></div>';
      initFlips(grid);
      TL.initReveal(grid);
    }
    $$('#fact-verdicts .chip-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#fact-verdicts .chip-btn').forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
        state.verdict = b.getAttribute('data-v'); render();
      });
    });
    $('#fact-cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
    $('#fact-search').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    render();

    $('#source-grid').innerHTML = TL.sources.map(function (s, i) {
      return '<article class="card tilt source-card" data-reveal style="--d:' + (i % 3) * 0.06 + 's"><span class="logo depth-1">' + s.short + '</span><div class="depth-1"><h3>' + TL.esc(s.name) + '</h3><p>' + TL.esc(s.desc) + '</p>' +
        '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer">Visit site ' + TL.icon('external') + '</a></div></article>';
    }).join('');
    TL.initTilt($('#source-grid'));
    TL.initReveal($('#source-grid'));
  }

  /* ================= DASHBOARD ================= */
  function dashboardPage() {
    var s = TL.getSettings();
    var h = TL.getHistory();
    var initials = (s.name || 'Guest').split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
    $('#p-avatar').textContent = initials || 'G';
    $('#p-name').textContent = s.name || 'Guest User';
    $('#p-since').textContent = 'Member since ' + TL.formatDate(s.createdAt) + (s.email ? ' · ' + s.email : '');

    var fake = h.filter(function (r) { return r.verdict === 'fake'; }).length;
    var sus = h.filter(function (r) { return r.verdict === 'suspicious'; }).length;
    var gen = h.filter(function (r) { return r.verdict === 'genuine'; }).length;
    var avgConf = h.length ? Math.round(h.reduce(function (a, r) { return a + r.confidence; }, 0) / h.length) : 0;
    TL.countUp($('#st-total'), h.length);
    TL.countUp($('#st-flagged'), fake + sus);
    TL.countUp($('#st-genuine'), gen);
    TL.countUp($('#st-conf'), avgConf, { suffix: '%' });
    $('#st-flagged-note').textContent = fake + ' fake · ' + sus + ' suspicious';
    $('#st-genuine-note').textContent = h.length ? Math.round((gen / h.length) * 100) + '% of all checks' : 'No checks yet';

    $('#dash-empty').hidden = h.length > 0;
    $('#demo-btn').addEventListener('click', function () { TL.loadDemoData(); location.reload(); });

    /* Verdict breakdown — stacked bar (status colours + icon + label) */
    var parts = [
      { key: 'fake', label: 'Fake', n: fake, color: 'var(--bad)', icon: 'xcircle' },
      { key: 'suspicious', label: 'Suspicious', n: sus, color: 'var(--warn)', icon: 'alert' },
      { key: 'genuine', label: 'Genuine / Real', n: gen, color: 'var(--good)', icon: 'checkcircle' }
    ];
    var total = h.length || 1;
    var bar = $('#verdict-bar');
    bar.innerHTML = h.length ? parts.filter(function (p) { return p.n; }).map(function (p) {
      return '<span data-label="' + p.label + '" data-n="' + p.n + '" style="background:' + p.color + ';flex-grow:0;flex-basis:0"></span>';
    }).join('') : '<span style="background:var(--panel-2);flex-grow:1;border:1px solid var(--border);border-radius:6px"></span>';
    after(function () { $$('span[data-n]', bar).forEach(function (sp) { sp.style.flexGrow = sp.getAttribute('data-n'); }); });
    $$('span[data-n]', bar).forEach(function (sp) {
      sp.addEventListener('pointermove', function (e) { var n = +sp.getAttribute('data-n'); showTip(e, '<b>' + sp.getAttribute('data-label') + '</b>' + n + ' check' + (n === 1 ? '' : 's') + ' · ' + Math.round(n / total * 100) + '%'); });
      sp.addEventListener('pointerleave', hideTip);
    });
    $('#verdict-legend').innerHTML = parts.map(function (p) {
      return '<div class="legend-row"><i style="background:' + p.color + '"></i>' + TL.icon(p.icon) + '<span>' + p.label + '</span><b>' + p.n + '</b><em>' + (h.length ? Math.round(p.n / total * 100) : 0) + '%</em></div>';
    }).join('');

    /* Type split */
    var nNews = h.filter(function (r) { return r.type === 'news'; }).length, nRev = h.length - nNews;
    $('#split').innerHTML =
      '<div class="split-row"><div class="split-top"><span>' + TL.icon('news') + ' News checks</span><b>' + nNews + '</b></div><div class="meter"><span data-w="' + (nNews / total * 100) + '"></span></div></div>' +
      '<div class="split-row"><div class="split-top"><span>' + TL.icon('star') + ' Review checks</span><b>' + nRev + '</b></div><div class="meter alt"><span data-w="' + (nRev / total * 100) + '"></span></div></div>';
    after(function () { $$('#split .meter > span').forEach(function (m) { m.style.width = m.getAttribute('data-w') + '%'; }); });

    /* Activity — column chart, last 7 days */
    var days = [], today = new Date(); today.setHours(0, 0, 0, 0);
    for (var i = 6; i >= 0; i--) { var d = new Date(today); d.setDate(d.getDate() - i); days.push({ date: d, n: 0 }); }
    h.forEach(function (r) {
      var t = new Date(r.createdAt); t.setHours(0, 0, 0, 0);
      days.forEach(function (d) { if (d.date.getTime() === t.getTime()) d.n++; });
    });
    var chartHost = $('#activity-chart'), lastW = 0;
    var redraw = function () { var w = chartHost.clientWidth; if (w && w !== lastW) { lastW = w; drawColumns(chartHost, days); } };
    redraw();
    window.addEventListener('resize', redraw);

    /* Recent */
    $('#recent').innerHTML = h.length ? h.slice(0, 5).map(function (r) {
      return '<a class="mini-item" href="result.html?id=' + encodeURIComponent(r.id) + '"><span class="h-type">' + TL.icon(r.type === 'news' ? 'news' : 'star') + '</span>' +
        '<span class="mi-main"><b>' + TL.esc(r.title || 'Untitled') + '</b><span>' + TL.timeAgo(r.createdAt) + ' · ' + r.score + '% fake score</span></span>' + TL.badge(r.verdict, r.type) + '</a>';
    }).join('') : '<p class="muted small" style="margin:0">Your latest checks will appear here.</p>';
  }

  function drawColumns(host, days) {
    // draw at the container's real width so text stays at its true pixel size
    var W = Math.max(280, Math.round(host.clientWidth || 560)), H = 230, padL = 32, padB = 28, padT = 16, innerW = W - padL - 8, innerH = H - padB - padT;
    var max = Math.max.apply(null, days.map(function (d) { return d.n; }));
    var step = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
    var top = max <= 4 ? 4 : step * Math.ceil(max / step);
    var band = innerW / days.length, bw = Math.min(24, band * 0.5);
    var y = function (v) { return padT + innerH - (v / top) * innerH; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Checks per day for the last 7 days">';
    for (var t = 0; t <= top; t += step) {
      svg += '<line class="' + (t === 0 ? 'base-line' : 'grid-line') + '" x1="' + padL + '" x2="' + (W - 8) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
        '<text class="axis-text" x="' + (padL - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>';
    }
    days.forEach(function (d, i) {
      var cx = padL + band * i + band / 2, x = cx - bw / 2, by = y(d.n), base = y(0), r = 4;
      var label = d.date.toLocaleDateString(undefined, { weekday: 'short' });
      svg += '<text class="axis-text" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + label + '</text>';
      if (d.n > 0) {
        var hgt = base - by, rr = Math.min(r, hgt);
        svg += '<path class="bar" data-bar="' + i + '" d="M' + x + ',' + base + 'V' + (by + rr) + 'Q' + x + ',' + by + ' ' + (x + rr) + ',' + by + 'H' + (x + bw - rr) + 'Q' + (x + bw) + ',' + by + ' ' + (x + bw) + ',' + (by + rr) + 'V' + base + 'Z"/>';
        if (d.n === max) svg += '<text class="val-text" x="' + cx + '" y="' + (by - 6) + '" text-anchor="middle">' + d.n + '</text>';
      }
      // transparent hit area on top of the bar, wider than the mark
      svg += '<rect class="hit" x="' + (padL + band * i) + '" y="' + padT + '" width="' + band + '" height="' + innerH + '" data-i="' + i + '"/>';
    });
    svg += '</svg>';
    host.innerHTML = svg;
    $$('.hit', host).forEach(function (hit) {
      var i = +hit.getAttribute('data-i'), d = days[i], barEl = $('[data-bar="' + i + '"]', host);
      hit.addEventListener('pointermove', function (e) {
        if (barEl) barEl.classList.add('hover');
        showTip(e, '<b>' + d.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }) + '</b>' + d.n + ' check' + (d.n === 1 ? '' : 's'));
      });
      hit.addEventListener('pointerleave', function () { if (barEl) barEl.classList.remove('hover'); hideTip(); });
    });
  }

  /* ================= SETTINGS ================= */
  function settingsPage() {
    var s = TL.getSettings();
    $('#s-name').value = s.name; $('#s-email').value = s.email;
    function seg(sel, attr, current, key, msg) {
      var btns = $$(sel);
      btns.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute(attr) === current);
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.toggle('active', x === b); });
          var patch = {}; patch[key] = b.getAttribute(attr);
          TL.saveSettings(patch); TL.toast(msg || 'Settings saved');
        });
      });
    }
    seg('[data-theme-opt]', 'data-theme-opt', s.theme, 'theme', 'Theme updated');
    seg('[data-accent-opt]', 'data-accent-opt', s.accent, 'accent', 'Accent colour updated');
    seg('[data-sens]', 'data-sens', s.sensitivity, 'sensitivity', 'Detection sensitivity updated');
    seg('[data-engine-opt]', 'data-engine-opt', s.engine, 'engine', 'Analysis engine updated');
    $$('[data-engine-opt]').forEach(function (b) { b.addEventListener('click', function () { if (TL.api) TL.api.restart(); }); });
    var engLine = $('#s-engine-status');
    var showEngine = function (st) {
      engLine.innerHTML = '<span class="dot"></span>Active engine: ' + TL.esc(st.label) + (st.latency != null ? ' · ' + TL.fmtMs(st.latency) + ' ping' : '');
    };
    window.addEventListener('tl:engine', function (e) { showEngine(e.detail); });
    if (TL.api && TL.api.status().backend) showEngine(TL.api.status());
    function toggle(id, key, msg) {
      var el = $(id); el.checked = !!s[key];
      el.addEventListener('change', function () { var p = {}; p[key] = el.checked; TL.saveSettings(p); TL.toast(msg); });
    }
    toggle('#s-3d', 'effects3d', '3D effects updated — reload pages to apply to WebGL scenes');
    toggle('#s-motion', 'reduceMotion', 'Motion preference saved');
    toggle('#s-save', 'saveHistory', 'History preference saved');
    toggle('#s-highlight', 'highlight', 'Evidence highlighting preference saved');
    toggle('#s-ml', 'useML', 'Machine-learning preference saved');

    $('#account').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#s-name').value.trim() || 'Guest User';
      TL.saveSettings({ name: name, email: $('#s-email').value.trim() });
      TL.toast('Profile saved');
    });
    function storedLine() { var n = TL.getHistory().length; $('#s-stored').textContent = n + ' check' + (n === 1 ? '' : 's') + ' stored on this device'; }
    storedLine();
    $('#s-export').addEventListener('click', function () {
      TL.download('truthlens-data.json', JSON.stringify({ settings: TL.getSettings(), history: TL.getHistory(), mlFeedback: TL.store.get('tl_ml_feedback', null) }, null, 2), 'application/json');
      TL.toast('Data exported');
    });
    $('#s-clear').addEventListener('click', function () {
      if (!confirm('Delete all saved checks? This cannot be undone.')) return;
      TL.clearHistory(); storedLine(); TL.toast('History cleared');
    });
    $('#s-reset').addEventListener('click', function () {
      if (!confirm('Reset all settings to their defaults?')) return;
      TL.store.remove('tl_settings'); TL.applySettings(TL.getSettings()); TL.toast('Settings reset'); setTimeout(function () { location.reload(); }, 600);
    });
  }

  /* ================= ML LAB ================= */
  var MAX_ROWS = 50000;
  function parseCSV(text, delim) {
    var rows = [], row = [], field = '', q = false, i = text.charCodeAt(0) === 0xFEFF ? 1 : 0, n = text.length, start;
    while (i < n) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
        start = i; while (i < n && text[i] !== '"') i++;
        field += text.slice(start, i); continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === delim) { row.push(field); field = ''; i++; continue; }
      if (c === '\n' || c === '\r') {
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = []; if (rows.length > MAX_ROWS) break;
        i += c === '\r' && text[i + 1] === '\n' ? 2 : 1; continue;
      }
      start = i; while (i < n && text[i] !== delim && text[i] !== '"' && text[i] !== '\n' && text[i] !== '\r') i++;
      field += text.slice(start, i);
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function parseTable(text, name) {
    var trimmed = text.replace(/^﻿/, '').trim(), records;
    if (/\.jsonl?$/i.test(name) || /^[\[{]/.test(trimmed)) {
      try {
        var j = JSON.parse(trimmed);
        records = Array.isArray(j) ? j : (j.rows || j.data || j.records);
      } catch (e) {
        records = trimmed.split(/\r?\n/).filter(Boolean).map(function (line) { return JSON.parse(line); });
      }
      if (!Array.isArray(records)) throw new Error('JSON must be an array of objects (or one object per line).');
      records = records.filter(function (r) { return r && typeof r === 'object'; });
    } else {
      var first = trimmed.slice(0, trimmed.indexOf('\n') > 0 ? trimmed.indexOf('\n') : 2000);
      var delim = [',', '\t', ';'].sort(function (a, b) { return first.split(b).length - first.split(a).length; })[0];
      var rows = parseCSV(trimmed, delim);
      if (rows.length < 2) throw new Error('The file needs a header row and at least one data row.');
      var head = rows[0].map(function (h, i) { return h.trim() || 'column ' + (i + 1); });
      records = rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o; });
    }
    if (!records.length) throw new Error('No rows found in the file.');
    var truncated = records.length > MAX_ROWS;
    records = records.slice(0, MAX_ROWS);
    var cols = [];
    records.slice(0, 50).forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    return { columns: cols, records: records, truncated: truncated };
  }
  function guessColumn(cols, re) { for (var i = 0; i < cols.length; i++) if (re.test(cols[i].trim())) return cols[i]; return ''; }

  function modelPage() {
    var NAMES = { news: 'Fake News model', review: 'Fake Review model' };
    var grid = $('#model-grid'), staged = { news: [], review: [] }, trainType = 'news', parsed = null;
    var FAKE_VALUES = /^(1|fake|false|deceptive|spam|cg|pants-fire|pants on fire|barely-true|unreliable|fraud|bot|f)$/i;

    function stat(label, value) { return '<div class="mc-stat"><span>' + label + '</span><b>' + value + '</b></div>'; }
    function bars(list) {
      var tot = list.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
      return list.map(function (x, i) {
        return '<div class="split-row"><div class="split-top"><span>' + x[0] + '</span><b>' + pc(x[1] / tot) + '%</b></div><div class="meter' + (i === 1 ? ' alt' : '') + '"><span data-w="' + pc(x[1] / tot) + '"></span></div></div>';
      }).join('');
    }
    function confusion(E) {
      return '<table class="confusion"><thead><tr><th></th><th scope="col">Predicted fake</th><th scope="col">Predicted real</th></tr></thead><tbody>' +
        '<tr><th scope="row">Actually fake</th><td class="hit">' + E.tp + '</td><td class="miss">' + E.fn + '</td></tr>' +
        '<tr><th scope="row">Actually real</th><td class="miss">' + E.fp + '</td><td class="hit">' + E.tn + '</td></tr></tbody></table>' +
        '<p class="hint">Precision ' + pc(E.precision) + '% · Recall ' + pc(E.recall) + '%</p>';
    }
    function termChips(list, kind) {
      return list.length ? '<div class="terms">' + list.map(function (t) { return '<span class="term term-' + kind + '">' + TL.esc(t[0]) + '</span>'; }).join('') + '</div>' : '<p class="muted small">—</p>';
    }
    function modelCard(d) {
      var M = d.metrics, E = M.ensemble, w = d.meta.w.map(Math.abs), src = d.source || {};
      var rows = [['Rule engine only', M.rules], ['Naive Bayes', M.nb], ['Logistic Regression', M.lr], ['Stacked ensemble', E]].filter(function (r) { return r[1]; });
      var srcText = [[src.seed, 'built-in'], [src.custom, 'uploaded'], [src.feedback, 'from feedback']].filter(function (x) { return x[0]; })
        .map(function (x) { return x[0].toLocaleString() + ' ' + x[1]; }).join(', ');
      return '<article class="card model-card" data-reveal>' +
        '<div class="card-head"><h2 class="card-title">' + TL.icon(d.type === 'news' ? 'news' : 'star') + NAMES[d.type] + '</h2>' +
        '<span class="badge ' + (d.custom ? 'badge-accent' : 'badge-neutral') + '">' + TL.icon(d.custom ? 'database' : 'layers') + (d.custom ? 'Custom dataset' : 'Built-in dataset') + '</span></div>' +
        '<div class="mc-stats">' + stat('Accuracy', pc(E.accuracy) + '%') + stat('F1 score', E.f1.toFixed(2)) + stat('ROC AUC', E.auc.toFixed(2)) + stat('Examples', d.samples.toLocaleString()) + '</div>' +
        '<h3 class="mini-title">Accuracy by model <span class="muted">· ' + M.folds + '-fold cross-validation on ' + M.evaluated.toLocaleString() + ' examples</span></h3>' +
        '<div class="cmp-rows">' + rows.map(function (r) {
          var main = r[1] === E;
          return '<div class="cmp-row' + (main ? ' main' : '') + '"><span class="cmp-name">' + r[0] + '</span><div class="meter' + (main ? '' : ' alt') + '"><span data-w="' + pc(r[1].accuracy) + '"></span></div>' +
            '<span class="cmp-val"><b>' + pc(r[1].accuracy) + '%</b> AUC ' + r[1].auc.toFixed(2) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="mc-split"><div><h3 class="mini-title">Confusion matrix <span class="muted">· ensemble</span></h3>' + confusion(E) + '</div>' +
        '<div><h3 class="mini-title">Meta-learner weights</h3>' + bars([['Naive Bayes', w[0]], ['Logistic Regression', w[1]], ['Rule engine', w[2] || 0]]) + '</div></div>' +
        '<h3 class="mini-title">Strongest fake indicators</h3>' + termChips(d.top.fake, 'bad') +
        '<h3 class="mini-title">Strongest real indicators</h3>' + termChips(d.top.real, 'good') +
        '<p class="hint ml-foot">' + d.fake.toLocaleString() + ' fake + ' + d.real.toLocaleString() + ' real examples (' + srcText + ') · ' + d.features.toLocaleString() +
        ' hashed features · trained in ' + TL.fmtMs(d.trainMs) + ' · v' + d.version + '</p>' +
        '<div class="btn-row"><button class="btn btn-ghost btn-sm" type="button" data-reset="' + d.type + '"' + (d.custom || d.feedback ? '' : ' disabled') + '>' +
        TL.icon('refresh') + 'Reset to built-in model</button></div></article>';
    }
    function showStatus(st) {
      var off = !st.backend;
      $('#eng-status').innerHTML = '<span class="dot' + (off ? ' off' : '') + '"></span>' + TL.esc(st.label) + (st.backend === 'server' ? ' connected' : st.backend ? ' active' : '');
      $('#eng-desc').textContent = {
        server: 'Analysis, training and feedback run on the Node.js server (server.js). The same engine also ships to the browser as an automatic fallback.',
        worker: 'No backend server was found, so the engine runs in a background Web Worker and never blocks the page. Start node server.js to use the backend.',
        browser: 'This page was opened as a file, so the engine runs on the main thread. Run node server.js and open http://localhost:5510 to use the backend.'
      }[st.backend] || '';
    }
    function load() {
      return TL.api.info().then(function (info) {
        var st = TL.api.status();
        showStatus(st);
        $('#eng-kv').innerHTML = kv('Engine', 'v' + info.engine) + kv('Backend', st.label) + kv('Ping', st.latency != null ? TL.fmtMs(st.latency) : 'in-process') +
          kv('Avg. analysis', info.stats.analyses ? TL.fmtMs(info.stats.avgMs) + ' (' + info.stats.analyses + ' runs)' : 'no runs yet');
        grid.innerHTML = modelCard(info.news) + modelCard(info.review);
        TL.initReveal(grid);
        after(function () { $$('.meter > span', grid).forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; }); });
      }, function (e) {
        $('#eng-status').innerHTML = '<span class="dot off"></span>Engine unavailable';
        $('#eng-desc').textContent = e.message;
      });
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-reset]');
      if (!b || !confirm('Reset this model to the built-in dataset? Custom training and feedback for it will be removed.')) return;
      b.disabled = true;
      TL.api.reset(b.getAttribute('data-reset')).then(function () { TL.toast('Model reset'); return load(); }, function (err) { TL.toast(err.message, 'error'); b.disabled = false; });
    });
    $('#refresh-btn').addEventListener('click', load);

    /* Speed benchmark */
    $('#bench-btn').addEventListener('click', function () {
      var btn = this, out = $('#bench-out'), S = TL.samples;
      btn.disabled = true; out.hidden = false; out.innerHTML = '<p class="muted small">Running 400 analyses…</p>';
      var variants = function (base, n) {
        var a = [], tag = Date.now().toString(36);
        for (var i = 0; i < n; i++) { var b = base[i % base.length]; a.push(Object.assign({}, b, { text: (b.text || '') + ' [' + tag + i + ']' })); }
        return a;
      };
      var newsBase = [S.newsFake, S.newsReal].concat(TL.facts.map(function (f) { return { title: f.claim, text: f.detail }; }));
      var t0 = performance.now();
      TL.api.batch('news', variants(newsBase, 200)).then(function (a) {
        return TL.api.batch('review', variants([S.reviewFake, S.reviewReal], 200)).then(function (b) {
          var n = a.count + b.count, ms = a.ms + b.ms, wall = performance.now() - t0;
          out.innerHTML = '<div class="mc-stats">' + stat('Analyses', n) + stat('Engine time', TL.fmtMs(ms)) + stat('Per analysis', TL.fmtMs(ms / n)) +
            stat('Throughput', Math.round(n / ms * 1000).toLocaleString() + '/s') + '</div>' +
            '<p class="hint">Measured on the ' + TL.esc(TL.api.label(a.backend)) + '. Each analysis runs all rule signals, both ML models and the meta-learner. ' +
            'Wall-clock time including data transfer: ' + TL.fmtMs(wall) + '.</p>';
        });
      }).catch(function (e) { out.innerHTML = '<p class="small" style="color:var(--bad)">' + TL.esc(e.message) + '</p>'; })
        .then(function () { btn.disabled = false; });
    });

    /* Training with an uploaded dataset */
    var fileInput = $('#train-file'), fileName = $('#file-name'), mapping = $('#mapping');
    var selText = $('#map-text'), selTitle = $('#map-title'), selLabel = $('#map-label'), selRating = $('#map-rating'), values = $('#map-values');
    function options(cols, none) { return (none ? '<option value="">' + none + '</option>' : '') + cols.map(function (c) { return '<option>' + TL.esc(c) + '</option>'; }).join(''); }
    function applyType() {
      $('#map-title-field').hidden = trainType !== 'news';
      $('#map-rating-field').hidden = trainType !== 'review';
      renderStaged();
    }
    bindTabs($('#train-type'), function (b) { trainType = b.getAttribute('data-type'); applyType(); });

    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (!f) return;
      if (f.size > 150 * 1048576) { TL.toast('Please use a file smaller than 150 MB.', 'error'); return; }
      fileName.textContent = 'Reading ' + f.name + '…';
      var rd = new FileReader();
      rd.onload = function () {
        setTimeout(function () {
          try { parsed = parseTable(String(rd.result), f.name); }
          catch (e) { parsed = null; mapping.hidden = true; fileName.textContent = f.name + ': ' + e.message; TL.toast('Could not read the file: ' + e.message, 'error'); return; }
          fileName.textContent = f.name + ' · ' + parsed.records.length.toLocaleString() + ' rows' + (parsed.truncated ? ' (first ' + MAX_ROWS.toLocaleString() + ' used)' : '') + ' · ' + parsed.columns.length + ' columns';
          showMapping();
        }, 20);
      };
      rd.onerror = function () { TL.toast('Could not read the file', 'error'); };
      rd.readAsText(f);
    });

    function showMapping() {
      var cols = parsed.columns;
      var textCol = guessColumn(cols, /^(text|content|review|review_?text|text_|body|article|statement|message|comment|reviewtext|review_body|tweet)$/i);
      if (!textCol) {   // fall back to the column with the longest values
        var best = 0;
        cols.forEach(function (c) { var len = parsed.records.slice(0, 40).reduce(function (a, r) { return a + String(r[c] == null ? '' : r[c]).length; }, 0); if (len > best) { best = len; textCol = c; } });
      }
      selText.innerHTML = options(cols); selText.value = textCol;
      selTitle.innerHTML = options(cols, 'None'); selTitle.value = guessColumn(cols, /^(title|headline)$/i);
      selRating.innerHTML = options(cols, 'None'); selRating.value = guessColumn(cols, /^(rating|stars?|overall|score)$/i);
      selLabel.innerHTML = '<option value="">Choose how rows are labelled…</option><optgroup label="Use a column">' + options(cols) + '</optgroup>' +
        '<optgroup label="Same label for every row"><option value="const:1">All rows are fake</option><option value="const:0">All rows are real / genuine</option></optgroup>';
      selLabel.value = guessColumn(cols, /^(label|labels|class|target|fake|is_?fake|truth|verdict|deceptive|spam|y)$/i);
      showValues();
      mapping.hidden = false;
    }
    function showValues() {
      var col = selLabel.value, field = $('#map-values-field');
      if (!col || col.indexOf('const:') === 0) { field.hidden = true; return; }
      var counts = {};
      parsed.records.forEach(function (r) { var v = String(r[col] == null ? '' : r[col]).trim(); counts[v] = (counts[v] || 0) + 1; });
      var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
      values.innerHTML = keys.slice(0, 16).map(function (k) {
        return '<label class="chip-check"><input type="checkbox" value="' + TL.esc(k) + '"' + (FAKE_VALUES.test(k) ? ' checked' : '') + '><span>' + TL.esc(k || '(empty)') + ' <em>' + counts[k].toLocaleString() + '</em></span></label>';
      }).join('') + (keys.length > 16 ? '<p class="hint">' + keys.length + ' different values. Is this really the label column?</p>' : '');
      field.hidden = false;
    }
    selLabel.addEventListener('change', showValues);

    $('#add-rows').addEventListener('click', function () {
      if (!parsed) return;
      var tcol = selText.value, hcol = trainType === 'news' ? selTitle.value : '', rcol = trainType === 'review' ? selRating.value : '', lsel = selLabel.value;
      if (!lsel) { TL.toast('Choose how the rows are labelled first.', 'error'); selLabel.focus(); return; }
      var fake = {}, constant = lsel.indexOf('const:') === 0 ? +lsel.slice(6) : null;
      $$('input:checked', values).forEach(function (c) { fake[c.value] = 1; });
      if (constant === null && !Object.keys(fake).length) { TL.toast('Tick at least one value that means fake.', 'error'); return; }
      var list = staged[trainType], added = 0, skipped = 0;
      parsed.records.forEach(function (r) {
        var text = String(r[tcol] == null ? '' : r[tcol]).trim();
        if (hcol && r[hcol]) text = String(r[hcol]).trim() + '. ' + text;
        if (text.length < 3 || list.length >= MAX_ROWS) { skipped++; return; }
        var label = constant !== null ? constant : (fake[String(r[lsel] == null ? '' : r[lsel]).trim()] ? 1 : 0);
        list.push({ text: text.slice(0, 3000), label: label, rating: rcol ? (+r[rcol] || undefined) : undefined });
        added++;
      });
      TL.toast(added.toLocaleString() + ' rows added' + (skipped ? ' · ' + skipped.toLocaleString() + ' skipped' : ''));
      renderStaged();
    });

    function renderStaged() {
      var a = staged[trainType], f = a.filter(function (r) { return r.label; }).length;
      $('#staged').innerHTML = a.length
        ? '<div class="staged-num"><b>' + a.length.toLocaleString() + '</b> rows ready for the ' + (trainType === 'news' ? 'news' : 'review') + ' model</div>' +
          '<div class="stackbar" aria-hidden="true"><span style="background:var(--bad);flex-grow:' + f + '"></span><span style="background:var(--good);flex-grow:' + (a.length - f) + '"></span></div>' +
          '<div class="legend"><span><i style="background:var(--bad)"></i>' + f.toLocaleString() + ' fake</span><span><i style="background:var(--good)"></i>' + (a.length - f).toLocaleString() + ' real</span></div>'
        : '<p class="muted small">No rows added yet. Choose a file, map its columns, then add the rows. You can add several files, for example one of fake and one of real articles.</p>';
      $('#train-btn').disabled = a.length < 10;
      $('#clear-staged').disabled = !a.length;
    }
    $('#clear-staged').addEventListener('click', function () { staged[trainType] = []; renderStaged(); });

    $('#train-btn').addEventListener('click', function () {
      var btn = this, rows = staged[trainType], seed = $('#include-seed').checked;
      var f = rows.filter(function (r) { return r.label; }).length;
      if (!seed && (f < 3 || rows.length - f < 3)) { TL.toast('Without the built-in examples you need at least 3 fake and 3 real rows.', 'error'); return; }
      // keep the upload under the server's 60 MB request limit
      var chars = rows.reduce(function (n, r) { return n + r.text.length; }, 0);
      var cap = chars > 45e6 ? Math.floor(45e6 / rows.length) : 3000;
      var payload = cap < 3000 ? rows.map(function (r) { return { text: r.text.slice(0, cap), label: r.label, rating: r.rating }; }) : rows;
      var prog = $('#train-progress'), bar = $('.progress', prog), stage = $('#train-stage'), onServer = TL.api.status().backend === 'server';
      btn.disabled = true; prog.hidden = false; $('#train-result').innerHTML = '';
      bar.classList.toggle('indeterminate', onServer);
      bar.firstElementChild.style.width = onServer ? '' : '4%';
      stage.textContent = onServer ? 'Training ' + rows.length.toLocaleString() + ' rows on the Node.js backend…' : 'Starting…';
      var t0 = performance.now();
      TL.api.train(trainType, payload, seed, function (p) { bar.firstElementChild.style.width = Math.round(p.pct * 100) + '%'; stage.textContent = p.stage + '…'; })
        .then(function (d) {
          staged[trainType] = []; renderStaged();
          var M = d.metrics;
          $('#train-result').innerHTML = '<div class="notice notice-good">' + TL.icon('checkcircle') + '<span>Trained the ' + NAMES[d.type].toLowerCase() + ' on <b>' + d.samples.toLocaleString() +
            '</b> examples in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s. Cross-validated accuracy <b>' + pc(M.ensemble.accuracy) + '%</b>, AUC ' + M.ensemble.auc.toFixed(2) +
            (M.rules ? ' (rule engine alone: ' + pc(M.rules.accuracy) + '%)' : '') + '.</span></div>';
          TL.toast('Model trained');
          return load();
        }, function (e) { TL.toast(e.message || 'Training failed', 'error'); })
        .then(function () { prog.hidden = true; bar.classList.remove('indeterminate'); btn.disabled = staged[trainType].length < 10; });
    });

    var origin = /^https?:$/.test(location.protocol) ? location.origin : 'http://localhost:5510';
    $$('[data-origin]').forEach(function (el) { el.textContent = origin; });
    applyType();
    TL.api.init().then(load, function (e) { showStatus({ label: 'Engine unavailable' }); $('#eng-desc').textContent = e.message; });
    window.addEventListener('tl:engine', function (e) { showStatus(e.detail); });
  }

  /* ---------------- Router ---------------- */
  function init() {
    var page = document.body.getAttribute('data-page');
    var map = { home: home, news: newsPage, review: reviewPage, result: resultPage, history: historyPage, verified: verifiedPage, dashboard: dashboardPage, settings: settingsPage, model: modelPage };
    if (map[page]) map[page]();
    initFlips(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
