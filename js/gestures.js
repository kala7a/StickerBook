window.StickerBook = window.StickerBook || {};

// Unifies mouse + touch + pen dragging, resizing, and rotating of a sticker
// using the Pointer Events API, so a single code path handles both PC and phone.
StickerBook.Gestures = (function () {
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 3.0;

  function getCanvasScale(stageEl) {
    const rect = stageEl.getBoundingClientRect();
    return rect.width / Number(stageEl.dataset.logicalWidth);
  }

  function attach(wrapperEl, data, els, callbacks) {
    els.body.addEventListener('pointerdown', function (e) {
      if (e.target === els.resizeHandle || e.target === els.rotateHandle) return;
      startDrag(e);
    });
    els.resizeHandle.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      startResize(e);
    });
    els.rotateHandle.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      startRotate(e);
    });

    function startDrag(e) {
      e.preventDefault();
      callbacks.onSelect(data.id);
      const stage = wrapperEl.closest('.canvas-stage');
      const scale = getCanvasScale(stage);
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = data.x;
      const origY = data.y;
      wrapperEl.setPointerCapture(e.pointerId);

      function onMove(ev) {
        data.x = origX + (ev.clientX - startX) / scale;
        data.y = origY + (ev.clientY - startY) / scale;
        callbacks.onChange(data);
      }
      function onUp() {
        wrapperEl.removeEventListener('pointermove', onMove);
        wrapperEl.removeEventListener('pointerup', onUp);
        wrapperEl.removeEventListener('pointercancel', onUp);
      }
      wrapperEl.addEventListener('pointermove', onMove);
      wrapperEl.addEventListener('pointerup', onUp);
      wrapperEl.addEventListener('pointercancel', onUp);
    }

    function startResize(e) {
      e.preventDefault();
      callbacks.onSelect(data.id);
      const stage = wrapperEl.closest('.canvas-stage');
      const scale = getCanvasScale(stage);
      const stageRect = stage.getBoundingClientRect();
      const cx = stageRect.left + data.x * scale;
      const cy = stageRect.top + data.y * scale;
      const startDist = distance(e.clientX, e.clientY, cx, cy);
      const origScale = data.scale;
      els.resizeHandle.setPointerCapture(e.pointerId);

      function onMove(ev) {
        const dist = distance(ev.clientX, ev.clientY, cx, cy);
        const ratio = startDist === 0 ? 1 : dist / startDist;
        data.scale = clamp(origScale * ratio, MIN_SCALE, MAX_SCALE);
        callbacks.onChange(data);
      }
      function onUp() {
        els.resizeHandle.removeEventListener('pointermove', onMove);
        els.resizeHandle.removeEventListener('pointerup', onUp);
        els.resizeHandle.removeEventListener('pointercancel', onUp);
      }
      els.resizeHandle.addEventListener('pointermove', onMove);
      els.resizeHandle.addEventListener('pointerup', onUp);
      els.resizeHandle.addEventListener('pointercancel', onUp);
    }

    function startRotate(e) {
      e.preventDefault();
      callbacks.onSelect(data.id);
      const stage = wrapperEl.closest('.canvas-stage');
      const scale = getCanvasScale(stage);
      const stageRect = stage.getBoundingClientRect();
      const cx = stageRect.left + data.x * scale;
      const cy = stageRect.top + data.y * scale;
      const startAngle = angle(e.clientX, e.clientY, cx, cy);
      const origRotation = data.rotation;
      els.rotateHandle.setPointerCapture(e.pointerId);

      function onMove(ev) {
        const currentAngle = angle(ev.clientX, ev.clientY, cx, cy);
        data.rotation = origRotation + (currentAngle - startAngle);
        callbacks.onChange(data);
      }
      function onUp() {
        els.rotateHandle.removeEventListener('pointermove', onMove);
        els.rotateHandle.removeEventListener('pointerup', onUp);
        els.rotateHandle.removeEventListener('pointercancel', onUp);
      }
      els.rotateHandle.addEventListener('pointermove', onMove);
      els.rotateHandle.addEventListener('pointerup', onUp);
      els.rotateHandle.addEventListener('pointercancel', onUp);
    }
  }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }

  function angle(x, y, cx, cy) {
    return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  return { attach: attach };
})();
