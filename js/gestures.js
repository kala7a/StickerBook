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

  // Where stickers overlap, the topmost one under the finger often isn't the
  // intended one: reaching for a small sticker regularly lands on the corner
  // of a bigger one stacked above it. So among every sticker actually under
  // the point, take the one whose centre is nearest — aiming at a sticker's
  // middle then beats clipping another's edge, whatever the stacking order.
  // getBoundingClientRect() is the axis-aligned box of the already-transformed
  // sticker, and rotation/scale are applied about its own centre, so the box's
  // midpoint is the sticker's true on-screen centre.
  function pickStickerAt(stageEl, clientX, clientY) {
    const candidates = [];
    document.elementsFromPoint(clientX, clientY).forEach(function (el) {
      const sticker = el.closest ? el.closest('.sticker') : null;
      if (sticker && stageEl.contains(sticker) && candidates.indexOf(sticker) === -1) {
        candidates.push(sticker);
      }
    });
    if (candidates.length < 2) return candidates[0] || null;

    // elementsFromPoint is ordered topmost-first, and a strict < keeps that
    // one ahead when two centres are equidistant.
    let best = candidates[0];
    let bestDist = Infinity;
    candidates.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      const dist = distance(clientX, clientY, rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    });
    return best;
  }

  // Resize/rotate handles stay precise and per-sticker: a kid reaching for
  // the small handle circle expects it to affect only that handle.
  function attachHandles(wrapperEl, data, els, callbacks) {
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

  // Drag and pinch-to-resize are handled once at the canvas-stage level for
  // whichever sticker is currently selected, rather than per-sticker. A
  // sticker is small on a phone screen, so requiring every finger of a
  // gesture to land precisely inside it is unreliable; once something is
  // selected, the whole canvas is its gesture surface until it's deselected
  // (Done) or deleted. Touching a different sticker while one is already
  // selected never switches to it — that was too easy to trigger by
  // accident while positioning the current one — it just keeps
  // manipulating the current selection instead.
  function attachStage(stageEl, getActive, callbacks) {
    const activePointers = new Map();
    let mode = null; // 'drag' | 'pinch'
    let dragState = null;
    let pinchState = null;
    let activeId = null;

    stageEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.sticker-handle')) return;

      if (activePointers.size === 0) {
        const currentSelection = StickerBook.Selection.get();

        if (!currentSelection) {
          // Nothing selected yet, so there's nothing to accidentally
          // interrupt — tapping a sticker selects it immediately.
          const stickerEl = pickStickerAt(stageEl, e.clientX, e.clientY);
          if (stickerEl) StickerBook.Selection.select(stickerEl.dataset.id);
        }

        const activeAfterTap = getActive();
        if (!activeAfterTap) return;
        activeId = activeAfterTap.id;
      } else if (activeId === null) {
        return;
      }

      const active = getActive();
      if (!active || active.id !== activeId) return;

      e.preventDefault();
      try {
        stageEl.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        beginDrag(e.pointerId, active);
      } else if (activePointers.size === 2) {
        beginPinch(active);
      }
    });

    stageEl.addEventListener('pointermove', function (e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const active = getActive();
      if (!active || active.id !== activeId) return;

      if (mode === 'drag' && activePointers.size === 1) {
        updateDrag(e, active);
      } else if (mode === 'pinch' && activePointers.size === 2) {
        updatePinch(active);
      }
    });

    stageEl.addEventListener('pointerup', endPointer);
    stageEl.addEventListener('pointercancel', endPointer);

    function endPointer(e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.delete(e.pointerId);

      if (activePointers.size === 0) {
        mode = null;
        dragState = null;
        pinchState = null;
        activeId = null;
      } else if (activePointers.size === 1 && mode === 'pinch') {
        // Dropped from two fingers to one: resume dragging from the
        // remaining finger's current position so the sticker doesn't jump.
        const active = getActive();
        if (active && active.id === activeId) {
          const entries = Array.from(activePointers.entries());
          beginDrag(entries[0][0], active);
        }
      }
    }

    function beginDrag(pointerId, active) {
      mode = 'drag';
      const pos = activePointers.get(pointerId);
      const scale = getCanvasScale(stageEl);
      dragState = {
        pointerId: pointerId,
        startX: pos.x,
        startY: pos.y,
        origX: active.data.x,
        origY: active.data.y,
        scale: scale
      };
    }

    function updateDrag(e, active) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      active.data.x = dragState.origX + (e.clientX - dragState.startX) / dragState.scale;
      active.data.y = dragState.origY + (e.clientY - dragState.startY) / dragState.scale;
      callbacks.onChange(active);
    }

    function beginPinch(active) {
      mode = 'pinch';
      const pts = Array.from(activePointers.values());
      pinchState = {
        startDist: distance(pts[0].x, pts[0].y, pts[1].x, pts[1].y),
        startAngle: angle(pts[1].x, pts[1].y, pts[0].x, pts[0].y),
        origScale: active.data.scale,
        origRotation: active.data.rotation
      };
    }

    // A single two-finger gesture drives both scale and rotation at once,
    // like the standard pinch-to-zoom-and-twist gesture in photo/markup
    // apps: how far apart the fingers are controls size, the angle between
    // them controls rotation. The resize/rotate handles remain for finer,
    // single-axis adjustment.
    function updatePinch(active) {
      const pts = Array.from(activePointers.values());
      const dist = distance(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      const ratio = pinchState.startDist === 0 ? 1 : dist / pinchState.startDist;
      active.data.scale = clamp(pinchState.origScale * ratio, MIN_SCALE, MAX_SCALE);

      const currentAngle = angle(pts[1].x, pts[1].y, pts[0].x, pts[0].y);
      active.data.rotation = pinchState.origRotation + (currentAngle - pinchState.startAngle);

      callbacks.onChange(active);
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

  return { attachHandles: attachHandles, attachStage: attachStage };
})();
