import { Store } from "./store.js";
import { AppConfig } from "./config.js";
import {
  renderCatProfile,
  renderList,
  renderSearchResults,
  renderDebug,
  renderError,
  renderClanTree,
  renderLoading,
  renderAbout,
} from "./renderer.js";

export const Router = {
  _container: null,
  _currentNavigation: 0,

  /**
   * Initializes the router.
   * @param {HTMLElement} container - The DOM element where routes will be rendered.
   */
  init(container) {
    this._container = container;
    window.addEventListener("hashchange", () => this.handleRoute());
    this.handleRoute();
  },

  /**
   * Updates the active state of navigation buttons and header title
   * based on the current clan and route type.
   */
  _updateNav(clanId, routeType) {
    const navButtons = document.querySelectorAll(".app-nav .nav-btn");
    navButtons.forEach((btn) => btn.classList.remove("active"));

    if (routeType === "tree") {
      document.getElementById("nav-tree")?.classList.add("active");
    } else if (routeType === "about") {
      document.getElementById("nav-about")?.classList.add("active");
    } else {
      document.getElementById("nav-chronicle")?.classList.add("active");
    }

    const navChronicle = document.getElementById("nav-chronicle");
    const navTree = document.getElementById("nav-tree");
    const navAbout = document.getElementById("nav-about");
    if (navChronicle) navChronicle.href = `#${clanId}/list`;
    if (navTree) navTree.href = `#${clanId}/tree`;
    if (navAbout) navAbout.href = `#${clanId}/about`;

    const clanConfig = AppConfig.clans[clanId];
    const appTitle = document.getElementById("appTitle");
    if (appTitle && clanConfig) {
      appTitle.textContent = clanConfig.name;
    }
  },

  /**
   * Synchronizes the search input value with the current route.
   * - search route: fills the input with the query
   * - list route: clears the input
   * - cat route: leaves untouched
   */
  _syncSearchInput(routeType, query) {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    if (routeType === "search") {
      searchInput.value = query || "";
    } else if (routeType === "list") {
      searchInput.value = "";
    }
  },

  async handleRoute() {
    if (!this._container) return;

    const navId = ++this._currentNavigation;
    const defaultClan = Object.keys(AppConfig.clans)[0];
    const hash = window.location.hash.slice(1) || `${defaultClan}/list`;

    const [clanId, routeType, ...rest] = hash.split("/");
    const entityIdOrQuery = rest.join("/");

    const searchWrapper = document.querySelector(".search-wrapper");

    this._updateNav(clanId, routeType || "list");

    renderLoading(this._container);

    await new Promise((r) => requestAnimationFrame(r));

    if (navId !== this._currentNavigation) return;

    try {
      const clanData = await Store.getClanData(clanId);
      if (navId !== this._currentNavigation) return;

      switch (routeType) {
        case "tree":
          if (searchWrapper) searchWrapper.style.display = "none";
          this._syncSearchInput(routeType);
          renderClanTree(clanData, this._container);
          break;

        case "cat":
          if (searchWrapper) searchWrapper.style.display = "block";
          this._syncSearchInput(routeType);
          const cat = clanData.find(
            (c) => String(c.primary.id) === entityIdOrQuery,
          );
          if (cat) renderCatProfile(cat, this._container);
          else
            renderError(
              this._container,
              `Кот с ID «${entityIdOrQuery}» не найден`,
            );
          break;

        case "search":
          if (searchWrapper) searchWrapper.style.display = "block";
          const query = decodeURIComponent(entityIdOrQuery);
          this._syncSearchInput(routeType, query);
          const results = Store.searchCats(clanId, query);
          renderSearchResults(results, query, clanId, this._container);
          break;

        case "list":
          if (searchWrapper) searchWrapper.style.display = "block";
          this._syncSearchInput(routeType);
          renderList(clanData, clanId, this._container);
          break;

        case "about":
          if (searchWrapper) searchWrapper.style.display = "none";
          this._syncSearchInput(routeType);
          renderAbout(this._container);
          break;

        case "debug":
          if (searchWrapper) searchWrapper.style.display = "block";
          this._syncSearchInput(routeType);
          renderDebug(clanData, this._container);
          break;

        default:
          if (searchWrapper) searchWrapper.style.display = "block";
          this._syncSearchInput("list");
          renderList(clanData, clanId, this._container);
          break;
      }
    } catch (err) {
      if (navId !== this._currentNavigation) return;
      if (searchWrapper) searchWrapper.style.display = "block";
      renderError(this._container, err.message);
    }
  },
};
