import { normalizeCatData } from "./parser.js";
import { AppConfig } from "./config.js";

/**
 * Dynamically extracts all possible column names from the clan mapping
 * to use them as keywords for header detection.
 * @param {Object} mapping - The clan mapping object.
 * @returns {string[]} Array of lowercase keywords.
 */
function getKeywordsFromMapping(mapping) {
  const keywords = [];

  Object.values(mapping.primary).forEach((field) => {
    if (Array.isArray(field.column)) keywords.push(...field.column);
    else keywords.push(field.column);
  });

  mapping.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (Array.isArray(field.column)) keywords.push(...field.column);
      else keywords.push(field.column);
    });
  });

  return keywords.map((k) => String(k).toLowerCase().trim());
}

/**
 * Scans the CSV grid to find the most likely header row based on dynamic keywords.
 * @param {Array[]} grid - Raw CSV data as array of arrays.
 * @param {string[]} keywords - Keywords to look for.
 */
function getHeaderInfo(grid, keywords) {
  let bestRowIndex = 0;
  let maxMatches = 0;

  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const matches = grid[i].filter((cell) => {
      if (!cell) return false;
      const normalizedCell = String(cell).toLowerCase().trim();
      return keywords.includes(normalizedCell);
    }).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestRowIndex = i;
    }
  }
  return bestRowIndex;
}

/**
 * Internal helper to fetch and parse a single URL.
 */
async function fetchSource(source, mapping) {
  // 1. Generate keywords from the actual config mapping
  const keywords = getKeywordsFromMapping(mapping);

  return new Promise((resolve, reject) => {
    Papa.parse(source.url, {
      download: true,
      header: false,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const grid = results.data;
        if (!grid || grid.length === 0) return resolve([]);

        // 2. Find header row using dynamic keywords
        const headerIndex = getHeaderInfo(grid, keywords);
        const headers = grid[headerIndex].map((h) => String(h || "").trim());

        console.log(
          `[API] Source "${source.id}": Headers detected at row ${headerIndex + 1} using mapping keys.`,
        );

        const data = grid.slice(headerIndex + 1).map((row) => {
          const obj = {};
          headers.forEach((header, i) => {
            if (header) obj[header] = row[i];
          });
          return obj;
        });

        const normalized = data
          .map((row) => normalizeCatData(row, mapping))
          .filter((cat) => cat.primary.id);

        resolve(normalized);
      },
      error: (err) => {
        console.error(`[API] Error in source ${source.id}:`, err);
        resolve([]);
      },
    });
  });
}

/**
 * Fetches and parses CSV data for a specific clan using PapaParse.
 * Retrieves the URL from AppConfig and normalizes the raw data.
 *
 * @param {string} clanId - The identifier of the clan from AppConfig.
 * @returns {Promise<Array>} A promise that resolves to an array of normalized cat objects.
 */
export async function fetchClanData(clanId) {
  const clanConfig = AppConfig.clans[clanId];
  const sources = clanConfig.sources || [
    { id: "default", url: clanConfig.csvUrl },
  ];

  const results = await Promise.all(
    sources.map((s) => fetchSource(s, clanConfig.mapping)),
  );

  const uniqueCats = [];
  const seenIds = new Set();

  results.flat().forEach((cat) => {
    const id = String(cat.primary.id).trim();
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      uniqueCats.push(cat);
    }
  });

  return uniqueCats;
}
