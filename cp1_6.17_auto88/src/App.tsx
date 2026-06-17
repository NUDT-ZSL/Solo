import React, { useEffect, useRef } from 'react';
import { GameEngine } from './game/gameEngine';
import SkillBar from './components/SkillBar';
import ComboLog from './components/ComboLog';
import { useGameStore } from './store/gameStore';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { cooldowns, comboRecords, setCooldowns, addComboRecord } = useGameStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current.id, {
      onCooldownUpdate: (cd) => setCooldowns(cd),
      onComboRecord: (record) => addComboRecord(record),
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [setCooldowns, addComboRecord]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F0F1A',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              color: '#FFFFFF',
              fontSize: 24,
              fontWeight: 'bold',
              margin: 0,
              marginBottom: 4,
            }}
          >
            技能连招模拟器
          </h1>
          <p
            style={{
              color: '#AAAAAA',
              fontSize: 14,
              margin: 0,
            }}
          >
            冷却与连招系统演示
          </p>
        </div>

        <SkillBar cooldowns={cooldowns} />

        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div id="game-container" ref={containerRef} />
          <ComboLog records={comboRecords} />
        </div>

        <div
          style={{
            color: '#666666',
            fontSize: 12,
            textAlign: 'center',
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          操作说明：WASD 移动角色 | J 轻击 | K 重击 | L 特殊技能
          <br />
          快速连续按下 J → K → L 可触发「三重打击」连招
        </div>
      </div>
    </div>
  );
};

export default App;
