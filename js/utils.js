/**
 * Sanitizes a string to prevent XSS attacks before inserting it into HTML.
 * @param {string|null|undefined} str - The raw string.
 * @returns {string} Sanitized string safe for innerHTML.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Validates if a string is a safe HTTP/HTTPS URL.
 * Blocks 'javascript:' and other dangerous protocols.
 * @param {string} str - The string to check.
 * @returns {boolean} True if valid and safe URL, false otherwise.
 */
export function isValidUrl(str) {
  try {
    const url = new URL(str);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Creates a debounced function that delays invoking the provided function.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - Milliseconds to delay.
 * @returns {Function} Debounced function.
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
