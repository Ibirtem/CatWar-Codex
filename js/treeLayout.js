export const TreeLayout = {
  config: {
    nodeWidth: 140,
    nodeHeight: 220,
    siblingSpacing: 50,
    layerSpacing: 100,
    virtualWidth: 10,
  },

  build(treeDataMap) {
    if (!treeDataMap || treeDataMap.size === 0) {
      return { nodes: [], edges: [], layerLabels: [] };
    }

    const nodes = this._initNodes(treeDataMap);
    this._assignChronologicalLayers(nodes);
    this._applyTopologicalGravity(nodes);

    const { denseLayers, layerLabels } = this._compactLayers(nodes);
    const { layoutNodes, edges } = this._routeEdges(nodes, denseLayers);

    this._minimizeCrossings(denseLayers, layoutNodes);
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

    nodes.forEach((n) => {
      const idx = n.ts ? uniqueMonths.indexOf(getYM(n.ts)) : 0;
      n.layer = idx < 0 ? 0 : idx;
    });
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
    const layerGroups = new Map();
    nodes.forEach((n) => {
      if (!layerGroups.has(n.layer)) layerGroups.set(n.layer, []);
      layerGroups.get(n.layer).push(n);
    });

    const sortedLayerKeys = Array.from(layerGroups.keys()).sort(
      (a, b) => a - b,
    );
    const denseLayers = sortedLayerKeys.map((key) => layerGroups.get(key));
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

  _minimizeCrossings(denseLayers, layoutNodes) {
    denseLayers.forEach((layer) => layer.forEach((n, i) => (n.order = i)));

    for (let iter = 0; iter < 8; iter++) {
      for (let l = 1; l < denseLayers.length; l++) {
        denseLayers[l].forEach((n) => {
          if (n.layoutParents.length > 0) {
            n.barycenter =
              n.layoutParents.reduce(
                (sum, pId) => sum + layoutNodes.get(pId).order,
                0,
              ) / n.layoutParents.length;
          } else {
            n.barycenter = n.order;
          }
        });
        denseLayers[l].sort((a, b) => a.barycenter - b.barycenter);
        denseLayers[l].forEach((n, i) => (n.order = i));
      }

      for (let l = denseLayers.length - 2; l >= 0; l--) {
        denseLayers[l].forEach((n) => {
          if (n.layoutChildren.length > 0) {
            n.barycenter =
              n.layoutChildren.reduce(
                (sum, cId) => sum + layoutNodes.get(cId).order,
                0,
              ) / n.layoutChildren.length;
          } else {
            n.barycenter = n.order;
          }
        });
        denseLayers[l].sort((a, b) => a.barycenter - b.barycenter);
        denseLayers[l].forEach((n, i) => (n.order = i));
      }
    }
  },

  _calculateCoordinates(denseLayers, layoutNodes) {
    const getMinSpace = (a, b) => {
      if (a.isVirtual && b.isVirtual) return 18;
      if (!a.isVirtual && !b.isVirtual) return this.config.siblingSpacing;
      return 30;
    };

    denseLayers.forEach((layer) => {
      let cx = 0;
      layer.forEach((n) => {
        n.cx = cx;
        cx += n.width + this.config.siblingSpacing;
      });
    });

    for (let iter = 0; iter < 30; iter++) {
      layoutNodes.forEach((n) => {
        let idealX = n.cx;
        let pX = 0,
          cX = 0;

        if (n.layoutParents.length > 0) {
          pX =
            n.layoutParents.reduce(
              (sum, pId) => sum + layoutNodes.get(pId).cx,
              0,
            ) / n.layoutParents.length;
        }
        if (n.layoutChildren.length > 0) {
          cX =
            n.layoutChildren.reduce(
              (sum, cId) => sum + layoutNodes.get(cId).cx,
              0,
            ) / n.layoutChildren.length;
        }

        if (n.layoutParents.length > 0 && n.layoutChildren.length > 0) {
          idealX = (pX + cX) / 2;
        } else if (n.layoutParents.length > 0) {
          idealX = pX;
        } else if (n.layoutChildren.length > 0) {
          idealX = cX;
        }

        n.cx += (idealX - n.cx) * 0.5;
      });

      denseLayers.forEach((layer) => {
        for (let i = 1; i < layer.length; i++) {
          const prev = layer[i - 1];
          const curr = layer[i];
          const reqSpace =
            prev.width / 2 + curr.width / 2 + getMinSpace(prev, curr);
          const dist = curr.cx - prev.cx;

          if (dist < reqSpace) {
            const overlap = reqSpace - dist;
            prev.cx -= overlap / 2;
            curr.cx += overlap / 2;
          }
        }

        for (let i = layer.length - 2; i >= 0; i--) {
          const curr = layer[i];
          const next = layer[i + 1];
          const reqSpace =
            curr.width / 2 + next.width / 2 + getMinSpace(curr, next);
          const dist = next.cx - curr.cx;

          if (dist < reqSpace) {
            const overlap = reqSpace - dist;
            curr.cx -= overlap / 2;
            next.cx += overlap / 2;
          }
        }
      });
    }

    layoutNodes.forEach((n) => {
      n.x = n.cx - n.width / 2;
    });

    denseLayers.forEach((layerArr, i) => {
      layerArr.forEach(
        (n) => (n.y = i * (this.config.nodeHeight + this.config.layerSpacing)),
      );
    });
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
