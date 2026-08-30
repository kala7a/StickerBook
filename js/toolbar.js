window.StickerBook = window.StickerBook || {};

StickerBook.Toolbar = (function () {
  let floatingEl, stageWrapEl, flipEl;

  function init(els) {
    floatingEl = els.floating;
    stageWrapEl = els.stageWrap;
    flipEl = els.flip;

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
    els.flip.addEventListener('click', function () {
      const id = StickerBook.Selection.get();
      if (id) {
        StickerBook.Canvas.toggleFlip(id);
        flipEl.classList.toggle('active', StickerBook.Canvas.getSticker(id).mirrored);
      }
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

  function updateFloatingPosition(stickerData, wrapperEl) {
    if (!stickerData) {
      floatingEl.hidden = true;
      return;
    }
    floatingEl.hidden = false;
    flipEl.classList.toggle('active', !!stickerData.mirrored);
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
    const toolbarRect = floatingEl.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width || 54;
    const toolbarHeight = toolbarRect.height || 198;

    const rightSideX = stageRect.left + (stickerData.x + halfDiagonal + gap) * scale;
    const flipped = rightSideX + toolbarWidth > wrapRect.right;
    let leftPx;
    if (flipped) {
      // Placing it on the sticker's right would run off the edge of the
      // canvas (or overlap the side toolbar) — flip to the left side, still
      // reachable, instead.
      const leftSideX = stageRect.left + (stickerData.x - halfDiagonal - gap) * scale;
      leftPx = leftSideX - wrapRect.left - toolbarWidth;
    } else {
      leftPx = rightSideX - wrapRect.left;
    }

    // The toolbar is vertically centered on the sticker via a CSS
    // translateY(-50%), so a sticker near the canvas's top or bottom edge
    // would otherwise push half the toolbar (often the Done button) out of
    // view — clamping the *raw* top to >=0 isn't enough since it ignores
    // that -50% shift. Clamping the center itself by half the toolbar's own
    // measured height keeps the whole toolbar on screen at every position,
    // same as the left/right flip above does for width.
    let top = stageRect.top - wrapRect.top + stickerData.y * scale;
    const minTop = toolbarHeight / 2;
    const maxTop = wrapRect.height - toolbarHeight / 2;
    top = maxTop >= minTop ? Math.max(minTop, Math.min(top, maxTop)) : wrapRect.height / 2;

    floatingEl.style.left = leftPx + 'px';
    floatingEl.style.top = top + 'px';

    // The resize handle normally sits at the sticker's bottom-left specifically
    // to stay clear of this toolbar on the right — so when the toolbar flips
    // to the left instead, the handle needs to flip to the bottom-right or
    // they'd collide there instead.
    if (wrapperEl) {
      wrapperEl.classList.toggle('controls-flipped', flipped);
    }
  }

  return { init: init, updateFloatingPosition: updateFloatingPosition };
})();
