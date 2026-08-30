window.StickerBook = window.StickerBook || {};

StickerBook.CategoryPicker = (function () {
  let tabsEl, backgroundsTrayEl, elementsTrayEl;
  let categories = [];
  let categoryManifests = {};
  let activeCategoryId = null;

  function init(els, topManifest) {
    tabsEl = els.tabs;
    backgroundsTrayEl = els.backgrounds;
    elementsTrayEl = els.elements;
    categories = topManifest.categories;
    renderTabs();
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    categories.forEach(function (cat) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-tab';
      btn.title = cat.label;
      btn.setAttribute('aria-label', cat.label);
      btn.innerHTML = '<img src="' + cat.icon + '" alt="">';
      btn.dataset.categoryId = cat.id;
      btn.addEventListener('click', function () {
        selectCategory(cat.id);
      });
      tabsEl.appendChild(btn);
    });
  }

  function selectCategory(categoryId) {
    activeCategoryId = categoryId;
    Array.from(tabsEl.children).forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.categoryId === categoryId);
    });

    if (categoryManifests[categoryId]) {
      renderTrays(categoryManifests[categoryId]);
      return;
    }
    const cat = categories.find(function (c) { return c.id === categoryId; });
    StickerBook.ManifestLoader.loadJson(cat.manifest).then(function (manifest) {
      categoryManifests[categoryId] = manifest;
      if (activeCategoryId === categoryId) renderTrays(manifest);
    });
  }

  function renderTrays(manifest) {
    backgroundsTrayEl.innerHTML = '';
    manifest.backgrounds.forEach(function (bg) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tray-thumb';
      btn.title = bg.label;
      btn.innerHTML = '<img src="' + bg.src + '" alt="' + bg.label + '">';
      btn.addEventListener('click', function () {
        StickerBook.Canvas.setBackground(manifest.id, bg);
      });
      backgroundsTrayEl.appendChild(btn);
    });

    elementsTrayEl.innerHTML = '';
    manifest.elements.forEach(function (el) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tray-thumb';
      btn.title = el.label;
      btn.innerHTML = '<img src="' + el.src + '" alt="' + el.label + '">';
      btn.addEventListener('click', function () {
        StickerBook.Canvas.addSticker(manifest.id, el);
      });
      elementsTrayEl.appendChild(btn);
    });

    if (!StickerBook.Canvas.getState().backgroundSrc && manifest.backgrounds.length) {
      StickerBook.Canvas.setBackground(manifest.id, manifest.backgrounds[0]);
    }
  }

  function getFirstCategoryId() {
    return categories.length ? categories[0].id : null;
  }

  return { init: init, selectCategory: selectCategory, getFirstCategoryId: getFirstCategoryId };
})();
