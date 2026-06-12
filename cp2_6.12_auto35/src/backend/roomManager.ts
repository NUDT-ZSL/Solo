import { v4 as uuidv4 } from 'uuid';
import type { EscapeRoom, Room, Item, Puzzle, PlayerState, GameSession, Wall } from '../types';

export class RoomManager {
  private escapeRooms: Map<string, EscapeRoom> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();

  createEscapeRoom(name: string, designerId: string): EscapeRoom {
    const room: EscapeRoom = {
      id: uuidv4(),
      name,
      designerId,
      createdAt: Date.now(),
      rooms: [this.createDefaultRoom('房间 1', true)]
    };
    this.escapeRooms.set(room.id, room);
    return room;
  }

  private createDefaultRoom(name: string, isStart: boolean = false): Room {
    const width = 12;
    const height = 10;
    const walls: Wall[] = [];
    
    for (let x = 0; x < width; x++) {
      walls.push({ x, y: 0, visible: true });
      walls.push({ x, y: height - 1, visible: true });
    }
    for (let y = 1; y < height - 1; y++) {
      walls.push({ x: 0, y, visible: true });
      walls.push({ x: width - 1, y, visible: true });
    }

    return {
      id: uuidv4(),
      name,
      width,
      height,
      walls,
      items: [],
      isStartRoom: isStart
    };
  }

  addRoom(escapeRoomId: string, roomName: string): Room | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom || escapeRoom.rooms.length >= 3) return null;
    
    const newRoom = this.createDefaultRoom(roomName);
    escapeRoom.rooms.push(newRoom);
    return newRoom;
  }

  getEscapeRoom(id: string): EscapeRoom | undefined {
    return this.escapeRooms.get(id);
  }

  updateEscapeRoom(id: string, updates: Partial<EscapeRoom>): EscapeRoom | null {
    const room = this.escapeRooms.get(id);
    if (!room) return null;
    Object.assign(room, updates);
    return room;
  }

  updateRoom(escapeRoomId: string, roomId: string, updates: Partial<Room>): Room | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return null;
    
    const roomIndex = escapeRoom.rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return null;
    
    escapeRoom.rooms[roomIndex] = { ...escapeRoom.rooms[roomIndex], ...updates };
    return escapeRoom.rooms[roomIndex];
  }

  addItem(escapeRoomId: string, roomId: string, item: Omit<Item, 'id'>): Item | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return null;
    
    const room = escapeRoom.rooms.find(r => r.id === roomId);
    if (!room) return null;
    
    const newItem: Item = { ...item, id: uuidv4() };
    room.items.push(newItem);
    return newItem;
  }

  updateItem(escapeRoomId: string, roomId: string, itemId: string, updates: Partial<Item>): Item | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return null;
    
    const room = escapeRoom.rooms.find(r => r.id === roomId);
    if (!room) return null;
    
    const itemIndex = room.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return null;
    
    room.items[itemIndex] = { ...room.items[itemIndex], ...updates };
    return room.items[itemIndex];
  }

  removeItem(escapeRoomId: string, roomId: string, itemId: string): boolean {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return false;
    
    const room = escapeRoom.rooms.find(r => r.id === roomId);
    if (!room) return false;
    
    const initialLength = room.items.length;
    room.items = room.items.filter(i => i.id !== itemId);
    return room.items.length < initialLength;
  }

  setWall(escapeRoomId: string, roomId: string, x: number, y: number, visible: boolean): Wall | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return null;
    
    const room = escapeRoom.rooms.find(r => r.id === roomId);
    if (!room) return null;
    
    const wallIndex = room.walls.findIndex(w => w.x === x && w.y === y);
    
    if (wallIndex !== -1) {
      room.walls[wallIndex].visible = visible;
      return room.walls[wallIndex];
    } else if (visible) {
      const newWall: Wall = { x, y, visible: true };
      room.walls.push(newWall);
      return newWall;
    }
    return null;
  }

  createGameSession(escapeRoomId: string, playerName: string): GameSession | null {
    const escapeRoom = this.escapeRooms.get(escapeRoomId);
    if (!escapeRoom) return null;

    const startRoom = escapeRoom.rooms.find(r => r.isStartRoom) || escapeRoom.rooms[0];
    
    const player: PlayerState = {
      id: uuidv4(),
      name: playerName,
      currentRoomId: startRoom.id,
      inventory: [],
      solvedPuzzles: [],
      startTime: Date.now(),
      totalAttempts: 0,
      successfulAttempts: 0
    };

    const session: GameSession = {
      id: uuidv4(),
      roomId: escapeRoomId,
      escapeRoom: JSON.parse(JSON.stringify(escapeRoom)),
      players: [player],
      status: 'playing'
    };

    this.gameSessions.set(session.id, session);
    return session;
  }

  getGameSession(sessionId: string): GameSession | undefined {
    return this.gameSessions.get(sessionId);
  }

  solvePuzzle(sessionId: string, playerId: string, itemId: string, answer: string): {
    success: boolean;
    message: string;
    item?: Item;
    effect?: Item['effect'];
    allSolved?: boolean;
  } {
    const session = this.gameSessions.get(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    const player = session.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: '玩家不存在' };

    let targetItem: Item | undefined;
    let targetRoom: Room | undefined;

    for (const room of session.escapeRoom.rooms) {
      const item = room.items.find(i => i.id === itemId);
      if (item) {
        targetItem = item;
        targetRoom = room;
        break;
      }
    }

    if (!targetItem || !targetItem.puzzle) {
      return { success: false, message: '道具不存在或没有谜题' };
    }

    player.totalAttempts++;

    if (targetItem.solved) {
      return { success: true, message: '已经解开过了', item: targetItem };
    }

    const isCorrect = this.checkAnswer(targetItem.puzzle, answer);
    
    if (isCorrect) {
      targetItem.solved = true;
      player.successfulAttempts++;
      player.solvedPuzzles.push(targetItem.id);

      if (targetItem.effect) {
        this.applyEffect(session, targetItem.effect, targetRoom?.id);
      }

      const allSolved = this.checkAllDoorsUnlocked(session);
      
      return {
        success: true,
        message: '解谜成功！',
        item: targetItem,
        effect: targetItem.effect,
        allSolved
      };
    }

    return { success: false, message: '答案错误' };
  }

  private checkAnswer(puzzle: Puzzle, answer: string): boolean {
    const normalizedAnswer = answer.trim().toLowerCase();
    const normalizedCorrect = puzzle.answer.trim().toLowerCase();
    
    if (puzzle.type === 'number') {
      return normalizedAnswer === normalizedCorrect;
    }
    if (puzzle.type === 'text') {
      return normalizedAnswer === normalizedCorrect;
    }
    if (puzzle.type === 'image') {
      return normalizedAnswer === normalizedCorrect;
    }
    return false;
  }

  private applyEffect(session: GameSession, effect: Item['effect'], roomId?: string): void {
    if (!effect) return;

    switch (effect.type) {
      case 'open_door':
      case 'unlock_next_room':
        if (effect.targetId) {
          for (const room of session.escapeRoom.rooms) {
            const doorItem = room.items.find(i => i.id === effect.targetId);
            if (doorItem && doorItem.type === 'door') {
              doorItem.doorLocked = false;
            }
          }
        }
        break;
      case 'remove_wall':
        if (roomId) {
          const room = session.escapeRoom.rooms.find(r => r.id === roomId);
          if (room && effect.targetId) {
            const [wx, wy] = effect.targetId.split(',').map(Number);
            const wall = room.walls.find(w => w.x === wx && w.y === wy);
            if (wall) {
              wall.visible = false;
            }
          }
        }
        break;
    }
  }

  private checkAllDoorsUnlocked(session: GameSession): boolean {
    for (const room of session.escapeRoom.rooms) {
      for (const item of room.items) {
        if (item.type === 'door' && item.doorLocked) {
          return false;
        }
      }
    }
    return session.escapeRoom.rooms.length > 0;
  }

  collectItem(sessionId: string, playerId: string, itemId: string): {
    success: boolean;
    item?: Item;
    message: string;
  } {
    const session = this.gameSessions.get(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    const player = session.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: '玩家不存在' };

    for (const room of session.escapeRoom.rooms) {
      const itemIndex = room.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const item = room.items[itemIndex];
        if (item.collected) {
          return { success: false, message: '道具已被收集' };
        }
        if (item.type === 'door') {
          return { success: false, message: '门不能收集' };
        }
        item.collected = true;
        player.inventory.push(item);
        return { success: true, item, message: '已收集道具' };
      }
    }

    return { success: false, message: '道具不存在' };
  }

  useItem(sessionId: string, playerId: string, itemId: string, targetItemId: string): {
    success: boolean;
    message: string;
  } {
    const session = this.gameSessions.get(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    const player = session.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: '玩家不存在' };

    const inventoryItem = player.inventory.find(i => i.id === itemId);
    if (!inventoryItem) return { success: false, message: '物品栏中没有该道具' };

    return { success: true, message: '使用道具成功' };
  }

  moveToRoom(sessionId: string, playerId: string, roomId: string): {
    success: boolean;
    message: string;
    roomId?: string;
  } {
    const session = this.gameSessions.get(sessionId);
    if (!session) return { success: false, message: '会话不存在' };

    const player = session.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: '玩家不存在' };

    const targetRoom = session.escapeRoom.rooms.find(r => r.id === roomId);
    if (!targetRoom) return { success: false, message: '房间不存在' };

    player.currentRoomId = roomId;
    return { success: true, message: '进入房间', roomId };
  }

  getPlayerStats(sessionId: string, playerId: string): {
    totalTime: number;
    successRate: number;
    totalPuzzles: number;
    solvedPuzzles: number;
  } | null {
    const session = this.gameSessions.get(sessionId);
    if (!session) return null;

    const player = session.players.find(p => p.id === playerId);
    if (!player) return null;

    const totalTime = Date.now() - player.startTime;
    const successRate = player.totalAttempts > 0 
      ? (player.successfulAttempts / player.totalAttempts) * 100 
      : 0;

    let totalPuzzles = 0;
    for (const room of session.escapeRoom.rooms) {
      totalPuzzles += room.items.filter(i => i.puzzle).length;
    }

    return {
      totalTime,
      successRate,
      totalPuzzles,
      solvedPuzzles: player.solvedPuzzles.length
    };
  }
}

export const roomManager = new RoomManager();
