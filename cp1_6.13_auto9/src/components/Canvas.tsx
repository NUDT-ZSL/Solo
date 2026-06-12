import React, { useCallback, useRef, useEffect } from 'react';
import { useGalleryStore } from '@/store';
import { Wall } from './Wall';
import { Exhibit } from './Exhibit';
import { LightSourceComponent } from './LightSource';
import { Plus, Lightbulb } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 40;

export const Canvas: React.FC = () => {
  const { walls, exhibits, lights, zoom, setZoom, addWall, addLight, selectElement, addExhibit } =
    useGalleryStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    },
    [zoom, setZoom]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        selectElement(null);
      }
    },
    [selectElement]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/exhibit');
      if (!data) return;

      try {
        const exhibit = JSON.parse(data);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        addExhibit({
          exhibitId: exhibit.id,
          name: exhibit.name,
          colorTag: exhibit.colorTag,
          physicalWidth: exhibit.physicalWidth,
          physicalHeight: exhibit.physicalHeight,
          x: x - (exhibit.physicalWidth * 2) / 2,
          y: y - (exhibit.physicalHeight * 2) / 2,
        });
      } catch {
        // ignore
      }
    },
    [zoom, addExhibit]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const preventDefault = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', preventDefault, { passive: false });
    return () => el.removeEventListener('wheel', preventDefault);
  }, []);

  const gridLines = [];
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={CANVAS_HEIGHT}
        stroke="#ddd"
        strokeWidth={0.5}
      />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={CANVAS_WIDTH}
        y2={y}
        stroke="#ddd"
        strokeWidth={0.5}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #e0e0e0',
          alignItems: 'center',
        }}
      >
        <button
          onClick={addWall}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #e0e0e0',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            color: '#333',
            transition: 'box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <Plus size={14} />
          添加墙壁
        </button>
        <button
          onClick={() => addLight(400, 50)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #e0e0e0',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            color: '#333',
            transition: 'box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <Lightbulb size={14} />
          添加灯光
        </button>
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: '#888',
          }}
        >
          缩放: {Math.round(zoom * 100)}%
        </div>
      </div>

      <div
        ref={canvasRef}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: '#f0f0f0',
            position: 'relative',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {gridLines}
          </svg>

          {walls.map((wall) => (
            <Wall key={wall.id} wall={wall} zoom={zoom} />
          ))}

          {lights.map((light) => (
            <LightSourceComponent key={light.id} light={light} zoom={zoom} />
          ))}

          {exhibits.map((exhibit) => (
            <Exhibit key={exhibit.id} exhibit={exhibit} zoom={zoom} />
          ))}
        </div>
      </div>
    </div>
  );
};
