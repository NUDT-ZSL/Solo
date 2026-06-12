/// <reference types="vite/client" />

declare module 'dagre-d3' {
  export interface GraphLabel {
    rankdir?: string;
    nodesep?: number;
    ranksep?: number;
    marginx?: number;
    marginy?: number;
  }

  export interface NodeConfig {
    label: string;
    width?: number;
    height?: number;
    class?: string;
    [key: string]: unknown;
  }

  export interface EdgeConfig {
    label?: string;
    class?: string;
    [key: string]: unknown;
  }

  export interface LayoutNode {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    [key: string]: unknown;
  }

  export interface LayoutEdge {
    points: Array<{ x: number; y: number }>;
    [key: string]: unknown;
  }

  export class Graph {
    constructor(options?: { directed?: boolean; compound?: boolean; multigraph?: boolean });
    setGraph(label: GraphLabel): Graph;
    setDefaultEdgeLabel(fn: (v: string, w: string) => EdgeConfig): Graph;
    setNode(v: string, config: NodeConfig): Graph;
    setEdge(v: string, w: string, config?: EdgeConfig): Graph;
    node(v: string): LayoutNode | undefined;
    edge(v: string, w: string): LayoutEdge | undefined;
    nodes(): string[];
    edges(): Array<{ v: string; w: string }>;
    nodeCount(): number;
    edgeCount(): number;
    hasNode(v: string): boolean;
    hasEdge(v: string, w: string): boolean;
  }

  export const graphlib: {
    Graph: typeof Graph;
  };

  export function layout(g: Graph): Graph;

  export class render {
    constructor();
    (parent: unknown, g: Graph): void;
  }
}
