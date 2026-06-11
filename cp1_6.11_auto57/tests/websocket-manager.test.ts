import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Action,
  CellType,
  createInitialState,
  MazeState,
  Player,
} from '@shared/types';
import { applyActionToState } from '@client/WebSocketManager';

describe('WebSocketManager 工具函数', () => {
  let initialState: MazeState;
  let testPlayer: Player;

  beforeEach(() => {
    initialState = createInitialState();
    testPlayer = {
      id: 'test-player',
      name: '测试玩家',
      color: '#E94560',
      x: 5,
      y: 5,
    };
    initialState.players = [testPlayer];
  });

  describe('applyActionToState', () => {
    it('应该正确应用玩家移动操作', () => {
      const action: Action = {
        id: 'action-1',
        type: 'move',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: 5, y: 5, newX: 8, newY: 3 },
      };

      const newState = applyActionToState(initialState, action);
      const movedPlayer = newState.players.find((p) => p.id === 'test-player');

      expect(movedPlayer?.x).toBe(8);
      expect(movedPlayer?.y).toBe(3);
      expect(initialState.players[0].x).toBe(5);
      expect(initialState.players[0].y).toBe(5);
    });

    it('应该正确应用切换障碍物操作', () => {
      const action: Action = {
        id: 'action-2',
        type: 'toggle_obstacle',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: 3, y: 4, cellType: 'obstacle' as CellType },
      };

      const newState = applyActionToState(initialState, action);
      expect(newState.grid[4][3]).toBe('obstacle');
      expect(initialState.grid[4][3]).toBe('empty');

      const removeAction: Action = {
        id: 'action-3',
        type: 'toggle_obstacle',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: 3, y: 4, cellType: 'empty' as CellType },
      };

      const removedState = applyActionToState(newState, removeAction);
      expect(removedState.grid[4][3]).toBe('empty');
    });

    it('应该正确应用添加提示操作', () => {
      const action: Action = {
        id: 'action-4',
        type: 'add_hint',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: 2, y: 3, text: '这里放炸弹' },
      };

      const newState = applyActionToState(initialState, action);
      expect(newState.hints).toHaveLength(1);
      expect(newState.hints[0].text).toBe('这里放炸弹');
      expect(newState.hints[0].x).toBe(2);
      expect(newState.hints[0].y).toBe(3);
    });

    it('应该不修改原始状态（不可变性）', () => {
      const action: Action = {
        id: 'action-5',
        type: 'toggle_obstacle',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: 0, y: 0, cellType: 'obstacle' as CellType },
      };

      const originalGrid = initialState.grid.map((row) => [...row]);
      const newState = applyActionToState(initialState, action);

      expect(newState.grid).not.toBe(initialState.grid);
      expect(newState.players).not.toBe(initialState.players);
      expect(newState.hints).not.toBe(initialState.hints);
      expect(initialState.grid.map((row) => [...row])).toEqual(originalGrid);
    });

    it('应该忽略越界的障碍物操作', () => {
      const action: Action = {
        id: 'action-6',
        type: 'toggle_obstacle',
        playerId: 'test-player',
        timestamp: Date.now(),
        payload: { x: -1, y: 100, cellType: 'obstacle' as CellType },
      };

      const newState = applyActionToState(initialState, action);
      expect(newState.grid).toEqual(initialState.grid);
    });

    it('应该忽略不存在的玩家移动操作', () => {
      const action: Action = {
        id: 'action-7',
        type: 'move',
        playerId: 'non-existent',
        timestamp: Date.now(),
        payload: { newX: 10, newY: 10 },
      };

      const newState = applyActionToState(initialState, action);
      expect(newState.players).toEqual(initialState.players);
    });

    it('应该正确按顺序应用多个操作', () => {
      const actions: Action[] = [
        {
          id: 'a1',
          type: 'toggle_obstacle',
          playerId: 'test-player',
          timestamp: 1,
          payload: { x: 1, y: 1, cellType: 'obstacle' as CellType },
        },
        {
          id: 'a2',
          type: 'move',
          playerId: 'test-player',
          timestamp: 2,
          payload: { newX: 3, newY: 3 },
        },
        {
          id: 'a3',
          type: 'add_hint',
          playerId: 'test-player',
          timestamp: 3,
          payload: { x: 5, y: 5, text: '提示' },
        },
      ];

      let state = initialState;
      actions.forEach((action) => {
        state = applyActionToState(state, action);
      });

      expect(state.grid[1][1]).toBe('obstacle');
      const player = state.players.find((p) => p.id === 'test-player');
      expect(player?.x).toBe(3);
      expect(player?.y).toBe(3);
      expect(state.hints).toHaveLength(1);
    });
  });
});
