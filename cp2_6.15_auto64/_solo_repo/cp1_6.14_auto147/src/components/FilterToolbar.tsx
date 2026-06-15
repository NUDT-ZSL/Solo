import React, { useState, useEffect, useCallback } from 'react';

export interface FilterToolbarProps {
  startYear: number;
  endYear: number;
  minYear?: number;
  maxYear?: number;
  onYearChange: (start: number, end: number) => void;
  onReset: () => void;
  onExport: () => void;
  resultCount: number;
  exportProgress: number | null;
  onNotify?: (message: string, type?: 'info' | 'warning' | 'success' | 'error') => void;
}

interface ToastState {
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  visible: boolean;
}

const DEFAULT_MIN_YEAR = 2020;
const DEFAULT_MAX_YEAR = 2025;

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  startYear,
  endYear,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
  onYearChange,
  onReset,
  onExport,
  resultCount,
  exportProgress,
  onNotify
}) => {
  const [startSelect, setStartSelect] = useState<number>(startYear);
  const [endSelect, setEndSelect] = useState<number>(endYear);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });
  const toastTimerRef = React.useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
      if (onNotify) {
        onNotify(message, type);
        return;
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ message, type, visible: true });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        toastTimerRef.current = null;
      }, 2600);
    },
    [onNotify]
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const validStart = Math.min(Math.max(startYear, minYear), maxYear);
    const validEnd = Math.min(Math.max(endYear, minYear), maxYear);
    if (validStart <= validEnd) {
      if (validStart !== startYear || validEnd !== endYear) {
        showToast(`年份已自动调整到有效范围 ${minYear}-${maxYear}`, 'warning');
      }
      setStartSelect(validStart);
      setEndSelect(validEnd);
    } else {
      setStartSelect(validEnd);
      setEndSelect(validStart);
      showToast(`起始年大于结束年，已自动交换为 ${validEnd}-${validStart}`, 'warning');
      onYearChange(validEnd, validStart);
    }
  }, [startYear, endYear, minYear, maxYear, showToast, onYearChange]);

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStart = parseInt(e.target.value, 10);
    if (isNaN(newStart)) return;

    let finalStart = Math.max(minYear, Math.min(newStart, maxYear));
    let finalEnd = endSelect;

    if (finalStart > finalEnd) {
      const oldEnd = finalEnd;
      finalEnd = finalStart;
      setEndSelect(finalEnd);
      showToast(`起始年大于结束年(${finalStart}>${oldEnd})，结束年已调整为${finalEnd}`, 'warning');
    }

    setStartSelect(finalStart);
    onYearChange(finalStart, finalEnd);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEnd = parseInt(e.target.value, 10);
    if (isNaN(newEnd)) return;

    let finalEnd = Math.max(minYear, Math.min(newEnd, maxYear));
    let finalStart = startSelect;

    if (finalEnd < finalStart) {
      const oldStart = finalStart;
      finalStart = finalEnd;
      setStartSelect(finalStart);
      showToast(`结束年小于起始年(${finalEnd}<${oldStart})，起始年已调整为${finalStart}`, 'warning');
    }

    setEndSelect(finalEnd);
    onYearChange(finalStart, finalEnd);
  };

  const handleReset = () => {
    setStartSelect(minYear);
    setEndSelect(maxYear);
    showToast(`年份范围已重置为 ${minYear}-${maxYear}`, 'info');
    onReset();
  };

  return (
    <>
      <div style={styles.toolbar}>
        <div style={styles.leftSection}>
          <div style={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style={styles.titleText}>TimelineWeaver</span>
          </div>

          <div style={styles.filterGroup}>
            <select
              value={startSelect}
              onChange={handleStartChange}
              style={styles.select}
            >
              {years.filter(y => y <= endSelect).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>

            <span style={styles.rangeSeparator}>—</span>

            <select
              value={endSelect}
              onChange={handleEndChange}
              style={styles.select}
            >
              {years.filter(y => y >= startSelect).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>

            <button onClick={handleReset} style={styles.resetBtn} title="重置筛选">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>

          <span style={styles.resultText}>
            显示 {resultCount} 条记录（{startSelect}-{endSelect}）
          </span>
        </div>

        <div style={styles.rightSection}>
          {exportProgress !== null && (
            <div style={styles.progressContainer}>
              <span style={styles.progressText}>{exportProgress}%</span>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${exportProgress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={onExport}
            disabled={exportProgress !== null}
            style={{
              ...styles.exportBtn,
              opacity: exportProgress !== null ? 0.7 : 1,
              cursor: exportProgress !== null ? 'not-allowed' : 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出PDF
          </button>
        </div>
      </div>

      {!onNotify && toast.visible && (
        <div style={{
          ...styles.toast,
          ...toastTypeStyles(toast.type),
          opacity: toast.visible ? 1 : 0,
          transform: toast.visible ? 'translateY(0)' : 'translateY(-8px)'
        }}>
          <span style={styles.toastIcon}>
            {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span style={styles.toastText}>{toast.message}</span>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    paddingLeft: 32,
    paddingRight: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 24
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: -0.3
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  select: {
    width: 120,
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: 'white',
    fontSize: 14,
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  rangeSeparator: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: '#f1f5f9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  resultText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 500
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 500,
    minWidth: 36
  },
  progressBar: {
    width: 300,
    height: 6,
    borderRadius: 3,
    background: '#e5e7eb',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: 3,
    transition: 'width 0.2s ease-in-out'
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 20px',
    borderRadius: 8,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)'
  } as React.CSSProperties,
  toast: {
    position: 'fixed',
    top: 72,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 18px',
    borderRadius: 10,
    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    zIndex: 2000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    pointerEvents: 'none',
    transition: 'all 0.25s ease-out'
  } as React.CSSProperties,
  toastIcon: {
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0
  },
  toastText: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    maxWidth: 520
  }
};

function toastTypeStyles(type: 'info' | 'warning' | 'success' | 'error'): React.CSSProperties {
  switch (type) {
    case 'warning':
      return {
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fde68a'
      };
    case 'error':
      return {
        background: '#fef2f2',
        color: '#991b1b',
        border: '1px solid #fecaca'
      };
    case 'success':
      return {
        background: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0'
      };
    case 'info':
    default:
      return {
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #bfdbfe'
      };
  }
}

export default FilterToolbar;
