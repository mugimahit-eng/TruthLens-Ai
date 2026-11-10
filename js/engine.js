/* ==========================================================================
   TruthLens AI — Analysis engine (rule engine + ML ensemble)
   One implementation shared by the Node.js backend (server.js), the
   in-browser Web Worker (js/worker.js) and the main-thread fallback.
   Responsibilities: train/load models, blend ML with the explainable
   rules, cache results, learn from feedback and train on uploaded data.
   ========================================================================== */
(function (G) {
  'use strict';
  var TL = (G.TL = G.TL || {});
  var A = TL.analyzer, ML = TL.ml, DS = TL.dataset;

  var VERSION = '2.0.0';
  var TYPES = ['news', 'review'];
  var SENS_SHIFT = { lenient: -0.5, balanced: 0, strict: 0.5 };
  var MAX_FEEDBACK = 300, CACHE_MAX = 300, MAX_TRAIN_ROWS = 50000, MAX_ROW_CHARS = 3000, MAX_BATCH = 500;
  var ALGORITHM = 'Stacked ensemble: Naive Bayes + Logistic Regression on hashed word and bigram features, combined with the rule engine by a logistic meta-learner';

  var state = {
    backend: 'browser', startedAt: Date.now(),
    models: { news: null, review: null }, stored: { news: null, review: null },
    feedback: { news: [], review: [] }, cache: new Map(),
    stats: { analyses: 0, cacheHits: 0, totalMs: 0 }
  };

  /* ---------------- Helpers ---------------- */
  function fail(msg, status) { var e = new Error(msg); e.status = status || 400; return e; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function str(v, max) { return String(v == null ? '' : v).slice(0, max); }
  function checkType(t) { if (t !== 'news' && t !== 'review') throw fail('type must be "news" or "review"'); return t; }
  function normLabel(v) {
    if (v === 1 || v === true || /^(1|fake|spam|deceptive|unreliable)$/i.test(String(v))) return 1;
    if (v === 0 || v === false || /^(0|real|genuine|truthful|reliable)$/i.test(String(v))) return 0;
    throw fail('label must be "fake" or "real"');
  }
  function sanitize(type, input) {
    input = input || {};
    if (type === 'news') return { mode: str(input.mode || 'text', 20), title: str(input.title, 600).trim(), text: str(input.text, 20000).trim(), url: str(input.url, 2000).trim() };
    var out = { product: str(input.product, 200).trim(), category: str(input.category, 80), rating: clamp(Math.round(+input.rating || 0), 0, 5), text: str(input.text, 20000).trim() };
    if (input.verified === true || input.verified === false) out.verified = input.verified;
    return out;
  }
  function mlText(type, input) { return type === 'news' ? [input.title, input.text].filter(Boolean).join('. ') : String(input.text || ''); }
  function wordCount(s) { return (String(s).match(/\S+/g) || []).length; }

  /* ---------------- Models ---------------- */
  function ruleScorer(type) {
    return function (row) {
      return type === 'news'
        ? A.analyzeNews({ text: row.text }, { sensitivity: 'balanced' }).score
        : A.analyzeReview({ text: row.text, rating: row.rating }, { sensitivity: 'balanced' }).score;
    };
  }
  function seedRows(type) { return DS[type].map(function (r) { return { text: r.text, label: r.label, rating: r.rating }; }); }
  function feedbackRows(type) { return state.feedback[type].map(function (r) { return { text: r.text, label: r.label, rating: r.rating, weight: 2 }; }); }

  function trainModel(type, rows, info, onProgress) {
    var m = ML.train(rows, { ruleScore: ruleScorer(type), onProgress: onProgress });
    m.type = type; m.seedVersion = DS.version; m.custom = !!info.custom; m.source = info.source;
    return m;
  }
  function model(type) {
    if (state.models[type]) return state.models[type];
    var stored = state.stored[type];
    if (stored) {
      try { state.models[type] = ML.deserialize(stored); return state.models[type]; }
      catch (e) { state.stored[type] = null; }
    }
    var fb = feedbackRows(type);
    state.models[type] = trainModel(type, seedRows(type).concat(fb), { custom: false, source: { seed: DS[type].length, custom: 0, feedback: fb.length } });
    return state.models[type];
  }
  function summary(type) {
    var m = model(type);
    return { version: m.version, samples: m.n, custom: !!m.custom, accuracy: m.metrics.ensemble.accuracy, f1: m.metrics.ensemble.f1, trainedAt: m.trainedAt };
  }
  function details(type) {
    var m = model(type);
    return { type: type, algorithm: ALGORITHM, custom: !!m.custom, version: m.version, trainedAt: m.trainedAt, trainMs: m.trainMs,
      samples: m.n, fake: m.pos, real: m.neg, source: m.source, feedback: state.feedback[type].length, features: m.nb.V, buckets: m.D,
      metrics: m.metrics, top: m.top, meta: m.meta };
  }

  /* ---------------- Blend ML with the rule engine ---------------- */
  function blend(type, r, m, input, sens) {
    var words = r.stats.words;
    if (words < 3) {
      r.ml = { skipped: true, reason: r.domain ? 'Link-only check: the ML text model needs article text, so only the link was scored.' : 'Too little text for the ML text model.' };
      return;
    }
    var pr = ML.predict(m, mlText(type, input), r.score);
    var pEns = ML.sigmoid(ML.logit(pr.p) + (SENS_SHIFT[sens] || 0));
    var alpha = Math.min(1, words / 8);                     // very short inputs lean on the rules
    var score = alpha * pEns * 100 + (1 - alpha) * r.score;
    var dom = r.domain;
    if (dom && dom.category === 'satire') score = Math.max(score, 88);
    else if (dom && (dom.category === 'trusted' || dom.category === 'official') && pr.pText < 0.8) score *= 0.75;
    else if (dom && dom.risk >= 70) score = Math.max(score, 45);

    r.ruleScore = r.score;
    r.score = clamp(Math.round(score), 2, 98);
    var v = A.verdictFor(r.score, type);
    r.verdict = v.key; r.verdictLabel = v.label;

    // confidence: distance from 50%, agreement between models, amount of text
    var comps = [pr.pNb, pr.pLr, pr.pRule].filter(function (x) { return x != null; });
    var spread = Math.max.apply(null, comps) - Math.min.apply(null, comps);
    var c = 50 + (Math.abs(r.score - 50) / 50) * 38 + (1 - spread) * 10;
    if (words < 12) c *= 0.75; else if (words < 30) c *= 0.88; else if (words < 60) c *= 0.96;
    r.confidence = clamp(Math.round(c), 35, 97);

    var mlRisk = Math.round(pr.pText * 100), acc = m.metrics.ensemble.accuracy;
    r.signals.unshift({ key: 'ml', name: 'Machine-learned language patterns', risk: mlRisk, weight: 0,
      desc: 'Naive Bayes + Logistic Regression trained on ' + m.n + ' labelled examples (' + pct(acc) + ' cross-validated accuracy).' });

    var label = function (x) { return x.label; };
    var reason;
    if (pr.pText >= 0.6) reason = { kind: 'bad', title: 'ML model: reads like ' + (type === 'news' ? 'fake news' : 'a fake review'),
      detail: 'The trained classifier gives ' + mlRisk + '% fake probability. These words and patterns pushed it towards fake.', terms: pr.fake.map(label) };
    else if (pr.pText <= 0.4) reason = { kind: 'good', title: 'ML model: reads like ' + (type === 'news' ? 'reliable reporting' : 'a genuine review'),
      detail: 'The trained classifier gives only ' + mlRisk + '% fake probability. These words and patterns pushed it towards real.', terms: pr.real.map(label) };
    else reason = { kind: 'info', title: 'ML model is undecided',
      detail: 'The trained classifier gives ' + mlRisk + '% fake probability, close to the middle, so the rule signals carry more weight.', terms: pr.fake.concat(pr.real).map(label).slice(0, 6) };
    r.reasons.unshift(reason);
    if (Math.abs(pr.pText - r.ruleScore / 100) >= 0.45) {
      r.reasons.splice(1, 0, { kind: 'info', title: 'Rules and ML disagree',
        detail: 'The keyword rules scored ' + r.ruleScore + '% and the ML model ' + mlRisk + '%. The meta-learner weighs each by how accurate it was in cross-validation.', terms: [] });
    }

    var mark = function (kind, cat) { return function (x) { if (x.term.charAt(0) !== '_' && x.term.indexOf('#') < 0) r.highlights.push({ term: x.term, kind: kind, cat: cat }); }; };
    pr.fake.forEach(mark('bad', 'ML: fake indicator'));
    pr.real.forEach(mark('good', 'ML: credibility indicator'));

    r.ml = {
      p: r4(pEns), pText: r4(pr.pText), pNb: r4(pr.pNb), pLr: r4(pr.pLr), pRule: pr.pRule == null ? null : r4(pr.pRule),
      influence: pr.influence, fake: pr.fake, real: pr.real,
      model: { version: m.version, samples: m.n, accuracy: acc, f1: m.metrics.ensemble.f1, auc: m.metrics.ensemble.auc, custom: !!m.custom, trainedAt: m.trainedAt }
    };
    r.summary = A.summaryFor(r);
  }

  /* ---------------- Public commands ---------------- */
  function analyze(p) {
    p = p || {};
    var t0 = ML.now(), type = checkType(p.type), input = sanitize(type, p.input);
    var sens = SENS_SHIFT.hasOwnProperty(p.sensitivity) ? p.sensitivity : 'balanced', useML = p.useML !== false;
    var m = useML ? model(type) : null;
    var key = type + '|' + sens + '|' + (m ? m.trainedAt + '#' + m.version : 'rules') + '|' + JSON.stringify(input);
    var hit = state.cache.get(key), r;
    if (hit) {
      state.cache.delete(key); state.cache.set(key, hit);   // refresh LRU position
      r = JSON.parse(hit);
      r.id = A.uid(); r.createdAt = new Date().toISOString();
      r.engine.cached = true; state.stats.cacheHits++;
    } else {
      r = type === 'news' ? A.analyzeNews(input, { sensitivity: sens }) : A.analyzeReview(input, { sensitivity: sens });
      if (m) blend(type, r, m, input, sens);
      else r.ml = { skipped: true, reason: 'Machine learning is turned off in Settings, so only the rule engine was used.' };
      r.engine = { version: VERSION, cached: false };
      state.cache.set(key, JSON.stringify(r));
      if (state.cache.size > CACHE_MAX) state.cache.delete(state.cache.keys().next().value);
    }
    r.engine.backend = state.backend;
    r.engine.ms = r2(ML.now() - t0);
    state.stats.analyses++; state.stats.totalMs += r.engine.ms;
    return r;
  }

  function batch(p) {
    p = p || {};
    var inputs = Array.isArray(p.inputs) ? p.inputs : [];
    if (!inputs.length) throw fail('inputs must be a non-empty array');
    if (inputs.length > MAX_BATCH) throw fail('At most ' + MAX_BATCH + ' inputs per batch');
    var t0 = ML.now();
    var results = inputs.map(function (input) {
      var r = analyze({ type: p.type, input: input, sensitivity: p.sensitivity, useML: p.useML });
      return { id: r.id, title: r.title, score: r.score, verdict: r.verdict, confidence: r.confidence, ruleScore: r.ruleScore, ml: r.ml && r.ml.pText, cached: r.engine.cached, ms: r.engine.ms };
    });
    var ms = ML.now() - t0;
    return { count: results.length, ms: r2(ms), perItemMs: r4(ms / results.length), perSecond: Math.round(results.length / Math.max(ms, 0.001) * 1000), backend: state.backend, results: results };
  }

  function feedback(p) {
    p = p || {};
    var type = checkType(p.type), label = normLabel(p.label), input = sanitize(type, p.input), text = mlText(type, input);
    if (wordCount(text) < 3) throw fail('There is not enough text in this check for the model to learn from.');
    var m = model(type);
    ML.learn(m, text, label, 2);
    m.source = m.source || {}; m.source.feedback = (m.source.feedback || 0) + 1;
    state.feedback[type].push({ text: text.slice(0, MAX_ROW_CHARS), label: label, rating: input.rating || undefined, at: new Date().toISOString() });
    if (state.feedback[type].length > MAX_FEEDBACK) state.feedback[type].shift();
    state.cache.clear();
    return { ok: true, type: type, label: label, learned: state.feedback[type].length, model: summary(type) };
  }

  function train(p) {
    p = p || {};
    var type = checkType(p.type);
    if (!Array.isArray(p.rows)) throw fail('rows must be an array of { text, label }');
    if (p.rows.length > MAX_TRAIN_ROWS) throw fail('At most ' + MAX_TRAIN_ROWS.toLocaleString() + ' rows per training run');
    var rows = [];
    p.rows.forEach(function (row) {
      if (!row) return;
      var text = String(row.text || '').trim(), label;
      if (text.length < 3) return;
      try { label = normLabel(row.label); } catch (e) { return; }
      rows.push({ text: text.slice(0, MAX_ROW_CHARS), label: label, rating: +row.rating || undefined });
    });
    if (rows.length < 10) throw fail('Need at least 10 usable rows with text and a fake/real label (got ' + rows.length + ').');
    var seed = p.includeSeed === false ? [] : seedRows(type), fb = feedbackRows(type);
    state.models[type] = trainModel(type, rows.concat(seed, fb), { custom: true, source: { seed: seed.length, custom: rows.length, feedback: fb.length } }, p.onProgress);
    state.stored[type] = null;
    state.cache.clear();
    return details(type);
  }

  function reset(p) {
    var type = checkType((p || {}).type);
    state.models[type] = null; state.stored[type] = null; state.feedback[type] = [];
    state.cache.clear();
    return details(type);
  }

  function info() {
    var s = state.stats;
    return { engine: VERSION, backend: state.backend, seedVersion: DS.version, uptimeSec: Math.round((Date.now() - state.startedAt) / 1000),
      stats: { analyses: s.analyses, cacheHits: s.cacheHits, avgMs: s.analyses ? r2(s.totalMs / s.analyses) : 0, cached: state.cache.size },
      news: details('news'), review: details('review') };
  }

  function health() {
    return { ok: true, name: 'TruthLens AI engine', engine: VERSION, backend: state.backend,
      models: { news: summary('news'), review: summary('review') } };
  }

  // Persistent state: user feedback rows + custom-trained models (base models are retrained on load)
  function exportState(p) {
    var compact = !!(p && p.compact), custom = {};
    TYPES.forEach(function (t) { var m = state.models[t]; custom[t] = m && m.custom ? ML.serialize(m, compact) : state.stored[t]; });
    return { feedback: { news: state.feedback.news.slice(), review: state.feedback.review.slice() }, custom: custom };
  }

  function init(p) {
    p = p || {};
    if (p.backend) state.backend = p.backend;
    TYPES.forEach(function (t) {
      state.feedback[t] = p.feedback && Array.isArray(p.feedback[t]) ? p.feedback[t].slice(-MAX_FEEDBACK) : [];
      state.stored[t] = p.custom && p.custom[t] && p.custom[t].custom ? p.custom[t] : null;
      state.models[t] = null;
    });
    state.cache.clear();
    if (p.warm !== false) TYPES.forEach(model);
    return health();
  }

  var COMMANDS = { init: init, analyze: analyze, batch: batch, feedback: feedback, train: train, reset: reset, info: info, health: health, exportState: exportState };
  function call(cmd, payload) {
    if (!COMMANDS.hasOwnProperty(cmd)) throw fail('Unknown command: ' + cmd, 404);
    return COMMANDS[cmd](payload || {});
  }

  TL.engine = { VERSION: VERSION, call: call, init: init, analyze: analyze, batch: batch, feedback: feedback, train: train, reset: reset,
    info: info, health: health, exportState: exportState };
  if (typeof module === 'object' && module.exports) module.exports = TL.engine;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
