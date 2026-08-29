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
    wrapper.appendChild(resizeHandle);

    const rotateLine = document.createElement('div');
    rotateLine.className = 'sticker-handle-rotate-line';
    wrapper.appendChild(rotateLine);

    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'sticker-handle sticker-handle-rotate';
    rotateHandle.title = 'Rotate';
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
