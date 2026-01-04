import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange
} from "@xyflow/react";

import TerraformNode from "./TerraformNode";

const nodeTypes = {
  terraform: TerraformNode,
};


import "@xyflow/react/dist/style.css";

interface BackendNode {
  id: string;
  type: string;
  name: string;
  count: Int16Array;
}

interface BackendEdge {
  from: string;
  to: string;
}

interface BackendGraph {
  nodes: BackendNode[];
  edges: BackendEdge[];
}

export default function GraphWindow({ graphData }: { graphData: BackendGraph | null }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Convert backend format → XYFlow nodes/edges
  useEffect(() => {
    if (!graphData) return;

    const newNodes = graphData.nodes.map((n, i) => ({
      id: n.id,
      type: "terraform",
      position: { x: (i % 4) * 250, y: Math.floor(i / 4) * 150 },
      data: {
        label: `${n.type}.${n.name}`,
        count: n.count,
      },
    }));
    

    const rfEdges: Edge[] = graphData.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.from,
      target: e.to
    }));

    setNodes(newNodes);
    setEdges(rfEdges);
  }, [graphData]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
