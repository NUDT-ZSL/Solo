import { useState, useRef, useEffect } from 'react';
import { Brand, HEADING_FONTS, SPACING_OPTIONS } from '../types';

interface BrandEditorProps {
  brand: Brand | null;
  onUpdate: (data: Partial<Brand>) => void;
  onExport: () => void;
}

export default function BrandEditor({ brand, onUpdate, onExport }: BrandEditorProps) {
  const [nameError, setNameError] = useState<string>('');
  const [colorPickerOpen, setColorPickerOpen] = useState<'primary' | 'secondary' | null>(null);
  const [tempColor, setTempColor] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const checkFonts = async () => {
      try {
        await document.fonts.ready;
        setFontsLoaded(true);
      } catch {
        setTimeout(() => setFontsLoaded(true), 1000);
      }
    };
    checkFonts();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        if (colorPickerOpen) {
          applyColor(colorPickerOpen, tempColor);
        }
        setColorPickerOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerOpen, tempColor]);

  if (!brand) return null;

  function handleNameChange(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNameError('品牌名称不能为空');
    } else if (trimmed.length > 40) {
      setNameError('品牌名称最长40个字符');
    } else {
      setNameError('');
    }
    onUpdate({ name: value.slice(0, 40) });
  }

  function openColorPicker(type: 'primary' | 'secondary') {
    if (!brand) return;
    setTempColor(type === 'primary' ? brand.primaryColor : brand.secondaryColor);
    setColorPickerOpen(type);
  }

  function applyColor(type: 'primary' | 'secondary', color: string) {
    if (!brand) return;
    const fallback = type === 'primary' ? brand.primaryColor : brand.secondaryColor;
    const validColor = isValidColor(color) ? color : fallback;
    if (type === 'primary') {
      onUpdate({ primaryColor: validColor });
    } else {
      onUpdate({ secondaryColor: validColor });
    }
  }

  function isValidColor(color: string): boolean {
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return true;
    if (/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.test(color)) {
      const parts = color.match(/\d+/g);
      if (parts) {
        return parts.every(p => parseInt(p) <= 255);
      }
    }
    return false;
  }

  function handleColorInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTempColor(e.target.value);
  }

  function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value;
    setTempColor(color);
    if (colorPickerOpen) {
      applyColor(colorPickerOpen, color);
    }
  }

  return (
    <div className="brand-editor">
      <div className="editor-header">
        <h2 className="editor-title">品牌配置</h2>
        <button
          className="btn-export"
          onClick={onExport}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出CSS
        </button>
      </div>

      <div className="form-section">
        <label className="form-label">
          品牌名称
          <span className="required">*</span>
        </label>
        <input
          type="text"
          className={`form-input ${nameError ? 'input-error' : ''}`}
          value={brand.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="输入品牌名称（最长40字符）"
          maxLength={40}
        />
        {nameError && <span className="error-text">{nameError}</span>}
        <div className="char-count">{brand.name.length}/40</div>
      </div>

      <div className="form-section" ref={pickerRef}>
        <label className="form-label">主色 (Primary)</label>
        <div className="color-input-wrapper">
          <div
            className="color-preview"
            style={{ backgroundColor: brand.primaryColor }}
            onClick={() => openColorPicker('primary')}
          />
          <input
            type="text"
            className="form-input color-text-input"
            value={brand.primaryColor}
            onChange={(e) => {
              const val = e.target.value;
              if (isValidColor(val)) {
                onUpdate({ primaryColor: val });
              }
            }}
            onFocus={() => openColorPicker('primary')}
            placeholder="#FFFFFF 或 rgb(255,255,255)"
          />
        </div>
        {colorPickerOpen === 'primary' && (
          <div className="color-picker-modal">
            <div className="color-picker-overlay" />
            <div className="color-picker-popup">
              <input
                type="color"
                className="color-picker-native"
                value={/^#[A-Fa-f0-9]{6}$/.test(tempColor) ? tempColor : brand.primaryColor}
                onChange={handleColorPickerChange}
              />
              <input
                type="text"
                className="form-input"
                value={tempColor}
                onChange={handleColorInputChange}
                placeholder="HEX 或 RGB"
              />
              <div className="color-presets">
                {['#6366F1', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#64748B'].map(c => (
                  <button
                    key={c}
                    className="color-preset"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setTempColor(c);
                      applyColor('primary', c);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">辅色 (Secondary)</label>
        <div className="color-input-wrapper">
          <div
            className="color-preview"
            style={{ backgroundColor: brand.secondaryColor }}
            onClick={() => openColorPicker('secondary')}
          />
          <input
            type="text"
            className="form-input color-text-input"
            value={brand.secondaryColor}
            onChange={(e) => {
              const val = e.target.value;
              if (isValidColor(val)) {
                onUpdate({ secondaryColor: val });
              }
            }}
            onFocus={() => openColorPicker('secondary')}
            placeholder="#FFFFFF 或 rgb(255,255,255)"
          />
        </div>
        {colorPickerOpen === 'secondary' && (
          <div className="color-picker-modal">
            <div className="color-picker-overlay" />
            <div className="color-picker-popup">
              <input
                type="color"
                className="color-picker-native"
                value={/^#[A-Fa-f0-9]{6}$/.test(tempColor) ? tempColor : brand.secondaryColor}
                onChange={handleColorPickerChange}
              />
              <input
                type="text"
                className="form-input"
                value={tempColor}
                onChange={handleColorInputChange}
                placeholder="HEX 或 RGB"
              />
              <div className="color-presets">
                {['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#6366F1', '#14B8A6'].map(c => (
                  <button
                    key={c}
                    className="color-preset"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setTempColor(c);
                      applyColor('secondary', c);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">标题字体</label>
        {!fontsLoaded ? (
          <div className="skeleton select-skeleton" />
        ) : (
          <select
            className="form-select"
            value={brand.headingFont}
            onChange={(e) => onUpdate({ headingFont: e.target.value })}
            style={{ fontFamily: `'${brand.headingFont}', serif` }}
          >
            {HEADING_FONTS.map(font => (
              <option key={font} value={font} style={{ fontFamily: `'${font}', serif` }}>
                {font}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">正文字体</label>
        <div className="font-disabled">
          Inter <span className="font-tag">默认</span>
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">间距基数</label>
        <div className="spacing-options">
          {SPACING_OPTIONS.map(size => (
            <button
              key={size}
              className={`spacing-option ${brand.spacingUnit === size ? 'active' : ''}`}
              onClick={() => onUpdate({ spacingUnit: size })}
              type="button"
            >
              <div
                className="spacing-preview-dot"
                style={{ width: size * 2, height: size * 2 }}
              />
              <span>{size}px</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
