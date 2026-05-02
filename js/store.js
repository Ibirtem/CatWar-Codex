import { fetchClanData, fetchSupplement, fetchClanTree } from "./api.js";
import { AppConfig } from "./config.js";

export const Store = {
  _data: {},
  _loadingPromises: {},
  _lastFetch: {},
  _searchIndex: {},

  _treeData: {},
  _treeLoadingPromises: {},

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

        const clanConfig = AppConfig.clans[clanId];
        if (clanConfig.supplements && clanConfig.supplements.length > 0) {
          await this._mergeSupplements(mergedData, clanConfig.supplements);
        }

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

  /**
   * Retrieves and prepares Family Tree data.
   * Merges data from the CSV tree with the main chronicle table to obtain names/avatars.
   */
  async getTreeData(clanId, forceRefresh = false) {
    if (this._treeData[clanId] && !forceRefresh) {
      return this._treeData[clanId];
    }

    if (this._treeLoadingPromises[clanId]) {
      return this._treeLoadingPromises[clanId];
    }

    this._treeLoadingPromises[clanId] = (async () => {
      try {
        await this.getClanData(clanId, forceRefresh);

        const clanConfig = AppConfig.clans[clanId];
        if (!clanConfig.tree || !clanConfig.tree.url) {
          return new Map();
        }

        const rawTreeNodes = await fetchClanTree(clanConfig.tree);
        const mainRoster = this._data[clanId] || [];

        const rosterMap = new Map();
        mainRoster.forEach((cat) => rosterMap.set(String(cat.primary.id), cat));

        const treeMap = new Map();

        const getCatInfo = (id, forcedName) => {
          if (forcedName) return { name: forcedName, avatar: null };
          const rosterCat = rosterMap.get(id);
          if (rosterCat) {
            return {
              name: rosterCat.primary.name,
              avatar: rosterCat.primary.avatarUrl,
              fallbackAvatar: rosterCat._avatarFallback,
            };
          }
          return { name: `Кот #${id}`, avatar: null };
        };

        rawTreeNodes.forEach((node) => {
          const info = getCatInfo(node.id, node.forcedName);
          treeMap.set(node.id, {
            id: node.id,
            name: info.name,
            avatarUrl: node.avatarUrl || info.avatar,
            fallbackAvatar: info.fallbackAvatar || "assets/default-cat.png",
            birthDate: node.birthDate,
            motherId: node.motherId,
            fatherId: node.fatherId,
            isPhantom: false,
          });
        });

        const addPhantomParent = (parentId, forcedName, parentBirthDate) => {
          if (!parentId || treeMap.has(parentId)) return;
          const info = getCatInfo(parentId, forcedName);
          treeMap.set(parentId, {
            id: parentId,
            name: info.name,
            avatarUrl: info.avatar,
            fallbackAvatar: info.fallbackAvatar || "assets/default-cat.png",
            birthDate: parentBirthDate,
            motherId: "",
            fatherId: "",
            isPhantom: true,
          });
        };

        rawTreeNodes.forEach((node) => {
          addPhantomParent(
            node.motherId,
            node.forcedMotherName,
            node.motherBirthDate,
          );
          addPhantomParent(
            node.fatherId,
            node.forcedFatherName,
            node.fatherBirthDate,
          );
        });

        this._treeData[clanId] = treeMap;
        return treeMap;
      } finally {
        delete this._treeLoadingPromises[clanId];
      }
    })();

    return this._treeLoadingPromises[clanId];
  },

  /**
   * Fetches all supplement tables and merges their data into cats
   * by matching IDs. Each supplement field is injected into
   * the target section defined in config.
   */
  async _mergeSupplements(cats, supplements) {
    const supplementMaps = await Promise.all(
      supplements.map((s) => fetchSupplement(s)),
    );

    cats.forEach((cat) => {
      const catId = String(cat.primary.id).trim();

      supplements.forEach((supplementDef, i) => {
        const dataMap = supplementMaps[i];
        const supplementData = dataMap.get(catId);
        if (!supplementData) return;

        supplementDef.fields.forEach((fieldDef) => {
          const value = supplementData[fieldDef.key];
          if (!value) return;

          const targetTitle = fieldDef.targetSection;
          let section = cat.sections.find((s) => s.title === targetTitle);
          if (!section) {
            section = { title: targetTitle, fields: [] };
            cat.sections.push(section);
          }

          const exists = section.fields.some((f) => f.key === fieldDef.key);
          if (!exists) {
            section.fields.push({
              key: fieldDef.key,
              label: fieldDef.label || fieldDef.key,
              value: value,
              display: fieldDef.display || "text",
              icon: fieldDef.icon || null,
            });
          }
        });
      });
    });

    console.debug(
      `[Store] ${supplements.length} supplement(s) merged into ${cats.length} cats.`,
    );
  },
};
