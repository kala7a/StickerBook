# StickerBook

A simple sticker/drawing app for kids. Pick a background, tap stickers onto it, then drag, resize, rotate, and layer them. Works on phone and PC. Save the finished picture as a PNG.

No build step, no external libraries — plain HTML, CSS, and JavaScript.

## Running it locally

Opening `index.html` directly (double-clicking it) will **not** work — browsers block the `fetch()` calls used to load the sticker manifests when a page is opened via `file://`. Serve the folder instead:

```
cd StickerBook
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

Any other static server (or deploying to GitHub Pages / Netlify / Vercel) works the same way.

## How it's organized

```
index.html          Page structure
css/style.css        All styling
js/                   App logic, one small module per responsibility
assets/manifest.json  Top-level list of categories
assets/svg/<category>/manifest.json   Backgrounds + stickers for one category
assets/svg/<category>/backgrounds/    Full-scene background SVGs
assets/svg/<category>/elements/       Individual sticker SVGs
```

Each sticker on the canvas is just data (`x`, `y`, `scale`, `rotation`, `z`, ...); the on-screen element is a plain re-render of that data, so dragging, resizing, and rotating never fight the browser.

## Adding a new category

No code changes needed — just files:

1. Create `assets/svg/<your-category>/backgrounds/` and `.../elements/` and drop in your SVGs.
   - Backgrounds: `viewBox="0 0 800 600"` (fills the canvas).
   - Elements: `viewBox="0 0 200 200"`, simple flat shapes, no gradients/photorealism — keeps files small and kid-friendly.
2. Add `assets/svg/<your-category>/manifest.json` listing them, following the shape of `assets/svg/princess/manifest.json`.
3. Add one entry to `assets/manifest.json` pointing at that new manifest file.

Reload the page — the new category tab appears automatically.

## Notes

- Nothing is saved between sessions; closing the tab resets the canvas. Use **Save Picture** to export a PNG before closing.
- On mobile Safari, saving a picture may open it in a new tab instead of downloading directly — press and hold the image to save it from there.

## Version

The small `vN` next to the title in `index.html` is a manual build counter — bump it by 1 in every PR that changes the app, so you can tell at a glance whether a device (especially a phone that may be showing a cached copy) is on the latest deploy.
