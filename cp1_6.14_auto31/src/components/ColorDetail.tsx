import React, { useCallback } from 'react';
import type { HSL } from '../utils/colorUtils';
import {
  hslToHex,
  hslToRgb,
  hslToString,
  rgbToString,
} from '../utils/colorUtils';

interface ColorDetailProps {
  primary: HSL;
  onChange: (hsl: HSL) => void;
}

const ColorDetail: React.FC<ColorDetailProps> = ({ primary, onChange }) => {
  const hex = hslToHex(primary);
  const rgb = hslToRgb(primary);
  const hslStr = hslToString(primary);
  const rgbStr = rgbToString(rgb);

  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...primary, h: parseInt(e.target.value, 10) });
    },
    [onChange, primary]
  );

  const handleSatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...primary, s: parseInt(e.target.value, 10) });
    },
    [onChange, primary]
  );

  const handleLightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...primary, l: parseInt(e.target.value, 10) });
    },
    [onChange, primary]
  );

  const copyValue = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div className="detail-title">颜色细节</div>
        <div className="detail-subtitle">
          拖动滑块精细调节颜色参数
        </div>
      </div>

      <div className="color-values">
        <div className="value-row">
          <span className="value-label">HEX</span>
          <div
            className="value-content"
            onClick={() => copyValue(hex)}
            title="点击复制"
          >
            {hex}
          </div>
        </div>
        <div className="value-row">
          <span className="value-label">RGB</span>
          <div
            className="value-content"
            onClick={() => copyValue(rgbStr)}
            title="点击复制"
          >
            {rgbStr}
          </div>
        </div>
        <div className="value-row">
          <span className="value-label">HSL</span>
          <div
            className="value-content"
            onClick={() => copyValue(hslStr)}
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
            <span className="slider-value">{primary.h}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={primary.h}
            onChange={handleHueChange}
            className="slider-track-hue"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">饱和度 (Saturation)</span>
            <span className="slider-value">{primary.s}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={primary.s}
            onChange={handleSatChange}
            style={{
              background: `linear-gradient(to right, hsl(${primary.h}, 0%, 50%), hsl(${primary.h}, 100%, 50%))`,
            }}
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">明度 (Lightness)</span>
            <span className="slider-value">{primary.l}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={primary.l}
            onChange={handleLightChange}
            style={{
              background: `linear-gradient(to right, hsl(${primary.h}, ${primary.s}%, 0%), hsl(${primary.h}, ${primary.s}%, 50%), hsl(${primary.h}, ${primary.s}%, 100%))`,
            }}
          />
        </div>
      </div>
    </aside>
  );
};

export default ColorDetail;
