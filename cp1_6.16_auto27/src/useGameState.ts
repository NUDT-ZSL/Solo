/*
 * 游戏状态管理 Hook
 * 被调用：App.tsx
 * 接收：无，内部初始化游戏状态
 * 返回：{ state, dispatch } 状态和操作方法
 * 数据流向：useGameState -> 调用 gameEngine 函数 -> 更新状态 -> 返回给组件
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, MinerLevel, ResourceType, EquipmentType } from './types';
import {
  createInitialState,
  hireMiner,
  upgradeEquipment,
  trade,
  startGameLoop,
} from './gameEngine';

export function useGameState() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const stateRef = useRef<GameState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    const stopLoop = startGameLoop(state, setState, getState);
    return stopLoop;
  }, [getState]);

  const handleHireMiner = useCallback((level: MinerLevel) => {
    setState(prev => hireMiner(prev, level));
  }, []);

  const handleUpgradeEquipment = useCallback((type: EquipmentType) => {
    setState(prev => upgradeEquipment(prev, type));
  }, []);

  const handleTrade = useCallback((resourceType: ResourceType, amount: number, isBuy: boolean) => {
    setState(prev => trade(prev, resourceType, amount, isBuy));
  }, []);

  return {
    state,
    hireMiner: handleHireMiner,
    upgradeEquipment: handleUpgradeEquipment,
    trade: handleTrade,
  };
}
