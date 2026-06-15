import React, { useState, useRef, useEffect, useCallback } from 'react';
import CanvasCanvas from './CanvasCanvas';
import Toolbar from './Toolbar';
import LayerPanel from './LayerPanel';
import { exportToPNG, exportToJPG, exportToSVG } from './exportUtils';
import {
  AnnotationElement,
  ToolType,
  ImagePosition,
  PRESET_COLORS,
} from './types';

const STORAGE_KEY = 'graphique_annotator_state';
const STORAGE_VERSION = '1.0';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

interface SavedState {
  version: string;
  savedAt: number;
  image: string | null;
  imagePosition: ImagePosition;
  elements: AnnotationElement[];
}

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<ImagePosition>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [currentColor, setCurrentColor] = useState<string>(PRESET_COLORS[0]);
  const [currentFontSize, setCurrentFontSize] = useState<number>(14);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isTextEditing, setIsTextEditing] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const saveToStorage = useCallback(
    debounce((state: SavedState) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('自动保存失败:', e);
      }
    }, 3000),
    []
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedState = JSON.parse(saved);
        if (parsed.version === STORAGE_VERSION) {
          if (parsed.image) setImage(parsed.image);
          if (parsed.imagePosition) setImagePosition(parsed.imagePosition);
          if (parsed.elements) setElements(parsed.elements);
        }
      }
    } catch (e) {
      console.error('恢复状态失败:', e);
    }
  }, []);

  useEffect(() => {
    const state: SavedState = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      image,
      imagePosition,
      elements,
    };
    saveToStorage(state);
  }, [image, imagePosition, elements, saveToStorage]);

  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditing =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable') ||
        isTextEditing;

      if (isEditing) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, isTextEditing]);

  const handleImageUpload = useCallback((file: File) => {
    setUploadError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('仅支持 PNG 和 JPG 格式的图片');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setImage(dataUrl);
        setElements([]);
        setSelectedId(null);
      }
    };
    reader.onerror = () => {
      setUploadError('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddElement = useCallback((element: AnnotationElement) => {
    setElements((prev) => [...prev, element]);
  }, []);

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<AnnotationElement>) => {
      setElements((prev) =>
        prev.map((el) =>
          el.id === id ? ({ ...el, ...updates } as AnnotationElement) : el
        )
      );
    },
    []
  );

  const handleSelectElement = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleImagePositionChange = useCallback((pos: ImagePosition) => {
    setImagePosition(pos);
  }, []);

  const handleExportPNG = async () => {
    if (!svgRef.current) return;
    try {
      await exportToPNG(svgRef.current, {
        image,
        imagePosition,
        elements,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
      });
    } catch (e) {
      console.error('导出PNG失败:', e);
    }
  };

  const handleExportJPG = async () => {
    if (!svgRef.current) return;
    try {
      await exportToJPG(svgRef.current, {
        image,
        imagePosition,
        elements,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
      });
    } catch (e) {
      console.error('导出JPG失败:', e);
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    try {
      exportToSVG(svgRef.current, image);
    } catch (e) {
      console.error('导出SVG失败:', e);
    }
  };

  return (
    <div className="app">
      <Toolbar
        currentTool={currentTool}
        currentColor={currentColor}
        currentFontSize={currentFontSize}
        onToolChange={setCurrentTool}
        onColorChange={setCurrentColor}
        onFontSizeChange={setCurrentFontSize}
        onImageUpload={handleImageUpload}
      />

      {uploadError && (
        <div className="error-toast">
          <span className="error-icon">⚠️</span>
          <span>{uploadError}</span>
          <button
            className="error-close"
            onClick={() => setUploadError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="main-content">
        {elements.length > 0 && (
          <LayerPanel
            elements={elements}
            selectedId={selectedId}
            onSelectElement={handleSelectElement}
          />
        )}

        <div className="canvas-wrapper" ref={canvasContainerRef}>
          <CanvasCanvas
            image={image}
            imagePosition={imagePosition}
            elements={elements}
            selectedId={selectedId}
            currentTool={currentTool}
            currentColor={currentColor}
            currentFontSize={currentFontSize}
            onImagePositionChange={handleImagePositionChange}
            onAddElement={handleAddElement}
            onUpdateElement={handleUpdateElement}
            onSelectElement={handleSelectElement}
            svgRef={svgRef}
            canvasSize={canvasSize}
          />
        </div>

        <div className="export-panel">
          <button
            className="export-btn export-png"
            onClick={handleExportPNG}
            disabled={!image}
          >
            导出 PNG
          </button>
          <button
            className="export-btn export-jpg"
            onClick={handleExportJPG}
            disabled={!image}
          >
            导出 JPG
          </button>
          <button
            className="export-btn export-svg"
            onClick={handleExportSVG}
            disabled={!image}
          >
            导出 SVG
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
