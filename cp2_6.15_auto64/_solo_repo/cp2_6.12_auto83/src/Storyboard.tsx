import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pause, Download, BarChart3, LineChart, Calendar, Trash2, List, GripVertical, Type, Loader } from 'lucide-react';
import { ChartType, ChartItem, AnnotationItem, StoryboardItem, ParsedDataset } from './types';
import { parseJsonData } from './dataParser';
import { FileUpload, SuccessToast } from './FileUpload';
import { ChartCard } from './ChartCard';
import { AnnotationCard } from './AnnotationCard';
import { AnnotationTools } from './AnnotationTools';
import './index.css';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const DEFAULT_CHART_TYPES: { type: ChartType; title: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { type: 'timeline', title: '数据时间线', icon: Calendar },
  { type: 'bar', title: '柱状图分析', icon: BarChart3 },
];

const ALL_CHART_TYPES: { type: ChartType; title: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { type: 'bar', title: '柱状图', icon: BarChart3 },
  { type: 'line', title: '折线图', icon: LineChart },
  { type: 'timeline', title: '时间线', icon: Calendar },
];

export const Storyboard: React.FC = () => {
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [storyboardItems, setStoryboardItems] = useState<StoryboardItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [activeAnnotationChartId, setActiveAnnotationChartId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showAddChartMenu, setShowAddChartMenu] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const showNotification = useCallback((message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 3000);
    } else {
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }, []);

  const handleFileUpload = useCallback((content: string, fileName: string) => {
    try {
      const parsed = parseJsonData(content);
      setDataset(parsed);
      
      const initialCharts: ChartItem[] = DEFAULT_CHART_TYPES.map((chartType) => ({
        id: generateId(),
        type: chartType.type,
        title: chartType.title,
      }));
      
      setCharts(initialCharts);
      setAnnotations([]);
      
      const items: StoryboardItem[] = initialCharts.map((chart) => ({
        id: generateId(),
        type: 'chart',
        refId: chart.id,
      }));
      setStoryboardItems(items);
      
      showNotification(`「${fileName}」上传成功，已生成${initialCharts.length}个图表`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '数据解析失败';
      showNotification(msg, true);
    }
  }, [showNotification]);

  const handleChartTypeChange = useCallback((id: string, newType: ChartType) => {
    setCharts((prev) =>
      prev.map((chart) =>
        chart.id === id ? { ...chart, type: newType } : chart
      )
    );
  }, []);

  const handleAddChart = useCallback((type: ChartType) => {
    if (!dataset) return;
    
    const chartInfo = ALL_CHART_TYPES.find(c => c.type === type);
    const newChart: ChartItem = {
      id: generateId(),
      type,
      title: chartInfo ? `${chartInfo.title} ${charts.filter(c => c.type === type).length + 1}` : '新图表',
    };
    
    setCharts((prev) => [...prev, newChart]);
    setStoryboardItems((prev) => [
      ...prev,
      { id: generateId(), type: 'chart', refId: newChart.id },
    ]);
    setShowAddChartMenu(false);
    showNotification('图表已添加');
  }, [dataset, charts, showNotification]);

  const handleDeleteChart = useCallback((chartId: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== chartId));
    setAnnotations((prev) => prev.filter((a) => a.chartId !== chartId));
    setStoryboardItems((prev) => prev.filter((item) => 
      item.type === 'chart' ? item.refId !== chartId : true
    ));
    showNotification('图表已删除');
  }, [showNotification]);

  const handleAddAnnotation = useCallback((
    chartId: string,
    text: string,
    fontSize: number,
    color: string,
    align: 'left' | 'center' | 'right'
  ) => {
    if (!dataset) return;
    
    const chartIndex = storyboardItems.findIndex(
      (item) => item.type === 'chart' && item.refId === chartId
    );
    
    const newAnnotation: AnnotationItem = {
      id: generateId(),
      chartId,
      text,
      fontSize,
      color,
      align,
    };
    
    setAnnotations((prev) => [...prev, newAnnotation]);
    
    const newItem: StoryboardItem = {
      id: generateId(),
      type: 'annotation',
      refId: newAnnotation.id,
    };
    
    setStoryboardItems((prev) => {
      const insertIndex = chartIndex >= 0 ? chartIndex + 1 : prev.length;
      const result = [...prev];
      result.splice(insertIndex, 0, newItem);
      return result;
    });
    
    setActiveAnnotationChartId(null);
    showNotification('标注已添加');
  }, [dataset, storyboardItems, showNotification]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<AnnotationItem>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setStoryboardItems((prev) => prev.filter((item) =>
      item.type === 'annotation' ? item.refId !== id : true
    ));
    showNotification('标注已删除');
  }, [showNotification]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (storyboardItems.length === 0) return;
      setIsPlaying(true);
      setPlaybackIndex(0);
    }
  }, [isPlaying, storyboardItems.length]);

  React.useEffect(() => {
    if (isPlaying && playbackIndex >= 0 && playbackIndex < storyboardItems.length) {
      const timer = setTimeout(() => {
        if (playbackIndex < storyboardItems.length - 1) {
          setPlaybackIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          setTimeout(() => setPlaybackIndex(-1), 500);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, playbackIndex, storyboardItems.length]);

  const handleExport = useCallback(async () => {
    if (!dataset || charts.length === 0) {
      showNotification('没有可导出的内容', true);
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setExportProgress((i / steps) * 100);
    }
    
    const chartHtml = charts.map((chart) => `
      <div style="margin-bottom: 24px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">${chart.title}</h3>
        <div style="height: ${chart.type === 'timeline' ? '140px' : '220px'}; background: #F9FAFB; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9CA3AF;">
          [${chart.type === 'bar' ? '柱状图' : chart.type === 'line' ? '折线图' : '时间线'}]
        </div>
      </div>
    `).join('');
    
    const annotationHtml = annotations.map((ann) => {
      const chart = charts.find(c => c.id === ann.chartId);
      return `
        <div style="margin-bottom: 16px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); position: relative;">
          <div style="position: absolute; top: -8px; left: 32px; width: 16px; height: 16px; background: white; transform: rotate(45deg);"></div>
          ${chart ? `<div style="font-size: 11px; color: #9CA3AF; background: #F3F4F6; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px;">标注：${chart.title}</div>` : ''}
          <p style="font-size: ${ann.fontSize}px; color: ${ann.color}; text-align: ${ann.align}; margin: 0; line-height: 1.6;">${ann.text}</p>
        </div>
      `;
    }).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据叙事 - 导出快照</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #F9FAFB; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; color: #1F2937; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 数据叙事故事板</h1>
    <p style="color: #6B7280; margin-bottom: 24px;">数据范围：${dataset.dateRange.start} 至 ${dataset.dateRange.end}</p>
    ${chartHtml}
    ${annotationHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '数据叙事故事板.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
      setIsExporting(false);
      setExportProgress(0);
      showNotification('导出完成');
    }, 300);
  }, [dataset, charts, annotations, showNotification]);

  const chartMap = useMemo(() => {
    const map = new Map<string, ChartItem>();
    charts.forEach((c) => map.set(c.id, c));
    return map;
  }, [charts]);

  const annotationMap = useMemo(() => {
    const map = new Map<string, AnnotationItem>();
    annotations.forEach((a) => map.set(a.id, a));
    return map;
  }, [annotations]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedItemId || dragOverIndex === null) {
      setDraggedItemId(null);
      setDragOverIndex(null);
      return;
    }

    const dragIndex = storyboardItems.findIndex(item => item.id === draggedItemId);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedItemId(null);
      setDragOverIndex(null);
      return;
    }

    setStoryboardItems(prev => {
      const result = [...prev];
      const [removed] = result.splice(dragIndex, 1);
      const insertIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
      result.splice(insertIndex, 0, removed);
      return result;
    });

    setDraggedItemId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverIndex(null);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SuccessToast message={toastMessage} isVisible={showToast} />
      
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#EF4444',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              zIndex: 1000,
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'white',
                padding: '32px',
                borderRadius: '16px',
                width: '320px',
                textAlign: 'center',
              }}
            >
              <Loader className="loading-spinner" size={32} style={{ color: '#3B82F6', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1F2937' }}>正在导出...</h3>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#E5E7EB',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <motion.div
                  animate={{ width: `${exportProgress}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #3B82F6, #10B981)',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#6B7280' }}>
                {Math.round(exportProgress)}%
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="grid-pattern-bg"
        style={{
          flex: 1,
          padding: '24px',
          minHeight: '100vh',
          paddingRight: '304px',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1F2937',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <BarChart3 size={26} style={{ color: '#3B82F6' }} />
            数据叙事工作台
          </h1>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {dataset && (
              <button
                onClick={() => setShowAddChartMenu(!showAddChartMenu)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Plus size={14} />
                添加图表
              </button>
            )}
            
            {dataset && (
              <button
                onClick={handlePlayPause}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? '暂停' : '播放故事'}
              </button>
            )}
            
            <button
              onClick={handleExport}
              disabled={!dataset || isExporting}
              style={{
                padding: '8px 14px',
                backgroundColor: !dataset || isExporting ? '#D1D5DB' : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: !dataset || isExporting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (dataset && !isExporting) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Download size={14} />
              导出
            </button>
          </div>
        </div>

        {showAddChartMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute',
              top: '88px',
              right: '400px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              padding: '4px',
              zIndex: 100,
              display: 'flex',
              gap: '4px',
            }}
          >
            {ALL_CHART_TYPES.map(({ type, title, icon: Icon }) => (
              <button
                key={type}
                onClick={() => handleAddChart(type)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: '#374151',
                  transition: 'background-color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={14} />
                {title}
              </button>
            ))}
          </motion.div>
        )}

        {!dataset ? (
          <div style={{ maxWidth: '640px', margin: '60px auto' }}>
            <FileUpload onFileUpload={handleFileUpload} onError={(msg) => showNotification(msg, true)} />
          </div>
        ) : (
          <div className="storyboard-grid">
            <AnimatePresence>
              {storyboardItems.map((item, index) => {
                const isPlaybackActive = playbackIndex === index && isPlaying;
                const showPlaybackMask = isPlaying && playbackIndex >= 0 && playbackIndex !== index;
                
                if (item.type === 'chart') {
                  const chart = chartMap.get(item.refId);
                  if (!chart) return null;
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: showPlaybackMask ? 0.3 : 1, 
                        y: isPlaybackActive ? 0 : 0,
                        scale: isPlaybackActive ? 1.02 : 1,
                      }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ position: 'relative' }}
                    >
                      <ChartCard
                        id={chart.id}
                        title={chart.title}
                        type={chart.type}
                        data={dataset.data}
                        onTypeChange={handleChartTypeChange}
                        onDelete={handleDeleteChart}
                        onAddAnnotation={() => setActiveAnnotationChartId(
                          activeAnnotationChartId === chart.id ? null : chart.id
                        )}
                      />
                      
                      {activeAnnotationChartId === chart.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: '12px' }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <AnnotationTools
                            chartId={chart.id}
                            onAddAnnotation={handleAddAnnotation}
                          />
                        </motion.div>
                      )}
                      
                      {isPlaybackActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '12px',
                            pointerEvents: 'none',
                            border: '2px solid #8B5CF6',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                          }}
                        />
                      )}
                    </motion.div>
                  );
                } else {
                  const annotation = annotationMap.get(item.refId);
                  if (!annotation) return null;
                  const chart = chartMap.get(annotation.chartId);
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: showPlaybackMask ? 0.3 : 1, 
                        y: isPlaybackActive ? 0 : 0,
                        scale: isPlaybackActive ? 1.02 : 1,
                      }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ position: 'relative' }}
                    >
                      <AnnotationCard
                        annotation={annotation}
                        chartTitle={chart?.title}
                        onUpdate={handleUpdateAnnotation}
                        onDelete={handleDeleteAnnotation}
                      />
                      
                      {isPlaybackActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '12px',
                            pointerEvents: 'none',
                            border: '2px solid #8B5CF6',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                          }}
                        />
                      )}
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: '280px',
          height: '100vh',
          backgroundColor: 'white',
          borderTopLeftRadius: '0',
          borderBottomLeftRadius: '0',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.08)',
          borderLeft: '2px solid #3B82F6',
          padding: '20px 16px',
          overflowY: 'auto',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <List size={18} style={{ color: '#3B82F6' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
            故事控制面板
          </h2>
        </div>

        {!dataset ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: '13px',
          }}>
            上传数据文件后<br />可在这里管理故事顺序
          </div>
        ) : storyboardItems.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: '13px',
          }}>
            暂无内容，请添加图表
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {storyboardItems.map((item, index) => {
              let title = '';
              let iconColor = '#3B82F6';
              let IconComponent: React.FC<{ size?: number; style?: React.CSSProperties }> = BarChart3;
              
              if (item.type === 'chart') {
                const chart = chartMap.get(item.refId);
                if (chart) {
                  title = chart.title;
                  if (chart.type === 'bar') {
                    IconComponent = BarChart3;
                    iconColor = '#3B82F6';
                  } else if (chart.type === 'line') {
                    IconComponent = LineChart;
                    iconColor = '#10B981';
                  } else {
                    IconComponent = Calendar;
                    iconColor = '#8B5CF6';
                  }
                }
              } else {
                const annotation = annotationMap.get(item.refId);
                if (annotation) {
                  IconComponent = Type;
                  iconColor = '#F59E0B';
                  const chart = chartMap.get(annotation.chartId);
                  const textPreview = annotation.text.length > 10 
                    ? annotation.text.slice(0, 10) + '...' 
                    : annotation.text;
                  title = chart ? `${chart.title}标注` : textPreview;
                }
              }

              const isActive = isPlaying && playbackIndex === index;
              const isDragging = draggedItemId === item.id;
              const showPlaceholder = dragOverIndex === index && draggedItemId && draggedItemId !== item.id;

              return (
                <React.Fragment key={item.id}>
                  {showPlaceholder && (
                    <div
                      className="control-panel-placeholder"
                      style={{
                        height: '44px',
                        marginBottom: '8px',
                      }}
                    />
                  )}
                  
                  <motion.div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    whileHover={{ x: -2 }}
                    animate={{
                      opacity: isDragging ? 0.7 : 1,
                      scale: isActive ? 1.02 : 1,
                      backgroundColor: isActive ? '#EEF2FF' : 'white',
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      backgroundColor: 'white',
                      border: isActive ? '1px solid #8B5CF6' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    className={`control-panel-item ${isDragging ? 'dragging' : ''}`}
                  >
                    <GripVertical size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `${iconColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComponent size={14} style={{ color: iconColor }} />
                    </div>
                    <span style={{
                      flex: 1,
                      fontSize: '12px',
                      color: '#374151',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {index + 1}. {title}
                    </span>
                  </motion.div>
                </React.Fragment>
              );
            })}
            
            {dragOverIndex === storyboardItems.length && draggedItemId && (
              <div
                className="control-panel-placeholder"
                style={{
                  height: '44px',
                }}
              />
            )}
          </div>
        )}

        {dataset && (
          <button
            onClick={() => setShowAddChartMenu(!showAddChartMenu)}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: '1px dashed #D1D5DB',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.color = '#3B82F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            <Plus size={14} />
            添加新图表
          </button>
        )}

        {charts.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
          }}>
            <h3 style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6B7280',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              统计信息
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#9CA3AF' }}>数据条数</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{dataset?.data.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#9CA3AF' }}>图表数量</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{charts.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#9CA3AF' }}>标注数量</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{annotations.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#9CA3AF' }}>分类数</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{dataset?.categories.length || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
