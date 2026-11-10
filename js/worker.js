/* ==========================================================================
   TruthLens AI — In-browser backend (Web Worker)
   Runs the analysis engine and ML models off the main thread, so training
   and analysis never freeze the page. Used when the Node.js backend is not
   available (or when Settings → Analysis engine is "Browser only").
   Protocol:  { id, cmd, payload }  →  { id, ok, data | error } / { id, progress }
   ========================================================================== */
/* global importScripts */
importScripts('analyzer.js', 'ml.js', 'dataset.js', 'engine.js');

self.onmessage = function (e) {
  var msg = e.data || {}, id = msg.id, payload = msg.payload || {};
  try {
    if (msg.cmd === 'init') payload.backend = 'worker';
    if (msg.cmd === 'train') payload.onProgress = function (stage, pct) { self.postMessage({ id: id, progress: { stage: stage, pct: pct } }); };
    self.postMessage({ id: id, ok: true, data: self.TL.engine.call(msg.cmd, payload) });
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: (err && err.message) || String(err), status: err && err.status });
  }
};
