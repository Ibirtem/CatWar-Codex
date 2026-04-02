/**
 * Checks if a given string is a valid URL.
 * @param {string} str - The string to check.
 * @returns {boolean} True if valid URL, false otherwise.
 */
const isValidUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const cleanString = (str) => {
  if (!str) return null;
  const cleaned = str.trim();
  return cleaned === "" ? null : cleaned;
};

/**
 * Internal helper to find a value in a row by possible column names (aliases).
 * @param {Object} row - Raw CSV row.
 * @param {string|string[]} columns - Column name or array of names.
 * @returns {string|null} The found value or null.
 */
function getRawValue(row, columns) {
  const colNames = Array.isArray(columns) ? columns : [columns];
  for (const name of colNames) {
    if (row[name] !== undefined) return row[name];
  }
  return null;
}

/**
 * Returns a human-readable label from a column definition.
 * @param {string|string[]} columns
 * @returns {string}
 */
function getFieldLabel(columns) {
  return Array.isArray(columns) ? columns[0] : columns;
}

/**
 * Parses a raw CSV row and generates a normalized cat object with warnings.
 * @param {Object} rawRow - The raw data row from PapaParse.
 * @param {Object} mapping - The configuration mapping for the clan.
 * @returns {Object} Normalized cat data.
 */
export function normalizeCatData(rawRow, mapping) {
  const cat = {
    primary: {},
    sections: [],
    _warnings: [],
    _raw: rawRow,
    _avatarFallback:
      mapping.primary.avatarUrl?.fallback || "assets/default-cat.png",
  };

  // 1. Primary Fields
  for (const [key, rules] of Object.entries(mapping.primary)) {
    const rawVal = getRawValue(rawRow, rules.column);
    let val = cleanString(rawVal);
    const label = getFieldLabel(rules.column);

    if (rules.type === "url") {
      if (val && !isValidUrl(val)) {
        cat._warnings.push({
          field: label,
          message: `Некорректная ссылка: "${val}". Используется изображение по умолчанию.`,
        });
        val = rules.fallback || null;
      } else if (!val) {
        val = rules.fallback || null;
      }
    } else if (!val && rules.fallback) {
      val = rules.fallback;
    }

    cat.primary[key] = val;
  }

  // 2. Dynamic Sections
  mapping.sections.forEach((section) => {
    const parsedFields = [];

    section.fields.forEach((rules) => {
      const rawVal = getRawValue(rawRow, rules.column);
      const cleanedVal = cleanString(rawVal);
      const label = getFieldLabel(rules.column);

      if (!cleanedVal) return;

      let parsedVal = cleanedVal;

      if (rules.type === "array") {
        parsedVal = cleanedVal
          .split(rules.separator || ",")
          .map((i) => cleanString(i))
          .filter(Boolean);

        if (rules.display === "links") {
          const invalidUrls = parsedVal.filter((url) => !isValidUrl(url));
          if (invalidUrls.length > 0) {
            cat._warnings.push({
              field: label,
              message: `Отфильтровано некорректных ссылок: ${invalidUrls.length}`,
            });
          }
          parsedVal = parsedVal.filter((url) => isValidUrl(url));
        }

        if (parsedVal.length === 0) return;
      } else if (rules.type === "url") {
        if (!isValidUrl(cleanedVal)) {
          cat._warnings.push({
            field: label,
            message: `Некорректная ссылка: "${cleanedVal}". Поле пропущено.`,
          });
          return;
        }
      }

      parsedFields.push({
        key: rules.key,
        label: label,
        value: parsedVal,
        display: rules.display,
      });
    });

    if (parsedFields.length > 0) {
      cat.sections.push({ title: section.title, fields: parsedFields });
    }
  });

  return cat;
}
