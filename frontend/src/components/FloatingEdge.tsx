import { getBezierPath, useInternalNode } from '@xyflow/react';

import { getEdgeParams } from './initialElements.ts';

interface FloatingEdgeProps {
  id: string;
  source: string;
  target: string;
  markerEnd?: string;
  style?: React.CSSProperties;
}

function FloatingEdge({ id, source, target, markerEnd, style }: FloatingEdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
  
    if (!sourceNode || !targetNode) return null;
  
    const params = getEdgeParams(sourceNode, targetNode);
    if (!params) return null;
  
    const [path] = getBezierPath({
      sourceX: params.sx,
      sourceY: params.sy,
      sourcePosition: params.sourcePos,
      targetX: params.tx,
      targetY: params.ty,
      targetPosition: params.targetPos,
    });
  
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        style={style}
      />
    );
  }
  
  export default FloatingEdge;