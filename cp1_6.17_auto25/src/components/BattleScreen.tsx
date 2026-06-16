import { useState, useEffect, useRef, useCallback } from 'react';
import { PageType } from '../App';
import { Monster, BattleMonster, calculateDamage } from '../utils/monsterData';
import MonsterSprite from './MonsterSprite';
import { playClickSound, playAttackSound, playVictorySound, playDefeatSound } from '../utils/audio';

interface BattleScreenProps {
  playerTeam: Monster[];
  enemyTeam: Monster[];
  onBattleEnd: (result: 'win' | 'lose', turns: number) => void;
  onNavigate: (page: PageType) => void;
  battleResult: 'win' | 'lose' | null;
}

interface LogEntry {
  id: number;
  text: string;
  timestamp: number;
}

interface DamagePopup {
  id: number;
  targetId: string;
  value: number;
  isCrit: boolean;
}

export default function BattleScreen({
  playerTeam,
  enemyTeam,
  onBattleEnd,
  onNavigate,
  battleResult,
}: BattleScreenProps) {
  const playSoundAndNav = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  const [playerMonsters, setPlayerMonsters] = useState<BattleMonster[]>([]);
  const [enemyMonsters, setEnemyMonsters] = useState<BattleMonster[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [activeEnemyIdx, setActiveEnemyIdx] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [turn, setTurn] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [battleEnded, setBattleEnded] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [attackingId, setAttackingId] = useState<string | null>(null);

  const logIdRef = useRef(0);
  const damageIdRef = useRef(0);
  const logsRef = useRef<HTMLDivElement>(null);
  const battleEndedRef = useRef(false);

  useEffect(() => {
    const pMonsters: BattleMonster[] = playerTeam.map((m, i) => ({
      ...m,
      currentHp: m.maxHp,
      currentMp: m.maxMp,
      isPlayer: true,
      id: `p_${i}_${m.id}`,
    }));
    const eMonsters: BattleMonster[] = enemyTeam.map((m, i) => ({
      ...m,
      currentHp: m.maxHp,
      currentMp: m.maxMp,
      isPlayer: false,
      id: `e_${i}_${m.id}`,
    }));
    setPlayerMonsters(pMonsters);
    setEnemyMonsters(eMonsters);
    addLog('⚔️ 战斗开始！');
    addLog(`我方 ${playerTeam.length} 只怪兽 VS 敌方 ${enemyTeam.length} 只怪兽`);
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((text: string) => {
    setLogs(prev => [...prev, {
      id: logIdRef.current++,
      text,
      timestamp: Date.now(),
    }]);
  }, []);

  const showDamage = useCallback((targetId: string, value: number) => {
    const id = damageIdRef.current++;
    setDamagePopups(prev => [...prev, { id, targetId, value, isCrit: value > 30 }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(d => d.id !== id));
    }, 1000);
  }, []);

  const triggerShake = useCallback((targetId: string) => {
    setShakingId(targetId);
    setTimeout(() => setShakingId(null), 100);
  }, []);

  const triggerAttackAnim = useCallback((attackerId: string) => {
    setAttackingId(attackerId);
    setTimeout(() => setAttackingId(null), 200);
  }, []);

  useEffect(() => {
    if (battleEndedRef.current || battleEnded) return;
    if (playerMonsters.length === 0 || enemyMonsters.length === 0) return;
    if (playerMonsters[activePlayerIdx]?.currentHp <= 0) return;
    if (enemyMonsters[activeEnemyIdx]?.currentHp <= 0) return;
    if (isAnimating) return;

    const timer = setTimeout(() => runTurn(), 800);
    return () => clearTimeout(timer);
  }, [turn, playerMonsters, enemyMonsters, activePlayerIdx, activeEnemyIdx, isAnimating, battleEnded]);

  const findNextAlive = (team: BattleMonster[], startIdx: number): number => {
    for (let i = 0; i < team.length; i++) {
      const idx = (startIdx + i) % team.length;
      if (team[idx].currentHp > 0) return idx;
    }
    return -1;
  };

  const runTurn = useCallback(async () => {
    if (battleEndedRef.current) return;
    setIsAnimating(true);
    setTurn(t => t + 1);

    const currentTurn = turn + 1;
    addLog(`--- 第 ${currentTurn} 回合 ---`);

    const pActive = playerMonsters[activePlayerIdx];
    const eActive = enemyMonsters[activeEnemyIdx];
    if (!pActive || !eActive) { setIsAnimating(false); return; }

    const actions: { attacker: BattleMonster; target: BattleMonster; isPlayerAttacker: boolean }[] = [];

    if (pActive.speed >= eActive.speed) {
      actions.push({ attacker: pActive, target: eActive, isPlayerAttacker: true });
      actions.push({ attacker: eActive, target: pActive, isPlayerAttacker: false });
    } else {
      actions.push({ attacker: eActive, target: pActive, isPlayerAttacker: false });
      actions.push({ attacker: pActive, target: eActive, isPlayerAttacker: true });
    }

    for (const action of actions) {
      if (action.attacker.currentHp <= 0) continue;
      if (action.target.currentHp <= 0) continue;
      if (battleEndedRef.current) break;

      await new Promise(resolve => setTimeout(resolve, 400));

      const damage = calculateDamage(action.attacker, action.target);
      playAttackSound();
      triggerAttackAnim(action.attacker.id);

      await new Promise(resolve => setTimeout(resolve, 150));

      showDamage(action.target.id, damage);
      triggerShake(action.target.id);

      addLog(
        `${action.isPlayerAttacker ? '🟢' : '🔴'} ${action.attacker.name} 攻击 ${action.target.name}，造成 ${damage} 点伤害！`
      );

      if (action.isPlayerAttacker) {
        setEnemyMonsters(prev => prev.map((m, i) => {
          if (m.id !== action.target.id) return m;
          const newHp = Math.max(0, m.currentHp - damage);
          if (newHp === 0) addLog(`💀 ${m.name} 被击败了！`);
          return { ...m, currentHp: newHp };
        }));
      } else {
        setPlayerMonsters(prev => prev.map((m, i) => {
          if (m.id !== action.target.id) return m;
          const newHp = Math.max(0, m.currentHp - damage);
          if (newHp === 0) addLog(`💀 我方 ${m.name} 被击败了！`);
          return { ...m, currentHp: newHp };
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 350));
    }

    setTimeout(() => {
      setPlayerMonsters(prevP => {
        setEnemyMonsters(prevE => {
          const allPlayerDead = prevP.every(m => m.currentHp <= 0);
          const allEnemyDead = prevE.every(m => m.currentHp <= 0);

          if (allPlayerDead || allEnemyDead) {
            if (!battleEndedRef.current) {
              battleEndedRef.current = true;
              setBattleEnded(true);
              const result = allEnemyDead ? 'win' : 'lose';
              addLog(result === 'win' ? '🎉 胜利！所有敌人已被击败！' : '😢 失败...我方全员阵亡');
              if (result === 'win') playVictorySound();
              else playDefeatSound();
              onBattleEnd(result, currentTurn);
            }
          } else {
            const pIdx = findNextAlive(prevP, activePlayerIdx);
            const eIdx = findNextAlive(prevE, activeEnemyIdx);
            if (pIdx !== -1 && pIdx !== activePlayerIdx) {
              setActivePlayerIdx(pIdx);
              addLog(`🔄 我方 ${prevP[pIdx].name} 替补出战！`);
            }
            if (eIdx !== -1 && eIdx !== activeEnemyIdx) {
              setActiveEnemyIdx(eIdx);
              addLog(`🔄 敌方 ${prevE[eIdx].name} 替补出战！`);
            }
          }
          return prevE;
        });
        return prevP;
      });
      setIsAnimating(false);
    }, 200);
  }, [playerMonsters, enemyMonsters, activePlayerIdx, activeEnemyIdx, turn, addLog, showDamage, triggerShake, triggerAttackAnim, onBattleEnd]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1A1A2E',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2D2D44',
        borderBottom: '2px solid #455A64',
      }}>
        <button className="btn-pixel" onClick={() => playSoundAndNav('prepare')}>
          ← 返回
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <h2 className="pixel-font" style={{ color: '#FFD54F', fontSize: 14 }}>
            ⚔️ 战斗中
          </h2>
          <div className="pixel-font" style={{ color: '#81D4FA', fontSize: 10 }}>
            回合 {turn}
          </div>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{
        position: 'relative',
        flex: 1,
        background: `
          linear-gradient(180deg, #0D1B2A 0%, #1B263B 40%, #2D4A3E 60%, #1B4332 100%)
        `,
        overflow: 'hidden',
        minHeight: 380,
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          backgroundImage: `
            linear-gradient(45deg, #2D5A27 25%, transparent 25%),
            linear-gradient(-45deg, #2D5A27 25%, transparent 25%)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }} />

        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: `${30 + Math.random() * 15}%`,
              width: 2,
              height: `${40 + Math.random() * 60}px`,
              backgroundColor: '#3CB371',
              borderRadius: 1,
              opacity: 0.5,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${(Math.random() - 0.5) * 15}deg)`,
            }}
          />
        ))}

        <div style={{
          position: 'absolute',
          left: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {playerMonsters.map((m, i) => (
            <BattleMonsterCard
              key={m.id}
              monster={m}
              isActive={i === activePlayerIdx}
              isShaking={shakingId === m.id}
              isAttacking={attackingId === m.id}
              isLeft={true}
              damagePopups={damagePopups.filter(d => d.targetId === m.id)}
            />
          ))}
        </div>

        <div style={{
          position: 'absolute',
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'flex-end',
        }}>
          {enemyMonsters.map((m, i) => (
            <BattleMonsterCard
              key={m.id}
              monster={m}
              isActive={i === activeEnemyIdx}
              isShaking={shakingId === m.id}
              isAttacking={attackingId === m.id}
              isLeft={false}
              damagePopups={damagePopups.filter(d => d.targetId === m.id)}
            />
          ))}
        </div>

        {battleEnded && (
          <div
            className="fade-in"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              gap: 24,
            }}
          >
            <div
              className="pixel-font"
              style={{
                fontSize: 48,
                color: battleResult === 'win' ? '#FFD54F' : '#E53935',
                textShadow: battleResult === 'win'
                  ? '0 0 20px rgba(255,213,79,0.8)'
                  : '0 0 20px rgba(229,57,53,0.8)',
              }}
            >
              {battleResult === 'win' ? '🏆 胜利！' : '💀 失败'}
            </div>
            <div style={{ color: '#B0BEC5', fontFamily: "'Press Start 2P', cursive", fontSize: 12 }}>
              共进行 {turn} 回合
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn-pixel" onClick={() => playSoundAndNav('prepare')} style={{ fontSize: 12 }}>
                再战
              </button>
              <button className="btn-pixel" onClick={() => playSoundAndNav('assemble')} style={{ fontSize: 12, backgroundColor: '#1565C0' }}>
                组装新怪兽
              </button>
              <button className="btn-pixel" onClick={() => playSoundAndNav('menu')} style={{ fontSize: 12, backgroundColor: '#546E7A' }}>
                主菜单
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        height: 180,
        backgroundColor: '#2D2D44',
        borderTop: '2px solid #455A64',
        padding: 12,
      }}>
        <div
          ref={logsRef}
          className="scrollbar"
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 10,
            lineHeight: 2.2,
          }}
        >
          {logs.map((log, i) => (
            <div
              key={log.id}
              className="slide-in-left"
              style={{
                color: log.text.startsWith('---')
                  ? '#FFD54F'
                  : log.text.includes('胜利')
                    ? '#4CAF50'
                    : log.text.includes('失败') || log.text.includes('阵亡')
                      ? '#E53935'
                      : log.text.includes('击败')
                        ? '#FF9800'
                        : '#B0BEC5',
                animationDelay: `${0}ms`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BattleMonsterCardProps {
  monster: BattleMonster;
  isActive: boolean;
  isShaking: boolean;
  isAttacking: boolean;
  isLeft: boolean;
  damagePopups: DamagePopup[];
}

function BattleMonsterCard({ monster, isActive, isShaking, isAttacking, isLeft, damagePopups }: BattleMonsterCardProps) {
  const hpPct = (monster.currentHp / monster.maxHp) * 100;
  const mpPct = (monster.currentMp / monster.maxMp) * 100;
  const isDead = monster.currentHp <= 0;

  return (
    <div
      className={isShaking ? 'shake' : ''}
      style={{
        position: 'relative',
        width: 200,
        opacity: isDead ? 0.3 : 1,
        filter: isDead ? 'grayscale(100%)' : 'none',
        transform: isAttacking
          ? `translateX(${isLeft ? 25 : -25}px) scale(1.08)`
          : isActive
            ? 'scale(1.02)'
            : 'scale(0.9)',
        transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.2s ease',
      }}
    >
      {isActive && !isDead && (
        <div style={{
          position: 'absolute',
          inset: -6,
          border: `2px solid ${monster.isPlayer ? '#81D4FA' : '#EF5350'}`,
          borderRadius: 12,
          boxShadow: `0 0 20px ${monster.isPlayer ? 'rgba(129,212,250,0.6)' : 'rgba(239,83,80,0.6)'}`,
          pointerEvents: 'none',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      <div style={{
        backgroundColor: 'rgba(30, 30, 46, 0.9)',
        border: `1px solid ${monster.isPlayer ? 'rgba(129,212,250,0.3)' : 'rgba(239,83,80,0.3)'}`,
        borderRadius: 10,
        padding: 10,
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          fontSize: 10,
          color: '#ECEFF1',
          fontFamily: "'Press Start 2P', cursive",
          marginBottom: 8,
          textAlign: isLeft ? 'left' : 'right',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {monster.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: isLeft ? 'flex-start' : 'flex-end', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            {damagePopups.map(dp => (
              <div
                key={dp.id}
                className="damage-float"
                style={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: dp.isCrit ? 24 : 18,
                  color: dp.isCrit ? '#FFEB3B' : '#FF1744',
                  textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                  fontWeight: 'bold',
                  zIndex: 10,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                -{dp.value}
              </div>
            ))}
            <div style={{
              transform: isLeft ? 'none' : 'scaleX(-1)',
              transition: 'transform 0.2s ease',
            }}>
              <MonsterSprite parts={monster.parts} size={80} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: '#EF9A9A', fontFamily: "'Press Start 2P', cursive" }}>HP</span>
              <span style={{ fontSize: 8, color: '#FFFFFF', fontFamily: "'Press Start 2P', cursive" }}>
                {monster.currentHp}/{monster.maxHp}
              </span>
            </div>
            <div style={{
              width: 120,
              height: 8,
              backgroundColor: '#1A1A2E',
              borderRadius: 2,
              overflow: 'hidden',
              marginLeft: isLeft ? 0 : 'auto',
            }}>
              <div style={{
                width: `${hpPct}%`,
                height: '100%',
                backgroundColor: hpPct > 50 ? '#E53935' : hpPct > 25 ? '#FF9800' : '#F44336',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: '#90CAF9', fontFamily: "'Press Start 2P', cursive" }}>MP</span>
              <span style={{ fontSize: 8, color: '#FFFFFF', fontFamily: "'Press Start 2P', cursive" }}>
                {monster.currentMp}/{monster.maxMp}
              </span>
            </div>
            <div style={{
              width: 120,
              height: 8,
              backgroundColor: '#1A1A2E',
              borderRadius: 2,
              overflow: 'hidden',
              marginLeft: isLeft ? 0 : 'auto',
            }}>
              <div style={{
                width: `${mpPct}%`,
                height: '100%',
                backgroundColor: '#42A5F5',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
