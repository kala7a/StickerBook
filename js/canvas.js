window.StickerBook = window.StickerBook || {};

StickerBook.Canvas = (function () {
  const LOGICAL_WIDTH = 800;
  const LOGICAL_HEIGHT = 600;

  let stageEl, backgroundEl;
  let stickerEls = {};
  let state = {
    backgroundCategory: null,
    backgroundId: null,
    backgroundSrc: '',
    stickers: [],
    nextZ: 1
  };

  function init(stage, background) {
    stageEl = stage;
    backgroundEl = background;
    stageEl.dataset.logicalWidth = String(LOGICAL_WIDTH);
    stageEl.dataset.logicalHeight = String(LOGICAL_HEIGHT);

    stageEl.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.sticker')) {
        StickerBook.Selection.clear();
      }
    });

    StickerBook.Selection.init(function (selectedId) {
      Object.keys(stickerEls).forEach(function (id) {
        stickerEls[id].classList.toggle('selected', id === selectedId);
      });
      StickerBook.Toolbar.updateFloatingPosition(selectedId ? getSticker(selectedId) : null);
    });

    // The stage's screen size (and therefore its logical-to-screen scale
    // factor) changes on resize/orientation-change, so every sticker needs
    // re-rendering to stay correctly placed.
    window.addEventListener('resize', function () {
      state.stickers.forEach(function (s) {
        StickerBook.Sticker.render(stickerEls[s.id], s);
      });
      const selectedId = StickerBook.Selection.get();
      if (selectedId) StickerBook.Toolbar.updateFloatingPosition(getSticker(selectedId));
    });
  }

  function setBackground(categoryId, bg) {
    state.backgroundCategory = categoryId;
    state.backgroundId = bg.id;
    state.backgroundSrc = bg.src;
    backgroundEl.src = bg.src;
  }

  function addSticker(categoryId, element) {
    const id = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const offset = (state.stickers.length % 5) * 14;
    const data = {
      id: id,
      category: categoryId,
      elementId: element.id,
      src: element.src,
      x: LOGICAL_WIDTH / 2 + offset,
      y: LOGICAL_HEIGHT / 2 + offset,
      scale: 1,
      rotation: 0,
      z: state.nextZ++,
      width: element.defaultWidth,
      height: element.defaultHeight
    };
    state.stickers.push(data);

    const wrapper = StickerBook.Sticker.createStickerElement(data, {
      onChange: function (updated) {
        StickerBook.Sticker.render(wrapper, updated);
        if (StickerBook.Selection.get() === updated.id) {
          StickerBook.Toolbar.updateFloatingPosition(updated);
        }
      },
      onSelect: function (selId) {
        StickerBook.Selection.select(selId);
      }
    });
    stickerEls[id] = wrapper;
    stageEl.appendChild(wrapper);
    StickerBook.Sticker.render(wrapper, data);
    StickerBook.Selection.select(id);
    return data;
  }

  function removeSticker(id) {
    const idx = state.stickers.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return;
    state.stickers.splice(idx, 1);
    if (stickerEls[id]) stickerEls[id].remove();
    delete stickerEls[id];
    if (StickerBook.Selection.get() === id) StickerBook.Selection.clear();
  }

  function getSticker(id) {
    return state.stickers.find(function (s) { return s.id === id; }) || null;
  }

  function bringToFront(id) {
    reorder(id, true);
  }

  function sendToBack(id) {
    reorder(id, false);
  }

  function reorder(id, toFront) {
    const sorted = state.stickers.slice().sort(function (a, b) { return a.z - b.z; });
    const idx = sorted.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return;
    const moved = sorted.splice(idx, 1)[0];
    if (toFront) sorted.push(moved);
    else sorted.unshift(moved);
    sorted.forEach(function (s, i) {
      s.z = i + 1;
      stickerEls[s.id].style.zIndex = s.z;
    });
    state.nextZ = sorted.length + 1;
  }

  function getState() {
    return state;
  }

  function getStageEl() {
    return stageEl;
  }

  return {
    init: init,
    setBackground: setBackground,
    addSticker: addSticker,
    removeSticker: removeSticker,
    getSticker: getSticker,
    bringToFront: bringToFront,
    sendToBack: sendToBack,
    getState: getState,
    getStageEl: getStageEl,
    LOGICAL_WIDTH: LOGICAL_WIDTH,
    LOGICAL_HEIGHT: LOGICAL_HEIGHT
  };
})();
