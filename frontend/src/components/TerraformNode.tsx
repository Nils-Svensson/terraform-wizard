import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TerraformNodeData } from "./TerraformNodeData";

// Deterministic: extracted directly from the resource type string prefix.
// Unknown providers fall back to slate — no subjective mapping needed.
const PROVIDER_STRIPE: Record<string, string> = {
  aws:     "#f97316",  // orange
  google:  "#3b82f6",  // blue
  azurerm: "#06b6d4",  // cyan
  module:  "#f59e0b",  // amber
  random:  "#8b5cf6",  // violet — HashiCorp random provider (random_id, random_password, etc.)
};

function stripeColor(resourceType: string): string {
  if (resourceType === "module") return PROVIDER_STRIPE.module;
  const prefix = resourceType.split("_")[0] ?? "";
  return PROVIDER_STRIPE[prefix] ?? "#64748b";
}

// Highlight expressed as box-shadow ring so the provider stripe is unaffected.
const RING: Record<string, string> = {
  normal:    "",
  selected:  "0 0 0 2px #22c55e, 0 0 10px 3px rgba(34,197,94,0.35)",
  connected: "0 0 0 2px #ef4444, 0 0 8px 2px rgba(239,68,68,0.28)",
  dimmed:    "",
};

function TerraformNode(props: NodeProps) {
  const data = props.data as unknown as TerraformNodeData;
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied]   = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    name,
    resourceType,
    displayName,
    provider,
    attributes,
    instanceCount,
    occurrenceCount,
    forEach,
    location,
    memberCount,
    onToggleExpand,
    expanded,
    isChild,
    filePath,
    lineNumber,
    deps       = 0,
    dependents = 0,
  } = data;

  const handleMouseEnter = () => {
    if (isChild) {
      hoverTimer.current = setTimeout(() => setHovered(true), 500);
    } else {
      setHovered(true);
    }
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHovered(false);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = resourceType === "module" ? `module.${name}` : `${resourceType}.${name}`;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const isModule    = resourceType === "module";
  const highlight   = data.highlightState ?? "normal";
  const filterColor = data.filterColor;
  const ring = highlight === "selected" && filterColor
    ? `0 0 0 2px ${filterColor}, 0 0 10px 3px ${filterColor}55`
    : RING[highlight];
  const opacity     = highlight === "dimmed" ? (isModule ? 0.7 : 0.35) : 1;
  const accent     = stripeColor(resourceType);
  const showDegree = deps > 0 || dependents > 0;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background:   isModule ? "var(--node-surface-raised)" : "var(--node-surface)",
        border:       "1px solid var(--node-border)",
        borderLeft:   `4px solid ${accent}`,
        borderRadius: 8,
        padding:      "9px 11px 9px 10px",
        minWidth:     150,
        maxWidth:     hovered ? "max-content" : 240,
        color:        "var(--node-text)",
        fontSize:     12,
        boxShadow:    ring || undefined,
        opacity,
        boxSizing:    "border-box",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {/* ── Header: name + badges ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 12,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {name}
          </div>
          <div style={{
            fontSize: 10,
            color: isModule ? "var(--mod-accent)" : "var(--node-text-muted)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {isModule ? (displayName || "external module") : resourceType}
            </span>
            {forEach && (
              <span title="for_each — creates multiple instances" style={{
                fontSize: 10,
                lineHeight: 1,
                color: "var(--node-text-muted)",
                flexShrink: 0,
              }}>⟳</span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
          {isModule && (
            <span style={{
              background: "var(--mod-badge-bg)",
              color: "var(--mod-badge-text)",
              borderRadius: 3,
              padding: "1px 4px",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              MOD
            </span>
          )}
          {occurrenceCount > 1 && (
            <span style={{
              background: "var(--node-badge-bg)",
              color: "var(--node-text-muted)",
              borderRadius: 99,
              padding: "1px 5px",
              fontSize: 10,
              lineHeight: 1.4,
            }}>
              ×{occurrenceCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Module expand button ── */}
      {isModule && (
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand?.(); }}
          style={{
            marginTop: 7,
            width: "100%",
            background: expanded ? "var(--mod-btn-bg-active)" : "var(--mod-btn-bg)",
            border: "1px solid var(--mod-btn-border)",
            borderRadius: 4,
            color: "var(--mod-text)",
            fontSize: 10,
            padding: "3px 0",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {expanded
            ? "▾ Collapse"
            : memberCount
              ? `▸ Expand  (${memberCount} resources)`
              : "▸ Expand"}
        </button>
      )}

      {/* ── Degree footer ── */}
      {showDegree && (
        <div style={{
          marginTop: 7,
          paddingTop: 5,
          borderTop: "1px solid var(--node-border)",
          display: "flex",
          gap: 10,
          fontSize: 10,
          color: "var(--node-text-muted)",
        }}>
          {dependents > 0 && (
            <span title={`${dependents} resource${dependents !== 1 ? "s" : ""} depend on this`}>
              ← {dependents}
            </span>
          )}
          {deps > 0 && (
            <span title={`depends on ${deps} resource${deps !== 1 ? "s" : ""}`}>
              → {deps}
            </span>
          )}
        </div>
      )}

      {/* ── Hover detail ── */}
      {hovered && (
        <div style={{
          marginTop: 8,
          borderTop: "1px solid var(--node-border)",
          paddingTop: 7,
          fontSize: 11,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}>
          {filePath && (
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--node-text-muted)" }}>
              {filePath}{lineNumber != null ? `:${lineNumber}` : ""}
            </div>
          )}

          {isModule ? (
            <>
              {displayName && <div><strong>source:</strong> {displayName}</div>}
              {!memberCount && !expanded && (
                <div style={{ color: "var(--node-text-muted)", fontStyle: "italic" }}>
                  Upload module source files to inspect internals.
                </div>
              )}
            </>
          ) : (
            <>
              {provider && <div><strong>provider:</strong> {provider}</div>}
              {location?.kind && <div><strong>{location.kind}:</strong> {location.value}</div>}
              {forEach
                ? <div><strong>instances:</strong> for_each</div>
                : instanceCount !== undefined && <div><strong>instances:</strong> {instanceCount}</div>
              }
              {attributes && Object.keys(attributes).length > 0 && (
                <div style={{ color: "var(--node-text-detail)", marginTop: 2 }}>
                  {Object.entries(attributes).slice(0, 5).map(([k, v]) => (
                    <div key={k} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {k} = {String(v)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={handleCopyId}
            style={{
              marginTop: 4,
              alignSelf: "flex-start",
              background: "var(--node-badge-bg)",
              border: "1px solid var(--node-border)",
              borderRadius: 4,
              color: copied ? "#22c55e" : "var(--node-text-muted)",
              fontSize: 10,
              padding: "2px 7px",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ copied" : "copy id"}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(TerraformNode);
