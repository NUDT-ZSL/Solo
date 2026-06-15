import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { fetchSeedAndConfig, generateDungeon } from '../game/dungeonGenerator';
import {
  fetchPlayerStats,
  submitGameRecord,
  analyzeDifficulty,
  applyDifficultyAdjustment,
} from '../game/difficultyManager';
import type {
  DungeonMap,
  PlayerStats,
  GameRecord,
  DifficultyConfig,
} from '../game/types';

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: '简单-怪物稀少，适合新手',
  2: '简单-怪物稀少',
  3: '简单-少量怪物',
  4: '普通-怪物适中',
  5: '普通-怪物适中，偶有陷阱',
  6: '普通-怪物增多',
  7: '困难-怪物较多',
  8: '困难-怪物密集陷阱多',
  9: '噩梦-怪物密集陷阱多',
  10: '噩梦-极限挑战',
};

function getLevelDescription(level: number): string {
  return LEVEL_DESCRIPTIONS[level] || `等级 ${level}`;
}

function getButtonColor(level: number): string {
  const colors: Record<number, string> = {
    1: '#81c784',
    2: '#66bb6a',
    3: '#4caf50',
    4: '#ffb74d',
    5: '#ffa726',
    6: '#ff9800',
    7: '#f57c00',
    8: '#e57373',
    9: '#ef5350',
    10: '#e53935',
  };
  return colors[level] || '#81c784';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [threatLevel, setThreatLevel] = useState(5);
  const [dungeon, setDungeon] = useState<DungeonMap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommunicating, setIsCommunicating] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [difficultyHint, setDifficultyHint] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [treasureCount, setTreasureCount] = useState(0);
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
      rendererRef.current.setOnPlayerMove(() => {
        checkRoomExploration();
      });
    }
    return () => {
      rendererRef.current?.destroy();
    };
  }, []);

  const loadStats = async () => {
    setIsCommunicating(true);
    try {
      const stats = await fetchPlayerStats();
      setPlayerStats(stats);
      setTreasureCount(stats.totalTreasures);
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setIsCommunicating(false);
    }
  };

  const checkRoomExploration = useCallback(() => {
    if (!rendererRef.current || !dungeon) return;
    const explored = rendererRef.current.getExploredRooms();
    const unexplored = dungeon.rooms.filter((r) => !explored.has(r.id));
    if (unexplored.length === 0) {
      endGame(true);
    }
  }, [dungeon]);

  const startGame = async () => {
    setIsGenerating(true);
    setIsCommunicating(true);
    setDifficultyHint('');
    setGameActive(false);

    try {
      const startTime = performance.now();
      const { seed, config: baseConfig } = await fetchSeedAndConfig(threatLevel);

      let finalConfig: DifficultyConfig = baseConfig;
      let finalLevel = threatLevel;

      if (playerStats) {
        const analysis = analyzeDifficulty(playerStats.recentRecords);
        if (analysis.levelAdjust !== 0 || Object.keys(analysis.configAdjust).length > 0) {
          finalConfig = applyDifficultyAdjustment(baseConfig, analysis.configAdjust);
          if (analysis.levelAdjust > 0) {
            finalLevel = Math.min(10, finalLevel + analysis.levelAdjust);
          }
          setDifficultyHint(analysis.hint);
          if (playerStats.difficultyHint) {
            setDifficultyHint(playerStats.difficultyHint);
          }
        }
      }

      const map = generateDungeon(finalLevel, seed, finalConfig);

      const endTime = performance.now();
      console.log(`Map generated in ${(endTime - startTime).toFixed(2)}ms`);

      setDungeon(map);

      if (rendererRef.current) {
        rendererRef.current.setMap(map);
        rendererRef.current.focus();
      }

      gameStartTimeRef.current = Date.now();
      setElapsedTime(0);
      setGameActive(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = window.setInterval(() => {
        if (gameStartTimeRef.current) {
          setElapsedTime((Date.now() - gameStartTimeRef.current) / 1000);
        }
      }, 500);
    } catch (e) {
      console.error('Failed to start game', e);
    } finally {
      setIsGenerating(false);
      setIsCommunicating(false);
    }
  };

  const endGame = async (cleared: boolean) => {
    if (!gameStartTimeRef.current || !dungeon || !gameActive) return;

    setGameActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const player = rendererRef.current?.getPlayer();
    const timeSpent = (Date.now() - gameStartTimeRef.current) / 1000;
    gameStartTimeRef.current = null;

    const record: GameRecord = {
      seed: dungeon.seed,
      threatLevel: dungeon.threatLevel,
      timeSpent,
      remainingHp: player?.hp ?? 100,
      maxHp: player?.maxHp ?? 100,
      killCount: cleared ? dungeon.monsters.length : 0,
      treasureCollected: cleared ? dungeon.treasures.length : 0,
      cleared,
    };

    setIsCommunicating(true);
    try {
      const stats = await submitGameRecord(record);
      setPlayerStats(stats);
      setTreasureCount(stats.totalTreasures);
      if (stats.difficultyHint) {
        setDifficultyHint(stats.difficultyHint);
      }
    } catch (e) {
      console.error('Failed to submit record', e);
    } finally {
      setIsCommunicating(false);
    }
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThreatLevel(parseInt(e.target.value, 10));
  };

  const totalClears = playerStats?.totalClears ?? 0;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Segoe UI", sans-serif',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          padding: '16px',
          gap: '16px',
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: '30%',
            background: '#16213e',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto',
          }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '20px' }}>
              威胁等级设置
            </h2>

            <div
              style={{
                background: '#1a1a3e',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '12px',
                textAlign: 'center',
                fontSize: '14px',
                minHeight: '20px',
              }}
            >
              <span style={{ fontWeight: 'bold', color: '#ff5722' }}>
                等级 {threatLevel}
              </span>
              <span style={{ marginLeft: '8px' }}>
                {getLevelDescription(threatLevel)}
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={threatLevel}
              onChange={handleLevelChange}
              disabled={isGenerating}
              style={{
                width: '100%',
                height: '8px',
                background: '#333',
                borderRadius: '4px',
                outline: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#888',
                marginTop: '8px',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span key={n} style={{ width: '20px', textAlign: 'center' }}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={isGenerating}
            style={{
              width: '240px',
              height: '56px',
              borderRadius: '28px',
              border: 'none',
              background: getButtonColor(threatLevel),
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              alignSelf: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'transform 0.1s, box-shadow 0.1s',
              opacity: isGenerating ? 0.7 : 1,
            }}
            onMouseDown={(e) => {
              if (!isGenerating) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isGenerating ? '生成中...' : '开始探险'}
          </button>

          {difficultyHint && (
            <div
              style={{
                background: '#0f3460',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#00bcd4',
                textAlign: 'center',
                border: '1px solid #00bcd4',
              }}
            >
              ⚡ {difficultyHint}
            </div>
          )}

          <div>
            <div style={{ fontSize: '16px', marginBottom: '12px', lineHeight: 1.5 }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>等级说明：</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#bbb' }}>
                {threatLevel <= 3 && (
                  <>
                    低难度区域。怪物数量稀少（2-4只），陷阱几乎没有，是熟悉操作的好地方。
                    新手推荐从等级 1 开始。
                  </>
                )}
                {threatLevel >= 4 &&
                  threatLevel <= 7 && (
                    <>
                      中等难度区域。怪物数量适中（5-7只），部分房间会有陷阱。
                      宝物掉落率正常，需要注意走位和资源管理。
                    </>
                  )}
                {threatLevel >= 8 && (
                  <>
                    高难度区域。怪物密集（8-12只），陷阱随处可见。
                    高风险高回报，宝物掉落率提升，挑战极限操作！
                  </>
                )}
              </div>
            </div>

            <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
              操作提示：使用 WASD 或 方向键 移动角色
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <h3
              style={{
                margin: 0,
                marginBottom: '12px',
                fontSize: '16px',
                borderBottom: '1px solid #2a2a5e',
                paddingBottom: '8px',
              }}
            >
              最近闯关记录
            </h3>
            <div
              style={{
                overflowY: 'auto',
                maxHeight: '300px',
              }}
            >
              {playerStats?.recentRecords && playerStats.recentRecords.length > 0 ? (
                playerStats.recentRecords.map((record, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      background: idx % 2 === 0 ? '#1a1a3e' : '#16213e',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span
                      style={{
                        color: record.cleared ? '#4caf50' : '#ef5350',
                        fontWeight: 'bold',
                        width: '60px',
                      }}
                    >
                      {record.cleared ? '✓ 通关' : '✗ 失败'}
                    </span>
                    <span style={{ color: '#aaa' }}>
                      Lv.{record.threatLevel}
                    </span>
                    <span style={{ color: '#888' }}>
                      {formatTime(record.timeSpent)}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: '#666',
                    fontSize: '13px',
                    textAlign: 'center',
                    padding: '20px',
                  }}
                >
                  暂无记录，开始你的第一次探险吧！
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            width: '70%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              style={{
                display: 'block',
                background: '#0f0f23',
                outline: 'none',
              }}
            />
            {!dungeon && !isGenerating && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#666',
                  fontSize: '18px',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚔️</div>
                <div>选择威胁等级，点击"开始探险"</div>
                <div style={{ fontSize: '14px', marginTop: '8px', color: '#444' }}>
                  随机生成地牢，探索未知的冒险
                </div>
              </div>
            )}
          </div>

          {gameActive && (
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                gap: '24px',
                fontSize: '14px',
                color: '#aaa',
              }}
            >
              <span>⏱️ 用时: {formatTime(elapsedTime)}</span>
              <span>
                🏛️ 房间: {rendererRef.current?.getExploredRooms().size ?? 1} /{' '}
                {dungeon?.rooms.length ?? 0}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          height: '40px',
          background: '#0f3460',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '32px',
          fontSize: '14px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{
              animation: isCommunicating ? 'spin 2s linear infinite' : 'none',
            }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#00bcd4"
              strokeWidth="2"
              strokeDasharray="60"
              strokeDashoffset={isCommunicating ? '0' : '45'}
              style={{ transition: 'stroke-dashoffset 0.3s' }}
            />
          </svg>
          <span style={{ color: '#00bcd4', fontSize: '12px' }}>
            {isCommunicating ? '通信中...' : '已连接'}
          </span>
        </div>

        <div>
          <span style={{ color: '#888' }}>当前等级: </span>
          <span style={{ fontWeight: 'bold', color: '#ff5722' }}>{threatLevel}</span>
        </div>

        <div>
          <span style={{ color: '#888' }}>已通关: </span>
          <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{totalClears} 次</span>
        </div>

        <div>
          <span style={{ color: '#888' }}>总宝物: </span>
          <span style={{ fontWeight: 'bold', color: '#ffd700' }}>
            💎 {treasureCount}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', color: '#666', fontSize: '12px' }}>
          WASD / 方向键移动 · 探索所有房间完成通关
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff5722;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff5722;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
