import React, { useState, useEffect, useRef, useCallback } from 'react';
import DrawingCanvas from './DrawingCanvas';
import SpellEffectLayer, { SpellEffect } from './SpellEffectLayer';
import { matchSpell, SpellType, SPELLS, Point } from '../game/SpellMatcher';
import { 
  GameState, 
  PlayerId, 
  PlayerState,
  createInitialState, 
  castSpell, 
  updatePlayerStatuses,
  getSpeedMultiplier,
  isCooldownActive,
  resetGame
} from '../game/GameCore';
import { playSpellSound, playSuccessSound, playFailSound } from '../utils/AudioManager';

interface SpellPrompt {
  spell: SpellType;
  player: PlayerId;
  startTime: number;
}

interface ComboDisplay {
  player: PlayerId;
  count: number;
  startTime: number;
}

const SPELL_PROMPT_DURATION = 300;
const COMBO_THRESHOLD = 3;

const BattleField: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  const [spellPrompts, setSpellPrompts] = useState<SpellPrompt[]>([]);
  const [comboDisplays, setComboDisplays] = useState<ComboDisplay[]>([]);
  const [now, setNow] = useState(Date.now());
  const [canvasHeight, setCanvasHeight] = useState(250);
  const effectIdRef = useRef(0);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Array<{ x: number; y: number; size: number; speed: number; opacity: number; vx: number; vy: number }>>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCanvasHeight(180);
      } else {
        setCanvasHeight(250);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars(canvas.width, canvas.height);
    };
    
    const initStars = (width: number, height: number) => {
      const stars: Array<{ x: number; y: number; size: number; speed: number; opacity: number; vx: number; vy: number }> = [];
      const count = 80;
      
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1 + Math.random() * 2,
          speed,
          opacity: 0.3 + Math.random() * 0.3,
          vx: Math.cos(angle) * speed * 0.3,
          vy: Math.sin(angle) * speed * 0.3
        });
      }
      
      starsRef.current = stars;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const stars = starsRef.current;
      
      for (const star of stars) {
        star.x += star.vx;
        star.y += star.vy;
        
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
        
        ctx.save();
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setGameState(prev => updatePlayerStatuses(prev, currentTime));
      
      setSpellPrompts(prev => 
        prev.filter(p => currentTime - p.startTime < SPELL_PROMPT_DURATION)
      );
      
      setComboDisplays(prev =>
        prev.filter(c => currentTime - c.startTime < 2000)
      );
    }, 1000 / 60);
    
    return () => clearInterval(interval);
  }, []);

  const handleDrawingComplete = useCallback((playerId: PlayerId, points: Point[]) => {
    const currentTime = Date.now();
    
    const matchResult = matchSpell(points);
    
    if (!matchResult.spell) {
      playFailSound();
      const canvasWindow = window as any;
      if (canvasWindow.showInvalidSpellMessage) {
        canvasWindow.showInvalidSpellMessage();
      }
      return;
    }
    
    const player = gameState.players[playerId];
    
    if (isCooldownActive(player, currentTime)) {
      return;
    }
    
    playSuccessSound();
    playSpellSound(matchResult.spell);
    
    const { newState, result } = castSpell(gameState, playerId, matchResult.spell, currentTime);
    setGameState(newState);
    
    const prompt: SpellPrompt = {
      spell: matchResult.spell,
      player: playerId,
      startTime: currentTime
    };
    setSpellPrompts(prev => [...prev, prompt]);
    
    const newCombo = newState.players[playerId].combo;
    if (newCombo >= COMBO_THRESHOLD) {
      const comboDisplay: ComboDisplay = {
        player: playerId,
        count: newCombo,
        startTime: currentTime
      };
      setComboDisplays(prev => {
        const filtered = prev.filter(c => c.player !== playerId);
        return [...filtered, comboDisplay];
      });
    }
    
    if (result.success && result.spell) {
      effectIdRef.current += 1;
      const target = result.spell === 'shield' || result.spell === 'heal' || result.spell === 'haste'
        ? playerId
        : result.target || playerId;
      
      const newEffect: SpellEffect = {
        id: effectIdRef.current,
        type: result.spell,
        target: target as PlayerId,
        startTime: currentTime,
        duration: 1000
      };
      
      setSpellEffects(prev => [...prev, newEffect]);
    }
  }, [gameState]);

  const handleDrawingStart = useCallback((playerId: PlayerId) => {
    setSpellPrompts(prev => prev.filter(p => p.player !== playerId));
  }, []);

  const handleEffectComplete = useCallback((id: number) => {
    setSpellEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(resetGame());
    setSpellEffects([]);
    setSpellPrompts([]);
    setComboDisplays([]);
    effectIdRef.current = 0;
  }, []);

  const renderPlayerSection = (playerId: PlayerId) => {
    const player = gameState.players[playerId];
    const hpPercent = (player.hp / player.maxHp) * 100;
    const speedMultiplier = getSpeedMultiplier(player, now);
    const cooldownPercent = Math.max(0, (player.cooldownEndTime - now) / 1000 * 100);
    const isLeft = playerId === 'player1';
    
    const prompt = spellPrompts.find(p => p.player === playerId);
    const combo = comboDisplays.find(c => c.player === playerId);
    const showCombo = combo && combo.count >= COMBO_THRESHOLD;
    
    return (
      <div 
        className={`player-section ${isLeft ? 'player-left' : 'player-right'}`}
        style={{
          width: '40%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        <div 
          className="player-info"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            position: 'relative'
          }}
        >
          <div 
            className="player-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexDirection: isLeft ? 'row' : 'row-reverse'
            }}
          >
            <div 
              className="player-avatar"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2C1B4D, #1A0E2E)',
                border: `2px solid ${isLeft ? '#00D4FF' : '#FF6B6B'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: `0 0 15px ${isLeft ? 'rgba(0, 212, 255, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`
              }}
            >
              {isLeft ? '🧙' : '🧙‍♂️'}
            </div>
            <span 
              className="player-name"
              style={{
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
              }}
            >
              {player.name}
            </span>
          </div>
          
          <div 
            className="hp-container"
            style={{
              width: '100%',
              position: 'relative',
              border: player.hasShield ? '4px solid rgba(46, 204, 113, 0.6)' : '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              overflow: 'hidden',
              height: '24px',
              background: 'rgba(0, 0, 0, 0.5)',
              transition: 'border-color 0.3s ease',
              boxShadow: player.hasShield ? '0 0 15px rgba(46, 204, 113, 0.5)' : 'none'
            }}
          >
            <div 
              className="hp-bar"
              style={{
                height: '100%',
                width: `${hpPercent}%`,
                background: 'linear-gradient(90deg, #E74C3C, #C0392B)',
                transition: 'width 0.5s ease-out',
                position: 'absolute',
                [isLeft ? 'left' : 'right']: 0
              } as React.CSSProperties}
            />
            <div 
              className="hp-text"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                zIndex: 1
              }}
            >
              {player.hp} / {player.maxHp}
            </div>
          </div>
          
          {cooldownPercent > 0 && (
            <div 
              className="cooldown-bar"
              style={{
                width: '100%',
                height: '4px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{
                  width: `${cooldownPercent}%`,
                  height: '100%',
                  background: '#FFD700',
                  transition: 'width 0.1s linear'
                }}
              />
            </div>
          )}
          
          <div 
            className={`spell-prompt-area ${prompt ? 'visible' : ''}`}
            style={{
              position: 'absolute',
              top: '-35px',
              left: '50%',
              transform: 'translateX(-50%)',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {prompt && (
              <span 
                className="spell-name"
                style={{
                  color: '#FFFFFF',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  textShadow: `0 0 20px ${SPELLS[prompt.spell].color}`,
                  animation: 'spellPromptAnim 0.3s ease-out forwards',
                  whiteSpace: 'nowrap'
                }}
              >
                {SPELLS[prompt.spell].name}
              </span>
            )}
          </div>
          
          {showCombo && (
            <div 
              className="combo-display"
              style={{
                position: 'absolute',
                top: '-70px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 16px',
                background: 'rgba(255, 215, 0, 0.2)',
                border: '2px solid #FFD700',
                borderRadius: '20px',
                color: '#FFD700',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
                animation: 'comboFlash 0.5s ease-in-out infinite alternate',
                whiteSpace: 'nowrap'
              }}
            >
              连击 x{combo!.count}
            </div>
          )}
        </div>
        
        <div style={{ width: '100%' }}>
          <DrawingCanvas
            onDrawingComplete={(points) => handleDrawingComplete(playerId, points)}
            onDrawingStart={() => handleDrawingStart(playerId)}
            speedMultiplier={speedMultiplier}
            disabled={gameState.isGameOver || isCooldownActive(player, now)}
            height={canvasHeight}
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="battlefield-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(180deg, #0D1117 0%, #1A1A2E 100%)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <canvas
        ref={starsCanvasRef}
        className="stars-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      
      <div 
        className="battle-content"
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 20px'
        }}
      >
        <div 
          className="players-container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'relative'
          }}
        >
          {renderPlayerSection('player1')}
          
          <div 
            className="divider"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '1px',
              height: '80%',
              background: 'repeating-linear-gradient(to bottom, #FFD700 0px, #FFD700 8px, transparent 8px, transparent 16px)',
              opacity: 0.6
            }}
          />
          
          {renderPlayerSection('player2')}
        </div>
      </div>
      
      <SpellEffectLayer 
        effects={spellEffects}
        onEffectComplete={handleEffectComplete}
      />
      
      {gameState.isGameOver && gameState.winner && (
        <div 
          className="game-over-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            animation: 'fadeIn 0.5s ease-out'
          }}
        >
          <h1 
            className="winner-text"
            style={{
              color: '#FFD700',
              fontSize: '48px',
              fontWeight: 'bold',
              textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
              marginBottom: '40px',
              animation: 'winnerPulse 1s ease-in-out infinite alternate'
            }}
          >
            {gameState.players[gameState.winner].name}获胜！
          </h1>
          <button 
            className="restart-button"
            onClick={handleRestart}
            style={{
              padding: '16px 48px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #3498DB, #2980B9)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(52, 152, 219, 0.4)';
            }}
          >
            再来一局
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes winnerPulse {
          from { 
            transform: scale(1);
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
          }
          to { 
            transform: scale(1.05);
            text-shadow: 0 0 50px rgba(255, 215, 0, 1);
          }
        }
        
        @keyframes spellPromptAnim {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        
        @keyframes comboFlash {
          from {
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
            transform: translateX(-50%) scale(1);
          }
          to {
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.9);
            transform: translateX(-50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default BattleField;
