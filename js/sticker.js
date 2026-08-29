window.StickerBook = window.StickerBook || {};

StickerBook.Sticker = (function () {
  function createStickerElement(data, callbacks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sticker';
    wrapper.dataset.id = data.id;

    const img = document.createElement('img');
    img.className = 'sticker-image';
    img.src = data.src;
    img.draggable = false;
    img.alt = data.elementId;
    wrapper.appendChild(img);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sticker-handle sticker-handle-resize';
    resizeHandle.title = 'Resize';
    resizeHandle.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3A85B8" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="7" y1="17" x2="17" y2="7"></line>' +
      '<polyline points="17 13 17 7 11 7"></polyline>' +
      '<polyline points="7 11 7 17 13 17"></polyline>' +
      '</svg>';
    wrapper.appendChild(resizeHandle);

    const rotateLine = document.createElement('div');
    rotateLine.className = 'sticker-handle-rotate-line';
    wrapper.appendChild(rotateLine);

    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'sticker-handle sticker-handle-rotate';
    rotateHandle.title = 'Rotate';
    rotateHandle.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3A85B8" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="23 4 23 10 17 10"></polyline>' +
      '<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>' +
      '</svg>';
    wrapper.appendChild(rotateHandle);

    StickerBook.Gestures.attachHandles(
      wrapper,
      data,
      { resizeHandle: resizeHandle, rotateHandle: rotateHandle },
      callbacks
    );

    return wrapper;
  }

  // The canvas stage is laid out in a fixed 800x600 logical coordinate space
  // but is displayed at whatever CSS size fits the viewport (phone vs PC), so
  // every pixel value here must be scaled by the stage's current display
  // scale (screen px per logical unit) or stickers misplace on any viewport
  // that isn't exactly 800px wide.
  function render(wrapper, data) {
    const stage = wrapper.closest('.canvas-stage');
    if (!stage) return;
    const scale = stage.getBoundingClientRect().width / Number(stage.dataset.logicalWidth);
    const w = data.width * scale;
    const h = data.height * scale;
    wrapper.style.width = w + 'px';
    wrapper.style.height = h + 'px';
    wrapper.style.zIndex = data.z;
    const tx = data.x * scale - w / 2;
    const ty = data.y * scale - h / 2;
    wrapper.style.transform =
      'translate(' + tx + 'px,' + ty + 'px) rotate(' + data.rotation + 'deg) scale(' + data.scale + ')';
  }

  return { createStickerElement: createStickerElement, render: render };
})();
