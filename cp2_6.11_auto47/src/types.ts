export interface MindMapNode {
  id: string;
  title: string;
  x: number;
  y: number;
}

export interface MindMapConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  sketchData: string;
  mindMapNodes: MindMapNode[];
  mindMapConnections: MindMapConnection[];
  createdAt: number;
  updatedAt: number;
}
