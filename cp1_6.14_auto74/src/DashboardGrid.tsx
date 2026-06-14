import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { DataSource } from './utils/fetchData';
import GaugeRing from './GaugeRing';

interface MiniChartProps {
  data: number[];
  color?: string;
  fillColor?: string;
  height?: number;
}

const MiniChart = memo(function MiniChart({ 
  data, 
  color = '#58a6ff', 
  fillColor = 'rgba(31, 111, 235, 0.1)',
  height = 60
}: MiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const displayDataRef = useRef<number[]>([...data]);
  const targetDataRef = useRef<number[]>([...data]);

  useEffect(() => {
    targetDataRef.current = [...data];
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = height;
    const padding = 4;

    const animate = () => {
      ctx.clearRect(0, 0, width, chartHeight);

      const currentData = displayDataRef.current;
      const targetData = targetDataRef.current;

      for (let i = 0; i < currentData.length; i++) {
        const diff = targetData[i] - currentData[i];
        currentData[i] += diff * 0.15;
      }

      const minVal = Math.min(...currentData);
      const maxVal = Math.max(...currentData);
      const range = maxVal - minVal || 1;

      const points: { x: number; y: number }[] = [];
      const stepX = (width - padding * 2) / (currentData.length - 1);

      for (let i = 0; i < currentData.length; i++) {
        const x = padding + i * stepX;
        const y = padding + (chartHeight - padding * 2) * (1 - (currentData[i] - minVal) / range);
        points.push({ x, y });
      }

      const gradient = ctx.createLinearGradient(0, padding, 0, chartHeight - padding);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'rgba(31, 111, 235, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, chartHeight - padding);
      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(points[points.length - 1].x, chartHeight - padding);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          ctx.moveTo(points[i].x, points[i].y);
        } else {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      ctx.stroke();

      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [height, color, fillColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: height,
        backgroundColor: '#0d1117',
        borderRadius: 6,
        display: 'block'
      }}
    />
  );
});

interface DataCardProps {
  dataSource: DataSource;
  originalIndex: number;
  isDragging: boolean;
  isNew: boolean;
  animateIn: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const DataCard = memo(function DataCard({ 
  dataSource, 
  originalIndex, 
  isDragging,
  isNew,
  animateIn,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: DataCardProps) {
  const [displayValue, setDisplayValue] = useState(dataSource.value);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(dataSource.value);
  const targetValueRef = useRef(dataSource.value);
  const isNewCardRef = useRef(isNew);
  const animateStyleRef = useRef<React.CSSProperties | null>(null);

  if (animateStyleRef.current === null) {
    if (isNew || isNewCardRef.current) {
      animateStyleRef.current = {
        animation: 'scaleIn 0.3s ease-out forwards'
      };
    } else if (animateIn) {
      animateStyleRef.current = {
        animation: `fadeInUp 0.3s ease-out ${originalIndex * 0.1}s both`
      };
    } else {
      animateStyleRef.current = {};
    }
  }

  useEffect(() => {
    targetValueRef.current = dataSource.value;
    startValueRef.current = displayValue;
    const startTime = performance.now();
    const duration = 400;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValueRef.current + (targetValueRef.current - startValueRef.current) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dataSource.value]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(originalIndex));
    onDragStart(e, originalIndex);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e, originalIndex);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, originalIndex);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 10000) {
      return (val / 10000).toFixed(2) + '万';
    }
    return val.toFixed(dataSource.type === 'sensor' || dataSource.type === 'stock' ? 2 : 0);
  };

  const isRingChart = dataSource.chartType === 'ring' || dataSource.type === 'progress';

  const cardStyle: React.CSSProperties = {
    width: '48%',
    borderRadius: 12,
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    padding: 20,
    boxSizing: 'border-box',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    opacity: isDragging ? 0.6 : 1,
    transition: isDragging ? 'opacity 0.15s' : 'opacity 0.2s, box-shadow 0.2s',
    ...animateStyleRef.current
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={cardStyle}
    >
      <div style={{
        fontSize: 14,
        color: '#c9d1d9',
        marginBottom: 12,
        fontFamily: "'Courier New', monospace",
        fontWeight: 500
      }}>
        {dataSource.name}
      </div>

      {isRingChart ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <GaugeRing
            value={displayValue}
            maxValue={dataSource.maxValue || 100}
            unit={dataSource.unit}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 32,
              color: '#f0f6fc',
              fontFamily: "'Courier New', monospace",
              fontWeight: 'bold',
              marginBottom: 4
            }}>
              {formatValue(displayValue)}
              <span style={{ fontSize: 16, color: '#8b949e', marginLeft: 4 }}>{dataSource.unit}</span>
            </div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>
              刷新间隔: {dataSource.refreshInterval}s
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 32,
            color: '#f0f6fc',
            fontFamily: "'Courier New', monospace",
            fontWeight: 'bold',
            marginBottom: 12
          }}>
            {formatValue(displayValue)}
            <span style={{ fontSize: 16, color: '#8b949e', marginLeft: 4 }}>{dataSource.unit}</span>
          </div>
          <MiniChart data={dataSource.history} />
          <div style={{ 
            marginTop: 8, 
            fontSize: 12, 
            color: '#8b949e', 
            textAlign: 'right',
            fontFamily: "'Courier New', monospace"
          }}>
            刷新间隔: {dataSource.refreshInterval}s
          </div>
        </>
      )}
    </div>
  );
});

interface DashboardGridProps {
  dataSources: DataSource[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  newItemId: string | null;
}

const Placeholder = () => (
  <div
    style={{
      width: '48%',
      borderRadius: 12,
      border: '2px dashed #30363d',
      backgroundColor: 'rgba(48, 54, 61, 0.15)',
      boxSizing: 'border-box',
      minHeight: 180
    }}
  />
);

export default function DashboardGrid({ dataSources, onReorder, newItemId }: DashboardGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (dataSources.length > 0) {
      const timer = setTimeout(() => {
        setAnimateIn(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [dataSources.length]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDragOverIndex(index);
    try {
      e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 20, 20);
    } catch {
      // setDragImage may not be supported
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, onReorder]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (draggedIndex === index) {
      setDragOverIndex(index);
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    
    let newIndex = index;
    if (e.clientX < midX) {
      newIndex = draggedIndex < index ? index - 1 : index;
    } else {
      newIndex = draggedIndex < index ? index : index + 1;
    }
    newIndex = Math.max(0, Math.min(newIndex, dataSources.length - 1));
    
    setDragOverIndex(newIndex);
  }, [draggedIndex, dataSources.length]);

  const handleDrop = useCallback((_e: React.DragEvent, _index: number) => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, onReorder]);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, onReorder]);

  const renderItems = () => {
    const items: React.ReactNode[] = [];
    const isDragging = draggedIndex !== null && dragOverIndex !== null;

    for (let i = 0; i < dataSources.length; i++) {
      if (isDragging && i === dragOverIndex && draggedIndex !== dragOverIndex) {
        items.push(<Placeholder key={`ph-before-${i}`} />);
      }

      const ds = dataSources[i];
      items.push(
        <DataCard
          key={ds.id}
          dataSource={ds}
          originalIndex={i}
          isDragging={draggedIndex === i}
          isNew={ds.id === newItemId}
          animateIn={animateIn && ds.id !== newItemId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      );
    }

    if (isDragging && dragOverIndex === dataSources.length && draggedIndex !== dataSources.length - 1) {
      items.push(<Placeholder key="ph-end" />);
    }

    return items;
  };

  return (
    <div
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'flex-start'
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      {renderItems()}
    </div>
  );
}
