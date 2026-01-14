
// GraphWindow owns all graph state and transformations.
// UI components (filters, toolbars) are stateless and emit events only.


import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
import "@xyflow/react/dist/style.css";
import { GraphToolbar } from "./GraphToolbar";
import type { TerraformNodeData } from "./TerraformNodeData";

const nodeTypes: NodeTypes = {
  terraform: TerraformNode,
};




/* =====================
   Backend graph types
   ===================== */
// Define the expected structure of the graph data received from the backend.
// Must match the backend's JSON response structure
interface BackendNode {
  id: string;
  type: string;
  name: string;
  provider?: string;
  region?: string;
  category: string;
  attr?: Record<string, any>;
  count: number;

  occurrencecount: number;
  instancecount?: number | null,
  foreach: boolean;

}
// Edge connecting two nodes
interface BackendEdge {
  from: string;
  to: string;
}

interface BackendGraph {
  nodes: BackendNode[];
  edges: BackendEdge[];
}

/* =====================
   GraphWindow
   ===================== */

export default function GraphWindow({
  graphData,
}: {
  graphData: BackendGraph | null;
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Convert backend format to XYFlow nodes/edges
  useEffect(() => {
    if (!graphData) return;

    const rfNodes: Node[] = graphData.nodes.map((n, i) => ({
      id: n.id,
      type: "terraform",
      position: {
        x: (i % 4) * 260,
        y: Math.floor(i / 4) * 160,
      },
      data: {
        displayName: n.name,
        resourceType: n.type,
        provider: n.provider,
        region: n.region,
        attributes: n.attr,
        category: n.category,
        occurrenceCount: n.occurrencecount,
        instanceCount: n.instancecount ?? undefined,
       
        expanded: false,
        forEach: n.foreach ?? false,

      },
    }));
    
    const rfEdges: Edge[] = graphData.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.from,
      target: e.to,
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graphData]);

  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  // Build adjacency map for quick lookup of neighbors  
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
  
    for (const edge of edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
  
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source); // undirected for now
    }
  
    return map;
  }, [edges]);

  const { selected, connected } = useMemo(() => {
    const selected = new Set<string>();
    const connected = new Set<string>();
  
    for (const node of nodes) {
      const data = node.data as unknown as TerraformNodeData;
  
      if (activeCategories.has(data.category)) {
        selected.add(node.id);
  
        const neighbors = adjacencyMap.get(node.id);
        neighbors?.forEach((n) => connected.add(n));
      }
    }
  
    return { selected, connected };
  }, [nodes, adjacencyMap, activeCategories]);
  

  type Highlight = "selected" | "connected" | "dimmed";

  
  


  

  
  const highlightedNodes = { selected, connected };
  const styledNodes = useMemo(() => {
    return nodes.map(node => {
      let highlightState: Highlight = "dimmed";
  
      if (highlightedNodes.selected.has(node.id)) {
        highlightState = "selected";
      } else if (highlightedNodes.connected.has(node.id)) {
        highlightState = "connected";
      }
  
      return {
        ...node,
        data: {
          ...node.data,
          highlightState,
        },
      };
    });
  }, [nodes, highlightedNodes]);
  
  




  

  // Handle node changes 
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);
  // Toggle node expanded state on click
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  expanded: !n.data.expanded,
                },
              }
            : n
        )
      );
    },
    []
  );
  
  

  // Render the ReactFlow graph
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GraphToolbar
        activeCategories={activeCategories}
        onToggleCategory={(cat) => {
          setActiveCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
           });
          }}
        />
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
