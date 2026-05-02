export const TreeLayout = {
  config: {
    nodeWidth: 140,
    nodeHeight: 220,
    siblingSpacing: 50,
    layerSpacing: 100,
    virtualWidth: 20,
  },

  /**
   * The main method for building the graph. Performs steps in a pipeline.
   */
  build(treeDataMap) {
    if (!treeDataMap || treeDataMap.size === 0) {
      return { nodes: [], edges: [], layerLabels: [] };
    }

    const nodes = this._initNodes(treeDataMap);

    this._assignChronologicalLayers(nodes);
    this._applyTopologicalGravity(nodes);

    const { denseLayers, layerLabels } = this._compactLayers(nodes);
    const { layoutNodes, edges } = this._routeEdges(nodes, denseLayers);

    this._calculateCoordinates(denseLayers, layoutNodes);

    const finalLabels = layerLabels.map((text, i) => ({
      text,
      y: i * (this.config.nodeHeight + this.config.layerSpacing),
    }));

    return {
      nodes: Array.from(layoutNodes.values()).filter((n) => !n.isVirtual),
      edges,
      layerLabels: finalLabels,
    };
  },

  _initNodes(treeDataMap) {
    const nodes = new Map();
    treeDataMap.forEach((cat) => {
      nodes.set(cat.id, {
        ...cat,
        ts: this._parseDate(cat.birthDate),
        parents: [cat.motherId, cat.fatherId].filter((id) =>
          treeDataMap.has(id),
        ),
        children: [],
        layer: 0,
        x: 0,
        y: 0,
        width: this.config.nodeWidth,
        height: this.config.nodeHeight,
      });
    });
    nodes.forEach((n) =>
      n.parents.forEach((pId) => nodes.get(pId).children.push(n.id)),
    );
    return nodes;
  },

  _assignChronologicalLayers(nodes) {
    const timestamps = [];
    nodes.forEach((n) => {
      if (n.ts) timestamps.push(n.ts);
    });
    const getYM = (ts) => {
      const d = new Date(ts);
      return d.getFullYear() * 12 + d.getMonth();
    };
    const uniqueMonths = Array.from(new Set(timestamps.map(getYM))).sort(
      (a, b) => a - b,
    );

    nodes.forEach(
      (n) => (n.layer = n.ts ? uniqueMonths.indexOf(getYM(n.ts)) : 0),
    );
  },

  _applyTopologicalGravity(nodes) {
    let changed = true;
    let limit = 1000;
    while (changed && limit > 0) {
      changed = false;
      limit--;
      nodes.forEach((n) => {
        let maxPLayer = -1;
        n.parents.forEach((pId) => {
          const p = nodes.get(pId);
          if (p && p.layer > maxPLayer) maxPLayer = p.layer;
        });
        if (n.parents.length > 0 && n.layer <= maxPLayer) {
          n.layer = maxPLayer + 1;
          changed = true;
        }
      });
    }
  },

  _compactLayers(nodes) {
    const rawLayers = [];
    nodes.forEach((n) => {
      if (!rawLayers[n.layer]) rawLayers[n.layer] = [];
      rawLayers[n.layer].push(n);
    });

    const denseLayers = rawLayers.filter((l) => l && l.length > 0);
    const layerLabels = [];

    denseLayers.forEach((layerArr, i) => {
      layerArr.forEach((n) => (n.layer = i));
      layerArr.sort((a, b) => (a.ts || 0) - (b.ts || 0));

      const layerTs = layerArr.map((n) => n.ts).filter(Boolean);
      if (layerTs.length > 0) {
        const d = new Date(Math.min(...layerTs));
        const month = String(d.getMonth() + 1).padStart(2, "0");
        layerLabels.push(`${month}.${d.getFullYear()}`);
      } else {
        layerLabels.push("Древние");
      }
    });
    return { denseLayers, layerLabels };
  },

  _routeEdges(nodes, denseLayers) {
    const layoutNodes = new Map();
    nodes.forEach((n) => {
      layoutNodes.set(n.id, {
        ...n,
        layoutParents: [...n.parents],
        layoutChildren: [...n.children],
      });
    });

    for (let i = 0; i < denseLayers.length; i++) {
      for (let j = 0; j < denseLayers[i].length; j++) {
        denseLayers[i][j] = layoutNodes.get(denseLayers[i][j].id);
      }
    }

    const edges = [];
    nodes.forEach((origNode) => {
      origNode.children.forEach((cId) => {
        const pLayout = layoutNodes.get(origNode.id);
        const cLayout = layoutNodes.get(cId);
        if (!cLayout) return;

        const route = [pLayout];
        let currentP = pLayout;

        for (let l = pLayout.layer + 1; l < cLayout.layer; l++) {
          const vId = `v_${origNode.id}_${cId}_${l}`;
          const vNode = {
            id: vId,
            isVirtual: true,
            layer: l,
            layoutParents: [currentP.id],
            layoutChildren: [],
            x: 0,
            y: 0,
            idealX: 0,
            width: this.config.virtualWidth,
            height: this.config.nodeHeight,
          };
          layoutNodes.set(vId, vNode);
          denseLayers[l].push(vNode);

          currentP.layoutChildren = currentP.layoutChildren.filter(
            (id) => id !== cId,
          );
          currentP.layoutChildren.push(vId);
          route.push(vNode);
          currentP = vNode;
        }

        if (currentP.id !== pLayout.id) {
          currentP.layoutChildren.push(cLayout.id);
          cLayout.layoutParents = cLayout.layoutParents.filter(
            (id) => id !== pLayout.id,
          );
          cLayout.layoutParents.push(currentP.id);
        }

        route.push(cLayout);
        edges.push({ source: origNode.id, target: cId, path: route });
      });
    });
    return { layoutNodes, edges };
  },

  _calculateCoordinates(denseLayers, layoutNodes) {
    const getSpacing = (n) => (n.isVirtual ? 10 : this.config.siblingSpacing);

    denseLayers.forEach((layer) => {
      let x = 0;
      layer.forEach((n) => {
        n.x = x;
        x += n.width + getSpacing(n);
      });
    });

    for (let iter = 0; iter < 8; iter++) {
      for (let l = 1; l < denseLayers.length; l++) {
        this._centerNodesToParents(denseLayers[l], layoutNodes);
      }
      for (let l = denseLayers.length - 2; l >= 0; l--) {
        this._centerNodesToChildren(denseLayers[l], layoutNodes);
      }
    }

    denseLayers.forEach((layer) => {
      const minX = Math.min(...layer.map((n) => n.x));
      const maxX = Math.max(...layer.map((n) => n.x + n.width));
      const layerWidth = maxX - minX;
      const offset = -minX - layerWidth / 2;
      layer.forEach((n) => (n.x += offset));
    });

    denseLayers.forEach((layerArr, i) => {
      layerArr.forEach(
        (n) => (n.y = i * (this.config.nodeHeight + this.config.layerSpacing)),
      );
    });
  },

  _centerNodesToParents(layer, layoutNodes) {
    layer.forEach((n) => {
      if (n.layoutParents.length > 0) {
        const avgParentX =
          n.layoutParents.reduce((sum, pId) => {
            const p = layoutNodes.get(pId);
            return sum + p.x + p.width / 2;
          }, 0) / n.layoutParents.length;
        n.x = avgParentX - n.width / 2;
      }
    });
    this._resolveOverlaps(layer);
  },

  _centerNodesToChildren(layer, layoutNodes) {
    layer.forEach((n) => {
      if (n.layoutChildren.length > 0) {
        const avgChildX =
          n.layoutChildren.reduce((sum, cId) => {
            const c = layoutNodes.get(cId);
            return sum + c.x + c.width / 2;
          }, 0) / n.layoutChildren.length;
        n.x = avgChildX - n.width / 2;
      }
    });
    this._resolveOverlaps(layer);
  },

  _resolveOverlaps(layer) {
    const spacing = this.config.siblingSpacing;
    layer.sort((a, b) => a.x - b.x);
    for (let i = 1; i < layer.length; i++) {
      const prev = layer[i - 1];
      const curr = layer[i];
      const minDistance =
        prev.width + (prev.isVirtual || curr.isVirtual ? 10 : spacing);
      if (curr.x < prev.x + minDistance) {
        curr.x = prev.x + minDistance;
      }
    }
  },

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(".");
    if (parts.length === 3) {
      const ts = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      return isNaN(ts) ? null : ts;
    }
    return null;
  },
};
