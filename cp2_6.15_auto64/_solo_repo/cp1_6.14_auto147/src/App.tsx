import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FilterToolbar, { FilterToolbarProps } from './components/FilterToolbar';
import Timeline, { TimelineProps } from './components/Timeline';
import DetailPanel, { DetailPanelProps } from './components/DetailPanel';
import {
  getEntriesByYearRange,
  getAllEntries,
  updateEntry as dbUpdateEntry,
  deleteEntry as dbDeleteEntry,
  seedSampleData,
  TimelineEntry
} from './data-service';
import { exportToPDF, ExportProgress } from './export-engine';

const MIN_YEAR = 2020;
const MAX_YEAR = 2025;
const MOBILE_BREAKPOINT = 900;

type ToastType = 'info' | 'warning' | 'success' | 'error';
interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

type FilterToolbarPropKeys = Omit<FilterToolbarProps, 'onNotify'>;

const App: React.FC = () => {
  const [startYear, setStartYear] = useState<number>(MIN_YEAR);
  const [endYear, setEndYear] = useState<number>(MAX_YEAR);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToast({ message, type, visible: true });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        toastTimerRef.current = null;
      }, 2600);
    },
    []
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
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await seedSampleData();
        const all = await getAllEntries();
        setAllEntries(all);
        const filtered = await getEntriesByYearRange(MIN_YEAR, MAX_YEAR);
        setEntries(filtered);
        setIsLoading(false);
        if (filtered.length > 0) {
          setSelectedId(filtered[0].id!);
        }
      } catch (err) {
        console.error('Init failed:', err);
        setIsLoading(false);
        showToast('数据加载失败，请刷新页面重试', 'error');
      }
    };
    init();
  }, [showToast]);

  useEffect(() => {
    const loadFiltered = async () => {
      const actualStart = Math.min(startYear, endYear);
      const actualEnd = Math.max(startYear, endYear);
      const filtered = await getEntriesByYearRange(actualStart, actualEnd);
      setEntries(filtered);
      if (filtered.length > 0 && !filtered.find(e => e.id === selectedId)) {
        setSelectedId(filtered[0].id!);
      }
      if (filtered.length === 0) {
        setSelectedId(null);
      }
    };
    loadFiltered();
  }, [startYear, endYear, allEntries.length, selectedId]);

  const selectedEntry = useMemo<TimelineEntry | null>(() => {
    if (selectedId === null) return null;
    return entries.find(e => e.id === selectedId) || null;
  }, [entries, selectedId]);

  const handleYearChange: FilterToolbarProps['onYearChange'] = useCallback((start: number, end: number) => {
    setStartYear(start);
    setEndYear(end);
  }, []);

  const handleReset: FilterToolbarProps['onReset'] = useCallback(() => {
    setStartYear(MIN_YEAR);
    setEndYear(MAX_YEAR);
  }, []);

  const handleNotify: NonNullable<FilterToolbarProps['onNotify']> = useCallback(
    (message, type = 'info') => {
      showToast(message, type);
    },
    [showToast]
  );

  const handleSelect: TimelineProps['onSelect'] = useCallback((entry: TimelineEntry) => {
    setSelectedId(entry.id!);
  }, []);

  const handleUpdate: DetailPanelProps['onUpdate'] = useCallback(
    async (id: number, updates: Partial<TimelineEntry>) => {
      try {
        await dbUpdateEntry(id, updates);
        const all = await getAllEntries();
        setAllEntries(all);
        const filtered = await getEntriesByYearRange(startYear, endYear);
        setEntries(filtered);
        showToast('记录已保存', 'success');
      } catch (err) {
        console.error('Update failed:', err);
        showToast('保存失败，请重试', 'error');
      }
    },
    [startYear, endYear, showToast]
  );

  const handleDelete: DetailPanelProps['onDelete'] = useCallback(
    async (id: number) => {
      try {
        await dbDeleteEntry(id);
        const all = await getAllEntries();
        setAllEntries(all);
        const filtered = await getEntriesByYearRange(startYear, endYear);
        setEntries(filtered);
        setSelectedId(null);
        showToast('记录已删除', 'success');
      } catch (err) {
        console.error('Delete failed:', err);
        showToast('删除失败，请重试', 'error');
      }
    },
    [startYear, endYear, showToast]
  );

  const handleExport: FilterToolbarProps['onExport'] = useCallback(async () => {
    if (entries.length === 0 || exportProgress !== null) return;

    setExportProgress(0);

    const onProgress = (progress: ExportProgress) => {
      setExportProgress(progress.percentage);
    };

    try {
      await exportToPDF({
        entries,
        startYear: Math.min(startYear, endYear),
        endYear: Math.max(startYear, endYear),
        onProgress
      });

      showToast(`PDF年报导出成功（共 ${entries.length} 条）`, 'success');

      setTimeout(() => {
        setExportProgress(null);
      }, 1200);
    } catch (err) {
      console.error('Export failed:', err);
      setExportProgress(null);
      const msg = err instanceof Error ? err.message : '未知错误';
      showToast(`导出失败：${msg}`, 'error');
    }
  }, [entries, startYear, endYear, exportProgress, showToast]);

  const handleCloseMobileDetail: NonNullable<DetailPanelProps['onClose']> = useCallback(() => {
    setSelectedId(null);
  }, []);

  const leftWidth = isMobile ? '100%' : '60%';
  const rightWidth = isMobile ? '100%' : '40%';
  const layoutDirection: React.CSSProperties['flexDirection'] = isMobile ? 'column' : 'row';

  const filterProps: FilterToolbarPropKeys = {
    startYear,
    endYear,
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR,
    onYearChange: handleYearChange,
    onReset: handleReset,
    onExport: handleExport,
    resultCount: entries.length,
    exportProgress
  };

  const timelineProps: TimelineProps = {
    entries,
    selectedId,
    onSelect: handleSelect
  };

  const detailProps: DetailPanelProps = {
    entry: selectedEntry,
    isMobile,
    onClose: handleCloseMobileDetail,
    onUpdate: handleUpdate,
    onDelete: handleDelete
  };

  return (
    <div style={styles.app}>
      <FilterToolbar {...filterProps} onNotify={handleNotify} />

      <div style={{
        ...styles.main,
        flexDirection: layoutDirection
      }}>
        {isLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>加载时间轴...</div>
          </div>
        ) : (
          <>
            <div style={{
              ...styles.leftPane,
              width: leftWidth
            }}>
              <Timeline {...timelineProps} />
            </div>

            <div style={{
              ...styles.rightPane,
              width: rightWidth
            }}>
              <DetailPanel {...detailProps} />
            </div>
          </>
        )}
      </div>

      {toast.visible && (
        <div style={{
          ...styles.toast,
          ...toastStylesMap[toast.type],
          opacity: toast.visible ? 1 : 0,
          transform: `translate(-50%, ${toast.visible ? 0 : -8}px)`
        }}>
          <span style={styles.toastIcon}>
            {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span style={styles.toastText}>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * {
          box-sizing: border-box;
        }
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        button:hover {
          filter: brightness(0.97);
        }
        button:active {
          transform: scale(0.98);
        }
        select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        input:focus, textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

const toastStylesMap: Record<ToastType, React.CSSProperties> = {
  info: {
    background: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe'
  },
  warning: {
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  success: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },
  error: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  }
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    color: '#0f172a',
    overflow: 'hidden'
  } as React.CSSProperties,
  main: {
    display: 'flex',
    height: '100vh',
    paddingTop: 56,
    boxSizing: 'border-box'
  },
  leftPane: {
    height: '100%',
    overflow: 'hidden',
    display: 'flex'
  },
  rightPane: {
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #e2e8f0'
  } as React.CSSProperties,
  loadingContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 500
  },
  toast: {
    position: 'fixed',
    top: 78,
    left: '50%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
    zIndex: 3000,
    pointerEvents: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    transition: 'all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
  } as React.CSSProperties,
  toastIcon: {
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0
  },
  toastText: {
    fontSize: 13.5,
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    maxWidth: 560
  }
};

export default App;
