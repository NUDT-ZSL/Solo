import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Stroke, Rubbing, ScoreResult, Mode, Point, CharacterClip } from '../types';
import { TopNav } from './components/TopNav';
import { ToolPanel } from './components/ToolPanel';
import {
  getCanvasPoint,
  drawStrokes,
  drawRubbing,
  drawHighlightAreas,
  loadImage,
  exportCanvasToPNG,
  cropImageToDataURL,
  drawStroke
} from './utils/canvas';
import { HistoryManager } from './utils/history';
import { fetchRubbings, uploadRubbing, calculateScore } from './utils/api';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('copy');
  const [rubbings, setRubbings] = useState<Rubbing[]>([]);
  const [selectedRubbingId, setSelectedRubbingId] = useState<string>('');
  const [brushSize, setBrushSize] = useState(8);
  const [inkOpacity, setInkOpacity] = useState(0.9);
  const [rubbingOpacity, setRubbingOpacity] = useState(0.5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [characters, setCharacters] = useState<CharacterClip[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [charScale, setCharScale] = useState(1);
  const [charRotation, setCharRotation] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [clipStart, setClipStart] = useState<Point | null>(null);
  const [clipEnd, setClipEnd] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });

  const rubbingLayerRef = useRef<HTMLCanvasElement>(null);
  const drawingLayerRef = useRef<HTMLCanvasElement>(null);
  const overlayLayerRef = useRef<HTMLCanvasElement>(null);
  const charactersLayerRef = useRef<HTMLCanvasElement>(null);
  const currentRubbingImage = useRef<HTMLImageElement | null>(null);
  const historyManager = useRef(new HistoryManager());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    historyManager.current.save([], []);
  }, []);

  useEffect(() => {
    fetchRubbings().then(data => {
      setRubbings(data);
      if (data.length > 0) {
        setSelectedRubbingId(data[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedRubbingId) return;
    const rubbing = rubbings.find(r => r.id === selectedRubbingId);
    if (!rubbing) return;

    loadImage(rubbing.imageUrl).then(img => {
      currentRubbingImage.current = img;
      renderRubbingLayer();
    }).catch(console.error);
  }, [selectedRubbingId, rubbings, rubbingOpacity]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const w = Math.min(window.innerWidth - 32, 600);
        setCanvasSize({ w, h: Math.floor(w * 0.75) });
      } else {
        setCanvasSize({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (mode === 'copy') {
      renderDrawingLayer();
    } else {
      renderCharactersLayer();
    }
  }, [mode]);

  const renderRubbingLayer = useCallback(() => {
    const canvas = rubbingLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    if (currentRubbingImage.current) {
      drawRubbing(ctx, currentRubbingImage.current, rubbingOpacity, canvasSize.w, canvasSize.h);
    }
  }, [rubbingOpacity, canvasSize]);

  const renderDrawingLayer = useCallback(() => {
    const canvas = drawingLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    drawStrokes(ctx, strokes, true);
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
  }, [strokes, currentStroke, canvasSize]);

  const renderCharactersLayer = useCallback(() => {
    const canvas = charactersLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    for (const char of characters) {
      const img = new Image();
      img.src = char.imageDataUrl;
      ctx.save();
      ctx.translate(char.x + char.width / 2, char.y + char.height / 2);
      ctx.rotate((char.rotation * Math.PI) / 180);
      ctx.scale(char.scale, char.scale);
      ctx.drawImage(img, -char.width / 2, -char.height / 2, char.width, char.height);
      ctx.restore();

      if (char.id === selectedCharId) {
        ctx.save();
        ctx.strokeStyle = '#C0392B';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(char.x, char.y, char.width * char.scale, char.height * char.scale);
        ctx.restore();
      }
    }
  }, [characters, selectedCharId, canvasSize]);

  const renderOverlayLayer = useCallback(() => {
    const canvas = overlayLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    if (scoreResult) {
      drawHighlightAreas(ctx, scoreResult.highlighAreas);
    }

    if (isClipping && clipStart && clipEnd) {
      ctx.save();
      ctx.strokeStyle = '#C0392B';
      ctx.fillStyle = 'rgba(192, 57, 43, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const x = Math.min(clipStart.x, clipEnd.x);
      const y = Math.min(clipStart.y, clipEnd.y);
      const w = Math.abs(clipEnd.x - clipStart.x);
      const h = Math.abs(clipEnd.y - clipStart.y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }, [scoreResult, isClipping, clipStart, clipEnd, canvasSize]);

  useEffect(() => {
    renderRubbingLayer();
  }, [renderRubbingLayer]);

  useEffect(() => {
    if (mode === 'copy') {
      renderDrawingLayer();
    }
  }, [renderDrawingLayer, mode]);

  useEffect(() => {
    if (mode === 'creation') {
      renderCharactersLayer();
    }
  }, [renderCharactersLayer, mode]);

  useEffect(() => {
    renderOverlayLayer();
  }, [renderOverlayLayer]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isClipping) {
      const canvas = overlayLayerRef.current;
      if (!canvas) return;
      const p = getCanvasPoint(e, canvas);
      setClipStart(p);
      setClipEnd(p);
      return;
    }

    if (mode === 'copy') {
      const canvas = drawingLayerRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(e, canvas);
      const stroke: Stroke = {
        id: uuidv4(),
        points: [point],
        brushSize,
        opacity: inkOpacity,
        color: '#1A1A1A'
      };
      setCurrentStroke(stroke);
      setIsDrawing(true);
      setScoreResult(null);
    }
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    if (isClipping && clipStart) {
      const canvas = overlayLayerRef.current;
      if (!canvas) return;
      const p = getCanvasPoint(e, canvas);
      setClipEnd(p);
      return;
    }

    if (!isDrawing || !currentStroke) return;
    if (mode === 'copy') {
      const canvas = drawingLayerRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(e, canvas);
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, point]
      });
    }
  };

  const endDrawing = () => {
    if (isClipping && clipStart && clipEnd) {
      const x = Math.min(clipStart.x, clipEnd.x);
      const y = Math.min(clipStart.y, clipEnd.y);
      const w = Math.abs(clipEnd.x - clipStart.x);
      const h = Math.abs(clipEnd.y - clipStart.y);

      if (w > 20 && h > 20 && currentRubbingImage.current) {
        const rubbing = rubbings.find(r => r.id === selectedRubbingId);
        const dataUrl = cropImageToDataURL(currentRubbingImage.current, x, y, w, h);
        const clip: CharacterClip = {
          id: uuidv4(),
          rubbingId: selectedRubbingId,
          imageDataUrl: dataUrl,
          x: 0,
          y: 0,
          width: w,
          height: h,
          rotation: 0,
          scale: 1
        };
        const newChars = [...characters, clip];
        setCharacters(newChars);
        historyManager.current.save(strokes, newChars);
      }
      setIsClipping(false);
      setClipStart(null);
      setClipEnd(null);
      return;
    }

    if (isDrawing && currentStroke) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      historyManager.current.save(newStrokes, characters);
      setCurrentStroke(null);
      setIsDrawing(false);
    }
  };

  const handleScore = async () => {
    if (strokes.length === 0) return;
    setIsScoring(true);
    try {
      const result = await calculateScore(strokes, undefined, canvasSize.w, canvasSize.h);
      setScoreResult(result);
    } catch (err) {
      console.error('评分失败:', err);
    } finally {
      setIsScoring(false);
    }
  };

  const handleUndo = () => {
    const state = historyManager.current.undo();
    if (state) {
      setStrokes(state.strokes);
      setCharacters(state.characters);
      setScoreResult(null);
      forceUpdate(n => n + 1);
    }
  };

  const handleRedo = () => {
    const state = historyManager.current.redo();
    if (state) {
      setStrokes(state.strokes);
      setCharacters(state.characters);
      setScoreResult(null);
      forceUpdate(n => n + 1);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setScoreResult(null);
    historyManager.current.save([], characters);
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const rubbing = await uploadRubbing(file);
        setRubbings(prev => [...prev, rubbing]);
        setSelectedRubbingId(rubbing.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : '上传失败');
      }
    };
    input.click();
  };

  const handleClipCharacter = () => {
    if (!selectedRubbingId) {
      alert('请先选择一个碑帖');
      return;
    }
    setIsClipping(true);
    setScoreResult(null);
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode !== 'creation') return;

    const charId = e.dataTransfer.getData('charId');
    if (!charId) return;

    const canvas = charactersLayerRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCharacters(prev => prev.map(c =>
      c.id === charId
        ? { ...c, x: x - c.width / 2, y: y - c.height / 2 }
        : c
    ));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (mode !== 'creation') return;

    const canvas = charactersLayerRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    for (let i = characters.length - 1; i >= 0; i--) {
      const c = characters[i];
      if (x >= c.x && x <= c.x + c.width * c.scale &&
          y >= c.y && y <= c.y + c.height * c.scale) {
        found = c.id;
        setCharScale(c.scale);
        setCharRotation(c.rotation);
        break;
      }
    }
    setSelectedCharId(found);
  };

  const handleCharScaleChange = (val: number) => {
    setCharScale(val);
    if (selectedCharId) {
      const newChars = characters.map(c =>
        c.id === selectedCharId ? { ...c, scale: val } : c
      );
      setCharacters(newChars);
      historyManager.current.save(strokes, newChars);
    }
  };

  const handleCharRotationChange = (val: number) => {
    setCharRotation(val);
    if (selectedCharId) {
      const newChars = characters.map(c =>
        c.id === selectedCharId ? { ...c, rotation: val } : c
      );
      setCharacters(newChars);
      historyManager.current.save(strokes, newChars);
    }
  };

  const handleRemoveCharacter = (id: string) => {
    const newChars = characters.filter(c => c.id !== id);
    setCharacters(newChars);
    if (selectedCharId === id) setSelectedCharId(null);
    historyManager.current.save(strokes, newChars);
  };

  const handleExport = () => {
    const canvas = charactersLayerRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `墨池集字_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="app-container">
      <TopNav
        rubbings={rubbings}
        selectedRubbingId={selectedRubbingId}
        onRubbingChange={setSelectedRubbingId}
        onUpload={handleUpload}
        onScore={handleScore}
        isScoring={isScoring}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setScoreResult(null);
          setSelectedCharId(null);
        }}
      />

      <div className="main-content">
        <div className="canvas-area">
          <div
            className="canvas-wrapper"
            style={{ width: canvasSize.w, height: canvasSize.h }}
            onMouseDown={mode === 'copy' ? startDrawing : handleCanvasClick}
            onMouseMove={mode === 'copy' ? moveDrawing : undefined}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={mode === 'copy' ? startDrawing : undefined}
            onTouchMove={mode === 'copy' ? moveDrawing : undefined}
            onTouchEnd={endDrawing}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnCanvas}
          >
            {mode === 'copy' ? (
              <>
                <canvas
                  ref={rubbingLayerRef}
                  className="rubbing-layer"
                  width={canvasSize.w}
                  height={canvasSize.h}
                />
                <canvas
                  ref={drawingLayerRef}
                  className="drawing-layer"
                  width={canvasSize.w}
                  height={canvasSize.h}
                />
                <canvas
                  ref={overlayLayerRef}
                  className="overlay-layer"
                  width={canvasSize.w}
                  height={canvasSize.h}
                />
              </>
            ) : (
              <canvas
                ref={charactersLayerRef}
                className="drawing-layer"
                width={canvasSize.w}
                height={canvasSize.h}
                style={{ cursor: mode === 'creation' ? 'pointer' : 'crosshair' }}
              />
            )}
          </div>
        </div>

        <ToolPanel
          mode={mode}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          inkOpacity={inkOpacity}
          onInkOpacityChange={setInkOpacity}
          rubbingOpacity={rubbingOpacity}
          onRubbingOpacityChange={(v) => {
            setRubbingOpacity(v);
          }}
          canUndo={historyManager.current.canUndo()}
          canRedo={historyManager.current.canRedo()}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          scoreResult={scoreResult}
          onClipCharacter={handleClipCharacter}
          characters={characters}
          onRemoveCharacter={handleRemoveCharacter}
          onExport={handleExport}
          selectedCharId={selectedCharId}
          charScale={charScale}
          onCharScaleChange={handleCharScaleChange}
          charRotation={charRotation}
          onCharRotationChange={handleCharRotationChange}
        />
      </div>
    </div>
  );
};

export default App;
