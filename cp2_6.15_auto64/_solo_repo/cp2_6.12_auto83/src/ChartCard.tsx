import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, LineChart, Calendar, Trash2, Plus } from 'lucide-react';
import { ChartType, DataPoint } from './types';
import { ChartRenderer } from './ChartRenderer';

interface ChartCardProps {
  id: string;
  title: string;
  type: ChartType;
  data: DataPoint[];
  onTypeChange: (id: string, type: ChartType) => void;
  onDelete: (id: string) => void;
  onAddAnnotation?: (chartId: string) => void;
  containerHeight?: number;
}

const CHART_HEIGHTS: Record<ChartType, number> = {
  bar: 220,
  line: 220,
  timeline: 140,
};

export const ChartCard: React.FC<ChartCardProps> = ({
  id,
  title,
  type,
  data,
  onTypeChange,
  onDelete,
  onAddAnnotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChartRenderer | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayType, setDisplayType] = useState(type);
  const [currentHeight, setCurrentHeight] = useState(CHART_HEIGHTS[type]);
  const isInitialRender = useRef(true);

  const initializeRenderer = useCallback(() => {
    if (canvasRef.current && data.length > 0) {
      const width = canvasRef.current.offsetWidth || 600;
      const height = CHART_HEIGHTS[displayType];
      
      if (!rendererRef.current) {
        try {
          rendererRef.current = new ChartRenderer(canvasRef.current, data, {
            width,
            height,
          });
        } catch (e) {
          console.error('Failed to create renderer:', e);
          return;
        }
      } else {
        rendererRef.current.setData(data);
        rendererRef.current.setSize(width, height);
      }
      
      if (!isInitialRender.current) {
        rendererRef.current.setAnimationProgress(0);
      }
      rendererRef.current.animate(displayType, 600);
    }
  }, [data, displayType]);

  useEffect(() => {
    initializeRenderer();
    isInitialRender.current = false;
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [initializeRenderer]);

  useEffect(() => {
    if (type !== displayType) {
      setIsAnimating(true);
      
      const fadeOutTimeout = setTimeout(() => {
        setDisplayType(type);
        setCurrentHeight(CHART_HEIGHTS[type]);
        
        setTimeout(() => {
          if (rendererRef.current && canvasRef.current) {
            const width = canvasRef.current.offsetWidth || 600;
            const height = CHART_HEIGHTS[type];
            rendererRef.current.setData(data);
            rendererRef.current.setSize(width, height);
            rendererRef.current.setAnimationProgress(0);
            rendererRef.current.animate(type, 500);
          }
        }, 50);
        
        setTimeout(() => setIsAnimating(false), 450);
      }, 200);
      
      return () => clearTimeout(fadeOutTimeout);
    }
  }, [type, displayType, data]);

  const handleTypeChange = (newType: ChartType) => {
    if (newType !== type && !isAnimating) {
      onTypeChange(id, newType);
    }
  };

  const chartTypes: { type: ChartType; icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: '柱状图' },
    { type: 'line', icon: LineChart, label: '折线图' },
    { type: 'timeline', icon: Calendar, label: '时间线' },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          {chartTypes.map(({ type: chartType, icon: Icon, label }) => (
            <button
              key={chartType}
              onClick={() => handleTypeChange(chartType)}
              title={label}
              disabled={isAnimating}
              style={{
                padding: '6px 8px',
                backgroundColor: type === chartType ? '#EFF6FF' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isAnimating) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  if (type !== chartType) {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                if (type !== chartType) {
                  e.currentTarget.style.backgroundColor = type === chartType ? '#EFF6FF' : 'transparent';
                }
              }}
            >
              <Icon size={16} style={{ color: type === chartType ? '#3B82F6' : '#6B7280' }} />
            </button>
          ))}
          {onAddAnnotation && (
            <button
              onClick={() => onAddAnnotation(id)}
              title="添加标注"
              style={{
                padding: '6px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#ECFDF5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={16} style={{ color: '#10B981' }} />
            </button>
          )}
          <button
            onClick={() => onDelete(id)}
            title="删除"
            style={{
              padding: '6px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Trash2 size={16} style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${displayType}-${id}`}
          initial={{ opacity: 0, height: currentHeight }}
          animate={{ 
            opacity: isAnimating ? 0 : 1, 
            height: currentHeight,
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            opacity: { duration: 0.4, ease: 'easeInOut' },
            height: {
              duration: 0.2,
              type: 'spring',
              stiffness: 300,
              damping: 25,
            },
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
