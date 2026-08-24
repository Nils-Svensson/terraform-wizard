import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Layers, GitBranch, Box, AlertTriangle, ChevronRight } from "lucide-react";
import type { BackendGraph } from "./GraphWindow";

const PROVIDER_COLORS: Record<string, string> = {
  google:   "bg-blue-500",
  aws:      "bg-orange-500",
  azurerm:  "bg-cyan-500",
  module:   "bg-amber-500",
};

function providerLabel(p: string) {
  const map: Record<string, string> = { google: "GCP", aws: "AWS", azurerm: "Azure" };
  return map[p] ?? p;
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="shrink-0 text-purple-400/70">{icon}</div>
      <span className="flex-1 text-xs text-foreground/60">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

interface WarningItem { id: string; detail?: string }

interface WarningGroupProps {
  label: string;
  items: WarningItem[];
  colorClass: string;        // dot color
  textColorClass: string;    // count/label color
  onNodeSelect?: (id: string) => void;
}

function WarningGroup({ label, items, colorClass, textColorClass, onNodeSelect }: WarningGroupProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1 hover:bg-purple-950/30 rounded px-1 -mx-1 transition-colors"
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorClass}`} />
        <span className={`flex-1 text-xs text-left ${textColorClass}`}>{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${textColorClass}`}>{items.length}</span>
        <ChevronRight className={`h-3 w-3 ${textColorClass} transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <ul className="mt-1 ml-3.5 space-y-0.5 max-h-40 overflow-y-auto pr-1">
          {items.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onNodeSelect?.(item.id)}
                className="w-full text-left text-xs font-mono text-foreground/50 hover:text-foreground/90 truncate block py-0.5 transition-colors"
                title={item.id}
              >
                {item.id}
                {item.detail && (
                  <span className="ml-1.5 text-foreground/30 non-italic">{item.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  graphData: BackendGraph | null;
  onNodeSelect?: (id: string | null) => void;
}

export function StatsPanel({ graphData, onNodeSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const stats = useMemo(() => {
    if (!graphData) return null;

    const nodes = graphData.graph.nodes;
    const edges = graphData.graph.edges;
    const totalResources = nodes.length;
    const dependencies = edges.length;
    const modules = nodes.filter(n => n.category === "module").length;

    // Provider distribution — exclude "module" pseudo-provider
    const providerMap: Record<string, number> = {};
    for (const n of nodes) {
      const p = n.provider ?? "other";
      if (p === "module") continue;
      providerMap[p] = (providerMap[p] ?? 0) + 1;
    }
    const providers = Object.entries(providerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxCount = providers[0]?.[1] ?? 1;

    // ── Warning 1: Cyclic dependencies (critical — Terraform won't apply) ──────
    const cycleItems: WarningItem[] = Object.entries(graphData.analysis.traversalData)
      .filter(([, td]) => td.isCyclic)
      .map(([id]) => ({ id }));

    return {
      totalResources, dependencies, modules, providers, maxCount,
      cycleItems,
    };
  }, [graphData]);

  if (!graphData) {
    return (
      <div className="w-[240px] p-4 shrink-0">
        <p className="text-xs text-foreground/30 text-center mt-8">Load a repository to see stats</p>
      </div>
    );
  }

  const totalWarnings = stats?.cycleItems.length ?? 0;

  return (
    <div className="w-[240px] shrink-0 overflow-y-auto h-full">
      <div className="p-4 space-y-4">

        {/* Header */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-between text-xs font-medium text-foreground/60 uppercase tracking-wider hover:text-foreground/90"
        >
          Infrastructure Stats
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {!collapsed && stats && (
          <>
            {/* Stat rows */}
            <div className="divide-y divide-purple-800/20">
              <StatRow icon={<Box className="h-4 w-4" />}       label="Total Resources" value={stats.totalResources} />
              <StatRow icon={<GitBranch className="h-4 w-4" />} label="Dependencies"    value={stats.dependencies} />
              <StatRow icon={<Layers className="h-4 w-4" />}    label="Modules"         value={stats.modules} />
            </div>

            {/* Warnings: probably will not keep these */} 
            {totalWarnings > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Warnings</span>
                </div>
                <div className="space-y-0.5">
                  <WarningGroup
                    label="Cyclic dependencies"
                    items={stats.cycleItems}
                    colorClass="bg-red-500"
                    textColorClass="text-red-400"
                    onNodeSelect={id => onNodeSelect?.(id)}
                  />
                </div>
              </div>
            )}

            {/* Provider distribution */}
            {stats.providers.length > 0 && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-foreground/40 uppercase tracking-wider">Provider Distribution</p>
                {stats.providers.map(([provider, count]) => (
                  <div key={provider} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground/70">{providerLabel(provider)}</span>
                      <span className="tabular-nums text-foreground/50">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-purple-950/50">
                      <div
                        className={`h-full rounded-full ${PROVIDER_COLORS[provider] ?? "bg-gray-500"}`}
                        style={{ width: `${(count / stats.maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
