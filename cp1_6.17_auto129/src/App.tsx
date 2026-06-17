import { useState, useEffect, useRef, useCallback } from 'react';
import { CompositionPanel } from './components/CompositionPanel';
import { BattleScene } from './components/BattleScene';
import { CombatSimulator } from './modules/combat-simulator';
import { EffectRenderer } from './modules/effect-renderer';
import type { Spell } from './modules/element-combination';
import type { CombatLog } from './modules/combat-simulator';
import './App.css';

function App() {
  const [combatState, setCombatState] = useState({
    targetHp: 100,
    maxHp: 100,
    resistance: 0,
    round: 0,
    logs: [] as CombatLog[],
  });
  const [isHit, setIsHit] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [canCast, setCanCast] = useState(true);

  const combatSimulatorRef = useRef<CombatSimulator | null>(null);
  const effectRendererRef = useRef<EffectRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const battleSceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    combatSimulatorRef.current = new CombatSimulator(0);
    updateCombatState();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new EffectRenderer({
      canvas: canvasRef.current,
      maxParticles: 200,
    });
    effectRendererRef.current = renderer;
    renderer.start();

    const handleResize = () => {
      if (battleSceneRef.current && canvasRef.current) {
        const rect = battleSceneRef.current.getBoundingClientRect();
        renderer.resize(rect.width, rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.stop();
    };
  }, []);

  const updateCombatState = useCallback(() => {
    if (!combatSimulatorRef.current) return;
    const state = combatSimulatorRef.current.getState();
    setCombatState({
      targetHp: state.targetHp,
      maxHp: state.maxHp,
      resistance: state.resistance,
      round: state.round,
      logs: [...state.logs],
    });
  }, []);

  const handleCastSpell = useCallback((spell: Spell) => {
    if (!combatSimulatorRef.current || !effectRendererRef.current || !canCast) return;

    setCanCast(false);
    setIsHit(true);
    setTimeout(() => setIsHit(false), 300);

    const result = combatSimulatorRef.current.castSpell(spell);
    updateCombatState();

    if (battleSceneRef.current && canvasRef.current) {
      const rect = battleSceneRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2 - 20;
      
      const intensity = Math.min(1.5, spell.baseDamage / 30);
      effectRendererRef.current.playSpellEffect(
        spell.effectType,
        spell.effectColor,
        centerX,
        centerY,
        intensity
      );
    }

    if (result.isDead) {
      setIsDead(true);
      
      if (battleSceneRef.current && canvasRef.current && effectRendererRef.current) {
        const rect = battleSceneRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2 - 20;
        
        setTimeout(() => {
          if (effectRendererRef.current) {
            effectRendererRef.current.playCrystalShatter(centerX, centerY);
          }
        }, 200);
      }

      setTimeout(() => {
        if (combatSimulatorRef.current) {
          combatSimulatorRef.current.resetTarget();
          updateCombatState();
        }
        setIsDead(false);
        setCanCast(true);
      }, 2000);
    } else {
      setTimeout(() => {
        setCanCast(true);
      }, 500);
    }
  }, [canCast, updateCombatState]);

  const handleResistanceChange = useCallback((value: number) => {
    if (combatSimulatorRef.current) {
      combatSimulatorRef.current.setResistance(value);
      updateCombatState();
    }
  }, [updateCombatState]);

  const handleCrystalShatterComplete = useCallback(() => {
    setIsDead(false);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">✨</span>
          元素魔法模拟器
          <span className="title-icon">✨</span>
        </h1>
      </header>

      <div className="main-content">
        <div className="panel-section">
          <CompositionPanel
            onCastSpell={handleCastSpell}
            logs={combatState.logs}
            resistance={combatState.resistance}
            onResistanceChange={handleResistanceChange}
            canCast={canCast}
          />
        </div>

        <div className="divider"></div>

        <div className="battle-section" ref={battleSceneRef}>
          <BattleScene
            targetHp={combatState.targetHp}
            maxHp={combatState.maxHp}
            isHit={isHit}
            isDead={isDead}
            onCrystalShatterComplete={handleCrystalShatterComplete}
          />
          <canvas
            ref={canvasRef}
            className="effect-canvas"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
