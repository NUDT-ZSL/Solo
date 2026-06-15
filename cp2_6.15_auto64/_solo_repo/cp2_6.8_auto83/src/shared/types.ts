export interface NodeData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: number;
  undoData?: any;
}

export interface User {
  id: string;
  name: string;
}

export interface RoomState {
  roomCode: string;
  users: User[];
  nodes: NodeData[];
  edges: EdgeData[];
  history: HistoryRecord[];
}

export type ClientMessage =
  | { type: 'createRoom'; userName: string }
  | { type: 'joinRoom'; roomCode: string; userName: string }
  | { type: 'addNode'; node: NodeData }
  | { type: 'updateNode'; node: NodeData }
  | { type: 'deleteNode'; nodeId: string }
  | { type: 'addEdge'; edge: EdgeData }
  | { type: 'updateEdge'; edge: EdgeData }
  | { type: 'deleteEdge'; edgeId: string }
  | { type: 'undo'; recordId: string }
  | { type: 'chat'; message: string };

export type ServerMessage =
  | { type: 'roomCreated'; roomCode: string; userId: string }
  | { type: 'roomJoined'; state: RoomState; userId: string }
  | { type: 'error'; message: string }
  | { type: 'userJoined'; user: User }
  | { type: 'userLeft'; userId: string }
  | { type: 'nodeAdded'; node: NodeData; record: HistoryRecord }
  | { type: 'nodeUpdated'; node: NodeData; record: HistoryRecord }
  | { type: 'nodeDeleted'; nodeId: string; record: HistoryRecord }
  | { type: 'edgeAdded'; edge: EdgeData; record: HistoryRecord }
  | { type: 'edgeUpdated'; edge: EdgeData; record: HistoryRecord }
  | { type: 'edgeDeleted'; edgeId: string; record: HistoryRecord }
  | { type: 'chat'; userName: string; message: string; timestamp: number };

export const PRESET_COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA'];
