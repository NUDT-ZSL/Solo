import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FilterToolbar from './components/FilterToolbar';
import Timeline from './components/Timeline';
import DetailPanel from './components/DetailPanel';
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

const App: React.FC = () => {
  const [startYear, setStartYear] = useState(MIN_YEAR);
  const [endYear, setEndYear] = useState(MAX_YEAR);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      await seedSampleData();
      const all = await getAllEntries();
      setAllEntries(all);
      const filtered = await getEntriesByYearRange(MIN_YEAR, MAX_YEAR);
      setEntries(filtered);
      setIsLoading(false);
      if (filtered.length > 0) {
        setSelectedId(filtered[0].id!);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadFiltered = async () => {
      const filtered = await getEntriesByYearRange(startYear, endYear);
      setEntries(filtered);
      if (filtered.length > 0 && !filtered.find(e => e.id === selectedId)) {
        setSelectedId(filtered[0].id!);
      }
      if (filtered.length === 0) {
        setSelectedId(null);
      }
    };
    loadFiltered();
  }, [startYear, endYear, allEntries.length]);

  const selectedEntry = useMemo(() => {
    if (selectedId === null) return null;
    return entries.find(e => e.id === selectedId) || null;
  }, [entries, selectedId]);

  const handleYearChange = useCallback((start: number, end: number) => {
    setStartYear(start);
    setEndYear(end);
  }, []);

  const handleReset = useCallback(() => {
    setStartYear(MIN_YEAR);
    setEndYear(MAX_YEAR);
  }, []);

  const handleSelect = useCallback((entry: TimelineEntry) => {
    setSelectedId(entry.id!);
  }, []);

  const handleUpdate = useCallback(async (id: number, updates: Partial<TimelineEntry>) => {
    await dbUpdateEntry(id, updates);
    const all = await getAllEntries();
    setAllEntries(all);
    const filtered = await getEntriesByYearRange(startYear, endYear);
    setEntries(filtered);
  }, [startYear, endYear]);

  const handleDelete = useCallback(async (id: number) => {
    await dbDeleteEntry(id);
    const all = await getAllEntries();
    setAllEntries(all);
    const filtered = await getEntriesByYearRange(startYear, endYear);
    setEntries(filtered);
    setSelectedId(null);
  }, [startYear, endYear]);

  const handleExport = useCallback(async () => {
    if (entries.length === 0 || exportProgress !== null) return;

    setExportProgress(0);

    const onProgress = (progress: ExportProgress) => {
      setExportProgress(progress.percentage);
    };

    try {
      await exportToPDF({
        entries,
        startYear,
        endYear,
        onProgress
      });

      setTimeout(() => {
        setExportProgress(null);
      }, 1000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportProgress(null);
      alert('导出失败，请重试');
    }
  }, [entries, startYear, endYear, exportProgress]);

  const handleCloseMobileDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const leftWidth = isMobile ? '100%' : '60%';
  const rightWidth = isMobile ? '100%' : '40%';
  const layoutDirection = isMobile ? 'column' : 'row';

  return (
    <div style={styles.app}>
      <FilterToolbar
        startYear={startYear}
        endYear={endYear}
        onYearChange={handleYearChange}
        onReset={handleReset}
        onExport={handleExport}
        resultCount={entries.length}
        exportProgress={exportProgress}
      />

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
              <Timeline
                entries={entries}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>

            <div style={{
              ...styles.rightPane,
              width: rightWidth
            }}>
              <DetailPanel
                entry={selectedEntry}
                isMobile={isMobile}
                onClose={handleCloseMobileDetail}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
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

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  }
};

export default App;
