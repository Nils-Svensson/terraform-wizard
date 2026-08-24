import type { LayoutNode, LayoutResult, LayoutFn } from "./types";

const NODE_WIDTH   = 200;
const NODE_GAP_X   = 220;  // horizontal spacing between nodes in the same layer
const LAYER_HEIGHT = 120;  // vertical spacing between depth levels
const COMP_GAP_X   = 80;   // horizontal gap between components in the same row
const COMP_GAP_Y   = 160;  // vertical gap between component rows

export const layoutDag: LayoutFn = (
  nodes,
  { traversalData, orphanNodes, components, parents },
  { width }
) => {
  // Allow rows to use 2.5× the viewport width before wrapping; floor at 4000px
  // so large multi-component graphs spread horizontally instead of stacking vertically.
  const MAX_ROW_WIDTH = Math.max(4000, width * 2.5);
  const positions: LayoutResult["positions"] = {};
  const nodeMap   = new Map(nodes.map(n => [n.id, n]));
  const orphanSet = new Set(orphanNodes);

  function buildLayers(componentNodes: LayoutNode[]) {
    const layers = new Map<number, LayoutNode[]>();
    for (const node of componentNodes) {
      const depth = traversalData[node.id]?.depth ?? 0;
      if (!layers.has(depth)) layers.set(depth, []);
      layers.get(depth)!.push(node);
    }
    return Array.from(layers.entries())
      .sort(([a], [b]) => a - b)
      .map(([depth, nodes]) => ({ depth, nodes }));
  }

  function orderLayer(layer: LayoutNode[], prevLayer: LayoutNode[] | undefined) {
    if (!prevLayer) return [...layer].sort((a, b) => a.id.localeCompare(b.id));
    const prevIndex = new Map(prevLayer.map((n, i) => [n.id, i]));
    return [...layer].sort((a, b) => {
      const pa = parents[a.id] ?? [];
      const pb = parents[b.id] ?? [];
      const avgA = pa.length === 0
        ? Number.MAX_SAFE_INTEGER
        : pa.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / pa.length;
      const avgB = pb.length === 0
        ? Number.MAX_SAFE_INTEGER
        : pb.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / pb.length;
      return avgA !== avgB ? avgA - avgB : a.id.localeCompare(b.id);
    });
  }

  // Layout each component locally (origin at 0,0), return its bounding box
  type ComponentLayout = {
    localPositions: Record<string, { x: number; y: number }>;
    width: number;
    height: number;
  };

  function layoutComponent(componentNodes: LayoutNode[]): ComponentLayout {
    const local: Record<string, { x: number; y: number }> = {};
    const layers = buildLayers(componentNodes);
    const maxLayerSize = Math.max(...layers.map(l => l.nodes.length));
    const compWidth = Math.max(NODE_WIDTH, (maxLayerSize - 1) * NODE_GAP_X + NODE_WIDTH);
    let maxDepth = 0;
    let prevLayer: LayoutNode[] | undefined;

    for (const { depth, nodes: rawLayer } of layers) {
      const layer     = orderLayer(rawLayer, prevLayer);
      const totalW    = (layer.length - 1) * NODE_GAP_X + NODE_WIDTH;
      const startX    = compWidth / 2 - totalW / 2;
      layer.forEach((node, i) => {
        local[node.id] = { x: startX + i * NODE_GAP_X, y: depth * LAYER_HEIGHT };
      });
      maxDepth  = Math.max(maxDepth, depth);
      prevLayer = layer;
    }

    return {
      localPositions: local,
      width:  compWidth,
      height: maxDepth * LAYER_HEIGHT + LAYER_HEIGHT,
    };
  }

  // Arrange components in wrapped rows
  const sortedCompIDs = Object.keys(components).sort();
  let rowX       = 0;
  let rowY       = 0;
  let rowMaxH    = 0;

  for (const compID of sortedCompIDs) {
    const ids = components[compID];
    if (ids.length <= 1) continue;

    const compNodes = ids
      .filter(id => !orphanSet.has(id))
      .map(id => nodeMap.get(id))
      .filter(Boolean) as LayoutNode[];
    if (compNodes.length === 0) continue;

    const { localPositions, width, height } = layoutComponent(compNodes);

    // Wrap to a new row if this component would overflow the max width
    if (rowX > 0 && rowX + width > MAX_ROW_WIDTH) {
      rowY    += rowMaxH + COMP_GAP_Y;
      rowX    =  0;
      rowMaxH =  0;
    }

    // Translate local positions to global
    for (const [id, pos] of Object.entries(localPositions)) {
      positions[id] = { x: rowX + pos.x, y: rowY + pos.y };
    }

    rowX    += width + COMP_GAP_X;
    rowMaxH  = Math.max(rowMaxH, height);
  }

  // Orphans in a compact grid below everything
  const orphanStartY = rowY + rowMaxH + COMP_GAP_Y;
  const ORPHAN_COLS  = 8;

  orphanNodes.forEach((id, i) => {
    positions[id] = {
      x: (i % ORPHAN_COLS) * NODE_GAP_X,
      y: orphanStartY + Math.floor(i / ORPHAN_COLS) * LAYER_HEIGHT,
    };
  });

  return { positions };
};
