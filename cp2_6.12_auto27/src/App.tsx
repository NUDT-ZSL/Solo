import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';
import FileUploader from './components/FileUploader';
import ChartPanel from './components/ChartPanel';
import type { DataRow, ChartConfig, ChartType, SortConfig, StoredState } from './types';

const STORAGE_KEY = 'data_dashboard_state';
const MAX_CHARTS = 4;
const PAGE_SIZE = 10;

const App: React.FC = () => {
  const [columns, setColumns] = useState<string[]>([]);
  const [data, setData] = useState<DataRow[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreAnimation, setShowRestoreAnimation] = useState(false);

  const [xField, setXField] = useState<string>('');
  const [yField, setYField] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('line');

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageTransition, setPageTransition] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);
  const isActualDragRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        if (parsed.columns && parsed.data && parsed.data.length > 0) {
          setShowRestoreAnimation(true);
          setIsRestoring(true);
          setColumns(parsed.columns);
          setData(parsed.data);
          setCharts(parsed.charts || []);
          if (parsed.columns.length > 0) {
            setXField(parsed.columns[0]);
            if (parsed.columns.length > 1) {
              setYField(parsed.columns[1]);
            }
          }
          setTimeout(() => {
            setIsRestoring(false);
          }, 800);
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }, []);

  useEffect(() => {
    if (columns.length > 0 && data.length > 0 && !isRestoring) {
      try {
        const state: StoredState = { columns, data, charts };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    }
  }, [columns, data, charts, isRestoring]);

  const handleDataLoaded = useCallback((cols: string[], loadedData: DataRow[]) => {
    setColumns(cols);
    setData(loadedData);
    setCharts([]);
    setCurrentPage(0);
    setSortConfig(null);
    if (cols.length > 0) {
      setXField(cols[0]);
      if (cols.length > 1) {
        setYField(cols[1]);
      }
    }
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(0);
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return _.orderBy(data, [sortConfig.key], [sortConfig.direction]);
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    if (page < 0 || page >= totalPages || page === currentPage) return;
    setPageTransition(true);
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setPageTransition(false), 200);
    }, 200);
  }, [totalPages, currentPage]);

  const handleAddChart = useCallback(() => {
    if (!xField || !yField) return;
    if (charts.length >= MAX_CHARTS) return;

    const newChart: ChartConfig = {
      id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      xField,
      yField,
      chartType
    };
    setCharts((prev) => [...prev, newChart]);
    setNewlyAddedId(newChart.id);
    setTimeout(() => setNewlyAddedId(null), 600);
  }, [xField, yField, chartType, charts.length]);

  const handleCloseChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleChartDragStart = useCallback((id: string, e: React.MouseEvent) => {
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    isActualDragRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartMouseRef.current) return;
      const dx = Math.abs(moveEvent.clientX - dragStartMouseRef.current.x);
      const dy = Math.abs(moveEvent.clientY - dragStartMouseRef.current.y);
      if (dx > 5 || dy > 5) {
        isActualDragRef.current = true;
        setDraggingId(id);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => {
        setDraggingId(null);
        setDragOverPosition(null);
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    if (draggingId) {
      setDragOverPosition(index);
    }
  }, [draggingId]);

  const handleDrop = useCallback((targetIndex: number) => {
    if (!draggingId || !isActualDragRef.current) {
      setDraggingId(null);
      setDragOverPosition(null);
      return;
    }

    const sourceIndex = charts.findIndex((c) => c.id === draggingId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggingId(null);
      setDragOverPosition(null);
      return;
    }

    setCharts((prev) => {
      const result = [...prev];
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(targetIndex, 0, removed);
      return result;
    });
    setDraggingId(null);
    setDragOverPosition(null);
  }, [draggingId, charts]);

  const numericColumns = useMemo(() => {
    if (data.length === 0) return columns;
    return columns.filter((col) => {
      const values = data.slice(0, Math.min(100, data.length)).map((row) => row[col]);
      return values.every((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v !== ''));
    });
  }, [columns, data]);

  return (
    <div className={`app-container ${showRestoreAnimation ? 'fade-in' : ''}`}>
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📈</span>
          数据分析看板
        </h1>
        <p className="app-subtitle">上传CSV文件，快速生成交互式数据可视化</p>
      </header>

      <main className="app-main">
        <section className="card">
          <h2 className="section-title">📁 数据上传</h2>
          <FileUploader onDataLoaded={handleDataLoaded} />
        </section>

        {data.length > 0 && (
          <>
            <section className="card data-preview-section">
              <div className="section-header">
                <h2 className="section-title">📋 数据预览</h2>
                <span className="data-count">共 {sortedData.length} 行，{columns.length} 列</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="row-index">#</th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="sortable"
                          onClick={() => handleSort(col)}
                        >
                          <span className="col-name">{col}</span>
                          <span className="sort-arrow">
                            {sortConfig?.key === col
                              ? sortConfig.direction === 'asc'
                                ? ' ▲'
                                : ' ▼'
                              : ' ⇅'}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={pageTransition ? 'table-fade' : ''}>
                    {paginatedData.map((row, idx) => (
                      <tr key={currentPage * PAGE_SIZE + idx} className="table-row">
                        <td className="row-index">{currentPage * PAGE_SIZE + idx + 1}</td>
                        {columns.map((col) => (
                          <td key={col}>
                            {typeof row[col] === 'number'
                              ? Number(row[col]).toLocaleString()
                              : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(0)}
                    disabled={currentPage === 0}
                  >
                    «
                  </button>
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                  >
                    ‹
                  </button>
                  <span className="page-info">
                    第 {currentPage + 1} / {totalPages} 页
                  </span>
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                  >
                    ›
                  </button>
                  <button
                    className="page-btn"
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage === totalPages - 1}
                  >
                    »
                  </button>
                </div>
              )}
            </section>

            <section className="card">
              <div className="section-header">
                <h2 className="section-title">⚙️ 图表配置</h2>
                <span className="charts-count">
                  已创建 {charts.length}/{MAX_CHARTS} 个图表
                </span>
              </div>

              <div className="chart-config-form">
                <div className="form-group">
                  <label className="form-label">X轴字段</label>
                  <select
                    className="form-select"
                    value={xField}
                    onChange={(e) => setXField(e.target.value)}
                  >
                    <option value="">请选择字段</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Y轴字段（数值）</label>
                  <select
                    className="form-select"
                    value={yField}
                    onChange={(e) => setYField(e.target.value)}
                  >
                    <option value="">请选择字段</option>
                    {numericColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">图表类型</label>
                  <div className="chart-type-buttons">
                    {(['line', 'bar', 'scatter'] as ChartType[]).map((type) => (
                      <button
                        key={type}
                        className={`type-btn ${chartType === type ? 'active' : ''}`}
                        onClick={() => setChartType(type)}
                      >
                        {type === 'line' ? '📈 折线图' : type === 'bar' ? '📊 柱状图' : '⚬ 散点图'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group form-group-action">
                  <button
                    className="generate-btn"
                    onClick={handleAddChart}
                    disabled={!xField || !yField || charts.length >= MAX_CHARTS}
                  >
                    {charts.length >= MAX_CHARTS ? '已达图表上限' : '✨ 生成图表'}
                  </button>
                </div>
              </div>
            </section>

            {charts.length > 0 && (
              <section className="card">
                <h2 className="section-title">📊 图表展示</h2>
                <p className="section-hint">提示：拖拽图表可调整顺序，框选图表区域可放大</p>
                <div
                  className={`charts-grid ${charts.length === 1 ? 'single' : charts.length === 2 ? 'two' : 'multi'}`}
                >
                  {charts.map((chart, index) => (
                    <ChartPanel
                      key={chart.id}
                      config={chart}
                      data={data}
                      onClose={handleCloseChart}
                      onDragStart={handleChartDragStart}
                      isDragging={draggingId === chart.id}
                      dragOverPosition={dragOverPosition}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      index={index}
                      totalCharts={charts.length}
                      justAdded={newlyAddedId === chart.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>数据保存在浏览器本地，刷新页面后自动恢复</p>
      </footer>
    </div>
  );
};

export default App;
