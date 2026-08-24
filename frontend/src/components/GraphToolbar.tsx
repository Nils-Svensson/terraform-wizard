import { Button } from "./ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/Popover";
import { Checkbox } from "./ui/Checkbox";
import { Badge } from "./ui/Badge";
import { Filter, X } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/Select";
import { Separator } from "./ui/Separator";

const CATEGORY_OPTIONS = [
  { value: "module",          label: "Module",          color: "bg-amber-500"   },
  { value: "compute",         label: "Compute",         color: "bg-blue-500"    },
  { value: "networking",      label: "Networking",      color: "bg-green-500"   },
  { value: "storage",         label: "Storage",         color: "bg-orange-500"  },
  { value: "data",            label: "Data",            color: "bg-purple-500"  },
  { value: "ai",             label: "AI",              color: "bg-pink-500"    },
  { value: "iam",             label: "IAM",             color: "bg-yellow-500"  },
  { value: "security",        label: "Security",        color: "bg-red-500"     },
  { value: "observability",   label: "Observability",   color: "bg-indigo-500"  },
  { value: "dns",             label: "DNS",             color: "bg-cyan-500"    },
  { value: "billing",         label: "Billing",         color: "bg-emerald-500" },
  { value: "other",           label: "Other",           color: "bg-gray-500"    },
];


type Props = {
  activeCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  layoutType: string;
  onChangeLayout: (layout: string) => void;
};

export function GraphToolbar({ activeCategories, onToggleCategory, layoutType, onChangeLayout  }: Props) {
  return (

    <div className="w-full">
    <div className="flex items-center gap-2 px-2 py-2 bg-background/60 backdrop-blur">
      
      
  
      {/* Layout selector (unchanged) */}
      <Select value={layoutType} onValueChange={onChangeLayout}>
        <SelectTrigger className="w-36 h-9 bg-background/50 border-purple-800/30 hover:border-purple-600/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dag">DAG</SelectItem>
          <SelectItem value="radial">Radial</SelectItem>
          <SelectItem value="hierarchical">Hierarchical</SelectItem>
          <SelectItem value="force">Force</SelectItem>
        </SelectContent>
      </Select>
  
      {/* Filter menu */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 border-purple-800/30 hover:bg-purple-950/50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeCategories.size > 0 && (
              <span className="ml-1 text-purple-400 text-xs">
                ({activeCategories.size})
              </span>
            )}
          </Button>
        </PopoverTrigger>
  
        <PopoverContent className="w-64 bg-background border-purple-800/30">
          <div className="space-y-3">
  
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter Categories</span>
  
              {activeCategories.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    CATEGORY_OPTIONS.forEach(opt => {
                      if (activeCategories.has(opt.value))
                        onToggleCategory(opt.value)
                    })
                  }
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Clear
                </Button>
              )}
            </div>
  
            <div className="space-y-2">
              {CATEGORY_OPTIONS.map(option => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={option.value}
                    checked={activeCategories.has(option.value)}
                    onCheckedChange={() =>
                      onToggleCategory(option.value)
                    }
                  />
  
                  <label
                    htmlFor={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${option.color}`}
                    />
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
  
          </div>
        </PopoverContent>
      </Popover>
  
      {/* Active filter badges — show first 3, collapse the rest into +N */}
      {activeCategories.size > 0 && (
        <div className="flex gap-1 ml-2">
          {[...activeCategories].slice(0, 3).map(cat => {
            const option = CATEGORY_OPTIONS.find(o => o.value === cat)
            return (
              <Badge
                key={cat}
                className="bg-purple-950/50 text-purple-200 border border-purple-700/50"
              >
                <div className={`w-2 h-2 rounded-full ${option?.color} mr-1`} />
                {option?.label}
                <button
                  onClick={() => onToggleCategory(cat)}
                  className="ml-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {activeCategories.size > 3 && (
            <Badge className="bg-purple-950/30 text-purple-400 border border-purple-800/30">
              +{activeCategories.size - 3}
            </Badge>
          )}
        </div>
      )}

      <span className="info-icon ml-auto">
        i
        <span className="tooltip">
          The filter has basic support for providers
          <br />
          GCP, AWS, and Azure for now.
        </span>
      </span>
      </div>

    {/* Horizontal separator */}
    <Separator className="bg-purple-800/30" />
    </div>
  );
}



