import { useEffect, useRef, useState, useCallback } from 'react';
import type { Region, HSV } from '../imageProcessor/types';
import { PRESET_PALETTES } from '../imageProcessor/presetPalettes';
import { ColorFiller } from '../imageProcessor/colorFiller';
import {
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  getLuminance,
  hexToRgb,
} from '../imageProcessor/colorUtils';

interface ColorPalettePanelProps {
  regions: Region[];
  selectedRegion: Region | null;
  colorFiller: ColorFiller | null;
  onShowToast: (msg: string) => void;
  isImageLoaded: boolean;
  activePaletteName: string | null;
  onPaletteApply: (name: string | null) => void;
}

const WHEEL_SIZE = 140;
const HSV_SIZE = 200;

export default function ColorPalettePanel({
  regions,
  selectedRegion,
  colorFiller,
  onShowToast,
  isImageLoaded,
  activePaletteName,
  onPaletteApply,
}: ColorPalettePanelProps) {
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const hsvCanvasRef = useRef<HTMLCanvasElement>(null);
  const hsvSliderRef = useRef<HTMLDivElement>(null);

  const [wheelIndicator, setWheelIndicator] = useState({ x: WHEEL_SIZE / 2, y: WHEEL_SIZE / 2 });
  const [hsvIndicator, setHsvIndicator] = useState({ x: HSV_SIZE / 2, y: HSV_SIZE / 2 });
  const [hsvValue, setHsvValue] = useState(1);
  const [currentHSV, setCurrentHSV] = useState<HSV>({ h: 0, s: 1, v: 1 });
  const [currentColor, setCurrentColor] = useState('#ff0000');

  const isDraggingWheelRef = useRef(false);
  const isDraggingHsvRef = useRef(false);
  const isDraggingSliderRef = useRef(false);

  useEffect(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;

    canvas.width = WHEEL_SIZE;
    canvas.height = WHEEL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const radius = WHEEL_SIZE / 2;

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const angle = Math.atan2(dy, dx);
        const h = (angle + Math.PI) / (2 * Math.PI);
        const s = dist / radius;
        const v = 1;
        const { r, g, b } = hsvToRgb(h, s, v);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, []);

  const drawHsvCircle = useCallback((v: number) => {
    const canvas = hsvCanvasRef.current;
    if (!canvas) return;

    canvas.width = HSV_SIZE;
    canvas.height = HSV_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = HSV_SIZE / 2;
    const cy = HSV_SIZE / 2;
    const radius = HSV_SIZE / 2;

    for (let y = 0; y < HSV_SIZE; y++) {
      for (let x = 0; x < HSV_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const angle = Math.atan2(dy, dx);
        const h = (angle + Math.PI) / (2 * Math.PI);
        const s = dist / radius;
        const { r, g, b } = hsvToRgb(h, s, v);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, []);

  useEffect(() => {
    drawHsvCircle(hsvValue);
  }, [hsvValue, drawHsvCircle]);

  useEffect(() => {
    if (selectedRegion) {
      const hsv = hexToHsv(selectedRegion.color);
      setCurrentHSV(hsv);
      setCurrentColor(selectedRegion.color);
      setHsvValue(hsv.v);
      drawHsvCircle(hsv.v);

      const cx = HSV_SIZE / 2;
      const cy = HSV_SIZE / 2;
      const radius = HSV_SIZE / 2;
      const angle = hsv.h * 2 * Math.PI - Math.PI;
      const dist = hsv.s * radius;
      setHsvIndicator({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
      });

      const wcx = WHEEL_SIZE / 2;
      const wcy = WHEEL_SIZE / 2;
      const wradius = WHEEL_SIZE / 2;
      const wangle = hsv.h * 2 * Math.PI - Math.PI;
      const wdist = Math.min(hsv.s * wradius, wradius);
      setWheelIndicator({
        x: wcx + Math.cos(wangle) * wdist,
        y: wcy + Math.sin(wangle) * wdist,
      });
    }
  }, [selectedRegion, drawHsvCircle]);

  const handleColorUpdate = useCallback(
    (h: number, s: number, v: number) => {
      const color = hsvToHex(h, s, v);
      setCurrentHSV({ h, s, v });
      setCurrentColor(color);

      if (selectedRegion && colorFiller) {
        colorFiller.fillRegion(selectedRegion.id, color, false);
        onPaletteApply(null);
      }
    },
    [selectedRegion, colorFiller, onPaletteApply],
  );

  const getHsvFromPos = (x: number, y: number, size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    const angle = Math.atan2(dy, dx);
    const h = (angle + Math.PI) / (2 * Math.PI);
    const s = dist / radius;
    return { h, s, cx, cy, dist };
  };

  const handleWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageLoaded) return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const radius = WHEEL_SIZE / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    if (dist === 0) return;

    const { h, s } = getHsvFromPos(x, y, WHEEL_SIZE);
    setWheelIndicator({
      x: cx + (dx / Math.sqrt(dx * dx + dy * dy)) * dist,
      y: cy + (dy / Math.sqrt(dx * dx + dy * dy)) * dist,
    });
    handleColorUpdate(h, s, hsvValue);
  };

  const handleWheelMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageLoaded) return;
    isDraggingWheelRef.current = true;
    handleWheelClick(e);
  };

  const handleWheelMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingWheelRef.current) return;
    handleWheelClick(e);
  };

  const handleWheelMouseUp = () => {
    isDraggingWheelRef.current = false;
  };

  const handleHsvClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageLoaded) return;
    const canvas = hsvCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const { h, s, cx, cy, dist } = getHsvFromPos(x, y, HSV_SIZE);
    if (dist === 0) return;

    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    setHsvIndicator({
      x: cx + (dx / d) * dist,
      y: cy + (dy / d) * dist,
    });
    handleColorUpdate(h, s, hsvValue);
  };

  const handleHsvMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageLoaded) return;
    isDraggingHsvRef.current = true;
    handleHsvClick(e);
  };

  const handleHsvMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingHsvRef.current) return;
    handleHsvClick(e);
  };

  const handleHsvMouseUp = () => {
    isDraggingHsvRef.current = false;
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isImageLoaded) return;
    const slider = hsvSliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const v = x / rect.width;
    setHsvValue(v);
    drawHsvCircle(v);
    handleColorUpdate(currentHSV.h, currentHSV.s, v);
  };

  const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isImageLoaded) return;
    isDraggingSliderRef.current = true;
    handleSliderClick(e);
  };

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSliderRef.current) return;
    handleSliderClick(e);
  };

  const handleSliderMouseUp = () => {
    isDraggingSliderRef.current = false;
  };

  useEffect(() => {
    const handleUp = () => {
      isDraggingWheelRef.current = false;
      isDraggingHsvRef.current = false;
      isDraggingSliderRef.current = false;
    };
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  const handlePaletteApply = (colors: string[], name: string) => {
    if (!colorFiller || !isImageLoaded) return;
    colorFiller.applyPalette(colors, true);
    onPaletteApply(name);
    onShowToast(`已应用「${name}」配色方案`);
  };

  const handleSaveJSON = () => {
    if (regions.length === 0) return;

    const data = {
      regions: regions.map((r) => ({
        id: r.id,
        hex: r.color,
        seedPoint: r.seedPoint,
      })),
      timestamp: Date.now(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `color-scheme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('配色方案已保存为JSON');
  };

  const handleCopyCSS = () => {
    if (regions.length === 0) return;

    const cssVars = regions
      .map(
        (r, i) =>
          `  --color-region-${i + 1}: ${r.color};`,
      )
      .join('\n');
    const css = `:root {\n${cssVars}\n}`;

    navigator.clipboard.writeText(css).then(
      () => onShowToast('CSS变量已复制到剪贴板'),
      () => onShowToast('复制失败，请手动复制'),
    );
  };

  const handleReset = () => {
    if (!colorFiller) return;
    const initialColors = new Map<number, string>();
    regions.forEach((r, i) => {
      const h = (i / regions.length) % 1;
      const s = 0.5 + Math.random() * 0.4;
      const v = 0.7 + Math.random() * 0.25;
      initialColors.set(r.id, hsvToHex(h, s, v));
    });
    colorFiller.fillMultipleRegions(initialColors, true);
    onPaletteApply(null);
    onShowToast('已重置配色');
  };

  return (
    <div
      className="panel-wrapper"
      onMouseUp={handleWheelMouseUp}
      onMouseLeave={handleWheelMouseUp}
    >
      <div className="panel-section">
        <div className="panel-title">配色轮盘</div>
        <div className="color-wheel-container">
          <div
            className="color-wheel"
            style={{ opacity: isImageLoaded ? 1 : 0.4 }}
          >
            <canvas
              ref={wheelCanvasRef}
              onClick={handleWheelClick}
              onMouseDown={handleWheelMouseDown}
              onMouseMove={handleWheelMouseMove}
              onMouseUp={handleWheelMouseUp}
            />
            <div
              className="color-wheel-indicator"
              style={{
                left: wheelIndicator.x,
                top: wheelIndicator.y,
                backgroundColor: currentColor,
              }}
            />
          </div>
          <div
            className="color-wheel-hex-label"
            style={{
              backgroundColor: currentColor,
              color: (() => {
                const { r, g, b } = hexToRgb(currentColor);
                return getLuminance(r, g, b) > 0.5 ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)';
              })(),
            }}
          >
            {currentColor.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      <div className="panel-section">
        <div className="panel-title">预设色板</div>
        <div className="preset-palettes">
          {PRESET_PALETTES.map((palette) => (
            <div
              key={palette.name}
              className={`palette-card ${activePaletteName === palette.name ? 'active' : ''} ${!isImageLoaded ? 'btn-disabled' : ''}`}
              onClick={() => handlePaletteApply(palette.colors, palette.name)}
            >
              <div className="palette-name">{palette.name}</div>
              <div className="palette-grid">
                {palette.colors.map((color, i) => {
                  const { r, g, b } = hexToRgb(color);
                  const textColor = getLuminance(r, g, b) > 0.5 ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                  return (
                    <div
                      key={i}
                      className="palette-swatch"
                      style={{ backgroundColor: color }}
                    >
                      <span className="palette-swatch-label" style={{ color: textColor }}>
                        {color.substring(1).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">HSV 拾色器</div>
        <div
          className="hsv-picker-container"
          style={{ opacity: isImageLoaded ? 1 : 0.4 }}
        >
          <div className="hsv-circle">
            <canvas
              ref={hsvCanvasRef}
              onClick={handleHsvClick}
              onMouseDown={handleHsvMouseDown}
              onMouseMove={handleHsvMouseMove}
              onMouseUp={handleHsvMouseUp}
            />
            <div
              className="hsv-indicator"
              style={{
                left: hsvIndicator.x,
                top: hsvIndicator.y,
                backgroundColor: currentColor,
              }}
            />
          </div>
          <div
            ref={hsvSliderRef}
            className="hsv-slider"
            style={{
              background: `linear-gradient(to right, #000, ${hsvToHex(currentHSV.h, currentHSV.s, 1)})`,
            }}
            onClick={handleSliderClick}
            onMouseDown={handleSliderMouseDown}
            onMouseMove={handleSliderMouseMove}
            onMouseUp={handleSliderMouseUp}
          >
            <div
              className="hsv-slider-handle"
              style={{ left: `${hsvValue * 100}%` }}
            />
          </div>
          <div className="color-preview">
            <div
              className="color-preview-box"
              style={{ backgroundColor: currentColor }}
            />
            <span className="color-hex">{currentColor.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">操作</div>
        <div className="actions-container">
          <button
            className={`btn btn-primary ${!isImageLoaded ? 'btn-disabled' : ''}`}
            onClick={handleSaveJSON}
            disabled={!isImageLoaded}
          >
            保存为 JSON
          </button>
          <button
            className={`btn btn-primary ${!isImageLoaded ? 'btn-disabled' : ''}`}
            onClick={handleCopyCSS}
            disabled={!isImageLoaded}
          >
            复制 CSS 变量
          </button>
          <button
            className={`btn btn-secondary ${!isImageLoaded ? 'btn-disabled' : ''}`}
            onClick={handleReset}
            disabled={!isImageLoaded}
          >
            重置配色
          </button>
        </div>
      </div>
    </div>
  );
}
