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
    // Tracks every pointer currently down on the sticker body so one finger
    // drags it and a second finger switches to pinch-to-resize, matching the
    // standard mobile gesture kids already know.
    const activePointers = new Map();
    let mode = null; // 'drag' | 'pinch'
    let dragState = null;
    let pinchState = null;
    let stageSecondFingerListener = null;

    els.body.addEventListener('pointerdown', function (e) {
      if (e.target === els.resizeHandle || e.target === els.rotateHandle) return;
      e.preventDefault();
      callbacks.onSelect(data.id);
      // Capture keeps move/up events targeting this element even if a fast
      // finger strays outside its bounds. Setting it can throw in edge cases
      // (per spec, if the UA no longer considers the pointer active) — that
      // must never abort tracking this pointer for drag/pinch.
      try {
        wrapperEl.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        beginDrag(e.pointerId);
        // A sticker is small, so asking a kid to land a *second* finger
        // inside it too (for pinch-to-resize) is unreliable. Once the first
        // finger is confirmed on the sticker, accept a second finger
        // anywhere on the canvas as the pinch partner.
        listenForSecondFingerOnStage();
      } else if (activePointers.size === 2) {
        beginPinch();
      }
    });

    function listenForSecondFingerOnStage() {
      if (stageSecondFingerListener) return;
      const stage = wrapperEl.closest('.canvas-stage');
      if (!stage) return;
      stageSecondFingerListener = function (e) {
        if (mode !== 'drag' || activePointers.size !== 1 || activePointers.has(e.pointerId)) return;
        // Don't steal a touch meant for a different sticker or a handle.
        if (e.target.closest('.sticker-handle')) return;
        const otherSticker = e.target.closest('.sticker');
        if (otherSticker && otherSticker !== wrapperEl) return;

        e.preventDefault();
        // Redirect this pointer's future events to the sticker itself (not
        // the stage) so the existing body pointermove/pointerup handlers
        // pick it up no matter where on the canvas it actually landed.
        try {
          wrapperEl.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        beginPinch();
      };
      stage.addEventListener('pointerdown', stageSecondFingerListener);
    }

    function stopListeningForSecondFingerOnStage() {
      if (!stageSecondFingerListener) return;
      const stage = wrapperEl.closest('.canvas-stage');
      if (stage) stage.removeEventListener('pointerdown', stageSecondFingerListener);
      stageSecondFingerListener = null;
    }

    els.body.addEventListener('pointermove', function (e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === 'drag' && activePointers.size === 1) {
        updateDrag(e);
      } else if (mode === 'pinch' && activePointers.size === 2) {
        updatePinch();
      }
    });

    els.body.addEventListener('pointerup', endBodyPointer);
    els.body.addEventListener('pointercancel', endBodyPointer);

    function endBodyPointer(e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) {
        mode = null;
        dragState = null;
        pinchState = null;
        stopListeningForSecondFingerOnStage();
      } else if (activePointers.size === 1 && mode === 'pinch') {
        // Dropped from two fingers to one: resume dragging from the
        // remaining finger's current position so the sticker doesn't jump.
        const entries = Array.from(activePointers.entries());
        beginDrag(entries[0][0]);
      }
    }

    function beginDrag(pointerId) {
      mode = 'drag';
      const pos = activePointers.get(pointerId);
      const scale = getCanvasScale(wrapperEl.closest('.canvas-stage'));
      dragState = {
        pointerId: pointerId,
        startX: pos.x,
        startY: pos.y,
        origX: data.x,
        origY: data.y,
        scale: scale
      };
    }

    function updateDrag(e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      data.x = dragState.origX + (e.clientX - dragState.startX) / dragState.scale;
      data.y = dragState.origY + (e.clientY - dragState.startY) / dragState.scale;
      callbacks.onChange(data);
    }

    function beginPinch() {
      mode = 'pinch';
      const pts = Array.from(activePointers.values());
      pinchState = {
        startDist: distance(pts[0].x, pts[0].y, pts[1].x, pts[1].y),
        origScale: data.scale
      };
    }

    function updatePinch() {
      const pts = Array.from(activePointers.values());
      const dist = distance(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      const ratio = pinchState.startDist === 0 ? 1 : dist / pinchState.startDist;
      data.scale = clamp(pinchState.origScale * ratio, MIN_SCALE, MAX_SCALE);
      callbacks.onChange(data);
    }

    els.resizeHandle.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      startResize(e);
    });
    els.rotateHandle.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      startRotate(e);
    });

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
      try {
        els.resizeHandle.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }

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
      try {
        els.rotateHandle.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }

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
