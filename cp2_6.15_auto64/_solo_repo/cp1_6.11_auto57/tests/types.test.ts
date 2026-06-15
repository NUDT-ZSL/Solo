import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  createInitialState,
  getRandomColor,
  getRandomName,
  PLAYER_COLORS,
  PLAYER_NAMES,
  MAZE_WIDTH,
  MAZE_HEIGHT,
  MAX_HISTORY,
} from '@shared/types';

describe('共享类型工具函数', () => {
  describe('createEmptyGrid', () => {
    it('应该创建正确尺寸的空网格', () => {
      const grid = createEmptyGrid(10, 8);
      expect(grid.length).toBe(8);
      expect(grid[0].length).toBe(10);
      grid.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBe('empty');
        });
      });
    });

    it('应该创建20x20的默认迷宫尺寸', () => {
      const state = createInitialState();
      expect(state.width).toBe(MAZE_WIDTH);
      expect(state.height).toBe(MAZE_HEIGHT);
      expect(state.grid.length).toBe(MAZE_HEIGHT);
      expect(state.grid[0].length).toBe(MAZE_WIDTH);
    });
  });

  describe('createInitialState', () => {
    it('应该初始化空的玩家、提示和历史', () => {
      const state = createInitialState();
      expect(state.players).toEqual([]);
      expect(state.hints).toEqual([]);
      expect(state.history).toEqual([]);
    });
  });

  describe('getRandomColor', () => {
    it('应该返回预定义颜色列表中的颜色', () => {
      for (let i = 0; i < 20; i++) {
        const color = getRandomColor();
        expect(PLAYER_COLORS).toContain(color);
      }
    });
  });

  describe('getRandomName', () => {
    it('应该返回包含基础名称和数字的随机名称', () => {
      const name = getRandomName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      const baseName = PLAYER_NAMES.find((n) => name.startsWith(n));
      expect(baseName).toBeDefined();
    });
  });

  describe('常量', () => {
    it('应该定义正确的常量值', () => {
      expect(MAZE_WIDTH).toBe(20);
      expect(MAZE_HEIGHT).toBe(20);
      expect(MAX_HISTORY).toBe(100);
      expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(8);
    });
  });
});
