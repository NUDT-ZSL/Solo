import { useState } from 'react'
import CardBuilder from './CardBuilder'
import BattleSimulator from './BattleSimulator'
import { Swords, Layers } from 'lucide-react'

export default function App() {
  const [view, setView] = useState<'builder' | 'battle'>('builder')

  return (
    <div className="app-enter">
      <div className="app-container">
        <header className="app-header glass-panel">
          <div className="app-title">⚔ 卡牌构筑竞技场</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setView('builder')}
              style={{
                background: view === 'builder' ? 'linear-gradient(135deg, #4a9eff, #1e5fbf)' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Layers size={16} /> 卡组构建
            </button>
            <button
              onClick={() => setView('battle')}
              style={{
                background: view === 'battle' ? 'linear-gradient(135deg, #ffd700, #ff8c00)' : undefined,
                color: view === 'battle' ? '#1a1a2e' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Swords size={16} /> 战斗模拟
            </button>
          </div>
        </header>

        {view === 'builder' ? (
          <>
            <CardBuilder onStartBattle={() => setView('battle')} />
            <div className="glass-panel battle-panel">
              <div className="panel-title">战斗预览区</div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 24,
                  borderRadius: 12,
                  background:
                    'radial-gradient(ellipse at center, rgba(255, 180, 80, 0.08) 0%, rgba(10, 10, 30, 0.6) 70%)',
                  border: '1px dashed rgba