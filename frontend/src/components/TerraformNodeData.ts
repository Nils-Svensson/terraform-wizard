
export interface ResourceLocation {
  kind: string;
  value: string;
}

export type HighlightState =
  | "normal"
  | "selected"
  | "connected"
  | "dimmed";

export interface TerraformNodeData {
    name: string;
    displayName: string;
    resourceType: string;
    provider?: string;
    attributes?: Record<string, string>;

    expanded: boolean;
    instanceCount?: number;
    occurrenceCount: number;
    forEach: boolean;
    highlightState?: HighlightState;
    category: string;
    location?: ResourceLocation;
    filePath?: string;
    lineNumber?: number;

    // Dependency degree — out = things this node depends on, in = things that depend on this
    deps?: number;
    dependents?: number;

    // Set when a category filter is active and this node matches; used to color the highlight ring
    filterColor?: string;

    // Module expansion
    isChild?: boolean;          // true when this node is inside an expanded module container
    memberCount?: number;       // set on module nodes when expansion is available
    onToggleExpand?: () => void; // called by the expand button; stops event propagation
  }
  