/* ==========================================================================
   TruthLens AI — Detection engine
   An explainable NLP scoring model that runs fully in the browser.
   Each detector extracts linguistic features, turns them into risk
   "signals" (0–100), combines them with weights, and maps the result to a
   fake-likelihood probability with a logistic function.
   ========================================================================== */
(function () {
  'use strict';
  var TL = (window.TL = window.TL || {});

  /* ---------------- Lexicons ---------------- */
  var NEWS = {
    sensational: ['shocking', 'shocked', "you won't believe", 'you will not believe', 'unbelievable', 'bombshell', 'explosive', 'jaw-dropping', 'mind-blowing',
      'exposed', 'exposes', 'secret', 'secrets', "don't want you to know", 'do not want you to know', 'hidden truth', 'the truth about', 'miracle', 'epic',
      'stunning', 'scandal', 'must see', 'must watch', 'gone viral', 'what happens next', 'will shock you', 'leaked', 'banned', 'censored', 'cover-up',
      'cover up', 'hoax', 'wake up', 'sheeple', 'mainstream media', 'deep state', 'new world order', 'illuminati', 'big pharma', 'doctors hate',
      'one weird trick', 'slams', 'obliterates', 'destroys', 'urgent', 'breaking!!!', 'insane'],
    emotional: ['outrage', 'outraged', 'outrageous', 'disgusting', 'disgrace', 'evil', 'terrifying', 'horrifying', 'horrific', 'furious', 'fury', 'panic',
      'chaos', 'catastrophe', 'nightmare', 'betrayal', 'traitor', 'traitors', 'corrupt', 'lies', 'liar', 'liars', 'war on', 'deadly', 'killer', 'poison',
      'poisoning', 'toxic', 'scary', 'shameful', 'pathetic', 'idiot', 'idiots', 'stupid', 'crazy', 'destroy', 'hate'],
    vague: ['sources say', 'source says', 'insiders say', 'an insider', 'anonymous source', 'many people are saying', 'people are saying', 'some experts',
      'experts claim', 'it is rumored', 'rumour has it', 'rumor has it', 'a friend of mine', 'my cousin', 'i heard', 'word is', 'they say', 'some say',
      'according to sources', 'unnamed sources', 'it is believed', 'secret documents'],
    share: ['share this', 'share before', 'share now', 'forward this', 'forward to', 'spread the word', 'tell everyone', "before it's deleted",
      'before it is deleted', 'before they delete', 'copy and paste', 'send this to', 'make this viral', 'everyone needs to see', 'pass it on', 'share with everyone'],
    absolute: ['100%', '100 percent', 'guaranteed', 'undeniable', 'everyone knows', 'no one is talking', 'nobody is talking', 'instantly', 'overnight',
      'completely cured', 'totally', 'absolutely', 'proven fact', 'cure', 'cures', 'cured'],
    health: ['miracle cure', 'cures cancer', 'cure cancer', 'cures covid', 'kills the virus', 'kills coronavirus', 'detox', 'natural remedy', 'doctors are hiding',
      'vaccine kills', 'vaccines cause', 'microchip', '5g', 'reverse aging', 'home remedy', 'lose weight fast', 'lemon water'],
    credible: ['according to', 'said in a statement', 'told reporters', 'press release', 'official statement', 'spokesperson', 'spokesman', 'spokeswoman',
      'published in', 'study published', 'peer-reviewed', 'peer reviewed', 'journal', 'researchers', 'data from', 'survey', 'report by', 'reported by',
      'confirmed by', 'ministry', 'department', 'university', 'professor', 'percent', 'per cent', 'statistics', 'census', 'audit', 'officials said',
      'police said', 'court', 'reuters', 'associated press', 'press trust of india', 'pti', 'announced', 'estimated', 'analysis']
  };

  var REVIEW = {
    hype: ['best ever', 'best product', 'best purchase', 'amazing', 'awesome', 'perfect', 'excellent', 'fantastic', 'incredible', 'outstanding', 'superb',
      'wonderful', 'phenomenal', 'life changing', 'life-changing', 'changed my life', 'game changer', 'game-changer', 'must buy', 'must-buy', 'must have',
      'must-have', 'highly recommend', 'highly recommended', '10/10', 'five stars', '5 stars', 'love it', 'loved it', 'love this', 'greatest', 'flawless',
      'exceeded my expectations', 'beyond expectations', 'worth every penny', 'mind blowing', 'blown away', 'top notch', 'top-notch', 'best', 'wow'],
    negExtreme: ['worst', 'terrible', 'horrible', 'awful', 'garbage', 'trash', 'scam', 'fraud', 'useless', 'waste of money', 'disgusting', 'pathetic',
      'never buy', 'do not buy', "don't buy", 'rubbish', 'fake product', 'total waste', 'stay away'],
    promo: ['buy now', 'order now', 'click here', 'visit our', 'visit my', 'use code', 'coupon', 'discount code', 'promo code', 'limited offer',
      'limited time', 'link in bio', 'dm me', 'whatsapp', 'official store', 'check out my', 'follow me', 'for discount', 'contact us'],
    incentive: ['received this product free', 'received it for free', 'got it for free', 'free in exchange', 'in exchange for', 'for my honest review',
      'for an honest review', 'gifted', 'sponsored', 'complimentary', 'free sample'],
    balance: ['but', 'however', 'although', 'though', 'except', 'only issue', 'only problem', 'downside', 'drawback', 'cons', 'pros', 'on the other hand',
      'could be better', 'wish it', 'would be nice', 'a bit', 'a little', 'not perfect', 'slightly', 'struggles', 'clunky', 'minor'],
    usage: ['after using', 'been using', 'using it for', 'used it for', 'for a week', 'weeks', 'months', 'a month', 'a year', 'daily', 'every day', 'so far',
      'at first', 'after a while', 'update:', 'commute', 'returned', 'second one', 'replacement'],
    features: ['battery', 'screen', 'display', 'size', 'fit', 'quality', 'material', 'fabric', 'sound', 'camera', 'delivery', 'packaging', 'price',
      'weight', 'colour', 'color', 'charging', 'button', 'strap', 'taste', 'smell', 'texture', 'instructions', 'setup', 'install', 'customer service',
      'warranty', 'refund', 'software', 'app', 'speed', 'performance', 'comfort', 'durable', 'stitching', 'zip', 'sole', 'lens', 'storage', 'ram',
      'processor', 'speaker', 'bass', 'noise cancellation', 'noise', 'cable', 'charger', 'portion', 'flavour', 'flavor', 'ingredients', 'skin',
      'hair', 'assembly', 'screws', 'manual', 'wifi', 'bluetooth', 'pairing', 'volume', 'brightness', 'resolution', 'grip', 'handle', 'cushions',
      'pages', 'binding', 'print', 'plot', 'chapters', 'seller', 'shipping']
  };

  var POSITIVE = ['good', 'great', 'nice', 'happy', 'love', 'like', 'pleased', 'satisfied', 'recommend', 'solid', 'comfortable', 'easy', 'works', 'fine', 'decent', 'glad'];
  var NEGATIVE = ['bad', 'poor', 'broken', 'broke', 'disappointed', 'disappointing', 'cheap', 'flimsy', 'hate', 'problem', 'issue', 'issues', 'slow', 'difficult', 'return', 'refund', 'defective', 'stopped'];
  var STOP = ('a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those i me my we our you your he she they them their ' +
    'so very too just not no do does did have has had will would can could should than then there here what which who when where how all any some more most such only own same also').split(' ');

  /* ---------------- Domains ---------------- */
  var CREDIBLE_DOMAINS = ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org', 'theguardian.com', 'nytimes.com', 'washingtonpost.com', 'wsj.com',
    'bloomberg.com', 'ft.com', 'economist.com', 'aljazeera.com', 'cnn.com', 'cbsnews.com', 'nbcnews.com', 'abcnews.go.com', 'thehindu.com', 'indianexpress.com',
    'hindustantimes.com', 'indiatimes.com', 'ndtv.com', 'livemint.com', 'scroll.in', 'deccanherald.com', 'pib.gov.in', 'who.int', 'cdc.gov', 'nasa.gov',
    'nature.com', 'science.org', 'un.org', 'snopes.com', 'politifact.com', 'factcheck.org', 'altnews.in', 'boomlive.in', 'fullfact.org', 'britannica.com'];
  var SATIRE_DOMAINS = ['theonion.com', 'babylonbee.com', 'thebeaverton.com', 'clickhole.com', 'newsthump.com', 'fauxy.com', 'thedailymash.co.uk', 'waterfordwhispersnews.com'];
  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc'];
  var RISKY_TLDS = ['xyz', 'buzz', 'top', 'click', 'info', 'club', 'online', 'site', 'icu', 'cyou', 'rest', 'monster', 'work', 'gq', 'tk', 'ml', 'cf', 'ga', 'live', 'win', 'loan'];
  var RISKY_HOST_WORDS = ['truth', 'patriot', 'viral', 'buzz', 'leak', 'expose', 'conspiracy', 'realnews', 'fakenews', 'clickbait', 'shocking', 'insider', 'freedom'];

  /* ---------------- Helpers ---------------- */
  function clamp(v, lo, hi) { lo = lo == null ? 0 : lo; hi = hi == null ? 100 : hi; return Math.max(lo, Math.min(hi, v)); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var reCache = {};
  function termRe(term) {
    if (!reCache[term]) {
      var startW = /^\w/.test(term), endW = /\w$/.test(term);
      reCache[term] = new RegExp((startW ? '\\b' : '') + escRe(term) + (endW ? '\\b' : ''), 'gi');
    }
    reCache[term].lastIndex = 0;
    return reCache[term];
  }
  function findTerms(text, list) {
    var hits = [], total = 0;
    list.forEach(function (t) {
      var m = text.match(termRe(t));
      if (m) { hits.push(t); total += m.length; }
    });
    return { terms: hits, count: total };
  }
  function words(text) { return (text.match(/[A-Za-zÀ-ɏ0-9']+/g) || []); }
  function sentences(text) { return text.split(/[.!?]+(?:\s|$)/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function capsWords(text) { return (text.match(/\b[A-Z]{3,}\b/g) || []).filter(function (w) { return !/^(USA|UK|WHO|CDC|NASA|FBI|CIA|BBC|CNN|PTI|ANI|AI|COVID|UN|EU|GDP|RBI|ISRO|IPL|CEO|DNA|URL|PDF|USB|LED|HD|TV|OK)$/.test(w); }); }
  function count(re, text) { return (text.match(re) || []).length; }
  function uid() { return 'tl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function baseStats(text) {
    var w = words(text), s = sentences(text);
    return {
      words: w.length,
      sentences: s.length,
      avgSentence: s.length ? Math.round((w.length / s.length) * 10) / 10 : 0,
      exclamations: count(/!/g, text),
      multiPunct: count(/[!?]{2,}/g, text),
      capsWords: capsWords(text).length,
      numbers: count(/\b\d[\d,.:%/]*\b/g, text),
      quotes: count(/["“][^"”]{12,}["”]/g, text),
      emojis: count(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, text),
      urls: count(/(https?:\/\/|www\.)\S+/gi, text),
      readingTime: Math.max(1, Math.round(w.length / 200))
    };
  }

  // Logistic mapping from weighted risk (0–100) to probability (0–100).
  function logistic(x, center, scale) { return 100 / (1 + Math.exp(-(x - center) / scale)); }
  var CENTERS = { lenient: 42, balanced: 36, strict: 30 };

  function combine(signals, sensitivity) {
    var active = signals.filter(function (s) { return s.weight > 0; });
    var wSum = active.reduce(function (a, s) { return a + s.weight; }, 0) || 1;
    var weighted = active.reduce(function (a, s) { return a + s.risk * s.weight; }, 0) / wSum;
    var top = active.map(function (s) { return s.risk; }).sort(function (a, b) { return b - a; });
    var topTwo = top.length ? (top[0] + (top[1] || top[0])) / 2 : 0;
    var x = weighted * 0.75 + topTwo * 0.25;
    var p = logistic(x, CENTERS[sensitivity] || CENTERS.balanced, 10);
    return clamp(Math.round(p), 2, 98);
  }

  function confidenceFor(score, wordsCount) {
    var c = 55 + Math.abs(score - 50) * 0.85;
    if (wordsCount < 12) c *= 0.72;
    else if (wordsCount < 30) c *= 0.86;
    else if (wordsCount < 60) c *= 0.95;
    return clamp(Math.round(c), 35, 97);
  }

  function verdictFor(score, type) {
    if (score >= 65) return { key: 'fake', label: type === 'news' ? 'Likely Fake News' : 'Likely Fake Review' };
    if (score >= 40) return { key: 'suspicious', label: 'Suspicious — Verify' };
    return { key: 'genuine', label: type === 'news' ? 'Likely Real News' : 'Likely Genuine Review' };
  }

  /* ---------------- URL / domain analysis ---------------- */
  function analyzeUrl(raw) {
    var out = { provided: !!(raw && raw.trim()), valid: false, host: '', risk: 45, flags: [], positives: [], category: 'unknown' };
    if (!out.provided) return out;
    var u;
    try { u = new URL(/^[a-z]+:\/\//i.test(raw.trim()) ? raw.trim() : 'https://' + raw.trim()); }
    catch (e) { out.risk = 70; out.flags.push('The link is not a valid URL.'); return out; }
    out.valid = true;
    var host = u.hostname.toLowerCase().replace(/^www\./, '');
    out.host = host;
    var tld = host.split('.').pop();
    var matches = function (list) { return list.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; }); };
    var risk = 40;

    if (matches(CREDIBLE_DOMAINS)) { risk = 6; out.category = 'trusted'; out.positives.push(host + ' is on the list of established news / fact-check sources.'); }
    else if (/\.(gov|edu|gov\.in|nic\.in|ac\.in|gov\.uk|ac\.uk)$/.test(host)) { risk = 10; out.category = 'official'; out.positives.push('Official government or academic domain (.' + host.split('.').slice(-2).join('.') + ').'); }
    if (matches(SATIRE_DOMAINS)) { risk = 92; out.category = 'satire'; out.flags.push(host + ' is a known satire website — its stories are intentionally fictional.'); }
    if (matches(SHORTENERS)) { risk = Math.max(risk, 62); out.flags.push('Shortened link (' + host + ') hides the real destination.'); }
    if (out.category === 'unknown') {
      if (RISKY_TLDS.indexOf(tld) > -1) { risk += 22; out.flags.push('Uncommon domain ending ".' + tld + '" is frequently used by low-credibility sites.'); }
      if (/\.(com|co|net|org)\.[a-z]{2,3}$/.test(host) && !/\.(co|com|org|net)\.(in|uk|au|nz|za|jp|br)$/.test(host)) { risk += 28; out.flags.push('Look-alike domain pattern (e.g. "news.com.co") imitates a real outlet.'); }
      var hy = (host.match(/-/g) || []).length;
      if (hy >= 2) { risk += 10; out.flags.push('Domain contains many hyphens (' + hy + '), common in imitation sites.'); }
      if (/\d{2,}/.test(host.split('.')[0])) { risk += 8; out.flags.push('Domain name contains digit sequences.'); }
      RISKY_HOST_WORDS.forEach(function (w) { if (host.indexOf(w) > -1) { risk += 12; out.flags.push('Domain uses the sensational keyword "' + w + '".'); } });
      if (out.flags.length === 0) out.flags.push('Domain is not in our trusted-source list — verify the publisher independently.');
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) { risk += 25; out.flags.push('Link points to a raw IP address instead of a domain.'); }
    if (u.protocol === 'http:') { risk += 8; out.flags.push('Connection is not secure (http instead of https).'); }
    var path = decodeURIComponent(u.pathname + ' ' + u.search).toLowerCase().replace(/[-_/]+/g, ' ');
    var pathHits = findTerms(path, ['shocking', "you won't believe", 'you wont believe', 'miracle', 'exposed', 'secret', 'must see', 'leaked', 'hoax', 'truth']);
    if (pathHits.count) { risk += 10 * pathHits.count; out.flags.push('Clickbait words in the link: ' + pathHits.terms.join(', ') + '.'); }
    out.risk = clamp(Math.round(risk), 3, 97);
    return out;
  }

  /* ---------------- News detector ---------------- */
  function analyzeNews(input, opts) {
    opts = opts || {};
    var title = (input.title || '').trim();
    var body = (input.text || '').trim();
    var text = [title, body].filter(Boolean).join('. ');
    var lower = text.toLowerCase();
    var st = baseStats(text);
    var wc = Math.max(st.words, 1);

    var sens = findTerms(lower, NEWS.sensational);
    var emo = findTerms(lower, NEWS.emotional);
    var vag = findTerms(lower, NEWS.vague);
    var shr = findTerms(lower, NEWS.share);
    var abs = findTerms(lower, NEWS.absolute);
    var hlt = findTerms(lower, NEWS.health);
    var cred = findTerms(lower, NEWS.credible);
    var capsRatio = st.capsWords / wc;
    var domain = analyzeUrl(input.url || '');
    var hasText = st.words > 0;

    var signals = [
      { key: 'sensational', name: 'Sensational / clickbait language', weight: hasText ? 0.22 : 0,
        risk: clamp(sens.count * 15 + Math.min(st.exclamations, 6) * 4 + st.multiPunct * 8),
        desc: 'Hype words, conspiracy phrases and exaggerated punctuation.' },
      { key: 'emotional', name: 'Emotional manipulation', weight: hasText ? 0.14 : 0,
        risk: clamp(emo.count * 13 + (emo.count / wc) * 400),
        desc: 'Fear, anger and outrage words used to provoke instead of inform.' },
      { key: 'attribution', name: 'Missing source attribution', weight: hasText ? 0.18 : 0,
        risk: clamp((wc > 40 ? 72 : 55) - cred.count * 12 - st.quotes * 10 + vag.count * 16),
        desc: 'Does the text cite named people, institutions, data or studies?' },
      { key: 'style', name: 'Writing style anomalies', weight: hasText ? 0.12 : 0,
        risk: clamp(capsRatio * 320 + st.multiPunct * 12 + st.emojis * 6 + (st.avgSentence && st.avgSentence < 7 ? 12 : 0)),
        desc: 'ALL-CAPS shouting, repeated !!!/??? and fragmented sentences.' },
      { key: 'claims', name: 'Extraordinary / unverifiable claims', weight: hasText ? 0.2 : 0,
        risk: clamp(abs.count * 10 + hlt.count * 22 + shr.count * 26),
        desc: 'Miracle cures, absolute certainty and "share before it\'s deleted" pressure.' },
      { key: 'specificity', name: 'Lack of verifiable detail', weight: hasText ? 0.08 : 0,
        risk: clamp(64 - st.numbers * 7 - cred.count * 4 - (st.words > 80 ? 10 : 0)),
        desc: 'Real reporting usually includes dates, figures, places and names.' },
      { key: 'domain', name: 'Source / domain credibility', weight: domain.provided ? (hasText ? 0.18 : 1) : 0,
        risk: domain.risk,
        desc: domain.provided ? 'Reputation and structure of ' + (domain.host || 'the link') + '.' : 'No link provided.' }
    ];

    var score = combine(signals, opts.sensitivity);
    if (domain.category === 'satire') score = Math.max(score, 88);
    if (domain.category === 'trusted' && score > 30 && sens.count < 2) score = Math.round(score * 0.7);
    var v = verdictFor(score, 'news');

    // Reasons
    var reasons = [];
    if (sens.count) reasons.push({ kind: 'bad', title: 'Sensational or clickbait wording', detail: sens.count + ' hype/conspiracy phrase' + (sens.count > 1 ? 's' : '') + ' found. Reliable outlets rarely rely on this tone.', terms: sens.terms });
    if (shr.count) reasons.push({ kind: 'bad', title: 'Pressure to share quickly', detail: 'Urging readers to forward the story is a hallmark of viral misinformation.', terms: shr.terms });
    if (hlt.count) reasons.push({ kind: 'bad', title: 'Common health-misinformation pattern', detail: 'Claims about miracle cures or hidden medical truths are among the most frequently debunked topics.', terms: hlt.terms });
    if (vag.count) reasons.push({ kind: 'warn', title: 'Vague or anonymous sourcing', detail: 'Phrases like "sources say" cannot be checked by readers.', terms: vag.terms });
    if (emo.count >= 2) reasons.push({ kind: 'warn', title: 'Emotionally charged language', detail: emo.count + ' words designed to trigger fear or anger.', terms: emo.terms });
    if (abs.count >= 2) reasons.push({ kind: 'warn', title: 'Absolute certainty', detail: 'Words like "100%", "guaranteed" or "cure" overstate what evidence normally supports.', terms: abs.terms });
    if (st.multiPunct || capsRatio > 0.04) reasons.push({ kind: 'warn', title: 'Shouting style', detail: st.capsWords + ' ALL-CAPS word(s) and ' + st.multiPunct + ' repeated punctuation group(s) detected.', terms: capsWords(text).slice(0, 6) });
    if (hasText && cred.count === 0 && st.quotes === 0 && wc > 25) reasons.push({ kind: 'bad', title: 'No sources or quotes cited', detail: 'The text never says where its information comes from.', terms: [] });
    domain.flags.forEach(function (f) { reasons.push({ kind: domain.risk >= 60 ? 'bad' : 'warn', title: 'Link check', detail: f, terms: [] }); });
    if (cred.count >= 2) reasons.push({ kind: 'good', title: 'Cites sources and institutions', detail: cred.count + ' attribution markers such as named officials, studies or agencies.', terms: cred.terms.slice(0, 8) });
    if (st.quotes) reasons.push({ kind: 'good', title: 'Contains direct quotes', detail: st.quotes + ' quoted statement(s) that can be traced back to a speaker.', terms: [] });
    if (st.numbers >= 3) reasons.push({ kind: 'good', title: 'Specific, checkable details', detail: st.numbers + ' numbers, dates or figures make the claims verifiable.', terms: [] });
    domain.positives.forEach(function (p) { reasons.push({ kind: 'good', title: 'Trusted source', detail: p, terms: [] }); });
    if (hasText && st.words < 25) reasons.push({ kind: 'info', title: 'Short input', detail: 'Only ' + st.words + ' words were provided, so confidence is reduced. Paste the full article for a stronger result.', terms: [] });
    if (!hasText && domain.provided) reasons.push({ kind: 'info', title: 'Link-only analysis', detail: 'Only the URL was analysed. Paste the article text as well for content analysis.', terms: [] });
    if (!reasons.some(function (r) { return r.kind === 'bad' || r.kind === 'warn'; })) reasons.push({ kind: 'good', title: 'No major red flags', detail: 'The writing is neutral and does not match common misinformation patterns.', terms: [] });

    var highlights = []
      .concat(tag(sens.terms, 'bad', 'Sensational'), tag(emo.terms, 'bad', 'Emotional'), tag(vag.terms, 'bad', 'Vague source'),
        tag(shr.terms, 'bad', 'Share pressure'), tag(abs.terms, 'bad', 'Absolute claim'), tag(hlt.terms, 'bad', 'Health claim'),
        tag(cred.terms, 'good', 'Attribution'));

    return finish({
      type: 'news', mode: input.mode || 'text', input: { title: title, text: body, url: input.url || '' },
      title: title || (body ? body.slice(0, 80) : domain.host || 'News check'),
      score: score, verdict: v.key, verdictLabel: v.label,
      confidence: confidenceFor(score, hasText ? st.words : 20),
      signals: signals.filter(function (s) { return s.weight > 0; }).map(round), reasons: reasons, highlights: highlights,
      stats: st, domain: domain.provided ? domain : null
    });
  }

  /* ---------------- Review detector ---------------- */
  function analyzeReview(input, opts) {
    opts = opts || {};
    var text = (input.text || '').trim();
    var product = (input.product || '').trim();
    var rating = Number(input.rating) || 0;
    var lower = text.toLowerCase();
    var st = baseStats(text);
    var wc = Math.max(st.words, 1);
    var w = words(lower);

    var hype = findTerms(lower, REVIEW.hype);
    var neg = findTerms(lower, REVIEW.negExtreme);
    var promo = findTerms(lower, REVIEW.promo);
    var inc = findTerms(lower, REVIEW.incentive);
    var bal = findTerms(lower, REVIEW.balance);
    var use = findTerms(lower, REVIEW.usage);
    var feat = findTerms(lower, REVIEW.features);
    var pos = findTerms(lower, POSITIVE).count + hype.count;
    var ngv = findTerms(lower, NEGATIVE).count + neg.count;
    var polarity = (pos + ngv) ? (pos - ngv) / (pos + ngv) : 0;
    var firstPerson = w.filter(function (x) { return x === 'i' || x === 'me' || x === 'my' || x === 'mine' || x === 'myself'; }).length;
    var fpRatio = firstPerson / wc;
    var capsRatio = st.capsWords / wc;

    // repetition
    var freq = {};
    w.forEach(function (x) { if (x.length > 2 && STOP.indexOf(x) === -1) freq[x] = (freq[x] || 0) + 1; });
    var repeated = Object.keys(freq).filter(function (k) { return freq[k] >= 3; }).sort(function (a, b) { return freq[b] - freq[a]; });
    var maxFreq = repeated.length ? freq[repeated[0]] : 1;
    var bigrams = {}, repBigrams = 0;
    for (var i = 0; i < w.length - 1; i++) { var bg = w[i] + ' ' + w[i + 1]; bigrams[bg] = (bigrams[bg] || 0) + 1; if (bigrams[bg] === 2) repBigrams++; }
    var immediateRepeats = count(/\b(\w{3,})\s+\1\b/gi, text);
    var productMentions = product.length > 2 ? count(termRe(product.toLowerCase()), lower) : 0;

    // rating consistency
    var ratingRisk = 30, ratingNote = '';
    if (rating) {
      if (rating >= 4 && polarity < -0.3) { ratingRisk = 88; ratingNote = rating + '-star rating but the text is mostly negative.'; }
      else if (rating <= 2 && polarity > 0.3) { ratingRisk = 88; ratingNote = rating + '-star rating but the text is mostly positive.'; }
      else if ((rating === 5 || rating === 1) && (hype.count + neg.count) >= 3 && bal.count === 0) { ratingRisk = 62; ratingNote = 'Extreme ' + rating + '-star rating paired with one-sided, extreme wording.'; }
      else if (rating >= 2 && rating <= 4) ratingRisk = 14;
      else ratingRisk = 26;
    }
    if (input.verified === false) ratingRisk = clamp(ratingRisk + 14);

    var lengthRisk = st.words < 10 ? 78 : st.words < 25 ? 52 : st.words <= 250 ? 14 : (feat.count < 3 ? 44 : 20);

    var signals = [
      { key: 'sentiment', name: 'Extreme / one-sided sentiment', weight: 0.2,
        risk: clamp(hype.count * 11 + neg.count * 11 + Math.min(st.exclamations, 8) * 4 + ((hype.count + neg.count) >= 2 && bal.count === 0 ? 16 : 0) - bal.count * 6),
        desc: 'Over-the-top praise or rage without any nuance.' },
      { key: 'detail', name: 'Lack of product-specific detail', weight: 0.2,
        risk: clamp(82 - feat.count * 13 - st.numbers * 7 - use.count * 10),
        desc: 'Genuine reviewers mention features, usage time and concrete experiences.' },
      { key: 'repetition', name: 'Repetitive wording', weight: 0.12,
        risk: clamp((maxFreq - 2) * 14 + repBigrams * 10 + immediateRepeats * 18 + (productMentions > 2 ? (productMentions - 2) * 15 : 0)),
        desc: 'Repeated words, phrases or the product name stuffed into the text.' },
      { key: 'promo', name: 'Promotional / incentivised content', weight: 0.14,
        risk: clamp(promo.count * 30 + inc.count * 22 + st.urls * 35),
        desc: 'Discount codes, links, calls to buy, or reviews written in exchange for free products.' },
      { key: 'linguistic', name: 'Deceptive linguistic pattern', weight: 0.12,
        risk: clamp((fpRatio - 0.05) * 520 + capsRatio * 260 + st.emojis * 5 + st.multiPunct * 9),
        desc: 'Heavy first-person focus, shouting and emoji spam (patterns linked to opinion spam).' },
      { key: 'rating', name: 'Rating consistency & trust', weight: 0.12, risk: ratingRisk,
        desc: rating ? 'Does the ' + rating + '-star rating match the tone of the text?' : 'No star rating given.' },
      { key: 'length', name: 'Length profile', weight: 0.1, risk: lengthRisk,
        desc: 'Very short or padded reviews carry less information.' }
    ];

    var score = combine(signals, opts.sensitivity);
    var v = verdictFor(score, 'review');

    var reasons = [];
    if (hype.count >= 2) reasons.push({ kind: 'bad', title: 'Excessive hype', detail: hype.count + ' superlatives such as "amazing" or "must buy". Fake reviews over-praise to boost ratings.', terms: hype.terms });
    if (neg.count >= 2) reasons.push({ kind: 'bad', title: 'Extreme negativity', detail: 'Heavy use of words like "scam" or "worst" can indicate a competitor attack review.', terms: neg.terms });
    if (promo.count || st.urls) reasons.push({ kind: 'bad', title: 'Promotional content', detail: 'Links, codes or calls to buy do not belong in an honest review.', terms: promo.terms });
    if (inc.count) reasons.push({ kind: 'warn', title: 'Incentivised review', detail: 'The reviewer mentions receiving the product for free or in exchange for a review.', terms: inc.terms });
    if (ratingNote) reasons.push({ kind: ratingRisk > 70 ? 'bad' : 'warn', title: 'Rating mismatch', detail: ratingNote, terms: [] });
    if (feat.count === 0 && st.words > 8) reasons.push({ kind: 'warn', title: 'Generic, no product details', detail: 'The review never mentions a specific feature, so it could describe any product.', terms: [] });
    if (repeated.length || immediateRepeats) reasons.push({ kind: 'warn', title: 'Repetitive wording', detail: 'Repeated words/phrases suggest template or bot-written text.', terms: repeated.slice(0, 5) });
    if (productMentions > 2) reasons.push({ kind: 'warn', title: 'Product name stuffing', detail: 'The product name appears ' + productMentions + ' times, a common SEO trick in paid reviews.', terms: [product] });
    if (fpRatio > 0.1) reasons.push({ kind: 'warn', title: 'Self-focused language', detail: Math.round(fpRatio * 100) + '% of words are "I/me/my". Research on deceptive opinion spam links this to fabricated reviews.', terms: [] });
    if (st.multiPunct || capsRatio > 0.05) reasons.push({ kind: 'warn', title: 'Shouting style', detail: 'Repeated !!! or ALL-CAPS words detected.', terms: capsWords(text).slice(0, 5) });
    if (input.verified === false) reasons.push({ kind: 'info', title: 'Not a verified purchase', detail: 'Unverified reviews are more likely to be fake. Treat with extra caution.', terms: [] });
    if (input.verified === true) reasons.push({ kind: 'good', title: 'Verified purchase', detail: 'The platform reports the reviewer actually bought the item.', terms: [] });
    if (feat.count >= 2) reasons.push({ kind: 'good', title: 'Mentions specific features', detail: 'Talks about ' + feat.terms.slice(0, 5).join(', ') + ', which shows real experience.', terms: feat.terms.slice(0, 8) });
    if (bal.count >= 1) reasons.push({ kind: 'good', title: 'Balanced pros and cons', detail: 'Genuine reviewers usually mention at least one drawback or caveat.', terms: bal.terms.slice(0, 6) });
    if (use.count) reasons.push({ kind: 'good', title: 'Describes real usage', detail: 'References to time of use or context ("after 3 weeks", "on my commute").', terms: use.terms.slice(0, 6) });
    if (st.words < 12) reasons.push({ kind: 'info', title: 'Very short review', detail: 'Short reviews give the model little evidence, so confidence is reduced.', terms: [] });
    if (!reasons.some(function (r) { return r.kind === 'bad' || r.kind === 'warn'; })) reasons.push({ kind: 'good', title: 'No major red flags', detail: 'The review reads like a natural customer experience.', terms: [] });

    var highlights = []
      .concat(tag(hype.terms, 'bad', 'Hype'), tag(neg.terms, 'bad', 'Extreme negative'), tag(promo.terms, 'bad', 'Promotional'),
        tag(inc.terms, 'bad', 'Incentivised'), tag(feat.terms, 'good', 'Product detail'), tag(bal.terms, 'good', 'Balanced'),
        tag(use.terms, 'good', 'Real usage'));

    st.firstPersonPct = Math.round(fpRatio * 100);
    return finish({
      type: 'review', mode: 'review', input: { product: product, category: input.category || '', rating: rating, verified: input.verified, text: text },
      title: product ? product + ' review' : text.slice(0, 80),
      score: score, verdict: v.key, verdictLabel: v.label,
      confidence: confidenceFor(score, st.words),
      signals: signals.map(round), reasons: reasons, highlights: highlights, stats: st, domain: null
    });
  }

  function tag(terms, kind, cat) { return terms.map(function (t) { return { term: t, kind: kind, cat: cat }; }); }
  function round(s) { return { key: s.key, name: s.name, risk: Math.round(s.risk), weight: s.weight, desc: s.desc }; }
  function finish(r) {
    r.id = uid();
    r.createdAt = new Date().toISOString();
    r.summary = summaryFor(r);
    return r;
  }
  function summaryFor(r) {
    var flagged = r.signals.filter(function (s) { return s.risk >= 60; }).map(function (s) { return s.name.toLowerCase(); });
    var noun = r.type === 'news' ? 'This content' : 'This review';
    if (r.verdict === 'fake') return noun + ' shows strong signs of being fake' + (flagged.length ? ', mainly due to ' + flagged.slice(0, 2).join(' and ') : '') + '. Do not trust or share it without independent verification.';
    if (r.verdict === 'suspicious') return noun + ' has mixed signals' + (flagged.length ? ' — notably ' + flagged.slice(0, 2).join(' and ') : '') + '. Cross-check it with trusted sources before relying on it.';
    return noun + ' does not match common ' + (r.type === 'news' ? 'misinformation' : 'fake-review') + ' patterns and appears trustworthy, though no automated check is perfect.';
  }

  /* ---------------- Highlighting ---------------- */
  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function highlight(text, items) {
    if (!text) return '';
    var list = (items || []).slice().sort(function (a, b) { return b.term.length - a.term.length; });
    if (!list.length) return escapeHTML(text);
    var map = {};
    list.forEach(function (h) { if (!map[h.term.toLowerCase()]) map[h.term.toLowerCase()] = h; });
    var parts = Object.keys(map).sort(function (a, b) { return b.length - a.length; }).map(function (t) {
      return (/^\w/.test(t) ? '\\b' : '') + escRe(t) + (/\w$/.test(t) ? '\\b' : '');
    });
    var re = new RegExp(parts.join('|'), 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      var h = map[m[0].toLowerCase()] || { kind: 'bad', cat: 'Flag' };
      out += escapeHTML(text.slice(last, m.index)) + '<mark class="hl hl-' + h.kind + '" title="' + escapeHTML(h.cat) + '">' + escapeHTML(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + escapeHTML(text.slice(last));
  }

  TL.analyzer = { analyzeNews: analyzeNews, analyzeReview: analyzeReview, analyzeUrl: analyzeUrl, highlight: highlight, escapeHTML: escapeHTML };
})();
