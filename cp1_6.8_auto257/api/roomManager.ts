import type { DrawOperation, ChatMessage, Room } from '../shared/types.js';

const rooms = new Map<string, Room>();
const operations = new Map<string, DrawOperation[]>();
const undoStacks = new Map<string, DrawOperation[]>();
const redoStacks = new Map<string, DrawOperation[]>();
const users = new Map<string, Set<string>>();
const chatMessages = new Map<string, ChatMessage[]>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createRoom(): string {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }
  const room: Room = {
    roomId,
    createdAt: Date.now(),
    maxUsers: 10,
  };
  rooms.set(roomId, room);
  operations.set(roomId, []);
  undoStacks.set(roomId, []);
  redoStacks.set(roomId, []);
  users.set(roomId, new Set());
  chatMessages.set(roomId, []);
  return roomId;
}

export function joinRoom(roomId: string, userId: string): { success: boolean; message?: string } {
  if (!rooms.has(roomId)) {
    return { success: false, message: 'Room not found' };
  }
  const roomUsers = users.get(roomId)!;
  if (roomUsers.size >= rooms.get(roomId)!.maxUsers) {
    return { success: false, message: 'Room is full' };
  }
  roomUsers.add(userId);
  return { success: true };
}

export function leaveRoom(roomId: string, userId: string): void {
  const roomUsers = users.get(roomId);
  if (roomUsers) {
    roomUsers.delete(userId);
    if (roomUsers.size === 0) {
      rooms.delete(roomId);
      operations.delete(roomId);
      undoStacks.delete(roomId);
      redoStacks.delete(roomId);
      chatMessages.delete(roomId);
      users.delete(roomId);
    }
  }
}

export function addOperation(roomId: string, operation: DrawOperation): void {
  const ops = operations.get(roomId);
  if (ops) {
    ops.push(operation);
    const redo = redoStacks.get(roomId);
    if (redo) {
      redo.length = 0;
    }
  }
}

export function undoOperation(roomId: string, operationId: string, userId: string): DrawOperation | null {
  const ops = operations.get(roomId);
  const undoStack = undoStacks.get(roomId);
  if (!ops || !undoStack) return null;

  const index = ops.findIndex(op => op.id === operationId && op.userId === userId);
  if (index === -1) return null;

  const [removed] = ops.splice(index, 1);
  undoStack.push(removed);
  return removed;
}

export function redoOperation(roomId: string, operation: DrawOperation, userId: string): DrawOperation | null {
  const ops = operations.get(roomId);
  const redoStack = redoStacks.get(roomId);
  const undoStack = undoStacks.get(roomId);
  if (!ops || !redoStack || !undoStack) return null;

  const undoIndex = undoStack.findIndex(op => op.id === operation.id && op.userId === userId);
  if (undoIndex === -1) return null;

  undoStack.splice(undoIndex, 1);
  ops.push(operation);
  return operation;
}

export function getOperations(roomId: string): DrawOperation[] {
  return operations.get(roomId) || [];
}

export function getUsers(roomId: string): string[] {
  const roomUsers = users.get(roomId);
  return roomUsers ? Array.from(roomUsers) : [];
}

export function addChatMessage(roomId: string, message: ChatMessage): void {
  const msgs = chatMessages.get(roomId);
  if (msgs) {
    msgs.push(message);
  }
}

export function getChatMessages(roomId: string): ChatMessage[] {
  return chatMessages.get(roomId) || [];
}

export function addEmoji(roomId: string, msgId: string, userId: string, emoji: string): void {
  const msgs = chatMessages.get(roomId);
  if (!msgs) return;
  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.emojis[emoji]) {
    msg.emojis[emoji] = [];
  }
  if (!msg.emojis[emoji].includes(userId)) {
    msg.emojis[emoji].push(userId);
  }
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

export function getUserCount(roomId: string): number {
  const roomUsers = users.get(roomId);
  return roomUsers ? roomUsers.size : 0;
}
