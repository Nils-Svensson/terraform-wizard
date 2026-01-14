export type HighlightState =
  | "selected"
  | "connected"
  | "dimmed";

export interface TerraformNodeData {
    displayName: string;
    resourceType: string;
    provider?: string;
    region?: string;
    attributes?: Record<string, any>;

    expanded: boolean
    instanceCount?: number;
    occurrenceCount: number;
    forEach: boolean;
    highlightState?: HighlightState;
    category: string;
  }
  