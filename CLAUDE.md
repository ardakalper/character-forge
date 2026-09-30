# Character Forge — notes for future sessions

- Owner: Arda. Commits are authored by Arda only: never add Co-Authored-By or session trailers.
- Style: plain HTML/CSS/ES modules, no build step at runtime, no runtime dependencies, offline-first PWA, GitHub Pages deploy from `app/`.
- Fantasy parchment theme: dark leather background, parchment cards, Cinzel headings, Alegreya body. Dark is the default.
- Rules data is SRD 5.1 (CC-BY-4.0), compiled from the 5e-bits/5e-database JSON by `tools/build-data.mjs` into `app/data/` (committed). Keep the CC attribution in the UI footer and README. Never ship non-SRD content, and never use "D&D" or "Dungeons & Dragons" in names or descriptions — say "5e-compatible" / "SRD 5.1".
- Two languages (English, Turkish) for the UI in `app/js/i18n.js` (rules data stays English); a unit test enforces key parity.
- Pure modules (`rules.js`) are unit-tested with `node --test`; the UI with Playwright (`PW_CHROMIUM_PATH` reuses a preinstalled Chromium, port 4176).
- v1 scope: single class, levels 1–20. Multiclassing, feats beyond the SRD's Grappler, and the 2024 SRD are future work.
