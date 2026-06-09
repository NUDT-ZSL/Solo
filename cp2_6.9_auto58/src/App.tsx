import { useState, useEffect, useRef, useCallback } from 'react';
import CardPanel from './components/CardPanel';
import {
  PRESET_CARDS,
  useBattleSimulator,
  BattleLogEntry,
  BattleStats,
  Card,
} from './hooks/useBattleSimulator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MAX_LOG_DISPLAY = 15;
const TURN_DELAY = 600;
const FLASH_DURATION = 200;

function App() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [battleStarted, setBattleStarted] = useState(false);
  const [displayedLogs, setDisplayedLogs] = useState<BattleLogEntry[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [flashingCardId, setFlashingCardId] = useState<string | null>(null);
  const [currentHp, setCurrentHp] = useState<{ [cardId: string]: number }>({});
  const [showStats, setShowStats] = useState(false);
  const [fadingLogCount, setFadingLogCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const card1 = selectedIds.length >= 1 ? PRESET_CARDS.find((c) => c.id === selectedIds[0]) || null : null;
  const card2 = selectedIds.length >= 2 ? PRESET_CARDS.find((c) => c.id === selectedIds[1]) || null : null;

  const { logs, stats } = useBattleSimulator(card1, card2, battleStarted);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  useEffect(() => {
    if (!battleStarted || logs.length === 0) return;
    if (currentLogIndex >= logs.length) {
      setTimeout(() => setShowStats(true), TURN_DELAY);
      return;
    }

    const log = logs[currentLogIndex];

    const flashTimeout = setTimeout(() => {
      setFlashingCardId(log.attackerId);
      setCurrentHp({ ...log.remainingHp });

      setDisplayedLogs((prev) => {
        let newLogs = [...prev, log];
        if (newLogs.length > MAX_LOG_DISPLAY) {
          const overflow = newLogs.length - MAX_LOG_DISPLAY;
          setFadingLogCount(overflow);
          setTimeout(() => {
            setDisplayedLogs((l) => l.slice(overflow));
            setFadingLogCount(0);
          }, 500);
        }
        return newLogs;
      });

      setTimeout(() => setFlashingCardId(null), FLASH_DURATION);
      setTimeout(() => setCurrentLogIndex((i) => i + 1), TURN_DELAY - 100);
    }, currentLogIndex === 0 ? TURN_DELAY : 0);

    timeoutsRef.current.push(flashTimeout);
    return () => clearTimeout(flashTimeout);
  }, [battleStarted, currentLogIndex, logs]);

  const handleCardSelect = useCallback((cardId: string) => {
    if (battleStarted) return;
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length < 2) {
        return [...prev, cardId];
      }
      return [prev[1], cardId];
    });
  }, [battleStarted]);

  const handleStartBattle = useCallback(() => {
    if (selectedIds.length !== 2) return;
    setDisplayedLogs([]);
    setCurrentLogIndex(0);
    setShowStats(false);
    setCurrentHp(
      PRESET_CARDS.reduce((acc, c) => ({ ...acc, [c.id]: c.maxHp }), {})
    );
    setBattleStarted(true);
  }, [selectedIds]);

  const handleReset = useCallback(() => {
    clearAllTimeouts();
    setIsResetting(true);
    setTimeout(() => {
      setSelectedIds([]);
      setBattleStarted(false);
      setDisplayedLogs([]);
      setCurrentLogIndex(0);
      setFlashingCardId(null);
      setCurrentHp({});
      setShowStats(false);
      setFadingLogCount(0);
      setIsResetting(false);
    }, 300);
  }, [clearAllTimeouts]);

  const getChartData = (stats: BattleStats, card1: Card, card2: Card) => [
    {
      name: '累计伤害',
      [card1.name]: stats.totalDamage[card1.id] || 0,
      [card2.name]: stats.totalDamage[card2.id] || 0,
    },
    {
      name: '暴击次数',
      [card1.name]: stats.critCount[card1.id] || 0,
      [card2.name]: stats.critCount[card2.id] || 0,
    },
    {
      name: '连击次数',
      [card1.name]: stats.comboCount[card1.id] || 0,
      [card2.name]: stats.comboCount[card2.id] || 0,
    },
  ];

  const getLogDescription = (log: BattleLogEntry): string => {
    let desc = `${log.attackerName} 攻击 ${log.defenderName}`;
    if (log.isCombo && !log.isCrit) {
      desc = `${log.attackerName} 触发连击! 追击 ${log.defenderName}`;
    } else if (log.isCrit) {
      desc += ' 暴击!';
    }
    if (log.isBlocked) {
      desc += ' (被格挡)';
    }
    return desc;
  };

  const winnerText = stats?.winner
    ? stats.winner === 'draw'
      ? '战斗平局!'
      : `${PRESET_CARDS.find((c) => c.id === stats.winner)?.name} 获胜!`
    : '';

  return (
    <div
      className={isResetting ? 'reset-animation' : ''}
      style={{
        minHeight: '100vh',
        padding: '24px',
        position: 'relative',
      }}
    >
      <button
        onClick={handleReset}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '2px solid #fff',
          background: 'rgba(255,255,255,0.05)',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
        title="重置战斗"
      >
        ↻
      </button>

      <h1
        style={{
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: 800,
          marginBottom: '24px',
          background: 'linear-gradient(90deg, #d4a843, #f39c12)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        卡牌战斗可视化
      </h1>

      <div
        className="main-layout"
        style={{
          display: 'flex',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            flex: 3,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <CardPanel
              cards={PRESET_CARDS}
              selectedIds={selectedIds}
              onCardSelect={handleCardSelect}
              flashingCardId={flashingCardId}
              currentHp={currentHp}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleStartBattle}
              disabled={selectedIds.length !== 2 || battleStarted}
              style={{
                padding: '14px 48px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
                background:
                  selectedIds.length !== 2 || battleStarted
                    ? 'linear-gradient(90deg, #666, #888)'
                    : 'linear-gradient(90deg, #e74c3c, #f39c12)',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedIds.length !== 2 || battleStarted ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: selectedIds.length !== 2 || battleStarted ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (selectedIds.length === 2 && !battleStarted) {
                  e.currentTarget.style.filter = 'brightness(1.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => {
                if (selectedIds.length === 2 && !battleStarted) {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {battleStarted
                ? currentLogIndex >= logs.length && logs.length > 0
                  ? '战斗结束'
                  : '战斗中...'
                : selectedIds.length === 2
                ? '开始战斗'
                : `请选择卡牌 (${selectedIds.length}/2)`}
            </button>
          </div>

          {winnerText && showStats && (
            <div
              style={{
                textAlign: 'center',
                fontSize: '22px',
                fontWeight: 800,
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(212, 168, 67, 0.15)',
                border: '1px solid #d4a843',
                color: '#d4a843',
              }}
            >
              {winnerText}
            </div>
          )}
        </div>

        <div
          style={{
            flex: 2,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)',
              padding: '16px',
              flex: 3,
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '12px',
                color: '#ddd',
              }}
            >
              战斗日志
            </h2>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: '400px',
              }}
            >
              {displayedLogs.length === 0 ? (
                <div
                  style={{
                    color: '#666',
                    textAlign: 'center',
                    marginTop: 'auto',
                    marginBottom: 'auto',
                  }}
                >
                  选择两张卡牌并点击开始战斗
                </div>
              ) : (
                displayedLogs.map((log, idx) => {
                  const isFading =
                    fadingLogCount > 0 && idx < fadingLogCount;
                  return (
                    <div
                      key={`${log.round}-${idx}`}
                      className={`log-entry ${isFading ? 'log-fade-out' : ''}`}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        borderLeft: `3px solid ${
                          log.attackerId === selectedIds[0] ? '#3498db' : '#e74c3c'
                        }`,
                      }}
                    >
                      <span
                        style={{
                          color: '#e74c3c',
                          fontWeight: 700,
                          minWidth: '50px',
                        }}
                      >
                        R{log.round}
                      </span>
                      <span style={{ color: '#fff', flex: 1 }}>
                        {getLogDescription(log)}
                      </span>
                      <span
                        style={{
                          color: '#f39c12',
                          fontWeight: 700,
                          fontSize: '15px',
                        }}
                      >
                        -{log.damage}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {showStats && stats && card1 && card2 && (
            <div
              style={{
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(8px)',
                padding: '16px',
                flex: 2,
                minHeight: '300px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  color: '#ddd',
                }}
              >
                战斗统计
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={getChartData(stats, card1, card2)}
                  barGap={8}
                  style={{ background: '#1a1a2e', borderRadius: '8px' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fill: '#ddd' }} />
                  <YAxis tick={{ fill: '#ddd' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#222',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ color: '#ddd' }} />
                  <Bar
                    dataKey={card1.name}
                    fill="#3498db"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={card2.name}
                    fill="#e74c3c"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
