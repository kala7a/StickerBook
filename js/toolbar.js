window.StickerBook = window.StickerBook || {};

StickerBook.Toolbar = (function () {
  let floatingEl, stageWrapEl;

  function init(els) {
    floatingEl = els.floating;
    stageWrapEl = els.stageWrap;

    els.done.addEventListener('click', function () {
      StickerBook.Selection.clear();
    });
    els.front.addEventListener('click', function () {
      const id = StickerBook.Selection.get();
      if (id) StickerBook.Canvas.bringToFront(id);
    });
    els.back.addEventListener('click', function () {
      const id = StickerBook.Selection.get();
      if (id) StickerBook.Canvas.sendToBack(id);
    });
    els.delete.addEventListener('click', function () {
      const id = StickerBook.Selection.get();
      if (id) StickerBook.Canvas.removeSticker(id);
    });
    els.export.addEventListener('click', function () {
      StickerBook.ExportPng.exportCanvas();
    });
    els.newDrawing.addEventListener('click', function () {
      const state = StickerBook.Canvas.getState();
      if (state.stickers.length === 0) return;
      if (window.confirm('Start a new drawing? This will clear your current picture.')) {
        StickerBook.Canvas.clearStickers();
      }
    });
  }

  function updateFloatingPosition(stickerData) {
    if (!stickerData) {
      floatingEl.hidden = true;
      return;
    }
    floatingEl.hidden = false;
    const stage = StickerBook.Canvas.getStageEl();
    const stageRect = stage.getBoundingClientRect();
    const wrapRect = stageWrapEl.getBoundingClientRect();
    const scale = stageRect.width / StickerBook.Canvas.LOGICAL_WIDTH;
    // Anchored to the sticker's side (not above it) so it never overlaps the
    // rotate handle, which lives directly above the sticker.
    const halfDiagonal =
      (Math.sqrt(stickerData.width * stickerData.width + stickerData.height * stickerData.height) *
        stickerData.scale) /
      2;
    const gap = 12;
    const toolbarWidth = floatingEl.getBoundingClientRect().width || 54;

    const rightSideX = stageRect.left + (stickerData.x + halfDiagonal + gap) * scale;
    let leftPx;
    if (rightSideX + toolbarWidth > wrapRect.right) {
      // Placing it on the sticker's right would run off the edge of the
      // canvas (or overlap the side toolbar) — flip to the left side, still
      // reachable, instead.
      const leftSideX = stageRect.left + (stickerData.x - halfDiagonal - gap) * scale;
      leftPx = leftSideX - wrapRect.left - toolbarWidth;
    } else {
      leftPx = rightSideX - wrapRect.left;
    }

    const top = stageRect.top - wrapRect.top + stickerData.y * scale;
    floatingEl.style.left = leftPx + 'px';
    floatingEl.style.top = Math.max(0, top) + 'px';
  }

  return { init: init, updateFloatingPosition: updateFloatingPosition };
})();
