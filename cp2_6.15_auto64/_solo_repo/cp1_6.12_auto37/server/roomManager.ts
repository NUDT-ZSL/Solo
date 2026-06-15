import { Node, Edge } from 'reactflow';

export interface User {
  id: string;
  nickname: string;
  color: string;
}

export interface RoomState {
  nodes: Node[];
  edges: Edge[];
  users: Map<string, User>;
}

const rooms = new Map<string, RoomState>();

const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

function getRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

export function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      nodes: [],
      edges: [],
      users: new Map(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

export function addUserToRoom(
  roomId: string,
  userId: string,
  nickname: string
): User {
  const room = getOrCreateRoom(roomId);
  const user: User = {
    id: userId,
    nickname,
    color: getRandomColor(),
  };
  room.users.set(userId, user);
  return user;
}

export function removeUserFromRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.users.delete(userId);
    if (room.users.size === 0) {
      rooms.delete(roomId);
    }
  }
}

export function getRoomUsers(roomId: string): User[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
}

export function updateRoomNodes(roomId: string, nodes: Node[]): void {
  const room = getOrCreateRoom(roomId);
  room.nodes = nodes;
}

export function updateRoomEdges(roomId: string, edges: Edge[]): void {
  const room = getOrCreateRoom(roomId);
  room.edges = edges;
}

export function getRoomState(roomId: string): { nodes: Node[]; edges: Edge[] } {
  const room = getOrCreateRoom(roomId);
  return {
    nodes: room.nodes,
    edges: room.edges,
  };
}
