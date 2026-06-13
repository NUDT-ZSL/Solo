import React, { useState, useReducer, useRef, useCallback, useEffect } from 'react';
import Wheel, { WheelHandle } from './Wheel';
import ParticleEffect, { ParticleEffectHandle } from './ParticleEffect';
import {
  Participant,
  Prize,
  WinRecord,
  DEFAULT_PRIZES,
  generateMockParticipants,
  generateColorFromName,
  formatTime,
  playWinSound,
  selectRandomParticipant,
  filterEligibleParticipants,
  measurePerformance
} from './utils';

type Action =
  | { type: 'UPDATE_PRIZE'; payload: { id: string; field: 'count' | 'color'; value: string | number } }
  | { type: 'MARK_WON'; payload: { participantId: string; prize: string; time: string } }
  | { type: 'ADD_RECORD'; payload: WinRecord }
  | { type: 'SET_DEPARTMENT_FILTER'; payload: string };

interface AppState {
  participants: Participant[];
  prizes: Prize[];
  records: WinRecord[];
  departmentFilter: string;
}

const initialState: AppState = {
  participants: generateMockParticipants(50),
  prizes: [...DEFAULT_PRIZES],
  records: [],
  departmentFilter: 'all'
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_PRIZE': {
      const { id, field, value } = action.payload;
      return {
        ...state,
        prizes: state.prizes.map(p =>
          p.id === id ? { ...p, [field]: value } : p
        )
      };
    }
    case 'MARK_WON': {
      const { participantId, prize, time } = action.payload;
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === participantId
            ? {
                ...p,
                hasWon: true,
                winHistory: [...p.winHistory, { prize, time }]
              }
            : p
        )
      };
    }
    case 'ADD_RECORD': {
      return {
        ...state,
        records: [action.payload, ...state.records]
      };
    }
    case 'SET_DEPARTMENT_FILTER': {
      return {
        ...state,
        departmentFilter: action.payload
      };
    }
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [winnerChars, setWinnerChars] = useState<string[]>([]);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [winColors, setWinColors] = useState<string[]>([]);

  const wheelRef = useRef<WheelHandle>(null);
  const particleRef = useRef<ParticleEffectHandle>(null);

  const departments = ['all', '研发', '市场', '运营', '设计', '行政'];

  const handleSpinComplete = useCallback((prizeIndex: number) => {
    const prize = state.prizes[prizeIndex];
    if (!prize) return;

    const totalStart = performance.now();

    const winner = measurePerformance('抽奖逻辑', () => {
      const eligible = filterEligibleParticipants(
        state.participants,
        state.departmentFilter !== 'all' ? state.departmentFilter : undefined
      );
      return selectRandomParticipant(eligible);
    });

    if (!winner) {
      setIsSpinning(false);
      console.warn('[Lottery] 没有可抽取的参与者');
      return;
    }

    const now = new Date();
    const timeStr = formatTime(now);

    dispatch({
      type: 'MARK_WON',
      payload: {
        participantId: winner.id,
        prize: prize.name,
        time: timeStr
      }
    });

    dispatch({
      type: 'ADD_RECORD',
      payload: {
        id: `rec-${Date.now()}`,
        participantName: winner.name,
        prizeName: prize.name,
        prizeColor: prize.color,
        prizeEmoji: prize.emoji,
        time: timeStr
      }
    });

    playWinSound();

    setWinColors([prize.color]);
    particleRef.current?.trigger();

    const chars = winner.name.split('');
    setWinnerName(winner.name);
    setWinnerChars([]);

    chars.forEach((char, index) => {
      setTimeout(() => {
        setWinnerChars(prev => [...prev, char]);
      }, index * 80);
    });

    const totalDuration = performance.now() - totalStart;
    console.debug(`[Perf] 抽奖总流程耗时: ${totalDuration.toFixed(2)}ms (目标: <50ms)`);

    if (totalDuration > 50) {
      console.warn(`[Perf] 警告: 抽奖流程超过50ms! 实际: ${totalDuration.toFixed(2)}ms`);
    }

    setTimeout(() => {
      setIsSpinning(false);
    }, 2500);

  }, [state.participants, state.prizes, state.departmentFilter]);

  const handleStartClick = useCallback(() => {
    if (isSpinning) return;

    const eligible = filterEligibleParticipants(
      state.participants,
      state.departmentFilter !== 'all' ? state.departmentFilter : undefined
    );

    if (eligible.length === 0) {
      alert('没有可抽取的参与者！');
      return;
    }

    setIsSpinning(true);
    setWinnerName(null);
    setWinnerChars([]);
    wheelRef.current?.startSpin();
  }, [isSpinning, state.participants, state.departmentFilter]);

  const handlePrizeChange = useCallback((id: string, field: 'count' | 'color', value: string | number) => {
    dispatch({ type: 'UPDATE_PRIZE', payload: { id, field, value } });
  }, []);

  const handleDepartmentFilter = useCallback((dept: string) => {
    dispatch({ type: 'SET_DEPARTMENT_FILTER', payload: dept });
  }, []);

  const toggleParticipantExpand = useCallback((id: string) => {
    setExpandedParticipant(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    console.info('%c[LotteryBoard] 性能说明:', 'color: #e94560; font-weight: bold; font-size: 14px;');
    console.info(`- 参与者过滤: O(n) 线性扫描，n为参与者总数`);
    console.info(`- 随机选择: O(1) 常数时间，Math.random()生成索引`);
    console.info(`- 抽奖总流程: O(n)，主要耗时在过滤步骤`);
    console.info(`- 优化建议: 可提前缓存未中奖参与者列表，将过滤优化到O(1)`);
  }, []);

  const displayedParticipants = state.departmentFilter === 'all'
    ? state.participants
    : state.participants.filter(p => p.department === state.departmentFilter);

  return (
    <div className="app-container">
      <aside className="control-panel">
        <div className="panel-section">
          <h3 className="panel-title">奖项设置</h3>
          {state.prizes.map(prize => (
            <div key={prize.id} className="prize-item">
              <input
                type="color"
                className="color-input"
                value={prize.color}
                onChange={(e) => handlePrizeChange(prize.id, 'color', e.target.value)}
              />
              <div className="prize-info">
                <span className="prize-name">{prize.emoji} {prize.name}</span>
              </div>
              <input
                type="number"
                className="count-input"
                min="1"
                max="100"
                value={prize.count}
                onChange={(e) => handlePrizeChange(prize.id, 'count', parseInt(e.target.value) || 1)}
              />
            </div>
          ))}
        </div>

        <div className="panel-section">
          <h3 className="panel-title">参与者</h3>
          <div className="department-filter">
            {departments.map(dept => (
              <button
                key={dept}
                className={`dept-btn ${state.departmentFilter === dept ? 'active' : ''}`}
                onClick={() => handleDepartmentFilter(dept)}
              >
                {dept === 'all' ? '全部' : dept}
              </button>
            ))}
          </div>

          <div className="participant-list">
            {displayedParticipants.map(participant => (
              <div key={participant.id}>
                <div
                  className={`participant-item ${participant.hasWon ? 'won' : ''}`}
                  onClick={() => !participant.hasWon && toggleParticipantExpand(participant.id)}
                >
                  <div
                    className="participant-avatar"
                    style={{ backgroundColor: generateColorFromName(participant.name) }}
                  >
                    {participant.name.slice(-2)}
                  </div>
                  <div className="participant-info">
                    <div className="participant-name">{participant.name}</div>
                    <div className="participant-dept">{participant.department}</div>
                  </div>
                  {participant.hasWon && <span style={{ color: '#e94560', fontSize: '12px' }}>已中奖</span>}
                </div>
                {expandedParticipant === participant.id && participant.winHistory.length > 0 && (
                  <div className="win-history">
                    {participant.winHistory.map((record, idx) => (
                      <div key={idx} className="win-history-item">
                        <strong>{record.prize}</strong> {record.time}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="main-area">
        <div className="main-header">
          <h1 className="main-title">LotteryBoard</h1>
          <p className="main-subtitle">年會抽獎系統</p>
        </div>

        <div className="wheel-container">
          <Wheel
            ref={wheelRef}
            prizes={state.prizes}
            onSpinComplete={handleSpinComplete}
            disabled={isSpinning}
          />
        </div>

        <button
          className="start-btn"
          onClick={handleStartClick}
          disabled={isSpinning}
        >
          {isSpinning ? '抽奖中...' : '开始抽奖'}
        </button>

        {winnerName && (
          <div className="winner-display">
            {winnerChars.map((char, index) => (
              <span
                key={index}
                className="winner-char"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {char}
              </span>
            ))}
          </div>
        )}
      </main>

      <aside className="record-panel">
        <h3 className="panel-title">中奖记录</h3>
        <div className="record-list">
          {state.records.length === 0 ? (
            <div className="empty-state">暂无中奖记录<br />点击开始抽奖</div>
          ) : (
            state.records.map(record => (
              <div key={record.id} className="record-item">
                <span className="record-emoji">{record.prizeEmoji}</span>
                <div className="record-info">
                  <div className="record-name">{record.participantName}</div>
                  <div className="record-prize" style={{ color: record.prizeColor }}>{record.prizeName}</div>
                </div>
                <span className="record-time">{record.time}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      <ParticleEffect
        ref={particleRef}
        colors={winColors.length > 0 ? winColors : ['#ff6b6b', '#feca57', '#48dbfb', '#0abde3', '#a29bfe']}
      />
    </div>
  );
};

export default App;
