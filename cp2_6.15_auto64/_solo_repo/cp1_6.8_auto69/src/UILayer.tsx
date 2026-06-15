import React, { useRef, useEffect } from 'react';
import { GameUIState, RankingEntry, ResultEntry } from './types';

interface Props {
  state: GameUIState;
  onRestart: () => void;
}

export const UILayer: React.FC<Props> = ({ state, onRestart }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: "'Segoe UI', sans-serif" }}>
      <Speedometer speed={state.speed} maxSpeed={state.maxSpeed} />
      <ItemBar item={state.item} cooldown={state.cooldown} shieldActive={state.shieldActive} nitroActive={state.nitroActive} />
      <Minimap track={state.track} vehicles={state.vehicles} />
      <RankingPanel rankings={state.rankings} playerRank={state.rank} />
      <LapDisplay lap={state.lap} totalLaps={state.totalLaps} />
      <TimerDisplay elapsed={state.elapsed} />
      {state.phase === 'finished' && state.result && (
        <ResultPanel result={state.result} onRestart={onRestart} />
      )}
    </div>
  );
};

const Speedometer: React.FC<{ speed: number; maxSpeed: number }> = ({ speed, maxSpeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 70;

    ctx.clearRect(0, 0, w, h);

    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const range = endAngle - startAngle;

    ctx.strokeStyle = 'rgba(255, 80, 0, 0.3)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();

    const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
    const speedAngle = startAngle + ratio * range;
    const gradient = ctx.createConicGradient(startAngle, cx, cy);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, '#ff2200');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, speedAngle);
    ctx.stroke();

    for (let i = 0; i <= 8; i++) {
      const a = startAngle + (i / 8) * range;
      const inner = radius - 15;
      const outer = radius - 8;
      ctx.strokeStyle = 'rgba(255, 150, 50, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    const needleAngle = speedAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needleAngle);
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.moveTo(radius - 20, 0);
    ctx.lineTo(-8, -3);
    ctx.lineTo(-8, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(Math.abs(speed))), cx, cy + 25);

    ctx.fillStyle = '#aa6633';
    ctx.font = '10px monospace';
    ctx.fillText('KM/H', cx, cy + 42);
  }, [speed, maxSpeed]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={140}
      style={{ position: 'absolute', top: 12, left: 12 }}
    />
  );
};

const ItemBar: React.FC<{
  item: string | null;
  cooldown: number;
  shieldActive: boolean;
  nitroActive: boolean;
}> = ({ item, cooldown, shieldActive, nitroActive }) => {
  const hasItem = item !== null;
  const iconColor = item === 'nitro' ? '#00aaff' : item === 'shield' ? '#00ff88' : '#555';
  const iconText = item === 'nitro' ? 'N' : item === 'shield' ? 'S' : '-';
  const label = item === 'nitro' ? '氮气' : item === 'shield' ? '护盾' : '空';

  const activeEffect = shieldActive
    ? '0 0 15px #00ff88, 0 0 30px #00ff8866'
    : nitroActive
    ? '0 0 15px #00aaff, 0 0 30px #00aaff66'
    : 'none';

  const cooldownRatio = cooldown > 0 ? Math.min(1, cooldown / 5) : 0;

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        border: `3px solid ${hasItem ? iconColor : '#333'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hasItem ? `${iconColor}22` : '#1a1a1a',
        boxShadow: activeEffect,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {cooldownRatio > 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `conic-gradient(rgba(0,0,0,0.6) ${cooldownRatio * 360}deg, transparent ${cooldownRatio * 360}deg)`,
            borderRadius: '50%',
          }} />
        )}
        <span style={{
          color: hasItem ? iconColor : '#555',
          fontSize: 24,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          position: 'relative',
          zIndex: 1,
        }}>
          {iconText}
        </span>
      </div>
      <span style={{ color: hasItem ? iconColor : '#555', fontSize: 11, fontWeight: 'bold' }}>{label}</span>
      {cooldown > 0 && (
        <span style={{ color: '#ff8800', fontSize: 10, fontFamily: 'monospace' }}>
          {cooldown.toFixed(1)}s
        </span>
      )}
      <span style={{ color: '#666', fontSize: 10 }}>空格使用</span>
    </div>
  );
};

const Minimap: React.FC<{ track: any[]; vehicles: any[] }> = ({ track, vehicles }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10, 5, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    if (track.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const seg of track) {
      minX = Math.min(minX, seg.center.x);
      minY = Math.min(minY, seg.center.y);
      maxX = Math.max(maxX, seg.center.x);
      maxY = Math.max(maxY, seg.center.y);
    }

    const padding = 12;
    const scaleX = (w - padding * 2) / (maxX - minX || 1);
    const scaleY = (h - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);
    const offX = (w - (maxX - minX) * scale) / 2;
    const offY = (h - (maxY - minY) * scale) / 2;

    const tx = (x: number, y: number) => ({
      mx: (x - minX) * scale + offX,
      my: (y - minY) * scale + offY,
    });

    ctx.strokeStyle = '#553311';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < track.length; i += 3) {
      const { mx, my } = tx(track[i].center.x, track[i].center.y);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 80, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < track.length; i += 3) {
      const { mx, my } = tx(track[i].center.x, track[i].center.y);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    for (const v of vehicles) {
      const { mx, my } = tx(v.x, v.y);
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.arc(mx, my, v.isPlayer ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (v.isPlayer) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [track, vehicles]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={180}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        borderRadius: 8,
        border: '1px solid rgba(255, 80, 0, 0.3)',
      }}
    />
  );
};

const RankingPanel: React.FC<{ rankings: RankingEntry[]; playerRank: number }> = ({ rankings, playerRank }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 160,
      right: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 120,
    }}>
      {rankings.map((r, i) => (
        <div key={r.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderRadius: 4,
          background: r.id === 0 ? 'rgba(255, 100, 0, 0.2)' : 'rgba(0,0,0,0.4)',
          border: r.id === 0 ? '1px solid rgba(255, 100, 0, 0.4)' : '1px solid transparent',
        }}>
          <span style={{ color: '#ff8800', fontWeight: 'bold', fontSize: 12, width: 18 }}>{i + 1}</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
          <span style={{ color: r.id === 0 ? '#ffcc00' : '#aaa', fontSize: 12, fontWeight: r.id === 0 ? 'bold' : 'normal' }}>{r.name}</span>
        </div>
      ))}
    </div>
  );
};

const LapDisplay: React.FC<{ lap: number; totalLaps: number }> = ({ lap, totalLaps }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
    }}>
      <div style={{ color: '#ff8800', fontSize: 14, fontWeight: 'bold' }}>LAP</div>
      <div style={{ color: '#ffcc00', fontSize: 32, fontWeight: 'bold', fontFamily: 'monospace' }}>
        {Math.min(lap + 1, totalLaps)}/{totalLaps}
      </div>
    </div>
  );
};

const TimerDisplay: React.FC<{ elapsed: number }> = ({ elapsed }) => {
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const ms = Math.floor((elapsed % 1) * 100);
  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#ffaa44',
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}.{String(ms).padStart(2, '0')}
    </div>
  );
};

const ResultPanel: React.FC<{ result: any; onRestart: () => void }> = ({ result, onRestart }) => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.8)',
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a0800, #2a1000)',
        border: '2px solid #ff6600',
        borderRadius: 16,
        padding: '32px 48px',
        textAlign: 'center',
        minWidth: 360,
        boxShadow: '0 0 60px rgba(255, 100, 0, 0.3)',
      }}>
        <h2 style={{ color: '#ff6600', fontSize: 28, margin: '0 0 8px 0', fontWeight: 'bold' }}>🏁 比赛结束</h2>
        <div style={{ color: '#ffcc00', fontSize: 20, margin: '0 0 24px 0', fontWeight: 'bold' }}>
          第 {result.playerRank} 名
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={thStyle}>排名</th>
              <th style={thStyle}>赛车</th>
              <th style={thStyle}>用时</th>
              <th style={thStyle}>最快圈</th>
              <th style={thStyle}>道具</th>
            </tr>
          </thead>
          <tbody>
            {result.rankings.map((r: ResultEntry) => (
              <tr key={r.rank} style={{ background: r.name === '玩家' ? 'rgba(255,100,0,0.15)' : 'transparent' }}>
                <td style={tdStyle}>
                  <span style={{ color: r.rank === 1 ? '#ffd700' : r.rank === 2 ? '#c0c0c0' : r.rank === 3 ? '#cd7f32' : '#aaa' }}>
                    {r.rank}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: r.color }}>{r.name}</span>
                </td>
                <td style={tdStyle}>{formatTime(r.totalTime)}</td>
                <td style={tdStyle}>{r.fastestLap > 0 ? formatTime(r.fastestLap) : '-'}</td>
                <td style={tdStyle}>{r.itemsCollected}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
          <div style={statBox}>
            <div style={{ color: '#888', fontSize: 12 }}>最快圈速</div>
            <div style={{ color: '#ffcc00', fontSize: 16, fontWeight: 'bold' }}>
              {result.fastestLap > 0 ? formatTime(result.fastestLap) : '-'}
            </div>
          </div>
          <div style={statBox}>
            <div style={{ color: '#888', fontSize: 12 }}>总用时</div>
            <div style={{ color: '#ffcc00', fontSize: 16, fontWeight: 'bold' }}>{formatTime(result.totalTime)}</div>
          </div>
          <div style={statBox}>
            <div style={{ color: '#888', fontSize: 12 }}>道具收集</div>
            <div style={{ color: '#ffcc00', fontSize: 16, fontWeight: 'bold' }}>{result.itemsCollected}</div>
          </div>
        </div>

        <button
          onClick={onRestart}
          style={{
            background: 'linear-gradient(135deg, #ff6600, #ff3300)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 40px',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(255, 100, 0, 0.4)',
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  color: '#aa6633',
  padding: '6px 10px',
  fontSize: 12,
  borderBottom: '1px solid #553311',
  textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  color: '#ccc',
  padding: '6px 10px',
  fontSize: 13,
  borderBottom: '1px solid #221100',
};

const statBox: React.CSSProperties = {
  background: 'rgba(255, 80, 0, 0.1)',
  border: '1px solid rgba(255, 80, 0, 0.2)',
  borderRadius: 8,
  padding: '8px 16px',
  textAlign: 'center',
};

function formatTime(t: number): string {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
