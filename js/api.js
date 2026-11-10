/* ==========================================================================
   TruthLens AI — Engine client
   Picks the fastest available backend and exposes one promise-based API:
     1. Node.js backend  — when the site is served by server.js (/api/*)
     2. Web Worker       — js/worker.js, runs the engine off the main thread
     3. Main thread      — fallback for file:// pages, where workers are blocked
   In browser modes, feedback and custom-trained models are kept in
   localStorage so the model keeps what it learned between visits.
   ========================================================================== */
(function () {
  'use strict';
  var TL = (window.TL = window.TL || {});

  var KEYS = { feedback: 'tl_ml_feedback', custom: 'tl_ml_custom_' };
  var ROUTES = {
    health: ['GET', '/api/health'], info: ['GET', '/api/model'], analyze: ['POST', '/api/analyze'], batch: ['POST', '/api/analyze/batch'],
    feedback: ['POST', '/api/feedback'], train: ['POST', '/api/train'], reset: ['POST', '/api/reset']
  };
  var CHANGES_MODEL = { feedback: 1, train: 1, reset: 1 };
  var LABELS = { server: 'Node.js backend', worker: 'Web Worker', browser: 'Browser main thread' };
  var ENGINE_FILES = ['analyzer', 'ml', 'dataset', 'engine'];
  var AUTO_INIT = { home: 1, news: 1, review: 1, model: 1, settings: 1 };
  var state = { ready: null, backend: null, health: null, latency: null, worker: null, seq: 0, pending: {} };

  function settings() { return TL.getSettings ? TL.getSettings() : {}; }
  function now() { return performance.now(); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* ---------------- 1. Node.js backend ---------------- */
  function http(cmd, payload, timeout) {
    var r = ROUTES[cmd];
    if (!r) return Promise.reject(new Error('Not available on the server: ' + cmd));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl && timeout ? setTimeout(function () { ctrl.abort(); }, timeout) : 0;
    var opts = { method: r[0], cache: 'no-store', signal: ctrl ? ctrl.signal : undefined };
    if (r[0] === 'POST') { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(payload || {}); }
    return fetch(r[1], opts).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || 'Server error ' + res.status); e.status = res.status; throw e; }
        return data;
      });
    }, function () {
      clearTimeout(timer);
      var e = new Error('The TruthLens backend could not be reached'); e.network = true; throw e;
    });
  }
  function probeServer() {
    if (!/^https?:$/.test(location.protocol) || settings().engine === 'local') return Promise.reject(new Error('skip'));
    var t0 = now();
    return http('health', null, 1500).then(function (h) {
      if (!h || !h.ok || !h.models) throw new Error('Not a TruthLens backend');
      state.health = h; state.latency = round1(now() - t0);
      return 'server';
    });
  }

  /* ---------------- Persistence for browser modes ---------------- */
  function loadStored() {
    var fb = TL.store.get(KEYS.feedback, null) || {};
    return {
      feedback: { news: fb.news || [], review: fb.review || [] },
      custom: { news: TL.store.get(KEYS.custom + 'news', null), review: TL.store.get(KEYS.custom + 'review', null) }
    };
  }
  function saveStored() {
    var get = state.backend === 'worker' ? workerCall('exportState', { compact: true }) : Promise.resolve(TL.engine.exportState({ compact: true }));
    return get.then(function (s) {
      TL.store.set(KEYS.feedback, s.feedback);
      ['news', 'review'].forEach(function (t) {
        if (!s.custom[t]) { TL.store.remove(KEYS.custom + t); return; }
        if (!TL.store.set(KEYS.custom + t, s.custom[t]) && TL.toast) {
          TL.toast('The custom ' + t + ' model is too large to save in this browser. It works until you close the tab; run node server.js to keep it.', 'error');
        }
      });
    });
  }

  /* ---------------- 2. Web Worker ---------------- */
  function workerCall(cmd, payload, onProgress) {
    return new Promise(function (resolve, reject) {
      var id = ++state.seq;
      state.pending[id] = { resolve: resolve, reject: reject, onProgress: onProgress };
      state.worker.postMessage({ id: id, cmd: cmd, payload: payload || {} });
    });
  }
  function startWorker() {
    if (typeof Worker === 'undefined' || location.protocol === 'file:') return Promise.reject(new Error('Workers unavailable'));
    return new Promise(function (resolve, reject) {
      var w;
      try { w = new Worker('js/worker.js'); } catch (e) { reject(e); return; }
      var timer = setTimeout(function () { w.terminate(); reject(new Error('Worker did not start')); }, 10000);
      w.onmessage = function (e) {
        var m = e.data || {}, p = state.pending[m.id];
        if (!p) return;
        if (m.progress) { if (p.onProgress) p.onProgress(m.progress); return; }
        delete state.pending[m.id];
        if (m.ok) p.resolve(m.data);
        else { var err = new Error(m.error || 'Engine error'); err.status = m.status; p.reject(err); }
      };
      w.onerror = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        clearTimeout(timer);
        Object.keys(state.pending).forEach(function (id) { state.pending[id].reject(new Error('The analysis worker stopped')); delete state.pending[id]; });
        w.terminate();
        if (state.worker === w) { state.worker = null; if (state.backend === 'worker') state.ready = null; }
        reject(new Error('Worker failed to load'));
      };
      state.worker = w;
      workerCall('init', loadStored()).then(function (h) { clearTimeout(timer); state.health = h; resolve('worker'); }, function (e) { clearTimeout(timer); reject(e); });
    });
  }

  /* ---------------- 3. Main thread ---------------- */
  function loadScript(name) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'js/' + name + '.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load js/' + name + '.js')); };
      document.head.appendChild(s);
    });
  }
  function startInline() {
    return ENGINE_FILES.filter(function (f) { return !TL[f]; })
      .reduce(function (p, f) { return p.then(function () { return loadScript(f); }); }, Promise.resolve())
      .then(function () {
        var s = loadStored(); s.backend = 'browser';
        state.health = TL.engine.init(s);
        return 'browser';
      });
  }

  /* ---------------- Routing ---------------- */
  function local() { return startWorker().catch(startInline); }
  function init() {
    if (state.ready) return state.ready;
    state.ready = probeServer().catch(local).then(function (b) { state.backend = b; announce(); return b; });
    state.ready.catch(function () { state.ready = null; });
    return state.ready;
  }
  function restart() {
    if (state.worker) { state.worker.terminate(); state.worker = null; }
    state.ready = null; state.backend = null; state.health = null; state.latency = null;
    return init();
  }
  function call(cmd, payload, opts) {
    opts = opts || {};
    return init().then(function (b) {
      if (b === 'server') {
        return http(cmd, payload, opts.timeout || 30000).catch(function (err) {
          if (!err.network || opts.retried) throw err;
          // the backend went away mid-session: switch to the in-browser engine and retry once
          state.ready = local().then(function (nb) { state.backend = nb; announce(); return nb; });
          return call(cmd, payload, Object.assign({}, opts, { retried: true }));
        });
      }
      if (b === 'worker') return workerCall(cmd, payload, opts.onProgress);
      var p = Object.assign({}, payload);
      if (opts.onProgress) p.onProgress = function (stage, pct) { opts.onProgress({ stage: stage, pct: pct }); };
      return new Promise(function (resolve) { resolve(TL.engine.call(cmd, p)); });
    }).then(function (data) {
      if (CHANGES_MODEL[cmd] && state.backend !== 'server') return saveStored().then(function () { return data; });
      return data;
    });
  }

  /* ---------------- Page status ---------------- */
  function privacyText() {
    if (state.backend !== 'server') return 'Analysed in your browser. Your text never leaves your device.';
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return 'Analysed by your local TruthLens server. Your text stays on this computer.';
    return 'Analysed by the TruthLens server. Text is only stored if you send feedback.';
  }
  function announce() {
    var b = state.backend, h = state.health || {}, models = h.models || {};
    document.querySelectorAll('[data-engine-status]').forEach(function (el) {
      el.innerHTML = '<span class="dot"></span>' + TL.esc(el.getAttribute('data-engine-status') || 'Engine') + ' ready · ' + LABELS[b];
    });
    document.querySelectorAll('[data-engine-detail]').forEach(function (el) {
      var m = models[el.getAttribute('data-engine-detail')];
      if (m) el.textContent = '7 signals + ML ensemble · ' + m.samples + ' training examples · ' + Math.round(m.accuracy * 100) + '% CV accuracy';
    });
    document.querySelectorAll('[data-engine-privacy]').forEach(function (el) { el.innerHTML = TL.icon('lock') + ' ' + TL.esc(privacyText()); });
    window.dispatchEvent(new CustomEvent('tl:engine', { detail: status() }));
  }
  function status() { return { backend: state.backend, label: LABELS[state.backend] || 'Connecting…', latency: state.latency, health: state.health }; }

  /* ---------------- Public API ---------------- */
  TL.api = {
    init: init,
    restart: restart,
    status: status,
    label: function (b) { return LABELS[b] || b || ''; },
    analyze: function (type, input) {
      var s = settings(), t0 = now();
      return call('analyze', { type: type, input: input, sensitivity: s.sensitivity, useML: s.useML !== false }).then(function (r) {
        r.engine = r.engine || {};
        r.engine.roundTripMs = round1(now() - t0);
        return r;
      });
    },
    batch: function (type, inputs) {
      var s = settings(), t0 = now();
      return call('batch', { type: type, inputs: inputs, sensitivity: s.sensitivity, useML: s.useML !== false }).then(function (r) { r.roundTripMs = round1(now() - t0); return r; });
    },
    feedback: function (type, input, label) { return call('feedback', { type: type, input: input, label: label }); },
    info: function () { return call('info'); },
    train: function (type, rows, includeSeed, onProgress) { return call('train', { type: type, rows: rows, includeSeed: includeSeed }, { onProgress: onProgress, timeout: 600000 }); },
    reset: function (type) { return call('reset', { type: type }); }
  };

  function autoInit() {
    if (AUTO_INIT[document.body.getAttribute('data-page')]) setTimeout(init, 0);   // warm up so the first check is instant
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
})();
