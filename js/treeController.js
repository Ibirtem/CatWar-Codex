import { Store } from "./store.js";
import { TreeLayout } from "./treeLayout.js";
import { TreeRenderer } from "./treeRenderer.js";
import { renderClanTree, renderError } from "./renderer.js";

export const TreeController = {
  _currentRenderer: null,

  async init(container, clanId) {
    this.destroy();

    try {
      const treeDataMap = await Store.getTreeData(clanId);

      if (!treeDataMap || treeDataMap.size === 0) {
        renderError(
          container,
          "Данные Семейного Древа отсутствуют или ссылка на таблицу не настроена.",
        );
        return;
      }

      const layoutResult = TreeLayout.build(treeDataMap);

      const uiElements = renderClanTree(container);

      this._currentRenderer = new TreeRenderer(uiElements.canvas);
      this._currentRenderer.setData(layoutResult);

      this._initSearch(
        uiElements.searchInput,
        uiElements.searchDropdown,
        layoutResult.nodes,
      );
    } catch (err) {
      console.error("[TreeController] Init error:", err);
      renderError(container, `Ошибка при сборке древа: ${err.message}`);
    }
  },

  _initSearch(searchInput, searchDropdown, nodes) {
    if (!searchInput || !searchDropdown) return;

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      searchDropdown.innerHTML = "";

      if (query.length < 2) {
        searchDropdown.classList.remove("active");
        return;
      }

      const matches = nodes
        .filter(
          (n) =>
            (n.name && n.name.toLowerCase().includes(query)) ||
            (n.displayId && n.displayId.includes(query)),
        )
        .slice(0, 8);

      if (matches.length > 0) {
        searchDropdown.classList.add("active");
        matches.forEach((m) => {
          const li = document.createElement("li");
          li.className = "tree-search-item";
          li.innerHTML = `<span>${m.name || "Неизвестный"}</span><span class="tree-search-item-id">ID: ${m.displayId}</span>`;

          li.onclick = () => {
            if (this._currentRenderer)
              this._currentRenderer.focusOn(m.id, true);
            searchDropdown.classList.remove("active");
            searchInput.value = "";
            searchInput.blur();
          };
          searchDropdown.appendChild(li);
        });
      } else {
        searchDropdown.classList.remove("active");
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !searchInput.contains(e.target) &&
        !searchDropdown.contains(e.target)
      ) {
        searchDropdown.classList.remove("active");
      }
    });
  },

  destroy() {
    if (this._currentRenderer) {
      this._currentRenderer.destroy();
      this._currentRenderer = null;
    }
  },
};
