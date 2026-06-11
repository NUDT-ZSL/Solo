import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, History, Gauge, BarChart3, ArrowUpDown } from 'lucide-react';
import { useSort } from '../context/SortContext';
import { algorithmNames } from '../utils/sortSimulator';
import type { AlgorithmType, HistoryRecord } from '../types';

const buttonBaseStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0f3460, #533483)',
  border: 'none',
  borderRadius: 8,
  color: '#e0e0e0',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontFamily: "'Roboto Mono', monospace",
  fontSize: 13,
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
  filter: 'grayscale(0.5)',
};

const cardStyle: React.CSSProperties = {
  background: '#16213e',
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
};

const labelStyle: React.CSSProperties = {
  color: '#a0a0a0',
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: "'Roboto Mono', monospace",
};

export const ControlPanel: React.FC = () => {
  const {
    algorithm,
    setAlgorithm,
    arrayLength,
    setArrayLength,
    valueMin,
    setValueMin,
    valueMax,
    setValueMax,
    steps,
    currentStepIndex,
    isPlaying,
    speed,
    setSpeed,
    history,
    generateArray,
    startSort,
    stepForward,
    stepBackward,
    jumpToStep,
    setIsPlaying,
    isComplete,
    currentArray,
    loadHistory,
  } = useSort();

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  const stats = useMemo(() => ({
    compareCount: currentStep?.compareCount || 0,
    swapCount: currentStep?.swapCount || 0,
    sortedCount: currentStep?.sortedCount || 0,
    totalElements: currentArray.length,
  }), [currentStep, currentArray.length]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlgorithmIcon = (alg: string) => {
    switch (alg) {
      case 'bubble':
        return '🫧';
      case 'selection':
        return '🎯';
      case 'insertion':
        return '📥';
      default:
        return '📊';
    }
  };

  const canStepBack = currentStepIndex > 0;
  const canStepForward = currentStepIndex < totalSteps - 1;
  const canPlay = totalSteps > 0 && currentStepIndex < totalSteps - 1;

  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        padding: 16,
        height: '100%',
        overflowY: 'auto',
        background: '#1a1a2e',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4a90e2, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 4,
            letterSpacing: 1,
          }}
        >
          排序剧场
        </h1>
        <p style={{ color: '#888', fontSize: 11, margin: 0, fontFamily: "'Roboto Mono', monospace" }}>
          SORT THEATER VISUALIZER
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 14 }}>
          <ArrowUpDown size={14} />
          算法选择
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
          }}
        >
          {(Object.keys(algorithmNames) as AlgorithmType[]).map((alg) => {
            const isSelected = algorithm === alg;
            return (
              <button
                key={alg}
                onClick={() => {
                  if (!isPlaying) {
                    setAlgorithm(alg);
                    generateArray();
                  }
                }}
                style={{
                  ...buttonBaseStyle,
                  padding: '10px 4px',
                  fontSize: 11,
                  flexDirection: 'column',
                  gap: 4,
                  background: isSelected
                    ? 'linear-gradient(135deg, #4a90e2, #533483)'
                    : 'linear-gradient(135deg, #0f3460, #1a1a2e)',
                  border: isSelected ? '1px solid #4a90e2' : '1px solid transparent',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isPlaying) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.filter = 'brightness(1.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                disabled={isPlaying}
              >
                <span style={{ fontSize: 16 }}>{getAlgorithmIcon(alg)}</span>
                <span>{algorithmNames[alg]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 14 }}>
          <BarChart3 size={14} />
          数据配置
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ color: '#c0c0c0', fontSize: 12 }}>数组长度</span>
            <span
              style={{
                color: '#4a90e2',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              {arrayLength}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={20}
            value={arrayLength}
            onChange={(e) => {
              setArrayLength(parseInt(e.target.value));
              generateArray();
            }}
            disabled={isPlaying}
            style={{ width: '100%', ...customSliderStyle() }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ color: '#c0c0c0', fontSize: 12 }}>最小值</span>
            <span
              style={{
                color: '#4caf50',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              {valueMin}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={99}
            value={valueMin}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val < valueMax) {
                setValueMin(val);
                generateArray();
              }
            }}
            disabled={isPlaying}
            style={{ width: '100%', ...customSliderStyle('#4caf50') }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ color: '#c0c0c0', fontSize: 12 }}>最大值</span>
            <span
              style={{
                color: '#ff8c00',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              {valueMax}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={100}
            value={valueMax}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val > valueMin) {
                setValueMax(val);
                generateArray();
              }
            }}
            disabled={isPlaying}
            style={{ width: '100%', ...customSliderStyle('#ff8c00') }}
          />
        </div>

        <button
          onClick={generateArray}
          disabled={isPlaying}
          style={isPlaying ? disabledButtonStyle : buttonBaseStyle}
          onMouseEnter={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'brightness(1.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          <Shuffle size={14} />
          随机生成数组
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 14 }}>
          <Gauge size={14} />
          播放控制
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ color: '#c0c0c0', fontSize: 12 }}>动画速度</span>
            <span
              style={{
                color: '#a855f7',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              {speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', ...customSliderStyle('#a855f7') }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 6,
            marginBottom: 14,
          }}
        >
          <button
            onClick={stepBackward}
            disabled={!canStepBack || isPlaying}
            style={(!canStepBack || isPlaying) ? { ...disabledButtonStyle, padding: '10px 4px' } : { ...buttonBaseStyle, padding: '10px 4px' }}
            title="上一步"
            onMouseEnter={(e) => {
              if (canStepBack && !isPlaying) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.filter = 'brightness(1.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={() => {
              if (!isPlaying && totalSteps === 0) {
                startSort();
              } else if (isPlaying) {
                setIsPlaying(false);
              } else if (canPlay) {
                setIsPlaying(true);
              } else if (isComplete) {
                jumpToStep(0);
                setTimeout(() => setIsPlaying(true), 50);
              }
            }}
            style={{
              ...buttonBaseStyle,
              padding: '10px 4px',
              background: isPlaying
                ? 'linear-gradient(135deg, #ff6b6b, #c92a2a)'
                : canPlay || totalSteps === 0 || isComplete
                ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                : 'linear-gradient(135deg, #0f3460, #533483)',
            }}
            title={isPlaying ? '暂停' : '播放'}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'brightness(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
          </button>

          <button
            onClick={stepForward}
            disabled={!canStepForward || isPlaying}
            style={(!canStepForward || isPlaying) ? { ...disabledButtonStyle, padding: '10px 4px' } : { ...buttonBaseStyle, padding: '10px 4px' }}
            title="下一步"
            onMouseEnter={(e) => {
              if (canStepForward && !isPlaying) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.filter = 'brightness(1.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <SkipForward size={16} />
          </button>

          <button
            onClick={() => {
              if (totalSteps === 0) {
                startSort();
              } else {
                jumpToStep(0);
                setIsPlaying(false);
              }
            }}
            style={{ ...buttonBaseStyle, padding: '10px 4px' }}
            title="重置"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'brightness(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <Shuffle size={16} />
          </button>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ color: '#c0c0c0', fontSize: 12 }}>执行进度</span>
            <span
              style={{
                color: '#4a90e2',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              {currentStepIndex + (totalSteps > 0 ? 1 : 0)} / {totalSteps}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4a90e2, #a855f7)',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {totalSteps > 0 && (
            <input
              type="range"
              min={0}
              max={totalSteps - 1}
              value={currentStepIndex}
              onChange={(e) => {
                jumpToStep(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              style={{
                width: '100%',
                marginTop: 4,
                height: 4,
                opacity: 0.5,
                ...customSliderStyle(),
              }}
            />
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 14 }}>
          <BarChart3 size={14} />
          统计信息
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <StatCard
            label="当前操作"
            value={currentStep ? getOperationLabel(currentStep.type) : '等待开始'}
            color={getOperationColor(currentStep?.type)}
          />
          <StatCard
            label="比较次数"
            value={String(stats.compareCount)}
            color="#ffd700"
          />
          <StatCard
            label="交换次数"
            value={String(stats.swapCount)}
            color="#ff8c00"
          />
          <StatCard
            label="已排序"
            value={`${stats.sortedCount}/${stats.totalElements}`}
            color="#4caf50"
          />
        </div>

        {isComplete && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                color: '#4caf50',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              🎉 排序完成！
            </div>
            <div style={{ color: '#a0a0a0', fontSize: 11, lineHeight: 1.6 }}>
              总比较：<span style={{ color: '#ffd700' }}>{stats.compareCount}</span> 次 |
              总交换：<span style={{ color: '#ff8c00' }}>{stats.swapCount}</span> 次
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 14 }}>
          <History size={14} />
          历史记录
          <span style={{ marginLeft: 'auto', color: '#666', fontSize: 10 }}>
            ({history.length})
          </span>
        </div>

        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            marginRight: -4,
            paddingRight: 4,
          }}
        >
          {history.length === 0 ? (
            <div
              style={{
                color: '#666',
                fontSize: 12,
                textAlign: 'center',
                padding: 20,
                fontStyle: 'italic',
              }}
            >
              暂无排序记录
            </div>
          ) : (
            history.map((record: HistoryRecord) => (
              <div
                key={record.id}
                onClick={() => loadHistory(record)}
                style={{
                  padding: 10,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(74, 144, 226, 0.3)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      color: '#e0e0e0',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Roboto Mono', monospace",
                    }}
                  >
                    {getAlgorithmIconByAlg(record.algorithm)} {record.algorithm}
                  </span>
                  <span style={{ color: '#666', fontSize: 10 }}>
                    {formatDate(record.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    color: '#888',
                    fontSize: 10,
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  {record.initialArray.length} 个元素 · {record.totalSteps} 步骤
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): React.ReactElement {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: 10,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          color: '#888',
          fontSize: 10,
          marginBottom: 4,
          fontFamily: "'Roboto Mono', monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'Roboto Mono', monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getOperationLabel(type: string): string {
  switch (type) {
    case 'compare':
      return '比较中';
    case 'swap':
      return '交换中';
    case 'sorted':
      return '已标记';
    default:
      return '-';
  }
}

function getOperationColor(type?: string): string {
  switch (type) {
    case 'compare':
      return '#ffd700';
    case 'swap':
      return '#ff8c00';
    case 'sorted':
      return '#4caf50';
    default:
      return '#888';
  }
}

function getAlgorithmIconByAlg(alg: string): string {
  if (alg.includes('冒泡')) return '🫧';
  if (alg.includes('选择')) return '🎯';
  if (alg.includes('插入')) return '📥';
  return '📊';
}

function customSliderStyle(accentColor: string = '#4a90e2'): React.CSSProperties {
  return {
    appearance: 'none' as const,
    WebkitAppearance: 'none',
    height: 6,
    background: `linear-gradient(to right, ${accentColor}, ${accentColor})`,
    backgroundSize: '0% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  };
}
