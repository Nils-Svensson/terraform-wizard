
export interface ResourceLocation {
  kind: string;
  value: string;
}

export type HighlightState =
  | "selected"
  | "connected"
  | "dimmed";

export interface TerraformNodeData {
    displayName: string;
    resourceType: string;
    provider?: string;
    attributes?: Record<string, string>;

    expanded: boolean
    instanceCount?: number;
    occurrenceCount: number;
    forEach: boolean;
    highlightState?: HighlightState;
    category: string;
    location?: ResourceLocation;
  }
  