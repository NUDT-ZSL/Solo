import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { AlertTriangle } from 'lucide-react';
import type { ColorKey } from '@/store/types';
import { COLOR_KEY_LABELS } from '@/store/types';
import { calculateContrast, isValidHex, normalizeHex } from '@/utils/contrastCheck';

interface Props {
  colorKey: ColorKey;
  value: string;
  background: string;
  onColorChange: (key: ColorKey, hex: string) => void;
  showContrastWarning?: boolean;
}

type ContrastCheckMode = 'on-bg' | 'as-bg-white';

const CONTRAST_CHECK_PAIRS: Record<ColorKey, ContrastCheckMode> = {
  primary: 'as-bg-white',
  secondary: 'as-bg-white',
  background: 'on-bg',
  text: 'on-bg',
  accent: 'as-bg-white',
};

export const ColorPickerCell: React.FC<Props> = React.memo(function ColorPickerCell({
  colorKey,
  value,
  background,
  onColorChange,
  showContrastWarning = true,
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value.toUpperCase());
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const checkMode = CONTRAST_CHECK_PAIRS[colorKey];
  const contrastInfo = useMemo(() => {
    if (!showContrastWarning) return null;
    if (checkMode === 'on-bg') {
      return {
        label: '与背景色',
        result: calculateContrast(value, background),
      };
    }
    return {
      label: '白字在上',
      result: calculateContrast('#ffffff', value),
    };
  }, [colorKey, value, background, checkMode, showContrastWarning]);

  const showWarning = contrastInfo && !contrastInfo.result.passAA;

  const handlePickerChange = (hex: string) => {
    const norm = normalizeHex(hex);
    setInputValue(norm.toUpperCase());
    onColorChange(colorKey, norm);
  };

  const handleInputBlur = () => {
    if (isValidHex(inputValue)) {
      handlePickerChange(inputValue);
    } else {
      setInputValue(value.toUpperCase());
    }
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  return (
    <div className="color-cell" ref={wrapRef}>
      <div className="color-cell__header">
        <span className="color-cell__label">{COLOR_KEY_LABELS[colorKey]}</span>
        {showWarning && contrastInfo && (
          <span
            className="color-cell__warning"
            title={`${contrastInfo.label}对比度 ${contrastInfo.result.ratio}:1，低于 WCAG AA 标准 (4.5:1)`}
          >
            <AlertTriangle size={12} />
            {contrastInfo.result.ratio}:1
          </span>
        )}
        {!showWarning && contrastInfo && contrastInfo.result.passAA && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--app-success)',
              fontWeight: 500,
              opacity: 0.8,
            }}
            title={`${contrastInfo.label}对比度 ${contrastInfo.result.ratio}:1，满足 WCAG AA`}
          >
            {contrastInfo.result.ratio}:1
          </span>
        )}
      </div>
      <div className="color-cell__body">
        <div className="color-cell__picker-wrap">
          <div
            className="color-cell__swatch"
            style={{ backgroundColor: value }}
            onClick={() => setOpen((v) => !v)}
            title="点击打开拾色器"
          />
          {open && (
            <div className="picker-popover">
              <HexColorPicker
                color={value}
                onChange={handlePickerChange}
                style={{ animation: 'fadeIn 0.3s ease' }}
              />
            </div>
          )}
        </div>
        <div className="color-cell__hex">
          <input
            type="text"
            value={inputValue}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKey}
            style={{ transition: 'all 0.3s ease' }}
          />
        </div>
      </div>
    </div>
  );
});

export default ColorPickerCell;
