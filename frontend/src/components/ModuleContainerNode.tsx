import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface ContainerData {
  name: string;
  displayName?: string;
  highlightState?: string;
  onToggleExpand?: () => void;
}

function ModuleContainerNode(props: NodeProps) {
  const data = props.data as unknown as ContainerData;
  const { name, displayName, onToggleExpand } = data;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        border: "2px dashed var(--mod-accent)",
        background: "var(--mod-container-bg)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        borderBottom: "1px solid var(--mod-header-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            background: "var(--mod-badge-bg)",
            color: "var(--mod-badge-text)",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>MODULE</span>
          <span style={{ color: "var(--mod-accent)", fontSize: 12, fontWeight: 600 }}>{name}</span>
          {displayName && (
            <span style={{
              color: "var(--mod-source-text)",
              fontSize: 10,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{displayName}</span>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onToggleExpand?.(); }}
          style={{
            background: "var(--mod-btn-bg-active)",
            border: "1px solid var(--mod-btn-border)",
            borderRadius: 4,
            color: "var(--mod-text)",
            fontSize: 10,
            padding: "2px 7px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ▾ Collapse
        </button>
      </div>

      {/* Children render inside via XYFlow's parent node mechanism */}
      <div style={{ flex: 1 }} />

      <Handle type="target" position={Position.Top}    style={{ opacity: 0.4 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0.4 }} />
    </div>
  );
}

export default memo(ModuleContainerNode);
