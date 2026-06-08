import React, { useRef, useEffect, useCallback } from 'react';
import { InkEngine } from './InkEngine';
import { matchPoem } from './PoetryMatcher';
import { useInkStore } from './store';
import { Toolbar, PoetryCard, MobileToolbar } from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InkEngine | null>(null);
  const poemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { inkColor, currentPoem, poemVisible, setCurrentPoem, setPoemVisible } = useInkStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new InkEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStrokeEndCallback((stroke) => {
      const poem = matchPoem(stroke);
      if (poem) {
        if (poemTimerRef.current) clearTimeout(poemTimerRef.current);
        setCurrentPoem({ text: poem.text, author: poem.author });
        poemTimerRef.current = setTimeout(() => {
          setPoemVisible(false);
        }, 5000);
      }
    });

    engine.onClickCallback(() => {
      if (poemTimerRef.current) clearTimeout(poemTimerRef.current);
      setPoemVisible(false);
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (poemTimerRef.current) clearTimeout(poemTimerRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, [setCurrentPoem, setPoemVisible]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColor(inkColor);
    }
  }, [inkColor]);

  const handleReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
    setCurrentPoem(null);
    if (poemTimerRef.current) clearTimeout(poemTimerRef.current);
  }, [setCurrentPoem]);

  const handleExport = useCallback(() => {
    if (engineRef.current) {
      const dataUrl = engineRef.current.exportPNG();
      const link = document.createElement('a');
      link.download = `流影绘卷_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, []);

  const handleDismissPoem = useCallback(() => {
    setPoemVisible(false);
  }, [setPoemVisible]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F5F0E8] animate-fadeIn">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'crosshair', touchAction: 'none' }}
      />

      <Toolbar onReset={handleReset} onExport={handleExport} />
      <MobileToolbar onReset={handleReset} onExport={handleExport} />

      <PoetryCard
        poem={currentPoem}
        visible={poemVisible}
        onDismiss={handleDismissPoem}
      />

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10
                      pointer-events-none select-none">
        <h1 className="text-2xl md:text-3xl tracking-[0.3em] text-black/25 font-poetry">
          流影绘卷
        </h1>
      </div>
    </div>
  );
};

export default App;
