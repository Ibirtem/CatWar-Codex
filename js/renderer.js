import { escapeHTML } from "./utils.js";

function renderField(field) {
  switch (field.display) {
    case "badge":
      return `<span class="glass-panel cat-badge">${escapeHTML(field.value)}</span>`;

    case "chain": {
      const items = Array.isArray(field.value) ? field.value : [field.value];
      return `<div class="cat-chain">
                ${items
                  .map(
                    (name) =>
                      `<span class="chain-item">${escapeHTML(name)}</span>`,
                  )
                  .join('<span class="chain-arrow">→</span>')}
              </div>`;
    }

    case "link":
      return `<a href="${escapeHTML(field.value)}" target="_blank" rel="noopener noreferrer" class="glass-panel glass-interactive cat-link">Открыть ${escapeHTML(field.label)}</a>`;

    case "links":
      return `<div class="cat-links-container">
                ${field.value
                  .map((url) => {
                    let label = "Ссылка";
                    try {
                      label = new URL(url).hostname.replace("www.", "");
                    } catch (e) {}
                    return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="glass-panel glass-interactive cat-link">${escapeHTML(label)}</a>`;
                  })
                  .join("")}
              </div>`;

    case "text":
    default:
      return `<div class="cat-text"><span class="label">${escapeHTML(field.label)}:</span> ${escapeHTML(field.value)}</div>`;
  }
}

/**
 * Renders the full cat profile card.
 */
export function renderCatProfile(cat, container) {
  const name = escapeHTML(cat.primary.name) || "Неизвестный кот";
  const id = escapeHTML(cat.primary.id) || "---";
  const nickname = cat.primary.nickname
    ? `"${escapeHTML(cat.primary.nickname)}"`
    : "";
  const avatar = escapeHTML(cat.primary.avatarUrl);
  const fallback = escapeHTML(cat._avatarFallback);
  const creation = escapeHTML(cat.primary.creationDate);
  const rebirth = escapeHTML(cat.primary.rebirthDate);
  const nameChain = escapeHTML(cat.primary.nameChain);

  let html = `
    <div class="glass-panel cat-header">
      <img src="${avatar}" 
           alt="${name}" 
           class="cat-avatar" 
           onerror="this.src='${fallback}'; this.onerror=null;" />
      <div class="cat-title">
        <h2>${name}</h2>
        ${nameChain ? `<span class="cat-name-chain">${nameChain}</span>` : ""}
        <span class="cat-id">ID: ${id}</span>
        ${nickname ? `<span class="cat-nickname">${nickname}</span>` : ""}
        <div class="cat-dates">
          ${rebirth ? `<span class="date-item" title="Дата актуального рождения">⏳ ${rebirth}</span>` : ""}
          ${creation ? `<span class="date-item" title="Создание аккаунта">🐣 ${creation}</span>` : ""}
        </div>
      </div>
  `;

  if (cat._warnings && cat._warnings.length > 0) {
    html += `
      <div class="cat-warnings glass-panel glass--warning">
        <span class="warning-icon">⚠️</span>
        <ul class="warning-list">
          ${cat._warnings.map((w) => `<li><strong>${escapeHTML(w.field)}:</strong> ${escapeHTML(w.message)}</li>`).join("")}
        </ul>
      </div>`;
  }
  html += `</div>`;

  cat.sections.forEach((section) => {
    html += `
      <div class="glass-panel cat-section">
        <h3 class="section-title">${escapeHTML(section.title)}</h3>
        <div class="section-content">
          ${section.fields
            .map(
              (field) => `
            <div class="field-wrapper">
              ${renderField(field)}
            </div>`,
            )
            .join("")}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Renders the Chronicle (list of all loaded cats).
 * @param {Array} clanData
 * @param {string} clanId - Used to build correct links.
 * @param {HTMLElement} container
 */
export function renderList(clanData, clanId, container) {
  if (!clanData || clanData.length === 0) return renderEmpty(container);

  let html = `
    <div class="glass-panel cat-section">
      <h3 class="section-title">Летопись клана (${clanData.length} котов)</h3>
      <div class="cat-list">
  `;

  clanData.forEach((cat) => {
    const avatar = escapeHTML(cat.primary.avatarUrl);
    const fallback = escapeHTML(cat._avatarFallback);
    const name = escapeHTML(cat.primary.name) || "Неизвестный";
    const id = escapeHTML(cat.primary.id) || "";

    html += `
      <a href="#${clanId}/cat/${id}" class="glass-panel glass-interactive cat-list-item">
        <img src="${avatar}" 
            alt="${name}" 
            class="list-avatar" 
            onerror="this.src='${fallback}'; this.onerror=null;">
        <span class="list-name">${name}</span>
      </a>
    `;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

/**
 * Renders search results in the same grid format.
 * @param {Array} results
 * @param {string} query
 * @param {string} clanId - Used to build correct links.
 * @param {HTMLElement} container
 */
export function renderSearchResults(results, query, clanId, container) {
  if (!results || results.length === 0) return renderEmpty(container, query);

  let html = `
    <div class="glass-panel cat-section">
      <h3 class="section-title">Результаты поиска: «${escapeHTML(query)}» (${results.length})</h3>
      <div class="cat-list">
  `;

  results.forEach((cat) => {
    const avatar = escapeHTML(cat.primary.avatarUrl);
    const fallback = escapeHTML(cat._avatarFallback);
    const name = escapeHTML(cat.primary.name) || "Неизвестный";
    const id = escapeHTML(cat.primary.id) || "";

    html += `
      <a href="#${clanId}/cat/${id}" class="glass-panel glass-interactive cat-list-item">
        <img src="${avatar}" alt="${name}" class="list-avatar" onerror="this.src='${fallback}'; this.onerror=null;">
        <span class="list-name">${name}</span>
      </a>
    `;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

export function renderLoading(container) {
  container.innerHTML = `
    <div class="glass-panel state-container">
      <div class="spinner"></div>
      <p>Загрузка данных из архивов...</p>
    </div>`;
}

export function renderEmpty(container, query = "") {
  container.innerHTML = `
    <div class="glass-panel state-container">
      <p>Кот ${query ? `«${escapeHTML(query)}»` : ""} не найден</p>
      <p class="hint">Проверьте правильность ID или имени.</p>
    </div>`;
}

export function renderError(container, message) {
  container.innerHTML = `
    <div class="glass-panel glass--error state-container">
      <p>⚠️ Ошибка системы</p>
      <p class="error-detail">${escapeHTML(message)}</p>
    </div>`;
}

export function renderDebug(clanData, container) {
  if (!clanData || clanData.length === 0) return renderEmpty(container);

  const headers = Object.keys(clanData[0]._raw);
  const rows = clanData.slice(0, 5).map((cat) => cat._raw);

  let tableHtml = `<div class="glass-panel glass-scroll glass-scroll-x">
    <h3 style="padding: 15px; margin: 0;">🛠 Режим отладки (Первые 5 строк)</h3>
    <table class="debug-table">
      <thead><tr>${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHTML(row[h]) || ""}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>`;
  container.innerHTML = tableHtml;
}

/**
 * Renders a global family tree placeholder.
 */
export function renderClanTree(clanData, container) {
  container.innerHTML = `
    <div class="glass-panel state-container">
      <p style="font-size: 3em; margin-bottom: 15px;">🌳</p>
      <h3 style="margin-bottom: 10px; color: var(--accent);">Древо Клана</h3>
      <p class="hint">Я пукнул и всё исчезло</p>
      <p class="hint" style="margin-top: 10px;">Для построения древа понадобятся таблички чёрточки почечки бесплатно пять рублей</p>
    </div>
  `;
}
