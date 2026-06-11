import { useState, useCallback, useRef } from 'react';
import type { SankeyData, SelectionState, FilterState } from './types';
import { validateSankeyData, parseJsonFile } from './utils/validation';
import SankeyChart from './components/SankeyChart';
import SidePanel from './components/SidePanel';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<{ exportPNG: () => void } | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    try {
      const parsedData = await parseJsonFile(file);
      const validation = validateSankeyData(parsedData);

      if (!validation.valid) {
        setErrors(validation.errors);
        setTimeout(() => setErrors([]), 5000);
        return;
      }

      setData(parsedData);
      setFileName(file.name);
      setErrors([]);
      setSelection({ type: null, data: null });
      setFilterState({ filteredLinks: [], filteredNodeIds: [] });
    } catch (err) {
      setErrors([(err as Error).message]);
      setTimeout(() => setErrors([]), 5000);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.json')) {
      handleFileUpload(files[0]);
    } else {
      setErrors(['请上传 JSON 格式的文件']);
      setTimeout(() => setErrors([]), 3000);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
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
      chartRef.current.exportPNG();
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
      setSelection({ type: 'node', data: node });
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

  return (
    <div className="app-container">
      <div
        className="canvas-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {errors.length > 0 && (
          <div className="error-message">
            <strong>数据格式错误：</strong>
            <ul>
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
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
              <button className="upload-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
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
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        <button
          className="mobile-menu-btn"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
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
