import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { Player, createInitialState, MAZE_WIDTH, MAZE_HEIGHT } from '@shared/types';

vi.mock('ws', () => {
  return {
    WebSocket: vi.fn().mockImplementation(() => ({
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    })),
  };
});

class RoomManagerTest {
  private rooms: Map<string, any> = new Map();
  private MAX_HISTORY = 100;
  private MAX_PLAYERS = 8;

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  getOrCreateRoom(roomId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        state: createInitialState(),
        clients: new Map(),
        messageCounters: new Map(),
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  removeRoomIfEmpty(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.clients.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  addPlayerToRoom(roomId: string, playerId: string, player: Player, ws: any) {
    const room = this.getOrCreateRoom(roomId);
    if (room.clients.size >= this.MAX_PLAYERS) {
      return false;
    }
    const existingPlayer = room.state.players.find((p: Player) => p.id === playerId);
    if (!existingPlayer) {
      room.state.players.push(player);
    }
    room.clients.set(playerId, ws);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string) {
    const room = this.getRoom(roomId);
    if (!room) return undefined;
    room.clients.delete(playerId);
    room.messageCounters.delete(playerId);
    const playerIndex = room.state.players.findIndex((p: Player) => p.id === playerId);
    let removedPlayer: Player | undefined;
    if (playerIndex !== -1) {
      removedPlayer = room.state.players[playerIndex];
      room.state.players.splice(playerIndex, 1);
    }
    this.removeRoomIfEmpty(roomId);
    return removedPlayer;
  }

  addHistoryAction(roomId: string, action: any) {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.state.history.push(action);
    if (room.state.history.length > this.MAX_HISTORY) {
      room.state.history = room.state.history.slice(-this.MAX_HISTORY);
    }
  }

  isPositionValid(roomId: string, x: number, y: number) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    if (x < 0 || x >= room.state.width || y < 0 || y >= room.state.height) {
      return false;
    }
    if (room.state.grid[y][x] === 'obstacle') {
      return false;
    }
    return true;
  }
}

describe('RoomManager 房间管理', () => {
  let roomManager: RoomManagerTest;

  beforeEach(() => {
    roomManager = new RoomManagerTest();
  });

  describe('getOrCreateRoom', () => {
    it('应该创建新房间', () => {
      const room = roomManager.getOrCreateRoom('test-room');
      expect(room).toBeDefined();
      expect(room.id).toBe('test-room');
      expect(room.state.players).toEqual([]);
      expect(room.state.grid.length).toBe(MAZE_HEIGHT);
    });

    it('应该返回已存在的房间', () => {
      const room1 = roomManager.getOrCreateRoom('test-room');
      const room2 = roomManager.getOrCreateRoom('test-room');
      expect(room1).toBe(room2);
    });
  });

  describe('addPlayerToRoom', () => {
    it('应该成功添加玩家', () => {
      const ws = {} as any;
      const player: Player = {
        id: 'p1',
        name: '测试玩家',
        color: '#ff0000',
        x: 5,
        y: 5,
      };
      const result = roomManager.addPlayerToRoom('room1', 'p1', player, ws);
      expect(result).toBe(true);
      const room = roomManager.getRoom('room1');
      expect(room.state.players).toHaveLength(1);
      expect(room.state.players[0].id).toBe('p1');
    });

    it('应该限制最多8个玩家', () => {
      for (let i = 0; i < 8; i++) {
        const player: Player = {
          id: `p${i}`,
          name: `玩家${i}`,
          color: '#ff0000',
          x: i,
          y: 0,
        };
        const result = roomManager.addPlayerToRoom('room-full', `p${i}`, player, {} as any);
        expect(result).toBe(true);
      }
      const extraPlayer: Player = {
        id: 'p9',
        name: '额外玩家',
        color: '#ff0000',
        x: 10,
        y: 10,
      };
      const result = roomManager.addPlayerToRoom('room-full', 'p9', extraPlayer, {} as any);
      expect(result).toBe(false);
    });
  });

  describe('removePlayerFromRoom', () => {
    it('应该成功移除玩家', () => {
      const player: Player = {
        id: 'p1',
        name: '测试玩家',
        color: '#ff0000',
        x: 5,
        y: 5,
      };
      roomManager.addPlayerToRoom('room1', 'p1', player, {} as any);
      const removed = roomManager.removePlayerFromRoom('room1', 'p1');
      expect(removed).toBeDefined();
      expect(removed?.id).toBe('p1');
      const room = roomManager.getRoom('room1');
      expect(room.state.players).toHaveLength(0);
    });

    it('应该在房间空时删除房间', () => {
      const player: Player = {
        id: 'p1',
        name: '测试玩家',
        color: '#ff0000',
        x: 5,
        y: 5,
      };
      roomManager.addPlayerToRoom('room-empty', 'p1', player, {} as any);
      roomManager.removePlayerFromRoom('room-empty', 'p1');
      expect(roomManager.getRoom('room-empty')).toBeUndefined();
    });
  });

  describe('isPositionValid', () => {
    it('应该验证网格边界', () => {
      roomManager.getOrCreateRoom('room-valid');
      expect(roomManager.isPositionValid('room-valid', -1, 0)).toBe(false);
      expect(roomManager.isPositionValid('room-valid', 0, -1)).toBe(false);
      expect(roomManager.isPositionValid('room-valid', MAZE_WIDTH, 0)).toBe(false);
      expect(roomManager.isPositionValid('room-valid', 0, MAZE_HEIGHT)).toBe(false);
      expect(roomManager.isPositionValid('room-valid', 5, 5)).toBe(true);
    });

    it('应该检测障碍物', () => {
      const room = roomManager.getOrCreateRoom('room-obstacle');
      room.state.grid[3][3] = 'obstacle';
      expect(roomManager.isPositionValid('room-obstacle', 3, 3)).toBe(false);
      expect(roomManager.isPositionValid('room-obstacle', 4, 4)).toBe(true);
    });
  });

  describe('addHistoryAction', () => {
    it('应该添加历史记录', () => {
      roomManager.getOrCreateRoom('room-history');
      for (let i = 0; i < 50; i++) {
        roomManager.addHistoryAction('room-history', { id: `a${i}`, type: 'move' });
      }
      const room = roomManager.getRoom('room-history');
      expect(room.state.history).toHaveLength(50);
    });

    it('应该限制历史记录最多100条', () => {
      roomManager.getOrCreateRoom('room-history-limit');
      for (let i = 0; i < 150; i++) {
        roomManager.addHistoryAction('room-history-limit', { id: `a${i}`, type: 'move' });
      }
      const room = roomManager.getRoom('room-history-limit');
      expect(room.state.history).toHaveLength(100);
      expect(room.state.history[0].id).toBe('a50');
    });
  });
});
