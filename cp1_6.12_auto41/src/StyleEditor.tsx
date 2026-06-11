import React, { useCallback } from 'react';
import { useLyricsStore } from './store/useLyricsStore';
import {
  FONT_FAMILIES,
  ENTER_ANIMATIONS,
  EXIT_ANIMATIONS,
  LyricStyle,
} from './types';

const ANIMATION_NAMES: Record<string, string> = {
  fadeIn: '淡入',
  slideLeft: '从左侧滑入',
  riseUp: '从底部升起',
  zoomIn: '缩放出现',
  fadeOut: '淡出',
  slideRight: '向右侧滑出',
  zoomOut: '缩小消失',
};

export const StyleEditor: React.FC = () => {
  const lyricsData = useLyricsStore((state) => state.lyricsData);
  const selectedLineId = useLyricsStore((state) => state.selectedLineId);
  const updateLyricLine = useLyricsStore((state) => state.updateLyricLine);

  const selectedLine = lyricsData?.lines.find((l) => l.id === selectedLineId);

  const handleStyleChange = useCallback(
    (key: keyof LyricStyle, value: string | number) => {
      if (!selectedLineId) return;
      updateLyricLine(selectedLineId, {
        style: {
          ...selectedLine!.style,
          [key]: value,
        },
      });
    },
    [selectedLineId, selectedLine, updateLyricLine]
  );

  if (!lyricsData) {
    return null;
  }

  if (!selectedLine) {
    return (
      <div className="style-editor">
        <h3>样式编辑</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          请在时间轴中选择一句歌词进行编辑
        </p>
      </div>
    );
  }

  return (
    <div className="style-editor">
      <h3>样式编辑 - &quot;{selectedLine.text.slice(0, 20)}{selectedLine.text.length > 20 ? '...' : ''}&quot;</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>字体</label>
          <select
            className="form-control"
            value={selectedLine.style.fontFamily}
            onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>字号: {selectedLine.style.fontSize}px</label>
          <input
            type="range"
            min={12}
            max={72}
            step={1}
            value={selectedLine.style.fontSize}
            onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>颜色</label>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <input
              type="color"
              value={selectedLine.style.color}
              onChange={(e) => handleStyleChange('color', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <input
              type="text"
              className="form-control"
              value={selectedLine.style.color}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>入场动画</label>
          <select
            className="form-control"
            value={selectedLine.style.enterAnimation}
            onChange={(e) => handleStyleChange('enterAnimation', e.target.value)}
          >
            {ENTER_ANIMATIONS.map((anim) => (
              <option key={anim} value={anim}>
                {ANIMATION_NAMES[anim]}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>出场动画</label>
          <select
            className="form-control"
            value={selectedLine.style.exitAnimation}
            onChange={(e) => handleStyleChange('exitAnimation', e.target.value)}
          >
            {EXIT_ANIMATIONS.map((anim) => (
              <option key={anim} value={anim}>
                {ANIMATION_NAMES[anim]}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="form-group">
        <label>动画时长: {selectedLine.style.animationDuration.toFixed(1)}s</label>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={selectedLine.style.animationDuration}
          onChange={(e) => handleStyleChange('animationDuration', parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};
