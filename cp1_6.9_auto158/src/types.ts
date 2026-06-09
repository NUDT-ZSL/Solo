export interface User {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  lastActive: number;
  isOnline: boolean;
}

export interface MindNode {
  id: string;
  text: string;
  x: number;
  y: number;
  bgColor: string;
  borderColor: string;
  width: number;
  height: number;
  lastEditorId: string;
  lastEditTime: number;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  lineWidth: number;
  createdAt: number;
}

export type OpType =
  | 'node_add'
  | 'node_update'
  | 'node_move'
  | 'node_delete'
  | 'connection_add'
  | 'connection_delete';

export interface OpPacket {
  opId: string;
  userId: string;
  timestamp: number;
  type: OpType;
  targetId: string;
  oldValue?: any;
  newValue?: any;
}

export interface ConflictNotice {
  conflictId: string;
  nodeId: string;
  users: { id: string; name: string; content: string; timestamp: number }[];
  winnerId: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  nodes: MindNode[];
  connections: Connection[];
}

export type WSMessageType =
  | 'hello'
  | 'full_state'
  | 'op'
  | 'op_broadcast'
  | 'conflict'
  | 'cursor_broadcast'
  | 'user_join'
  | 'user_leave'
  | 'ping'
  | 'pong'
  | 'snapshot_list'
  | 'recover_to'
  | 'conflict_resolve';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
}

export const SCI_FI_NAMES = [
  'Astro', 'Nova', 'Orion', 'Cosmo', 'Vega', 'Zephyr', 'Aether', 'Nebula',
  'Stella', 'Luna', 'Sol', 'Mars', 'Atlas', 'Phoenix', 'Rocket', 'Comet',
  'Echo', 'Quantum', 'Cyborg', 'Neon', 'Pixel', 'Matrix', 'Warp', 'Holo',
  'Vortex', 'Pulsar', 'Quasar', 'Zenith', 'Nexus', 'Pulse'
];

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF',
  '#9B59B6', '#FF8C42', '#1ABC9C', '#F78FB3', '#5DADE2',
  '#BB8FCE', '#58D68D'
];

export const NODE_COLORS = [
  '#FF6B35', '#4ECDC4', '#A3E4D7', '#F7DC6F', '#BB8FCE',
  '#F1948A', '#85C1E2', '#82E0AA', '#F8B500', '#5DADE2'
];

export const DEFAULT_NODE_WIDTH = 80;
export const DEFAULT_NODE_HEIGHT = 50;
export const DEFAULT_FONT_SIZE = 16;
