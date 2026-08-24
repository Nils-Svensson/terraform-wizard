import { useCallback, useEffect, useMemo, useState } from "react";

import FileUpload from "./components/Sidebar";
import GraphWindow from "./components/GraphWindow";
import { Navbar } from "./components/Navbar";
import { StatsPanel } from "./components/StatsPanel";
import type { LayoutType } from "./layout";

function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (localStorage.getItem("tw_theme") ?? "dark") !== "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem("tw_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [statsPanelOpen,  setStatsPanelOpen]  = useState(true);

  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [graphData, setGraphData]     = useState<any | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Toolbar state — lifted so Navbar and GraphWindow share them
  const [layoutType, setLayoutType]         = useState<LayoutType>("dag");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery]       = useState("");

  const handleToggleCategory = useCallback((cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  // BFS forward through graph edges.
  // Edge A→B means "B depends on A". Cutting A breaks B and everything reachable onward.
  const blastRadius = useMemo<Set<string>>(() => {
    if (!selectedNodeId || !graphData?.graph?.edges) return new Set();

    const forward = new Map<string, string[]>();
    for (const edge of graphData.graph.edges) {
      if (!forward.has(edge.from)) forward.set(edge.from, []);
      forward.get(edge.from)!.push(edge.to);
    }

    const visited = new Set<string>();
    const queue = [...(forward.get(selectedNodeId) ?? [])];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of forward.get(cur) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return visited;
  }, [selectedNodeId, graphData]);

  // Case-insensitive substring search over resource ID, name, and type
  const searchMatches = useMemo<Set<string> | null>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !graphData?.graph?.nodes) return null;
    const s = new Set<string>();
    for (const n of graphData.graph.nodes) {
      if (
        n.id.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      ) {
        s.add(n.id);
      }
    }
    return s;
  }, [searchQuery, graphData]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(prev => (nodeId === null || prev === nodeId) ? null : nodeId);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">

      <Navbar
        layoutType={layoutType}
        onChangeLayout={setLayoutType}
        activeCategories={activeCategories}
        onToggleCategory={handleToggleCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDark={isDark}
        onToggleTheme={() => setIsDark(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — collapsible */}
        <div className="relative flex shrink-0">
          <div
            className="overflow-y-auto border-r border-purple-800/30 transition-all duration-200"
            style={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
          >
            <div className="p-4 w-[280px]">
              <FileUpload
                sessionId={sessionId}
                onSessionId={setSessionId}
                onGraphData={setGraphData}
                selectedNodeId={selectedNodeId}
                blastRadius={blastRadius}
                graphData={graphData}
                onClearSelection={() => setSelectedNodeId(null)}
              />
            </div>
          </div>

          {/* Toggle tab on the right edge of the sidebar */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 rounded-full bg-background border border-purple-800/30 text-foreground/40 hover:text-foreground/80 hover:border-purple-600/50 shadow-sm transition-colors"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="text-xs select-none">{sidebarOpen ? "‹" : "›"}</span>
          </button>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 overflow-hidden">
          <GraphWindow
            graphData={graphData}
            layoutType={layoutType}
            activeCategories={activeCategories}
            selectedNodeId={selectedNodeId}
            blastRadius={blastRadius}
            searchMatches={searchMatches}
            onNodeSelect={handleNodeSelect}
            isDark={isDark}
          />
        </div>

        {/* Right stats panel — collapsible */}
        <div className="relative flex shrink-0 border-l border-purple-800/30">
          {/* Toggle tab on the left edge of the stats panel */}
          <button
            onClick={() => setStatsPanelOpen(v => !v)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 rounded-full bg-background border border-purple-800/30 text-foreground/40 hover:text-foreground/80 hover:border-purple-600/50 shadow-sm transition-colors"
            aria-label={statsPanelOpen ? "Collapse stats panel" : "Expand stats panel"}
            title={statsPanelOpen ? "Collapse stats panel" : "Expand stats panel"}
          >
            <span className="text-xs select-none">{statsPanelOpen ? "›" : "‹"}</span>
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{ width: statsPanelOpen ? 240 : 0, opacity: statsPanelOpen ? 1 : 0 }}
          >
            <div style={{ width: 240 }}>
              <StatsPanel graphData={graphData} onNodeSelect={handleNodeSelect} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
