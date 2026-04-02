import { Store } from "./store.js";
import { AppConfig } from "./config.js";
import { Router } from "./router.js";
import { initSearch } from "./search.js";
import { renderLoading, renderError } from "./renderer.js";

document.addEventListener("DOMContentLoaded", async () => {
  const contentArea = document.getElementById("contentArea");
  const searchInput = document.getElementById("searchInput");
  const defaultClan = Object.keys(AppConfig.clans)[0];
  const clanConfig = AppConfig.clans[defaultClan];

  // Dynamic header title
  const appTitle = document.getElementById("appTitle");
  if (appTitle && clanConfig) {
    appTitle.textContent = clanConfig.name;
  }

  // Dynamic nav links
  const navChronicle = document.getElementById("nav-chronicle");
  const navTree = document.getElementById("nav-tree");
  if (navChronicle) navChronicle.href = `#${defaultClan}/list`;
  if (navTree) navTree.href = `#${defaultClan}/tree`;

  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      refreshBtn.disabled = true;
      try {
        await Store.getClanData(defaultClan, true);
        Router.handleRoute();
      } catch (err) {
        renderError(contentArea, `Ошибка обновления: ${err.message}`);
      } finally {
        refreshBtn.classList.remove("spinning");
        refreshBtn.disabled = false;
      }
    });
  }

  renderLoading(contentArea);

  try {
    await Store.getClanData(defaultClan);
    Router.init(contentArea);
    initSearch(searchInput, defaultClan);
  } catch (err) {
    renderError(
      contentArea,
      `Критическая ошибка инициализации: ${err.message}`,
    );
  }
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[Global Error]", e.reason);
  const contentArea = document.getElementById("contentArea");
  if (contentArea) {
    renderError(
      contentArea,
      `Необработанная ошибка: ${e.reason?.message || e.reason}`,
    );
  }
});
