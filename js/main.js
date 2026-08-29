window.StickerBook = window.StickerBook || {};

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const stage = document.getElementById('canvas-stage');
    const background = document.getElementById('canvas-background');

    StickerBook.Canvas.init(stage, background);

    StickerBook.Toolbar.init({
      floating: document.getElementById('floating-toolbar'),
      front: document.getElementById('btn-front'),
      back: document.getElementById('btn-back'),
      delete: document.getElementById('btn-delete'),
      export: document.getElementById('btn-export'),
      newDrawing: document.getElementById('btn-new'),
      stageWrap: document.getElementById('canvas-wrap')
    });

    StickerBook.ManifestLoader.loadTopManifest()
      .then(function (topManifest) {
        StickerBook.CategoryPicker.init(
          {
            tabs: document.getElementById('category-tabs'),
            backgrounds: document.getElementById('backgrounds-tray'),
            elements: document.getElementById('elements-tray')
          },
          topManifest
        );
        const firstId = StickerBook.CategoryPicker.getFirstCategoryId();
        if (firstId) StickerBook.CategoryPicker.selectCategory(firstId);
      })
      .catch(function (err) {
        console.error('Failed to load StickerBook assets', err);
        document.body.innerHTML =
          '<p style="padding:2rem;font-family:sans-serif;">Could not load StickerBook. ' +
          'Please make sure you are running this from a local web server (see README), not by double-clicking index.html.</p>';
      });
  });
})();
