
// TerraformNode contains code responsible for the visual representation of a Terraform resource node in the graph.
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TerraformNodeData } from "./TerraformNodeData";

// =====================
// TerraformNode Component  
function TerraformNode(props: NodeProps) {
  const data = props.data as unknown as TerraformNodeData;

  const {
    resourceType,
    displayName,
    provider,
    attributes,
    expanded,
    instanceCount,
    occurrenceCount,
    forEach,
    location,
    
  } = data;

  const HIGHLIGHT_STYLES = {
    selected: {
      glow: "rgba(34, 197, 94, 0.88)", // green
      border: "#22c55e",
      opacity: 1,
    },
    connected: {
      glow: "rgba(210, 73, 73, 0.79)", // red
      border: "#ef4444",
      opacity: 1,
    },
    dimmed: {
      glow: "rgba(157, 157, 183, 0.55)",
      border: "#334155",
      opacity: 0.35,
    },
  };

  const highlight = data.highlightState|| "dimmed";
  const style = HIGHLIGHT_STYLES[highlight];
  

  const depth = Math.min(occurrenceCount ?? 1, 3);

  const depthShadow = Array.from({ length: depth })
  .map(
    (_, i) =>
      `0 ${i * 2}px ${6 + i * 3}px ${i * 1.5}px ${style.glow}`
  )
  .join(", ");


  const borderWidth = Math.min(depth, 3);

  return (
    <div
      style={{
        background: "#020617",
        border: `2px solid ${style.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        minWidth: 180,
        color: "#e5e7eb",
        fontSize: 12,
        boxShadow: depthShadow, 
        borderWidth: `${borderWidth}px`,
        
      }}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{resourceType}</strong>
        {occurrenceCount > 1 && (
          <span
            style={{
              background: "#1e293b",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 11,
            }}
          >
            ×{occurrenceCount}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: expanded ? 4 : 0 }}>
        {displayName}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 8, borderTop: "1px solid #334155", paddingTop: 6, fontSize: 11 }}>
          {provider && <div><strong>Provider:</strong> {provider}</div>}
          {location?.kind && (<div> <strong>{location.kind}:</strong> {location.value}</div>)}
          {occurrenceCount && <div><strong>count</strong> {occurrenceCount}</div>}
          {forEach && <div><strong>Instances:</strong> for_each</div>}
          {!forEach && instanceCount !== undefined && (
              <div><strong>Instances:</strong> {instanceCount}</div>)}
          {attributes && (
            <div style={{ color: "#cbd5f5" }}>
              {Object.entries(attributes)
                .slice(0, 6)
                .map(([k, v]) => (
                  <div key={k}>
                    {k}: {String(v)}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TerraformNode);
