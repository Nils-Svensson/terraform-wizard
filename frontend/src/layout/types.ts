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


