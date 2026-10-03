# TruthLens AI: Fake News & Fake Review Detector

A responsive website with 3D effects for detecting **fake news** and **fake product reviews**, built as a mini project.

## Run it

- **Quickest:** double-click `index.html`. It opens in your browser and works offline. The WebGL scene loads Three.js from a CDN; without internet a CSS 3D fallback is shown instead.
- **Recommended:** open the folder in VS Code and use the **Live Server** extension, or run `python -m http.server 8000` and open http://localhost:8000.

## Pages

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Explains the platform and gives quick access to detection |
| Fake News Detector | `news-detector.html` | Enter an article, URL or headline for AI analysis |
| Fake Review Detector | `review-detector.html` | Enter a product review to check if it looks genuine or suspicious |
| Analysis Result | `result.html` | AI result, confidence, reasons and evidence |
| History | `history.html` | The user's previous checks (search, filter, delete, export) |
| How It Works | `how-it-works.html` | Explains how the AI detection system works |
| Verified News | `verified-news.html` | Fact-checked claims and trusted sources |
| Profile / Dashboard | `dashboard.html` | User statistics, activity chart and recent checks |
| Settings | `settings.html` | Account, theme, accent, 3D, sensitivity and data settings |
| About | `about.html` | Project and team information |

## Project structure

```
mini project/
├── index.html … about.html     10 pages
├── css/style.css               design system, components, 3D effects, responsive rules
├── js/data.js                  samples, curated fact-checks, trusted sources
├── js/analyzer.js              detection engine (NLP features → signals → score)
├── js/core.js                  shared layout, storage, settings, tilt, scanner, toasts
├── js/pages.js                 page controllers (detectors, result, history, dashboard…)
├── js/three-scene.js           Three.js WebGL "AI core" scene
└── assets/favicon.svg
```

## How detection works

1. **Preprocess:** split the text into sentences and words, and count numbers, quotes, caps and punctuation.
2. **Extract features:** match lexicons (clickbait, emotional, vague-source, share-pressure, health-hoax, attribution; or for reviews: hype, promo, incentive, product features, balance and usage).
3. **Signals:** 7 risk signals (0–100) per detector, plus a domain-reputation check for URLs.
4. **Score:** a weighted average blended with the top-2 signals, passed through a logistic curve to give the fake likelihood (%). The Settings sensitivity shifts the curve.
5. **Explain:** a verdict (Fake ≥ 65, Suspicious 40–64, Genuine < 40), a confidence value, reasons and highlighted evidence.

All processing happens in the browser. History and settings are kept in `localStorage`.

## Customise

- **Team names, guide and college:** edit the Team and Project details sections in `about.html`.
- **Fact-checks:** edit `TL.facts` in `js/data.js`.
- **Detection words and weights:** edit `js/analyzer.js`.
- **Demo data for presentations:** use the "Load demo data" button on the Dashboard or History page.
