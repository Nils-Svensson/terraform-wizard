import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";

import TerraformNode from "./TerraformNode";
import { CATEGORY_META } from "./categories";
import ModuleContainerNode from "./ModuleContainerNode";
import CircularModuleContainerNode from "./CircularModuleContainerNode";
import "@xyflow/react/dist/style.css";
import type { ResourceLocation, TerraformNodeData } from "./TerraformNodeData";
import type { TraversalData } from "../layout/types";
import { layouts, type LayoutType } from "../layout";
import CircularNode from "./CompactCircularNode";
import FloatingEdge from "./FloatingEdge";

/* =====================
   Backend graph types
   ===================== */

export interface BackendNode {
  id: string;
  type: string;
  name: string;
  displayname?: string;
  provider?: string;
  region?: string;
  category: string;
  attr?: Record<string, string>;
  location?: ResourceLocation;
  occurrencecount: number;
  instancecount?: number | null;
  foreach: boolean;
  modulepath?: string;
  filepath?: string;
  line?: number;
}

interface BackendEdge {
  from: string;
  to: string;
}

export interface BackendGraph {
  graph: {
    nodes: BackendNode[];
    edges: BackendEdge[];
  };
  analysis: {
    traversalData: Record<string, TraversalData>;
    degree: Record<string, number>;
    orphanNodes: string[];
    roots: Record<string, string[]>;
    totalNodes: number;
    nodesByComponent: Record<string, number>;
    components: Record<string, string[]>;
    maxDepth: Record<string, number>;
    parents: Record<string, string[]>;
  };
}

/* =====================
   GraphWindow
   ===================== */

const nodeTypesByLayout: Record<LayoutType, NodeTypes> = {
  dag:    { terraform: TerraformNode,  moduleContainer: ModuleContainerNode },
  radial: { terraform: CircularNode,   moduleContainer: ModuleContainerNode, circularModuleContainer: CircularModuleContainerNode },
};

type Highlight = "normal" | "selected" | "connected" | "dimmed";

interface Props {
  graphData: BackendGraph | null;
  layoutType: LayoutType;
  activeCategories: Set<string>;
  selectedNodeId?: string | null;
  blastRadius?: Set<string>;
  searchMatches?: Set<string> | null;
  onNodeSelect?: (nodeId: string | null) => void;
  isDark?: boolean;
}

export default function GraphWindow({
  graphData,
  layoutType,
  activeCategories,
  selectedNodeId,
  blastRadius,
  searchMatches,
  onNodeSelect,
  isDark = true,
}: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Reset expansion when graph data or layout type changes
  useEffect(() => { setExpandedModules(new Set()); }, [graphData, layoutType]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store viewport size in a ref so sidebar resize events never re-trigger the layout.
  // The layout runs once on first measurement and again when graphData/layoutType change.
  const viewportSizeRef = useRef({ width: 800, height: 600 });
  const [hasInitialViewport, setHasInitialViewport] = useState(false);

  const activeNodeTypes = useMemo(() => nodeTypesByLayout[layoutType], [layoutType]);
  const edgeTypes = useMemo(() => ({ floating: FloatingEdge }), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0) {
        viewportSizeRef.current = { width: rect.width, height: rect.height };
        // Flip the flag once so the layout effect runs for the first time.
        // After that, resize events update the ref without triggering re-renders.
        setHasInitialViewport(v => v ? v : true);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Convert backend graph → XYFlow nodes/edges whenever data or layout changes.
  // Sidebar/panel resize no longer triggers this — only graphData and layoutType do.
  useEffect(() => {
    if (!graphData || !graphData.analysis || !hasInitialViewport) return;

    const layoutFn = layouts[layoutType];
    const layout = layoutFn(
      graphData.graph.nodes.map(n => ({ id: n.id })),
      graphData.analysis,
      viewportSizeRef.current
    );

    // Compute in/out degree alongside edge mapping (single pass over edges)
    const inDeg  = new Map<string, number>();
    const outDeg = new Map<string, number>();
    const rfEdges: Edge[] = graphData.graph.edges.map((e, i) => {
      outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1);
      inDeg.set(e.to,   (inDeg.get(e.to)   ?? 0) + 1);
      return {
        id: `edge-${i}`,
        source: e.from,
        target: e.to,
        type: layoutType === "radial" ? "floating" : "default",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      };
    });

    const rfNodes: Node[] = graphData.graph.nodes.map(n => ({
      id: n.id,
      type: "terraform",
      position: layout.positions[n.id] ?? { x: 0, y: 0 },
      data: {
        name: n.name,
        displayName: n.displayname ?? undefined,
        resourceType: n.type,
        provider: n.provider,
        attributes: n.attr,
        category: n.category,
        occurrenceCount: n.occurrencecount,
        instanceCount: n.instancecount ?? undefined,
        expanded: false,
        forEach: n.foreach ?? false,
        location: n.location,
        filePath: n.filepath,
        lineNumber: n.line,
        deps:       inDeg.get(n.id)  ?? 0,  // edges IN = things this node depends on
        dependents: outDeg.get(n.id) ?? 0,  // edges OUT = things that depend on this
      },
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graphData, layoutType, hasInitialViewport]);

  // Category filter — nodes matching any active category
  const selectedByCategory = useMemo(() => {
    const s = new Set<string>();
    for (const node of nodes) {
      const data = node.data as unknown as TerraformNodeData;
      if (activeCategories.has(data.category)) s.add(node.id);
    }
    return s;
  }, [nodes, activeCategories]);

  // Module membership: which non-module resource belongs to which module node.
  // Matched by comparing dirname(resource.filepath) against module.displayname (source path).
  const moduleMembership = useMemo<Map<string, string>>(() => {
    if (!graphData) return new Map();
    const membership = new Map<string, string>();
    for (const mod of graphData.graph.nodes.filter(n => n.category === "module")) {
      const src = (mod.displayname ?? "").replace(/^\.\//, "").replace(/\/$/, "");
      if (!src) continue;
      for (const node of graphData.graph.nodes) {
        if (node.category === "module" || !node.filepath) continue;
        const dir = node.filepath.includes("/")
          ? node.filepath.split("/").slice(0, -1).join("/")
          : "";
        if (dir === src || dir.endsWith("/" + src)) {
          membership.set(node.id, mod.id);
        }
      }
    }
    return membership;
  }, [graphData]);

  const moduleMemberCounts = useMemo<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const modId of moduleMembership.values()) {
      counts.set(modId, (counts.get(modId) ?? 0) + 1);
    }
    return counts;
  }, [moduleMembership]);

  const toggleModuleExpand = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  }, []);

  // Child grid layout inside each expanded module container
  const CHILD_W = 200, CHILD_H = 90, CHILD_GAP_X = 22, CHILD_GAP_Y = 18, PAD = 26, HEADER_H = 48;

  const moduleChildLayouts = useMemo(() => {
    const result = new Map<string, {
      childPositions: Map<string, { x: number; y: number }>;
      containerW: number;
      containerH: number;
    }>();

    for (const modId of expandedModules) {
      const members = graphData?.graph.nodes.filter(n => moduleMembership.get(n.id) === modId) ?? [];
      if (members.length === 0) {
        result.set(modId, { childPositions: new Map(), containerW: 200, containerH: HEADER_H + PAD * 2 });
        continue;
      }
      const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)));
      const rows = Math.ceil(members.length / cols);
      const childPositions = new Map<string, { x: number; y: number }>();
      members.forEach((n, i) => {
        childPositions.set(n.id, {
          x: PAD + (i % cols) * (CHILD_W + CHILD_GAP_X),
          y: HEADER_H + (Math.floor(i / cols)) * (CHILD_H + CHILD_GAP_Y),
        });
      });
      result.set(modId, {
        childPositions,
        containerW: PAD * 2 + cols * (CHILD_W + CHILD_GAP_X) - CHILD_GAP_X,
        containerH: HEADER_H + rows * (CHILD_H + CHILD_GAP_Y) + PAD,
      });
    }
    return result;
  }, [expandedModules, moduleMembership, graphData]);

  // Circular subgraph layout — used for module expansion in radial mode.
  // Runs layoutRadial on the subgraph of each expanded module's members.
  // NODE_R must match NODE_DIAMETER/2 from radialDag.ts (244/2 = 122).
  const CIRC_NODE_R  = 122;
  const CIRC_PADDING = 44;
  const CIRC_PILOT   = 600; // pilot canvas size; layout is re-centered after

  const circularModuleChildLayouts = useMemo(() => {
    const result = new Map<string, {
      childPositions: Map<string, { x: number; y: number }>;
      containerSize: number;
    }>();

    if (layoutType !== "radial" || !graphData) return result;

    for (const modId of expandedModules) {
      const members = graphData.graph.nodes.filter(n => moduleMembership.get(n.id) === modId);
      if (members.length === 0) {
        result.set(modId, { childPositions: new Map(), containerSize: 120 });
        continue;
      }

      const memberIds = new Set(members.map(m => m.id));
      const subEdges  = graphData.graph.edges.filter(e => memberIds.has(e.from) && memberIds.has(e.to));

      // Degree maps within the subgraph
      const subInDeg  = new Map<string, number>();
      const subOutDeg = new Map<string, number>();
      for (const e of subEdges) {
        subInDeg.set(e.to,   (subInDeg.get(e.to)   ?? 0) + 1);
        subOutDeg.set(e.from,(subOutDeg.get(e.from) ?? 0) + 1);
      }

      // Parents map required by layoutRadial's barycenter heuristic
      const parentsMap: Record<string, string[]> = {};
      for (const id of memberIds) parentsMap[id] = [];
      for (const e of subEdges) parentsMap[e.to] = [...(parentsMap[e.to] ?? []), e.from];

      // BFS to assign depths; fall back for cyclic / disconnected nodes
      const traversalData: Record<string, TraversalData> = {};
      const depthMap = new Map<string, number>();
      const subRoots = [...memberIds].filter(id => !subInDeg.has(id));
      const bfsSeeds = subRoots.length > 0 ? subRoots : [[...memberIds][0]];
      const bfsQueue: { id: string; d: number }[] = bfsSeeds.map(id => ({ id, d: 0 }));
      while (bfsQueue.length > 0) {
        const { id, d } = bfsQueue.shift()!;
        if (depthMap.has(id)) continue;
        depthMap.set(id, d);
        traversalData[id] = { componentID: "0", depth: d, isCyclic: false };
        for (const e of subEdges) {
          if (e.from === id && !depthMap.has(e.to)) bfsQueue.push({ id: e.to, d: d + 1 });
        }
      }
      for (const id of memberIds) {
        if (!traversalData[id]) traversalData[id] = { componentID: "0", depth: 0, isCyclic: true };
      }

      // Nodes with no subgraph edges are orphans (placed at centre)
      const orphanNodes = [...memberIds].filter(id => !subInDeg.has(id) && !subOutDeg.has(id));
      const nonOrphanRoots = subRoots.filter(id => !orphanNodes.includes(id));
      const effectiveRoots = nonOrphanRoots.length > 0 ? nonOrphanRoots : subRoots;

      const degree: Record<string, number> = {};
      for (const id of memberIds) degree[id] = (subInDeg.get(id) ?? 0) + (subOutDeg.get(id) ?? 0);
      const maxDepthVal = Math.max(0, ...[...depthMap.values()]);

      const layout = layouts.radial(
        members.map(m => ({ id: m.id })),
        {
          traversalData,
          degree,
          orphanNodes,
          roots:            { "0": effectiveRoots },
          totalNodes:       members.length,
          nodesByComponent: { "0": members.length },
          components:       { "0": [...memberIds] },
          maxDepth:         { "0": maxDepthVal },
          parents:          parentsMap,
        },
        { width: CIRC_PILOT, height: CIRC_PILOT }
      );

      // Compute max radius from pilot centre so we can size the container
      const pilotCx = CIRC_PILOT / 2;
      const pilotCy = CIRC_PILOT / 2;
      const maxRadius = Math.max(
        0,
        ...Object.values(layout.positions).map(p =>
          Math.sqrt((p.x - pilotCx) ** 2 + (p.y - pilotCy) ** 2)
        )
      );

      const containerHalf = maxRadius + CIRC_NODE_R + CIRC_PADDING;
      const containerSize = Math.max(120, 2 * containerHalf);

      // Positions from layoutRadial are node-centre coords relative to pilot canvas.
      // With origin:[0.5,0.5] on child nodes the position IS the centre, so we
      // transform directly: child_centre_in_container = pilot_pos - pilotCentre + containerHalf.
      const childPositions = new Map<string, { x: number; y: number }>();
      for (const [id, pos] of Object.entries(layout.positions)) {
        childPositions.set(id, {
          x: pos.x - pilotCx + containerHalf,
          y: pos.y - pilotCy + containerHalf,
        });
      }

      result.set(modId, { childPositions, containerSize });
    }
    return result;
  }, [expandedModules, moduleMembership, graphData, layoutType]);

  // Highlight priority: blast-radius > search > category filter > normal
  const styledNodes = useMemo(() => {
    return nodes.map(node => {
      let highlightState: Highlight;

      if (selectedNodeId != null) {
        if (node.id === selectedNodeId)      highlightState = "selected";
        else if (blastRadius?.has(node.id)) highlightState = "connected";
        else                                 highlightState = "dimmed";
      } else if (searchMatches && searchMatches.size > 0) {
        highlightState = searchMatches.has(node.id) ? "selected" : "dimmed";
      } else if (activeCategories.size > 0) {
        highlightState = selectedByCategory.has(node.id) ? "selected" : "dimmed";
      } else {
        highlightState = "normal";
      }

      const filterColor = activeCategories.size > 0 && selectedByCategory.has(node.id)
        ? CATEGORY_META[(node.data as unknown as TerraformNodeData).category]?.hex
        : undefined;

      return { ...node, data: { ...node.data, highlightState, filterColor } };
    });
  }, [nodes, selectedByCategory, selectedNodeId, blastRadius, searchMatches, activeCategories]);

  // Highlight edges that flow within the selected-node + blast-radius set.
  // All other edges are dimmed when a blast radius is active.
  const styledEdges = useMemo(() => {
    const baseStyle = { stroke: "var(--edge-color)", strokeWidth: 1.5 };
    if (!selectedNodeId) return edges.map(e => ({ ...e, style: baseStyle }));
    const affected = new Set<string>([selectedNodeId, ...(blastRadius ?? [])]);
    return edges.map(edge => {
      const isBlastPath = affected.has(edge.source) && affected.has(edge.target);
      return isBlastPath
        ? { ...edge, style: { strokeWidth: 2.5, stroke: "#ef4444" }, animated: true }
        : { ...edge, style: { ...baseStyle, opacity: 0.12 }, animated: false };
    });
  }, [edges, selectedNodeId, blastRadius]);

  // Hover tracking — never calls setNodes; zIndex applied in finalNodes instead.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);
  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Computed synchronously during render so onNodesChange always sees the
  // current set of child nodes, regardless of effect-queue ordering.
  const childNodeIdsRef = useRef(new Set<string>());
  {
    const s = new Set<string>();
    for (const [nodeId, modId] of moduleMembership.entries()) {
      if (expandedModules.has(modId)) s.add(nodeId);
    }
    childNodeIdsRef.current = s;
  }

  // finalNodes: position / parentId / extent are always overridden here for
  // child nodes so they remain inside the container regardless of what
  // onNodesChange may have written into nodes state.
  // Children are marked draggable:false so XYFlow never fires drag position
  // changes for them (removing the primary source of the escape bug).
  // Sorted so parent containers always precede their children — XYFlow 12
  // requires this ordering to resolve parent offsets correctly.
  const finalNodes = useMemo(() => {
    // If a child node is hovered, its parent container also needs to be elevated
    // so the hover detail panel isn't covered by sibling top-level nodes.
    const hoveredParentMod = hoveredNodeId ? moduleMembership.get(hoveredNodeId) : null;

    const isRadial = layoutType === "radial";

    const mapped = styledNodes
      .filter(node => {
        const parentMod = moduleMembership.get(node.id);
        return !parentMod || expandedModules.has(parentMod);
      })
      .map(node => {
        const d         = node.data as unknown as TerraformNodeData;
        const parentMod = moduleMembership.get(node.id);
        const isChild   = !!(parentMod && expandedModules.has(parentMod));
        const hasMembers = (moduleMemberCounts.get(node.id) ?? 0) > 0;
        const isExpanded = d.category === "module" && hasMembers && expandedModules.has(node.id);

        const dagLayout  = !isRadial && isExpanded ? moduleChildLayouts.get(node.id) : undefined;
        const circLayout =  isRadial && isExpanded ? circularModuleChildLayouts.get(node.id) : undefined;

        const childPos = isChild
          ? isRadial
            ? circularModuleChildLayouts.get(parentMod!)?.childPositions.get(node.id)
            : moduleChildLayouts.get(parentMod!)?.childPositions.get(node.id)
          : undefined;

        const containerType = isRadial ? "circularModuleContainer" : "moduleContainer";
        // Fallback position for children when their layout entry is missing
        const childFallback = isRadial ? { x: 50, y: 50 } : { x: PAD, y: HEADER_H };

        return {
          ...node,
          type:      isExpanded ? containerType : node.type,
          parentId:  isChild ? parentMod : undefined,
          extent:    isChild ? ("parent" as const) : undefined,
          // In radial mode all positions are centre coords (origin:[0.5,0.5]).
          // The container shares the same centre as its circular node — no correction needed.
          origin:    isRadial ? [0.5, 0.5] as [number, number] : undefined,
          position:  childPos ?? (isChild ? childFallback : node.position),
          draggable: isChild ? false : undefined,
          style:     dagLayout
            ? { width: dagLayout.containerW, height: dagLayout.containerH }
            : circLayout
            ? { width: circLayout.containerSize, height: circLayout.containerSize }
            : node.style,
          zIndex:    hoveredNodeId === node.id || hoveredParentMod === node.id
            ? 1000
            : isExpanded ? 100 : 0,
          data: {
            ...node.data,
            expanded:       expandedModules.has(node.id),
            memberCount:    moduleMemberCounts.get(node.id),
            isChild,
            onToggleExpand: d.category === "module" && hasMembers
              ? () => toggleModuleExpand(node.id)
              : undefined,
          },
        };
      });

    // Parents must precede children in the XYFlow nodes array (required by XYFlow 12).
    // Among siblings, the hovered child goes last so it paints on top — CSS paint order
    // is the reliable fallback since XYFlow doesn't always propagate zIndex to child nodes.
    mapped.sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      if (a.parentId && b.parentId) {
        if (a.id === hoveredNodeId) return 1;
        if (b.id === hoveredNodeId) return -1;
      }
      return 0;
    });
    return mapped;
  }, [styledNodes, moduleMembership, expandedModules, moduleChildLayouts, circularModuleChildLayouts, moduleMemberCounts, toggleModuleExpand, hoveredNodeId, layoutType]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(nds => {
      // Block any position change for child nodes that isn't from a real drag.
      // XYFlow fires reconciliation position changes (dragging:false/undefined)
      // when it processes re-renders; those carry absolute coords that corrupt
      // the relative positions that finalNodes relies on.
      const safeChanges = changes.filter(c =>
        c.type !== "position" || !childNodeIdsRef.current.has(c.id) || c.dragging === true
      );
      return applyNodeChanges(safeChanges, nds);
    });
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, []);
  const onNodeClick = useCallback((_: any, node: Node) => {
    // Clicking the circular module container background collapses it.
    // XYFlow only fires onNodeClick on true clicks (not drags), so this is safe.
    // Child node clicks bubble to onNodeClick on the child, not the container.
    if (node.type === "circularModuleContainer") {
      (node.data as any).onToggleExpand?.();
      return;
    }
    onNodeSelect?.(node.id);
  }, [onNodeSelect]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: "var(--canvas-bg)" }}>
      <ReactFlow
        nodes={finalNodes}
        edges={styledEdges}
        edgeTypes={edgeTypes}
        nodeTypes={activeNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        colorMode={isDark ? "dark" : "light"}
        minZoom={0.05}
        fitView
      >
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={layoutType === "radial" ? 500 : 2}
          nodeColor={n => {
            const d = n.data as any;
            if (d?.highlightState === "selected")  return "#22c55e";
            if (d?.highlightState === "connected") return "#ef4444";
            const style = getComputedStyle(document.documentElement);
            if (d?.highlightState === "dimmed") return style.getPropertyValue("--minimap-node-dimmed").trim();
            return style.getPropertyValue("--minimap-node-normal").trim();
          }}
          maskColor="var(--minimap-mask)"
          style={{
            background: "var(--minimap-bg)",
            border: "1px solid var(--minimap-border)",
          }}
        />
      </ReactFlow>
    </div>
  );
}
