import { Handle, Position } from "@xyflow/react";

export default function TerraformNode({ data }: any) {
  return (
    <div
      style={{
        background: "#1e293b",
        color: "#e5e7eb",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        minWidth: 120,
        textAlign: "center",
      }}
    >
      <strong>{data.label}</strong>

      {data.count > 1 && (
        <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
          × {data.count}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
