import { debounce } from "./utils.js";

/**
 * Initializes the search bar functionality.
 * @param {HTMLElement} inputEl - The search input element.
 * @param {string} currentClanId - The currently active clan ID.
 */
export function initSearch(inputEl, currentClanId) {
  const handleInput = debounce((e) => {
    const query = e.target.value.trim();

    if (query.length < 2) {
      if (query.length === 0) {
        window.location.hash = `#${currentClanId}/list`;
      }
      return;
    }

    window.location.hash = `#${currentClanId}/search/${encodeURIComponent(query)}`;
  }, 300);

  inputEl.addEventListener("input", handleInput);
}
