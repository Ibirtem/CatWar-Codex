import { fetchClanData } from "./api.js";
import { AppConfig } from "./config.js";

export const Store = {
  _data: {},
  _loadingPromises: {},
  _lastFetch: {},
  _searchIndex: {},

  CACHE_TTL: 5 * 60 * 1000,

  /**
   * Loads clan data. Uses in-memory cache with TTL.
   * Concurrent requests for the same clan share a single Promise
   * instead of polling with setInterval.
   */
  async getClanData(clanId, forceRefresh = false) {
    const now = Date.now();
    const hasValidCache =
      this._data[clanId] && now - this._lastFetch[clanId] < this.CACHE_TTL;

    if (hasValidCache && !forceRefresh) {
      return this._data[clanId];
    }

    if (this._loadingPromises[clanId]) {
      return this._loadingPromises[clanId];
    }

    this._loadingPromises[clanId] = (async () => {
      try {
        const mergedData = await fetchClanData(clanId);
        this._data[clanId] = mergedData;
        this._lastFetch[clanId] = Date.now();
        this._buildSearchIndex(clanId);
        return mergedData;
      } finally {
        delete this._loadingPromises[clanId];
      }
    })();

    return this._loadingPromises[clanId];
  },

  /**
   * Builds a flat search index for fast filtering.
   * Called once after data load — concatenates all searchable fields
   * into a single lowercase string per cat.
   */
  _buildSearchIndex(clanId) {
    const clanConfig = AppConfig.clans[clanId];
    const searchKeys = clanConfig.mapping.searchableFields;

    this._searchIndex[clanId] = this._data[clanId].map((cat, i) => {
      const parts = searchKeys.map((key) => {
        const primary = cat.primary[key];
        if (primary) return String(primary);
        for (const section of cat.sections) {
          const field = section.fields.find((f) => f.key === key);
          if (field) return String(field.value);
        }
        return "";
      });

      return { index: i, text: parts.join(" ").toLowerCase() };
    });

    console.log(
      `[Store] Search index built for "${clanId}": ${this._searchIndex[clanId].length} entries`,
    );
  },

  /**
   * @param {string} clanId - The ID of the clan.
   * @param {string} query - The search query.
   * @returns {Array} Filtered list of cats.
   */
  searchCats(clanId, query) {
    const data = this._data[clanId];
    if (!data || !query) return data || [];

    const lowerQuery = query.toLowerCase();
    const index = this._searchIndex[clanId];

    if (!index) {
      this._buildSearchIndex(clanId);
    }

    return this._searchIndex[clanId]
      .filter((entry) => entry.text.includes(lowerQuery))
      .map((entry) => data[entry.index]);
  },
};
