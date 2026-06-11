import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  MazeState,
  MAZE_WIDTH,
  MAZE_HEIGHT,
  Player,
  CellType,
} from '@shared/types';

function encodeShareData(state: MazeState): string {
  const compact = {
    g: state.grid.map((row) => row.map((c) => (c === 'obstacle' ? 1 : 0)).join('')),
    p: state.players.map((p) => ({ n: p.name, c: p.color, x: p.x, y: p.y })),
    w: state.width,
    h: state.height,
  };
  const json = JSON.stringify(compact);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

function decodeShareData(encoded: string): Partial<MazeState> | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const compact = JSON.parse(json);
    const grid: CellType[][] = compact.g.map((row: string) =>
      row.split('').map((c: string) => (c === '1' ? 'obstacle' : 'empty'))
    );
    const players: Player[] = compact.p.map((p: any, i: number) => ({
      id: `imported-${i}`,
      name: p.n,
      color: p.c,
      x: p.x,
      y: p.y,
    }));
    return {
      width: compact.w || MAZE_WIDTH,
      height: compact.h || MAZE_HEIGHT,
      grid,
      players,
      hints: [],
      history: [],
    };
  } catch {
    return null;
  }
}

describe('分享链接编解码', () => {
  describe('encodeShareData', () => {
    it('应该正确编码空迷宫', () => {
      const state = createInitialState();
      const encoded = encodeShareData(state);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(() => Buffer.from(encoded, 'base64url').toString('utf-8')).not.toThrow();
    });

    it('应该正确编码包含障碍物和玩家的迷宫', () => {
      const state = createInitialState();
      state.grid[0][0] = 'obstacle';
      state.grid[5][5] = 'obstacle';
      state.grid[10][10] = 'obstacle';
      state.players = [
        { id: 'p1', name: '玩家1', color: '#E94560', x: 3, y: 3 },
        { id: 'p2', name: '玩家2', color: '#0F3460', x: 7, y: 7 },
      ];
      const encoded = encodeShareData(state);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('decodeShareData', () => {
    it('应该正确解码空迷宫', () => {
      const state = createInitialState();
      const encoded = encodeShareData(state);
      const decoded = decodeShareData(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.width).toBe(MAZE_WIDTH);
      expect(decoded?.height).toBe(MAZE_HEIGHT);
      expect(decoded?.players).toEqual([]);
      expect(decoded?.grid.length).toBe(MAZE_HEIGHT);
    });

    it('应该正确解码包含障碍物和玩家的迷宫', () => {
      const state = createInitialState();
      state.grid[0][0] = 'obstacle';
      state.grid[5][5] = 'obstacle';
      state.grid[19][19] = 'obstacle';
      state.players = [
        { id: 'p1', name: '玩家1', color: '#E94560', x: 3, y: 3 },
        { id: 'p2', name: '玩家2', color: '#0F3460', x: 7, y: 7 },
      ];
      const encoded = encodeShareData(state);
      const decoded = decodeShareData(encoded);

      expect(decoded?.grid[0][0]).toBe('obstacle');
      expect(decoded?.grid[5][5]).toBe('obstacle');
      expect(decoded?.grid[19][19]).toBe('obstacle');
      expect(decoded?.grid[1][1]).toBe('empty');
      expect(decoded?.players).toHaveLength(2);
      expect(decoded?.players?.[0].name).toBe('玩家1');
      expect(decoded?.players?.[0].color).toBe('#E94560');
      expect(decoded?.players?.[0].x).toBe(3);
      expect(decoded?.players?.[0].y).toBe(3);
    });

    it('应该对无效数据返回null', () => {
      expect(decodeShareData('')).toBeNull();
      expect(decodeShareData('!!!invalid!!!')).toBeNull();
      expect(decodeShareData('aGVsbG8gd29ybGQ=')).toBeNull();
    });
  });

  describe('编解码往返', () => {
    it('应该正确进行编解码往返测试', () => {
      const original = createInitialState();
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * MAZE_WIDTH);
        const y = Math.floor(Math.random() * MAZE_HEIGHT);
        original.grid[y][x] = 'obstacle';
      }
      for (let i = 0; i < 5; i++) {
        original.players.push({
          id: `p${i}`,
          name: `玩家${i}`,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          x: i,
          y: i,
        });
      }

      const encoded = encodeShareData(original);
      const decoded = decodeShareData(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.width).toBe(original.width);
      expect(decoded?.height).toBe(original.height);
      expect(decoded?.players?.length).toBe(original.players.length);

      for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
          expect(decoded?.grid[y][x]).toBe(original.grid[y][x]);
        }
      }

      original.players.forEach((p, i) => {
        expect(decoded?.players?.[i].name).toBe(p.name);
        expect(decoded?.players?.[i].color).toBe(p.color);
        expect(decoded?.players?.[i].x).toBe(p.x);
        expect(decoded?.players?.[i].y).toBe(p.y);
      });
    });
  });
});
