import type { LayoutNode, TraversalData, LayoutResult } from "./types";

const LAYER_HEIGHT = 160;
const NODE_WIDTH = 260;
const COMPONENT_GAP_X = 400;

export function layoutDag(
    nodes: LayoutNode[],
    traversal: Record<string, TraversalData>,
    degree: Record<string, number>
  ): LayoutResult {
    const components = new Map<string, LayoutNode[]>();
  
     // Split normal vs orphan
    const orphanNodes: LayoutNode[] = [];
    const nonorphanNodes: LayoutNode[] = [];

    for (const node of nodes) {
      if ((degree[node.id] ?? 0) === 0) {
        orphanNodes.push(node);
      } else {
        nonorphanNodes.push(node);
      }
    }

    //  Group by component
    for (const node of nonorphanNodes) {
      const td = traversal[node.id];
      if (!td) continue;
  
      if (!components.has(td.componentID)) {
        components.set(td.componentID, []);
      }
      components.get(td.componentID)!.push(node);
    }
  
   
    const normalComponents = Array.from(components.values());

  
    const positions: LayoutResult["positions"] = {};
    let componentIndex = 0;
  
    // 3. Layout normal components
    for (const componentNodes of normalComponents) {
      const layers = new Map<number, LayoutNode[]>();
  
      for (const node of componentNodes) {
        const depth = traversal[node.id].depth;
        if (!layers.has(depth)) layers.set(depth, []);
        layers.get(depth)!.push(node);
      }
  
      const depths = Array.from(layers.keys()).sort((a, b) => a - b);
  
      let maxLayerSize = 0;
      for (const layer of layers.values()) {
        maxLayerSize = Math.max(maxLayerSize, layer.length);
      }
  
      const componentBaseX = componentIndex * COMPONENT_GAP_X;
      const componentWidth = (maxLayerSize - 1) * NODE_WIDTH;
  
      for (const depth of depths) {
        const layer = layers.get(depth)!;
        const centerOffset = (layer.length - 1) / 2;
  
        layer.forEach((node, index) => {
          positions[node.id] = {
            x:
              componentBaseX +
              componentWidth / 2 +
              (index - centerOffset) * NODE_WIDTH,
            y: depth * LAYER_HEIGHT,
          };
        });
      }
  
      componentIndex++;
    }
  
    // 4. Layout orphans (once)
    const ORPHAN_COLUMNS = 6;
    const ORPHAN_START_Y = 1000;
  
    orphanNodes.forEach((node, i) => {
      positions[node.id] = {
        x: (i % ORPHAN_COLUMNS) * NODE_WIDTH,
        y: ORPHAN_START_Y + Math.floor(i / ORPHAN_COLUMNS) * LAYER_HEIGHT,
      };
    });
    console.log(
        "normalComponents",
        normalComponents.map(c => c.map(n => n.id))
      );
    console.log(
        "orphanNodes",
        orphanNodes.map(n => n.id)
      );
      
  
    return { positions };
  }
  