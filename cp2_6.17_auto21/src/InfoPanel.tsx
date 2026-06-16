import React from 'react';

interface InfoPanelProps {
  depth: number;
  score: number;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ depth, score }) => {
  return (
    <div
      style={{
        width: 240,
        backgroundColor: '#0f2a3e',
        borderRadius: 8,
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            color: '#8899aa',
            fontSize: 12,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          深度
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'monospace',
          }}
        >
          {depth.toFixed(0)} m
        </div>
      </div>

      <div>
        <div
          style={{
            color: '#8899aa',
            fontSize: 12,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          矿物收集
        </div>
        <div
          style={{
            color: '#ffdd44',
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            textShadow: '0 0 10px rgba(255, 221, 68, 0.8), 0 0 20px rgba(255, 221, 68, 0.4)',
          }}
        >
          {score}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            color: '#8899aa',
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          操作提示
        </div>
        <div
          style={{
            color: '#8899aa',
            fontSize: 12,
            lineHeight: 1.8,
          }}
        >
          <div>WASD - 移动潜艇</div>
          <div>空格 - 发射声呐</div>
          <div>目标 - 探索海底遗迹</div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
