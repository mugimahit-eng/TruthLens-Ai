#!/usr/bin/env node
/* ==========================================================================
   TruthLens AI — Node.js backend (zero dependencies)
   - Serves the website (gzip + ETag caching)
   - REST API for analysis, batch analysis, feedback learning and training
   - Runs the same engine code as the browser (js/analyzer, ml, dataset, engine)
   - Persists user feedback and custom-trained models in ./data
   Start:  node server.js        (PORT and HOST environment variables optional)
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 5510;
const HOST = process.env.HOST || '127.0.0.1';
const LIMITS = { default: 1 << 20, train: 60 << 20 };   // request body limits: 1 MB, 60 MB for /api/train

['analyzer', 'ml', 'dataset', 'engine'].forEach((f) => require(path.join(ROOT, 'js', f + '.js')));
const engine = globalThis.TL.engine;

/* ---------------- Persistence ---------------- */
const FILES = { feedback: path.join(DATA, 'feedback.json'), news: path.join(DATA, 'model-news.json'), review: path.join(DATA, 'model-review.json') };
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') console.warn('! Could not read ' + path.relative(ROOT, file) + ': ' + e.message); return null; }
}
function writeJSON(file, value) {
  fs.mkdirSync(DATA, { recursive: true });
  if (value == null) { fs.rmSync(file, { force: true }); return; }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}
let saveTimer = null;
function persist() {                 // debounced: bursts of feedback cause one write
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const s = engine.exportState({ compact: false });
      writeJSON(FILES.feedback, s.feedback);
      writeJSON(FILES.news, s.custom.news);
      writeJSON(FILES.review, s.custom.review);
    } catch (e) { console.error('! Saving model state failed: ' + e.message); }
  }, 250);
}

/* ---------------- HTTP helpers ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.csv': 'text/csv; charset=utf-8'
};
const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' };

function sendJSON(req, res, status, obj) {
  let body = Buffer.from(JSON.stringify(obj));
  const headers = Object.assign({ 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }, BASE_HEADERS);
  if (body.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Request body too large (limit ' + Math.round(limit / 1048576) + ' MB)'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(Object.assign(new Error('Body must be valid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

/* ---------------- API routes ---------------- */
const pick = (b, keys) => keys.reduce((o, k) => { if (b[k] !== undefined) o[k] = b[k]; return o; }, {});
const NEWS_FIELDS = ['mode', 'title', 'text', 'url'], REVIEW_FIELDS = ['product', 'category', 'rating', 'verified', 'text'];
const ROUTES = {
  'GET /api/health': () => Object.assign(engine.health(), { server: 'node ' + process.version, uptimeSec: Math.round(process.uptime()) }),
  'GET /api/model': () => engine.info(),
  'POST /api/analyze': (b) => engine.analyze(b),
  'POST /api/analyze/news': (b) => engine.analyze({ type: 'news', input: b.input || pick(b, NEWS_FIELDS), sensitivity: b.sensitivity, useML: b.useML }),
  'POST /api/analyze/review': (b) => engine.analyze({ type: 'review', input: b.input || pick(b, REVIEW_FIELDS), sensitivity: b.sensitivity, useML: b.useML }),
  'POST /api/analyze/batch': (b) => engine.batch(b),
  'POST /api/feedback': (b) => { const r = engine.feedback(b); persist(); return r; },
  'POST /api/train': (b) => { const r = engine.train(b); persist(); return r; },
  'POST /api/reset': (b) => { const r = engine.reset(b); persist(); return r; }
};

async function handleApi(req, res, pathname) {
  const route = ROUTES[req.method + ' ' + pathname.replace(/\/+$/, '')];
  if (!route) return sendJSON(req, res, ROUTES['GET ' + pathname] || ROUTES['POST ' + pathname] ? 405 : 404, { error: 'No API route for ' + req.method + ' ' + pathname });
  if (req.method === 'POST' && !/application\/json/i.test(req.headers['content-type'] || '')) return sendJSON(req, res, 415, { error: 'Send JSON with Content-Type: application/json' });
  const body = req.method === 'POST' ? await readBody(req, pathname === '/api/train' ? LIMITS.train : LIMITS.default) : {};
  sendJSON(req, res, 200, route(body));
}

/* ---------------- Static files ---------------- */
const gzCache = new Map();   // path → { etag, gz }
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, BASE_HEADERS); return res.end(); }
  let rel = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(ROOT, rel));
  const relParts = path.relative(ROOT, file).split(path.sep);
  // never serve outside the project, dotfiles (.git, .claude) or the private data folder
  if (relParts[0] === '..' || path.isAbsolute(path.relative(ROOT, file)) || relParts.some((p) => p.startsWith('.')) || relParts[0] === 'data' || relParts[0] === 'node_modules') {
    return notFound(res);
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const ext = path.extname(file).toLowerCase();
    const etag = 'W/"' + st.size.toString(36) + '-' + Math.floor(st.mtimeMs).toString(36) + '"';
    const headers = Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag }, BASE_HEADERS);
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    const compressible = /^(text\/|application\/json|image\/svg)/.test(headers['Content-Type']);
    const wantsGzip = compressible && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    fs.readFile(file, (e2, buf) => {
      if (e2) return notFound(res);
      if (wantsGzip) {
        let c = gzCache.get(file);
        if (!c || c.etag !== etag) { c = { etag, gz: zlib.gzipSync(buf, { level: 6 }) }; gzCache.set(file, c); }
        buf = c.gz; headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
      }
      headers['Content-Length'] = buf.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
  });
}
function notFound(res) {
  res.writeHead(404, Object.assign({ 'Content-Type': MIME['.html'] }, BASE_HEADERS));
  res.end('<!doctype html><meta charset="utf-8"><title>Not found · TruthLens AI</title><body style="font-family:system-ui;background:#05070f;color:#e9edfb;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center"><h1>404</h1><p>This page does not exist.</p><p><a style="color:#6d8cff" href="/">Back to TruthLens AI</a></p></div>');
}

/* ---------------- Server ---------------- */
const server = http.createServer(async (req, res) => {
  const t0 = process.hrtime.bigint();
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (e) { res.writeHead(400, BASE_HEADERS); return res.end('Bad request'); }
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  res.on('finish', () => {
    if (!isApi) return;
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(req.method.padEnd(5) + pathname.padEnd(22) + res.statusCode + '  ' + ms.toFixed(1) + ' ms');
  });
  if (!isApi) return serveStatic(req, res, pathname);
  try { await handleApi(req, res, pathname); }
  catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    if (!res.headersSent) sendJSON(req, res, status, { error: e.message || 'Internal error' });
  }
});

function start() {
  const t0 = Date.now();
  const custom = { news: readJSON(FILES.news), review: readJSON(FILES.review) };
  const h = engine.init({ backend: 'server', feedback: readJSON(FILES.feedback) || {}, custom });
  const m = h.models, fmt = (x) => x.samples + ' samples, ' + Math.round(x.accuracy * 100) + '% CV accuracy' + (x.custom ? ' (custom)' : '');
  server.listen(PORT, HOST, () => {
    const url = 'http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT;
    console.log('\n  TruthLens AI backend ready in ' + (Date.now() - t0) + ' ms');
    console.log('  Website      ' + url);
    console.log('  API          ' + url + '/api/health');
    console.log('  News model   ' + fmt(m.news));
    console.log('  Review model ' + fmt(m.review) + '\n');
  });
}
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error('! Port ' + PORT + ' is already in use. Stop the other server or run with PORT=5511 node server.js');
  else console.error(e);
  process.exit(1);
});
process.on('SIGINT', () => { clearTimeout(saveTimer); try { const s = engine.exportState(); writeJSON(FILES.feedback, s.feedback); writeJSON(FILES.news, s.custom.news); writeJSON(FILES.review, s.custom.review); } catch (e) { /* ignore */ } process.exit(0); });

start();
