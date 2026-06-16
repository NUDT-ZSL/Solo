import React, { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { canvasLogic } from '@/logic/CanvasLogic';
import { Material } from '@/data/materials';

interface CanvasAreaProps {
  onStateChange?: () => void;
  onError?: (message: string) => void;
}

const GRID_SIZE = 50;
const GRID_LINE_WIDTH = 2;

const CanvasArea: React.FC<CanvasAreaProps> = ({ onStateChange, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const draggingGhostRef = useRef<HTMLDivElement | null>(null);
  const isDragOverRef = useRef(false);

  const drawGrid = useCallback((canvas: fabric.Canvas) => {
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    const gridLines: fabric.Object[] = [];

    for (let x = 0; x <= width; x += GRID_SIZE) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: '#D2B48C',
        strokeWidth: GRID_LINE_WIDTH,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4],
      });
      (line as any).isGrid = true;
      gridLines.push(line);
    }

    for (let y = 0; y <= height; y += GRID_SIZE) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: '#D2B48C',
        strokeWidth: GRID_LINE_WIDTH,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4],
      });
      (line as any).isGrid = true;
      gridLines.push(line);
    }

    gridLines.forEach((line) => canvas.add(line));
    canvas.sendToBack(gridLines[0]);
    gridLines.forEach((line) => canvas.sendToBack(line));

    canvas.renderAll();
  }, []);

  const createGhostElement = useCallback((material: Material) => {
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.7';
    ghost.style.transition = 'none';
    ghost.style.display = 'none';

    const inner = document.createElement('div');
    inner.style.width = `${material.defaultWidth}px`;
    inner.style.height = `${material.defaultHeight}px`;
    inner.style.backgroundColor = material.color;
    inner.style.borderRadius = '6px';
    inner.style.border = '2px solid #8B5E3C';
    inner.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
    inner.style.color = 'white';
    inner.style.fontSize = '12px';
    inner.style.fontWeight = 'bold';
    inner.style.textShadow = '0 1px 3px rgba(0,0,0,0.5)';
    inner.innerText = material.name;

    ghost.appendChild(inner);
    document.body.appendChild(ghost);
    return ghost;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!isDragOverRef.current) {
      isDragOverRef.current = true;
      if (containerRef.current) {
        containerRef.current.classList.add('drag-over');
      }
    }

    try {
      const data = e.dataTransfer.getData('application/json');
      if (data && draggingGhostRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          draggingGhostRef.current.style.display = 'block';
          draggingGhostRef.current.style.left = `${e.clientX - 40}px`;
          draggingGhostRef.current.style.top = `${e.clientY - 40}px`;
        }
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const material = JSON.parse(data) as Material;
        if (!draggingGhostRef.current) {
          draggingGhostRef.current = createGhostElement(material);
        }
      }
    } catch (_) {
      // ignore
    }
  }, [createGhostElement]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { clientX, clientY } = e;
    const isOutside =
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom;

    if (isOutside) {
      isDragOverRef.current = false;
      if (containerRef.current) {
        containerRef.current.classList.remove('drag-over');
      }
      if (draggingGhostRef.current) {
        draggingGhostRef.current.style.display = 'none';
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDragOverRef.current = false;

      if (containerRef.current) {
        containerRef.current.classList.remove('drag-over');
      }
      if (draggingGhostRef.current) {
        draggingGhostRef.current.remove();
        draggingGhostRef.current = null;
      }

      const data = e.dataTransfer.getData('application/json');
      if (!data) {
        onError?.('无效的素材数据');
        return;
      }

      try {
        const material = JSON.parse(data) as Material;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getElement().getBoundingClientRect();
        const x = e.clientX - rect.left - material.defaultWidth / 2;
        const y = e.clientY - rect.top - material.defaultHeight / 2;

        const elementId = canvasLogic.addMaterial(material, x, y);
        if (elementId) {
          const addedObj = canvas.getActiveObject();
          if (addedObj) {
            addedObj.set('opacity', 0.7);
            canvas.renderAll();

            addedObj.animate('opacity', 1, {
              duration: 200,
              onChange: () => canvas.requestRenderAll(),
              easing: fabric.util.ease.easeOutQuad,
            });
          }

          canvas.renderAll();
          onStateChange?.();
        }
      } catch (err) {
        onError?.('添加素材失败');
        console.error(err);
      }
    },
    [onError, onStateChange]
  );

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasWidth = containerRect.width - 32;
    const canvasHeight = containerRect.height - 32;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#F5F0E1',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    drawGrid(canvas);

    canvasLogic.init(canvas);
    canvasLogic.saveState();
    onStateChange?.();

    const handleResize = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      const newRect = containerRef.current.getBoundingClientRect();
      const newWidth = newRect.width - 32;
      const newHeight = newRect.height - 32;

      fabricCanvasRef.current.setWidth(newWidth);
      fabricCanvasRef.current.setHeight(newHeight);
      fabricCanvasRef.current.setBackgroundColor('#F5F0E1', () => {});

      const objectsToRemove: fabric.Object[] = [];
      fabricCanvasRef.current.getObjects().forEach((obj) => {
        if ((obj as any).isGrid) {
          objectsToRemove.push(obj);
        }
      });
      objectsToRemove.forEach((o) => fabricCanvasRef.current?.remove(o));
      drawGrid(fabricCanvasRef.current!);
    };

    const handleObjectModified = () => {
      onStateChange?.();
    };

    const handleSelectionCleared = () => {
      const objects = canvas.getObjects();
      objects.forEach((obj) => {
        const data = (obj as any).data;
        if (data && data.elementId) {
          obj.setCoords();
        }
      });
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('selection:cleared', handleSelectionCleared);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      fabricCanvasRef.current = null;
      canvasLogic.destroy();

      if (draggingGhostRef.current) {
        draggingGhostRef.current.remove();
        draggingGhostRef.current = null;
      }
    };
  }, [drawGrid, onStateChange]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>

      <div className="canvas-info">
        <div className="info-item">
          <span className="info-label">画布尺寸</span>
          <span className="info-value">{fabricCanvasRef.current?.getWidth() || 0} × {fabricCanvasRef.current?.getHeight() || 0}</span>
        </div>
        <div className="info-divider" />
        <div className="info-item">
          <span className="info-label">元件数量</span>
          <span className="info-value">{canvasLogic.getElementsCount()}</span>
        </div>
      </div>

      <div className="canvas-hint">
        <span>📦 从左侧素材库拖拽元件到此区域开始创作</span>
      </div>
    </div>
  );
};

export default CanvasArea;
