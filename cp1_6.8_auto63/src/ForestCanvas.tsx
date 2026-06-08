import React, { useRef, useEffect, useCallback } from 'react';
import { EcosystemEngine } from './EcosystemEngine';
import { TreeType } from './types';

interface ForestCanvasProps {
  engine: EcosystemEngine;
  selectedTree: TreeType;
  planting: boolean;
}

const ForestCanvas: React.FC<ForestCanvasProps> = ({ engine, selectedTree, planting }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.init(canvas, () => {});
    engine.start();
    return () => {
      engine.stop();
    };
  }, [engine]);

  useEffect(() => {
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [engine]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!planting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const groundY = rect.height * 0.75;
    if (y > groundY - 30) {
      engine.plantTree(x, y, selectedTree);
    }
  }, [engine, selectedTree, planting]);

  const handleEmptyClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engine.addRipple(x, y);
  }, [engine]);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (planting) {
      handleClick(e);
    } else {
      handleEmptyClick(e);
    }
  }, [planting, handleClick, handleEmptyClick]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: planting ? 'crosshair' : 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};

export default ForestCanvas;
