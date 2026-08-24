export interface LayoutNode {
    id: string;
    width?: number;
    height?: number;
  }
  
  export interface TraversalData {
    componentID: string;
    depth: number;
    isCyclic: boolean;
  }
  
  export interface LayoutResult {
    positions: Record<
      string,
      { x: number; y: number }
    >;
  }

  export type LayoutFn = (
    nodes: LayoutNode[],
    analysis: {
      traversalData: Record<string, TraversalData>;
      degree: Record<string, number>;
      orphanNodes: string[];
      roots: Record<string, string[]>;
      totalNodes: number;
      nodesByComponent: Record<string, number>;
      components: Record<string, string[]>;
      maxDepth: Record<string, number>;
      parents: Record<string, string[]>;

    },

    viewport: { 
        width: number; 
        height: number; 
    }
  ) => LayoutResult;
  

  

