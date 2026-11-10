/* ==========================================================================
   TruthLens AI — Machine-learning library (no dependencies)
   Hashed word + bigram features → Naive Bayes and Logistic Regression,
   stacked with the rule engine by a small meta-learner. Trained with
   stratified k-fold cross-validation so the reported metrics are honest.
   Runs unchanged in the browser, a Web Worker and the Node.js backend.
   ========================================================================== */
(function (G) {
  'use strict';
  var TL = (G.TL = G.TL || {});

  var FORMAT = 'truthlens-ml/1';
  var DEFAULT_D = 1 << 17;          // hashed feature space (131,072 buckets)
  var MAX_CHARS = 12000;            // longer inputs are truncated before featurising
  var TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;
  var ACRONYMS = /^(USA|UK|WHO|CDC|NASA|FBI|CIA|BBC|CNN|PTI|ANI|AI|COVID|UN|EU|GDP|RBI|ISRO|IPL|CEO|DNA|URL|PDF|USB|LED|HD|TV|OK|KYC|IMF|IEA|GPS|SUV|RAM|SSD|LCD|USD|INR|NHS|AIIMS|IIT|UPI)$/;
  var STOP = {};
  ('a an the and or but if of to in on at by for with from as is are was were be been it its this that these those ' +
    'i me my we our you your he she they them their so very too just not no do does did have has had will would can could ' +
    'should than then there here what which who when where how all any some more most such only also').split(' ').forEach(function (w) { STOP[w] = 1; });

  var PRETTY = {
    __excl: '“!” marks', __multi: 'repeated !!! / ???', __caps: 'ALL-CAPS words', __caps_hi: 'heavy ALL-CAPS', __q: 'question marks',
    __quote: 'direct quotes', __url: 'links', __emoji: 'emoji', __pct: 'percentages', __len_xs: 'very short text', __len_s: 'short text',
    __len_m: 'medium-length text', __len_l: 'long text', __len_xl: 'very long text', '#d1': 'single digits', '#d2': 'two-digit numbers',
    '#d3': 'three-digit numbers', '#d4': 'four-digit numbers / years', '#d5': 'large numbers'
  };

  /* ---------------- Helpers ---------------- */
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function sigmoid(z) { return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)); }
  function logit(p) { p = Math.min(0.995, Math.max(0.005, p)); return Math.log(p / (1 - p)); }
  function clampS(v, m) { return v > m ? m : v < -m ? -m : v; }
  function round(v, d) { var f = Math.pow(10, d); return Math.round(v * f) / f; }
  function hash(s) {                // FNV-1a, 32-bit
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {              // mulberry32, deterministic so metrics are reproducible
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function count(re, s) { var m = s.match(re); return m ? m.length : 0; }
  function prettyTerm(t) { return PRETTY[t] || t.replace(/#d\d/g, '‹num›'); }
  // worth showing to people: phrases, style tokens, number tokens, and non-stop-word words
  function displayable(t) { return t.indexOf(' ') > -1 || t.charAt(0) === '_' || t.charAt(0) === '#' || (t.length > 2 && !STOP[t]); }

  /* ---------------- Features ---------------- */
  // Word unigrams + bigrams (numbers bucketed by length) and style tokens,
  // log(1 + tf) weighted, hashed into D buckets and L2-normalised.
  function featurize(text, D, termMap) {
    D = D || DEFAULT_D;
    var raw = String(text == null ? '' : text);
    if (raw.length > MAX_CHARS) raw = raw.slice(0, MAX_CHARS);
    var toks = raw.toLowerCase().match(TOKEN_RE) || [];
    var counts = new Map(), prev = null;
    var add = function (f, n) { counts.set(f, (counts.get(f) || 0) + n); };
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (/^\d+$/.test(t)) t = '#d' + Math.min(t.length, 5);
      add(t, 1);
      if (prev !== null) add(prev + ' ' + t, 1);
      prev = t;
    }
    var n = toks.length;
    var ex = count(/!/g, raw), mp = count(/[!?]{2,}/g, raw), q = count(/\?/g, raw);
    var caps = (raw.match(/\b[A-Z]{3,}\b/g) || []).filter(function (w) { return !ACRONYMS.test(w); }).length;
    if (ex) add('__excl', Math.min(ex, 8));
    if (mp) add('__multi', Math.min(mp, 6));
    if (q) add('__q', Math.min(q, 6));
    if (caps) add('__caps', Math.min(caps, 10));
    if (n && caps / n > 0.06) add('__caps_hi', 1);
    var quotes = count(/["“][^"”]{12,}["”]/g, raw); if (quotes) add('__quote', Math.min(quotes, 6));
    var urls = count(/(https?:\/\/|www\.)\S+/gi, raw); if (urls) add('__url', Math.min(urls, 4));
    var emoji = count(/\p{Extended_Pictographic}/gu, raw); if (emoji) add('__emoji', Math.min(emoji, 8));
    var pct = count(/\d\s?(%|percent\b|per cent\b)/gi, raw); if (pct) add('__pct', Math.min(pct, 6));
    add(n < 12 ? '__len_xs' : n < 30 ? '__len_s' : n < 80 ? '__len_m' : n < 200 ? '__len_l' : '__len_xl', 1);

    var buckets = new Map(), mask = D - 1;
    counts.forEach(function (c, f) {
      var j = hash(f) & mask, v = Math.log(1 + c), e = buckets.get(j);
      if (e) e.v += v; else buckets.set(j, { v: v, t: f });
      if (termMap && !termMap.has(j) && termMap.size < 300000) termMap.set(j, f);
    });
    var size = buckets.size, idx = new Int32Array(size), val = new Float32Array(size), terms = new Array(size), k = 0, norm = 0;
    buckets.forEach(function (e, j) { idx[k] = j; val[k] = e.v; terms[k] = e.t; norm += e.v * e.v; k++; });
    norm = Math.sqrt(norm) || 1;
    for (k = 0; k < size; k++) val[k] /= norm;
    return { i: idx, v: val, t: terms, n: n };
  }

  /* ---------------- Multinomial Naive Bayes (binarised) ---------------- */
  function nbNew(D) { return { D: D, alpha: 1, docs: [0, 0], tot: [0, 0], V: 0, c: [new Float32Array(D), new Float32Array(D)] }; }
  function nbAdd(nb, d, y, w) {
    var c = nb.c[y], o = nb.c[1 - y];
    for (var k = 0; k < d.i.length; k++) {
      var j = d.i[k];
      if (c[j] === 0 && o[j] === 0) nb.V++;
      c[j] += w;
    }
    nb.tot[y] += w * d.i.length;
    nb.docs[y] += w;
  }
  function nbFit(docs, ys, ws, idxs, D) {
    var nb = nbNew(D);
    for (var a = 0; a < idxs.length; a++) { var i = idxs[a]; nbAdd(nb, docs[i], ys[i], ws[i]); }
    return nb;
  }
  function nbLogit(nb, d) {
    var a = nb.alpha, c0 = nb.c[0], c1 = nb.c[1];
    var z = Math.log((nb.docs[1] + 1) / (nb.docs[0] + 1));
    var den = Math.log(nb.tot[0] + a * nb.V) - Math.log(nb.tot[1] + a * nb.V);
    for (var k = 0; k < d.i.length; k++) {
      var j = d.i[k];
      if (c0[j] === 0 && c1[j] === 0) continue;   // ignore unseen features
      z += Math.log(c1[j] + a) - Math.log(c0[j] + a) + den;
    }
    return z;
  }

  /* ---------------- Logistic Regression (AdaGrad, L2, class-balanced) ---------------- */
  function lrFit(docs, ys, ws, idxs, D, epochs, rand) {
    var w = new Float32Array(D), g2 = new Float32Array(D), b = 0, gb = 1e-8;
    var eta = 0.4, l2 = 1e-4, pos = 0;
    for (var a = 0; a < idxs.length; a++) pos += ys[idxs[a]];
    var n = idxs.length, cw = [n / (2 * Math.max(1, n - pos)), n / (2 * Math.max(1, pos))];
    var order = idxs.slice();
    for (var e = 0; e < epochs; e++) {
      shuffle(order, rand);
      for (var o = 0; o < order.length; o++) {
        var i = order[o], d = docs[i], y = ys[i], z = b;
        for (var k = 0; k < d.i.length; k++) z += w[d.i[k]] * d.v[k];
        var g = (sigmoid(z) - y) * cw[y] * ws[i];
        if (Math.abs(g) < 1e-6) continue;
        for (k = 0; k < d.i.length; k++) {
          var j = d.i[k], grad = g * d.v[k] + l2 * w[j];
          g2[j] += grad * grad;
          w[j] -= eta * grad / Math.sqrt(g2[j] + 1e-8);
        }
        gb += g * g; b -= eta * g / Math.sqrt(gb);
      }
    }
    return { w: w, b: b };
  }
  function lrLogit(lr, d) {
    var z = lr.b;
    for (var k = 0; k < d.i.length; k++) z += lr.w[d.i[k]] * d.v[k];
    return z;
  }

  /* ---------------- Small dense logistic fit (calibration + meta-learner) ---------------- */
  function fitLogistic(X, y, l2, iters) {
    var n = X.length, m = n ? X[0].length : 0, w = new Array(m).fill(0), b = 0;
    l2 = l2 == null ? 0.01 : l2; iters = iters || 400;
    if (!n) return { w: w, b: 0 };
    var pos = 0; for (var i = 0; i < n; i++) pos += y[i];
    var cw = [n / (2 * Math.max(1, n - pos)), n / (2 * Math.max(1, pos))];
    var lr = 0.5;
    for (var it = 0; it < iters; it++) {
      var gw = new Array(m).fill(0), gbias = 0;
      for (i = 0; i < n; i++) {
        var z = b, x = X[i];
        for (var k = 0; k < m; k++) z += w[k] * x[k];
        var g = (sigmoid(z) - y[i]) * cw[y[i]];
        for (k = 0; k < m; k++) gw[k] += g * x[k];
        gbias += g;
      }
      for (k = 0; k < m; k++) w[k] -= lr * (gw[k] / n + l2 * w[k]);
      b -= lr * gbias / n;
    }
    return { w: w.map(function (v) { return round(v, 5); }), b: round(b, 5) };
  }
  function applyLogistic(f, x) { var z = f.b; for (var k = 0; k < f.w.length; k++) z += f.w[k] * x[k]; return sigmoid(z); }

  // meta-learner inputs: scaled base-model logits (+ rule-engine logit)
  function metaX(zNb, zLr, zRule) { return [clampS(zNb, 20) / 10, clampS(zLr, 10) / 3, zRule == null ? 0 : clampS(zRule, 5) / 2]; }

  /* ---------------- Metrics ---------------- */
  function binMetrics(scores, ys, thr, idxs) {
    var tp = 0, fp = 0, tn = 0, fn = 0;
    idxs.forEach(function (i) {
      var p = scores[i] >= thr ? 1 : 0;
      if (p && ys[i]) tp++; else if (p) fp++; else if (ys[i]) fn++; else tn++;
    });
    var n = idxs.length || 1, prec = tp + fp ? tp / (tp + fp) : 0, rec = tp + fn ? tp / (tp + fn) : 0;
    return { n: idxs.length, tp: tp, fp: fp, tn: tn, fn: fn, accuracy: round((tp + tn) / n, 4), precision: round(prec, 4), recall: round(rec, 4),
      f1: round(prec + rec ? 2 * prec * rec / (prec + rec) : 0, 4), auc: auc(scores, ys, idxs) };
  }
  function auc(scores, ys, idxs) {     // probability a random fake example outranks a random real one
    var arr = idxs.map(function (i) { return [scores[i], ys[i]]; }).sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0, neg = 0, rankSum = 0, i = 0;
    while (i < arr.length) {
      var j = i; while (j + 1 < arr.length && arr[j + 1][0] === arr[i][0]) j++;
      var r = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) { if (arr[k][1]) { pos++; rankSum += r; } else neg++; }
      i = j + 1;
    }
    return pos && neg ? round((rankSum - pos * (pos + 1) / 2) / (pos * neg), 4) : 0;
  }

  function stratifiedFolds(ys, K, rand) {
    var fold = new Int32Array(ys.length), groups = [[], []];
    ys.forEach(function (y, i) { groups[y].push(i); });
    groups.forEach(function (g) { shuffle(g, rand).forEach(function (i, k) { fold[i] = k % K; }); });
    return fold;
  }

  /* ---------------- Training ---------------- */
  // rows: [{ text, label (1 = fake, 0 = real), weight? }]
  // opts: { ruleScore(row) → 0–100, D, seed, onProgress(stage, pct) }
  function train(rows, opts) {
    opts = opts || {};
    var t0 = now(), D = opts.D || DEFAULT_D, rand = rng(opts.seed || 1337);
    var progress = opts.onProgress || function () {};
    var n = rows.length, ys = new Int32Array(n), ws = new Float32Array(n), pos = 0;
    rows.forEach(function (r, i) { ys[i] = r.label ? 1 : 0; ws[i] = r.weight || 1; pos += ys[i]; });
    if (n < 10 || pos < 3 || n - pos < 3) throw new Error('Training needs at least 10 rows with 3 or more of each class (got ' + pos + ' fake, ' + (n - pos) + ' real).');

    progress('Extracting features', 0.05);
    var termMap = new Map(), docs = new Array(n);
    for (var i = 0; i < n; i++) docs[i] = featurize(rows[i].text, D, termMap);

    var K = Math.max(2, Math.min(n > 5000 ? 3 : 5, pos, n - pos));
    var epochs = n <= 500 ? 30 : n <= 2000 ? 15 : n <= 10000 ? 8 : 5;
    var fold = stratifiedFolds(Array.prototype.slice.call(ys), K, rand);
    var oofNb = new Float64Array(n), oofLr = new Float64Array(n), all = [];
    for (i = 0; i < n; i++) all.push(i);

    for (var f = 0; f < K; f++) {
      progress('Cross-validating (fold ' + (f + 1) + ' of ' + K + ')', 0.1 + 0.5 * f / K);
      var tr = all.filter(function (i) { return fold[i] !== f; }), te = all.filter(function (i) { return fold[i] === f; });
      var nb = nbFit(docs, ys, ws, tr, D), lr = lrFit(docs, ys, ws, tr, D, epochs, rand);
      te.forEach(function (i) { oofNb[i] = nbLogit(nb, docs[i]); oofLr[i] = lrLogit(lr, docs[i]); });
    }

    // Rule-engine scores (sampled on large datasets — the lexicon scan is the slow part)
    progress('Scoring with the rule engine', 0.62);
    var scored = n <= 1500 ? all.slice() : shuffle(all.slice(), rand).slice(0, 1500);
    var hasRules = typeof opts.ruleScore === 'function';
    var rule = new Float64Array(n), zRule = new Float64Array(n);
    scored.forEach(function (i) { rule[i] = hasRules ? opts.ruleScore(rows[i]) : 50; zRule[i] = logit(rule[i] / 100); });
    var X = function (i) { return metaX(oofNb[i], oofLr[i], hasRules ? zRule[i] : null); };

    // Nested evaluation of the stacked ensemble: meta-learner never sees its test fold
    progress('Fitting the meta-learner', 0.72);
    var ens = new Float64Array(n);
    for (f = 0; f < K; f++) {
      var mtr = scored.filter(function (i) { return fold[i] !== f; }), mte = scored.filter(function (i) { return fold[i] === f; });
      var mf = fitLogistic(mtr.map(X), mtr.map(function (i) { return ys[i]; }));
      mte.forEach(function (i) { ens[i] = applyLogistic(mf, X(i)); });
    }
    var meta = fitLogistic(scored.map(X), scored.map(function (i) { return ys[i]; }));
    var yAll = all.map(function (i) { return ys[i]; });
    var metaText = fitLogistic(all.map(function (i) { return X(i).slice(0, 2); }), yAll);
    // Platt scaling so each base model reports a calibrated probability, not NB's raw 0%/100%
    var platt = { nb: fitLogistic(all.map(function (i) { return [X(i)[0]]; }), yAll), lr: fitLogistic(all.map(function (i) { return [X(i)[1]]; }), yAll) };

    var ruleScores = new Float64Array(n); scored.forEach(function (i) { ruleScores[i] = rule[i] / 100; });
    var metrics = {
      folds: K, evaluated: scored.length,
      ensemble: binMetrics(ens, ys, 0.5, scored),
      nb: pick(binMetrics(oofNb, ys, 0, scored)),
      lr: pick(binMetrics(oofLr, ys, 0, scored)),
      rules: hasRules ? pick(binMetrics(ruleScores, ys, 0.5, scored)) : null
    };

    progress('Training the final model on all rows', 0.82);
    var finalNb = nbFit(docs, ys, ws, all, D), finalLr = lrFit(docs, ys, ws, all, D, epochs, rand);

    // Most influential n-grams (seen in 2+ documents)
    var ranked = [];
    termMap.forEach(function (term, j) { if (finalNb.c[0][j] + finalNb.c[1][j] >= 2 && displayable(term)) ranked.push([term, finalLr.w[j]]); });
    ranked.sort(function (a, b) { return b[1] - a[1]; });
    var top = {
      fake: ranked.slice(0, 15).filter(function (x) { return x[1] > 0; }).map(fmtTop),
      real: ranked.slice(-15).reverse().filter(function (x) { return x[1] < 0; }).map(fmtTop)
    };

    progress('Done', 1);
    return {
      format: FORMAT, D: D, version: 1, n: n, pos: pos, neg: n - pos,
      nb: finalNb, lr: finalLr, meta: meta, metaText: metaText, platt: platt, hasRules: hasRules,
      metrics: metrics, top: top, trainedAt: new Date().toISOString(), trainMs: Math.round(now() - t0)
    };
  }
  function pick(m) { return { accuracy: m.accuracy, f1: m.f1, auc: m.auc }; }
  function fmtTop(x) { return [prettyTerm(x[0]), round(x[1], 3)]; }

  /* ---------------- Prediction ---------------- */
  function predict(model, text, ruleScore) {
    var d = featurize(text, model.D);
    var zNb = nbLogit(model.nb, d), zLr = lrLogit(model.lr, d);
    var zRule = ruleScore == null ? null : logit(ruleScore / 100);
    var x = metaX(zNb, zLr, model.hasRules ? zRule : null);
    var contrib = [];
    for (var k = 0; k < d.i.length; k++) {
      var c = model.lr.w[d.i[k]] * d.v[k];
      if (Math.abs(c) > 0.01) contrib.push([d.t[k], c]);
    }
    contrib.sort(function (a, b) { return b[1] - a[1]; });
    var useful = function (x) { return x[0].charAt(0) !== '#' && displayable(x[0]); };
    var w = model.meta.w, share = [Math.abs(w[0] * x[0]), Math.abs(w[1] * x[1]), Math.abs((w[2] || 0) * x[2])];
    var tot = share[0] + share[1] + share[2] || 1;
    return {
      p: applyLogistic(model.meta, x),
      pText: applyLogistic(model.metaText, x.slice(0, 2)),
      pNb: applyLogistic(model.platt.nb, [x[0]]), pLr: applyLogistic(model.platt.lr, [x[1]]), pRule: ruleScore == null ? null : ruleScore / 100,
      influence: { nb: round(share[0] / tot, 3), lr: round(share[1] / tot, 3), rules: round(share[2] / tot, 3) },
      fake: contrib.filter(function (c) { return c[1] > 0 && useful(c); }).slice(0, 6).map(function (c) { return { term: c[0], label: prettyTerm(c[0]), w: round(c[1], 3) }; }),
      real: contrib.filter(function (c) { return c[1] < 0 && useful(c); }).reverse().slice(0, 6).map(function (c) { return { term: c[0], label: prettyTerm(c[0]), w: round(c[1], 3) }; }),
      tokens: d.n
    };
  }

  /* ---------------- Online learning from user feedback ---------------- */
  function learn(model, text, label, weight) {
    var d = featurize(text, model.D), y = label ? 1 : 0;
    weight = weight || 2;
    nbAdd(model.nb, d, y, weight);
    for (var s = 0; s < 4; s++) {           // a few SGD steps towards the corrected label
      var g = (sigmoid(lrLogit(model.lr, d)) - y) * weight;
      if (Math.abs(g) < 0.05) break;
      for (var k = 0; k < d.i.length; k++) model.lr.w[d.i[k]] -= 0.5 * g * d.v[k];
    }
    model.version = (model.version || 1) + 1;
    return model;
  }

  /* ---------------- Serialisation (sparse, delta-encoded) ---------------- */
  function packSparse(arr, decimals, minAbs) {
    var idx = [], val = [], last = 0;
    for (var j = 0; j < arr.length; j++) {
      var v = arr[j];
      if (v === 0 || Math.abs(v) < minAbs) continue;
      idx.push(j - last); last = j; val.push(round(v, decimals));
    }
    return { i: idx, v: val };
  }
  function unpackSparse(p, D) {
    var a = new Float32Array(D), j = 0;
    for (var k = 0; k < p.i.length; k++) { j += p.i[k]; a[j] = p.v[k]; }
    return a;
  }
  // compact: drops near-zero weights and single counts so large models fit in browser storage
  function serialize(model, compact) {
    var big = compact && model.n > 2000;
    var out = {};
    Object.keys(model).forEach(function (k) { if (k !== 'nb' && k !== 'lr') out[k] = model[k]; });
    out.nb = { alpha: model.nb.alpha, docs: model.nb.docs, tot: model.nb.tot, V: model.nb.V,
      c0: packSparse(model.nb.c[0], 2, big ? 1.5 : 0), c1: packSparse(model.nb.c[1], 2, big ? 1.5 : 0) };
    out.lr = { b: round(model.lr.b, 5), w: packSparse(model.lr.w, 4, compact ? (big ? 0.02 : 0.0005) : 0) };
    return out;
  }
  function deserialize(json) {
    if (!json || json.format !== FORMAT) throw new Error('Unsupported model format');
    var D = json.D, m = {};
    Object.keys(json).forEach(function (k) { if (k !== 'nb' && k !== 'lr') m[k] = json[k]; });
    m.nb = { D: D, alpha: json.nb.alpha, docs: json.nb.docs.slice(), tot: json.nb.tot.slice(), V: json.nb.V, c: [unpackSparse(json.nb.c0, D), unpackSparse(json.nb.c1, D)] };
    m.lr = { b: json.lr.b, w: unpackSparse(json.lr.w, D) };
    return m;
  }

  TL.ml = { FORMAT: FORMAT, DEFAULT_D: DEFAULT_D, featurize: featurize, train: train, predict: predict, learn: learn,
    serialize: serialize, deserialize: deserialize, prettyTerm: prettyTerm, sigmoid: sigmoid, logit: logit, now: now };
  if (typeof module === 'object' && module.exports) module.exports = TL.ml;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
