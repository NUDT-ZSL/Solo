import React, { useState, useCallback } from 'react';
import { mixColorsLch, randomMix } from '../utils/mixer';

interface PaletteBoardProps {
  colors: string[];
  onUpdateColor: (index: number, hex: string) => void;
  onMixResult: (color1: string, color2: string, mixed: string[]) => void;
  onRandomMix: () => void;
}

const PaletteBoard: React.FC<PaletteBoardProps> = ({
  colors,
  onUpdateColor,
  onMixResult,
  onRandomMix,
}) => {
  const [mixedColors, setMixedColors] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPickerFor, setShowPickerFor] = useState<number | null>(null);
  const [showSecondColorModal, setShowSecondColorModal] = useState(false);
  const [firstColor, setFirstColor] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent, color: string, index: number) => {
      e.dataTransfer.setData('text/plain', color);
      e.dataTransfer.effectAllowed = 'copy';
      setDraggedIndex(index);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const color = e.dataTransfer.getData('text/plain');
      if (color) {
        setFirstColor(color);
        setShowSecondColorModal(true);
      }
    },
    [],
  );

  const handleSecondColorSelect = useCallback(
    (color: string) => {
      if (firstColor) {
        const result = mixColorsLch(firstColor, color);
        setMixedColors(result);
        onMixResult(firstColor, color, result);
      }
      setShowSecondColorModal(false);
      setFirstColor(null);
    },
    [firstColor, onMixResult],
  );

  const handleRandomMix = useCallback(() => {
    const result = randomMix(colors);
    setMixedColors(result.mixed);
    onMixResult(result.color1, result.color2, result.mixed);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 500);
    onRandomMix();
  }, [colors, onMixResult, onRandomMix]);

  const handleColorChange = useCallback(
    (index: number, hex: string) => {
      onUpdateColor(index, hex);
      setShowPickerFor(null);
    },
    [onUpdateColor],
  );

  return (
    <div className={`palette-board ${flashActive ? 'flash' : ''}`}>
      <h2 className="section-title">🎨 调色板</h2>

      <div className="base-colors">
        {colors.map((color, index) => (
          <div key={index} className="color-block-wrapper">
            <div
              className={`color-block ${draggedIndex === index ? 'dragging' : ''}`}
              style={{ backgroundColor: color }}
              draggable
              onDragStart={(e) => handleDragStart(e, color, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setShowPickerFor(showPickerFor === index ? null : index)}
              title="拖拽混合 / 点击修改"
            >
              <span className="color-hex">{color}</span>
            </div>
            {showPickerFor === index && (
              <div className="color-picker-popup">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="native-picker"
                />
                <button
                  className="picker-close"
                  onClick={() => setShowPickerFor(null)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="random-mix-btn" onClick={handleRandomMix}>
        🎲 随机混合
      </button>

      <div
        className={`mix-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mix-zone-label">
          {mixedColors.length > 0
            ? '混合结果'
            : '拖拽色块到此处混合'}
        </div>

        {mixedColors.length > 0 && (
          <div className="mixed-colors">
            {mixedColors.map((color, i) => (
              <div
                key={i}
                className="mixed-color-block"
                style={{ backgroundColor: color }}
                title={color}
              >
                <span className="mixed-hex">{color}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSecondColorModal && (
        <div className="modal-overlay" onClick={() => setShowSecondColorModal(false)}>
          <div className="second-color-modal" onClick={(e) => e.stopPropagation()}>
            <h3>选择第二个颜色</h3>
            <div className="modal-colors">
              {colors.map((color, index) => (
                <div
                  key={index}
                  className="modal-color-block"
                  style={{ backgroundColor: color }}
                  onClick={() => handleSecondColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setShowSecondColorModal(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaletteBoard;
