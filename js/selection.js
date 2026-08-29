window.StickerBook = window.StickerBook || {};

StickerBook.Selection = (function () {
  let selectedId = null;
  let onSelectionChange = null;

  function init(callback) {
    onSelectionChange = callback;
  }

  function select(id) {
    if (selectedId === id) return;
    selectedId = id;
    if (onSelectionChange) onSelectionChange(selectedId);
  }

  function clear() {
    if (selectedId === null) return;
    selectedId = null;
    if (onSelectionChange) onSelectionChange(selectedId);
  }

  function get() {
    return selectedId;
  }

  return { init: init, select: select, clear: clear, get: get };
})();
