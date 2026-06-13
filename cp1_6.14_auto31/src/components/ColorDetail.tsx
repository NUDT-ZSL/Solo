import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { HSL } from '../utils/colorUtils';
import {
  hslToHex,
  hslToRgb,
  hslToString,
  rgbToString,
  copyToClipboard,
  validateHSL,
} from '../utils/colorUtils';

interface ColorDetailProps {
  primary: HSL;
  onChange: (hsl: HSL) => void;
}

const ColorDetail: React.FC<ColorDetailProps> = ({ primary, onChange }) => {
  const [localH, setLocalH] = useState<number>(primary.h);
  const [localS, setLocalS] = useState<number>(primary.s);
  const [localL, setLocalL] = useState<number>(primary.l);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<HSL | null>(null);

  useEffect(() => {
    setLocalH(primary.h);
    setLocalS(primary.s);
    setLocalL(primary.l);
  }, [primary.h, primary.s, primary.l]);

  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    rafRef.current = null;
    if (pending) {
      onChange(pending);
    }
  }, [onChange]);

  const scheduleChange = useCallback(
    (next: HSL) => {
      const validated = validateHSL(next);
      pendingRef.current = validated;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    },
    [flushPending]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10) || 0;
      setLocalH(v);
      scheduleChange({ h: v, s: localS, l: localL });
    },
    [localS, localL, scheduleChange]
  );

  const handleSatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10) || 0;
      setLocalS(v);
      scheduleChange({ h: localH, s: v, l: localL });
    },
    [localH, localL, scheduleChange]
  );

  const handleLightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10) || 0;
      setLocalL(v);
      scheduleChange({ h: localH, s: localS, l: v });
    },
    [localH, localS, scheduleChange]
  );

  const hex = hslToHex(primary);
  const rgb = hslToRgb(primary);
  const hslStr = hslToString(primary);
  const rgbStr = rgbToString(rgb);

  const handleCopy = useCallback(
    async (text: string) => {
      await copyToClipboard(text);
    },
    []
  );

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div className="detail-title">颜色细节</div>
        <div className="detail-subtitle">拖动滑块精细调节颜色参数</div>
      </div>

      <div className="color-values">
        <div className="value-row">
          <span className="value-label">HEX</span>
          <div
            className="value-content"
            onClick={() => handleCopy(hex)}
            title="点击复制"
          >
            {hex}
          </div>
        </div>
        <div className="value-row">
          <span className="value-label">RGB</span>
          <div
            className="value-content"
            onClick={() => handleCopy(rgbStr)}
            title="点击复制"
          >
            {rgbStr}
          </div>
        </div>
        <div className="value-row">
          <span className="value-label">HSL</span>
          <div
            className="value-content"
            onClick={() => handleCopy(hslStr)}
            title="点击复制"
          >
            {hslStr}
          </div>
        </div>
      </div>

      <div className="sliders-section">
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">色相 (Hue)</span>
            <span className="slider-value">{localH}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={localH}
            onChange={handleHueChange}
            className="slider-track-hue"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">饱和度 (Saturation)</span>
            <span className="slider-value">{localS}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={localS}
            onChange={handleSatChange}
            style={{
              background: `linear-gradient(to right, hsl(${localH}, 0%, 50%), hsl(${localH}, 100%, 50%))`,
            }}
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">明度 (Lightness)</span>
            <span className="slider-value">{localL}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={localL}
            onChange={handleLightChange}
            style={{
              background: `linear-gradient(to right, hsl(${localH}, ${localS}%, 0%), hsl(${localH}, ${localS}%, 50%), hsl(${localH}, ${localS}%, 100%))`,
            }}
          />
        </div>
      </div>
    </aside>
  );
};

export default ColorDetail;
