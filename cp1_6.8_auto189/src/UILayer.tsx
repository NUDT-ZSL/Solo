import { useCallback, useEffect, useRef } from 'react';
import { Upload, RotateCcw, Grid3x3 } from 'lucide-react';
import { usePuzzleStore } from './store';
import { hitTest } from './FragmentEngine';
import {
  renderBackground,
  renderFragment,
  renderGlow,
  renderFlash,
  renderConnection,
  renderParticles,
  renderCompletion,
  renderProgressBar,
} from './Renderer';

export default function UILayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const phase = usePuzzleStore(s => s.phase);
  const image = usePuzzleStore(s => s.image);
  const fragmentData = usePuzzleStore(s => s.fragmentData);
  const fragmentStates = usePuzzleStore(s => s.fragmentStates);
  const particles = usePuzzleStore(s => s.particles);
  const completionAlpha = usePuzzleStore(s => s.completionAlpha);
  const canvasWidth = usePuzzleStore(s => s.canvasWidth);
  const canvasHeight = usePuzzleStore(s => s.canvasHeight);
  const gridCols = usePuzzleStore(s => s.gridCols);
  const gridRows = usePuzzleStore(s => s.gridRows);

  const loadImage = usePuzzleStore(s => s.loadImage);
  const setCanvasSize = usePuzzleStore(s => s.setCanvasSize);
  const startDrag = usePuzzleStore(s => s.startDrag);
  const updateDrag = usePuzzleStore(s => s.updateDrag);
  const endDrag = usePuzzleStore(s => s.endDrag);
  const reset = usePuzzleStore(s => s.reset);
  const tick = usePuzzleStore(s => s.tick);
  const setGridSize = usePuzzleStore(s => s.setGridSize);

  const snappedCount = fragmentStates.filter(s => s.snapped).length;
  const totalCount = fragmentStates.length;
  const progress = totalCount > 0 ? snappedCount / totalCount : 0;

  const getNeighbors = useCallback(
    (stateId: number) => {
      const row = Math.floor(stateId / gridCols);
      const col = stateId % gridCols;
      const neighborIds: number[] = [];
      if (row > 0) neighborIds.push((row - 1) * gridCols + col);
      if (row < gridRows - 1) neighborIds.push((row + 1) * gridCols + col);
      if (col > 0) neighborIds.push(row * gridCols + col - 1);
      if (col < gridCols - 1) neighborIds.push(row * gridCols + col + 1);
      return fragmentStates.filter(s => neighborIds.includes(s.id));
    },
    [fragmentStates, gridCols, gridRows]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      setCanvasSize(w, h);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [setCanvasSize]);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      tick(dt);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvasWidth;
      const h = canvasHeight;

      renderBackground(ctx, w, h);

      if (phase === 'playing' || phase === 'completed') {
        for (let i = 0; i < fragmentStates.length; i++) {
          const state = fragmentStates[i];
          const data = fragmentData[i];
          if (!data || state.id !== data.id) {
            const found = fragmentData.find(d => d.id === state.id);
            if (!found) continue;
            renderFragment(ctx, state, found, image!);
            renderGlow(ctx, state, found);
            continue;
          }
          renderFragment(ctx, state, data, image!);
          renderGlow(ctx, state, data);
        }

        for (let i = 0; i < fragmentStates.length; i++) {
          const state = fragmentStates[i];
          const data = fragmentData.find(d => d.id === state.id);
          if (!data) continue;

          if (state.flashAlpha > 0) {
            renderFlash(ctx, state, data);
          }

          if (state.snapped && state.connectionAlpha > 0) {
            const neighbors = getNeighbors(state.id);
            renderConnection(ctx, state, data, neighbors);
          }
        }

        if (phase === 'completed' && image) {
          renderCompletion(ctx, image, completionAlpha, w, h);
        }

        renderParticles(ctx, particles);
        renderProgressBar(ctx, progress, w, h);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, image, fragmentData, fragmentStates, particles, completionAlpha, canvasWidth, canvasHeight, progress, tick, getNeighbors]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (phase !== 'playing') return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hitId = hitTest(x, y, fragmentStates, fragmentData);
      if (hitId !== null) {
        const state = fragmentStates.find(s => s.id === hitId);
        if (state) {
          startDrag(hitId, x - state.x, y - state.y);
        }
      }
    },
    [phase, fragmentStates, fragmentData, startDrag]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      updateDrag(e.clientX - rect.left, e.clientY - rect.top);
    },
    [updateDrag]
  );

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (phase !== 'playing') return;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const hitId = hitTest(x, y, fragmentStates, fragmentData);
      if (hitId !== null) {
        const state = fragmentStates.find(s => s.id === hitId);
        if (state) {
          startDrag(hitId, x - state.x, y - state.y);
        }
      }
    },
    [phase, fragmentStates, fragmentData, startDrag]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      updateDrag(touch.clientX - rect.left, touch.clientY - rect.top);
    },
    [updateDrag]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const handleGridChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value, 10);
      setGridSize(val, val);
    },
    [setGridSize]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-xl border border-white/10 bg-black/40 shadow-lg shadow-black/20">
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all duration-200 text-white/80 hover:text-white text-sm" style={{ fontFamily: '"Outfit", sans-serif' }}>
          <Upload size={16} />
          <span>上传图片</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm" style={{ fontFamily: '"Outfit", sans-serif' }}>
          <Grid3x3 size={14} />
          <select
            value={gridCols}
            onChange={handleGridChange}
            className="bg-transparent text-white/80 text-sm outline-none cursor-pointer"
            disabled={phase === 'playing'}
          >
            {[5, 6, 7, 8, 9, 10].map(v => (
              <option key={v} value={v} className="bg-gray-900 text-white">
                {v}×{v}
              </option>
            ))}
          </select>
        </div>

        {phase === 'playing' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-200 text-sm"
            style={{ fontFamily: '"Outfit", sans-serif' }}
          >
            <RotateCcw size={16} />
            <span>重置</span>
          </button>
        )}

        {phase === 'playing' && totalCount > 0 && (
          <div className="flex items-center gap-2 text-white/60 text-xs px-2" style={{ fontFamily: '"Outfit", sans-serif' }}>
            <span>{snappedCount}/{totalCount}</span>
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center animate-fade-in">
            <h1
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
              style={{ fontFamily: '"Outfit", sans-serif' }}
            >
              影流拼图
            </h1>
            <p className="text-white/40 text-lg" style={{ fontFamily: '"DM Sans", sans-serif' }}>
              上传一张图片，开始光影之旅
            </p>
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="px-10 py-8 rounded-3xl backdrop-blur-2xl border border-white/10 bg-black/30 shadow-2xl shadow-purple-500/10 animate-fade-in-scale"
          >
            <h2
              className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent"
              style={{ fontFamily: '"Outfit", sans-serif' }}
            >
              拼图完成
            </h2>
            <p className="text-white/50 text-center text-sm" style={{ fontFamily: '"DM Sans", sans-serif' }}>
              光影重组完毕
            </p>
            <button
              onClick={reset}
              className="mt-5 mx-auto block pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 hover:text-white transition-all duration-200 text-sm"
              style={{ fontFamily: '"Outfit", sans-serif' }}
            >
              <RotateCcw size={16} />
              <span>再来一次</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
