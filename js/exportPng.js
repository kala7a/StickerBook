window.StickerBook = window.StickerBook || {};

StickerBook.ExportPng = (function () {
  const EXPORT_WIDTH = 1600;
  const EXPORT_HEIGHT = 1200;

  function loadSvgAsImage(src, pixelWidth, pixelHeight) {
    return fetch(src)
      .then(function (res) { return res.text(); })
      .then(function (svgText) {
        return new Promise(function (resolve, reject) {
          const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
          const svgEl = doc.documentElement;
          svgEl.setAttribute('width', String(pixelWidth));
          svgEl.setAttribute('height', String(pixelHeight));
          const serialized = new XMLSerializer().serializeToString(svgEl);
          const blob = new Blob([serialized], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = function () {
            URL.revokeObjectURL(url);
            resolve(img);
          };
          img.onerror = function (err) {
            URL.revokeObjectURL(url);
            reject(err);
          };
          img.src = url;
        });
      });
  }

  function exportCanvas() {
    const state = StickerBook.Canvas.getState();
    const exportBtn = document.getElementById('btn-export');
    setButtonBusy(exportBtn, true);

    const canvasEl = document.createElement('canvas');
    canvasEl.width = EXPORT_WIDTH;
    canvasEl.height = EXPORT_HEIGHT;
    const ctx = canvasEl.getContext('2d');

    const scaleX = EXPORT_WIDTH / StickerBook.Canvas.LOGICAL_WIDTH;
    const scaleY = EXPORT_HEIGHT / StickerBook.Canvas.LOGICAL_HEIGHT;
    const sortedStickers = state.stickers.slice().sort(function (a, b) { return a.z - b.z; });

    const bgPromise = loadSvgAsImage(state.backgroundSrc, EXPORT_WIDTH, EXPORT_HEIGHT);
    const stickerPromises = sortedStickers.map(function (s) {
      return loadSvgAsImage(s.src, Math.round(s.width * 4), Math.round(s.height * 4)).then(function (img) {
        return { img: img, data: s };
      });
    });

    Promise.all([bgPromise].concat(stickerPromises))
      .then(function (results) {
        ctx.drawImage(results[0], 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

        for (let i = 1; i < results.length; i++) {
          const s = results[i].data;
          const img = results[i].img;
          const w = s.width * s.scale * scaleX;
          const h = s.height * s.scale * scaleY;
          ctx.save();
          ctx.translate(s.x * scaleX, s.y * scaleY);
          ctx.rotate((s.rotation * Math.PI) / 180);
          if (s.mirrored) ctx.scale(-1, 1);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        }

        canvasEl.toBlob(function (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'my-sticker-book.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setButtonBusy(exportBtn, false);
        }, 'image/png');
      })
      .catch(function (err) {
        console.error('Export failed', err);
        window.alert('Sorry, saving the picture failed. Please try again.');
        setButtonBusy(exportBtn, false);
      });
  }

  function setButtonBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? 'Saving...' : '⬇ Save Picture';
  }

  return { exportCanvas: exportCanvas };
})();
