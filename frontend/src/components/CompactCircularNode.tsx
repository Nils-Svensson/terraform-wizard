import { memo, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TerraformNodeData } from "./TerraformNodeData";

const PROVIDER_STRIPE: Record<string, string> = {
  aws:     "#f97316",
  google:  "#3b82f6",
  azurerm: "#06b6d4",
  module:  "#f59e0b",
  random:  "#8b5cf6",
};
const DEFAULT_COLOR = "#6b7280";

const PROVIDER_ABBR: Record<string, string> = {
  aws:        "AWS",
  google:     "GCP",
  azurerm:    "AZ",
  random:     "RNG",
  helm:       "HELM",
  kubernetes: "K8S",
  null:       "NULL",
  local:      "LOCAL",
  tls:        "TLS",
};

function getProviderColor(provider?: string, resourceType?: string): string {
  if (provider && PROVIDER_STRIPE[provider]) return PROVIDER_STRIPE[provider];
  const prefix = resourceType?.split("_")[0] ?? "";
  return PROVIDER_STRIPE[prefix] ?? DEFAULT_COLOR;
}

function stripProviderPrefix(rt: string): string {
  const under = rt.indexOf("_");
  return under === -1 ? rt : rt.slice(under + 1);
}

function truncate(s: string, maxPx: number, fontPx: number): string {
  const maxChars = Math.max(3, Math.floor(maxPx / (fontPx * 0.6)));
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 1) + "…";
}

function CircularNode(props: NodeProps) {
  const data = props.data as unknown as TerraformNodeData;
  const {
    displayName, name, resourceType, highlightState,
    occurrenceCount, provider, category,
    filterColor, onToggleExpand, expanded,
    deps, dependents,
    location, attributes, filePath, lineNumber,
    forEach, instanceCount,
  } = data;

  const [hovered, setHovered]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const hoverTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isModule = category === "module";
  const degree = occurrenceCount ?? 1;
  const size = Math.min(169 + degree * 13, 338);
  const showLabel = size >= 90;

  const color = getProviderColor(provider, resourceType);
  const highlight = highlightState ?? "normal";

  // Provider badge — not shown for modules (dashed border signals it already)
  const providerKey = provider ?? resourceType?.split("_")[0] ?? "";
  const providerAbbr = !isModule ? (PROVIDER_ABBR[providerKey] ?? null) : null;

  // Font sizes scale with node diameter; name is half the old scale so more chars fit
  const maxW    = size * 0.70;
  const badgeFx = Math.max(8, Math.round(size * 0.08));
  const nameFx  = Math.max(9, Math.round(size * 0.11));
  const typeFx  = Math.max(7, Math.round(size * 0.09));
  const depFx   = Math.max(7, Math.round(size * 0.08));

  const resourceTypeLine = !isModule && resourceType
    ? truncate(stripProviderPrefix(resourceType), maxW, typeFx)
    : null;

  const hasDeps = (deps ?? 0) > 0 || (dependents ?? 0) > 0;

  let boxShadow: string | undefined;
  if (highlight === "selected") {
    const rc = filterColor ?? "#22c55e";
    boxShadow = `0 0 0 2px ${rc}, 0 0 10px 3px ${rc}55`;
  } else if (highlight === "connected") {
    boxShadow = `0 0 0 2px #ef4444, 0 0 8px 2px rgba(239,68,68,0.35)`;
  }
  const opacity = highlight === "dimmed" ? 0.45 : 1;

  const hiddenHandle: React.CSSProperties = { opacity: 0, pointerEvents: "none" };

  const clearDismiss = () => {
    if (dismissTimer.current !== null) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };
  const scheduleDismiss = () => {
    clearDismiss();
    dismissTimer.current = setTimeout(() => setHovered(false), 200);
  };

  const handleMouseEnter = () => {
    clearDismiss();
    hoverTimer.current = setTimeout(() => setHovered(true), 400);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    scheduleDismiss();
  };
  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = isModule ? `module.${name}` : `${resourceType}.${name}`;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isModule && onToggleExpand ? e => { e.stopPropagation(); onToggleExpand(); } : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--node-bg, #415a77)",
        border: isModule ? `3px dashed ${color}` : `3px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        position: "relative",
        cursor: isModule ? "pointer" : "default",
        flexShrink: 0,
        opacity,
        boxShadow,
      }}
    >
      {/* Provider abbreviation badge at top of circle */}
      {showLabel && providerAbbr && (
        <div style={{
          position: "absolute",
          top: size * 0.13,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: badgeFx,
          fontWeight: 700,
          color,
          opacity: 0.75,
          letterSpacing: "0.5px",
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}>
          {providerAbbr}
        </div>
      )}

      {/* Center: resource name + type on two lines */}
      {showLabel && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          pointerEvents: "none",
          userSelect: "none",
          maxWidth: maxW,
        }}>
          <span style={{
            fontSize: nameFx,
            fontWeight: 700,
            color: "var(--node-text)",
            fontFamily: "sans-serif",
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
            maxWidth: "100%",
          }}>
            {isModule && expanded
              ? "▾"
              : truncate(name ?? resourceType?.split("_").pop() ?? "?", maxW, nameFx)}
          </span>

          {resourceTypeLine && (
            <div style={{
              fontSize: typeFx,
              fontWeight: 500,
              color: "var(--node-text-muted)",
              lineHeight: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
              maxWidth: "100%",
            }}>
              {resourceTypeLine}
            </div>
          )}
        </div>
      )}

      {/* Dep counts at bottom of circle */}
      {showLabel && hasDeps && (
        <div style={{
          position: "absolute",
          bottom: size * 0.12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 10,
          fontSize: depFx,
          color: "var(--node-text-muted)",
          opacity: 0.7,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}>
          {(dependents ?? 0) > 0 && <span>← {dependents}</span>}
          {(deps ?? 0) > 0 && <span>→ {deps}</span>}
        </div>
      )}

      {/* Expand chevron for collapsed module nodes */}
      {isModule && !expanded && (
        <div style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 8,
          color,
          lineHeight: 1,
          pointerEvents: "none",
        }}>
          ▾
        </div>
      )}

      {/* Hover detail panel — floats below the circle */}
      {hovered && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseEnter={clearDismiss}
          onMouseLeave={scheduleDismiss}
          style={{
            position: "absolute",
            top: size + 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            minWidth: 338,
            maxWidth: 488,
            background: "var(--node-bg, #415a77)",
            border: `1px solid var(--node-border, #334155)`,
            borderRadius: 10,
            padding: "14px 18px",
            fontSize: 13,
            color: "var(--node-text, #e5e7eb)",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            pointerEvents: "all",
          }}
        >
          {/* Full resource identifier — always shown so truncated node labels don't hide info */}
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--node-text)", wordBreak: "break-all" }}>
            {isModule ? `module.${name}` : name}
          </div>
          {!isModule && resourceType && (
            <div style={{ fontSize: 12, color: "var(--node-text-muted, #94a3b8)", marginBottom: 2, wordBreak: "break-all" }}>
              {resourceType}
            </div>
          )}
          {filePath && (
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--node-text-muted, #94a3b8)", marginBottom: 2 }}>
              {filePath}{lineNumber != null ? `:${lineNumber}` : ""}
            </div>
          )}
          {isModule ? (
            <>
              {displayName && <div><strong>source:</strong> {displayName}</div>}
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
                <div style={{ color: "var(--node-text-detail, #cbd5f5)", marginTop: 2 }}>
                  {Object.entries(attributes).slice(0, 5).map(([k, v]) => (
                    <div key={k} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {k} = {String(v)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {(deps != null || dependents != null) && (
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--node-text-muted, #94a3b8)", marginTop: 2 }}>
              {(dependents ?? 0) > 0 && <span title={`${dependents} resource${dependents !== 1 ? "s" : ""} depend on this`}>← {dependents}</span>}
              {(deps ?? 0) > 0 && <span title={`depends on ${deps} resource${deps !== 1 ? "s" : ""}`}>→ {deps}</span>}
            </div>
          )}
          <button
            onClick={handleCopyId}
            style={{
              marginTop: 4,
              alignSelf: "flex-start",
              background: "var(--node-badge-bg, #1e293b)",
              border: "1px solid var(--node-border, #334155)",
              borderRadius: 4,
              color: copied ? "#22c55e" : "var(--node-text-muted, #94a3b8)",
              fontSize: 12,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ copied" : "copy id"}
          </button>
        </div>
      )}

      <Handle id="t-top"    type="target" position={Position.Top}    style={hiddenHandle} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={hiddenHandle} />
      <Handle id="t-left"   type="target" position={Position.Left}   style={hiddenHandle} />
      <Handle id="t-right"  type="target" position={Position.Right}  style={hiddenHandle} />
      <Handle id="s-top"    type="source" position={Position.Top}    style={hiddenHandle} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={hiddenHandle} />
      <Handle id="s-left"   type="source" position={Position.Left}   style={hiddenHandle} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={hiddenHandle} />
    </div>
  );
}

export default memo(CircularNode);
