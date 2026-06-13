import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState, Turn } from '../engine/GameEngine';
import { Card, configApi } from '../api/configApi';
import { AiDecision } from '../worker/aiWorker';

interface GameBoardProps {
  deck: Card[];
}

const GameBoard: React.FC<GameBoardProps> = ({ deck }) => {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeAi, setShakeAi] = useState(false);
  const [showFlyingCard, setShowFlyingCard] = useState<{ card: Card; from: 'ai' | 'player' } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const eng = new GameEngine(deck);
    setEngine(eng);
    setState({ ...eng.state });
    const unsub = eng.subscribe(() => setState({ ...eng.state }));
    return unsub;
  }, [deck]);

  useEffect(() => {
    const blob = new Blob([workerCode()], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    workerRef.current = new Worker(url);
    workerRef.current.onmessage = async (e: MessageEvent<AiDecision[]>) => {
      const decisions = e.data;
      setAiThinking(false);
      for (const d of decisions) {
        await new Promise(r => setTimeout(r, 600));
        if (!engine || engine.state.gameOver) break;
        const played = engine.playCard('ai', d.instanceId);
        if (played && played.damage > 0) {
          setShowFlyingCard({ card: played, from: 'ai' });
          setShakePlayer(true);
          spawnParticles();
          setTimeout(() => {
            setShakePlayer(false);
            setShowFlyingCard(null);
          }, 700);
        } else if (played) {
          setShowFlyingCard({ card: played, from: 'ai' });
          setTimeout(() => setShowFlyingCard(null), 600);
        }
      }
      if (engine && !engine.state.gameOver) {
        engine.endTurn();
      }
      processingRef.current = false;
    };
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      URL.revokeObjectURL(url);
    };
  }, [engine]);

  useEffect(() => {
    if (!engine || !state) return;
    if (state.turn === 'ai' && !state.gameOver && !processingRef.current) {
      processingRef.current = true;
      setAiThinking(true);
      setTimeout(() => {
        if (workerRef.current && state) {
          workerRef.current.postMessage({ state, hand: state.ai.hand });
        }
      }, 300);
    }
  }, [state?.turn, state?.gameOver, engine, state]);

  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }> = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const colors = ['#b87333', '#ffd700', '#ff6b35', '#c0c0c0', '#8b5e3c'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4
      });
    }
    let frame = 0;
    const totalFrames = 60;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 1 / totalFrames;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      frame++;
      if (frame < totalFrames) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(animate);
  }, []);

  const handlePlayCard = () => {
    if (!engine || !selectedCardId || state?.turn !== 'player') return;
    const card = state?.player.hand.find(c => c.instanceId === selectedCardId);
    if (!card) return;
    const played = engine.playCard('player', selectedCardId);
    if (played) {
      if (played.damage > 0) {
        setShakeAi(true);
        spawnParticles();
        setTimeout(() => setShakeAi(false), 600);
      }
      setSelectedCardId(null);
      setTimeout(() => {
        if (engine && !engine.state.gameOver) engine.endTurn();
      }, 700);
    }
  };

  const handleRestart = async () => {
    const freshDeck = await configApi.getDeck();
    const eng = new GameEngine(freshDeck);
    setEngine(eng);
    setState({ ...eng.state });
    eng.subscribe(() => setState({ ...eng.state }));
    setSelectedCardId(null);
    setAiThinking(false);
    processingRef.current = false;
  };

  if (!state) return <div className="loading">加载中...</div>;

  const renderCard = (card: Card, index: number, total: number, clickable: boolean) => {
    const mid = (total - 1) / 2;
    const offset = index - mid;
    const rotation = offset * 5;
    const translateY = Math.abs(offset) * 8;
    const isSelected = selectedCardId === card.instanceId;
    const canPlay = engine?.canPlayCard('player', card.instanceId || '') && clickable;

    return (
      <div
        key={card.instanceId || card.id + '-' + index}
        className={`card ${isSelected ? 'selected' : ''} ${!canPlay ? 'disabled' : ''}`}
        style={{
          transform: `translateY(${isSelected ? -30 : -translateY}px) rotate(${rotation}deg)`,
          zIndex: isSelected ? 100 : index
        }}
        onClick={() => {
          if (!clickable || !canPlay) return;
          setSelectedCardId(isSelected ? null : card.instanceId || null);
        }}
      >
        <div className="card-cost">{card.cost}</div>
        <div className="card-name">{card.name}</div>
        <div className="card-type-icon">
          {card.type === 'attack' && '⚔'}
          {card.type === 'defense' && '🛡'}
          {card.type === 'energy' && '⚡'}
        </div>
        <div className="card-stats">
          {card.damage > 0 && <span>攻 {card.damage}</span>}
          {card.defense > 0 && <span>防 {card.defense}</span>}
          {card.energy > 0 && <span>能 +{card.energy}</span>}
        </div>
        <div className="card-desc">{card.description}</div>
      </div>
    );
  };

  const renderEnergyBar = (current: number, max: number, label: string) => (
    <div className="energy-container">
      <span className="energy-label">{label}</span>
      <div className="energy-bar">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`energy-dot ${i < current ? 'active' : ''} ${i >= max ? 'unavailable' : ''}`}
          />
        ))}
        <span className="energy-text">{current}/{max}</span>
      </div>
    </div>
  );

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="particle-canvas" width="1000" height="300" />
      {showFlyingCard && (
        <div className={`flying-card ${showFlyingCard.from}`}>
          <div className="card-cost">{showFlyingCard.card.cost}</div>
          <div className="card-name">{showFlyingCard.card.name}</div>
        </div>
      )}
      <div className="turn-counter">回合 {state.turnCount} · {state.turn === 'player' ? '你的回合' : 'AI思考中...'}</div>
      <div className="ai-area">
        <div className="character-info right">
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${(state.ai.hp / state.ai.maxHp) * 100}%` }} />
            <span className="hp-text">❤ {state.ai.hp}/{state.ai.maxHp}</span>
          </div>
          {state.ai.shield > 0 && <div className="shield-badge">🛡 {state.ai.shield}</div>}
        </div>
        <div className={`ai-avatar character ${shakeAi ? 'shake' : ''}`}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <defs>
              <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5e3c" />
                <stop offset="50%" stopColor="#b87333" />
                <stop offset="100%" stopColor="#6b4423" />
              </linearGradient>
            </defs>
            <rect x="10" y="30" width="100" height="60" rx="8" fill="url(#pipeGrad)" stroke="#ffd700" strokeWidth="2" />
            <circle cx="30" cy="60" r="18" fill="none" stroke="#ffd700" strokeWidth="3" />
            <circle cx="60" cy="60" r="20" fill="none" stroke="#ffd700" strokeWidth="3" />
            <circle cx="90" cy="60" r="18" fill="none" stroke="#ffd700" strokeWidth="3" />
            <circle cx="30" cy="60" r="6" fill="#ff6b35" />
            <circle cx="60" cy="60" r="8" fill="#ff6b35" />
            <circle cx="90" cy="60" r="6" fill="#ff6b35" />
            <rect x="25" y="38" width="10" height="44" fill="#3c1a1a" stroke="#b87333" />
            <rect x="85" y="38" width="10" height="44" fill="#3c1a1a" stroke="#b87333" />
            <path d="M 15 25 Q 25 15, 40 25" stroke="#b87333" strokeWidth="3" fill="none" />
            <path d="M 80 25 Q 95 15, 105 25" stroke="#b87333" strokeWidth="3" fill="none" />
            <circle cx="20" cy="22" r="3" fill="#ffd700" />
            <circle cx="100" cy="22" r="3" fill="#ffd700" />
          </svg>
        </div>
        <div className="ai-hand-preview">
          {state.ai.hand.map((_, i) => (
            <div key={i} className="card-back" style={{ transform: `translateX(${(i - state.ai.hand.length / 2) * 15}px) rotate(${(i - state.ai.hand.length / 2) * 3}deg)` }} />
          ))}
        </div>
        {renderEnergyBar(state.ai.energy, state.ai.maxEnergy, 'AI能量')}
      </div>
      <div className="battle-center">
        <div className="battle-divider">
          ⚙ ⚙ ⚙ ⚙ ⚙
        </div>
      </div>
      <div className="player-area">
        <div className={`player-avatar character ${shakePlayer ? 'shake' : ''}`}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <defs>
              <linearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#b87333" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#8b5e3c" />
              </linearGradient>
            </defs>
            <g transform="translate(60,60)">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 12;
                const x1 = Math.cos(angle) * 40;
                const y1 = Math.sin(angle) * 40;
                const x2 = Math.cos(angle) * 50;
                const y2 = Math.sin(angle) * 50;
                return (
                  <rect
                    key={i}
                    x={-5}
                    y={-55}
                    width={10}
                    height={15}
                    fill="url(#gearGrad)"
                    stroke="#6b4423"
                    strokeWidth="1"
                    transform={`rotate(${(i * 360) / 12})`}
                    rx="2"
                  />
                );
              })}
              <circle r="42" fill="url(#gearGrad)" stroke="#6b4423" strokeWidth="2" />
              <circle r="28" fill="#1a3c2a" stroke="#b87333" strokeWidth="2" />
              <circle r="15" fill="url(#gearGrad)" stroke="#ffd700" strokeWidth="2" />
              <circle r="6" fill="#1a3c2a" />
              <g stroke="#b87333" strokeWidth="2">
                <line x1="0" y1="-40" x2="0" y2="-30" />
                <line x1="0" y1="30" x2="0" y2="40" />
                <line x1="-40" y1="0" x2="-30" y2="0" />
                <line x1="30" y1="0" x2="40" y2="0" />
                <line x1="-28" y1="-28" x2="-22" y2="-22" />
                <line x1="22" y1="22" x2="28" y2="28" />
                <line x1="-28" y1="28" x2="-22" y2="22" />
                <line x1="22" y1="-22" x2="28" y2="-28" />
              </g>
            </g>
          </svg>
        </div>
        <div className="character-info left">
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${(state.player.hp / state.player.maxHp) * 100}%` }} />
            <span className="hp-text">❤ {state.player.hp}/{state.player.maxHp}</span>
          </div>
          {state.player.shield > 0 && <div className="shield-badge">🛡 {state.player.shield}</div>}
        </div>
      </div>
      <div className="hand-area">
        {state.player.hand.map((card, i) => renderCard(card, i, state.player.hand.length, state.turn === 'player' && !aiThinking))}
      </div>
      <div className="action-bar">
        <button
          className="metal-btn"
          disabled={!selectedCardId || state.turn !== 'player' || aiThinking || state.gameOver}
          onClick={handlePlayCard}
        >
          出牌
        </button>
        <button
          className="metal-btn"
          disabled={state.turn !== 'player' || aiThinking || state.gameOver}
          onClick={() => {
            if (engine) engine.endTurn();
          }}
        >
          结束回合
        </button>
      </div>
      <div className="bottom-energy">
        {renderEnergyBar(state.player.energy, state.player.maxEnergy, '玩家能量')}
      </div>
      {state.gameOver && (
        <div className="game-over-overlay">
          <div className={`winner-banner ${state.winner === 'player' ? 'gold' : 'silver'}`}>
            {state.winner === 'player' ? '🏆 胜利！你击败了AI对手' : '💀 失败！AI取得了胜利'}
          </div>
          <button className="metal-btn large" onClick={handleRestart}>
            重新开始
          </button>
        </div>
      )}
      <style>{styles}</style>
    </div>
  );
};

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .game-root {
    min-width: 900px;
    width: 100%;
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background: 
      conic-gradient(from 0deg at 50% 50%, 
        #2c1e16 0deg, 
        #3d2817 30deg, 
        #2c1e16 60deg, 
        #4a2f1c 90deg, 
        #2c1e16 120deg, 
        #3d2817 150deg, 
        #2c1e16 180deg, 
        #4a2f1c 210deg, 
        #2c1e16 240deg, 
        #3d2817 270deg, 
        #2c1e16 300deg, 
        #4a2f1c 330deg, 
        #2c1e16 360deg);
    background-size: 200px 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    font-family: 'Georgia', serif;
  }
  
  .particle-canvas {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
  }
  
  .turn-counter {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #b87333, #8b5e3c);
    color: #ffd700;
    padding: 10px 25px;
    border-radius: 8px;
    border: 2px solid #ffd700;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,215,0,0.3);
    z-index: 100;
  }
  
  .ai-area {
    width: 100%;
    max-width: 1200px;
    padding: 60px 20px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    min-height: 280px;
  }
  
  .player-area {
    width: 100%;
    max-width: 1200px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    min-height: 200px;
  }
  
  .battle-center {
    width: 100%;
    max-width: 1200px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 0;
  }
  
  .battle-divider {
    color: #b87333;
    font-size: 18px;
    letter-spacing: 15px;
    text-shadow: 0 0 10px rgba(255,215,0,0.5);
  }
  
  .character {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 0 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3);
  }
  
  .ai-avatar {
    background: #3c1a1a;
    border: 3px solid #b87333;
  }
  
  .player-avatar {
    background: #1a3c2a;
    border: 3px solid #b87333;
  }
  
  .character.shake {
    animation: shake 0.6s ease-in-out;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-5px); }
    30% { transform: translateX(5px); }
    45% { transform: translateX(-5px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
    90% { transform: translateX(3px); }
  }
  
  .character-info {
    margin-top: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
    width: 300px;
    justify-content: center;
  }
  
  .character-info.left { order: 2; }
  
  .hp-bar {
    position: relative;
    width: 220px;
    height: 32px;
    background: #1a100a;
    border: 2px solid #b87333;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
  }
  
  .hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #c0392b, #e74c3c, #ff6b6b);
    transition: width 0.5s ease-out;
    box-shadow: inset 0 1px 2px rgba(255,255,255,0.2);
  }
  
  .hp-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }
  
  .shield-badge {
    background: linear-gradient(135deg, #4a90d9, #2c5aa0);
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    border: 2px solid #6ba3e8;
    font-weight: bold;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(74,144,217,0.4);
  }
  
  .energy-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 15px;
  }
  
  .energy-label {
    color: #b87333;
    font-weight: bold;
    font-size: 13px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
    min-width: 70px;
  }
  
  .energy-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 15px;
    background: rgba(58, 42, 26, 0.8);
    border: 2px solid #b87333;
    border-radius: 12px;
    backdrop-filter: blur(5px);
    position: relative;
  }
  
  .energy-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #1a100a;
    border: 2px solid #6b4423;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
    transition: all 0.3s;
  }
  
  .energy-dot.active {
    background: radial-gradient(circle, #ffd700, #b87333);
    border-color: #ffd700;
    animation: energyPulse 0.5s ease-in-out infinite alternate;
    box-shadow: 0 0 10px #ffd700, inset 0 1px 2px rgba(255,255,255,0.4);
  }
  
  .energy-dot.unavailable {
    opacity: 0.4;
  }
  
  @keyframes energyPulse {
    from { box-shadow: 0 0 6px #ffd700, inset 0 1px 2px rgba(255,255,255,0.4); }
    to { box-shadow: 0 0 14px #ffd700, inset 0 1px 2px rgba(255,255,255,0.6); }
  }
  
  .energy-text {
    margin-left: 8px;
    color: #ffd700;
    font-weight: bold;
    font-size: 13px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }
  
  .ai-hand-preview {
    display: flex;
    justify-content: center;
    margin-top: 15px;
    height: 80px;
    position: relative;
  }
  
  .card-back {
    width: 50px;
    height: 70px;
    background: linear-gradient(135deg, #3c1a1a, #6b4423);
    border: 2px solid #b87333;
    border-radius: 6px;
    position: absolute;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(255,215,0,0.1) 5px,
      rgba(255,215,0,0.1) 10px
    );
  }
  
  .hand-area {
    width: 100%;
    max-width: 1000px;
    min-height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    padding: 20px 0;
    perspective: 1000px;
  }
  
  .card {
    width: 120px;
    height: 180px;
    background: linear-gradient(145deg, #2c1e16, #3d2817);
    border: 2px solid #b87333;
    border-radius: 8px;
    position: absolute;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,215,0,0.1);
    user-select: none;
  }
  
  .card:hover {
    transform: translateY(-20px) scale(1.05) rotate(0deg) !important;
    z-index: 150 !important;
    box-shadow: 0 12px 30px rgba(0,0,0,0.7), 0 0 20px rgba(184,115,51,0.4);
  }
  
  .card.selected {
    border-color: #ffd700 !important;
    box-shadow: 0 0 12px #ffd700, 0 12px 30px rgba(0,0,0,0.7) !important;
  }
  
  .card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .card.disabled:hover {
    transform: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
  }
  
  .card-cost {
    position: absolute;
    top: -8px;
    left: -8px;
    width: 32px;
    height: 32px;
    background: linear-gradient(145deg, #ffd700, #b87333);
    border: 2px solid #6b4423;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2c1e16;
    font-weight: bold;
    font-size: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.5);
    text-shadow: none;
  }
  
  .card-name {
    color: #fff;
    font-weight: bold;
    font-size: 13px;
    text-align: center;
    margin-top: 8px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    padding: 4px;
    border-bottom: 1px solid rgba(184,115,51,0.3);
  }
  
  .card-type-icon {
    font-size: 24px;
    text-align: center;
    margin: 4px 0;
    filter: drop-shadow(0 0 4px rgba(255,215,0,0.5));
  }
  
  .card-stats {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
    font-weight: bold;
  }
  
  .card-stats span {
    background: rgba(0,0,0,0.3);
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid #b87333;
    color: #ffd700;
  }
  
  .card-desc {
    color: #c9a66b;
    font-size: 10px;
    text-align: center;
    line-height: 1.3;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
  }
  
  .flying-card {
    position: fixed;
    width: 100px;
    height: 140px;
    background: linear-gradient(145deg, #3c1a1a, #6b4423);
    border: 3px solid #ffd700;
    border-radius: 8px;
    z-index: 9998;
    pointer-events: none;
    box-shadow: 0 0 30px rgba(255,215,0,0.8);
    animation: flyFromRight 0.7s ease-out forwards;
  }
  
  .flying-card.player {
    animation: flyFromLeft 0.7s ease-out forwards;
  }
  
  .flying-card .card-cost {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 28px;
    height: 28px;
  }
  
  .flying-card .card-name {
    font-size: 12px;
  }
  
  @keyframes flyFromRight {
    0% {
      right: 10%;
      top: 20%;
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      right: 45%;
      top: 45%;
      transform: scale(1.5) rotate(180deg);
    }
    100% {
      right: 60%;
      top: 50%;
      opacity: 0;
      transform: scale(0.5) rotate(360deg);
    }
  }
  
  @keyframes flyFromLeft {
    0% {
      left: 10%;
      top: 70%;
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      left: 45%;
      top: 50%;
      transform: scale(1.5) rotate(-180deg);
    }
    100% {
      left: 60%;
      top: 45%;
      opacity: 0;
      transform: scale(0.5) rotate(-360deg);
    }
  }
  
  .action-bar {
    display: flex;
    gap: 20px;
    margin-top: 15px;
    z-index: 50;
  }
  
  .metal-btn {
    width: 140px;
    height: 50px;
    background: linear-gradient(145deg, #b87333, #8b5e3c);
    border: 2px solid #6b4423;
    border-radius: 8px;
    color: #ffd700;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
    box-shadow: 
      0 4px 10px rgba(0,0,0,0.4),
      inset 0 2px 4px rgba(255,215,0,0.3),
      inset 0 -2px 4px rgba(0,0,0,0.3);
    transition: all 0.2s;
    letter-spacing: 2px;
  }
  
  .metal-btn:hover:not(:disabled) {
    filter: brightness(1.2);
    box-shadow: 
      0 6px 14px rgba(0,0,0,0.5),
      inset 0 2px 4px rgba(255,215,0,0.5),
      inset 0 -2px 4px rgba(0,0,0,0.3);
  }
  
  .metal-btn:active:not(:disabled) {
    box-shadow: 
      inset 0 4px 8px rgba(0,0,0,0.5),
      inset 0 -1px 2px rgba(255,215,0,0.2);
    transform: translateY(2px);
  }
  
  .metal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }
  
  .metal-btn.large {
    width: 180px;
    height: 50px;
  }
  
  .bottom-energy {
    margin-top: 15px;
    margin-bottom: 10px;
  }
  
  .game-over-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 30px;
    z-index: 10000;
    backdrop-filter: blur(5px);
  }
  
  .winner-banner {
    font-size: 42px;
    font-weight: bold;
    letter-spacing: 4px;
    padding: 20px 60px;
    border-radius: 16px;
    animation: slideDown 1s ease-out;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }
  
  .winner-banner.gold {
    background: linear-gradient(135deg, #6b4423, #2c1e16);
    border: 3px solid #ffd700;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    background-image: linear-gradient(135deg, #ffd700, #fff7b0, #ffd700, #c9a66b, #ffd700);
    background-size: 300% 300%;
    animation: slideDown 1s ease-out, shimmer 3s ease-in-out infinite;
  }
  
  .winner-banner.silver {
    background: linear-gradient(135deg, #6b4423, #2c1e16);
    border: 3px solid #a0a0a0;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    background-image: linear-gradient(135deg, #e0e0e0, #808080, #c0c0c0, #a0a0a0, #e0e0e0);
    background-size: 300% 300%;
    animation: slideDown 1s ease-out, shimmer 3s ease-in-out infinite;
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-200%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #2c1e16;
    color: #ffd700;
    font-size: 24px;
  }
`;

function workerCode() {
  return `
    function chooseBestCard(state) {
      const hand = state.ai.hand;
      const energy = state.ai.energy;
      const playable = hand.filter(c => c.cost <= energy);
      if (playable.length === 0) return null;
      const playerLowHp = state.player.hp <= 15;
      const aiLowHp = state.ai.hp <= 20;
      const scored = playable.map(card => {
        let score = 0;
        score += card.damage * 1.2;
        score += card.defense * 1.0;
        score += card.energy * 0.8;
        if (card.type === 'attack' && playerLowHp) score += 5;
        if (card.type === 'defense' && aiLowHp) score += 5;
        if (card.cost > 0) score += (card.cost / energy) * 2;
        return { card, score };
      });
      scored.sort((a, b) => b.score - a.score);
      if (scored.length > 1 && Math.random() < 0.2) {
        return scored[Math.floor(Math.random() * Math.min(3, scored.length))].card;
      }
      return scored[0].card;
    }
    self.onmessage = (e) => {
      const { state } = e.data;
      const delay = 200 + Math.random() * 300;
      setTimeout(() => {
        const decisions = [];
        const tempState = JSON.parse(JSON.stringify(state));
        for (let i = 0; i < 5; i++) {
          const card = chooseBestCard(tempState);
          if (!card) break;
          const cid = card.instanceId;
          decisions.push({ instanceId: cid });
          const attacker = tempState.ai;
          const defender = tempState.player;
          const idx = attacker.hand.findIndex(c => c.instanceId === cid);
          if (idx === -1) break;
          const c = attacker.hand[idx];
          attacker.energy -= c.cost;
          attacker.hand.splice(idx, 1);
          if (c.damage > 0) {
            let dmg = c.damage;
            if (defender.shield > 0) {
              const abs = Math.min(defender.shield, dmg);
              defender.shield -= abs;
              dmg -= abs;
            }
            defender.hp = Math.max(0, defender.hp - dmg);
          }
          if (c.defense > 0) attacker.shield += c.defense;
          if (c.energy > 0) attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + c.energy);
          if (tempState.player.hp <= 0 || tempState.ai.hp <= 0) break;
        }
        self.postMessage(decisions);
      }, delay);
    };
  `;
}

export default GameBoard;
