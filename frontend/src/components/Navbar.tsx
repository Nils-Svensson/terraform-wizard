import { LogIn, Filter, Search, X, Sun, Moon } from "lucide-react";
import { Button } from "./ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/Popover";
import { Checkbox } from "./ui/Checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/Select";
import type { LayoutType } from "../layout";
import { CATEGORY_OPTIONS } from "./categories";

interface Props {
  layoutType: LayoutType;
  onChangeLayout: (l: LayoutType) => void;
  activeCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Navbar({
  layoutType,
  onChangeLayout,
  activeCategories,
  onToggleCategory,
  searchQuery,
  onSearchChange,
  isDark,
  onToggleTheme,
}: Props) {
  return (
    // Three-column grid: left items | centred search | right actions
    // The 1fr columns absorb any width changes in the left group (filter chips, etc.)
    // so the search is always pinned to the horizontal centre of the header.
    <header
      className="grid items-center px-4 h-12 border-b border-purple-800/30 bg-background/80 backdrop-blur shrink-0"
      style={{ gridTemplateColumns: "1fr auto 1fr" }}
    >

      {/* ── Left: logo · layout · filter · active chips ── */}
      <div className="flex items-center gap-3 min-w-0">

        <a href="https://tfwizard.com" className="flex items-center gap-2 mr-2 shrink-0 hover:opacity-75 transition-opacity">
          <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white text-xs font-bold">T</div>
          <span className="font-semibold text-sm tracking-tight">tfwizard</span>
        </a>

        <Select value={layoutType} onValueChange={v => onChangeLayout(v as LayoutType)}>
          <SelectTrigger className="w-28 h-8 text-xs bg-background/50 border-purple-800/30 hover:border-purple-600/50 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dag">DAG</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-8 text-xs px-3 border-purple-800/30 hover:bg-purple-950/50 gap-1.5 shrink-0 min-w-[90px]"
              title="Highlight resources by category. Supported providers: AWS, GCP, Azure. Categories are heuristic — resources from other providers or with ambiguous types may land in Other."
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              <span className={activeCategories.size > 0 ? "text-purple-400" : "invisible"}>
                ({activeCategories.size || 0})
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background border-purple-800/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Categories</span>
                {activeCategories.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => CATEGORY_OPTIONS.forEach(o => { if (activeCategories.has(o.value)) onToggleCategory(o.value); })}
                    className="text-xs text-purple-400 hover:text-purple-300 h-auto p-0"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {CATEGORY_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={activeCategories.has(opt.value)}
                      onCheckedChange={() => onToggleCategory(opt.value)}
                    />
                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeCategories.size > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {[...activeCategories].slice(0, 5).map(cat => {
              const opt = CATEGORY_OPTIONS.find(o => o.value === cat);
              return (
                <button
                  key={cat}
                  onClick={() => onToggleCategory(cat)}
                  title={`${opt?.label} — click to remove`}
                  className={`w-2.5 h-2.5 rounded-full ${opt?.color} opacity-80 hover:opacity-100 transition-opacity`}
                />
              );
            })}
            {activeCategories.size > 5 && (
              <span className="text-xs text-foreground/40">+{activeCategories.size - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Centre: search (always pinned to midpoint by grid) ── */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search resources…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full h-8 pl-8 pr-8 text-xs rounded-md border border-purple-800/30 bg-background/50 placeholder:text-foreground/30 focus:outline-none focus:border-purple-600/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Right: theme · login · github ── */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/60 hover:text-foreground" title="Coming soon">
          <LogIn className="h-3.5 w-3.5" />
          Login
        </Button>
        <a
          href="https://github.com/Nils-Svensson/terraform-wizard"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </Button>
        </a>
      </div>

    </header>
  );
}
