import React, { useState, useEffect, useCallback } from 'react';
import { ElementType, MagicSpell, BattleLogEntry, elementInfo, PLAYER_MAX_HP, MONSTERS_TO_WIN, MAX_ELEMENTS_SELECTED, MIN_ELEMENTS_TO_COMPOSE, MAX_LOG_ENTRIES } from './data/GameData';
import { composeElements, CompositionResult, spawnRandomMonster } from './engine/CompositionEngine';
import { calculateBattleResult, BattleResult, getMonsterDamage } from './engine/BattleEngine';
import ElementSelector from './components/ElementSelector';
import MonsterPanel from './components/MonsterPanel';
import BattleLog from './components/BattleLog';
import VictoryScreen from './components/VictoryScreen';

type GamePhase = 'idle' | 'composing' | 'composed' | 'attacking' | 'monster_turn' | 'victory' | 'game_over';
type ComposeAnimPhase = 'idle' | 'gathering' | 'glowing' | 'revealing' | 'fading' | 'fail';

interface DamagePopupData {
  damage: number;
  isCritical: boolean;
  isResisted: boolean;
}

function App() {
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [selectedElements, setSelectedElements] = useState<ElementType[]>([]);
  const [currentSpell, setCurrentSpell] = useState<MagicSpell | null>(null);
  const [monster, setMonster] = useState(() => spawnRandomMonster(1));
  const [turnCount, setTurnCount] = useState(1);
  const [defeatedCount, setDefeatedCount] = useState(0);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [usedSpells, setUsedSpells] = useState<MagicSpell[]>([]);
  const [monsterHit, setMonsterHit] = useState(false);
  const [damagePopup, setDamagePopup] = useState<DamagePopupData | null>(null);
  const [failAnimation, setFailAnimation] = useState(false);

  const [composeAnimPhase, setComposeAnimPhase] = useState<ComposeAnimPhase>('idle');
  const [composeResult, setComposeResult] = useState<CompositionResult | null>(null);

  const addLog = useCallback((type: 'player' | 'monster' | 'system', message: string) => {
    const entry: BattleLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      turn: turnCount,
      timestamp: Date.now()
    };
    setBattleLogs(prev => {
      const next = [...prev, entry];
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
    });
  }, [turnCount]);

  const handleToggleElement = useCallback((element: ElementType) => {
    if (gamePhase !== 'idle' && gamePhase !== 'composing') return;

    setSelectedElements(prev => {
      if (prev.includes(element)) {
        return prev.filter(e => e !== element);
      }
      if (prev.length >= MAX_ELEMENTS_SELECTED) {
        return prev;
      }
      return [...prev, element];
    });

    if (gamePhase === 'idle') {
      setGamePhase('composing');
    }
  }, [gamePhase]);

  const handleCompose = useCallback(() => {
    if (selectedElements.length < MIN_ELEMENTS_TO_COMPOSE) {
      addLog('system', '至少需要选择 2 种元素才能合成');
      return;
    }

    const result = composeElements(selectedElements);
    setComposeResult(result);

    if (result.success && result.spell) {
      setComposeAnimPhase('gathering');
    } else {
      setFailAnimation(true);
      setComposeAnimPhase('fail');

      setTimeout(() => {
        setFailAnimation(false);
        setComposeAnimPhase('idle');
        setComposeResult(null);
        addLog('system', result.message);
      }, 400);
    }
  }, [selectedElements, addLog]);

  useEffect(() => {
    if (composeAnimPhase === 'gathering') {
      const timer = setTimeout(() => {
        setComposeAnimPhase('glowing');
      }, 500);
      return () => clearTimeout(timer);
    }

    if (composeAnimPhase === 'glowing') {
      const timer = setTimeout(() => {
        setComposeAnimPhase('revealing');
      }, 600);
      return () => clearTimeout(timer);
    }

    if (composeAnimPhase === 'revealing') {
      const timer = setTimeout(() => {
        if (composeResult?.spell) {
          setCurrentSpell(composeResult.spell);
          setUsedSpells(prev => [...prev, composeResult.spell!]);
          addLog('system', `合成成功！获得魔法【${composeResult.spell.name}】`);
        }
        setComposeAnimPhase('fading');

        setTimeout(() => {
          setComposeAnimPhase('idle');
          setComposeResult(null);
          setGamePhase('composed');
        }, 300);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [composeAnimPhase, composeResult, addLog]);

  const handleAttack = useCallback(() => {
    if (!currentSpell || !monster || gamePhase !== 'composed') return;

    setGamePhase('attacking');

    const result = calculateBattleResult(monster, currentSpell);
    addLog('player', result.message);

    const newHp = Math.max(0, monster.currentHp - result.damage);
    setMonster(prev => prev ? { ...prev, currentHp: newHp } : prev);
    setMonsterHit(true);
    setDamagePopup({ damage: result.damage, isCritical: result.isCritical, isResisted: result.isResisted });

    setTimeout(() => {
      setMonsterHit(false);
      setDamagePopup(null);

      if (newHp <= 0) {
        const newDefeated = defeatedCount + 1;
        setDefeatedCount(newDefeated);
        addLog('system', `${monster.name} 已被击败！（已击败 ${newDefeated} 只怪物）`);

        if (newDefeated >= MONSTERS_TO_WIN) {
          setGamePhase('victory');
          addLog('system', '恭喜你击败了所有怪物，取得胜利！');
          return;
        }

        const scale = 1 + newDefeated * 0.15;
        const newMonster = spawnRandomMonster(scale);
        setMonster(newMonster);
        addLog('system', `新的怪物 ${newMonster.name} 出现了！`);
        setCurrentSpell(null);
        setSelectedElements([]);
        setTurnCount(prev => prev + 1);
        setGamePhase('idle');
        return;
      }

      setGamePhase('monster_turn');

      const monsterDmg = getMonsterDamage(monster);
      const newPlayerHp = Math.max(0, playerHp - monsterDmg);
      setPlayerHp(newPlayerHp);
      addLog('monster', `${monster.name} 对你造成了 ${monsterDmg} 点伤害`);

      if (newPlayerHp <= 0) {
        setGamePhase('game_over');
        addLog('system', '你已被击败...游戏结束');
        return;
      }

      setCurrentSpell(null);
      setSelectedElements([]);
      setTurnCount(prev => prev + 1);
      setGamePhase('idle');
    }, 500);
  }, [currentSpell, monster, gamePhase, playerHp, defeatedCount, addLog]);

  const handleReset = useCallback(() => {
    setPlayerHp(PLAYER_MAX_HP);
    setSelectedElements([]);
    setCurrentSpell(null);
    setMonster(spawnRandomMonster(1));
    setTurnCount(1);
    setDefeatedCount(0);
    setBattleLogs([]);
    setGamePhase('idle');
    setUsedSpells([]);
    setMonsterHit(false);
    setDamagePopup(null);
    setFailAnimation(false);
    setComposeAnimPhase('idle');
    setComposeResult(null);
  }, []);

  const handleClearLogs = useCallback(() => {
    setBattleLogs([]);
  }, []);

  const canCompose = selectedElements.length >= MIN_ELEMENTS_TO_COMPOSE &&
    (gamePhase === 'idle' || gamePhase === 'composing') &&
    composeAnimPhase === 'idle';

  const canAttack = gamePhase === 'composed' && currentSpell !== null;

  return (
    <div className="app-container">
      {gamePhase === 'victory' && (
        <VictoryScreen
          usedSpells={usedSpells}
          totalTurns={turnCount}
          onRestart={handleReset}
        />
      )}

      {gamePhase === 'game_over' && (
        <div className="game-over-overlay">
          <div className="game-over-title">战败</div>
          <div style={{ color: 'var(--text-primary)', marginTop: '16px', fontSize: '1.1rem' }}>
            你在第 {turnCount} 回合被击败
          </div>
          <div style={{ color: 'var(--text-primary)', opacity: 0.6, marginTop: '8px' }}>
            已击败 {defeatedCount} 只怪物
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '30px', padding: '12px 40px', fontSize: '1.1rem' }}
            onClick={handleReset}
          >
            重新开始
          </button>
        </div>
      )}

      {composeAnimPhase !== 'idle' && composeAnimPhase !== 'fail' && (
        <div className="composition-animation-overlay">
          <div className="composition-stage">
            {selectedElements.map((el, i) => {
              const info = elementInfo[el];
              const total = selectedElements.length;
              const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
              const radius = composeAnimPhase === 'gathering' ? 80 : composeAnimPhase === 'glowing' ? 30 : 0;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={i}
                  className={`anim-element ${composeAnimPhase === 'glowing' ? 'converged' : composeAnimPhase === 'gathering' ? 'gathering' : ''}`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    fontSize: '2.5rem',
                    left: '50%',
                    top: '50%',
                    marginLeft: '-20px',
                    marginTop: '-20px'
                  }}
                >
                  {info.symbol}
                </div>
              );
            })}

            <div className={`anim-glow ${composeAnimPhase === 'glowing' ? 'active' : ''}`} />

            {composeAnimPhase === 'revealing' && composeResult?.spell && (
              <div className={`anim-spell-card ${composeAnimPhase === 'revealing' ? 'revealed' : ''}`}>
                <div className="spell-reveal-name">{composeResult.spell.name}</div>
                <div className="spell-reveal-damage">伤害：{composeResult.spell.damage}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <header className="game-header">
        <h1>元素魔法战斗模拟器</h1>
        <div className="stats-bar">
          <div>回合：<span>{turnCount}</span></div>
          <div>已击败：<span>{defeatedCount} / {MONSTERS_TO_WIN}</span></div>
          <div>玩家 HP：<span>{playerHp} / {PLAYER_MAX_HP}</span></div>
        </div>
      </header>

      <div className="battle-area">
        <div className="player-panel">
          <ElementSelector
            selectedElements={selectedElements}
            onToggleElement={handleToggleElement}
            failAnimation={failAnimation}
          />

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              disabled={!canCompose}
              onClick={handleCompose}
            >
              合成魔法
            </button>
            <button
              className="btn btn-attack"
              disabled={!canAttack}
              onClick={handleAttack}
            >
              攻击
            </button>
            <button
              className="btn btn-reset"
              onClick={handleReset}
            >
              重置
            </button>
          </div>

          {currentSpell && (
            <div className="current-spell">
              <div className="spell-name">{currentSpell.name}</div>
              <div className="spell-info">
                {elementInfo[currentSpell.element].symbol} {currentSpell.description} | 伤害：{currentSpell.damage}
              </div>
            </div>
          )}

          <div className="player-hp-section">
            <div className="hp-label">
              <span>玩家 HP</span>
              <span>{playerHp} / {PLAYER_MAX_HP}</span>
            </div>
            <div className="hp-bar-container">
              <div
                className={`hp-bar ${playerHp / PLAYER_MAX_HP > 0.6 ? 'high' : playerHp / PLAYER_MAX_HP > 0.3 ? 'mid' : 'low'}`}
                style={{ width: `${(playerHp / PLAYER_MAX_HP) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <MonsterPanel
          monster={monster}
          isHit={monsterHit}
          damagePopup={damagePopup}
        />
      </div>

      <BattleLog logs={battleLogs} onClear={handleClearLogs} />
    </div>
  );
}

export default App;
