window.StickerBook = window.StickerBook || {};

StickerBook.ManifestLoader = (function () {
  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + url);
      return res.json();
    });
  }

  function loadTopManifest() {
    return loadJson('assets/manifest.json');
  }

  return { loadJson: loadJson, loadTopManifest: loadTopManifest };
})();
