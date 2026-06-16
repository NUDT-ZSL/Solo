/*
 * 主布局组件
 * 被调用：main.tsx
 * 接收：来自 useGameState 的游戏状态和操作方法
 * 返回：完整的游戏界面布局
 * 数据流向：App.tsx -> 传递状态给各子面板组件 -> 子组件调用操作方法 -> 状态更新 -> 重新渲染
 */

import { useGameState } from './useGameState';
import { MinerPanel } from './components/MinerPanel';
import { MarketPanel } from './components/MarketPanel';
import { EquipmentPanel } from './components/EquipmentPanel';
import { AutoMining } from './components/AutoMining';
import { EventPopup } from './components/EventPopup';
import './App.css';

export function App() {
  const { state, hireMiner, upgradeEquipment, trade } = useGameState();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">⛏️ 挖矿经营模拟器</h1>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">金币</span>
            <span className="stat-value gold">{Math.floor(state.coins)}g</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">产量/秒</span>
            <span className="stat-value">{state.outputPerSecond.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">矿工总数</span>
            <span className="stat-value">{state.miners.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总效率</span>
            <span className="stat-value">{state.totalEfficiency.toFixed(1)}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <MinerPanel
            miners={state.miners}
            coins={state.coins}
            onHire={hireMiner}
          />
          <EquipmentPanel
            equipment={state.equipment}
            coins={state.coins}
            onUpgrade={upgradeEquipment}
          />
        </div>

        <div className="center-panel">
          <AutoMining
            animationConfig={state.animationConfig}
            outputPerSecond={state.outputPerSecond}
            activeEvent={state.activeEvent}
          />
        </div>

        <div className="right-panel">
          <MarketPanel
            resources={state.resources}
            coins={state.coins}
            onTrade={trade}
            merchantDiscount={state