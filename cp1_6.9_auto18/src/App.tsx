import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism, { ColorBand } from './components/Prism';
import Spectrum from './components/Spectrum';
import { audioManager, SPECTRUM_ORDER } from './utils/audio';

type BeamColorOption = 'white' | 'warm' | 'cold';

const BEAM_COLOR_MAP: Record<BeamColorOption, string> = {
  white: '#FFFFFF',
  warm: '#FFD700',
  cold: '#00BFFF'
};

const BEAM_LABEL_MAP: Record<BeamColorOption, string> = {
  white: '白光',
  warm: '暖光',
  cold: '冷光'
};

const DEFAULT_ROTATION = 30;
const DEFAULT_REFRACTIVE = 1.5;
const DEFAULT_SIZE_MOBILE = 80;
const DEFAULT_SIZE_DESKTOP = 120;

const App: React.FC = () => {
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 });
  const [isMobile, setIsMobile] = useState(false);
  const [refractiveIndex, setRefractiveIndex] = useState(DEFAULT_REFRACTIVE);
  const [rotation, setRotation] = useState(DEFAULT_ROTATION);
  const [prismSize, setPrismSize] = useState(DEFAULT_SIZE_DESKTOP);
  const [beamColor, setBeamColor] = useState<BeamColorOption>('white');
  const [colorBands, setColorBands] = useState<ColorBand[]>([]);
  const [fps, setFps] = useState(60);
  const audioInitializedRef = useRef(false);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 768;
      setIsMobile(mobile);
      const scale = Math.max(1, Math.min(2, w / 1200));
      setCanvasSize({
        w: Math.floor(w * scale),
        h: Math.floor(h * scale)
      });
      setPrismSize(mobile ? DEFAULT_SIZE_MOBILE : DEFAULT_SIZE_DESKTOP);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }
      const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      setFps(Math.round(1000 / avg));
      requestAnimationFrame(measureFps);
    };
    const id = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(id);
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioInitializedRef.current) {
      await audioManager.ensureInitialized();
      audioInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (colorBands.length > 0) {
      ensureAudio();
      const data = SPECTRUM_ORDER.map((color) => {
        const band = colorBands.find((b) => b.color === color);
        return {
          color,
          widthRatio: band?.widthRatio ?? 0,
          isActive: !!band && band.isActive
        };
      });
      audioManager.setAllVolumes(data);
    } else {
      audioManager.stopAll();
    }
  }, [colorBands, ensureAudio]);

  const handleResetRotation = useCallback(async () => {
    await ensureAudio();
    setRotation(DEFAULT_ROTATION);
  }, [ensureAudio]);

  const cycleBeamColor = useCallback(async () => {
    await ensureAudio();
    setBeamColor((prev) => {
      if (prev === 'white') return 'warm';
      if (prev === 'warm') return 'cold';
      return 'white';
    });
  }, [ensureAudio]);

  const handleRefractiveChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    await ensureAudio();
    const value = parseFloat(e.target.value);
    setRefractiveIndex(Math.round(value * 10) / 10);
  }, [ensureAudio]);

  const handleRotationChange = useCallback(async (newRotation: number) => {
    await ensureAudio();
    setRotation(newRotation);
  }, [ensureAudio]);

  const handleSizeChange = useCallback(async (newSize: number) => {
    await ensureAudio();
    setPrismSize(newSize);
  }, [ensureAudio]);

  const handleColorBandsChange = useCallback((bands: ColorBand[]) => {
    setColorBands(bands);
  }, []);

  const handleExportImage = useCallback(() => {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length === 0) return;

    const mainCanvas = canvases[0] as HTMLCanvasElement;
    const spectrumCanvas = canvases.length > 1 ? (canvases[1] as HTMLCanvasElement) : null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = mainCanvas.width;
    exportCanvas.height = mainCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    ctx.drawImage(mainCanvas, 0, 0);
    if (spectrumCanvas) {
      ctx.drawImage(spectrumCanvas, 0, 0);
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prism-spectrum-${Date.now()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }, []);

  return (
    <div className="app-container" onClick={ensureAudio}>
      <Prism
        canvasWidth={canvasSize.w}
        canvasHeight={canvasSize.h}
        refractiveIndex={refractiveIndex}
        rotation={rotation}
        prismSize={prismSize}
        beamColor={BEAM_COLOR_MAP[beamColor]}
        onRotationChange={handleRotationChange}
        onSizeChange={handleSizeChange}
        onColorBandsChange={handleColorBandsChange}
      />
      <Spectrum
        canvasWidth={canvasSize.w}
        canvasHeight={canvasSize.h}
        colorBands={colorBands}
      />

      <div className="info-hint">
        <strong>棱镜光谱·音符棱镜</strong>
        <br />
        • 拖动棱镜中心旋转角度
        <br />
        • 滚轮缩放棱镜大小
        <br />
        • 点击色块激发亮点闪光
        <br />
        • 调整折射率观察色散
      </div>

      <div className="fps-counter">
        FPS: {fps}
      </div>

      <div className="control-panel">
        <div className="control-group">
          <span className="control-label">折射率</span>
          <div className="slider-container">
            <input
              type="range"
              min="1.3"
              max="2.0"
              step="0.1"
              value={refractiveIndex}
              onChange={handleRefractiveChange}
              className="refractive-slider"
            />
            <span className="slider-value">{refractiveIndex.toFixed(1)}</span>
          </div>
        </div>

        {!isMobile && <div className="divider" />}

        <button
          type="button"
          className="control-btn"
          onClick={handleResetRotation}
        >
          重置角度
        </button>

        <button
          type="button"
          className="control-btn"
          onClick={cycleBeamColor}
        >
          光束: {BEAM_LABEL_MAP[beamColor]}
        </button>

        {!isMobile && <div className="divider" />}

        <button
          type="button"
          className="control-btn"
          onClick={handleExportImage}
        >
          导出图片
        </button>
      </div>
    </div>
  );
};

export default App;
