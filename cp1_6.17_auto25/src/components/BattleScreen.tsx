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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePopupsRef = useRef<Map<number, { x: number; y: number; value: number; isCrit: boolean; born: number }>>(new Map());
  const popupRafRef = useRef<number>(0);
  const popupAnimatingRef = useRef(false);

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
    setLogs(prev => [...prev, { id: logIdRef.current++, text }]);
  }, []);

  const startPopupAnimation = useCallback(() => {
    if (popupAnimatingRef.current) return;
    popupAnimatingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) { popupAnimatingRef.current = false; return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { popupAnimatingRef.current = false; return; }

    const DURATION = 1000;

    const animate = () => {
      const now = performance.now();
      const popups = activePopupsRef.current;

      const alive = new Map<number, typeof popups extends Map<number, infer V> ? V : never>();
      popups.forEach((v, k) => {
        if (now - v.born < DURATION) alive.set(k, v);
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (alive.size === 0) {
        activePopupsRef.current = new Map();
        popupAnimatingRef.current = false;
        return;
      }

      alive.forEach((p) => {
        const elapsed = now - p.born;
        const t = elapsed / DURATION;

        const y = p.y - t * 50;
        const alpha = 1 - t;

        const r = 255;
        const g = Math.floor(23 * (1 - t));
        const b = Math.floor(68 * (1 - t));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${p.isCrit ? 24 : 18}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(`-${p.value}`, p.x + 2, y + 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillText(`-${p.value}`, p.x, y);
        ctx.restore();
      });

      activePopupsRef.current = alive;
      popupRafRef.current = requestAnimationFrame(animate);
    };

    popupRafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (popupRafRef.current) cancelAnimationFrame(popupRafRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const showDamage = useCallback((targetId: string, value: number) => {
    const id = damageIdRef.current++;
    const isCrit = value > 30;
    setDamagePopups(prev => [...prev, { id, targetId, value, isCrit }]);

    const el = document.querySelector(`[data-monster-id="${targetId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - canvasRect.left;
        const y = rect.top + 10 - canvasRect.top;
        activePopupsRef.current.set(id, { x, y, value, isCrit, born: performance.now() });
        startPopupAnimation();
      }
    }

    setTimeout(() => {
      setDamagePopups(prev => prev.filter(d => d.id !== id));
    }, 1000);
  }, [startPopupAnimation]);

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
        setEnemyMonsters(prev => prev.map((m) => {
          if (m.id !== action.target.id) return m;
          const newHp = Math.max(0, m.currentHp - damage);
          if (newHp === 0) addLog(`💀 ${m.name} 被击败了！`);
          return { ...m, currentHp: newHp };
        }));
      } else {
        setPlayerMonsters(prev => prev.map((m) => {
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
      position: 'relative',
    }}>
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2D2D44',
        borderBottom: '2px solid #455A64',
        position: 'relative',
        zIndex: 10,
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
            />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />

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
            fontSize: 12,
            lineHeight: 2.2,
            color: '#757575',
          }}
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className="battle-log-entry"
              style={{
                color: log.text.startsWith('---')
                  ? '#FFD54F'
                  : log.text.includes('胜利')
                    ? '#4CAF50'
                    : log.text.includes('失败') || log.text.includes('阵亡')
                      ? '#E53935'
                      : log.text.includes('击败')
                        ? '#FF9800'
                        : '#757575',
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
}

function BattleMonsterCard({ monster, isActive, isShaking, isAttacking, isLeft }: BattleMonsterCardProps) {
  const hpPct = (monster.currentHp / monster.maxHp) * 100;
  const mpPct = (monster.currentMp / monster.maxMp) * 100;
  const isDead = monster.currentHp <= 0;

  return (
    <div
      className={isShaking ? 'shake' : ''}
      data-monster-id={monster.id}
      style={{
        position: 'relative',
      }}
    >
      <div style={{
        opacity: isDead ? 0.3 : 1,
        filter: isDead ? 'grayscale(100%)' : 'none',
        transform: isAttacking
          ? `translateX(${isLeft ? 25 : -25}px) scale(1.08)`
          : isActive
            ? 'scale(1.02)'
            : 'scale(0.9)',
        transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.2s ease',
        position: 'relative',
        width: 200,
      }}>
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
                  height: 8,
                  backgroundColor: '#E53935',
                  transition: 'width 0.3s ease',
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
                  height: 8,
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
    </div>
  );
}
