# TruthLens AI: Fake News & Fake Review Detector

A responsive website with 3D effects for detecting **fake news** and **fake product reviews**, built as a mini project. Detection combines an explainable rule engine with trained **machine-learning models**, served by a zero-dependency **Node.js backend**. Everything is plain HTML, CSS and JavaScript.

## Run it

- **Recommended (with the backend):** install [Node.js](https://nodejs.org/) 18 or newer, then in this folder run

  ```bash
  npm start
  ```

  and open http://localhost:5510. You can also run `node server.js` directly. Set `PORT=8080` to change the port, or `HOST=0.0.0.0` to open it to your network.
- **Without Node:** double-click `index.html`, or serve the folder with any static server such as VS Code **Live Server**. The same engine then runs inside your browser, in a background Web Worker when the page is served over http, or on the page itself for `file://`. Nothing else changes.

The WebGL scene loads Three.js from a CDN. Without internet a CSS 3D fallback is shown instead.

## Pages

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Explains the platform and gives quick access to detection |
| Fake News Detector | `news-detector.html` | Enter an article, URL or headline for AI analysis |
| Fake Review Detector | `review-detector.html` | Enter a product review to check if it looks genuine or suspicious |
| Analysis Result | `result.html` | Verdict, confidence, ML model scores, reasons, evidence and feedback |
| History | `history.html` | The user's previous checks (search, filter, delete, export) |
| How It Works | `how-it-works.html` | Explains how the rule engine and ML ensemble work |
| Verified News | `verified-news.html` | Fact-checked claims and trusted sources |
| ML Lab | `model.html` | Model accuracy, speed benchmark, training on your own dataset, REST API |
| Profile / Dashboard | `dashboard.html` | User statistics, activity chart and recent checks |
| Settings | `settings.html` | Account, theme, accent, 3D, engine, ML, sensitivity and data settings |
| About | `about.html` | Project and team information |

## Project structure

```
mini project/
├── index.html … model.html     11 pages
├── server.js                   Node.js backend: static files + REST API (no npm packages)
├── css/style.css               design system, components, 3D effects, responsive rules
├── js/data.js                  samples, curated fact-checks, trusted sources
├── js/analyzer.js              rule engine (NLP features → 7 signals → score)
├── js/ml.js                    ML library: hashed n-grams, Naive Bayes, Logistic Regression, stacking, CV
├── js/dataset.js               built-in labelled training examples
├── js/engine.js                ensemble engine shared by the server, the worker and the page
├── js/worker.js                Web Worker wrapper (in-browser backend)
├── js/api.js                   client: picks the server, the worker or the page automatically
├── js/core.js                  shared layout, storage, settings, tilt, scanner, toasts
├── js/pages.js                 page controllers (detectors, result, history, ML Lab…)
├── js/three-scene.js           Three.js WebGL "AI core" scene
├── data/                       created by server.js: feedback and custom models (git-ignored)
└── assets/favicon.svg
```

## How detection works

1. **Rule engine:** lexicons and style features (clickbait, emotional words, vague sources, share pressure and health hoaxes for news; hype, promotion, incentives, product detail, balance and repetition for reviews) become 7 risk signals, plus a domain-reputation check for URLs.
2. **Text classifiers:** word unigrams, bigrams and style tokens are hashed into 131,072 features. A binarised **Naive Bayes** and an AdaGrad **Logistic Regression** are trained on labelled examples.
3. **Stacking:** a logistic **meta-learner**, fitted on out-of-fold predictions, decides how much to trust Naive Bayes, Logistic Regression and the rule engine. The Settings sensitivity shifts its output.
4. **Explain:** a verdict (Fake ≥ 65, Suspicious 40–64, Genuine < 40), a confidence based on margin, model agreement and text length, the words that moved the ML score, rule reasons and highlighted evidence.
5. **Learn:** "Was this verdict right?" on the result page updates the model at once (online learning), and the correction is kept for future retraining.

Accuracy, F1, ROC AUC and the confusion matrix are measured with stratified k-fold cross-validation, and the meta-learner is evaluated on folds it never saw. On the built-in news examples the ensemble reaches 87% accuracy, against 53% for the rule engine alone. The built-in dataset is small and hand-written, so treat these numbers as a demo. For real-world accuracy, train on a public dataset in the **ML Lab**: upload CSV, TSV, JSON or JSON Lines, map the text and label columns, and train. Examples are Fake and Real News, WELFake, LIAR, Deceptive Opinion Spam, or the Fake Reviews CG/OR set.

**Speed:** a single check takes about 1–5 ms of compute and about 0.5 ms each in a batch (the ML Lab benchmark measures it on your machine). Repeated inputs come from a cache, models stay in memory, the worker keeps the page responsive, and the server gzips and ETag-caches static files.

## REST API

When `server.js` is running, these endpoints are available on the same origin:

| Method | Path | Body / purpose |
|---|---|---|
| GET | `/api/health` | Engine status and model summary |
| GET | `/api/model` | Full metrics, top features and training details |
| POST | `/api/analyze/news` | `{ "title", "text", "url" }` |
| POST | `/api/analyze/review` | `{ "text", "rating", "verified", "product" }` |
| POST | `/api/analyze` | `{ "type": "news" \| "review", "input": { … }, "sensitivity" }` |
| POST | `/api/analyze/batch` | `{ "type", "inputs": [ … ] }`, up to 500 inputs |
| POST | `/api/feedback` | `{ "type", "input", "label": "fake" \| "real" }` |
| POST | `/api/train` | `{ "type", "rows": [{ "text", "label" }], "includeSeed": true }` |
| POST | `/api/reset` | `{ "type" }`, back to the built-in model |

```bash
curl -X POST http://localhost:5510/api/analyze/news -H "Content-Type: application/json" -d "{\"title\":\"Miracle fruit melts belly fat overnight\"}"
```

## Privacy

History and settings are kept in the browser's `localStorage`. In browser mode, nothing leaves the device. With the backend, text is sent to `server.js` for analysis and is only stored in `data/feedback.json` when you give feedback. Settings → **Analysis engine → Browser only** keeps analysis in the browser even when a server is available.

## Customise

- **Team names, guide and college:** edit the Team and Project details sections in `about.html`.
- **Fact-checks:** edit `TL.facts` in `js/data.js`.
- **Detection words and weights:** edit `js/analyzer.js`.
- **Built-in training examples:** edit `js/dataset.js`. Base models are retrained from it every time the engine starts.
- **Demo data for presentations:** use the "Load demo data" button on the Dashboard or History page.
