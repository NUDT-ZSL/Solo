import { useState, useCallback, useRef, useEffect } from 'react';
import type { SankeyData, SelectionState, FilterState } from './types';
import { validateSankeyData, parseJsonFile } from './utils/validation';
import SankeyChart from './components/SankeyChart';
import SidePanel from './components/SidePanel';

const MOBILE_BREAKPOINT = 768;

export default function App() {
  const [data, setData] = useState<SankeyData | null>(null);
  const [selection, setSelection] = useState<SelectionState>({ type: null, data: null });
  const [filterState, setFilterState] = useState<FilterState>({
    filteredLinks: [],
    filteredNodeIds: []
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<{ exportPNG: () => void } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setPanelOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (errors.length === 0) return;
    const timer = setTimeout(() => setErrors([]), 5000);
    return () => clearTimeout(timer);
  }, [errors]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const dismissErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrors(['文件类型错误：请上传 .json 格式的文件']);
      return;
    }

    try {
      const parsedData = await parseJsonFile(file);
      const validation = validateSankeyData(parsedData);

      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      setData(parsedData as SankeyData);
      setFileName(file.name);
      setErrors([]);
      setSelection({ type: null, data: null });
      setFilterState({ filteredLinks: [], filteredNodeIds: [] });
      setShowSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : '未知错误：文件解析失败，请检查文件内容是否为合法的 JSON 格式';
      setErrors([errorMessage]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    } else {
      setErrors(['未检测到有效的文件，请拖拽 .json 文件到上传区域']);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleExportPNG = useCallback(() => {
    if (chartRef.current) {
      try {
        chartRef.current.exportPNG();
      } catch (err) {
        setErrors(['导出失败：' + (err instanceof Error ? err.message : '未知错误')]);
      }
    } else {
      setErrors(['导出失败：图表尚未初始化']);
    }
  }, []);

  const handleResetData = useCallback(() => {
    setData(null);
    setFileName('');
    setSelection({ type: null, data: null });
    setFilterState({ filteredLinks: [], filteredNodeIds: [] });
  }, []);

  const handleNodeClickFromPanel = useCallback((nodeId: string) => {
    if (!data) return;
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelection({ type: 'node', data: { id: node.id, label: node.label } });
    }
  }, [data]);

  const handleRestoreLink = useCallback((linkIndex: number) => {
    setFilterState(prev => ({
      ...prev,
      filteredLinks: prev.filteredLinks.filter(i => i !== linkIndex)
    }));
  }, []);

  const handleRestoreAll = useCallback(() => {
    setFilterState({ filteredLinks: [], filteredNodeIds: [] });
  }, []);

  const handleMaskClick = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen(prev => !prev);
  }, []);

  return (
    <div className="app-container">
      <div
        className="canvas-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {errors.length > 0 && (
          <div className="error-message" onClick={dismissErrors}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '8px' }}>⚠️ 错误提示</strong>
                <ul>
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={dismissErrors}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0',
                  opacity: '0.8',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(76, 175, 80, 0.95)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              zIndex: 200,
              animation: 'slideDown 0.3s ease',
              boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
            }}
          >
            ✅ 数据加载成功，共 {data?.nodes.length} 个节点，{data?.links.length} 条连接
          </div>
        )}

        {data && (
          <>
            <div className="toolbar">
              <button className="toolbar-btn" onClick={handleExportPNG}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                导出 PNG
              </button>
              <button className="toolbar-btn" onClick={handleResetData}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                重新上传
              </button>
            </div>
            <div className="hint-text">
              💡 拖拽节点调整位置 · 点击高亮路径 · 双击流量带过滤 · 滚轮缩放
            </div>
            <SankeyChart
              ref={chartRef}
              data={data}
              selection={selection}
              onSelectionChange={setSelection}
              onFilterChange={setFilterState}
              filteredLinks={filterState.filteredLinks}
            />
          </>
        )}

        {!data && (
          <div className="upload-overlay">
            <div
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h2 className="upload-title">桑基图可视化</h2>
              <p className="upload-subtitle">
                拖拽 JSON 文件到此处<br />
                或点击选择文件上传
              </p>
              <button
                className="upload-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                选择文件
              </button>
              <div className="upload-format">
                <div className="upload-format-title">数据格式示例：</div>
                <code>{`{
  "nodes": [
    {"id": "A", "label": "源节点"},
    {"id": "B", "label": "目标节点"}
  ],
  "links": [
    {"source": "A", "target": "B", "value": 100}
  ]
}`}</code>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        {isMobile && data && (
          <button
            className="mobile-menu-btn"
            onClick={togglePanel}
            aria-label="打开数据面板"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {panelOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
            {filterState.filteredLinks.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  background: '#E94560',
                  borderRadius: '50%',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}
              >
                {filterState.filteredLinks.length}
              </span>
            )}
          </button>
        )}

        {isMobile && panelOpen && (
          <div
            className="mobile-mask"
            onClick={handleMaskClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 90,
              animation: 'fadeIn 0.2s ease'
            }}
          />
        )}
      </div>

      <SidePanel
        data={data}
        selection={selection}
        filterState={filterState}
        fileName={fileName}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onNodeClick={handleNodeClickFromPanel}
        onRestoreLink={handleRestoreLink}
        onRestoreAll={handleRestoreAll}
      />
    </div>
  );
}
