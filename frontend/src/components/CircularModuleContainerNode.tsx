import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const MOD_COLOR = "#f59e0b";

interface CircularContainerData {
  name: string;
}

function CircularModuleContainerNode(props: NodeProps) {
  const data = props.data as unknown as CircularContainerData;
  const { name } = data;
  // Collapse is triggered by clicking anywhere on the container background.
  // GraphWindow's onNodeClick detects this node type and calls onToggleExpand.
  // XYFlow fires onNodeClick only on true clicks (not drags), so drag is safe.

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: `2px dashed ${MOD_COLOR}55`,
        background: `radial-gradient(circle, ${MOD_COLOR}06 0%, ${MOD_COLOR}14 100%)`,
        boxSizing: "border-box",
        position: "relative",
        cursor: "pointer",
      }}
    >
      {/* Module label — pointerEvents none so it doesn't consume the click */}
      <div style={{
        position: "absolute",
        top: "8%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: MOD_COLOR,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: "var(--node-bg, #415a77)",
          padding: "1px 6px",
          borderRadius: 3,
          border: `1px solid ${MOD_COLOR}40`,
        }}>
          {name}
        </span>
      </div>

      <Handle type="target" position={Position.Top}    style={{ opacity: 0.3 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0.3 }} />
    </div>
  );
}

export default memo(CircularModuleContainerNode);
