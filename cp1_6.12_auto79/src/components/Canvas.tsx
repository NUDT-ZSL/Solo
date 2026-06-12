import React, { useRef, useEffect, useCallback } from 'react';
import { CanvasManager } from '../canvas/CanvasManager';
import { FlowchartData, ToolType } from '../types';

interface CanvasProps {
  data: FlowchartData;
  currentTool: ToolType;
  onDataChange: (data: FlowchartData) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onConnectionSelect: (connId: string | null) => void;
  canvasManagerRef: React.MutableRefObject<CanvasManager | null>;
}

const Canvas: React.FC<CanvasProps> = ({
  data,
  currentTool,
  onDataChange,
  onNodeSelect,
  onConnectionSelect,
  canvasManagerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager(data);
    }
    const manager = canvasManagerRef.current;
    manager.init(canvasRef.current, (newData) => {
      onDataChange(newData);
    });

    return () => {
      manager.destroy();
    };
  }, []);

  useEffect(() => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasManagerRef.current) {
        canvasManagerRef.current.handleResize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentTool === 'delete') {
      canvasRef.current!.style.cursor = 'crosshair';
    } else if (currentTool === 'select') {
      canvasRef.current!.style.cursor = 'default';
    } else {
      canvasRef.current!.style.cursor = 'crosshair';
    }
  }, [currentTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasManagerRef.current) {
        canvasManagerRef.current.deleteSelected();
        const newData = canvasManagerRef.current.getData();
        onDataChange(newData);
      }
      if (e.key === 'Escape') {
        onNodeSelect(null);
        onConnectionSelect(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasManagerRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (currentTool === 'select') {
      const node = canvasManagerRef.current.getNodeAt(pos);
      const conn = canvasManagerRef.current.getConnectionAt(pos);
      onNodeSelect(node ? node.id : null);
      onConnectionSelect(conn ? conn.id : null);
    } else if (currentTool === 'delete') {
      canvasManagerRef.current.deleteSelected();
      onDataChange(canvasManagerRef.current.getData());
    }
  }, [currentTool]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: '#1e1e2e',
      }}
    />
  );
};

export default Canvas;
