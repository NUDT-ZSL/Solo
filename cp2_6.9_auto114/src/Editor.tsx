import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChartRenderer from './ChartRenderer';
import type { Story, Page, ChartConfig, JumpCondition, ChartType, Dataset } from './types';

const sampleDatasets: Dataset[] = [
  {
    name: '月度销售数据',
    description: '某公司2024年各月份销售额（万元）',
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    columns: {
      销售额: [120, 150, 180, 160, 200, 250, 280, 300, 270, 320, 350, 400],
      成本: [80, 90, 100, 95, 120, 150, 160, 170, 155, 180, 200, 220],
      利润: [40, 60, 80, 65, 80, 100, 120, 130, 115, 140, 150, 180]
    }
  },
  {
    name: '用户年龄分布',
    description: '产品用户的年龄段分布统计',
    labels: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    columns: {
      用户数: [1200, 3500, 2800, 1800, 900, 400],
      占比: [11.5, 33.7, 26.9, 17.3, 8.7, 3.8]
    }
  },
  {
    name: '季度收入对比',
    description: '近三年各季度营收对比（百万元）',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    columns: {
      '2022年': [45, 52, 58, 65],
      '2023年': [60, 68, 75, 82],
      '2024年': [78, 85, 92, 105]
    }
  }
];

const colorSchemeOptions = [
  { value: 'default', label: '默认' },
  { value: 'ocean', label: '海洋' },
  { value: 'sunset', label: '日落' },
  { value: 'forest', label: '森林' },
  { value: 'pastel', label: '柔和' }
];

const createDefaultChart = (): ChartConfig => ({
  type: 'bar',
  title: '新图表',
  colorScheme: 'default',
  labels: sampleDatasets[0].labels,
  datasets: [
    {
      label: sampleDatasets[0].columns[Object.keys(sampleDatasets[0].columns)[0]] ? '数据' : '数据',
      data: sampleDatasets[0].columns[Object.keys(sampleDatasets[0].columns)[0]] || []
    }
  ],
  datasetId: sampleDatasets[0].name,
  xColumn: undefined,
  yColumns: undefined
});

const createDefaultPage = (): Page => ({
  id: uuidv4(),
  title: '新页面',
  description: '',
  chart: createDefaultChart()
});

interface EditorProps {
  story: Story;
  setStory: (story: Story) => void;
  clientId: string;
  onBroadcast: (message: any) => void;
  conflictHighlight: Set<string>;
}

const Editor: React.FC<EditorProps> = ({ story, setStory, clientId, onBroadcast, conflictHighlight }) => {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(story.pages[0]?.id || null);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(280);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const [pageFading, setPageFading] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [rippleEffect, setRippleEffect] = useState<{ id: string; x: number; y: number } | null>(null);
  const [jumpFromPage, setJumpFromPage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPage = story.pages.find(p => p.id === selectedPageId) || null;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      const onMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (isDraggingLeft) {
          const newWidth = e.clientX - rect.left;
          setLeftWidth(Math.max(280, Math.min(newWidth, rect.width - 480 - rightWidth)));
        }
        if (isDraggingRight) {
          const newWidth = rect.right - e.clientX;
          setRightWidth(Math.max(280, Math.min(newWidth, rect.width - leftWidth - 480)));
        }
      };
      const onMouseUp = () => {
        setIsDraggingLeft(false);
        setIsDraggingRight(false);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [isDraggingLeft, isDraggingRight, leftWidth, rightWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pageCount = story.pages.length;
    if (pageCount < 2) return;

    const cardWidth = 200;
    const cardHeight = 120;
    const gapX = 40;
    const gapY = 30;
    const cols = Math.min(pageCount, Math.floor((rect.width - 40) / (cardWidth + gapX)));
    const startX = (rect.width - cols * cardWidth - (cols - 1) * gapX) / 2;
    const startY = 30;

    story.pages.forEach((page, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardWidth + gapX) + cardWidth / 2;
      const cy = startY + row * (cardHeight + gapY) + cardHeight / 2;

      ctx.fillStyle = page.id === selectedPageId ? '#313244' : '#252637';
      ctx.strokeStyle = page.id === selectedPageId ? '#89B4FA' : '#45475A';
      ctx.lineWidth = page.id === selectedPageId ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(startX + col * (cardWidth + gapX), startY + row * (cardHeight + gapY), cardWidth, cardHeight, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#CDD6F4';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(page.title || '未命名页面', cx, cy - 10);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '10px sans-serif';
      ctx.fillText(page.chart.type, cx, cy + 10);

      (page as any)._canvasPos = { x: cx, y: cy, cardX: startX + col * (cardWidth + gapX), cardY: startY + row * (cardHeight + gapY), cardW: cardWidth, cardH: cardHeight };
    });

    story.jumpConditions.forEach(jump => {
      const source = story.pages.find(p => p.id === jump.sourcePageId) as any;
      const target = story.pages.find(p => p.id === jump.targetPageId) as any;
      if (!source?._canvasPos || !target?._canvasPos) return;

      const sx = source._canvasPos.x;
      const sy = source._canvasPos.y;
      const tx = target._canvasPos.x;
      const ty = target._canvasPos.y;

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const startOffsetX = (dx / dist) * (cardWidth / 2 + 5);
      const startOffsetY = (dy / dist) * (cardHeight / 2 + 5);
      const endOffsetX = (dx / dist) * (cardWidth / 2 + 15);
      const endOffsetY = (dy / dist) * (cardHeight / 2 + 15);

      ctx.strokeStyle = '#89B4FA';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(sx + startOffsetX, sy + startOffsetY);
      ctx.lineTo(tx - endOffsetX, ty - endOffsetY);
      ctx.stroke();
      ctx.setLineDash([]);

      const arrowAngle = Math.atan2(ty - sy, tx - sx);
      ctx.fillStyle = '#89B4FA';
      ctx.beginPath();
      ctx.moveTo(tx - endOffsetX, ty - endOffsetY);
      ctx.lineTo(tx - endOffsetX - 10 * Math.cos(arrowAngle - Math.PI / 6), ty - endOffsetY - 10 * Math.sin(arrowAngle - Math.PI / 6));
      ctx.lineTo(tx - endOffsetX - 10 * Math.cos(arrowAngle + Math.PI / 6), ty - endOffsetY - 10 * Math.sin(arrowAngle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    });
  }, [story.pages, story.jumpConditions, selectedPageId]);

  const handleSelectPage = useCallback((pageId: string) => {
    if (pageId === selectedPageId) return;
    setPageFading(true);
    setTimeout(() => {
      setSelectedPageId(pageId);
      setPageFading(false);
    }, 150);
  }, [selectedPageId]);

  const handleAddPage = useCallback(() => {
    const newPage = createDefaultPage();
    const newStory = { ...story, pages: [...story.pages, newPage] };
    setStory(newStory);
    handleSelectPage(newPage.id);
    onBroadcast({ type: 'storyUpdate', payload: newStory, timestamp: Date.now(), clientId });
  }, [story, setStory, onBroadcast, clientId, handleSelectPage]);

  const handleDeletePage = useCallback((pageId: string) => {
    if (story.pages.length <= 1) return;
    const newPages = story.pages.filter(p => p.id !== pageId);
    const newJumps = story.jumpConditions.filter(j => j.sourcePageId !== pageId && j.targetPageId !== pageId);
    const newStory = { ...story, pages: newPages, jumpConditions: newJumps };
    setStory(newStory);
    if (selectedPageId === pageId) {
      setSelectedPageId(newPages[0]?.id || null);
    }
    onBroadcast({ type: 'storyUpdate', payload: newStory, timestamp: Date.now(), clientId });
  }, [story, setStory, selectedPageId, onBroadcast, clientId]);

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    setDragOverPageId(pageId);
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }
    const newPages = [...story.pages];
    const draggedIdx = newPages.findIndex(p => p.id === draggedPageId);
    const targetIdx = newPages.findIndex(p => p.id === targetPageId);
    const [dragged] = newPages.splice(draggedIdx, 1);
    newPages.splice(targetIdx, 0, dragged);
    const newStory = { ...story, pages: newPages };
    setStory(newStory);
    onBroadcast({ type: 'storyUpdate', payload: newStory, timestamp: Date.now(), clientId });
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const handleDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const updateSelectedPage = useCallback((updates: Partial<Page>) => {
    if (!selectedPageId) return;
    const newPages = story.pages.map(p => p.id === selectedPageId ? { ...p, ...updates } : p);
    const newStory = { ...story, pages: newPages };
    setStory(newStory);
    onBroadcast({ type: 'pageUpdate', payload: { pageId: selectedPageId, updates }, timestamp: Date.now(), clientId });
  }, [story, setStory, selectedPageId, onBroadcast, clientId]);

  const updateChartConfig = useCallback((updates: Partial<ChartConfig>) => {
    if (!selectedPage) return;
    updateSelectedPage({ chart: { ...selectedPage.chart, ...updates } });
  }, [selectedPage, updateSelectedPage]);

  const handleChartTypeChange = (type: ChartType) => {
    updateChartConfig({ type });
  };

  const handleDatasetSelect = (datasetName: string) => {
    const dataset = sampleDatasets.find(d => d.name === datasetName);
    if (!dataset || !selectedPage) return;
    const firstColumnKey = Object.keys(dataset.columns)[0];
    updateChartConfig({
      datasetId: datasetName,
      labels: dataset.labels,
      datasets: [{
        label: firstColumnKey,
        data: dataset.columns[firstColumnKey]
      }],
      xColumn: undefined,
      yColumns: [firstColumnKey]
    });
  };

  const parseCSV = (csv: string): { labels: string[]; columns: Record<string, number[]> } | null => {
    try {
      const lines = csv.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) return null;
      const headers = lines[0].split(',').map(h => h.trim());
      if (headers.length < 2) return null;
      const columns: Record<string, number[]> = {};
      headers.slice(1).forEach(h => columns[h] = []);
      const labels: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        labels.push(values[0]);
        headers.slice(1).forEach((h, idx) => {
          const num = parseFloat(values[idx + 1]);
          columns[h].push(isNaN(num) ? 0 : num);
        });
      }
      return { labels, columns };
    } catch {
      return null;
    }
  };

  const handleCSVApply = () => {
    const parsed = parseCSV(csvInput);
    if (!parsed || !selectedPage) return;
    const firstColumnKey = Object.keys(parsed.columns)[0];
    updateChartConfig({
      datasetId: 'custom',
      labels: parsed.labels,
      datasets: [{
        label: firstColumnKey,
        data: parsed.columns[firstColumnKey]
      }],
      xColumn: undefined,
      yColumns: [firstColumnKey]
    });
  };

  const handleYColumnToggle = (column: string) => {
    if (!selectedPage) return;
    let currentDataset: Dataset | { labels: string[]; columns: Record<string, number[]> } | null = null;
    if (selectedPage.chart.datasetId && selectedPage.chart.datasetId !== 'custom') {
      currentDataset = sampleDatasets.find(d => d.name === selectedPage.chart.datasetId) || null;
    } else if (csvInput) {
      currentDataset = parseCSV(csvInput);
    }
    if (!currentDataset) return;
    const yCols = selectedPage.chart.yColumns || [];
    let newYCols: string[];
    if (yCols.includes(column)) {
      newYCols = yCols.filter(c => c !== column);
      if (newYCols.length === 0) newYCols = [column];
    } else {
      newYCols = [...yCols, column];
    }
    updateChartConfig({
      yColumns: newYCols,
      datasets: newYCols.map(col => ({
        label: col,
        data: currentDataset!.columns[col] || []
      }))
    });
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const id = uuidv4();
    setRippleEffect({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRippleEffect(null), 300);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(story, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title || 'story'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateStoryJSON = (obj: any): obj is Story => {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.title || typeof obj.title !== 'string') return false;
    if (!Array.isArray(obj.pages) || obj.pages.length === 0) return false;
    for (const page of obj.pages) {
      if (!page.id || typeof page.id !== 'string') return false;
      if (!page.title || typeof page.title !== 'string') return false;
      if (!page.chart || typeof page.chart !== 'object') return false;
      if (!['bar', 'line', 'pie', 'scatter'].includes(page.chart.type)) return false;
      if (!Array.isArray(page.chart.labels)) return false;
      if (!Array.isArray(page.chart.datasets)) return false;
    }
    if (!Array.isArray(obj.jumpConditions)) return false;
    return true;
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!validateStoryJSON(data)) {
          alert('JSON格式不完整或无效，请检查文件内容。');
          return;
        }
        setStory(data);
        setSelectedPageId(data.pages[0]?.id || null);
        onBroadcast({ type: 'storyUpdate', payload: data, timestamp: Date.now(), clientId });
      } catch {
        alert('无法解析JSON文件，请检查文件格式。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePublish = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story)
      });
      const result = await response.json();
      if (result.shortCode) {
        alert(`发布成功！访问码: ${result.shortCode}`);
      }
    } catch {
      alert('发布失败，请确认服务端已启动。');
    }
  };

  const getCurrentDatasetColumns = (): string[] => {
    if (!selectedPage) return [];
    if (selectedPage.chart.datasetId && selectedPage.chart.datasetId !== 'custom') {
      const ds = sampleDatasets.find(d => d.name === selectedPage.chart.datasetId);
      return ds ? Object.keys(ds.columns) : [];
    }
    if (csvInput) {
      const parsed = parseCSV(csvInput);
      return parsed ? Object.keys(parsed.columns) : [];
    }
    return [];
  };

  const getCurrentDataset = (): Dataset | { labels: string[]; columns: Record<string, number[]> } | null => {
    if (!selectedPage) return null;
    if (selectedPage.chart.datasetId && selectedPage.chart.datasetId !== 'custom') {
      return sampleDatasets.find(d => d.name === selectedPage.chart.datasetId) || null;
    }
    if (csvInput) {
      return parseCSV(csvInput);
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const page of story.pages) {
      const pos = (page as any)._canvasPos;
      if (!pos) continue;
      if (x >= pos.cardX && x <= pos.cardX + pos.cardW && y >= pos.cardY && y <= pos.cardY + pos.cardH) {
        if (jumpFromPage && jumpFromPage !== page.id) {
          const exists = story.jumpConditions.some(
            j => j.sourcePageId === jumpFromPage && j.targetPageId === page.id
          );
          if (!exists) {
            const newJump: JumpCondition = {
              id: uuidv4(),
              sourcePageId: jumpFromPage,
              targetPageId: page.id,
              field: 'value',
              operator: '>',
              value: 0
            };
            const newStory = { ...story, jumpConditions: [...story.jumpConditions, newJump] };
            setStory(newStory);
            onBroadcast({ type: 'jumpConditionUpdate', payload: newJump, timestamp: Date.now(), clientId });
          }
          setJumpFromPage(null);
        } else {
          handleSelectPage(page.id);
        }
        return;
      }
    }
    setJumpFromPage(null);
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#89B4FA',
    color: '#1E1E2E',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'background-color 0.2s, transform 0.15s',
    position: 'relative',
    overflow: 'hidden'
  };

  const renderLeftPanel = () => (
    <div
      style={{
        width: isMobile ? '100%' : leftWidth,
        minWidth: 280,
        backgroundColor: '#181825',
        borderRight: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        opacity: pageFading ? 0.3 : 1,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #313244', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#CDD6F4', fontSize: '14px', fontWeight: 600 }}>页面列表</h3>
        <button
          onClick={handleAddPage}
          onMouseDown={createRipple}
          style={{ ...buttonStyle, padding: '4px 12px', fontSize: '12px' }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#74C7EC'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#89B4FA'; }}
        >
          + 添加
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {story.pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, page.id)}
            onDragOver={(e) => handleDragOver(e, page.id)}
            onDrop={(e) => handleDrop(e, page.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleSelectPage(page.id)}
            style={{
              padding: '12px',
              marginBottom: '6px',
              borderRadius: '8px',
              backgroundColor: selectedPageId === page.id ? '#313244' : '#1E1E2E',
              border: selectedPageId === page.id ? '1px solid #89B4FA' : (dragOverPageId === page.id ? '1px dashed #89B4FA' : '1px solid #313244'),
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
              opacity: draggedPageId === page.id ? 0.5 : 1,
              boxShadow: conflictHighlight.has(page.id) ? '0 0 0 2px #F38BA8' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ color: '#6C7086', fontSize: '12px', fontWeight: 600 }}>{index + 1}.</span>
              <span style={{ color: '#CDD6F4', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {page.title || '未命名页面'}
              </span>
            </div>
            {story.pages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6C7086',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#F38BA8'; (e.target as HTMLButtonElement).style.backgroundColor = '#313244'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = '#6C7086'; (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRightPanel = () => {
    if (!selectedPage) return null;
    const currentColumns = getCurrentDatasetColumns();

    return (
      <div
        style={{
          width: isMobile ? '100%' : rightWidth,
          minWidth: 280,
          backgroundColor: '#181825',
          borderLeft: isMobile ? 'none' : '1px solid #313244',
          borderTop: isMobile ? '1px solid #313244' : 'none',
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? '50vh' : '100%',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #313244', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#CDD6F4', fontSize: '14px', fontWeight: 600 }}>属性面板</h3>
          {isMobile && (
            <button onClick={() => setRightPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#CDD6F4', cursor: 'pointer', fontSize: '18px' }}>×</button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>图表类型</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['bar', 'line', 'pie', 'scatter'] as ChartType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handleChartTypeChange(type)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    border: selectedPage.chart.type === type ? '1px solid #89B4FA' : '1px solid #313244',
                    backgroundColor: selectedPage.chart.type === type ? '#313244' : '#1E1E2E',
                    color: selectedPage.chart.type === type ? '#89B4FA' : '#CDD6F4',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { if (selectedPage.chart.type !== type) (e.target as HTMLButtonElement).style.borderColor = '#45475A'; }}
                  onMouseLeave={(e) => { if (selectedPage.chart.type !== type) (e.target as HTMLButtonElement).style.borderColor = '#313244'; }}
                >
                  {type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : type === 'pie' ? '饼图' : '散点图'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>图表标题</label>
            <input
              type="text"
              value={selectedPage.chart.title}
              onChange={(e) => updateChartConfig({ title: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#CDD6F4',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#89B4FA'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#313244'; }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>页面标题</label>
            <input
              type="text"
              value={selectedPage.title}
              onChange={(e) => updateSelectedPage({ title: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#CDD6F4',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#89B4FA'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#313244'; }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>颜色方案</label>
            <select
              value={selectedPage.chart.colorScheme}
              onChange={(e) => updateChartConfig({ colorScheme: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#CDD6F4',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {colorSchemeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>选择数据集</label>
            <select
              value={selectedPage.chart.datasetId || ''}
              onChange={(e) => handleDatasetSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#CDD6F4',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            >
              <option value="">-- 选择示例数据集 --</option>
              {sampleDatasets.map(ds => (
                <option key={ds.name} value={ds.name}>{ds.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>粘贴CSV数据</label>
            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="标签,列1,列2&#10;A,10,20&#10;B,15,25"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#CDD6F4',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: '8px'
              }}
            />
            <button
              onClick={handleCSVApply}
              onMouseDown={createRipple}
              style={{ ...buttonStyle, width: '100%', padding: '6px 12px', fontSize: '12px' }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#74C7EC'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#89B4FA'; }}
            >
              应用CSV数据
            </button>
          </div>

          {currentColumns.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>数据列映射（Y轴）</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {currentColumns.map(col => {
                  const isSelected = (selectedPage.chart.yColumns || []).includes(col);
                  return (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 8px', borderRadius: '4px', backgroundColor: isSelected ? '#313244' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleYColumnToggle(col)}
                        style={{ accentColor: '#89B4FA' }}
                      />
                      <span style={{ color: '#CDD6F4', fontSize: '12px' }}>{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {story.jumpConditions.filter(j => j.sourcePageId === selectedPage.id).length > 0 && (
            <div>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>跳转条件</label>
              {story.jumpConditions.filter(j => j.sourcePageId === selectedPage.id).map(jump => {
                const targetPage = story.pages.find(p => p.id === jump.targetPageId);
                return (
                  <div key={jump.id} style={{ padding: '8px', backgroundColor: '#1E1E2E', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', color: '#CDD6F4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>当 {jump.field} {jump.operator} {jump.value} → {targetPage?.title || '页面'}</span>
                    <button
                      onClick={() => {
                        const newStory = { ...story, jumpConditions: story.jumpConditions.filter(j => j.id !== jump.id) };
                        setStory(newStory);
                        onBroadcast({ type: 'storyUpdate', payload: newStory, timestamp: Date.now(), clientId });
                      }}
                      style={{ background: 'none', border: 'none', color: '#6C7086', cursor: 'pointer', padding: '2px 6px' }}
                      onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#F38BA8'; }}
                      onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = '#6C7086'; }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#1E1E2E', color: '#CDD6F4', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{
        height: 52,
        backgroundColor: '#181825',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#89B4FA' }}>Data Story Editor</span>
          <input
            type="text"
            value={story.title}
            onChange={(e) => setStory({ ...story, title: e.target.value })}
            style={{
              padding: '6px 12px',
              backgroundColor: '#1E1E2E',
              border: '1px solid #313244',
              borderRadius: '6px',
              color: '#CDD6F4',
              fontSize: '13px',
              outline: 'none',
              width: '200px'
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#89B4FA'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#313244'; }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            onMouseDown={createRipple}
            style={buttonStyle}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#74C7EC'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#89B4FA'; }}
          >
            导入JSON
          </button>
          <button
            onClick={handleExportJSON}
            onMouseDown={createRipple}
            style={buttonStyle}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#74C7EC'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#89B4FA'; }}
          >
            导出JSON
          </button>
          <button
            onClick={handlePublish}
            onMouseDown={createRipple}
            style={{ ...buttonStyle, backgroundColor: '#A6E3A1' }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#94E2D5'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#A6E3A1'; }}
          >
            发布故事
          </button>
          {rippleEffect && (
            <span
              key={rippleEffect.id}
              style={{
                position: 'absolute',
                left: rippleEffect.x,
                top: rippleEffect.y,
                width: 10,
                height: 10,
                marginLeft: -5,
                marginTop: -5,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.6)',
                animation: 'ripple 0.15s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 10
              }}
            />
          )}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {!isMobile && renderLeftPanel()}

        {!isMobile && (
          <div
            onMouseDown={() => setIsDraggingLeft(true)}
            style={{
              width: 4,
              cursor: isDraggingLeft ? 'col-resize' : 'ew-resize',
              backgroundColor: isDraggingLeft ? '#89B4FA' : 'transparent',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
            onMouseEnter={(e) => { if (!isDraggingLeft) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#45475A'; }}
            onMouseLeave={(e) => { if (!isDraggingLeft) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
          >
            <div style={{ width: 2, height: 40, backgroundColor: isDraggingLeft ? '#89B4FA' : '#45475A', borderRadius: 1 }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'center'
            }}
          >
            {selectedPage && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 800,
                  backgroundColor: '#252637',
                  borderRadius: 12,
                  padding: '20px',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  transform: 'translateY(0)',
                  boxShadow: conflictHighlight.has(selectedPage.id) ? '0 0 0 2px #F38BA8, 0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = conflictHighlight.has(selectedPage.id)
                    ? '0 0 0 2px #F38BA8, 0 8px 30px rgba(0,0,0,0.4)'
                    : '0 8px 30px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = conflictHighlight.has(selectedPage.id)
                    ? '0 0 0 2px #F38BA8, 0 4px 20px rgba(0,0,0,0.3)'
                    : '0 4px 20px rgba(0,0,0,0.3)';
                }}
              >
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#CDD6F4', fontSize: '18px', fontWeight: 600 }}>{selectedPage.title}</h2>
                    {selectedPage.description && (
                      <p style={{ margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '13px' }}>{selectedPage.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setJumpFromPage(jumpFromPage === selectedPage.id ? null : selectedPage.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: jumpFromPage === selectedPage.id ? '#89B4FA' : '#313244',
                      backgroundColor: jumpFromPage === selectedPage.id ? '#313244' : 'transparent',
                      color: jumpFromPage === selectedPage.id ? '#89B4FA' : '#9CA3AF',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {jumpFromPage === selectedPage.id ? '取消跳转（点击目标页面）' : '添加跳转'}
                  </button>
                </div>
                <ChartRenderer config={selectedPage.chart} height={320} />
              </div>
            )}

            <div style={{ width: '100%', maxWidth: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#CDD6F4', fontSize: '14px', fontWeight: 600 }}>页面跳转关系</h3>
                <span style={{ color: '#6C7086', fontSize: '12px' }}>{jumpFromPage ? '点击目标页面创建连线' : '点击页面选中，或添加跳转后连线'}</span>
              </div>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  width: '100%',
                  height: 300,
                  backgroundColor: '#181825',
                  borderRadius: 12,
                  border: '1px solid #313244',
                  cursor: jumpFromPage ? 'crosshair' : 'pointer'
                }}
              />
            </div>
          </div>
        </div>

        {!isMobile && (
          <div
            onMouseDown={() => setIsDraggingRight(true)}
            style={{
              width: 4,
              cursor: isDraggingRight ? 'col-resize' : 'ew-resize',
              backgroundColor: isDraggingRight ? '#89B4FA' : 'transparent',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
            onMouseEnter={(e) => { if (!isDraggingRight) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#45475A'; }}
            onMouseLeave={(e) => { if (!isDraggingRight) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
          >
            <div style={{ width: 2, height: 40, backgroundColor: isDraggingRight ? '#89B4FA' : '#45475A', borderRadius: 1 }} />
          </div>
        )}

        {!isMobile && renderRightPanel()}
      </div>

      {isMobile && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {renderLeftPanel()}
          </div>
          {rightPanelOpen && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: 'hidden'
            }}>
              {renderRightPanel()}
            </div>
          )}
          {!rightPanelOpen && selectedPage && (
            <button
              onClick={() => setRightPanelOpen(true)}
              style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                ...buttonStyle,
                padding: '12px 20px',
                borderRadius: '50%',
                width: 56,
                height: 56,
                boxShadow: '0 4px 16px rgba(137,180,250,0.4)',
                fontSize: '20px',
                zIndex: 50
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#74C7EC'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#89B4FA'; }}
            >
              ⚙
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(20); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Editor;
